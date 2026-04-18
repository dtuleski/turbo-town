/**
 * Pattern Recall game logic, theme data, and configuration.
 * Pure TypeScript — no React dependencies.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type PatternRecallTheme = 'colors' | 'animals' | 'musical-notes' | 'emojis'
export type PatternRecallDifficulty = 'easy' | 'medium' | 'hard'

export interface ThemeItem {
  id: string
  label: string        // i18n key for the item name
  visual: string       // CSS color hex, emoji, or icon identifier
  type: 'color' | 'emoji' | 'icon'
}

export interface ThemeConfig {
  id: PatternRecallTheme
  labelKey: string     // i18n key for theme name
  icon: string         // emoji for theme card
  items: ThemeItem[]   // all available items (6 max, sliced by difficulty)
}

export interface DifficultyConfig {
  id: PatternRecallDifficulty
  labelKey: string     // i18n key
  descriptionKey: string
  itemCount: number    // 4, 5, or 6
  playbackSpeed: number // ms per item
  difficultyValue: number // 1, 2, or 3 (for API)
}

// ── Theme Data ─────────────────────────────────────────────────────────

export const THEMES: Record<PatternRecallTheme, ThemeConfig> = {
  colors: {
    id: 'colors',
    labelKey: 'patternRecall.themes.colors',
    icon: '🎨',
    items: [
      { id: 'red',    label: 'patternRecall.items.red',    visual: '#EF4444', type: 'color' },
      { id: 'blue',   label: 'patternRecall.items.blue',   visual: '#3B82F6', type: 'color' },
      { id: 'green',  label: 'patternRecall.items.green',  visual: '#22C55E', type: 'color' },
      { id: 'yellow', label: 'patternRecall.items.yellow', visual: '#EAB308', type: 'color' },
      { id: 'purple', label: 'patternRecall.items.purple', visual: '#A855F7', type: 'color' },
      { id: 'orange', label: 'patternRecall.items.orange', visual: '#F97316', type: 'color' },
    ],
  },
  animals: {
    id: 'animals',
    labelKey: 'patternRecall.themes.animals',
    icon: '🐾',
    items: [
      { id: 'dog',     label: 'patternRecall.items.dog',     visual: '🐶', type: 'emoji' },
      { id: 'cat',     label: 'patternRecall.items.cat',     visual: '🐱', type: 'emoji' },
      { id: 'rabbit',  label: 'patternRecall.items.rabbit',  visual: '🐰', type: 'emoji' },
      { id: 'bear',    label: 'patternRecall.items.bear',    visual: '🐻', type: 'emoji' },
      { id: 'fox',     label: 'patternRecall.items.fox',     visual: '🦊', type: 'emoji' },
      { id: 'penguin', label: 'patternRecall.items.penguin', visual: '🐧', type: 'emoji' },
    ],
  },
  'musical-notes': {
    id: 'musical-notes',
    labelKey: 'patternRecall.themes.musicalNotes',
    icon: '🎵',
    items: [
      { id: 'quarter',  label: 'patternRecall.items.quarterNote',  visual: '🎵', type: 'emoji' },
      { id: 'eighth',   label: 'patternRecall.items.eighthNote',   visual: '🎶', type: 'emoji' },
      { id: 'trumpet',  label: 'patternRecall.items.trumpet',      visual: '🎺', type: 'emoji' },
      { id: 'guitar',   label: 'patternRecall.items.guitar',       visual: '🎸', type: 'emoji' },
      { id: 'drum',     label: 'patternRecall.items.drum',         visual: '🥁', type: 'emoji' },
      { id: 'piano',    label: 'patternRecall.items.piano',        visual: '🎹', type: 'emoji' },
    ],
  },
  emojis: {
    id: 'emojis',
    labelKey: 'patternRecall.themes.emojis',
    icon: '😀',
    items: [
      { id: 'smile',   label: 'patternRecall.items.smile',   visual: '😀', type: 'emoji' },
      { id: 'heart',   label: 'patternRecall.items.heart',   visual: '❤️', type: 'emoji' },
      { id: 'star',    label: 'patternRecall.items.star',    visual: '⭐', type: 'emoji' },
      { id: 'fire',    label: 'patternRecall.items.fire',    visual: '🔥', type: 'emoji' },
      { id: 'rainbow', label: 'patternRecall.items.rainbow', visual: '🌈', type: 'emoji' },
      { id: 'rocket',  label: 'patternRecall.items.rocket',  visual: '🚀', type: 'emoji' },
    ],
  },
}

// ── Difficulty Configuration ───────────────────────────────────────────

export const DIFFICULTIES: Record<PatternRecallDifficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    labelKey: 'patternRecall.difficulty.easy',
    descriptionKey: 'patternRecall.difficulty.easyDesc',
    itemCount: 4,
    playbackSpeed: 800,
    difficultyValue: 1,
  },
  medium: {
    id: 'medium',
    labelKey: 'patternRecall.difficulty.medium',
    descriptionKey: 'patternRecall.difficulty.mediumDesc',
    itemCount: 5,
    playbackSpeed: 600,
    difficultyValue: 2,
  },
  hard: {
    id: 'hard',
    labelKey: 'patternRecall.difficulty.hard',
    descriptionKey: 'patternRecall.difficulty.hardDesc',
    itemCount: 6,
    playbackSpeed: 400,
    difficultyValue: 3,
  },
}

// ── Functions ──────────────────────────────────────────────────────────

/** Get the items for a given theme and difficulty (slices to itemCount) */
export function getGridItems(
  theme: PatternRecallTheme,
  difficulty: PatternRecallDifficulty
): ThemeItem[] {
  const themeConfig = THEMES[theme]
  const difficultyConfig = DIFFICULTIES[difficulty]
  return themeConfig.items.slice(0, difficultyConfig.itemCount)
}

/** Generate the initial sequence (length 1) with a random item index */
export function generateInitialSequence(itemCount: number): number[] {
  return [Math.floor(Math.random() * itemCount)]
}

/** Extend an existing sequence by appending one random item index */
export function extendSequence(sequence: number[], itemCount: number): number[] {
  return [...sequence, Math.floor(Math.random() * itemCount)]
}

/** Validate a single tap: returns true if the tapped index matches the expected */
export function validateTap(
  sequence: number[],
  inputIndex: number,
  tappedIndex: number
): boolean {
  return tappedIndex === sequence[inputIndex]
}

/** Get the playback speed for a difficulty */
export function getPlaybackSpeed(difficulty: PatternRecallDifficulty): number {
  return DIFFICULTIES[difficulty].playbackSpeed
}

/** Get the difficulty numeric value for the API */
export function getDifficultyValue(difficulty: PatternRecallDifficulty): number {
  return DIFFICULTIES[difficulty].difficultyValue
}
