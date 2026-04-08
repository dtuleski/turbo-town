/**
 * Code-a-Bot: Functional Logic Game
 *
 * Move a robot from start to a power cell on a grid by sequencing instruction blocks.
 * Teaches kids the "if-then" mindset — small instructions create complex results.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type Direction = 'up' | 'right' | 'down' | 'left'
export type Instruction = 'FORWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'JUMP'
export type CellType = 'empty' | 'start' | 'goal' | 'wall' | 'crack' | 'ice'
export type BotDifficulty = 'easy' | 'medium' | 'hard'

export interface Position { row: number; col: number }

export interface Cell {
  type: CellType
  row: number
  col: number
}

export interface BotState {
  pos: Position
  dir: Direction
  alive: boolean
}

export interface Level {
  grid: Cell[][]
  rows: number
  cols: number
  start: Position
  startDir: Direction
  goal: Position
  maxInstructions: number
  optimalSteps: number
  levelNumber: number
  hint?: string
}

export interface SimStep {
  pos: Position
  dir: Direction
  instruction: Instruction
  alive: boolean
  reachedGoal: boolean
  slid?: boolean          // true if ice caused extra movement
  jumped?: boolean        // true if jumped over a crack
  fellInCrack?: boolean   // true if walked into crack without jumping
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const INSTRUCTIONS: { id: Instruction; label: string; icon: string; color: string }[] = [
  { id: 'FORWARD',    label: 'Forward',    icon: '⬆️', color: 'bg-emerald-500' },
  { id: 'TURN_LEFT',  label: 'Turn Left',  icon: '↩️', color: 'bg-blue-500' },
  { id: 'TURN_RIGHT', label: 'Turn Right', icon: '↪️', color: 'bg-purple-500' },
  { id: 'JUMP',       label: 'Jump',       icon: '🦘', color: 'bg-amber-500' },
]

export const DIFFICULTY_CONFIG: Record<BotDifficulty, {
  label: string
  emoji: string
  desc: string
  levelCount: number
  hasCracks: boolean
  hasIce: boolean
  gridSize: number
}> = {
  easy:   { label: 'Easy',   emoji: '🟢', desc: '5×5 grid · Simple paths',                   levelCount: 5, hasCracks: false, hasIce: false, gridSize: 5 },
  medium: { label: 'Medium', emoji: '🟡', desc: '6×6 grid · Cracks to jump over',            levelCount: 5, hasCracks: true,  hasIce: false, gridSize: 6 },
  hard:   { label: 'Hard',   emoji: '🔴', desc: '7×7 grid · Cracks + Ice that slides you',   levelCount: 5, hasCracks: true,  hasIce: true,  gridSize: 7 },
}

const DIR_DELTA: Record<Direction, Position> = {
  up:    { row: -1, col: 0 },
  right: { row: 0,  col: 1 },
  down:  { row: 1,  col: 0 },
  left:  { row: 0,  col: -1 },
}

const TURN_LEFT_MAP: Record<Direction, Direction> = { up: 'left', left: 'down', down: 'right', right: 'up' }
const TURN_RIGHT_MAP: Record<Direction, Direction> = { up: 'right', right: 'down', down: 'left', left: 'up' }


// ── Direction helpers ──────────────────────────────────────────────────────────

export const DIR_ARROW: Record<Direction, string> = { up: '▲', right: '▶', down: '▼', left: '◀' }

// ── Simulation ─────────────────────────────────────────────────────────────────

function inBounds(pos: Position, rows: number, cols: number) {
  return pos.row >= 0 && pos.row < rows && pos.col >= 0 && pos.col < cols
}

function addPos(a: Position, b: Position): Position {
  return { row: a.row + b.row, col: a.col + b.col }
}

export function simulate(level: Level, instructions: Instruction[]): SimStep[] {
  const steps: SimStep[] = []
  let pos = { ...level.start }
  let dir: Direction = level.startDir

  for (const inst of instructions) {
    if (inst === 'TURN_LEFT') {
      dir = TURN_LEFT_MAP[dir]
      steps.push({ pos: { ...pos }, dir, instruction: inst, alive: true, reachedGoal: false })
      continue
    }
    if (inst === 'TURN_RIGHT') {
      dir = TURN_RIGHT_MAP[dir]
      steps.push({ pos: { ...pos }, dir, instruction: inst, alive: true, reachedGoal: false })
      continue
    }

    const delta = DIR_DELTA[dir]

    if (inst === 'JUMP') {
      // Jump skips one cell and lands on the next
      const over = addPos(pos, delta)
      const land = addPos(over, delta)
      if (!inBounds(land, level.rows, level.cols) || level.grid[land.row][land.col].type === 'wall') {
        steps.push({ pos: { ...pos }, dir, instruction: inst, alive: false, reachedGoal: false })
        return steps
      }
      pos = land
      const landed = level.grid[pos.row][pos.col]
      if (landed.type === 'crack') {
        steps.push({ pos: { ...pos }, dir, instruction: inst, alive: false, reachedGoal: false, fellInCrack: true })
        return steps
      }
      const reachedGoal = pos.row === level.goal.row && pos.col === level.goal.col
      steps.push({ pos: { ...pos }, dir, instruction: inst, alive: true, reachedGoal, jumped: true })
      if (reachedGoal) return steps
      // Ice after jump
      if (landed.type === 'ice') {
        const iceResult = slideOnIce(pos, dir, level)
        pos = iceResult.pos
        if (!iceResult.alive) {
          steps.push({ pos: { ...pos }, dir, instruction: inst, alive: false, reachedGoal: false, slid: true })
          return steps
        }
        const goalAfterSlide = pos.row === level.goal.row && pos.col === level.goal.col
        if (goalAfterSlide) {
          steps[steps.length - 1] = { ...steps[steps.length - 1], pos: { ...pos }, reachedGoal: true, slid: true }
          return steps
        }
      }
      continue
    }

    // FORWARD
    const next = addPos(pos, delta)
    if (!inBounds(next, level.rows, level.cols) || level.grid[next.row][next.col].type === 'wall') {
      steps.push({ pos: { ...pos }, dir, instruction: inst, alive: false, reachedGoal: false })
      return steps
    }
    pos = next
    const cell = level.grid[pos.row][pos.col]
    if (cell.type === 'crack') {
      steps.push({ pos: { ...pos }, dir, instruction: inst, alive: false, reachedGoal: false, fellInCrack: true })
      return steps
    }
    const reachedGoal = pos.row === level.goal.row && pos.col === level.goal.col
    steps.push({ pos: { ...pos }, dir, instruction: inst, alive: true, reachedGoal })
    if (reachedGoal) return steps

    // Ice slide
    if (cell.type === 'ice') {
      const iceResult = slideOnIce(pos, dir, level)
      pos = iceResult.pos
      if (!iceResult.alive) {
        steps.push({ pos: { ...pos }, dir, instruction: inst, alive: false, reachedGoal: false, slid: true })
        return steps
      }
      const goalAfterSlide = pos.row === level.goal.row && pos.col === level.goal.col
      steps[steps.length - 1] = { ...steps[steps.length - 1], pos: { ...pos }, slid: true }
      if (goalAfterSlide) {
        steps[steps.length - 1].reachedGoal = true
        return steps
      }
    }
  }

  return steps
}

function slideOnIce(pos: Position, dir: Direction, level: Level): { pos: Position; alive: boolean } {
  const delta = DIR_DELTA[dir]
  let current = { ...pos }
  // Slide one extra cell
  const next = addPos(current, delta)
  if (!inBounds(next, level.rows, level.cols) || level.grid[next.row][next.col].type === 'wall') {
    return { pos: current, alive: true } // stop at edge
  }
  if (level.grid[next.row][next.col].type === 'crack') {
    return { pos: next, alive: false }
  }
  return { pos: next, alive: true }
}


// ── Level Generation ───────────────────────────────────────────────────────────

function makeEmptyGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ type: 'empty' as CellType, row: r, col: c }))
  )
}

/**
 * Hand-crafted level templates per difficulty.
 * Each level has a known solution so we can compute optimal steps.
 */

