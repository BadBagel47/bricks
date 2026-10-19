export type MultiplayerErrorCode = 'configuration' | 'connection' | 'unavailable' | 'permission'

const MESSAGES: Record<MultiplayerErrorCode, string> = {
  configuration: 'Multiplayer is not configured yet.',
  connection: 'Unable to connect. Check your connection and try again.',
  unavailable: 'Multiplayer is temporarily unavailable. Try again later.',
  permission: 'This action is not allowed for your player.',
}

export class MultiplayerError extends Error {
  readonly code: MultiplayerErrorCode

  constructor(code: MultiplayerErrorCode) {
    super(MESSAGES[code])
    this.name = 'MultiplayerError'
    this.code = code
  }
}

export function playerFacingError(error: unknown): MultiplayerError {
  if (error instanceof MultiplayerError) return error
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  if (code === 'auth/network-request-failed' || code === 'NETWORK_ERROR' || code === 'DISCONNECTED') {
    return new MultiplayerError('connection')
  }
  if (code === 'PERMISSION_DENIED' || code === 'auth/unauthorized-domain') return new MultiplayerError('permission')
  return new MultiplayerError('unavailable')
}
