import type { LinkRecord, LinkStore } from './magic-links.ts'

export interface SqlStatement {
  bind(...values: (string | number)[]): SqlStatement
  first<T>(): Promise<T | null>
  run(): Promise<unknown>
}
export interface SqlDatabase { prepare(sql: string): SqlStatement }

/** D1 adapter; project isolation requires a separate binding/database per project. */
export class D1LinkStore implements LinkStore {
  readonly database: SqlDatabase
  readonly dailyMailLimit: number
  constructor(database: SqlDatabase, dailyMailLimit = 90) {
    if (!Number.isSafeInteger(dailyMailLimit) || dailyMailLimit < 1 || dailyMailLimit > 90) throw new Error('Invalid mail budget')
    this.database = database; this.dailyMailLimit = dailyMailLimit
  }
  async isAllowed(subject: string): Promise<boolean> {
    return Boolean(await this.database.prepare('SELECT subject FROM admins WHERE subject = ? AND enabled = 1').bind(subject).first())
  }
  async permitRequest(subject: string, source: string, now: number): Promise<boolean> {
    const claim = async (key: string, limit: number) => Boolean(await this.database.prepare(`
      INSERT INTO rate_windows (key, used, resets_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        used = CASE WHEN resets_at <= ? THEN 1 ELSE used + 1 END,
        resets_at = CASE WHEN resets_at <= ? THEN ? ELSE resets_at END
      WHERE resets_at <= ? OR used < ? RETURNING key
    `).bind(key, now + 15 * 60_000, now, now, now + 15 * 60_000, now, limit).first())
    // Charging a partial budget on rejection is intentional and conservative.
    if (!await claim(`source:${source}`, 10)) return false
    return claim(`recipient:${subject}`, 3)
  }
  async put(record: LinkRecord): Promise<void> {
    await this.database.prepare('INSERT INTO magic_links (digest, subject, expires_at) VALUES (?, ?, ?)').bind(record.digest, record.subject, record.expiresAt).run()
  }
  async permitMail(now: number): Promise<boolean> {
    // Fixed UTC day, shared by all recipients/sources in this project's database.
    const reset = (Math.floor(now / 86_400_000) + 1) * 86_400_000
    return Boolean(await this.database.prepare(`
      INSERT INTO rate_windows (key, used, resets_at) VALUES ('mail:daily', 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        used = CASE WHEN resets_at <= ? THEN 1 ELSE used + 1 END,
        resets_at = CASE WHEN resets_at <= ? THEN ? ELSE resets_at END
      WHERE resets_at <= ? OR used < ? RETURNING key
    `).bind(reset, now, now, reset, now, this.dailyMailLimit).first())
  }
  async consume(digest: string, now: number): Promise<LinkRecord | null> {
    return this.database.prepare('DELETE FROM magic_links WHERE digest = ? AND expires_at > ? RETURNING digest, subject, expires_at AS expiresAt').bind(digest, now).first<LinkRecord>()
  }
  async prune(now: number): Promise<void> {
    await this.database.prepare('DELETE FROM magic_links WHERE expires_at <= ?').bind(now).run()
    await this.database.prepare('DELETE FROM rate_windows WHERE resets_at <= ?').bind(now).run()
  }
}
