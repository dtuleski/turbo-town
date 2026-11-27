/**
 * DC3 - seeded content generators for sudoku, math-challenge, math-maze, word-puzzle and hangman.
 */
import { addDays } from './day';
import { expectedTotals, generateContent } from './generators';
import { HANGMAN_MEDIUM_WORDS } from './generators/data/hangman-words';
import { WORD_PUZZLE_MEDIUM_WORDS } from './generators/data/word-puzzle-words';
import { mazeHasPath } from './generators/math-maze';
import { countSudokuSolutions } from './generators/sudoku';
import { CHALLENGE_ROTATION } from './rotation';
import { CHALLENGE_LANGUAGES } from './types';
import type {
  ChallengeContent,
  HangmanContent,
  MathChallengeContent,
  MathMazeContent,
  RotationEntry,
  SudokuContent,
  WordPuzzleContent,
} from './types';

const DAY = '2026-11-26';
const entryFor = (gameId: string): RotationEntry => CHALLENGE_ROTATION.find((e) => e.gameId === gameId) as RotationEntry;
const days = (n: number): string[] => Array.from({ length: n }, (_, i) => addDays(DAY, i));

function contentsOf<T extends ChallengeContent>(gameId: string, n: number): T[] {
  return days(n).map((d) => generateContent(entryFor(gameId), d) as T);
}

const GAMES = ['sudoku', 'math-challenge', 'math-maze', 'word-puzzle', 'hangman'];

describe.each(GAMES)('%s generator', (gameId) => {
  it('gives the same content for the same day', () => {
    const a = generateContent(entryFor(gameId), DAY);
    const b = generateContent(entryFor(gameId), DAY);
    expect(b).toEqual(a);
    expect(a.kind).toBe(gameId);
  });

  it('varies across 30 days', () => {
    const n = gameId === 'sudoku' ? 10 : 30;
    const distinct = new Set(contentsOf(gameId, n).map((c) => JSON.stringify(c)));
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it('survives a JSON round trip unchanged', () => {
    const content = generateContent(entryFor(gameId), DAY);
    expect(JSON.parse(JSON.stringify(content))).toEqual(content);
  });
});

describe('sudoku content', () => {
  const contents = contentsOf<SudokuContent>('sudoku', 6);

  it('has a valid solution that the puzzle agrees with, and a unique solution', () => {
    for (const { puzzle, solution } of contents) {
      expect(solution).toHaveLength(9);
      const groups: number[][] = [];
      for (let i = 0; i < 9; i++) {
        groups.push(solution[i] as number[]);
        groups.push(solution.map((row) => row[i] as number));
        const br = Math.floor(i / 3) * 3;
        const bc = (i % 3) * 3;
        groups.push(solution.slice(br, br + 3).flatMap((row) => row.slice(bc, bc + 3)));
      }
      for (const g of groups) expect([...g].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      puzzle.forEach((row, r) =>
        row.forEach((v, c) => {
          if (v !== null) expect(v).toBe(solution[r]?.[c]);
        })
      );
      expect(countSudokuSolutions(puzzle.map((row) => row.map((v) => v ?? 0)))).toBe(1);
    }
  });

  it('removes up to the medium 46 cells and expects one question per blank', () => {
    for (const c of contents) {
      const blanks = c.puzzle.flat().filter((v) => v === null).length;
      expect(blanks).toBeGreaterThan(30);
      expect(blanks).toBeLessThanOrEqual(46);
      expect(expectedTotals(c)).toEqual({ totalQuestions: blanks });
    }
  });
});

describe('math-challenge content', () => {
  const contents = contentsOf<MathChallengeContent>('math-challenge', 30);

  it('has 15 correct medium questions, none equal to the one before', () => {
    for (const { questions } of contents) {
      expect(questions).toHaveLength(15);
      questions.forEach((q, i) => {
        const m = /^(\d+) ([+\-×÷]) (\d+) = \?$/.exec(q.question);
        expect(m).not.toBeNull();
        const [a, op, b] = [Number(m?.[1]), m?.[2], Number(m?.[3])];
        const value = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b;
        expect(q.answer).toBe(value);
        expect(Number.isInteger(q.answer) && q.answer >= 0).toBe(true);
        expect(['addition', 'subtraction', 'multiplication', 'division']).toContain(q.operation);
        if (i > 0) expect(q.question).not.toBe(questions[i - 1]?.question);
      });
    }
  });

  it('expects 15 questions', () => {
    expect(expectedTotals(contents[0] as MathChallengeContent)).toEqual({ totalQuestions: 15 });
  });
});

describe('math-maze content', () => {
  const contents = contentsOf<MathMazeContent>('math-maze', 30);

  it('is a 10x10 maze with 5 to 8 gates, 4 to 6 collectibles and a path to the exit', () => {
    for (const { maze } of contents) {
      expect(maze.rows).toBe(10);
      expect(maze.cols).toBe(10);
      expect(maze.grid).toHaveLength(10);
      expect(maze.grid.every((row) => row.length === 10)).toBe(true);
      expect(maze.gates.length).toBeGreaterThanOrEqual(5);
      expect(maze.gates.length).toBeLessThanOrEqual(8);
      expect(maze.collectibles.length).toBeGreaterThanOrEqual(4);
      expect(maze.collectibles.length).toBeLessThanOrEqual(6);
      expect(maze.grid[maze.start.row]?.[maze.start.col]).toBe('start');
      expect(maze.grid[maze.exit.row]?.[maze.exit.col]).toBe('exit');
      for (const g of maze.gates) {
        expect(maze.grid[g.position.row]?.[g.position.col]).toBe('gate');
        expect(Number.isInteger(g.equation.answer)).toBe(true);
        // Every gate can be bypassed (a wrong answer blocks only that gate).
        expect(mazeHasPath(maze.grid, maze.start, maze.exit, new Set([`${g.position.row},${g.position.col}`]))).toBe(true);
      }
      for (const p of maze.collectibles) expect(maze.grid[p.row]?.[p.col]).toBe('collectible');
      expect(mazeHasPath(maze.grid, maze.start, maze.exit)).toBe(true);
    }
  });

  it('expects one question per gate', () => {
    for (const c of contents) expect(expectedTotals(c)).toEqual({ totalQuestions: c.maze.gates.length });
  });
});

/** True when `word` reads left-to-right, top-to-bottom or down-right diagonally from some cell. */
function inGrid(grid: string[][], word: string): boolean {
  const n = grid.length;
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
  ];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let i = 0; i < word.length && ok; i++) ok = grid[r + i * dr]?.[c + i * dc] === word[i];
        if (ok) return true;
      }
    }
  }
  return false;
}

