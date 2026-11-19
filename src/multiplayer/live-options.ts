import type { MatchResult } from './results.ts'
import type { PersonalSettings } from '../persistence.ts'
import type { KeyboardBindings } from '../input/keyboard.ts'
import type { GamepadBindings } from '../input/gamepad.ts'
import type { BricksAudio } from '../audio/synth.ts'
import type { ConnectionSummary } from './connection-stats.ts'

export interface MultiplayerPreferences {
  personal: PersonalSettings
  bindings: KeyboardBindings
  gamepadBindings: GamepadBindings
}
export interface LiveOptions {
  preferences: MultiplayerPreferences
  audio: BricksAudio
  completedId: string | null
  lastCompletedId: string | null
  onCompleted: (result: MatchResult, uid: string) => void
  onPlaying: (playing: boolean) => void
  /** F-036: the match's connection measurements, when it completes. */
  onConnection?: (summary: ConnectionSummary | null) => void
}
