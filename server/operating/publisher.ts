export interface Stored<T> { value: T | null; etag: string }
export interface Publisher {
  read<T>(path: string): Promise<Stored<T>>
  write(path: string, value: unknown, etag?: string): Promise<boolean>
}

const permitted = /^(operating\/config|privateRooms\/[A-HJ-NP-Z2-9]{4}|roomAccess\/[A-HJ-NP-Z2-9]{4}\/[a-zA-Z0-9_-]{1,128}|operatorPlayers\/[a-zA-Z0-9_-]{1,128}|operatorSessions\/[a-f0-9]{64}|adminAllowlist\/[a-f0-9]{64}|roomReservations\/[A-HJ-NP-Z2-9]{4}|rooms\/[A-HJ-NP-Z2-9]{4})$/

/** Restrict every REST request to the operating publisher identity and known paths.
 * The underlying OAuth credential is still sensitive and is not IAM path-scoped.
 */
export class FirebasePublisher implements Publisher {
  readonly origin: string
  readonly token: () => Promise<string>
  readonly fetcher: typeof fetch
  constructor(origin: string, token: () => Promise<string>, fetcher = fetch) {
    const url = new URL(origin)
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.(?:[a-z0-9-]+\.firebasedatabase\.app|firebaseio\.com)$/.test(url.hostname) || url.origin !== origin) throw new Error('Invalid database origin')
    this.origin = origin; this.token = token; this.fetcher = fetcher
  }
  private async request(path: string, init: RequestInit): Promise<Response> {
    if (!permitted.test(path)) throw new Error('Publisher path denied')
    const url = new URL(`${this.origin}/${path}.json`)
    url.searchParams.set('auth_variable_override', JSON.stringify({ uid: 'bricks-operating-publisher', token: { operatingPublisher: true } }))
    // Bearer credentials stay out of URLs and application logs.
    const response = await this.fetcher(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await this.token()}` }, redirect: 'error', signal: AbortSignal.timeout(8000) })
    if (!response.ok && response.status !== 412) throw new Error('Database publication failed')
    return response
  }
  async read<T>(path: string): Promise<Stored<T>> {
    const response = await this.request(path, { headers: { 'X-Firebase-ETag': 'true' } })
    if (!response.ok) throw new Error('Database read failed')
    const etag = response.headers.get('etag')
    if (!etag) throw new Error('Database version unavailable')
    return { value: await response.json() as T | null, etag }
  }
  async write(path: string, value: unknown, etag?: string): Promise<boolean> {
    const response = await this.request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(etag ? { 'If-Match': etag } : {}) }, body: JSON.stringify(value) })
    return response.status !== 412
  }
}
