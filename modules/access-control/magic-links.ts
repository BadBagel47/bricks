export interface LinkRecord { readonly digest: string; readonly subject: string; readonly expiresAt: number }
export interface LinkStore {
  isAllowed(subject: string): Promise<boolean>
  /** Durable, atomic rate limit for both keys. */
  permitRequest(subject: string, source: string, now: number): Promise<boolean>
  /** Atomically reserve an outbound attempt within the project-wide daily budget. */
  permitMail(now: number): Promise<boolean>
  put(record: LinkRecord): Promise<void>
  /** Atomically delete/consume only an unused, unexpired link. */
  consume(digest: string, now: number): Promise<LinkRecord | null>
}
export interface LinkMailer { send(email: string, token: string): Promise<void> }
const hex = (bytes: Uint8Array) => [...bytes].map(x => x.toString(16).padStart(2, '0')).join('')
const bytes = (text: string) => new TextEncoder().encode(text)

/** Keep this key and the allowlist on the server, never in frontend build variables. */
export async function privateSubject(project: string, email: string, secret: string): Promise<string> {
  if (!/^[a-z0-9-]{1,64}$/.test(project) || secret.length < 32) throw new Error('Invalid server configuration')
  const key = await crypto.subtle.importKey('raw', bytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes(JSON.stringify([project, email.trim().toLowerCase()])))))
}
export async function linkDigest(project: string, token: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(JSON.stringify([project, token])))))
}
export class MagicLinks {
  readonly project: string
  readonly secret: string
  readonly store: LinkStore
  readonly mailer: LinkMailer
  constructor(project: string, secret: string, store: LinkStore, mailer: LinkMailer) {
    this.project = project; this.secret = secret; this.store = store; this.mailer = mailer
  }
  /** The HTTP adapter must always return the same generic accepted response. */
  async request(email: string, source: string, now: number): Promise<void> {
    if (!Number.isSafeInteger(now) || now < 0 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return
    const normalized = email.trim().toLowerCase()
    const subject = await privateSubject(this.project, normalized, this.secret)
    const sourceKey = await privateSubject(this.project, `source:${source}`, this.secret)
    if (!await this.store.permitRequest(subject, sourceKey, now) || !await this.store.isAllowed(subject) || !await this.store.permitMail(now)) return
    const token = hex(crypto.getRandomValues(new Uint8Array(32)))
    const digest = await linkDigest(this.project, token)
    await this.store.put({ digest, subject, expiresAt: now + 15 * 60_000 })
    try { await this.mailer.send(normalized, token) }
    catch { await this.store.consume(digest, now); /* HTTP response still must not reveal allowlist membership. */ }
  }
  async redeem(token: string, now: number): Promise<string | null> {
    if (!/^[a-f0-9]{64}$/.test(token) || !Number.isSafeInteger(now) || now < 0) return null
    const record = await this.store.consume(await linkDigest(this.project, token), now)
    if (!record || record.expiresAt <= now || !await this.store.isAllowed(record.subject)) return null
    return record.subject
  }
}