const EASY_LEVELS: Omit<Level, 'levelNumber'>[] = [
  // Level 1: Straight line forward
  (() => {
    const grid = makeEmptyGrid(5, 5)
    grid[4][0].type = 'start'
    grid[0][0].type = 'goal'
    return { grid, rows: 5, cols: 5, start: { row: 4, col: 0 }, startDir: 'up' as Direction, goal: { row: 0, col: 0 }, maxInstructions: 6, optimalSteps: 4, hint: 'Go straight up!' }
  })(),
  // Level 2: Turn right then forward
  (() => {
    const grid = makeEmptyGrid(5, 5)
    grid[2][0].type = 'start'
    grid[2][4].type = 'goal'
    grid[1][1].type = 'wall'; grid[1][2].type = 'wall'; grid[1][3].type = 'wall'
    grid[3][1].type = 'wall'; grid[3][2].type = 'wall'; grid[3][3].type = 'wall'
    return { grid, rows: 5, cols: 5, start: { row: 2, col: 0 }, startDir: 'right' as Direction, goal: { row: 2, col: 4 }, maxInstructions: 6, optimalSteps: 4, hint: 'Head right through the corridor' }
  })(),
  // Level 3: L-shape
  (() => {
    const grid = makeEmptyGrid(5, 5)
    grid[4][0].type = 'start'
    grid[0][2].type = 'goal'
    grid[2][1].type = 'wall'; grid[3][1].type = 'wall'
    return { grid, rows: 5, cols: 5, start: { row: 4, col: 0 }, startDir: 'up' as Direction, goal: { row: 0, col: 2 }, maxInstructions: 8, optimalSteps: 7, hint: 'Go up, turn right, then forward' }
  })(),
  // Level 4: Zigzag
  (() => {
    const grid = makeEmptyGrid(5, 5)
    grid[4][0].type = 'start'
    grid[0][4].type = 'goal'
    grid[3][1].type = 'wall'; grid[2][1].type = 'wall'
    grid[1][3].type = 'wall'; grid[2][3].type = 'wall'
    return { grid, rows: 5, cols: 5, start: { row: 4, col: 0 }, startDir: 'up' as Direction, goal: { row: 0, col: 4 }, maxInstructions: 12, optimalSteps: 10, hint: 'Navigate around the walls' }
  })(),
  // Level 5: Spiral entry
  (() => {
    const grid = makeEmptyGrid(5, 5)
    grid[4][0].type = 'start'
    grid[2][2].type = 'goal'
    grid[0][1].type = 'wall'; grid[0][2].type = 'wall'; grid[0][3].type = 'wall'
    grid[2][0].type = 'wall'; grid[2][1].type = 'wall'
    grid[3][3].type = 'wall'; grid[3][4].type = 'wall'
    return { grid, rows: 5, cols: 5, start: { row: 4, col: 0 }, startDir: 'up' as Direction, goal: { row: 2, col: 2 }, maxInstructions: 12, optimalSteps: 9, hint: 'Find the path to the center' }
  })(),
]

