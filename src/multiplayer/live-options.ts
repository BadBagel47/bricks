import type { PersonalSettings } from '../persistence.ts'
import type { KeyboardBindings } from '../input/keyboard.ts'
import type { GamepadBindings } from '../input/gamepad.ts'
import type { BricksAudio } from '../audio/synth.ts'

export interface MultiplayerPreferences {
  personal: PersonalSettings
  bindings: KeyboardBindings
  gamepadBindings: GamepadBindings
}
export interface LiveOptions {
  preferences: MultiplayerPreferences
  audio: BricksAudio
  onPlaying: (playing: boolean) => void
}
