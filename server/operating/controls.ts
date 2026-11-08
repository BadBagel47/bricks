import { INITIAL_OPERATING, parseOperating, publicAccess } from '../../modules/access-control/operating.ts'
import type { OperatingConfig, PrivateRoom } from '../../modules/access-control/operating.ts'
import { linkDigest } from '../../modules/access-control/magic-links.ts'
import type { SqlDatabase } from '../../modules/access-control/d1-store.ts'
import type { Publisher } from './publisher.ts'

const random = (count: number) => [...crypto.getRandomValues(new Uint8Array(count))].map(x => x.toString(16).padStart(2, '0')).join('')
interface Invite {
  id: string; code: string; expiresAt: number; state: 'pending' | 'active' | 'revoked'; ownerUid: string | null; ownerName: string | null
}
export class ControlError extends Error {
  readonly status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}
export class OperatingControls {
  readonly publisher: Publisher
  readonly sql: SqlDatabase
  readonly project: string
  readonly gameURL: string
  constructor(publisher: Publisher, sql: SqlDatabase, project: string, gameURL: string) {
    const url = new URL(gameURL)
    if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password) throw new Error('Invalid game URL')
    this.publisher = publisher; this.sql = sql; this.project = project; this.gameURL = url.href
  }
  async initialize(): Promise<OperatingConfig> {
    const current = await this.publisher.read<OperatingConfig>('operating/config')
    if (current.value !== null) return parseOperating(current.value)
    if (!await this.publisher.write('operating/config', INITIAL_OPERATING, current.etag)) return this.config()
    return INITIAL_OPERATING
  }
  async config(): Promise<OperatingConfig> { return parseOperating((await this.publisher.read('operating/config')).value) }
  async update(value: unknown, now: number): Promise<OperatingConfig> {
    let next: OperatingConfig
    try { next = parseOperating(value) } catch { throw new ControlError('Invalid operating configuration') }
    const current = await this.publisher.read<OperatingConfig>('operating/config')
    const previous = parseOperating(current.value)
    if (previous.revision + 1 !== next.revision) throw new ControlError('Settings changed. Refresh and try again.', 409)
    for (const mode of ['single', 'multi'] as const) {
      const policy = next[mode], before = previous[mode]
      if (policy.mode === 'until' && policy.expiresAt <= now && !(before.mode === 'until' && before.expiresAt === policy.expiresAt)) throw new ControlError('Choose a future closing time')
    }
    if (!await this.publisher.write('operating/config', next, current.etag)) throw new ControlError('Settings changed. Refresh and try again.', 409)
    return next
  }
  async solo(operator: boolean, now: number): Promise<boolean> { return operator || publicAccess(await this.config(), 'single', now) }
  async list(now = Date.now()): Promise<Pick<Invite, 'id' | 'code' | 'expiresAt' | 'state'>[]> {
    // SqlDatabase's minimal interface exposes first; JSON aggregation keeps the
    // adapter compatible with D1 and SQLite while bounding administrative reads.
    const result = await this.sql.prepare(`SELECT json_group_array(json_object('id', id, 'code', code, 'expiresAt', expires_at, 'state', state)) AS items
      FROM (SELECT id, code, expires_at, state FROM private_invites
        ORDER BY CASE WHEN state IN ('active', 'pending') AND expires_at > ? THEN 0 ELSE 1 END, created_at DESC LIMIT 100)`).bind(now).first<{ items: string }>()
    return JSON.parse(result?.items ?? '[]')
  }
  private deadline(expiresAt: number, now: number) {
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + 30 * 86_400_000) throw new ControlError('Choose a closing time within 30 days')
  }
  async create(expiresAt: number, now: number): Promise<{ id: string; code: string; expiresAt: number; url: string }> {
    this.deadline(expiresAt, now)
    const active = await this.sql.prepare("SELECT COUNT(*) AS n FROM private_invites WHERE expires_at > ? AND state IN ('active', 'pending')").bind(now).first<{ n: number }>()
    if ((active?.n ?? 0) >= 100) throw new ControlError('Too many active invitations', 409)
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = [...crypto.getRandomValues(new Uint8Array(4))].map(x => alphabet[x % 32]).join('')
      const id = random(16), token = random(32)
      const location = `roomReservations/${code}`
      const reservation = await this.publisher.read(location)
      if (reservation.value !== null) continue
      if (!await this.publisher.write(location, { version: 1, ownerUid: `private-${id}`, createdAt: { '.sv': 'timestamp' } }, reservation.etag)) continue
      await this.sql.prepare("INSERT INTO private_invites (id, digest, code, expires_at, state, created_at) VALUES (?, ?, ?, ?, 'pending', ?)")
        .bind(id, await linkDigest(`${this.project}:invite`, token), code, expiresAt, now).run()
      await this.publisher.write(`privateRooms/${code}`, { id, expiresAt, revoked: false })
      await this.sql.prepare("UPDATE private_invites SET state = 'active' WHERE id = ? AND state = 'pending'").bind(id).run()
      const url = new URL(this.gameURL)
      url.searchParams.set('room', code); url.hash = `invite=${token}`
      return { id, code, expiresAt, url: url.href }
    }
    throw new ControlError('Could not allocate a room code. Try again.', 409)
  }
  async revoke(id: string): Promise<void> {
    if (!/^[a-f0-9]{32}$/.test(id)) throw new ControlError('Invalid invitation')
    const invite = await this.sql.prepare('SELECT code, expires_at AS expiresAt FROM private_invites WHERE id = ?').bind(id).first<Invite>()
    if (!invite) throw new ControlError('Invitation not found', 404)
    // Firebase is authoritative for stopping starts; update it before reporting success.
    await this.publisher.write(`privateRooms/${invite.code}`, { id, expiresAt: invite.expiresAt, revoked: true })
    await this.sql.prepare("UPDATE private_invites SET state = 'revoked' WHERE id = ?").bind(id).run()
  }
  async redeem(token: string, uid: string, name: string, now: number): Promise<{ code: string }> {
    if (!/^[a-f0-9]{64}$/.test(token) || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) || typeof name !== 'string' || name.trim() !== name || name.length < 2 || name.length > 16 || /[\r\n\t]/.test(name)) throw new ControlError('Invalid invitation or player name')
    const digest = await linkDigest(`${this.project}:invite`, token)
    const invite = await this.sql.prepare(`UPDATE private_invites SET owner_uid = COALESCE(owner_uid, ?), owner_name = COALESCE(owner_name, ?)
      WHERE digest = ? AND state = 'active' AND expires_at > ?
      RETURNING id, code, expires_at AS expiresAt, state, owner_uid AS ownerUid, owner_name AS ownerName`).bind(uid, name, digest, now).first<Invite>()
    if (!invite) throw new ControlError('Invitation is invalid or expired', 403)
    const room = (await this.publisher.read<PrivateRoom>(`privateRooms/${invite.code}`)).value
    if (!room || room.id !== invite.id || room.revoked || room.expiresAt <= now) throw new ControlError('Invitation is invalid or expired', 403)
    // Any concurrent redeemer can finish initialization for the one SQL-elected
    // owner. Conditional writes never replace an existing room or guest.
    const reservationPath = `roomReservations/${invite.code}`
    const reservation = await this.publisher.read<{ ownerUid: string; createdAt: number; version: number }>(reservationPath)
    if (reservation.value?.ownerUid === `private-${invite.id}`) {
      if (!await this.publisher.write(reservationPath, { ...reservation.value, ownerUid: invite.ownerUid }, reservation.etag)) {
        const winner = (await this.publisher.read<{ ownerUid: string }>(reservationPath)).value
        if (winner?.ownerUid !== invite.ownerUid) throw new ControlError('Room ownership changed', 409)
      }
    } else if (reservation.value?.ownerUid !== invite.ownerUid) throw new ControlError('Room ownership changed', 409)
    const existing = await this.publisher.read(`rooms/${invite.code}`)
    if (!existing.value) await this.publisher.write(`rooms/${invite.code}`, {
      version: 1, ownerUid: invite.ownerUid, hostUid: invite.ownerUid, epoch: 1, status: 'waiting', createdAt: { '.sv': 'timestamp' },
      players: { host: { uid: invite.ownerUid, name: invite.ownerName } },
    }, existing.etag)
    await this.publisher.write(`roomAccess/${invite.code}/${uid}`, { id: invite.id, expiresAt: invite.expiresAt })
    return { code: invite.code }
  }
  async validInvitation(token: string, now: number): Promise<boolean> {
    if (!/^[a-f0-9]{64}$/.test(token)) return false
    return Boolean(await this.sql.prepare("SELECT id FROM private_invites WHERE digest = ? AND state = 'active' AND expires_at > ?")
      .bind(await linkDigest(`${this.project}:invite`, token), now).first())
  }
  async operator(uid: string, sessionId: string, subject: string, expiresAt: number): Promise<void> {
    // Allowlist provisioning is separate: a stale application instance must not
    // re-enable a revoked subject during an in-flight login.
    const allowed = (await this.publisher.read<boolean>(`adminAllowlist/${subject}`)).value
    if (allowed !== true) throw new ControlError('Administrator access revoked', 403)
    await this.sql.prepare(`INSERT INTO operator_mirrors (digest, subject, delete_after) VALUES (?, ?, ?)
      ON CONFLICT(digest) DO UPDATE SET delete_after = MAX(delete_after, excluded.delete_after)`).bind(sessionId, subject, expiresAt + 86_400_000).run()
    const path = `operatorSessions/${sessionId}`
    const current = await this.publisher.read<{ revoked: boolean }>(path)
    if (current.value?.revoked || !await this.publisher.write(path, { subject, expiresAt, revoked: false }, current.etag)) throw new ControlError('Administrator session changed', 409)
    await this.publisher.write(`operatorPlayers/${uid}`, { sessionId })
  }
  async revokeSession(sessionId: string): Promise<void> {
    await this.sql.prepare(`INSERT INTO operator_mirrors (digest, subject, delete_after) VALUES (?, '', ?)
      ON CONFLICT(digest) DO UPDATE SET delete_after = MAX(delete_after, excluded.delete_after)`).bind(sessionId, Date.now() + 2 * 86_400_000).run()
    await this.publisher.write(`operatorSessions/${sessionId}`, { revoked: true, expiresAt: 0, subject: '' })
  }
  async prune(now: number): Promise<void> {
    const rows = await this.sql.prepare(`SELECT json_group_array(json_object('digest', digest)) AS items
      FROM (SELECT digest FROM operator_mirrors WHERE delete_after <= ? LIMIT 10)`).bind(now).first<{ items: string }>()
    for (const { digest } of JSON.parse(rows?.items ?? '[]') as { digest: string }[]) {
      await this.publisher.write(`operatorSessions/${digest}`, null)
      await this.sql.prepare('DELETE FROM operator_mirrors WHERE digest = ? AND delete_after <= ?').bind(digest, now).run()
    }
    const pending = await this.sql.prepare(`SELECT json_group_array(json_object('id', id)) AS items
      FROM (SELECT id FROM private_invites WHERE state = 'pending' AND created_at < ? LIMIT 5)`).bind(now - 86_400_000).first<{ items: string }>()
    for (const { id } of JSON.parse(pending?.items ?? '[]') as { id: string }[]) await this.revoke(id)
    await this.sql.prepare("DELETE FROM private_invites WHERE expires_at < ? AND state != 'pending'").bind(now - 7 * 86_400_000).run()
  }
}
