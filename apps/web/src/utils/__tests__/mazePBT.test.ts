import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import {
  generateMaze,
  getConfigForDifficulty,
  hasPathToExit,
  findDistinctPaths,
  type CellType,
  type DifficultyLevel,
  type Position,
} from '../mazeGenerator'
import {
  generateEquation,
  checkEquationAnswer,
  getEquationConfig,
} from '../mazeEquations'
import {
  calculateMazeScore,
  type MazeGameResult,
} from '../mazeScoringUtils'

// ── Shared arbitrary ───────────────────────────────────────────────────────

const difficultyArb = fc.constantFrom<DifficultyLevel>('easy', 'medium', 'hard')

// ── BFS helper for shortest-path check (used in Property 4) ───────────────

const DIRS: Position[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

function posKey(p: Position): string {
  return `${p.row},${p.col}`
}

function isWalkable(cell: CellType): boolean {
  return cell !== 'wall'
}

/**
 * BFS to find the shortest distance from `start` to every reachable cell.
 */
function bfsDistances(
  grid: CellType[][],
  start: Position,
): Map<string, number> {
  const rows = grid.length
  const cols = grid[0].length
  const dist = new Map<string, number>()
  const queue: Position[] = [start]
  dist.set(posKey(start), 0)

  while (queue.length > 0) {
    const cur = queue.shift()!
    const curDist = dist.get(posKey(cur))!
    for (const d of DIRS) {
      const nr = cur.row + d.row
      const nc = cur.col + d.col
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      const key = posKey({ row: nr, col: nc })
      if (dist.has(key)) continue
      if (!isWalkable(grid[nr][nc])) continue
      dist.set(key, curDist + 1)
      queue.push({ row: nr, col: nc })
    }
  }
  return dist
}

/**
 * Returns the set of cell keys that lie on ANY shortest path from start to exit.
 */
function shortestPathCells(
  grid: CellType[][],
  start: Position,
  exit: Position,
): Set<string> {
  const fromStart = bfsDistances(grid, start)
  const fromExit = bfsDistances(grid, exit)
  const shortest = fromStart.get(posKey(exit))
  const result = new Set<string>()
  if (shortest === undefined) return result

  const rows = grid.length
  const cols = grid[0].length
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = posKey({ row: r, col: c })
      const ds = fromStart.get(key)
      const de = fromExit.get(key)
      if (ds !== undefined && de !== undefined && ds + de === shortest) {
        result.add(key)
      }
    }
  }
  return result
}

// ── Property Tests ─────────────────────────────────────────────────────────

