import { AdminHttp } from '../../modules/access-control/http.ts'
import type { AdminHttpContext } from '../../modules/access-control/http.ts'
import { linkDigest } from '../../modules/access-control/magic-links.ts'
import { ControlError, OperatingControls } from './controls.ts'
import { accessFailureCode } from './diagnostics.ts'

const security = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }
export class OperatingApi {
  readonly auth: AdminHttp
  readonly controls: OperatingControls
  readonly gameOrigin: string
  readonly identity: (token: string) => Promise<string>
  constructor(auth: AdminHttp, controls: OperatingControls, identity: (token: string) => Promise<string>) {
    this.auth = auth; this.controls = controls; this.identity = identity
    this.gameOrigin = new URL(controls.gameURL).origin
    auth.onRevoke = async token => controls.revokeSession(await linkDigest(`${auth.links.project}:session`, token))
  }
  async handle(request: Request, context: AdminHttpContext): Promise<Response> {
    const url = new URL(request.url), origin = request.headers.get('origin')
    const cors: Record<string, string> = origin === this.gameOrigin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}
    const reply = (value: object, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...security, ...cors, 'Content-Type': 'application/json' } })
    if (url.origin !== this.auth.origin || url.search) return reply({ error: 'Invalid request' }, 400)
    if (url.pathname.startsWith('/api/admin/')) return this.auth.handle(request, context)
    const publicPaths = ['/api/access', '/api/play/solo', '/api/play/invite']
    const publicRequest = publicPaths.includes(url.pathname)
    if (request.method === 'OPTIONS' && publicRequest && (origin === this.gameOrigin || origin === this.auth.origin)) {
      return new Response(null, { status: 204, headers: { ...security, ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Request' } })
    }
    try {
      if (request.method === 'GET' && url.pathname === '/api/access') return reply({ config: await this.controls.config(), serverTime: this.auth.clock() })
      if (!(request.method === 'GET' && origin === null) && origin !== this.auth.origin && !(publicRequest && origin === this.gameOrigin)) return reply({ error: 'Forbidden' }, 403)
      const session = await this.auth.session(request)
      if (url.pathname.startsWith('/api/control/') && !session) return reply({ error: 'Sign in required' }, 401)
      if (request.method === 'GET' && url.pathname === '/api/control/state') return reply({ config: await this.controls.config(), invites: await this.controls.list(this.auth.clock()), serverTime: this.auth.clock() })
      if (request.method !== 'POST' || request.headers.get('x-admin-request') !== '1' || request.headers.get('content-type')?.split(';')[0] !== 'application/json') return reply({ error: 'Invalid request' }, 400)
      const reader = request.body?.getReader()
      if (!reader) return reply({ error: 'Invalid request' }, 400)
      const chunks: Uint8Array[] = []; let length = 0
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break
          length += part.value.byteLength
          if (length > 12_288) { await reader.cancel(); return reply({ error: 'Request too large' }, 413) }
          chunks.push(part.value)
        }
      } finally { reader.releaseLock() }
      const raw = new Uint8Array(length); let offset = 0
      for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.length }
      let input: Record<string, unknown>
      try { input = JSON.parse(new TextDecoder().decode(raw)); if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error() } catch { return reply({ error: 'Invalid request' }, 400) }
      const exact = (...keys: string[]) => Object.keys(input).length === keys.length && keys.every(key => Object.hasOwn(input, key))
      const now = this.auth.clock()
      switch (url.pathname) {
        case '/api/control/config':
          if (!exact('config')) break
          return reply({ config: await this.controls.update(input.config, now) })
        case '/api/control/invites':
          if (!exact('expiresAt') || typeof input.expiresAt !== 'number') break
          return reply(await this.controls.create(input.expiresAt, now), 201)
        case '/api/control/revoke':
          if (!exact('id') || typeof input.id !== 'string') break
          await this.controls.revoke(input.id); return reply({ revoked: true })
        case '/api/play/solo':
          if (!exact()) break
          return await this.controls.solo(Boolean(session), now) ? reply({ allowed: true }) : reply({ error: 'Single player is currently closed.' }, 403)
        case '/api/play/operator': {
          if (!session || !exact('idToken') || typeof input.idToken !== 'string') return reply({ error: 'Sign in required' }, 401)
          const uid = await this.identity(input.idToken)
          const id = await linkDigest(`${this.auth.links.project}:session`, this.auth.cookie(request))
          await this.controls.operator(uid, id, session.subject, session.expiresAt)
          return reply({ allowed: true, expiresAt: session.expiresAt })
        }
        case '/api/play/invite': {
          if (!exact('token', 'idToken', 'name') || typeof input.token !== 'string' || typeof input.idToken !== 'string' || typeof input.name !== 'string') break
          if (!await this.controls.validInvitation(input.token, now)) return reply({ error: 'Invitation is invalid or expired' }, 403)
          let uid: string
          try { uid = await this.identity(input.idToken) } catch { return reply({ error: 'Invalid player identity' }, 401) }
          return reply(await this.controls.redeem(input.token, uid, input.name, now))
        }
        default: return reply({ error: 'Not found' }, 404)
      }
      return reply({ error: 'Invalid request' }, 400)
    } catch (error) {
      if (request.method === 'GET' && url.pathname === '/api/access') return reply({ error: 'Service temporarily unavailable', code: accessFailureCode(error) }, 503)
      return error instanceof ControlError ? reply({ error: error.message }, error.status) : reply({ error: 'Service temporarily unavailable' }, 503)
    }
  }
}
