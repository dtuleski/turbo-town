// ============================================================
// Scratch Coding Game — Block Types, Categories & Difficulty
// ============================================================

export type BlockCategory = 'motion' | 'control' | 'events';

export type BlockType =
  | 'ON_START'
  | 'MOVE_FORWARD'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'REPEAT'
  | 'IF_WALL_AHEAD'
  | 'IF_ON_GOAL';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface BlockDefinition {
  type: BlockType;
  category: BlockCategory;
  label: string;
  color: string;
  hasParameter: boolean;
  parameterDefault: number;
  parameterMin: number;
  parameterMax: number;
  hasBody: boolean;
  hasElseBody: boolean;
  minDifficulty: Difficulty;
}

export interface Block {
  id: string;
  type: BlockType;
  parameter?: number;
  body?: Block[];
  elseBody?: Block[];
}

export interface DifficultyConfig {
  label: string;
  emoji: string;
  description: string;
  levelCount: number;
  gridSize: number;
  availableCategories: BlockCategory[];
}

export type CellType = 'empty' | 'wall' | 'goal';
export type Direction = 'up' | 'right' | 'down' | 'left';

export interface Position {
  row: number;
  col: number;
}

export interface Level {
  grid: CellType[][];
  rows: number;
  cols: number;
  start: Position;
  startDir: Direction;
  goal: Position;
  maxBlocks: number;
  optimalBlocks: number;
  levelNumber: number;
  hint?: string;
  availableBlocks: BlockType[];
}

// --- Block Definitions ---

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: 'ON_START', category: 'events',
    label: 'scratchCoding.blocks.onStart', color: 'bg-yellow-400',
    hasParameter: false, parameterDefault: 0, parameterMin: 0, parameterMax: 0,
    hasBody: false, hasElseBody: false, minDifficulty: 'easy',
  },
  {
    type: 'MOVE_FORWARD', category: 'motion',
    label: 'scratchCoding.blocks.moveForward', color: 'bg-blue-400',
    hasParameter: true, parameterDefault: 1, parameterMin: 1, parameterMax: 10,
    hasBody: false, hasElseBody: false, minDifficulty: 'easy',
  },
  {
    type: 'TURN_LEFT', category: 'motion',
    label: 'scratchCoding.blocks.turnLeft', color: 'bg-blue-400',
    hasParameter: false, parameterDefault: 0, parameterMin: 0, parameterMax: 0,
    hasBody: false, hasElseBody: false, minDifficulty: 'easy',
  },
  {
    type: 'TURN_RIGHT', category: 'motion',
    label: 'scratchCoding.blocks.turnRight', color: 'bg-blue-400',
    hasParameter: false, parameterDefault: 0, parameterMin: 0, parameterMax: 0,
    hasBody: false, hasElseBody: false, minDifficulty: 'easy',
  },
  {
    type: 'REPEAT', category: 'control',
    label: 'scratchCoding.blocks.repeat', color: 'bg-orange-400',
    hasParameter: true, parameterDefault: 2, parameterMin: 1, parameterMax: 10,
    hasBody: true, hasElseBody: false, minDifficulty: 'medium',
  },
  {
    type: 'IF_WALL_AHEAD', category: 'control',
    label: 'scratchCoding.blocks.ifWallAhead', color: 'bg-orange-400',
    hasParameter: false, parameterDefault: 0, parameterMin: 0, parameterMax: 0,
    hasBody: true, hasElseBody: true, minDifficulty: 'hard',
  },
  {
    type: 'IF_ON_GOAL', category: 'control',
    label: 'scratchCoding.blocks.ifOnGoal', color: 'bg-orange-400',
    hasParameter: false, parameterDefault: 0, parameterMin: 0, parameterMax: 0,
    hasBody: true, hasElseBody: false, minDifficulty: 'hard',
  },
];

// --- Difficulty Configuration ---

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy', emoji: '🟢', description: '6×6 grid · Motion blocks',
    levelCount: 5, gridSize: 6, availableCategories: ['motion', 'events'],
  },
  medium: {
    label: 'Medium', emoji: '🟡', description: '7×7 grid · Loops!',
    levelCount: 5, gridSize: 7, availableCategories: ['motion', 'events', 'control'],
  },
  hard: {
    label: 'Hard', emoji: '🔴', description: '8×8 grid · Conditionals!',
    levelCount: 5, gridSize: 8, availableCategories: ['motion', 'events', 'control'],
  },
};

