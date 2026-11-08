import type { LinkMailer } from '../../modules/access-control/magic-links.ts'

export class MailjetMailer implements LinkMailer {
  readonly key: string
  readonly secret: string
  readonly from: string
  readonly origin: string
  readonly fetcher: typeof fetch
  constructor(key: string, secret: string, from: string, origin: string, fetcher = fetch) {
    if (typeof key !== 'string' || !/^[\x21-\x7e]+$/.test(key) || key.includes(':') || typeof secret !== 'string' || !/^[\x21-\x7e]+$/.test(secret) || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from) || new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('Mail configuration unavailable')
    this.key = key; this.secret = secret; this.from = from; this.origin = origin; this.fetcher = fetcher
  }
  async send(email: string, token: string): Promise<void> {
    const url = new URL('/admin/', this.origin); url.hash = `token=${token}`
    try {
      const response = await this.fetcher('https://api.mailjet.com/v3.1/send', {
        method: 'POST', headers: { Authorization: `Basic ${btoa(`${this.key}:${this.secret}`)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Messages: [{ From: { Email: this.from }, To: [{ Email: email }], Subject: 'Sign in to Bricks administration', TextPart: `Open this link, then choose Continue sign-in:\n${url.href}\n\nThis link expires in 1 hour and can be used once.`, TrackOpens: 'disabled', TrackClicks: 'disabled' }] }),
        redirect: 'manual', signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error()
      const result = await response.json() as { Messages?: { Status?: string }[] }
      if (result.Messages?.length !== 1 || result.Messages[0].Status !== 'success') throw new Error()
    } catch { throw new Error('Mail delivery failed') }
  }
}
