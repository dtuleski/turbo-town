// Circuit Builder — guided level catalog helper.
//
// Pure lookups over the engine's level registry plus the URL contract of the game page. Copy is
// addressed by key only; the strings live in the locale files.

import { listLevels } from './circuitEngine'
import type { LevelDefinition } from './circuitEngine'

export type GuidedDifficulty = 1 | 2 | 3 | 4

export const GUIDED_DIFFICULTIES: readonly GuidedDifficulty[] = [1, 2, 3, 4]

export type LevelCopyField = 'title' | 'goal' | 'hint' | 'learn'
export type DifficultyCopyField = 'name' | 'summary' | 'disclosure' | 'levels'

export interface GameSearch {
  difficulty: GuidedDifficulty
  level: LevelDefinition
}

const SANDBOX_ID = 'sandbox'

function isGuided(level: LevelDefinition): boolean {
  return level.id !== SANDBOX_ID && level.successConditionId !== 'none'
}

/** Every guided level, in id order (the registry already sorts; this keeps it explicit). */
export function listGuidedLevels(): LevelDefinition[] {
  return listLevels()
    .filter(isGuided)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function guidedLevelsForDifficulty(difficulty: number): LevelDefinition[] {
  return listGuidedLevels().filter((level) => level.difficulty === difficulty)
}

export function findGuidedLevel(id: string): LevelDefinition | null {
  return listGuidedLevels().find((level) => level.id === id) ?? null
}

/** The level after `id` in curriculum order, or `null` at the end or for an unknown id. */
export function nextGuidedLevel(id: string): LevelDefinition | null {
  const levels = listGuidedLevels()
  const index = levels.findIndex((level) => level.id === id)
  if (index < 0) {
    return null
  }
  return levels[index + 1] ?? null
}

function isGuidedDifficulty(value: number): value is GuidedDifficulty {
  return GUIDED_DIFFICULTIES.includes(value as GuidedDifficulty)
}

/**
 * Parse `?difficulty=<1-4>&level=<id>`. Anything that is not a guided level whose own difficulty
 * matches the requested one yields `null`. Never throws.
 */
export function parseGameSearch(search: string): GameSearch | null {
  try {
    const params = new URLSearchParams(search)
    const rawDifficulty = params.get('difficulty')
    const rawLevel = params.get('level')
    if (rawDifficulty === null || rawLevel === null || !/^[1-4]$/.test(rawDifficulty)) {
      return null
    }
    const difficulty = Number(rawDifficulty)
    if (!isGuidedDifficulty(difficulty)) {
      return null
    }
    const level = findGuidedLevel(rawLevel)
    if (level === null || level.difficulty !== difficulty) {
      return null
    }
    return { difficulty, level }
  } catch {
    return null
  }
}

export function levelCopyKey(levelId: string, field: LevelCopyField): string {
  return `circuitBuilder.level.${levelId}.${field}`
}

export function difficultyCopyKey(difficulty: number, field: DifficultyCopyField): string {
  return `circuitBuilder.difficulty.${String(difficulty)}.${field}`
}