const MEDIUM_LEVELS: Omit<Level, 'levelNumber'>[] = [
  // Level 1: Jump over a crack
  (() => {
    const grid = makeEmptyGrid(6, 6)
    grid[5][0].type = 'start'
    grid[0][0].type = 'goal'
    grid[3][0].type = 'crack'
    return { grid, rows: 6, cols: 6, start: { row: 5, col: 0 }, startDir: 'up' as Direction, goal: { row: 0, col: 0 }, maxInstructions: 8, optimalSteps: 5, hint: 'Jump over the crack!' }
  })(),
  // Level 2: Multiple cracks
  (() => {
    const grid = makeEmptyGrid(6, 6)
    grid[5][0].type = 'start'
    grid[0][5].type = 'goal'
    grid[3][0].type = 'crack'
    grid[1][3].type = 'crack'
    grid[2][2].type = 'wall'; grid[3][2].type = 'wall'
    return { grid, rows: 6, cols: 6, start: { row: 5, col: 0 }, startDir: 'up' as Direction, goal: { row: 0, col: 5 }, maxInstructions: 14, optimalSteps: 11, hint: 'Jump over cracks, navigate around walls' }
  })(),
  // Level 3: Crack corridor
  (() => {
    const grid = makeEmptyGrid(6, 6)
    grid[5][0].type = 'start'
    grid[5][5].type = 'goal'
    grid[5][2].type = 'crack'
    grid[3][0].type = 'wall'; grid[3][1].type = 'wall'; grid[3][3].type = 'wall'; grid[3][4].type = 'wall'; grid[3][5].type = 'wall'
    return { grid, rows: 6, cols: 6, start: { row: 5, col: 0 }, startDir: 'right' as Direction, goal: { row: 5, col: 5 }, maxInstructions: 10, optimalSteps: 5, hint: 'Jump the crack and keep going' }
  })(),
  // Level 4: Maze with cracks
  (() => {
    const grid = makeEmptyGrid(6, 6)
    grid[5][0].type = 'start'
    grid[0][5].type = 'goal'
    grid[4][1].type = 'wall'; grid[3][1].type = 'wall'; grid[2][1].type = 'wall'
    grid[2][3].type = 'wall'; grid[3][3].type = 'wall'; grid[4][3].type = 'wall'
    grid[1][2].type = 'crack'
    grid[4][4].type = 'crack'
    return { grid, rows: 6, cols: 6, start: { row: 5, col: 0 }, startDir: 'up' as Direction, goal: { row: 0, col: 5 }, maxInstructions: 16, optimalSteps: 13, hint: 'Weave through walls and jump cracks' }
  })(),
  // Level 5: Tricky path
  (() => {
    const grid = makeEmptyGrid(6, 6)
    grid[5][2].type = 'start'
    grid[0][3].type = 'goal'
    grid[3][2].type = 'crack'
    grid[1][2].type = 'crack'
    grid[2][0].type = 'wall'; grid[2][1].type = 'wall'
    grid[4][4].type = 'wall'; grid[4][5].type = 'wall'
    return { grid, rows: 6, cols: 6, start: { row: 5, col: 2 }, startDir: 'up' as Direction, goal: { row: 0, col: 3 }, maxInstructions: 14, optimalSteps: 9, hint: 'Two jumps and a turn' }
  })(),
]

