// Daily Challenge - pure conversions from served challenge content to the state each first-batch
// game page plays (W4). The pages call these only in challenge mode (`?challenge=<day>`); without the
// param they keep their own generators.
import type { DailyChallengeView } from '@/types/challenge'
import type { BotDifficulty } from '@/utils/codeABotUtils'
import type { HangmanWord } from '@/utils/hangmanData'
import type { MathQuestion } from '@/utils/mathUtils'
import type { MazeData } from '@/utils/mazeGenerator'
import type { SudokuGrid } from '@/utils/sudokuUtils'
import type { WordPuzzle } from '@/utils/wordPuzzleUtils'
import {
  CHALLENGE_LANGUAGES,
  type ChallengeContent,
  type ChallengeContentKind,
  type ChallengeLanguage,
  type CodeABotContent,
  type HangmanContent,
  type MathChallengeContent,
  type MathMazeContent,
  type SudokuContent,
  type WordPuzzleContent,
} from '@/utils/challengeShared'

export type ContentOf<K extends ChallengeContentKind> = Extract<ChallengeContent, { kind: K }>

/** The content of `challenge` when it is today's challenge for this page's game, else null. */
export function selectChallengeContent<K extends ChallengeContentKind>(
  challenge: DailyChallengeView | null,
  kind: K,
  day: string
): ContentOf<K> | null {
  if (!challenge || challenge.day !== day || challenge.gameId !== kind || challenge.content.kind !== kind) return null
  return challenge.content as ContentOf<K>
}

const DIFFICULTY_NAMES: Record<number, 'easy' | 'medium' | 'hard'> = { 1: 'easy', 2: 'medium', 3: 'hard' }

/** Page difficulty name for a challenge difficulty number (2 = medium for every challenge). */
export function difficultyName(difficulty: number): 'easy' | 'medium' | 'hard' {
  return DIFFICULTY_NAMES[difficulty] ?? 'medium'
}

/** The content language for an i18n language tag: its base code when supported, else en. */
export function challengeLanguage(language: string | undefined): ChallengeLanguage {
  const base = (language ?? '').slice(0, 2).toLowerCase()
  return (CHALLENGE_LANGUAGES as readonly string[]).includes(base) ? (base as ChallengeLanguage) : 'en'
}

/** Code-a-Bot: the level numbers to play in order (the page reports one question per level). */
export function codeABotPlan(content: CodeABotContent): { difficulty: BotDifficulty; levelNumbers: number[] } {
  return { difficulty: content.difficulty, levelNumbers: [...content.levelNumbers] }
}

/** Sudoku: the page state; `initial` marks given cells, so blanks = 81 - given = totalQuestions. */
export function sudokuState(content: SudokuContent): { puzzle: SudokuGrid; solution: number[][]; initial: boolean[][] } {
  return {
    puzzle: content.puzzle.map((row) => [...row]),
    solution: content.solution.map((row) => [...row]),
    initial: content.puzzle.map((row) => row.map((cell) => cell !== null)),
  }
}

/** Math Challenge: the fixed question list, played in order. */
export function mathQuestions(content: MathChallengeContent): MathQuestion[] {
  return content.questions.map((q) => ({ ...q }))
}

/** Math Maze: a fresh copy of the served maze (the page reports one question per gate). */
export function mathMazeData(content: MathMazeContent): MazeData {
  const { maze } = content
  return {
    grid: maze.grid.map((row) => [...row]),
    start: { ...maze.start },
    exit: { ...maze.exit },
    gates: maze.gates.map((g) => ({ position: { ...g.position }, equation: { ...g.equation } })),
    collectibles: maze.collectibles.map((p) => ({ ...p })),
    rows: maze.rows,
    cols: maze.cols,
  }
}

/** Word Puzzle: the variant for the player's language (fallback en). */
export function wordPuzzleFor(content: WordPuzzleContent, language: string | undefined): WordPuzzle {
  const v = content.byLanguage[challengeLanguage(language)] ?? content.byLanguage.en
  return { grid: v.grid.map((row) => [...row]), words: [...v.words], foundWords: new Set(), gridSize: v.gridSize }
}

/** Hangman: the rounds' words for the player's language (fallback en). */
export function hangmanWordsFor(content: HangmanContent, language: string | undefined): HangmanWord[] {
  const words = content.byLanguage[challengeLanguage(language)] ?? content.byLanguage.en
  return words.map((w) => ({ ...w }))
}
