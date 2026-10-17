import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addHighscore, DEFAULT_PERSONAL_SETTINGS, DEFAULT_SINGLE_PLAYER_SETTINGS, parseHighscores, parsePersonalSettings, parseSinglePlayerSettings, serializeHighscores } from '../src/persistence.ts'
import type { HighscoreRecord } from '../src/persistence.ts'

function score(id: string, points: number, username = 'Player'): HighscoreRecord {
  return { id, username, score: points, level: 2, lines: 10, achievedAt: '2026-10-17T12:00:00.000Z' }
}

test('personal and single-player settings load safe defaults and validate saved values', () => {
  assert.deepEqual(parsePersonalSettings(null), DEFAULT_PERSONAL_SETTINGS)
  assert.deepEqual(parsePersonalSettings('{"hardDropEnabled":false}'), { version: 1, hardDropEnabled: false, musicEnabled: true, musicVolume: 70, effectsEnabled: true, effectsVolume: 70, mobileControlMethod: 'dpad', touchButtonSize: 56, leftHandedControls: false, hideTouchControlsWhenController: true })
  assert.deepEqual(parsePersonalSettings('{"musicEnabled":false,"musicVolume":120,"effectsEnabled":false,"effectsVolume":25,"mobileControlMethod":"swipe","touchButtonSize":72,"leftHandedControls":true}'), { version: 1, hardDropEnabled: true, musicEnabled: false, musicVolume: 70, effectsEnabled: false, effectsVolume: 25, mobileControlMethod: 'swipe', touchButtonSize: 72, leftHandedControls: true, hideTouchControlsWhenController: true })
  assert.deepEqual(parseSinglePlayerSettings('{"startLevel":19,"holdEnabled":true}'), { version: 1, startLevel: 19, holdEnabled: true })
  assert.deepEqual(parseSinglePlayerSettings('{"startLevel":20,"holdEnabled":"yes"}'), DEFAULT_SINGLE_PLAYER_SETTINGS)
})

test('highscores sort descending, preserve historical names and keep only ten', () => {
  const records = Array.from({ length: 12 }, (_, index) => score(`run-${index}`, index * 100, `Name ${index}`))
  const result = addHighscore(records, score('run-new', 550, 'Old Name'))
  assert.equal(result.records.length, 10)
  assert.deepEqual(result.records.slice(0, 3).map(({ score: points }) => points), [1100, 1000, 900])
  assert.equal(result.rank, 7)
  const serialized = serializeHighscores(result.records)
  assert.equal(parseHighscores(serialized)[6].username, 'Old Name')
  assert.equal(parseHighscores('{').length, 0)
})

test('top score is marked as a record and duplicate run IDs are not written twice', () => {
  const first = addHighscore([], score('run-1', 500))
  assert.equal(first.isNewRecord, true)
  assert.equal(first.rank, 1)
  const duplicate = addHighscore(first.records, score('run-1', 900, 'Changed Name'))
  assert.equal(duplicate.records.length, 1)
  assert.equal(duplicate.records[0].score, 500)
  assert.equal(duplicate.records[0].username, 'Player')
  assert.equal(duplicate.isNewRecord, false)
})

test('scores outside the top ten are not assigned a rank', () => {
  const topTen = Array.from({ length: 10 }, (_, index) => score(`run-${index}`, 1000 - index * 10))
  const result = addHighscore(topTen, score('run-low', 1))
  assert.equal(result.records.length, 10)
  assert.equal(result.rank, null)
  assert.equal(result.isNewRecord, false)
})