/** Returns block definitions available at the given difficulty. */
export function getBlocksForDifficulty(difficulty: Difficulty): BlockDefinition[] {
  const rank = DIFFICULTY_RANK[difficulty];
  return BLOCK_DEFINITIONS.filter((b) => DIFFICULTY_RANK[b.minDifficulty] <= rank);
}

// --- Direction Lookup Tables ---

export const DIR_DELTA: Record<Direction, Position> = {
  up: { row: -1, col: 0 }, right: { row: 0, col: 1 },
  down: { row: 1, col: 0 }, left: { row: 0, col: -1 },
};

export const TURN_LEFT_MAP: Record<Direction, Direction> = {
  up: 'left', left: 'down', down: 'right', right: 'up',
};

export const TURN_RIGHT_MAP: Record<Direction, Direction> = {
  up: 'right', right: 'down', down: 'left', left: 'up',
};

/** Check if a position is within the grid bounds. */
export function inBounds(pos: Position, level: Level): boolean {
  return pos.row >= 0 && pos.row < level.rows && pos.col >= 0 && pos.col < level.cols;
}


// --- Grid builder & block sets ---

function parseGrid(template: string[]): CellType[][] {
  return template.map((row) =>
    row.split('').map((ch): CellType => {
      if (ch === '#') return 'wall';
      if (ch === 'G') return 'goal';
      return 'empty';
    })
  );
}

const EASY_BLOCKS: BlockType[] = ['ON_START', 'MOVE_FORWARD', 'TURN_LEFT', 'TURN_RIGHT'];
const MEDIUM_BLOCKS: BlockType[] = [...EASY_BLOCKS, 'REPEAT'];
const HARD_BLOCKS: BlockType[] = [...MEDIUM_BLOCKS, 'IF_WALL_AHEAD', 'IF_ON_GOAL'];

// ============================================================
// EASY LEVELS — 6×6, Motion + Events
// ============================================================

