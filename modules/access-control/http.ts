import type { MagicLinks } from './magic-links.ts'
import type { AdminSessions } from './sessions.ts'

export interface AdminHttpContext {
  /** Trusted platform source (e.g. Cloudflare connection IP), never submitted JSON. */
  source: string
  waitUntil(task: Promise<void>): void
}
const headers = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
}
const json = (body: object, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json', ...extra } })
const accepted = () => json({ message: 'If this address is authorized, a sign-in link will be sent.' }, 202)

/** Enforce size while reading; Content-Length is not trusted. */
async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json' || !request.body) throw new Error('Invalid request')
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > 1024) { await reader.cancel(); throw new Error('Invalid request') }
      chunks.push(part.value)
    }
  } finally { reader.releaseLock() }
  const merged = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length }
  const result: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(merged))
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid request')
  return result as Record<string, unknown>
}

/** Authentication routes only. Game-control publication is a separate trusted adapter. */
export class AdminHttp {
  readonly origin: string
  readonly links: MagicLinks
  readonly sessions: AdminSessions
  readonly clock: () => number
  readonly cookieName: string
  onRevoke: ((token: string) => Promise<void>) | null = null
  constructor(origin: string, links: MagicLinks, sessions: AdminSessions, clock = Date.now) {
    const url = new URL(origin)
    if (url.protocol !== 'https:' || url.origin !== origin || !/^[a-z0-9-]{1,64}$/.test(links.project) || sessions.project !== links.project) throw new Error('Invalid server configuration')
    this.origin = origin; this.links = links; this.sessions = sessions; this.clock = clock
    this.cookieName = `__Host-admin-${links.project}`
  }
  cookie(request: Request): string {
    const matches = (request.headers.get('cookie') ?? '').split(';').map(x => x.trim()).filter(x => x.startsWith(`${this.cookieName}=`))
    return matches.length === 1 ? matches[0].slice(this.cookieName.length + 1) : ''
  }
  async session(request: Request) { return this.sessions.authenticate(this.cookie(request), this.clock()) }
  private async revoke(token: string) {
    // Never create a Firebase tombstone for an arbitrary caller-supplied cookie.
    if (await this.sessions.authenticate(token, this.clock())) await this.onRevoke?.(token)
    await this.sessions.revoke(token)
  }
  private setCookie(token: string, maxAge: number): string {
    return `${this.cookieName}=${token}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Strict`
  }
  async handle(request: Request, context: AdminHttpContext): Promise<Response> {
    try {
      const url = new URL(request.url)
      if (url.origin !== this.origin || url.search) return json({ error: 'Invalid request' }, 400)
      if (request.method === 'GET' && url.pathname === '/api/admin/session') {
        const session = await this.sessions.authenticate(this.cookie(request), this.clock())
        return session ? json({ authenticated: true, expiresAt: session.expiresAt }) : json({ authenticated: false }, 401)
      }
      if (request.method !== 'POST' || !['/api/admin/request-link', '/api/admin/redeem', '/api/admin/logout'].includes(url.pathname)) return json({ error: 'Not found' }, 404)
      if (request.headers.get('origin') !== this.origin || request.headers.get('x-admin-request') !== '1') return json({ error: 'Forbidden' }, 403)
      let input: Record<string, unknown>
      try { input = await body(request) } catch { return json({ error: 'Invalid request' }, 400) }
      if (url.pathname === '/api/admin/request-link') {
        if (Object.keys(input).length !== 1 || typeof input.email !== 'string') return json({ error: 'Invalid request' }, 400)
        // No await or identifying error logs; identical response for allowed/unknown/limited.
        // A platform adapter must supply a trusted source; missing source fails closed.
        if (context.source) context.waitUntil(this.links.request(input.email, context.source, this.clock()).catch(() => {}))
        return accepted()
      }
      if (url.pathname === '/api/admin/redeem') {
        if (Object.keys(input).length !== 1 || typeof input.token !== 'string') return json({ error: 'Invalid request' }, 400)
        const subject = await this.links.redeem(input.token, this.clock())
        if (!subject) return json({ error: 'Link is invalid or expired' }, 401)
        const token = await this.sessions.issue(subject, this.clock())
        // Rotate the browser's old session on successful sign-in.
        await this.revoke(this.cookie(request))
        return json({ authenticated: true }, 200, { 'Set-Cookie': this.setCookie(token, 8 * 60 * 60) })
      }
      if (Object.keys(input).length !== 0) return json({ error: 'Invalid request' }, 400)
      await this.revoke(this.cookie(request))
      return json({ authenticated: false }, 200, { 'Set-Cookie': this.setCookie('', 0) })
    } catch {
      // Do not expose provider errors, email addresses, cookies or request bodies.
      return json({ error: 'Service temporarily unavailable' }, 503)
    }
  }
}
