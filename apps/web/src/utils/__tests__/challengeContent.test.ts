import { describe, expect, it } from 'vitest'
import type { DailyChallengeView } from '@/types/challenge'
import { getTotalLevels } from '../codeABotUtils'
import { hasPathToExit } from '../mazeGenerator'
import { checkWord } from '../wordPuzzleUtils'
import {
  challengeLanguage,
  codeABotPlan,
  difficultyName,
  hangmanWordsFor,
  mathMazeData,
  mathQuestions,
  selectChallengeContent,
  sudokuState,
  wordPuzzleFor,
} from '../challengeContent'
import {
  CHALLENGE_LANGUAGES,
  CHALLENGE_ROTATION,
  expectedTotals,
  generateContent,
  type ChallengeContent,
  type RotationEntry,
} from '../challengeShared'

const DAYS = ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']

function contents<K extends ChallengeContent['kind']>(kind: K): Extract<ChallengeContent, { kind: K }>[] {
  const entry = CHALLENGE_ROTATION.find((e) => e.gameId === kind) as RotationEntry
  return DAYS.map((d) => generateContent(entry, d) as Extract<ChallengeContent, { kind: K }>)
}

const view = (content: ChallengeContent, over: Partial<DailyChallengeView> = {}): DailyChallengeView => ({
  day: '2026-11-26',
  gameId: content.kind,
  themeId: 'X',
  difficulty: 2,
  settings: {},
  content,
  endsAt: '2026-11-27T05:00:00.000Z',
  me: null,
  ...over,
})

describe('selectChallengeContent', () => {
  const [sudoku] = contents('sudoku')
  it("returns the content for this page's game and day", () => {
    expect(selectChallengeContent(view(sudoku), 'sudoku', '2026-11-26')).toBe(sudoku)
  })
  it('returns null for another game, another day or no challenge', () => {
    expect(selectChallengeContent(view(sudoku), 'hangman', '2026-11-26')).toBeNull()
    expect(selectChallengeContent(view(sudoku), 'sudoku', '2026-11-25')).toBeNull()
    expect(selectChallengeContent(view(sudoku, { gameId: 'hangman' }), 'sudoku', '2026-11-26')).toBeNull()
    expect(selectChallengeContent(null, 'sudoku', '2026-11-26')).toBeNull()
  })
})

describe('difficultyName and challengeLanguage', () => {
  it('maps the challenge difficulty to the page names', () => {
    expect([1, 2, 3].map(difficultyName)).toEqual(['easy', 'medium', 'hard'])
  })
  it('uses the base language code, falling back to en', () => {
    expect(challengeLanguage('pt-BR')).toBe('pt')
    expect(challengeLanguage('es')).toBe('es')
    expect(challengeLanguage('EN-us')).toBe('en')
    expect(challengeLanguage('fr')).toBe('en')
    expect(challengeLanguage(undefined)).toBe('en')
  })
})

// Each block derives the totals exactly as its page reports them in completeGame.
describe('page totals equal expectedTotals', () => {
  it('code-a-bot: one question per served level', () => {
    for (const c of contents('code-a-bot')) {
      const plan = codeABotPlan(c)
      expect(plan).toEqual({ difficulty: 'medium', levelNumbers: [1, 2, 3, 4, 5] })
      expect(getTotalLevels(plan.difficulty)).toBe(plan.levelNumbers.length)
      expect({ totalQuestions: plan.levelNumbers.length }).toEqual(expectedTotals(c))
    }
  })

  it('sudoku: filled cells = 81 - given cells', () => {
    for (const c of contents('sudoku')) {
      const s = sudokuState(c)
      expect(s.puzzle).toEqual(c.puzzle)
      expect(s.puzzle).not.toBe(c.puzzle)
      const given = s.initial.flat().filter(Boolean).length
      expect({ totalQuestions: 81 - given }).toEqual(expectedTotals(c))
    }
  })

  it('math-challenge: the served list length', () => {
    for (const c of contents('math-challenge')) {
      const qs = mathQuestions(c)
      expect(qs).toEqual(c.questions)
      expect({ totalQuestions: qs.length }).toEqual(expectedTotals(c))
    }
  })

  it('math-maze: one question per gate, playable with the web path check', () => {
    for (const c of contents('math-maze')) {
      const maze = mathMazeData(c)
      expect(maze).toEqual(c.maze)
      maze.grid[0][0] = 'path'
      expect(c.maze.grid[0][0]).toBe('wall')
      expect(hasPathToExit(maze.grid, maze.start, maze.exit)).toBe(true)
      expect({ totalQuestions: maze.gates.length }).toEqual(expectedTotals(c))
    }
  })

  it('word-puzzle: words.length in every language, every word findable with the web checker', () => {
    for (const c of contents('word-puzzle')) {
      for (const lang of [...CHALLENGE_LANGUAGES, 'pt-BR', 'fr']) {
        const p = wordPuzzleFor(c, lang)
        expect(p.words).toEqual(c.byLanguage[challengeLanguage(lang)].words)
        expect(p.foundWords.size).toBe(0)
        expect({ totalWords: p.words.length }).toEqual(expectedTotals(c, challengeLanguage(lang)))
        expect({ totalWords: p.words.length }).toEqual(expectedTotals(c))
      }
      // Selecting a placed word's cells in the grid is accepted by the page's checkWord.
      const p = wordPuzzleFor(c, 'en')
      const word = p.words[0]
      const cells = findCells(p.grid, word)
      expect(checkWord(p.grid, cells, p.words)).toBe(word)
    }
  })

  it('hangman: one round per served word in every language', () => {
    for (const c of contents('hangman')) {
      for (const lang of [...CHALLENGE_LANGUAGES, 'fr']) {
        const words = hangmanWordsFor(c, lang)
        expect(words).toEqual(c.byLanguage[challengeLanguage(lang)])
        expect({ totalQuestions: words.length }).toEqual(expectedTotals(c, challengeLanguage(lang)))
      }
    }
  })
})

function findCells(grid: string[][], word: string): { row: number; col: number }[] {
  const n = grid.length
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
      ]) {
        const cells = Array.from({ length: word.length }, (_, i) => ({ row: r + i * dr, col: c + i * dc }))
        if (cells.every((p, i) => grid[p.row]?.[p.col] === word[i])) return cells
      }
    }
  }
  return []
}
