interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }
const base64url = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const encode = (value: object) => base64url(new TextEncoder().encode(JSON.stringify(value)))

/** Native WebCrypto OAuth adapter; no service account material reaches the browser. */
export function serviceAccountToken(serialized: string, fetcher = fetch, clock = Date.now): () => Promise<string> {
  const credentials = JSON.parse(serialized) as ServiceAccount
  if (!/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(credentials.client_email) || !credentials.private_key?.startsWith('-----BEGIN PRIVATE KEY-----') ||
    (credentials.token_uri && credentials.token_uri !== 'https://oauth2.googleapis.com/token')) throw new Error('Invalid publisher configuration')
  let cached: { token: string; expiresAt: number } | null = null
  let pending: Promise<string> | null = null
  return async () => {
    if (cached && cached.expiresAt > clock() + 60_000) return cached.token
    if (pending) return pending
    pending = (async () => {
      const now = Math.floor(clock() / 1000)
      const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`
      const raw = credentials.private_key.replace(/-----[^-]+-----|\s/g, '')
      let key: CryptoKey
      try { key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(raw), x => x.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']) }
      catch { throw new Error('Publisher key import failed') }
      let signature: ArrayBuffer
      try { signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)) }
      catch { throw new Error('Publisher signing failed') }
      let response: Response
      try { response = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${base64url(new Uint8Array(signature))}` }), redirect: 'error', signal: AbortSignal.timeout(8000) }) }
      catch { throw new Error('Publisher connection failed') }
      if (!response.ok) throw new Error('Publisher authentication failed')
      const result = await response.json() as { access_token?: string; expires_in?: number }
      if (!result.access_token || !Number.isFinite(result.expires_in) || result.expires_in! <= 0) throw new Error('Publisher authentication failed')
      cached = { token: result.access_token, expiresAt: clock() + Math.min(result.expires_in!, 3600) * 1000 }
      return cached.token
    })()
    try { return await pending } finally { pending = null }
  }
}

/** Google's project-scoped lookup verifies the token; never trust a submitted UID. */
export function firebaseIdentity(project: string, apiKey: string, fetcher = fetch): (token: string) => Promise<string> {
  return async token => {
    if (typeof token !== 'string' || token.length > 8192) throw new Error('Invalid player identity')
    const response = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }), redirect: 'error', signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Invalid player identity')
    const result = await response.json() as { users?: { localId: string; disabled?: boolean }[] }
    const user = result.users?.length === 1 ? result.users[0] : null
    let claims: { aud?: string; iss?: string; sub?: string; firebase?: { sign_in_provider?: string } }
    try { const payload = token.split('.')[1]; claims = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/'))) } catch { throw new Error('Invalid player identity') }
    if (!user || user.disabled || !/^[a-zA-Z0-9_-]{1,128}$/.test(user.localId) || claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}` || claims.sub !== user.localId || claims.firebase?.sign_in_provider !== 'anonymous') throw new Error('Invalid player identity')
    return user.localId
  }
}