// E1: Straight line. (0,0)→right→(0,5). Solution: MOVE_FORWARD(5)
const EASY_1: Level = {
  grid: parseGrid(['.....G', '......', '......', '......', '......', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 0, col: 5 }, maxBlocks: 5, optimalBlocks: 1, levelNumber: 1,
  hint: 'scratchCoding.hints.easy1', availableBlocks: EASY_BLOCKS,
};

// E2: L-shape. (0,0)→right 3, turn right, down 3→(3,3). Solution: 3 blocks
const EASY_2: Level = {
  grid: parseGrid(['......', '......', '......', '...G..', '......', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 3, col: 3 }, maxBlocks: 6, optimalBlocks: 3, levelNumber: 2,
  hint: 'scratchCoding.hints.easy2', availableBlocks: EASY_BLOCKS,
};

// E3: U-turn. Wall at row 1 cols 0-3. (0,0)→right 4→(0,4), down 2→(2,4), left 4→(2,0). 5 blocks
const EASY_3: Level = {
  grid: parseGrid(['......', '####..', 'G.....', '......', '......', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 2, col: 0 }, maxBlocks: 8, optimalBlocks: 5, levelNumber: 3,
  hint: 'scratchCoding.hints.easy3', availableBlocks: EASY_BLOCKS,
};

// E4: Zigzag. Walls at (1,4) and (3,1). (0,0)→right 3, down 4, right 1→(4,4). 5 blocks
const EASY_4: Level = {
  grid: parseGrid(['......', '....#.', '......', '.#....', '....G.', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 4, col: 4 }, maxBlocks: 8, optimalBlocks: 5, levelNumber: 4,
  hint: 'scratchCoding.hints.easy4', availableBlocks: EASY_BLOCKS,
};

// E5: S-curve. Walls: row 1 cols 0-3, row 3 cols 2-5.
// Path: right 4→(0,4), down 2→(2,4), left 4→(2,0), down 2→(4,0), right 5→(4,5), down 1→(5,5)
// 11 blocks
const EASY_5: Level = {
  grid: parseGrid(['......', '####..', '......', '..####', '......', '.....G']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 5, col: 5 }, maxBlocks: 14, optimalBlocks: 11, levelNumber: 5,
  hint: 'scratchCoding.hints.easy5', availableBlocks: EASY_BLOCKS,
};

// ============================================================
// MEDIUM LEVELS — 7×7, adds REPEAT
// ============================================================

// M1: Repeat intro. (0,0)→right→(0,6). MOVE_FORWARD(6). maxBlocks=3 encourages REPEAT.
const MEDIUM_1: Level = {
  grid: parseGrid(['......G', '.......', '.......', '.......', '.......', '.......', '.......']),
  rows: 7, cols: 7, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 0, col: 6 }, maxBlocks: 3, optimalBlocks: 1, levelNumber: 1,
  hint: 'scratchCoding.hints.medium1', availableBlocks: MEDIUM_BLOCKS,
};

// M2: Square walk. (3,0)→up, Goal (0,3). REPEAT(2){MOVE_FORWARD(3), TURN_RIGHT}. 3 blocks
const MEDIUM_2: Level = {
  grid: parseGrid(['...G...', '.......', '.......', '.......', '.......', '.......', '.......']),
  rows: 7, cols: 7, start: { row: 3, col: 0 }, startDir: 'up',
  goal: { row: 0, col: 3 }, maxBlocks: 6, optimalBlocks: 3, levelNumber: 2,
  hint: 'scratchCoding.hints.medium2', availableBlocks: MEDIUM_BLOCKS,
};

// M3: Staircase corridor. Walls create staircase.
// REPEAT(3){MOVE_FORWARD(2), TURN_RIGHT, MOVE_FORWARD(2), TURN_LEFT}. 5 blocks
// Trace: right 2→(0,2), down 2→(2,2), right 2→(2,4), down 2→(4,4), right 2→(4,6), down 2→(6,6)
const MEDIUM_3: Level = {
  grid: parseGrid([
    '...####', '...####', '.....##', '##...##', '##.....', '####...', '####..G',
  ]),
  rows: 7, cols: 7, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 6, col: 6 }, maxBlocks: 8, optimalBlocks: 5, levelNumber: 3,
  hint: 'scratchCoding.hints.medium3', availableBlocks: MEDIUM_BLOCKS,
};

// M4: Diagonal staircase. (6,0)→up, Goal (0,6). Open grid.
// REPEAT(3){MOVE_FORWARD(2), TURN_RIGHT, MOVE_FORWARD(2), TURN_LEFT}. 5 blocks
// Trace: up 2→(4,0), right 2→(4,2), up 2→(2,2), right 2→(2,4), up 2→(0,4), right 2→(0,6)
const MEDIUM_4: Level = {
  grid: parseGrid(['......G', '.......', '.......', '.......', '.......', '.......', '.......']),
  rows: 7, cols: 7, start: { row: 6, col: 0 }, startDir: 'up',
  goal: { row: 0, col: 6 }, maxBlocks: 8, optimalBlocks: 5, levelNumber: 4,
  hint: 'scratchCoding.hints.medium4', availableBlocks: MEDIUM_BLOCKS,
};

// M5: Efficiency challenge. Walled staircase.
// MOVE_FORWARD(1), REPEAT(2){TURN_RIGHT, MOVE_FORWARD(2), TURN_LEFT, MOVE_FORWARD(2)},
//   TURN_RIGHT, MOVE_FORWARD(2), TURN_LEFT, MOVE_FORWARD(1). 10 blocks
// Trace: right 1→(0,1), [down 2→(2,1), right 2→(2,3)], [down 2→(4,3), right 2→(4,5)],
//   down 2→(6,5), right 1→(6,6)
const MEDIUM_5: Level = {
  grid: parseGrid([
    '..#####', '..#####', '....###', '##..###', '##....#', '####..#', '####..G',
  ]),
  rows: 7, cols: 7, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 6, col: 6 }, maxBlocks: 14, optimalBlocks: 10, levelNumber: 5,
  hint: 'scratchCoding.hints.medium5', availableBlocks: MEDIUM_BLOCKS,
};


// ============================================================
// HARD LEVELS — 8×8, adds IF_WALL_AHEAD, IF_ON_GOAL
// ============================================================

// H1: Conditional intro. Wall at (0,3) blocks direct path.
// Path: right 2→(0,2), down 1→(1,2), right 2→(1,4), up 1→(0,4), right 3→(0,7). 9 blocks.
const HARD_1: Level = {
  grid: parseGrid([
    '...#...G', '........', '........', '........',
    '........', '........', '........', '........',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 0, col: 7 }, maxBlocks: 12, optimalBlocks: 9, levelNumber: 1,
  hint: 'scratchCoding.hints.hard1', availableBlocks: HARD_BLOCKS,
};

// H2: Wall follower. Wall column at col 4 rows 0-5.
// Path: right 3→(0,3), down 7→(7,3), left 3→(7,0). 5 blocks.
const HARD_2: Level = {
  grid: parseGrid([
    '....#...', '....#...', '....#...', '....#...',
    '....#...', '....#...', '........', 'G.......',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 7, col: 0 }, maxBlocks: 8, optimalBlocks: 5, levelNumber: 2,
  hint: 'scratchCoding.hints.hard2', availableBlocks: HARD_BLOCKS,
};

// H3: Branching maze. S-curve with walls.
// Walls: row 1 cols 0-4, row 3 cols 3-7, row 5 cols 0-4.
// Path: right 5→(0,5), down 2→(2,5), left 3→(2,2), down 2→(4,2), right 5→(4,7), down 3→(7,7).
// 11 blocks.
const HARD_3: Level = {
  grid: parseGrid([
    '........', '#####...', '........', '...#####',
    '........', '#####...', '........', '.......G',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 7, col: 7 }, maxBlocks: 16, optimalBlocks: 11, levelNumber: 3,
  hint: 'scratchCoding.hints.hard3', availableBlocks: HARD_BLOCKS,
};

// H4: Repeat + conditional combo. S-curve with wall rows.
// Walls: row 2 = #######. (gap at col 7), row 5 = .####### (gap at col 0).
// Path: right 7→(0,7), down 3→(3,7), left 7→(3,0), down 3→(6,0), right 7→(6,7), down 1→(7,7).
// 11 blocks.
const HARD_4: Level = {
  grid: parseGrid([
    '........', '........', '#######.', '........',
    '........', '.#######', '........', '.......G',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 7, col: 7 }, maxBlocks: 14, optimalBlocks: 11, levelNumber: 4,
  hint: 'scratchCoding.hints.hard4', availableBlocks: HARD_BLOCKS,
};

// H5: Ultimate challenge. S-curve maze with wall rows requiring all block types.
// Walls: row 1 = ####.##., row 3 = .##.####, row 5 = ####.##.
// Path: right 4→(0,4), down 2→(2,4), left 4→(2,0), down 2→(4,0),
//   right 4→(4,4), down 2→(6,4), right 3→(6,7), down 1→(7,7). 15 blocks.
const HARD_5: Level = {
  grid: parseGrid([
    '........', '####.##.', '........', '.##.####',
    '........', '####.##.', '........', '.......G',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 7, col: 7 }, maxBlocks: 20, optimalBlocks: 15, levelNumber: 5,
  hint: 'scratchCoding.hints.hard5', availableBlocks: HARD_BLOCKS,
};

const EASY_LEVELS: Level[] = [EASY_1, EASY_2, EASY_3, EASY_4, EASY_5];
const MEDIUM_LEVELS: Level[] = [MEDIUM_1, MEDIUM_2, MEDIUM_3, MEDIUM_4, MEDIUM_5];
const HARD_LEVELS: Level[] = [HARD_1, HARD_2, HARD_3, HARD_4, HARD_5];

const LEVELS: Record<Difficulty, Level[]> = {
  easy: EASY_LEVELS,
  medium: MEDIUM_LEVELS,
  hard: HARD_LEVELS,
};

/** Get a specific level by difficulty and level number (1-indexed). */
export function getLevel(difficulty: Difficulty, levelNumber: number): Level {
  const levels = LEVELS[difficulty];
  const idx = levelNumber - 1;
  if (idx < 0 || idx >= levels.length) {
    throw new Error(`Invalid level ${levelNumber} for difficulty ${difficulty}`);
  }
  return levels[idx];
}

/** Get total number of levels for a difficulty. */
export function getTotalLevels(difficulty: Difficulty): number {
  return LEVELS[difficulty].length;
}

// ============================================================
// Execution Engine (Task 2.3)
// ============================================================

export interface CharacterState {
  pos: Position;
  dir: Direction;
  alive: boolean;
}

export interface ExecutionStep {
  blockId: string;
  pos: Position;
  dir: Direction;
  alive: boolean;
  reachedGoal: boolean;
  hitWall: boolean;
  outOfBounds: boolean;
}

const MAX_STEPS = 500;

/**
 * Recursive AST interpreter that walks the block tree and produces
 * a flat array of ExecutionStep[] for animation.
 */
export function executeProgram(level: Level, program: Block[]): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const state: CharacterState = {
    pos: { ...level.start },
    dir: level.startDir,
    alive: true,
  };

  function isDone(): boolean {
    if (!state.alive) return true;
    if (steps.length > 0 && steps[steps.length - 1].reachedGoal) return true;
    if (steps.length >= MAX_STEPS) return true;
    return false;
  }

  function executeBlock(block: Block): void {
    if (isDone()) return;

    switch (block.type) {
      case 'ON_START': {
        for (const child of block.body ?? []) {
          executeBlock(child);
          if (isDone()) return;
        }
        break;
      }

      case 'MOVE_FORWARD': {
        const n = block.parameter ?? 1;
        for (let i = 0; i < n; i++) {
          if (isDone()) return;
          const delta = DIR_DELTA[state.dir];
          const next: Position = {
            row: state.pos.row + delta.row,
            col: state.pos.col + delta.col,
          };

          const oob = !inBounds(next, level);
          const wall = !oob && level.grid[next.row][next.col] === 'wall';

          if (oob || wall) {
            state.alive = false;
            steps.push({
              blockId: block.id,
              pos: { ...state.pos },
              dir: state.dir,
              alive: false,
              reachedGoal: false,
              hitWall: wall,
              outOfBounds: oob,
            });
            return;
          }

          state.pos = next;
          const reachedGoal =
            state.pos.row === level.goal.row && state.pos.col === level.goal.col;
          steps.push({
            blockId: block.id,
            pos: { ...state.pos },
            dir: state.dir,
            alive: true,
            reachedGoal,
            hitWall: false,
            outOfBounds: false,
          });
          if (reachedGoal) return;
        }
        break;
      }

      case 'TURN_LEFT': {
        state.dir = TURN_LEFT_MAP[state.dir];
        steps.push({
          blockId: block.id,
          pos: { ...state.pos },
          dir: state.dir,
          alive: true,
          reachedGoal: false,
          hitWall: false,
          outOfBounds: false,
        });
        break;
      }

      case 'TURN_RIGHT': {
        state.dir = TURN_RIGHT_MAP[state.dir];
        steps.push({
          blockId: block.id,
          pos: { ...state.pos },
          dir: state.dir,
          alive: true,
          reachedGoal: false,
          hitWall: false,
          outOfBounds: false,
        });
        break;
      }

      case 'REPEAT': {
        const count = block.parameter ?? 1;
        for (let i = 0; i < count; i++) {
          for (const child of block.body ?? []) {
            executeBlock(child);
            if (isDone()) return;
          }
        }
        break;
      }

      case 'IF_WALL_AHEAD': {
        const delta = DIR_DELTA[state.dir];
        const ahead: Position = {
          row: state.pos.row + delta.row,
          col: state.pos.col + delta.col,
        };
        const wallAhead =
          !inBounds(ahead, level) || level.grid[ahead.row][ahead.col] === 'wall';

        const branch = wallAhead ? (block.body ?? []) : (block.elseBody ?? []);
        for (const child of branch) {
          executeBlock(child);
          if (isDone()) return;
        }
        break;
      }

      case 'IF_ON_GOAL': {
        const onGoal =
          state.pos.row === level.goal.row && state.pos.col === level.goal.col;
        if (onGoal) {
          for (const child of block.body ?? []) {
            executeBlock(child);
            if (isDone()) return;
          }
        }
        break;
      }
    }
  }

  for (const block of program) {
    executeBlock(block);
    if (isDone()) break;
  }

  return steps;
}

// ============================================================
// Program Manipulation Helpers (Task 2.4)
// ============================================================

let _blockCounter = 0;

/** Creates a new Block instance with a unique ID and default parameter. */
export function createBlock(type: BlockType): Block {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `block-${Date.now()}-${++_blockCounter}-${Math.random().toString(36).slice(2, 8)}`;

  const block: Block = { id, type };

  if (def?.hasParameter) {
    block.parameter = def.parameterDefault;
  }
  if (def?.hasBody) {
    block.body = [];
  }
  if (def?.hasElseBody) {
    block.elseBody = [];
  }

  return block;
}

/**
 * Returns a new program array with `block` inserted at `index`,
 * or `null` if the program is already at `maxBlocks` capacity.
 */
export function insertBlock(
  program: Block[],
  block: Block,
  index: number,
  maxBlocks: number,
): Block[] | null {
  if (program.length >= maxBlocks) return null;
  const clamped = Math.max(0, Math.min(index, program.length));
  const next = [...program];
  next.splice(clamped, 0, block);
  return next;
}

/**
 * Returns a new program array with the block at `index` removed.
 * If the index is out of range the original array is returned unchanged.
 */
export function removeBlock(program: Block[], index: number): Block[] {
  if (index < 0 || index >= program.length) return program;
  return [...program.slice(0, index), ...program.slice(index + 1)];
}
