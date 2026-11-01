import { GAME_THEMES, ROUTES } from '@/config/constants'
import type { DifficultyLevel, GameTheme } from '@/types/game'
import type { LegView } from '@/types/quest'
import { QUEST_CARD_THEME_IDS, type QuestContext } from '@/utils/questShared'

const ID_PATTERN = /^[a-z0-9-]{1,40}$/
const LEG_INDEX_PATTERN = /^[0-2]$/

/**
 * Reads `quest=<worldId>:<nodeId>:<legIndex>` from a query string. Anything that is not exactly
 * that shape returns null; it never throws. With several `quest` params the first one is used.
 * The web does not check that the world or node exists: the server does.
 */
export function parseQuestParam(search: string): QuestContext | null {
  try {
    const raw = new URLSearchParams(search).get('quest')
    if (raw === null) return null
    const parts = raw.split(':')
    if (parts.length !== 3) return null
    const [worldId, nodeId, legText] = parts
    if (!ID_PATTERN.test(worldId) || !ID_PATTERN.test(nodeId) || !LEG_INDEX_PATTERN.test(legText)) {
      return null
    }
    return { worldId, nodeId, legIndex: Number(legText) }
  } catch {
    return null
  }
}

export interface QuestLegRef {
  worldId: string
  nodeId: string
  legIndex: number
}

/** The slice of a leg the launch builder reads (works for server views and config legs). */
export type LaunchLeg = Pick<LegView, 'themeId' | 'difficulty'> & {
  params?: { levelId?: string | null; pageTheme?: string | null } | null
}

type LaunchKind = 'card' | 'difficulty' | 'sequence' | 'pattern' | 'circuit'

interface LaunchRow {
  kind: LaunchKind
  route: string
  /** Locale key for the game name. */
  nameKey: string
}

const CARD_ROWS: [string, LaunchRow][] = QUEST_CARD_THEME_IDS.map((id) => [
  id,
  { kind: 'card', route: ROUTES.GAME, nameKey: `quest.games.${id}` },
])

function row(kind: LaunchKind, themeId: string, route: string): [string, LaunchRow] {
  return [themeId, { kind, route, nameKey: `quest.games.${themeId}` }]
}

/** Launch table (U1): one row per themeId the quest config can use. */
export const QUEST_LAUNCH_TABLE: Readonly<Record<string, LaunchRow>> = Object.freeze(
  Object.fromEntries([
    ...CARD_ROWS,
    row('difficulty', 'MATH_CHALLENGE', ROUTES.MATH_GAME),
    row('difficulty', 'WORD_PUZZLE', ROUTES.WORD_PUZZLE_GAME),
    row('sequence', 'SEQUENCE_MEMORY', ROUTES.SEQUENCE_MEMORY_GAME),
    row('pattern', 'PATTERN_RECALL', ROUTES.PATTERN_RECALL_GAME),
    row('difficulty', 'GEO_QUIZ', ROUTES.GEO_QUIZ_GAME),
    row('difficulty', 'MATH_MAZE', ROUTES.MATH_MAZE_GAME),
    row('difficulty', 'BUBBLE_POP', ROUTES.BUBBLE_POP_GAME),
    row('difficulty', 'BOND_AND_BURN', ROUTES.BOND_AND_BURN_GAME),
    row('difficulty', 'SPACE_ENTRY', ROUTES.SPACE_ENTRY_GAME),
    row('difficulty', 'TRAFFIC_LAB', ROUTES.TRAFFIC_LAB_GAME),
    row('difficulty', 'MINI_GOLF', ROUTES.MINI_GOLF_GAME),
    row('difficulty', 'SCRATCH_CODING', ROUTES.SCRATCH_CODING_GAME),
    row('circuit', 'CIRCUIT_BUILDER', ROUTES.CIRCUIT_BUILDER_GAME),
  ])
)

/** Locale key for a leg's game name, or null for an unknown themeId. */
export function getGameNameKey(themeId: string): string | null {
  return Object.prototype.hasOwnProperty.call(QUEST_LAUNCH_TABLE, themeId)
    ? QUEST_LAUNCH_TABLE[themeId].nameKey
    : null
}

const DIFFICULTY_NAMES: Record<number, string> = { 1: 'easy', 2: 'medium', 3: 'hard' }

/**
 * Builds the game URL for one leg, ending with `quest=<w>:<n>:<i>`. Returns null when the leg
 * cannot be launched (unknown themeId, missing required param, difficulty not valid for the page).
 * Every value goes through URLSearchParams; nothing is concatenated raw.
 */
export function buildLaunchUrl(leg: LaunchLeg, ref: QuestLegRef): string | null {
  if (!Object.prototype.hasOwnProperty.call(QUEST_LAUNCH_TABLE, leg.themeId)) return null
  const entry = QUEST_LAUNCH_TABLE[leg.themeId]
  const query = new URLSearchParams()
  const name = DIFFICULTY_NAMES[leg.difficulty]

  switch (entry.kind) {
    case 'card':
      if (!name) return null
      query.set('theme', leg.themeId)
      query.set('difficulty', name)
      break
    case 'difficulty':
      if (!name) return null
      query.set('difficulty', name)
      break
    case 'sequence':
      if (!name) return null
      query.set('difficulty', name)
      if (leg.params?.pageTheme) query.set('theme', leg.params.pageTheme)
      break
    case 'pattern':
      if (!name || !leg.params?.pageTheme) return null
      query.set('theme', leg.params.pageTheme)
      query.set('difficulty', name)
      break
    case 'circuit':
      if (!Number.isInteger(leg.difficulty) || leg.difficulty < 1 || leg.difficulty > 4) return null
      if (!leg.params?.levelId) return null
      query.set('difficulty', String(leg.difficulty))
      query.set('level', leg.params.levelId)
      break
  }

  query.set('quest', `${ref.worldId}:${ref.nodeId}:${ref.legIndex}`)
  return `${entry.route}?${query.toString()}`
}

const CARD_THEME_IDS: readonly string[] = GAME_THEMES.map((theme) => theme.id)
const MEMORY_DIFFICULTIES: Record<string, DifficultyLevel> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
}

export interface GameSettings {
  theme?: GameTheme
  difficulty?: DifficultyLevel
}

/**
 * Memory Match settings: router state wins; otherwise `?theme=` and `?difficulty=` (the quest
 * launch URL). Invalid or missing values stay undefined, so the page's redirect to setup applies.
 */
export function resolveGameSettings(state: unknown, search: string): GameSettings {
  const fromState = (state ?? {}) as { theme?: GameTheme; difficulty?: DifficultyLevel }
  if (fromState.theme && fromState.difficulty) {
    return { theme: fromState.theme, difficulty: fromState.difficulty }
  }
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return {}
  }
  const theme = params.get('theme')
  const difficulty = params.get('difficulty')?.toLowerCase()
  if (
    theme === null ||
    !CARD_THEME_IDS.includes(theme) ||
    !difficulty ||
    !Object.prototype.hasOwnProperty.call(MEMORY_DIFFICULTIES, difficulty)
  ) {
    return {}
  }
  return { theme: theme as GameTheme, difficulty: MEMORY_DIFFICULTIES[difficulty] }
}
