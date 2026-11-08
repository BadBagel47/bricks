import { linkDigest } from './magic-links.ts'
import type { SqlDatabase } from './d1-store.ts'

export interface SessionRecord { readonly subject: string; readonly expiresAt: number }
export interface SessionStore {
  putSession(digest: string, record: SessionRecord): Promise<void>
  /** Must check current allowlist membership, not only the original membership. */
  findSession(digest: string, now: number): Promise<SessionRecord | null>
  deleteSession(digest: string): Promise<void>
}
export class D1SessionStore implements SessionStore {
  readonly database: SqlDatabase
  constructor(database: SqlDatabase) { this.database = database }
  async putSession(digest: string, record: SessionRecord): Promise<void> {
    await this.database.prepare('INSERT INTO admin_sessions (digest, subject, expires_at) VALUES (?, ?, ?)')
      .bind(digest, record.subject, record.expiresAt).run()
  }
  async findSession(digest: string, now: number): Promise<SessionRecord | null> {
    return this.database.prepare(`SELECT s.subject, s.expires_at AS expiresAt
      FROM admin_sessions s JOIN admins a ON a.subject = s.subject
      WHERE s.digest = ? AND s.expires_at > ? AND a.enabled = 1`).bind(digest, now).first<SessionRecord>()
  }
  async deleteSession(digest: string): Promise<void> {
    await this.database.prepare('DELETE FROM admin_sessions WHERE digest = ?').bind(digest).run()
  }
  async prune(now: number): Promise<void> {
    await this.database.prepare('DELETE FROM admin_sessions WHERE expires_at <= ? OR subject NOT IN (SELECT subject FROM admins WHERE enabled = 1)').bind(now).run()
  }
}

const validToken = (token: string) => /^[a-f0-9]{64}$/.test(token)
export class AdminSessions {
  readonly project: string
  readonly store: SessionStore
  constructor(project: string, store: SessionStore) { this.project = project; this.store = store }
  private digest(token: string) { return linkDigest(`${this.project}:session`, token) }
  async issue(subject: string, now: number): Promise<string> {
    if (!Number.isSafeInteger(now) || now < 0 || !subject) throw new Error('Invalid session')
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join('')
    await this.store.putSession(await this.digest(token), { subject, expiresAt: now + 30 * 60_000 })
    return token
  }
  async authenticate(token: string, now: number): Promise<SessionRecord | null> {
    if (!validToken(token) || !Number.isSafeInteger(now) || now < 0) return null
    return this.store.findSession(await this.digest(token), now)
  }
  async revoke(token: string): Promise<void> {
    if (validToken(token)) await this.store.deleteSession(await this.digest(token))
  }
}
