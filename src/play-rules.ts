import { CLASSIC_RULES, MODERN_RULES } from './engine/types.ts'
import type { GameRules } from './engine/types.ts'

/**
 * F-046, F-052 – F-055: the rules a player chooses. Classic is every modern rule off (as the
 * NES game), Modern is every one on; Custom keeps the player's own choice of each.
 */
export interface PlayRules {
  readonly bag: boolean
  readonly kicks: boolean
  readonly lockDelay: boolean
  readonly threeNext: boolean
  readonly hold: boolean
  readonly ghost: boolean
  /** F-057: pieces may appear above the board when the top is full. */
  readonly above: boolean
  /** F-058: modern scoring (T-spins, combos, back-to-back); never part of Modern. */
  readonly scoring: boolean
}
export type RulesPreset = 'classic' | 'modern' | 'custom'
export const RULE_KEYS = ['bag', 'kicks', 'lockDelay', 'threeNext', 'hold', 'ghost', 'above', 'scoring'] as const
export const CLASSIC_PLAY: PlayRules = { bag: false, kicks: false, lockDelay: false, threeNext: false, hold: false, ghost: false, above: false, scoring: false }
export const MODERN_PLAY: PlayRules = { bag: true, kicks: true, lockDelay: true, threeNext: true, hold: true, ghost: true, above: true, scoring: false }
export const RULE_LABELS: Record<(typeof RULE_KEYS)[number], string> = { bag: '7-bag', kicks: 'Wall kicks', lockDelay: 'Lock delay', threeNext: '3 next pieces', hold: 'Hold', ghost: 'Ghost piece', above: 'Pieces above the board', scoring: 'Modern scoring' }

export interface RulesChoice { readonly preset: RulesPreset; readonly custom: PlayRules }
export const DEFAULT_RULES_CHOICE: RulesChoice = { preset: 'modern', custom: MODERN_PLAY }

/** The rules in force for a choice. */
export function playRules(choice: RulesChoice): PlayRules {
  return choice.preset === 'classic' ? CLASSIC_PLAY : choice.preset === 'modern' ? MODERN_PLAY : choice.custom
}

/** The engine's part of the rules (hold and the ghost piece are handled outside the rules object). */
export function engineRules(rules: PlayRules): GameRules {
  return { bag: rules.bag, kicks: rules.kicks, lockDelay: rules.lockDelay, preview: rules.threeNext ? 3 : 1, spawnAbove: rules.above, modernScoring: rules.scoring }
}
export function presetRules(preset: 'classic' | 'modern'): GameRules {
  return preset === 'modern' ? MODERN_RULES : CLASSIC_RULES
}

/** What a score was played with: Classic or Modern when every rule matches one of them, otherwise Custom. */
export function rulesLabel(rules: PlayRules): RulesPreset {
  if (RULE_KEYS.every(key => rules[key] === MODERN_PLAY[key])) return 'modern'
  if (RULE_KEYS.every(key => rules[key] === CLASSIC_PLAY[key])) return 'classic'
  return 'custom'
}

export function parseRulesChoice(value: unknown): RulesChoice {
  const v = value as RulesChoice | undefined
  const preset = v?.preset === 'classic' || v?.preset === 'modern' || v?.preset === 'custom' ? v.preset : DEFAULT_RULES_CHOICE.preset
  const c = (v?.custom ?? {}) as Partial<PlayRules>
  const custom = Object.fromEntries(RULE_KEYS.map(key => [key, typeof c[key] === 'boolean' ? c[key] : MODERN_PLAY[key]])) as unknown as PlayRules
  return { preset, custom }
}
