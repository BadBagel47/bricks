import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configureAccess, invitationToken, operatingOrigin } from '../src/access/client.ts'

test('Pages uses explicit HTTPS configuration; unset configuration preserves the existing development flow', () => {
  configureAccess({}, 'https://game.example.invalid/bricks/')
  assert.equal(operatingOrigin(), null)
  configureAccess({ VITE_OPERATING_ORIGIN: 'https://admin.example.invalid' }, 'https://game.example.invalid/bricks/')
  assert.equal(operatingOrigin(), 'https://admin.example.invalid')
  assert.throws(() => configureAccess({ VITE_OPERATING_ORIGIN: 'http://insecure.invalid' }, 'https://game.example.invalid/bricks/'))
  assert.throws(() => configureAccess({ VITE_OPERATING_ORIGIN: 'https://admin.example.invalid/path' }, 'https://game.example.invalid/bricks/'))
})

test('administrator game always uses its own origin even with a different Pages build origin', () => {
  configureAccess({ VITE_OPERATING_ORIGIN: 'https://production-admin.example.invalid' }, 'https://preview-admin.example.invalid/play/')
  assert.equal(operatingOrigin(), 'https://preview-admin.example.invalid')
  configureAccess({}, `https://game.example.invalid/bricks/?room=QWER#invite=${'a'.repeat(64)}`)
  assert.equal(invitationToken('QWER'), 'a'.repeat(64))
  assert.equal(invitationToken('ASDF'), undefined)
})
