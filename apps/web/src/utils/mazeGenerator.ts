// ── Types ──────────────────────────────────────────────────────────────────

export type CellType = 'wall' | 'path' | 'gate' | 'collectible' | 'start' | 'exit'

export interface Position {
  row: number
  col: number
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export type MazeOperation =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'power'
  | 'root'
  | 'algebra'

export interface MathEquation {
  display: string
  answer: number
  operation: MazeOperation
}

export interface GateInfo {
  position: Position
  equation: MathEquation
}

export interface MazeConfig {
  rows: number
  cols: number
  gateCount: { min: number; max: number }
  collectibleCount: { min: number; max: number }
}

export interface MazeData {
  grid: CellType[][]
  start: Position
  exit: Position
  gates: GateInfo[]
  collectibles: Position[]
  rows: number
  cols: number
}

// ── Difficulty Configuration ──────────────────────────────────────────────

export function getConfigForDifficulty(difficulty: DifficultyLevel): MazeConfig {
  switch (difficulty) {
    case 'easy':
      return { rows: 7, cols: 7, gateCount: { min: 3, max: 5 }, collectibleCount: { min: 3, max: 5 } }
    case 'medium':
      return { rows: 10, cols: 10, gateCount: { min: 5, max: 8 }, collectibleCount: { min: 4, max: 6 } }
    case 'hard':
      return { rows: 13, cols: 13, gateCount: { min: 8, max: 12 }, collectibleCount: { min: 5, max: 8 } }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

const DIRECTIONS: Position[] = [
  { row: -1, col: 0 }, // up
  { row: 1, col: 0 },  // down
  { row: 0, col: -1 }, // left
  { row: 0, col: 1 },  // right
]

function posKey(p: Position): string {
  return `${p.row},${p.col}`
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isInBounds(row: number, col: number, rows: number, cols: number): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols
}


function isWalkable(cell: CellType): boolean {
  return cell !== 'wall'
}

// ── Path-finding utilities ────────────────────────────────────────────────

/**
 * BFS to check if a path exists from `start` to `exit`, optionally treating
 * some gate positions as impassable.
 */
export function hasPathToExit(
  grid: CellType[][],
  start: Position,
  exit: Position,
  blockedGates?: Set<string>,
): boolean {
  const rows = grid.length
  const cols = grid[0].length
  const visited = new Set<string>()
  const queue: Position[] = [start]
  visited.add(posKey(start))

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.row === exit.row && cur.col === exit.col) return true

    for (const d of DIRECTIONS) {
      const nr = cur.row + d.row
      const nc = cur.col + d.col
      if (!isInBounds(nr, nc, rows, cols)) continue
      const key = posKey({ row: nr, col: nc })
      if (visited.has(key)) continue
      const cell = grid[nr][nc]
      if (!isWalkable(cell)) continue
      if (blockedGates && cell === 'gate' && blockedGates.has(key)) continue
      visited.add(key)
      queue.push({ row: nr, col: nc })
    }
  }
  return false
}

/**
 * Find distinct paths from `start` to `exit` using BFS-based approach.
 * Two paths are "distinct" if they differ in at least one intermediate cell.
 * Returns up to a reasonable limit of paths (for validation, not exhaustive).
 */
export function findDistinctPaths(
  grid: CellType[][],
  start: Position,
  exit: Position,
): Position[][] {
  const rows = grid.length
  const cols = grid[0].length
  const paths: Position[][] = []
  const MAX_PATHS = 10

  // DFS with backtracking to find distinct paths
  const visited = new Set<string>()

  function dfs(cur: Position, path: Position[]): void {
    if (paths.length >= MAX_PATHS) return
    if (cur.row === exit.row && cur.col === exit.col) {
      paths.push([...path])
      return
    }

    for (const d of DIRECTIONS) {
      const nr = cur.row + d.row
      const nc = cur.col + d.col
      if (!isInBounds(nr, nc, rows, cols)) continue
      const key = posKey({ row: nr, col: nc })
      if (visited.has(key)) continue
      const cell = grid[nr][nc]
      if (!isWalkable(cell)) continue
      visited.add(key)
      path.push({ row: nr, col: nc })
      dfs({ row: nr, col: nc }, path)
      path.pop()
      visited.delete(key)
      if (paths.length >= MAX_PATHS) return
    }
  }

  visited.add(posKey(start))
  dfs(start, [start])
  return paths
}

/**
 * Find all cells that lie on ANY shortest path from start to exit.
 */
function findShortestPathCells(
  grid: CellType[][],
  start: Position,
  exit: Position,
): Set<string> {
  const rows = grid.length
  const cols = grid[0].length
  const result = new Set<string>()

  // BFS from start — compute distances from start
  const distFromStart = new Map<string, number>()
  const q1: Position[] = [start]
  distFromStart.set(posKey(start), 0)
  while (q1.length > 0) {
    const cur = q1.shift()!
    const curDist = distFromStart.get(posKey(cur))!
    for (const d of DIRECTIONS) {
      const nr = cur.row + d.row
      const nc = cur.col + d.col
      if (!isInBounds(nr, nc, rows, cols)) continue
      const key = posKey({ row: nr, col: nc })
      if (distFromStart.has(key)) continue
      if (!isWalkable(grid[nr][nc])) continue
      distFromStart.set(key, curDist + 1)
      q1.push({ row: nr, col: nc })
    }
  }

  // BFS from exit — compute distances from exit
  const distFromExit = new Map<string, number>()
  const q2: Position[] = [exit]
  distFromExit.set(posKey(exit), 0)
  while (q2.length > 0) {
    const cur = q2.shift()!
    const curDist = distFromExit.get(posKey(cur))!
    for (const d of DIRECTIONS) {
      const nr = cur.row + d.row
      const nc = cur.col + d.col
      if (!isInBounds(nr, nc, rows, cols)) continue
      const key = posKey({ row: nr, col: nc })
      if (distFromExit.has(key)) continue
      if (!isWalkable(grid[nr][nc])) continue
      distFromExit.set(key, curDist + 1)
      q2.push({ row: nr, col: nc })
    }
  }

  const exitKey = posKey(exit)
  const shortestDist = distFromStart.get(exitKey)
  if (shortestDist === undefined) return result

  // A cell is on a shortest path if distFromStart[cell] + distFromExit[cell] === shortestDist
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = posKey({ row: r, col: c })
      const ds = distFromStart.get(key)
      const de = distFromExit.get(key)
      if (ds !== undefined && de !== undefined && ds + de === shortestDist) {
        result.add(key)
      }
    }
  }
  return result
}

