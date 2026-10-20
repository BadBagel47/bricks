export type MultiplayerErrorCode = 'configuration' | 'connection' | 'unavailable' | 'permission' | 'invalid-code' | 'room-not-found' | 'room-closed' | 'room-full' | 'session-expired' | 'code-taken' | 'ownership-lost'

const MESSAGES: Record<MultiplayerErrorCode, string> = {
  configuration: 'Multiplayer is not configured yet.',
  connection: 'Unable to connect. Check your connection and try again.',
  unavailable: 'Multiplayer is temporarily unavailable. Try again later.',
  permission: 'This action is not allowed for your player.',
  'invalid-code': 'Enter a valid room code.',
  'room-not-found': "This room doesn't exist. Check the code and try again, or ask the host for a new invite link.",
  'room-closed': 'This room is currently inactive. Ask the host to reopen it.',
  'room-full': 'This room already has two players.',
  'session-expired': 'This invitation is no longer active.',
  'code-taken': 'This code is already reserved. Choose another code.',
  'ownership-lost': 'This room belongs to another player identity. If your browser identity was deleted, create a new room.',
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
