import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accessFailureCode } from '../server/operating/diagnostics.ts'

test('access failure codes identify fixed stages without exposing arbitrary upstream details', () => {
  assert.equal(accessFailureCode(new Error('Publisher authentication failed')), 'GOOGLE_AUTH_FAILED')
  assert.equal(accessFailureCode(new Error('Database authorization failed')), 'DATABASE_ACCESS_DENIED')
  assert.equal(accessFailureCode(new Error('Invalid operating configuration')), 'OPERATING_CONFIG_INVALID')
  for (const failure of [new Error('private key or provider response'), new Error('constructor'), new Error('toString'), 'secret', null]) {
    assert.equal(accessFailureCode(failure), 'UPSTREAM_UNAVAILABLE')
  }
})