// ── Maze carving (recursive backtracker) ──────────────────────────────────

/**
 * Carve a maze into the grid using iterative recursive backtracker.
 * The grid uses a convention where odd-indexed cells are potential path cells
 * and even-indexed cells are walls/borders. This ensures walls between paths.
 */
function carveMaze(grid: CellType[][], rows: number, cols: number): void {
  // Work in "cell space" where each cell is at odd coordinates
  const cellRows = Math.floor(rows / 2)
  const cellCols = Math.floor(cols / 2)

  const visited = new Set<string>()
  // Start carving from (0,0) in cell space → (1,1) in grid space
  const stack: Position[] = [{ row: 0, col: 0 }]
  visited.add(posKey({ row: 0, col: 0 }))
  grid[1][1] = 'path'

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const neighbors = shuffle(DIRECTIONS)
      .map((d) => ({ row: current.row + d.row, col: current.col + d.col }))
      .filter(
        (n) =>
          n.row >= 0 &&
          n.row < cellRows &&
          n.col >= 0 &&
          n.col < cellCols &&
          !visited.has(posKey(n)),
      )

    if (neighbors.length === 0) {
      stack.pop()
      continue
    }

    const next = neighbors[0]
    visited.add(posKey(next))

    // Convert to grid coordinates
    const gridRow = next.row * 2 + 1
    const gridCol = next.col * 2 + 1
    // Carve the wall between current and next
    const wallRow = current.row * 2 + 1 + (next.row - current.row)
    const wallCol = current.col * 2 + 1 + (next.col - current.col)

    grid[wallRow][wallCol] = 'path'
    grid[gridRow][gridCol] = 'path'

    stack.push(next)
  }
}

/**
 * Add extra passages to ensure multiple paths exist.
 * Removes some walls between adjacent path cells to create loops.
 */
function addExtraPassages(grid: CellType[][], rows: number, cols: number, count: number): void {
  const candidates: Position[] = []

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] !== 'wall') continue
      // Check if this wall separates two path cells (horizontally or vertically)
      const horizontal =
        c > 0 && c < cols - 1 && grid[r][c - 1] === 'path' && grid[r][c + 1] === 'path'
      const vertical =
        r > 0 && r < rows - 1 && grid[r - 1][c] === 'path' && grid[r + 1][c] === 'path'
      if (horizontal || vertical) {
        candidates.push({ row: r, col: c })
      }
    }
  }

  const shuffled = shuffle(candidates)
  const toRemove = Math.min(count, shuffled.length)
  for (let i = 0; i < toRemove; i++) {
    grid[shuffled[i].row][shuffled[i].col] = 'path'
  }
}

// ── Placeholder equation generator ────────────────────────────────────────

function makePlaceholderEquation(difficulty: DifficultyLevel): MathEquation {
  // Simple placeholder — real equations come from mazeEquations.ts (task 1.2)
  const a = randInt(1, difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 50)
  const b = randInt(1, difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 50)
  return {
    display: `${a} + ${b} = ?`,
    answer: a + b,
    operation: 'addition',
  }
}

// ── Main generator ────────────────────────────────────────────────────────