describe('word-puzzle content', () => {
  const contents = contentsOf<WordPuzzleContent>('word-puzzle', 30);

  it('has a 12x12 grid per language with 8 distinct listed words, all in the grid', () => {
    for (const { byLanguage } of contents) {
      for (const lang of CHALLENGE_LANGUAGES) {
        const v = byLanguage[lang];
        expect(v.gridSize).toBe(12);
        expect(v.grid).toHaveLength(12);
        expect(v.grid.every((row) => row.length === 12 && row.every((ch) => /^[A-Z]$/.test(ch)))).toBe(true);
        expect(v.words).toHaveLength(8);
        expect(new Set(v.words).size).toBe(8);
        for (const w of v.words) {
          expect(WORD_PUZZLE_MEDIUM_WORDS[lang]).toContain(w);
          expect(inGrid(v.grid, w)).toBe(true);
        }
      }
    }
  });

  it('expects the same totalWords in every language', () => {
    for (const c of contents) {
      expect(expectedTotals(c)).toEqual({ totalWords: 8 });
      for (const lang of CHALLENGE_LANGUAGES) expect(expectedTotals(c, lang)).toEqual({ totalWords: 8 });
    }
  });
});

describe('hangman content', () => {
  const contents = contentsOf<HangmanContent>('hangman', 30);

  it('has 5 distinct medium words per language', () => {
    for (const { byLanguage } of contents) {
      for (const lang of CHALLENGE_LANGUAGES) {
        const words = byLanguage[lang];
        expect(words).toHaveLength(5);
        expect(new Set(words.map((w) => w.word)).size).toBe(5);
        for (const w of words) expect(HANGMAN_MEDIUM_WORDS[lang]).toContainEqual(w);
      }
    }
  });

  it('expects 5 questions in every language', () => {
    for (const c of contents) {
      expect(expectedTotals(c)).toEqual({ totalQuestions: 5 });
      for (const lang of CHALLENGE_LANGUAGES) expect(expectedTotals(c, lang)).toEqual({ totalQuestions: 5 });
    }
  });
});
