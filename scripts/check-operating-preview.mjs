// Read-only checks. Do not print response bodies or provider credentials.
const origin = 'https://bricks-operating.l8p1.workers.dev'
const known = new Set(['GOOGLE_AUTH_FAILED', 'DATABASE_ACCESS_DENIED', 'DATABASE_REQUEST_FAILED', 'DATABASE_VERSION_UNAVAILABLE', 'OPERATING_CONFIG_INVALID', 'UPSTREAM_UNAVAILABLE', 'WORKER_CONFIGURATION_INVALID'])
try {
  const page = await fetch(`${origin}/admin/`, { redirect: 'error', signal: AbortSignal.timeout(18000) })
  if (!page.ok || !(await page.text()).includes('Bricks administration')) throw new Error('ADMIN_PAGE_UNAVAILABLE')
  const response = await fetch(`${origin}/api/access`, { redirect: 'error', signal: AbortSignal.timeout(18000) })
  const result = await response.json()
  if (!response.ok) throw new Error(known.has(result.code) ? result.code : 'ACCESS_CHECK_UNAVAILABLE')
  if (result.config?.version !== 1 || !['on', 'off', 'until'].includes(result.config?.single?.mode) || !['on', 'off', 'until'].includes(result.config?.multi?.mode)) throw new Error('ACCESS_RESPONSE_INVALID')
  console.log('Administrator page and live access configuration verified.')
} catch (error) {
  const safe = new Set([...known, 'ADMIN_PAGE_UNAVAILABLE', 'ACCESS_CHECK_UNAVAILABLE', 'ACCESS_RESPONSE_INVALID'])
  const code = safe.has(error?.message) ? error.message : 'PREVIEW_CONNECTION_FAILED'
  console.error(`::error title=Operating preview check::${code}`)
  process.exitCode = 1
}