export function generateMaze(difficulty: DifficultyLevel): MazeData {
  const config = getConfigForDifficulty(difficulty)
  const { rows, cols } = config

  // 1. Initialize grid with all walls
  const grid: CellType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'wall' as CellType),
  )

  // 2. Carve paths using recursive backtracker
  carveMaze(grid, rows, cols)

  // Add extra passages to guarantee multiple paths
  // Scale extra passages with grid size
  const extraPassages = Math.max(3, Math.floor((rows * cols) / 15))
  addExtraPassages(grid, rows, cols, extraPassages)

  // 3. Place start at top-left region, exit at bottom-right region
  const start = findPathCellInRegion(grid, rows, cols, 'top-left')
  const exit = findPathCellInRegion(grid, rows, cols, 'bottom-right')
  grid[start.row][start.col] = 'start'
  grid[exit.row][exit.col] = 'exit'

  // Verify at least 2 distinct paths exist; if not, add more passages and retry
  let attempts = 0
  while (attempts < 20) {
    const paths = findDistinctPaths(grid, start, exit)
    if (paths.length >= 2) break
    addExtraPassages(grid, rows, cols, 2)
    attempts++
  }

  // 4–5. Place gates on path cells that are NOT critical to all paths
  const gateCount = randInt(config.gateCount.min, config.gateCount.max)
  const gates = placeGates(grid, start, exit, gateCount, difficulty)

  // 6. Place collectibles on non-critical path cells
  const collectibleCount = randInt(config.collectibleCount.min, config.collectibleCount.max)
  const collectibles = placeCollectibles(grid, start, exit, collectibleCount)

  // 7. Final validation
  if (!hasPathToExit(grid, start, exit)) {
    // Fallback: clear a gate to ensure connectivity (should be extremely rare)
    for (const gate of gates) {
      grid[gate.position.row][gate.position.col] = 'path'
    }
    gates.length = 0
  }

  return { grid, start, exit, gates, collectibles, rows, cols }
}

// ── Placement helpers ─────────────────────────────────────────────────────

function findPathCellInRegion(
  grid: CellType[][],
  rows: number,
  cols: number,
  region: 'top-left' | 'bottom-right',
): Position {
  const halfR = Math.ceil(rows / 2)
  const halfC = Math.ceil(cols / 2)

  if (region === 'top-left') {
    for (let r = 1; r < halfR; r++) {
      for (let c = 1; c < halfC; c++) {
        if (grid[r][c] === 'path') return { row: r, col: c }
      }
    }
    // Fallback: find any path cell in top-left quadrant
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 'path') return { row: r, col: c }
      }
    }
  } else {
    for (let r = rows - 2; r >= halfR; r--) {
      for (let c = cols - 2; c >= halfC; c--) {
        if (grid[r][c] === 'path') return { row: r, col: c }
      }
    }
    // Fallback: find any path cell in bottom-right quadrant
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = cols - 1; c >= 0; c--) {
        if (grid[r][c] === 'path') return { row: r, col: c }
      }
    }
  }

  // Should never reach here for a properly carved maze
  return region === 'top-left' ? { row: 1, col: 1 } : { row: rows - 2, col: cols - 2 }
}

function placeGates(
  grid: CellType[][],
  start: Position,
  exit: Position,
  count: number,
  difficulty: DifficultyLevel,
): GateInfo[] {
  const gates: GateInfo[] = []
  const rows = grid.length
  const cols = grid[0].length

  // Collect candidate path cells (not start, not exit, not adjacent to start/exit)
  const candidates: Position[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 'path') continue
      // Skip cells adjacent to start or exit
      const distToStart = Math.abs(r - start.row) + Math.abs(c - start.col)
      const distToExit = Math.abs(r - exit.row) + Math.abs(c - exit.col)
      if (distToStart <= 1 || distToExit <= 1) continue
      candidates.push({ row: r, col: c })
    }
  }

  const shuffled = shuffle(candidates)

  for (const pos of shuffled) {
    if (gates.length >= count) break

    // Tentatively place gate
    grid[pos.row][pos.col] = 'gate'

    // Check: if this gate is blocked, do at least 2 paths still exist?
    const blocked = new Set<string>([posKey(pos)])
    const stillHasPath = hasPathToExit(grid, start, exit, blocked)

    if (stillHasPath) {
      // Also verify that without blocking, we still have ≥2 distinct paths
      const paths = findDistinctPaths(grid, start, exit)
      if (paths.length >= 2) {
        gates.push({
          position: pos,
          equation: makePlaceholderEquation(difficulty),
        })
      } else {
        // Revert — placing this gate would reduce paths below 2
        grid[pos.row][pos.col] = 'path'
      }
    } else {
      // Revert — blocking this gate would disconnect start from exit
      grid[pos.row][pos.col] = 'path'
    }
  }

  return gates
}

function placeCollectibles(
  grid: CellType[][],
  start: Position,
  exit: Position,
  count: number,
): Position[] {
  const collectibles: Position[] = []

  // Find cells on shortest paths — collectibles should NOT be on these
  const shortestPathCells = findShortestPathCells(grid, start, exit)

  const rows = grid.length
  const cols = grid[0].length
  const candidates: Position[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 'path') continue
      const key = posKey({ row: r, col: c })
      if (shortestPathCells.has(key)) continue
      candidates.push({ row: r, col: c })
    }
  }

  const shuffled = shuffle(candidates)
  const toPlace = Math.min(count, shuffled.length)

  for (let i = 0; i < toPlace; i++) {
    const pos = shuffled[i]
    grid[pos.row][pos.col] = 'collectible'
    collectibles.push(pos)
  }

  return collectibles
}
