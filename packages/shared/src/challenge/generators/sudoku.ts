/**
 * Daily Challenge - Sudoku generator. Port of `apps/web/src/utils/sudokuUtils.ts` `generateSudoku`
 * with every `Math.random` replaced by the seeded rng: fill a full grid by shuffled backtracking, then
 * remove cells in shuffled order while the puzzle keeps exactly one solution.
 */
import { shuffle } from '../rng';
import type { ChallengeTotals, RotationEntry, SudokuContent } from '../types';

/** `CELLS_TO_REMOVE.medium` in the web generator. */
const DEFAULT_BLANKS = 46;

type Grid = number[][];

function cell(grid: Grid, row: number, col: number): number {
  return (grid[row] as number[])[col] as number;
}

function setCell(grid: Grid, row: number, col: number, value: number): void {
  (grid[row] as number[])[col] = value;
}

function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) if (cell(grid, row, c) === num) return false;
  for (let r = 0; r < 9; r++) if (cell(grid, r, col) === num) return false;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) if (cell(grid, r, c) === num) return false;
  }
  return true;
}

function fillGrid(grid: Grid, rng: () => number): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (cell(grid, row, col) !== 0) continue;
      for (const num of shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (isValid(grid, row, col, num)) {
          setCell(grid, row, col, num);
          if (fillGrid(grid, rng)) return true;
          setCell(grid, row, col, 0);
        }
      }
      return false;
    }
  }
  return true;
}

/** Number of solutions, stopping at `limit`. Mutates and restores `grid`. */
export function countSudokuSolutions(grid: Grid, limit = 2): number {
  let count = 0;
  const solve = (): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (cell(grid, row, col) !== 0) continue;
        for (let num = 1; num <= 9; num++) {
          if (isValid(grid, row, col, num)) {
            setCell(grid, row, col, num);
            if (solve()) {
              setCell(grid, row, col, 0);
              return true;
            }
            setCell(grid, row, col, 0);
          }
        }
        return false;
      }
    }
    count++;
    return count >= limit;
  };
  solve();
  return count;
}

export function generateSudoku(entry: RotationEntry, rng: () => number): SudokuContent {
  const toRemove = typeof entry.settings.blanks === 'number' ? entry.settings.blanks : DEFAULT_BLANKS;
  const solution: Grid = Array.from({ length: 9 }, () => Array<number>(9).fill(0));
  fillGrid(solution, rng);

  const puzzle: Grid = solution.map((row) => [...row]);
  const positions = shuffle(
    rng,
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as const)
  );
  let removed = 0;
  for (const [row, col] of positions) {
    if (removed >= toRemove) break;
    const backup = cell(puzzle, row, col);
    setCell(puzzle, row, col, 0);
    if (countSudokuSolutions(puzzle.map((r) => [...r])) === 1) {
      removed++;
    } else {
      setCell(puzzle, row, col, backup);
    }
  }

  return {
    kind: 'sudoku',
    puzzle: puzzle.map((row) => row.map((v) => (v === 0 ? null : v))),
    solution,
  };
}

/** The web page reports one question per blank cell. */
export function sudokuTotals(content: SudokuContent): ChallengeTotals {
  return { totalQuestions: content.puzzle.reduce((n, row) => n + row.filter((v) => v === null).length, 0) };
}
