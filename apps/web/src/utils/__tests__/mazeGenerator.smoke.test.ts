import { describe, it, expect } from 'vitest'
import {
  generateMaze,
  getConfigForDifficulty,
  hasPathToExit,
  findDistinctPaths,
  type DifficultyLevel,
} from '../mazeGenerator'

describe('mazeGenerator smoke tests', () => {
  const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard']

  describe('getConfigForDifficulty', () => {
    it('returns correct config for easy', () => {
      const config = getConfigForDifficulty('easy')
      expect(config.rows).toBe(7)
      expect(config.cols).toBe(7)
      expect(config.gateCount).toEqual({ min: 3, max: 5 })
      expect(config.collectibleCount).toEqual({ min: 3, max: 5 })
    })

    it('returns correct config for medium', () => {
      const config = getConfigForDifficulty('medium')
      expect(config.rows).toBe(10)
      expect(config.cols).toBe(10)
    })

    it('returns correct config for hard', () => {
      const config = getConfigForDifficulty('hard')
      expect(config.rows).toBe(13)
      expect(config.cols).toBe(13)
    })
  })

  describe('generateMaze', () => {
    for (const diff of difficulties) {
      it(`generates a valid maze for ${diff}`, () => {
        const maze = generateMaze(diff)
        const config = getConfigForDifficulty(diff)

        // Correct dimensions
        expect(maze.rows).toBe(config.rows)
        expect(maze.cols).toBe(config.cols)
        expect(maze.grid.length).toBe(config.rows)
        expect(maze.grid[0].length).toBe(config.cols)

        // Exactly one start and one exit
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

        // Start and exit positions match grid
        expect(maze.grid[maze.start.row][maze.start.col]).toBe('start')
        expect(maze.grid[maze.exit.row][maze.exit.col]).toBe('exit')

        // Path exists
        expect(hasPathToExit(maze.grid, maze.start, maze.exit)).toBe(true)

        // At least 2 distinct paths
        const paths = findDistinctPaths(maze.grid, maze.start, maze.exit)
        expect(paths.length).toBeGreaterThanOrEqual(2)
      })
    }
  })

  describe('hasPathToExit', () => {
    it('returns false when all paths are blocked', () => {
      // Create a tiny grid where blocking one cell disconnects start from exit
      const grid = [
        ['wall', 'wall', 'wall'],
        ['start', 'path', 'exit'],
        ['wall', 'wall', 'wall'],
      ] as import('../mazeGenerator').CellType[][]

      const start = { row: 1, col: 0 }
      const exit = { row: 1, col: 2 }

      expect(hasPathToExit(grid, start, exit)).toBe(true)

      // Block the middle cell by making it a wall
      grid[1][1] = 'wall'
      expect(hasPathToExit(grid, start, exit)).toBe(false)
    })
  })
})