const HARD_LEVELS: Omit<Level, 'levelNumber'>[] = [
  // Level 1: Ice slide intro
  (() => {
    const grid = makeEmptyGrid(7, 7)
    grid[6][0].type = 'start'
    grid[6][6].type = 'goal'
    grid[6][3].type = 'ice'
    return { grid, rows: 7, cols: 7, start: { row: 6, col: 0 }, startDir: 'right' as Direction, goal: { row: 6, col: 6 }, maxInstructions: 8, optimalSteps: 5, hint: 'Ice slides you one extra cell!' }
  })(),
  // Level 2: Ice + crack combo
  (() => {
    const grid = makeEmptyGrid(7, 7)
    grid[6][0].type = 'start'
    grid[0][6].type = 'goal'
    grid[4][0].type = 'ice'
    grid[2][0].type = 'crack'
    grid[0][3].type = 'ice'
    grid[3][3].type = 'wall'; grid[3][4].type = 'wall'; grid[3][5].type = 'wall'
    return { grid, rows: 7, cols: 7, start: { row: 6, col: 0 }, startDir: 'up' as Direction, goal: { row: 0, col: 6 }, maxInstructions: 14, optimalSteps: 10, hint: 'Use ice to your advantage, jump the crack' }
  })(),
  // Level 3: Ice maze
  (() => {
    const grid = makeEmptyGrid(7, 7)
    grid[6][0].type = 'start'
    grid[0][6].type = 'goal'
    grid[6][2].type = 'ice'
    grid[4][4].type = 'ice'
    grid[2][6].type = 'ice'
    grid[4][2].type = 'crack'
    grid[2][4].type = 'crack'
    grid[3][1].type = 'wall'; grid[3][2].type = 'wall'
    grid[1][4].type = 'wall'; grid[1][5].type = 'wall'
    return { grid, rows: 7, cols: 7, start: { row: 6, col: 0 }, startDir: 'right' as Direction, goal: { row: 0, col: 6 }, maxInstructions: 18, optimalSteps: 14, hint: 'Plan around ice slides and cracks' }
  })(),
  // Level 4: Complex navigation
  (() => {
    const grid = makeEmptyGrid(7, 7)
    grid[6][3].type = 'start'
    grid[0][3].type = 'goal'
    grid[5][1].type = 'wall'; grid[5][2].type = 'wall'
    grid[5][4].type = 'wall'; grid[5][5].type = 'wall'
    grid[3][0].type = 'wall'; grid[3][1].type = 'wall'; grid[3][5].type = 'wall'; grid[3][6].type = 'wall'
    grid[1][2].type = 'wall'; grid[1][4].type = 'wall'
    grid[4][3].type = 'crack'
    grid[2][3].type = 'ice'
    return { grid, rows: 7, cols: 7, start: { row: 6, col: 3 }, startDir: 'up' as Direction, goal: { row: 0, col: 3 }, maxInstructions: 16, optimalSteps: 7, hint: 'Jump the crack, ride the ice' }
  })(),
  // Level 5: Ultimate challenge
  (() => {
    const grid = makeEmptyGrid(7, 7)
    grid[6][0].type = 'start'
    grid[0][6].type = 'goal'
    grid[5][2].type = 'ice'; grid[3][4].type = 'ice'; grid[1][6].type = 'ice'
    grid[4][1].type = 'crack'; grid[2][5].type = 'crack'
    grid[4][3].type = 'wall'; grid[4][4].type = 'wall'
    grid[2][1].type = 'wall'; grid[2][2].type = 'wall'
    grid[0][3].type = 'wall'; grid[0][4].type = 'wall'
    return { grid, rows: 7, cols: 7, start: { row: 6, col: 0 }, startDir: 'up' as Direction, goal: { row: 0, col: 6 }, maxInstructions: 20, optimalSteps: 15, hint: 'The ultimate test of logic!' }
  })(),
]

export function getLevel(difficulty: BotDifficulty, levelNumber: number): Level {
  const levels = difficulty === 'easy' ? EASY_LEVELS : difficulty === 'medium' ? MEDIUM_LEVELS : HARD_LEVELS
  const idx = Math.min(levelNumber - 1, levels.length - 1)
  return { ...levels[idx], levelNumber }
}

export function getTotalLevels(difficulty: BotDifficulty): number {
  return DIFFICULTY_CONFIG[difficulty].levelCount
}
