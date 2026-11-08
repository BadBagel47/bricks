import type { LinkMailer } from '../../modules/access-control/magic-links.ts'

export class ResendMailer implements LinkMailer {
  readonly key: string
  readonly from: string
  readonly origin: string
  readonly fetcher: typeof fetch
  constructor(key: string, from: string, origin: string, fetcher = fetch) {
    if (!key || !from || /[\r\n]/.test(from) || new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('Mail configuration unavailable')
    this.key = key; this.from = from; this.origin = origin; this.fetcher = fetcher
  }
  async send(email: string, token: string): Promise<void> {
    const url = new URL('/admin/', this.origin); url.hash = `token=${token}`
    const response = await this.fetcher('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [email], subject: 'Sign in to Bricks administration', text: `Open this link, then choose Continue sign-in:\n${url.href}\n\nThis link expires in 15 minutes and can be used once.` }),
      redirect: 'error', signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Mail delivery failed')
  }
}
