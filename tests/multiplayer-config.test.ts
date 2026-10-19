import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFirebaseConfig } from '../src/multiplayer/config.ts'
import { MultiplayerError, playerFacingError } from '../src/multiplayer/errors.ts'

const production = {
  VITE_FIREBASE_API_KEY: 'public-web-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'bricks-review.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://bricks-review-default-rtdb.europe-west1.firebasedatabase.app',
  VITE_FIREBASE_PROJECT_ID: 'bricks-review',
  VITE_FIREBASE_APP_ID: '1:123456789:web:example',
}

test('single-player needs no Firebase configuration; incomplete config fails closed', () => {
  assert.equal(readFirebaseConfig({}), null)
  assert.equal(readFirebaseConfig({ VITE_FIREBASE_USE_EMULATORS: 'false' }), null)
  for (const key of Object.keys(production)) {
    assert.throws(() => readFirebaseConfig({ ...production, [key]: '' }), MultiplayerError)
  }
  assert.throws(() => readFirebaseConfig({ ...production, VITE_FIREBASE_APP_ID: ' padded ' }), MultiplayerError)
})

test('emulator mode uses only the demo project and cannot mix with real configuration', () => {
  const config = readFirebaseConfig({ VITE_FIREBASE_USE_EMULATORS: 'true' })
  assert.equal(config?.mode, 'emulator')
  assert.equal(config?.options.projectId, 'demo-bricks')
  assert.throws(() => readFirebaseConfig({ ...production, VITE_FIREBASE_USE_EMULATORS: 'true' }), MultiplayerError)
  assert.throws(() => readFirebaseConfig({ VITE_FIREBASE_USE_EMULATORS: true }), MultiplayerError)
})

test('production config requires HTTPS Firebase database endpoints without credentials or parameters', () => {
  assert.equal(readFirebaseConfig(production)?.mode, 'production')
  assert.equal(readFirebaseConfig({ ...production, VITE_FIREBASE_DATABASE_URL: 'https://bricks-review-default-rtdb.firebaseio.com' })?.mode, 'production')
  for (const url of ['http://localhost:9000', 'https://example.com', 'https://user:password@bricks.firebaseio.com', 'https://bricks.firebaseio.com?auth=credential', 'https://bricks.firebaseio.com/data', 'not-a-url']) {
    assert.throws(() => readFirebaseConfig({ ...production, VITE_FIREBASE_DATABASE_URL: url }), MultiplayerError)
  }
  assert.throws(() => readFirebaseConfig({ ...production, VITE_FIREBASE_PROJECT_ID: 'demo-bricks' }), MultiplayerError)
})

test('player errors never expose raw Firebase messages or credentials', () => {
  const message = 'Internal Firebase details: credential=private-value'
  assert.equal(playerFacingError({ code: 'auth/network-request-failed', message }).code, 'connection')
  assert.equal(playerFacingError({ code: 'PERMISSION_DENIED', message }).code, 'permission')
  assert.equal(playerFacingError({ code: 'auth/operation-not-allowed', message }).code, 'unavailable')
  assert.equal(playerFacingError(new Error(message)).message.includes('private-value'), false)
})
