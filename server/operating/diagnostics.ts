// Public operational codes only. Never serialize upstream bodies, credentials,
// request URLs or arbitrary exception messages into a response or log.
export function accessFailureCode(error: unknown): string {
  const codes: Record<string, string> = {
    'Publisher key import failed': 'PUBLISHER_KEY_INVALID',
    'Publisher signing failed': 'PUBLISHER_SIGNING_FAILED',
    'Publisher connection failed': 'GOOGLE_CONNECTION_FAILED',
    'Database connection failed': 'DATABASE_CONNECTION_FAILED',
    'Publisher authentication failed': 'GOOGLE_AUTH_FAILED',
    'Database authorization failed': 'DATABASE_ACCESS_DENIED',
    'Database publication failed': 'DATABASE_REQUEST_FAILED',
    'Database read failed': 'DATABASE_REQUEST_FAILED',
    'Database version unavailable': 'DATABASE_VERSION_UNAVAILABLE',
    'Invalid operating configuration': 'OPERATING_CONFIG_INVALID',
    'Invalid operating policy': 'OPERATING_CONFIG_INVALID',
  }
  return error instanceof Error && Object.hasOwn(codes, error.message) ? codes[error.message] : 'UPSTREAM_UNAVAILABLE'
}