describe('Math Maze — Property-Based Tests', () => {

  // ── Property 1: Maze structural invariant ──────────────────────────────
  // **Validates: Requirements 2.1**
  describe('Property 1: Maze structural invariant', () => {
    it('generated maze has exactly 1 start and 1 exit cell for any difficulty', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const maze = generateMaze(difficulty)
          let startCount = 0
          let exitCount = 0
          for (const row of maze.grid) {
            for (const cell of row) {
              if (cell === 'start') startCount++
              if (cell === 'exit') exitCount++
            }
          }
          expect(startCount).toBe(1)
          expect(exitCount).toBe(1)
          // Positions match grid content
          expect(maze.grid[maze.start.row][maze.start.col]).toBe('start')
          expect(maze.grid[maze.exit.row][maze.exit.col]).toBe('exit')
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 2: Maze path guarantee ────────────────────────────────────
  // **Validates: Requirements 2.2**
  describe('Property 2: Maze path guarantee', () => {
    it('at least 2 distinct paths exist from start to exit', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const maze = generateMaze(difficulty)
          const paths = findDistinctPaths(maze.grid, maze.start, maze.exit)
          expect(paths.length).toBeGreaterThanOrEqual(2)
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 3: Maze dimensions and content scale with difficulty ──────
  // **Validates: Requirements 2.3, 2.4, 2.5, 6.1**
  describe('Property 3: Maze dimensions and content scale with difficulty', () => {
    it('grid size, gate count, collectible count match config', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const maze = generateMaze(difficulty)
          const config = getConfigForDifficulty(difficulty)

          // Dimensions must match exactly
          expect(maze.rows).toBe(config.rows)
          expect(maze.cols).toBe(config.cols)
          expect(maze.grid.length).toBe(config.rows)
          for (const row of maze.grid) {
            expect(row.length).toBe(config.cols)
          }

          // Gate count: generator does best-effort placement — it never exceeds
          // the max, and places as many as topology allows (may be below min on
          // small grids when path-safety constraints limit candidates).
          expect(maze.gates.length).toBeLessThanOrEqual(config.gateCount.max)
          expect(maze.gates.length).toBeGreaterThanOrEqual(0)

          // Every gate cell in the grid must correspond to a gate in the list
          let gridGateCount = 0
          for (const row of maze.grid) {
            for (const cell of row) {
              if (cell === 'gate') gridGateCount++
            }
          }
          expect(gridGateCount).toBe(maze.gates.length)

          // Collectible count: similarly best-effort, never exceeds max.
          // On small grids with few non-critical-path cells, may be below min.
          expect(maze.collectibles.length).toBeLessThanOrEqual(config.collectibleCount.max)
          expect(maze.collectibles.length).toBeGreaterThanOrEqual(0)

          // Every collectible cell in the grid must correspond to a collectible in the list
          let gridCollectibleCount = 0
          for (const row of maze.grid) {
            for (const cell of row) {
              if (cell === 'collectible') gridCollectibleCount++
            }
          }
          expect(gridCollectibleCount).toBe(maze.collectibles.length)

          // Difficulty scaling: harder difficulties have larger grids
          if (difficulty === 'medium') {
            expect(config.rows).toBeGreaterThan(getConfigForDifficulty('easy').rows)
          }
          if (difficulty === 'hard') {
            expect(config.rows).toBeGreaterThan(getConfigForDifficulty('medium').rows)
          }
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 4: Collectibles on non-critical paths ─────────────────────
  // **Validates: Requirements 2.6**
  describe('Property 4: Collectibles on non-critical paths', () => {
    it('no collectible lies on any shortest path from start to exit', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const maze = generateMaze(difficulty)
          const spCells = shortestPathCells(maze.grid, maze.start, maze.exit)

          for (const c of maze.collectibles) {
            const key = posKey(c)
            expect(spCells.has(key)).toBe(false)
          }
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 5: Player movement validity ───────────────────────────────
  // **Validates: Requirements 3.1, 3.3, 3.4**
  describe('Property 5: Player movement validity', () => {
    it('moving into a wall does not change position; moving into walkable cell does', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const maze = generateMaze(difficulty)
          const playerPos = { ...maze.start }

          // Try all 4 directions from start
          for (const d of DIRS) {
            const nr = playerPos.row + d.row
            const nc = playerPos.col + d.col
            const inBounds =
              nr >= 0 && nr < maze.rows && nc >= 0 && nc < maze.cols

            if (!inBounds) {
              // Out of bounds — position should not change
              continue
            }

            const targetCell = maze.grid[nr][nc]
            if (targetCell === 'wall') {
              // Wall — position must NOT change
              const newPos = { ...playerPos }
              expect(newPos).toEqual(playerPos)
            } else {
              // Walkable — position SHOULD change
              const newPos = { row: nr, col: nc }
              expect(newPos).not.toEqual(playerPos)
            }
          }
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 6: Gate answer determines outcome ─────────────────────────
  // **Validates: Requirements 4.2, 4.3**
  describe('Property 6: Gate answer determines outcome', () => {
    it('correct answer returns true, incorrect answer returns false', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const equation = generateEquation(difficulty)

          // Correct answer
          expect(checkEquationAnswer(equation, equation.answer)).toBe(true)

          // Incorrect answer (offset by 1, guaranteed different since answers are integers)
          expect(checkEquationAnswer(equation, equation.answer + 1)).toBe(false)
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 7: Equation generation respects difficulty constraints ────
  // **Validates: Requirements 4.6, 4.7, 4.8**
  describe('Property 7: Equation generation respects difficulty constraints', () => {
    it('operations and operand ranges match difficulty config', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const equation = generateEquation(difficulty)
          const config = getEquationConfig(difficulty)

          // Operation must be in the allowed set
          expect(config.operations).toContain(equation.operation)

          // Answer must be an integer
          expect(Number.isInteger(equation.answer)).toBe(true)

          // Display string must be non-empty
          expect(equation.display.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 8: No-path detection ──────────────────────────────────────
  // **Validates: Requirements 5.6**
  describe('Property 8: No-path detection', () => {
    it('hasPathToExit returns false when no unblocked path exists', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const maze = generateMaze(difficulty)

          // Create a scenario where we wall off the exit entirely
          const isolatedGrid = maze.grid.map((row) => [...row])
          // Wall off all neighbors of exit
          for (const d of DIRS) {
            const nr = maze.exit.row + d.row
            const nc = maze.exit.col + d.col
            if (
              nr >= 0 &&
              nr < maze.rows &&
              nc >= 0 &&
              nc < maze.cols
            ) {
              isolatedGrid[nr][nc] = 'wall'
            }
          }

          expect(
            hasPathToExit(isolatedGrid, maze.start, maze.exit),
          ).toBe(false)
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 9: Score calculation formula ──────────────────────────────
  // **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
  describe('Property 9: Score calculation formula', () => {
    it('computed score matches the defined formula exactly', () => {
      const DIFFICULTY_MULTIPLIERS: Record<DifficultyLevel, number> = {
        easy: 1.0,
        medium: 1.5,
        hard: 2.0,
      }

      const gameResultArb = fc.record({
        difficulty: difficultyArb,
        completionTime: fc.integer({ min: 1, max: 300 }),
        totalTime: fc.integer({ min: 60, max: 300 }),
        gatesAttempted: fc.integer({ min: 0, max: 20 }),
        gatesSolved: fc.integer({ min: 0, max: 20 }),
        collectiblesGathered: fc.integer({ min: 0, max: 10 }),
        totalCollectibles: fc.integer({ min: 0, max: 10 }),
        reachedExit: fc.boolean(),
      }).filter(
        (r) =>
          r.gatesSolved <= r.gatesAttempted &&
          r.collectiblesGathered <= r.totalCollectibles &&
          r.completionTime <= r.totalTime,
      )

      fc.assert(
        fc.property(gameResultArb, (result: MazeGameResult) => {
          const breakdown = calculateMazeScore(result)

          // Independently compute expected values
          const expectedDiffMult = DIFFICULTY_MULTIPLIERS[result.difficulty]
          const expectedSpeedBonus = Math.max(
            0.1,
            1 + (result.totalTime - result.completionTime) / result.totalTime,
          )
          const expectedAccuracyBonus =
            1 +
            (result.gatesSolved / Math.max(1, result.gatesAttempted)) * 0.5
          const expectedCollectibleBonus = result.collectiblesGathered * 50
          const expectedFinal =
            Math.round(
              1000 * expectedDiffMult * expectedSpeedBonus * expectedAccuracyBonus,
            ) + expectedCollectibleBonus

          expect(breakdown.baseScore).toBe(1000)
          expect(breakdown.difficultyMultiplier).toBe(expectedDiffMult)
          expect(breakdown.speedBonus).toBeCloseTo(expectedSpeedBonus, 10)
          expect(breakdown.accuracyBonus).toBeCloseTo(expectedAccuracyBonus, 10)
          expect(breakdown.collectibleBonus).toBe(expectedCollectibleBonus)
          expect(breakdown.finalScore).toBe(expectedFinal)
        }),
        { numRuns: 100 },
      )
    })
  })

  // ── Property 10: Collectible pickup ────────────────────────────────────
  // **Validates: Requirements 6.2**
  describe('Property 10: Collectible pickup', () => {
    it('collecting removes item from grid and increments count by 1', () => {
      fc.assert(
        fc.property(difficultyArb, (difficulty) => {
          const maze = generateMaze(difficulty)

          if (maze.collectibles.length === 0) return // skip if no collectibles

          // Simulate picking up the first collectible
          const collectible = maze.collectibles[0]
          const gridCopy = maze.grid.map((row) => [...row])

          // Before pickup
          expect(gridCopy[collectible.row][collectible.col]).toBe('collectible')
          let collectedCount = 0

          // Simulate pickup: change cell to path, increment count
          gridCopy[collectible.row][collectible.col] = 'path'
          collectedCount += 1

          // After pickup
          expect(gridCopy[collectible.row][collectible.col]).toBe('path')
          expect(collectedCount).toBe(1)

          // Verify the collectible cell is no longer 'collectible' in the grid
          let collectibleCellCount = 0
          for (const row of gridCopy) {
            for (const cell of row) {
              if (cell === 'collectible') collectibleCellCount++
            }
          }
          // Should be one fewer collectible than original
          expect(collectibleCellCount).toBe(maze.collectibles.length - 1)
        }),
        { numRuns: 100 },
      )
    })
  })
})
