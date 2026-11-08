import { D1LinkStore } from '../../modules/access-control/d1-store.ts'
import type { SqlDatabase } from '../../modules/access-control/d1-store.ts'
import { MagicLinks } from '../../modules/access-control/magic-links.ts'
import { AdminSessions, D1SessionStore } from '../../modules/access-control/sessions.ts'
import { AdminHttp } from '../../modules/access-control/http.ts'
import { OperatingControls } from './controls.ts'
import { OperatingApi } from './api.ts'
import { FirebasePublisher } from './publisher.ts'
import { firebaseIdentity, serviceAccountToken } from './credentials.ts'
import { adminCSS, adminHTML, adminJS } from './admin-page.ts'
import { ResendMailer } from './mail.ts'

export interface OperatingEnvironment {
  DB: SqlDatabase
  ASSETS: { fetch(request: Request): Promise<Response> }
  ADMIN_ORIGIN: string
  GAME_URL: string
  PROJECT: string
  FIREBASE_PROJECT_ID: string
  FIREBASE_DATABASE_ORIGIN: string
  FIREBASE_API_KEY: string
  SUBJECT_SECRET: string
  FIREBASE_SERVICE_ACCOUNT: string
  RESEND_API_KEY: string
  MAIL_FROM: string
  DAILY_MAIL_LIMIT?: string
}
interface Execution { waitUntil(task: Promise<void>): void }
let cached: { env: OperatingEnvironment; api: OperatingApi; links: D1LinkStore; sessions: D1SessionStore } | undefined
function services(env: OperatingEnvironment) {
  if (cached?.env === env) return cached
  if (!/^[a-z0-9-]{1,64}$/.test(env.PROJECT) || typeof env.SUBJECT_SECRET !== 'string' || env.SUBJECT_SECRET.length < 32) throw new Error('Private configuration unavailable')
  const links = new D1LinkStore(env.DB, Number(env.DAILY_MAIL_LIMIT ?? 20)), sessions = new D1SessionStore(env.DB)
  const magic = new MagicLinks(env.PROJECT, env.SUBJECT_SECRET, links, new ResendMailer(env.RESEND_API_KEY, env.MAIL_FROM, env.ADMIN_ORIGIN))
  const auth = new AdminHttp(env.ADMIN_ORIGIN, magic, new AdminSessions(env.PROJECT, sessions))
  const publisher = new FirebasePublisher(env.FIREBASE_DATABASE_ORIGIN, serviceAccountToken(env.FIREBASE_SERVICE_ACCOUNT))
  const controls = new OperatingControls(publisher, env.DB, env.PROJECT, env.GAME_URL)
  cached = { env, api: new OperatingApi(auth, controls, firebaseIdentity(env.FIREBASE_PROJECT_ID, env.FIREBASE_API_KEY)), links, sessions }
  return cached
}
export default {
  async fetch(request: Request, env: OperatingEnvironment, execution: Execution): Promise<Response> {
    const url = new URL(request.url)
    const security = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" }
    if (url.origin !== env.ADMIN_ORIGIN) return new Response('Not found', { status: 404, headers: security })
    if (request.method === 'GET' && ['/admin/', '/admin/app.js', '/admin/style.css'].includes(url.pathname)) {
      if (url.search) return new Response('Invalid request', { status: 400, headers: security })
      const content = url.pathname.endsWith('.js') ? [adminJS, 'text/javascript'] : url.pathname.endsWith('.css') ? [adminCSS, 'text/css'] : [adminHTML, 'text/html']
      return new Response(content[0], { headers: { ...security, 'Content-Type': `${content[1]}; charset=utf-8` } })
    }
    if (url.pathname.startsWith('/api/')) {
      try {
        return await services(env).api.handle(request, { source: request.headers.get('CF-Connecting-IP') ?? '', waitUntil: task => execution.waitUntil(task) })
      } catch { return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), { status: 503, headers: { ...security, 'Content-Type': 'application/json' } }) }
    }
    if (url.pathname.startsWith('/play/') && ['GET', 'HEAD'].includes(request.method)) {
      const asset = new URL(request.url); asset.pathname = url.pathname.slice('/play'.length)
      if (asset.pathname === '/') asset.pathname = '/index.html'
      const response = await env.ASSETS.fetch(new Request(asset, request))
      // Keep fragment-bearing invitations out of referrers even before JS loads.
      const result = new Response(response.body, response)
      result.headers.set('Referrer-Policy', 'no-referrer')
      if (asset.pathname === '/index.html') result.headers.set('Cache-Control', 'no-store')
      return result
    }
    return new Response('Not found', { status: 404, headers: security })
  },
  async scheduled(_event: unknown, env: OperatingEnvironment, execution: Execution) {
    execution.waitUntil((async () => {
      const service = services(env), now = Date.now()
      await service.links.prune(now); await service.sessions.prune(now)
      // Expiry is enforced independently in rules; retention is not the clock.
      await service.api.controls.prune(now)
    })())
  },
}
