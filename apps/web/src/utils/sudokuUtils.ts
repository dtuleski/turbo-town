/**
 * Sudoku puzzle generator and validator
 * Generates valid 9x9 Sudoku puzzles with unique solutions
 */

export type SudokuGrid = (number | null)[][]
export type SudokuDifficulty = 'easy' | 'medium' | 'hard'

// Number of cells to remove per difficulty
const CELLS_TO_REMOVE: Record<SudokuDifficulty, number> = {
  easy: 36,   // ~45 given, 36 empty
  medium: 46, // ~35 given, 46 empty
  hard: 54,   // ~27 given, 54 empty
}

/** Create an empty 9x9 grid */
function createEmptyGrid(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

/** Check if placing num at (row, col) is valid */
function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false
    }
  }
  return true
}

/** Shuffle an array in place */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Fill the grid with a valid complete solution using backtracking */
function fillGrid(grid: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
        for (const num of nums) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num
            if (fillGrid(grid)) return true
            grid[row][col] = 0
          }
        }
        return false
      }
    }
  }
  return true
}

/** Count solutions (stop at 2 to check uniqueness) */
function countSolutions(grid: number[][], limit = 2): number {
  let count = 0
  function solve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num
              if (solve()) return true
              grid[row][col] = 0
            }
          }
          return false
        }
      }
    }
    count++
    return count >= limit
  }
  solve()
  return count
}

/** Generate a Sudoku puzzle with a unique solution */
export function generateSudoku(difficulty: SudokuDifficulty): {
  puzzle: SudokuGrid
  solution: number[][]
} {
  // Generate a complete valid grid
  const solution = createEmptyGrid()
  fillGrid(solution)

  // Copy and remove cells
  const puzzle: number[][] = solution.map(row => [...row])
  const toRemove = CELLS_TO_REMOVE[difficulty]

  // Create list of all cell positions and shuffle
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  )

  let removed = 0
  for (const [row, col] of positions) {
    if (removed >= toRemove) break
    const backup = puzzle[row][col]
    puzzle[row][col] = 0

    // Check uniqueness
    const testGrid = puzzle.map(r => [...r])
    if (countSolutions(testGrid) === 1) {
      removed++
    } else {
      puzzle[row][col] = backup
    }
  }

  // Convert 0s to nulls for the puzzle
  const puzzleGrid: SudokuGrid = puzzle.map(row =>
    row.map(cell => (cell === 0 ? null : cell))
  )

  return { puzzle: puzzleGrid, solution }
}

/** Check if the current grid state is complete and correct */
export function isGridComplete(grid: SudokuGrid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === null) return false
    }
  }
  return isGridValid(grid)
}

/** Validate the entire grid */
export function isGridValid(grid: SudokuGrid): boolean {
  // Check rows
  for (let row = 0; row < 9; row++) {
    const seen = new Set<number>()
    for (let col = 0; col < 9; col++) {
      const val = grid[row][col]
      if (val === null) continue
      if (val < 1 || val > 9 || seen.has(val)) return false
      seen.add(val)
    }
  }
  // Check columns
  for (let col = 0; col < 9; col++) {
    const seen = new Set<number>()
    for (let row = 0; row < 9; row++) {
      const val = grid[row][col]
      if (val === null) continue
      if (seen.has(val)) return false
      seen.add(val)
    }
  }
  // Check 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Set<number>()
      for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
        for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
          const val = grid[r][c]
          if (val === null) continue
          if (seen.has(val)) return false
          seen.add(val)
        }
      }
    }
  }
  return true
}

/** Check if a specific cell value conflicts with the grid */
export function hasConflict(grid: SudokuGrid, row: number, col: number): boolean {
  const val = grid[row][col]
  if (val === null) return false

  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === val) return true
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === val) return true
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (r !== row && c !== col && grid[r][c] === val) return true
    }
  }
  return false
}
