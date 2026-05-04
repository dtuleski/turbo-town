// ============================================================
// Scratch Coding Game — Block Types, Categories & Difficulty
// ============================================================

// ============================================================
// NEW Command-Based Types (Terminal Rework)
// ============================================================

// Sensor functions that check game world state
export type SensorType = 'obstacle-ahead' | 'at-goal' | 'not-at-goal' | 'edge-ahead';

// Comparison operators for variable conditions
export type ComparisonOperator = '<' | '>' | '=';

// Condition expression — discriminated union of sensor and comparison
export type SensorCondition = { type: 'sensor'; sensor: SensorType };
export type ComparisonCondition = {
  type: 'comparison';
  variable: 'var-num' | 'var-char';
  operator: ComparisonOperator;
  value: number | string;
};
export type Condition = SensorCondition | ComparisonCondition;

// Runtime variable storage during execution
export interface VariableEnvironment {
  'var-num'?: number;
  'var-char'?: string;
}

export type CommandType =
  | 'FORWARD'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'JUMP'
  | 'LOOP'
  // Generic conditionals (replace IF_OBSTACLE and WHILE_NOT_GOAL)
  | 'IF'
  | 'WHILE'
  // Variable commands
  | 'VAR_NUM_DECL'
  | 'VAR_CHAR_DECL'
  | 'VAR_NUM_INC'
  | 'VAR_NUM_DEC';

export interface Command {
  id: string;
  type: CommandType;
  parameter?: number;
  body?: Command[];
  elseBody?: Command[];
  // Generic condition for IF and WHILE commands
  condition?: Condition;
  // Initial value for variable declarations
  varValue?: number | string;
}

export interface CommandDefinition {
  type: CommandType;
  label: string;
  textRepresentation: string;
  isControlStructure: boolean;
  hasParameter: boolean;
  parameterDefault: number;
  parameterMin: number;
  parameterMax: number;
  hasBody: boolean;
  hasElseBody: boolean;
  minDifficulty: Difficulty;
}

export interface InsertionCursor {
  /** The command ID of the parent control structure, or null for top-level */
  parentId: string | null;
  /** 'body' or 'elseBody' — which branch of the parent to insert into */
  branch: 'body' | 'elseBody';
  /** Index within the target array where the next command will be inserted */
  index: number;
}

// ============================================================
// Legacy Block Types (kept for backward compatibility — removed in Task 17)
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
  availableCommands: CommandType[];
}

export type CellType = 'empty' | 'wall' | 'goal' | 'obstacle';
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
  // New fields for terminal rework (Task 1.3)
  maxLines?: number;
  optimalLines?: number;
  availableCommands?: CommandType[];
  generateObstacles?: boolean;
  obstacleCount?: number;
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

// ============================================================
// Command Definitions (Terminal Rework)
// ============================================================

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    type: 'FORWARD',
    label: 'spaceCoder.commands.forward',
    textRepresentation: 'forward()',
    isControlStructure: false,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: false,
    hasElseBody: false,
    minDifficulty: 'easy',
  },
  {
    type: 'TURN_LEFT',
    label: 'spaceCoder.commands.turnLeft',
    textRepresentation: 'turn-left()',
    isControlStructure: false,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: false,
    hasElseBody: false,
    minDifficulty: 'easy',
  },
  {
    type: 'TURN_RIGHT',
    label: 'spaceCoder.commands.turnRight',
    textRepresentation: 'turn-right()',
    isControlStructure: false,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: false,
    hasElseBody: false,
    minDifficulty: 'easy',
  },
  {
    type: 'JUMP',
    label: 'spaceCoder.commands.jump',
    textRepresentation: 'jump()',
    isControlStructure: false,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: false,
    hasElseBody: false,
    minDifficulty: 'hard',
  },
  {
    type: 'LOOP',
    label: 'spaceCoder.commands.loop',
    textRepresentation: 'loop(n)',
    isControlStructure: true,
    hasParameter: true,
    parameterDefault: 2,
    parameterMin: 1,
    parameterMax: 20,
    hasBody: true,
    hasElseBody: false,
    minDifficulty: 'medium',
  },
  {
    type: 'IF',
    label: 'spaceCoder.commands.if',
    textRepresentation: 'if(...)',
    isControlStructure: true,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: true,
    hasElseBody: true,
    minDifficulty: 'hard',
  },
  {
    type: 'WHILE',
    label: 'spaceCoder.commands.while',
    textRepresentation: 'while(...)',
    isControlStructure: true,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: true,
    hasElseBody: false,
    minDifficulty: 'hard',
  },
  {
    type: 'VAR_NUM_DECL',
    label: 'spaceCoder.commands.varNumDecl',
    textRepresentation: 'var-num = 0',
    isControlStructure: false,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: false,
    hasElseBody: false,
    minDifficulty: 'hard',
  },
  {
    type: 'VAR_CHAR_DECL',
    label: 'spaceCoder.commands.varCharDecl',
    textRepresentation: "var-char = 'a'",
    isControlStructure: false,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: false,
    hasElseBody: false,
    minDifficulty: 'hard',
  },
  {
    type: 'VAR_NUM_INC',
    label: 'spaceCoder.commands.varNumInc',
    textRepresentation: 'var-num++',
    isControlStructure: false,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: false,
    hasElseBody: false,
    minDifficulty: 'hard',
  },
  {
    type: 'VAR_NUM_DEC',
    label: 'spaceCoder.commands.varNumDec',
    textRepresentation: 'var-num--',
    isControlStructure: false,
    hasParameter: false,
    parameterDefault: 0,
    parameterMin: 0,
    parameterMax: 0,
    hasBody: false,
    hasElseBody: false,
    minDifficulty: 'hard',
  },
];

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

/** Returns command definitions available at the given difficulty. */
export function getCommandsForDifficulty(difficulty: Difficulty): CommandDefinition[] {
  const rank = DIFFICULTY_RANK[difficulty];
  return COMMAND_DEFINITIONS.filter((c) => DIFFICULTY_RANK[c.minDifficulty] <= rank);
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy', emoji: '🟢', description: '6×6 grid · forward, turn',
    levelCount: 5, gridSize: 6, availableCategories: ['motion', 'events'],
    availableCommands: ['FORWARD', 'TURN_LEFT', 'TURN_RIGHT'],
  },
  medium: {
    label: 'Medium', emoji: '🟡', description: '8×8 grid · loops!',
    levelCount: 5, gridSize: 8, availableCategories: ['motion', 'events', 'control'],
    availableCommands: ['FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'LOOP'],
  },
  hard: {
    label: 'Hard', emoji: '🔴', description: '12×12 grid · obstacles & conditionals',
    levelCount: 5, gridSize: 12, availableCategories: ['motion', 'events', 'control'],
    availableCommands: ['FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'JUMP', 'LOOP', 'IF', 'WHILE', 'VAR_NUM_DECL', 'VAR_CHAR_DECL', 'VAR_NUM_INC', 'VAR_NUM_DEC'],
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
      if (ch === 'O') return 'obstacle';
      return 'empty';
    })
  );
}

const EASY_BLOCKS: BlockType[] = ['ON_START', 'MOVE_FORWARD', 'TURN_LEFT', 'TURN_RIGHT'];
const MEDIUM_BLOCKS: BlockType[] = [...EASY_BLOCKS, 'REPEAT'];
const HARD_BLOCKS: BlockType[] = [...MEDIUM_BLOCKS, 'IF_WALL_AHEAD', 'IF_ON_GOAL'];

// ============================================================
// NEW EASY LEVELS — 6×6, forward/turn-left/turn-right only
// forward() = 1 step, so optimal line counts are higher
// ============================================================

const EASY_COMMANDS: CommandType[] = ['FORWARD', 'TURN_LEFT', 'TURN_RIGHT'];

// E1: Straight line. (0,0)→right 5→(0,5). 5 forward() calls.
const NEW_EASY_1: Level = {
  grid: parseGrid(['.....G', '......', '......', '......', '......', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 0, col: 5 },
  maxBlocks: 10, optimalBlocks: 5, levelNumber: 1,
  maxLines: 9, optimalLines: 5,
  availableCommands: EASY_COMMANDS,
  availableBlocks: EASY_BLOCKS,
  hint: 'scratchCoding.hints.easy1',
};

// E2: L-shape. (0,0)→right 3, turn-right, down 2→(2,3). 3+1+2 = 6 lines.
const NEW_EASY_2: Level = {
  grid: parseGrid(['......', '......', '...G..', '......', '......', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 2, col: 3 },
  maxBlocks: 12, optimalBlocks: 6, levelNumber: 2,
  maxLines: 12, optimalLines: 6,
  availableCommands: EASY_COMMANDS,
  availableBlocks: EASY_BLOCKS,
  hint: 'scratchCoding.hints.easy2',
};

// E3: U-turn. (0,0)→right 4, turn-right, down 2, turn-right, left 4→(2,0). 4+1+2+1+4 = 12 lines.
const NEW_EASY_3: Level = {
  grid: parseGrid(['......', '####..', 'G.....', '......', '......', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 2, col: 0 },
  maxBlocks: 16, optimalBlocks: 12, levelNumber: 3,
  maxLines: 16, optimalLines: 12,
  availableCommands: EASY_COMMANDS,
  availableBlocks: EASY_BLOCKS,
  hint: 'scratchCoding.hints.easy3',
};

// E4: Zigzag. (0,0)→right 3, turn-right, down 2, turn-left, right 1→(2,4). 3+1+2+1+1 = 8 lines.
const NEW_EASY_4: Level = {
  grid: parseGrid(['......', '...#..', '....G.', '......', '......', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 2, col: 4 },
  maxBlocks: 14, optimalBlocks: 8, levelNumber: 4,
  maxLines: 14, optimalLines: 8,
  availableCommands: EASY_COMMANDS,
  availableBlocks: EASY_BLOCKS,
  hint: 'scratchCoding.hints.easy4',
};

// E5: Multi-turn S-curve. (0,0)→right 4, turn-right, down 2, turn-right, left 4, turn-left, down 2→(4,0).
// 4+1+2+1+4+1+2 = 15 lines.
const NEW_EASY_5: Level = {
  grid: parseGrid(['......', '####..', '......', '..####', 'G.....', '......']),
  rows: 6, cols: 6, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 4, col: 0 },
  maxBlocks: 20, optimalBlocks: 15, levelNumber: 5,
  maxLines: 20, optimalLines: 15,
  availableCommands: EASY_COMMANDS,
  availableBlocks: EASY_BLOCKS,
  hint: 'scratchCoding.hints.easy5',
};

// ============================================================
// NEW MEDIUM LEVELS — 8×8, adds LOOP
// Corridors with repeating patterns. maxLines forces loop usage.
// forward() = 1 step, so flat solutions use many lines.
// ============================================================

const MEDIUM_COMMANDS: CommandType[] = ['FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'LOOP'];

// M1: Staircase — 3 identical right-down steps on 8×8.
// Path: [right 2, turn-right, down 2, turn-left] × 3 → (0,0)→(6,6)
// Flat: (2+1+2+1)×3 - 1 = 17 lines. Optimal with loop(3){forward,forward,turn-right,forward,forward,turn-left} = 2+6 = 8 lines.
const NEW_MEDIUM_1: Level = {
  grid: parseGrid([
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '......G.',
    '........',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 6, col: 6 },
  maxBlocks: 12, optimalBlocks: 8, levelNumber: 1,
  maxLines: 12, optimalLines: 8,
  availableCommands: MEDIUM_COMMANDS,
  availableBlocks: MEDIUM_BLOCKS,
  hint: 'scratchCoding.hints.medium1',
};

// M2: Zigzag corridor — serpentine path across 8×8.
// Path: right 7, turn-right, down 1, turn-right, left 7, turn-left, down 1, turn-left, right 7 → (2,7)
// Flat: 7+1+1+1+7+1+1+1+7 = 27 lines. With loop(2){7×fwd,TR,fwd,TR,7×fwd,TL,fwd,TL},7×fwd = complex.
// Simpler: loop(2){loop pattern} — optimal ~10 lines.
const NEW_MEDIUM_2: Level = {
  grid: parseGrid([
    '........',
    '........',
    '.......G',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 2, col: 7 },
  maxBlocks: 14, optimalBlocks: 10, levelNumber: 2,
  maxLines: 14, optimalLines: 10,
  availableCommands: MEDIUM_COMMANDS,
  availableBlocks: MEDIUM_BLOCKS,
  hint: 'scratchCoding.hints.medium2',
};

// M3: Spiral inward — 8×8 with walls forming a spiral corridor.
// Path: right 6, turn-right, down 6, turn-right, left 6, turn-right, up 4 → (2,1)
// Flat: 6+1+6+1+6+1+4 = 25 lines. Optimal with loops ~10 lines.
const NEW_MEDIUM_3: Level = {
  grid: parseGrid([
    '........',
    '.######.',
    '.#....#.',
    '.#.##.#.',
    '.#....#.',
    '.#G...#.',
    '.######.',
    '........',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 5, col: 2 },
  maxBlocks: 16, optimalBlocks: 10, levelNumber: 3,
  maxLines: 16, optimalLines: 10,
  availableCommands: MEDIUM_COMMANDS,
  availableBlocks: MEDIUM_BLOCKS,
  hint: 'scratchCoding.hints.medium3',
};

// M4: L-shaped repeat — 2 identical L-turns on 8×8.
// Path: [right 3, turn-right, down 3, turn-left] × 2 → (6,6)
// Flat: (3+1+3+1)×2 = 16 lines. Optimal: loop(2){3×fwd,TR,3×fwd,TL} = 2+8 = 10 lines.
const NEW_MEDIUM_4: Level = {
  grid: parseGrid([
    '....####',
    '....####',
    '....####',
    '........',
    '####....',
    '####....',
    '####..G.',
    '########',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 6, col: 6 },
  maxBlocks: 14, optimalBlocks: 10, levelNumber: 4,
  maxLines: 14, optimalLines: 10,
  availableCommands: MEDIUM_COMMANDS,
  availableBlocks: MEDIUM_BLOCKS,
  hint: 'scratchCoding.hints.medium4',
};

// M5: Diagonal staircase — 6 steps of [right 1, turn-right, down 1, turn-left] on 8×8.
// Flat: (1+1+1+1)×6 = 24 lines. Optimal: loop(6){fwd,TR,fwd,TL} = 2+4 = 6 lines.
const NEW_MEDIUM_5: Level = {
  grid: parseGrid([
    '..######',
    '...#####',
    '....####',
    '.....###',
    '......##',
    '.......#',
    '......G.',
    '........',
  ]),
  rows: 8, cols: 8, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 6, col: 6 },
  maxBlocks: 10, optimalBlocks: 6, levelNumber: 5,
  maxLines: 10, optimalLines: 6,
  availableCommands: MEDIUM_COMMANDS,
  availableBlocks: MEDIUM_BLOCKS,
  hint: 'scratchCoding.hints.medium5',
};


// ============================================================
// NEW HARD LEVELS — 12×12, adds JUMP, IF, WHILE, variables
// generateObstacles: true — obstacles placed at runtime via generateObstacles()
// ============================================================

const HARD_COMMANDS: CommandType[] = [
  'FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'JUMP', 'LOOP', 'IF', 'WHILE',
  'VAR_NUM_DECL', 'VAR_CHAR_DECL', 'VAR_NUM_INC', 'VAR_NUM_DEC',
];

// H1: Jump corridor — requires jump() to hop over obstacles. Start top-left, goal top-right.
const NEW_HARD_1: Level = {
  grid: parseGrid([
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '...........G',
  ]),
  rows: 12, cols: 12, start: { row: 0, col: 0 }, startDir: 'right',
  goal: { row: 11, col: 11 },
  maxBlocks: 30, optimalBlocks: 12, levelNumber: 1,
  maxLines: 30, optimalLines: 12,
  availableCommands: HARD_COMMANDS,
  availableBlocks: HARD_BLOCKS,
  generateObstacles: true, obstacleCount: 10,
  hint: 'scratchCoding.hints.hard1',
};

// H2: Obstacle maze — requires jump() and if(obstacle-ahead). Start bottom-left, goal top-right.
const NEW_HARD_2: Level = {
  grid: parseGrid([
    '...........G',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
  ]),
  rows: 12, cols: 12, start: { row: 11, col: 0 }, startDir: 'up',
  goal: { row: 0, col: 11 },
  maxBlocks: 35, optimalBlocks: 14, levelNumber: 2,
  maxLines: 35, optimalLines: 14,
  availableCommands: HARD_COMMANDS,
  availableBlocks: HARD_BLOCKS,
  generateObstacles: true, obstacleCount: 12,
  hint: 'scratchCoding.hints.hard2',
};

// H3: Dense obstacles — requires if(obstacle-ahead) with else branch. Center start.
const NEW_HARD_3: Level = {
  grid: parseGrid([
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    'G...........',
  ]),
  rows: 12, cols: 12, start: { row: 0, col: 6 }, startDir: 'down',
  goal: { row: 11, col: 0 },
  maxBlocks: 35, optimalBlocks: 15, levelNumber: 3,
  maxLines: 35, optimalLines: 15,
  availableCommands: HARD_COMMANDS,
  availableBlocks: HARD_BLOCKS,
  generateObstacles: true, obstacleCount: 15,
  hint: 'scratchCoding.hints.hard3',
};

// H4: Conditional navigation — requires if(obstacle-ahead) for path selection.
const NEW_HARD_4: Level = {
  grid: parseGrid([
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '...........G',
    '............',
    '............',
    '............',
    '............',
    '............',
  ]),
  rows: 12, cols: 12, start: { row: 6, col: 0 }, startDir: 'right',
  goal: { row: 6, col: 11 },
  maxBlocks: 30, optimalBlocks: 10, levelNumber: 4,
  maxLines: 30, optimalLines: 10,
  availableCommands: HARD_COMMANDS,
  availableBlocks: HARD_BLOCKS,
  generateObstacles: true, obstacleCount: 18,
  hint: 'scratchCoding.hints.hard4',
};

// H5: Ultimate — requires while(not-at-goal) for dynamic navigation. Many obstacles.
const NEW_HARD_5: Level = {
  grid: parseGrid([
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '...........G',
  ]),
  rows: 12, cols: 12, start: { row: 0, col: 0 }, startDir: 'down',
  goal: { row: 11, col: 11 },
  maxBlocks: 25, optimalBlocks: 8, levelNumber: 5,
  maxLines: 25, optimalLines: 8,
  availableCommands: HARD_COMMANDS,
  availableBlocks: HARD_BLOCKS,
  generateObstacles: true, obstacleCount: 20,
  hint: 'scratchCoding.hints.hard5',
};

const NEW_EASY_LEVELS: Level[] = [NEW_EASY_1, NEW_EASY_2, NEW_EASY_3, NEW_EASY_4, NEW_EASY_5];
const NEW_MEDIUM_LEVELS: Level[] = [NEW_MEDIUM_1, NEW_MEDIUM_2, NEW_MEDIUM_3, NEW_MEDIUM_4, NEW_MEDIUM_5];
const NEW_HARD_LEVELS: Level[] = [NEW_HARD_1, NEW_HARD_2, NEW_HARD_3, NEW_HARD_4, NEW_HARD_5];

const LEVELS: Record<Difficulty, Level[]> = {
  easy: NEW_EASY_LEVELS,
  medium: NEW_MEDIUM_LEVELS,
  hard: NEW_HARD_LEVELS,
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
  // New fields for terminal rework (Task 1.3)
  hitObstacle?: boolean;
  isJumpMidpoint?: boolean;
  errorType?: 'collision' | 'no-obstacle-to-jump' | 'infinite-loop' | 'jump-landing-blocked' | 'undefined-variable';
  lineIndex?: number;
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

// ============================================================
// Path-Based Tree Manipulation Utilities (Task 1)
// ============================================================

/**
 * Describes a position in the program tree.
 * Even indices = block index in the current array
 * Odd indices = 0 for body, 1 for elseBody
 *
 * Examples:
 *   [2]           → top-level block at index 2
 *   [0, 0, 1]    → block 0's body, child at index 1
 *   [1, 1, 0]    → block 1's elseBody, child at index 0
 *   [0, 0, 2, 0, 0] → block 0's body, child 2's body, child 0
 */
export type BlockPath = number[];

/**
 * Recursively count every block in a program tree,
 * including blocks nested inside body and elseBody arrays at any depth.
 */
export function countAllBlocks(blocks: Block[]): number {
  let count = 0;
  for (const block of blocks) {
    count += 1;
    if (block.body) {
      count += countAllBlocks(block.body);
    }
    if (block.elseBody) {
      count += countAllBlocks(block.elseBody);
    }
  }
  return count;
}

/**
 * Compute the nesting depth from a BlockPath.
 * Each nesting level adds 2 elements to the path (container index + body/elseBody selector).
 * Top-level path like [2] has depth 0. Path [0, 0, 1] has depth 1.
 */
export function getNestingDepth(path: BlockPath): number {
  return Math.floor(path.length / 2);
}

/**
 * Insert a block at the given path in the tree.
 * Returns a new tree, or null if:
 *   - maxBlocks would be exceeded
 *   - nesting depth > 3
 *   - the path is invalid
 *
 * All operations are immutable — the input tree is never mutated.
 */
export function insertBlockAtPath(
  program: Block[],
  path: BlockPath,
  block: Block,
  maxBlocks: number,
): Block[] | null {
  // Check max blocks
  if (countAllBlocks(program) >= maxBlocks) return null;

  // Check nesting depth
  if (getNestingDepth(path) > 3) return null;

  // Path must have at least one element (the insertion index)
  if (path.length === 0) return null;

  // Top-level insertion: path has exactly one element
  if (path.length === 1) {
    const index = path[0];
    if (index < 0 || index > program.length) return null;
    const result = [...program];
    result.splice(index, 0, block);
    return result;
  }

  // Nested insertion: navigate into the tree
  // path[0] = container block index, path[1] = 0 for body / 1 for elseBody, rest = recurse
  const containerIndex = path[0];
  const branchSelector = path[1];
  const remainingPath = path.slice(2);

  if (containerIndex < 0 || containerIndex >= program.length) return null;
  if (branchSelector !== 0 && branchSelector !== 1) return null;

  const container = program[containerIndex];
  const branch = branchSelector === 0 ? container.body : container.elseBody;

  // Container must have the selected branch
  if (!branch) return null;

  // Recurse into the branch
  const updatedBranch = insertBlockAtPath(branch, remainingPath, block, maxBlocks);
  if (updatedBranch === null) return null;

  // Build updated container
  const updatedContainer: Block = { ...container };
  if (branchSelector === 0) {
    updatedContainer.body = updatedBranch;
  } else {
    updatedContainer.elseBody = updatedBranch;
  }

  // Build updated program
  const result = [...program];
  result[containerIndex] = updatedContainer;
  return result;
}

/**
 * Remove the block at the given path from the tree.
 * Returns a new tree. If the path is invalid, returns the original tree unchanged.
 *
 * All operations are immutable — the input tree is never mutated.
 */
export function removeBlockAtPath(program: Block[], path: BlockPath): Block[] {
  if (path.length === 0) return program;

  // Top-level removal: path has exactly one element
  if (path.length === 1) {
    const index = path[0];
    if (index < 0 || index >= program.length) return program;
    return [...program.slice(0, index), ...program.slice(index + 1)];
  }

  // Nested removal: navigate into the tree
  const containerIndex = path[0];
  const branchSelector = path[1];
  const remainingPath = path.slice(2);

  if (containerIndex < 0 || containerIndex >= program.length) return program;
  if (branchSelector !== 0 && branchSelector !== 1) return program;

  const container = program[containerIndex];
  const branch = branchSelector === 0 ? container.body : container.elseBody;

  if (!branch) return program;

  const updatedBranch = removeBlockAtPath(branch, remainingPath);

  // If the branch didn't change, return original
  if (updatedBranch === branch) return program;

  const updatedContainer: Block = { ...container };
  if (branchSelector === 0) {
    updatedContainer.body = updatedBranch;
  } else {
    updatedContainer.elseBody = updatedBranch;
  }

  const result = [...program];
  result[containerIndex] = updatedContainer;
  return result;
}

/**
 * Update a block's parameter at the given path.
 * Returns a new tree. If the path is invalid, returns the original tree unchanged.
 *
 * All operations are immutable — the input tree is never mutated.
 */
export function updateParameterAtPath(
  program: Block[],
  path: BlockPath,
  value: number,
): Block[] {
  if (path.length === 0) return program;

  // Top-level update: path has exactly one element
  if (path.length === 1) {
    const index = path[0];
    if (index < 0 || index >= program.length) return program;
    const updatedBlock: Block = { ...program[index], parameter: value };
    const result = [...program];
    result[index] = updatedBlock;
    return result;
  }

  // Nested update: navigate into the tree
  const containerIndex = path[0];
  const branchSelector = path[1];
  const remainingPath = path.slice(2);

  if (containerIndex < 0 || containerIndex >= program.length) return program;
  if (branchSelector !== 0 && branchSelector !== 1) return program;

  const container = program[containerIndex];
  const branch = branchSelector === 0 ? container.body : container.elseBody;

  if (!branch) return program;

  const updatedBranch = updateParameterAtPath(branch, remainingPath, value);

  // If the branch didn't change, return original
  if (updatedBranch === branch) return program;

  const updatedContainer: Block = { ...container };
  if (branchSelector === 0) {
    updatedContainer.body = updatedBranch;
  } else {
    updatedContainer.elseBody = updatedBranch;
  }

  const result = [...program];
  result[containerIndex] = updatedContainer;
  return result;
}

/**
 * Compute block efficiency from an array of level results.
 * Returns min(1.0, sum(optimalBlocks) / sum(actualBlocks)).
 * If actualBlocks sum is 0, returns 1.0.
 */
export function computeBlockEfficiency(
  results: Array<{ optimalBlocks: number; actualBlocks: number }>,
): number {
  let sumOptimal = 0;
  let sumActual = 0;
  for (const r of results) {
    sumOptimal += r.optimalBlocks;
    sumActual += r.actualBlocks;
  }
  if (sumActual === 0) return 1.0;
  return Math.min(1.0, sumOptimal / sumActual);
}

// ============================================================
// Terminal Rework — Core Utility Functions (Task 2)
// ============================================================

let _commandCounter = 0;

/** Creates a new Command instance with a unique ID and correct defaults based on COMMAND_DEFINITIONS. */
export function createCommand(type: CommandType): Command {
  const def = COMMAND_DEFINITIONS.find((d) => d.type === type);
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `cmd-${Date.now()}-${++_commandCounter}-${Math.random().toString(36).slice(2, 8)}`;

  const cmd: Command = { id, type };

  if (def?.hasParameter) {
    cmd.parameter = def.parameterDefault;
  }
  if (def?.hasBody) {
    cmd.body = [];
  }
  if (def?.hasElseBody) {
    cmd.elseBody = [];
  }

  // Initialize type-specific fields for new generic commands
  switch (type) {
    case 'IF':
      cmd.condition = { type: 'sensor', sensor: 'obstacle-ahead' };
      cmd.body = [];
      cmd.elseBody = [];
      break;
    case 'WHILE':
      cmd.condition = { type: 'sensor', sensor: 'not-at-goal' };
      cmd.body = [];
      break;
    case 'VAR_NUM_DECL':
      cmd.varValue = 0;
      break;
    case 'VAR_CHAR_DECL':
      cmd.varValue = 'a';
      break;
    // VAR_NUM_INC and VAR_NUM_DEC: no special fields needed (just id and type)
  }

  return cmd;
}

// ============================================================
// 2.0 — conditionToText / textToCondition helpers
// ============================================================

/** Convert a Condition to its text representation. */
export function conditionToText(condition: Condition): string {
  if (condition.type === 'sensor') return `${condition.sensor}()`;
  const val = condition.variable === 'var-char' ? condition.value as string : String(condition.value);
  return `${condition.variable} ${condition.operator} ${val}`;
}

/** Parse a condition string back to a Condition object. Returns null for unparseable strings. */
export function textToCondition(text: string): Condition | null {
  if (text === 'obstacle-ahead()') return { type: 'sensor', sensor: 'obstacle-ahead' };
  if (text === 'at-goal()') return { type: 'sensor', sensor: 'at-goal' };
  if (text === 'not-at-goal()') return { type: 'sensor', sensor: 'not-at-goal' };
  if (text === 'edge-ahead()') return { type: 'sensor', sensor: 'edge-ahead' };
  const match = text.match(/^(var-num|var-char)\s+([<>=])\s+(.+)$/);
  if (match) {
    const variable = match[1] as 'var-num' | 'var-char';
    const operator = match[2] as ComparisonOperator;
    const rawValue = match[3];
    const value = variable === 'var-num' ? parseInt(rawValue, 10) : rawValue;
    if (variable === 'var-num' && isNaN(value as number)) return null;
    return { type: 'comparison', variable, operator, value };
  }
  return null;
}

// ============================================================
// 2.1 — programToText
// ============================================================

/**
 * Convert a Command[] program tree into indented text lines for display.
 *
 * Rules:
 * - Simple commands render as their textRepresentation from COMMAND_DEFINITIONS.
 * - LOOP renders as `loop(n)` + indented body + `next`
 * - IF renders as `if(<condition>)` + indented then body + `else` + indented else body + `end-if`
 * - WHILE renders as `while(<condition>)` + indented body + `end-while`
 * - VAR_NUM_DECL renders as `var-num = <value>`
 * - VAR_CHAR_DECL renders as `var-char = '<value>'`
 * - VAR_NUM_INC renders as `var-num++`
 * - VAR_NUM_DEC renders as `var-num--`
 * - Indent by 2 spaces per nesting level.
 */
export function programToText(program: Command[], indent: number = 0): string[] {
  const lines: string[] = [];
  const prefix = ' '.repeat(indent);

  for (const cmd of program) {
    switch (cmd.type) {
      case 'LOOP': {
        const n = cmd.parameter ?? 2;
        lines.push(`${prefix}loop(${n})`);
        lines.push(...programToText(cmd.body ?? [], indent + 2));
        lines.push(`${prefix}next`);
        break;
      }
      case 'IF': {
        const condText = cmd.condition ? conditionToText(cmd.condition) : 'obstacle-ahead()';
        lines.push(`${prefix}if(${condText})`);
        lines.push(...programToText(cmd.body ?? [], indent + 2));
        lines.push(`${prefix}else`);
        lines.push(...programToText(cmd.elseBody ?? [], indent + 2));
        lines.push(`${prefix}end-if`);
        break;
      }
      case 'WHILE': {
        const condText = cmd.condition ? conditionToText(cmd.condition) : 'not-at-goal()';
        lines.push(`${prefix}while(${condText})`);
        lines.push(...programToText(cmd.body ?? [], indent + 2));
        lines.push(`${prefix}end-while`);
        break;
      }
      case 'VAR_NUM_DECL': {
        lines.push(`${prefix}var-num = ${cmd.varValue ?? 0}`);
        break;
      }
      case 'VAR_CHAR_DECL': {
        lines.push(`${prefix}var-char = '${cmd.varValue ?? 'a'}'`);
        break;
      }
      case 'VAR_NUM_INC': {
        lines.push(`${prefix}var-num++`);
        break;
      }
      case 'VAR_NUM_DEC': {
        lines.push(`${prefix}var-num--`);
        break;
      }
      default: {
        // Simple command — look up textRepresentation
        const def = COMMAND_DEFINITIONS.find((d) => d.type === cmd.type);
        const text = def?.textRepresentation ?? cmd.type.toLowerCase();
        lines.push(`${prefix}${text}`);
        break;
      }
    }
  }

  return lines;
}

// ============================================================
// 2.2 — textToProgram
// ============================================================

/**
 * Parse indented text lines back into a Command[] tree.
 * This is the inverse of programToText.
 *
 * Uses a stack-based parser:
 * - Simple commands create leaf Command nodes
 * - `loop(n)` pushes a LOOP onto the stack; subsequent lines go into body until `next`
 * - `if(<condition>)` pushes IF; `else` switches to elseBody; `end-if` pops
 * - `while(<condition>)` pushes WHILE; `end-while` pops
 * - `var-num = <value>` creates VAR_NUM_DECL
 * - `var-char = '<value>'` creates VAR_CHAR_DECL
 * - `var-num++` creates VAR_NUM_INC
 * - `var-num--` creates VAR_NUM_DEC
 */
export function textToProgram(lines: string[]): Command[] {
  const root: Command[] = [];

  // Stack entries track the current container and which branch we're filling
  interface StackEntry {
    command: Command;
    branch: 'body' | 'elseBody';
  }

  const stack: StackEntry[] = [];

  /** Returns the array we should currently be pushing commands into. */
  function currentTarget(): Command[] {
    if (stack.length === 0) return root;
    const top = stack[stack.length - 1];
    if (top.branch === 'elseBody') {
      return top.command.elseBody!;
    }
    return top.command.body!;
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === '') continue;

    // Match loop(n)
    const loopMatch = trimmed.match(/^loop\((\d+)\)$/);
    if (loopMatch) {
      const cmd = createCommand('LOOP');
      cmd.parameter = parseInt(loopMatch[1], 10);
      currentTarget().push(cmd);
      stack.push({ command: cmd, branch: 'body' });
      continue;
    }

    // Match next (closes LOOP)
    if (trimmed === 'next') {
      if (stack.length > 0 && stack[stack.length - 1].command.type === 'LOOP') {
        stack.pop();
      }
      continue;
    }

    // Match if(<condition>)
    const ifMatch = trimmed.match(/^if\((.+)\)$/);
    if (ifMatch) {
      const condition = textToCondition(ifMatch[1]);
      if (condition) {
        const cmd = createCommand('IF');
        cmd.condition = condition;
        currentTarget().push(cmd);
        stack.push({ command: cmd, branch: 'body' });
        continue;
      }
    }

    // Match else (switches IF to elseBody)
    if (trimmed === 'else') {
      if (stack.length > 0 && stack[stack.length - 1].command.type === 'IF') {
        stack[stack.length - 1].branch = 'elseBody';
      }
      continue;
    }

    // Match end-if (closes IF)
    if (trimmed === 'end-if') {
      if (stack.length > 0 && stack[stack.length - 1].command.type === 'IF') {
        stack.pop();
      }
      continue;
    }

    // Match while(<condition>)
    const whileMatch = trimmed.match(/^while\((.+)\)$/);
    if (whileMatch) {
      const condition = textToCondition(whileMatch[1]);
      if (condition) {
        const cmd = createCommand('WHILE');
        cmd.condition = condition;
        currentTarget().push(cmd);
        stack.push({ command: cmd, branch: 'body' });
        continue;
      }
    }

    // Match end-while (closes WHILE)
    if (trimmed === 'end-while') {
      if (stack.length > 0 && stack[stack.length - 1].command.type === 'WHILE') {
        stack.pop();
      }
      continue;
    }

    // Match var-num = <integer>
    const varNumMatch = trimmed.match(/^var-num = (-?\d+)$/);
    if (varNumMatch) {
      const cmd = createCommand('VAR_NUM_DECL');
      cmd.varValue = parseInt(varNumMatch[1], 10);
      currentTarget().push(cmd);
      continue;
    }

    // Match var-char = '<char>'
    const varCharMatch = trimmed.match(/^var-char = '(.)'$/);
    if (varCharMatch) {
      const cmd = createCommand('VAR_CHAR_DECL');
      cmd.varValue = varCharMatch[1];
      currentTarget().push(cmd);
      continue;
    }

    // Match var-num++
    if (trimmed === 'var-num++') {
      const cmd = createCommand('VAR_NUM_INC');
      currentTarget().push(cmd);
      continue;
    }

    // Match var-num--
    if (trimmed === 'var-num--') {
      const cmd = createCommand('VAR_NUM_DEC');
      currentTarget().push(cmd);
      continue;
    }

    // Simple commands — match by textRepresentation
    const def = COMMAND_DEFINITIONS.find((d) => d.textRepresentation === trimmed);
    if (def) {
      const cmd = createCommand(def.type);
      currentTarget().push(cmd);
      continue;
    }
  }

  return root;
}

// ============================================================
// 2.4 — countAllLines
// ============================================================

/**
 * Recursively count the total number of display lines a program would render.
 *
 * - Simple command = 1 line
 * - LOOP = 1 (loop line) + body lines + 1 (next line)
 * - IF = 1 (if line) + then body lines + 1 (else line) + else body lines + 1 (end-if line)
 * - WHILE = 1 (while line) + body lines + 1 (end-while line)
 */
export function countAllLines(commands: Command[]): number {
  let count = 0;
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'LOOP':
        // loop(n) + body + next
        count += 1 + countAllLines(cmd.body ?? []) + 1;
        break;
      case 'IF':
        // if + then body + else + else body + end-if
        count += 1 + countAllLines(cmd.body ?? []) + 1 + countAllLines(cmd.elseBody ?? []) + 1;
        break;
      case 'WHILE':
        // while + body + end-while
        count += 1 + countAllLines(cmd.body ?? []) + 1;
        break;
      default:
        count += 1;
        break;
    }
  }
  return count;
}

// ============================================================
// 2.6 — insertCommand
// ============================================================

/**
 * Insert a new command of the given type at the cursor position in the program tree.
 *
 * Returns the updated program and the new cursor position.
 * - Simple commands: insert at cursor.index, advance cursor.index by 1
 * - Control structures: insert the structure, move cursor inside its body at index 0
 */
export function insertCommand(
  program: Command[],
  type: CommandType,
  cursor: InsertionCursor,
): { program: Command[]; cursor: InsertionCursor } {
  const cmd = createCommand(type);
  const def = COMMAND_DEFINITIONS.find((d) => d.type === type)!;

  // Deep-clone the program to avoid mutation
  const newProgram = deepCloneProgram(program);

  // Find the target array based on cursor
  const targetArray = findTargetArray(newProgram, cursor.parentId, cursor.branch);
  if (!targetArray) {
    // Fallback: insert at top level
    const clamped = Math.max(0, Math.min(cursor.index, newProgram.length));
    newProgram.splice(clamped, 0, cmd);
    const newCursor: InsertionCursor = def.isControlStructure
      ? { parentId: cmd.id, branch: 'body', index: 0 }
      : { parentId: cursor.parentId, branch: cursor.branch, index: clamped + 1 };
    return { program: newProgram, cursor: newCursor };
  }

  const clamped = Math.max(0, Math.min(cursor.index, targetArray.length));
  targetArray.splice(clamped, 0, cmd);

  const newCursor: InsertionCursor = def.isControlStructure
    ? { parentId: cmd.id, branch: 'body', index: 0 }
    : { parentId: cursor.parentId, branch: cursor.branch, index: clamped + 1 };

  return { program: newProgram, cursor: newCursor };
}

/** Deep-clone a Command[] tree. */
function deepCloneProgram(commands: Command[]): Command[] {
  return commands.map((cmd) => {
    const clone: Command = { id: cmd.id, type: cmd.type };
    if (cmd.parameter !== undefined) clone.parameter = cmd.parameter;
    if (cmd.body) clone.body = deepCloneProgram(cmd.body);
    if (cmd.elseBody) clone.elseBody = deepCloneProgram(cmd.elseBody);
    if (cmd.condition) clone.condition = { ...cmd.condition };
    if (cmd.varValue !== undefined) clone.varValue = cmd.varValue;
    return clone;
  });
}

/**
 * Find the target array in the program tree for a given parentId and branch.
 * Returns null if parentId is null (top-level) — caller should use the program array directly.
 * Returns the body or elseBody array of the matching command, or undefined if not found.
 */
function findTargetArray(
  commands: Command[],
  parentId: string | null,
  branch: 'body' | 'elseBody',
): Command[] | null {
  if (parentId === null) return commands;

  for (const cmd of commands) {
    if (cmd.id === parentId) {
      return branch === 'elseBody' ? (cmd.elseBody ?? null) : (cmd.body ?? null);
    }
    // Search recursively in body and elseBody
    if (cmd.body) {
      const found = findTargetArray(cmd.body, parentId, branch);
      if (found !== null && found !== cmd.body && found !== cmd.elseBody) return found;
      if (found !== null) return found;
    }
    if (cmd.elseBody) {
      const found = findTargetArray(cmd.elseBody, parentId, branch);
      if (found !== null && found !== cmd.elseBody && found !== cmd.body) return found;
      if (found !== null) return found;
    }
  }

  return null;
}

// ============================================================
// 2.7 — removeAtLine
// ============================================================

/**
 * Build a mapping from line index to the command and its location in the tree.
 * This is used by removeAtLine to find which command corresponds to a given line.
 */
export interface LineMapping {
  lineIndex: number;
  command: Command;
  /** The parent array containing this command */
  parentArray: Command[];
  /** Index of this command within parentArray */
  indexInParent: number;
  /** 'opening' | 'closing' | 'else' | 'simple' */
  lineType: 'opening' | 'closing' | 'else' | 'simple';
}

export function buildLineMapping(
  commands: Command[],
  startLine: number = 0,
): { mappings: LineMapping[]; nextLine: number } {
  const mappings: LineMapping[] = [];
  let currentLine = startLine;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    switch (cmd.type) {
      case 'LOOP': {
        // loop(n) line
        mappings.push({
          lineIndex: currentLine,
          command: cmd,
          parentArray: commands,
          indexInParent: i,
          lineType: 'opening',
        });
        currentLine++;

        // body
        const bodyResult = buildLineMapping(cmd.body ?? [], currentLine);
        mappings.push(...bodyResult.mappings);
        currentLine = bodyResult.nextLine;

        // next line
        mappings.push({
          lineIndex: currentLine,
          command: cmd,
          parentArray: commands,
          indexInParent: i,
          lineType: 'closing',
        });
        currentLine++;
        break;
      }
      case 'IF': {
        // if(<condition>) line
        mappings.push({
          lineIndex: currentLine,
          command: cmd,
          parentArray: commands,
          indexInParent: i,
          lineType: 'opening',
        });
        currentLine++;

        // then body
        const thenResult = buildLineMapping(cmd.body ?? [], currentLine);
        mappings.push(...thenResult.mappings);
        currentLine = thenResult.nextLine;

        // else line
        mappings.push({
          lineIndex: currentLine,
          command: cmd,
          parentArray: commands,
          indexInParent: i,
          lineType: 'else',
        });
        currentLine++;

        // else body
        const elseResult = buildLineMapping(cmd.elseBody ?? [], currentLine);
        mappings.push(...elseResult.mappings);
        currentLine = elseResult.nextLine;

        // end-if line
        mappings.push({
          lineIndex: currentLine,
          command: cmd,
          parentArray: commands,
          indexInParent: i,
          lineType: 'closing',
        });
        currentLine++;
        break;
      }
      case 'WHILE': {
        // while(<condition>) line
        mappings.push({
          lineIndex: currentLine,
          command: cmd,
          parentArray: commands,
          indexInParent: i,
          lineType: 'opening',
        });
        currentLine++;

        // body
        const whileBodyResult = buildLineMapping(cmd.body ?? [], currentLine);
        mappings.push(...whileBodyResult.mappings);
        currentLine = whileBodyResult.nextLine;

        // end-while line
        mappings.push({
          lineIndex: currentLine,
          command: cmd,
          parentArray: commands,
          indexInParent: i,
          lineType: 'closing',
        });
        currentLine++;
        break;
      }
      default: {
        // Simple command
        mappings.push({
          lineIndex: currentLine,
          command: cmd,
          parentArray: commands,
          indexInParent: i,
          lineType: 'simple',
        });
        currentLine++;
        break;
      }
    }
  }

  return { mappings, nextLine: currentLine };
}

/**
 * Remove the command at the given line index from the program.
 *
 * - If the line is a control structure's opening or closing keyword (or else), remove the entire structure.
 * - If the line is a simple command inside a structure, remove only that command.
 *
 * Returns the updated program and a cursor pointing to the position where the removed item was.
 */
export function removeAtLine(
  program: Command[],
  lineIndex: number,
): { program: Command[]; cursor: InsertionCursor } {
  const newProgram = deepCloneProgram(program);
  const { mappings } = buildLineMapping(newProgram);

  const mapping = mappings.find((m) => m.lineIndex === lineIndex);
  if (!mapping) {
    // Line not found — return unchanged
    return {
      program: newProgram,
      cursor: { parentId: null, branch: 'body', index: 0 },
    };
  }

  const { command, parentArray, indexInParent, lineType } = mapping;

  if (lineType === 'simple') {
    // Remove just this command from its parent array
    parentArray.splice(indexInParent, 1);

    // Determine cursor: find the parentId by looking at the original program structure
    const parentId = findParentId(newProgram, command.id);
    const branch = findBranch(newProgram, command.id);

    return {
      program: newProgram,
      cursor: {
        parentId: parentId,
        branch: branch,
        index: indexInParent,
      },
    };
  }

  // For opening, closing, or else lines — remove the entire control structure
  parentArray.splice(indexInParent, 1);

  const parentId = findParentIdOfArray(newProgram, parentArray);
  const branch = findBranchOfArray(newProgram, parentArray);

  return {
    program: newProgram,
    cursor: {
      parentId: parentId,
      branch: branch,
      index: indexInParent,
    },
  };
}

/** Find the parentId (command ID) that contains a command with the given ID in its body or elseBody. */
function findParentId(commands: Command[], targetId: string, _currentParentId: string | null = null): string | null {
  for (const cmd of commands) {
    if (cmd.body) {
      for (const child of cmd.body) {
        if (child.id === targetId) return cmd.id;
      }
      const found = findParentId(cmd.body, targetId, cmd.id);
      if (found !== null) return found;
    }
    if (cmd.elseBody) {
      for (const child of cmd.elseBody) {
        if (child.id === targetId) return cmd.id;
      }
      const found = findParentId(cmd.elseBody, targetId, cmd.id);
      if (found !== null) return found;
    }
  }
  return null;
}

/** Find which branch ('body' or 'elseBody') a command with the given ID is in. */
function findBranch(commands: Command[], targetId: string): 'body' | 'elseBody' {
  for (const cmd of commands) {
    if (cmd.body) {
      for (const child of cmd.body) {
        if (child.id === targetId) return 'body';
      }
      const found = findBranchInner(cmd.body, targetId);
      if (found) return found;
    }
    if (cmd.elseBody) {
      for (const child of cmd.elseBody) {
        if (child.id === targetId) return 'elseBody';
      }
      const found = findBranchInner(cmd.elseBody, targetId);
      if (found) return found;
    }
  }
  return 'body'; // default
}

function findBranchInner(commands: Command[], targetId: string): 'body' | 'elseBody' | null {
  for (const cmd of commands) {
    if (cmd.body) {
      for (const child of cmd.body) {
        if (child.id === targetId) return 'body';
      }
      const found = findBranchInner(cmd.body, targetId);
      if (found) return found;
    }
    if (cmd.elseBody) {
      for (const child of cmd.elseBody) {
        if (child.id === targetId) return 'elseBody';
      }
      const found = findBranchInner(cmd.elseBody, targetId);
      if (found) return found;
    }
  }
  return null;
}

/** Find the parentId for a given array reference in the program tree. */
function findParentIdOfArray(commands: Command[], targetArray: Command[]): string | null {
  if (commands === targetArray) return null;
  for (const cmd of commands) {
    if (cmd.body === targetArray) return cmd.id;
    if (cmd.elseBody === targetArray) return cmd.id;
    if (cmd.body) {
      const found = findParentIdOfArray(cmd.body, targetArray);
      if (found !== null) return found;
    }
    if (cmd.elseBody) {
      const found = findParentIdOfArray(cmd.elseBody, targetArray);
      if (found !== null) return found;
    }
  }
  return null;
}

/** Find which branch a given array reference belongs to. */
function findBranchOfArray(commands: Command[], targetArray: Command[]): 'body' | 'elseBody' {
  for (const cmd of commands) {
    if (cmd.body === targetArray) return 'body';
    if (cmd.elseBody === targetArray) return 'elseBody';
    if (cmd.body) {
      const found = findBranchOfArrayInner(cmd.body, targetArray);
      if (found) return found;
    }
    if (cmd.elseBody) {
      const found = findBranchOfArrayInner(cmd.elseBody, targetArray);
      if (found) return found;
    }
  }
  return 'body'; // default for top-level
}

function findBranchOfArrayInner(commands: Command[], targetArray: Command[]): 'body' | 'elseBody' | null {
  for (const cmd of commands) {
    if (cmd.body === targetArray) return 'body';
    if (cmd.elseBody === targetArray) return 'elseBody';
    if (cmd.body) {
      const found = findBranchOfArrayInner(cmd.body, targetArray);
      if (found) return found;
    }
    if (cmd.elseBody) {
      const found = findBranchOfArrayInner(cmd.elseBody, targetArray);
      if (found) return found;
    }
  }
  return null;
}

// ============================================================
// 3.1 — bfsPathExists
// ============================================================

/**
 * Standard BFS on a 4-connected grid (up/down/left/right).
 * Treats 'wall' and 'obstacle' as impassable.
 * Returns true if a path exists from start to goal.
 */
export function bfsPathExists(
  grid: CellType[][],
  start: Position,
  goal: Position,
): boolean {
  const rows = grid.length;
  if (rows === 0) return false;
  const cols = grid[0].length;

  // Quick checks
  if (start.row === goal.row && start.col === goal.col) return true;
  if (
    start.row < 0 || start.row >= rows || start.col < 0 || start.col >= cols ||
    goal.row < 0 || goal.row >= rows || goal.col < 0 || goal.col >= cols
  ) {
    return false;
  }

  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: Position[] = [{ row: start.row, col: start.col }];
  visited[start.row][start.col] = true;

  const deltas = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const d of deltas) {
      const nr = current.row + d.row;
      const nc = current.col + d.col;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc]) continue;

      const cell = grid[nr][nc];
      if (cell === 'wall' || cell === 'obstacle') continue;

      if (nr === goal.row && nc === goal.col) return true;

      visited[nr][nc] = true;
      queue.push({ row: nr, col: nc });
    }
  }

  return false;
}

// ============================================================
// 3.2 — generateObstacles
// ============================================================

/**
 * Generate a grid with randomly placed obstacles, validated by BFS.
 *
 * 1. Create empty grid
 * 2. Collect candidate cells (exclude start, goal, cells adjacent to start)
 * 3. Shuffle candidates randomly
 * 4. Place obstacles one at a time up to targetCount
 * 5. After each placement, run BFS to verify path exists
 * 6. If BFS fails, remove last obstacle and continue
 * 7. Return final grid
 */
export function generateObstacles(
  rows: number,
  cols: number,
  start: Position,
  goal: Position,
  targetCount: number,
): CellType[][] {
  // 1. Create empty grid
  const grid: CellType[][] = Array.from({ length: rows }, () =>
    Array(cols).fill('empty') as CellType[],
  );

  // Mark goal
  grid[goal.row][goal.col] = 'goal';

  // 2. Collect candidate cells (exclude start, goal, cells adjacent to start)
  const adjacentToStart = new Set<string>();
  adjacentToStart.add(`${start.row},${start.col}`);
  const adjDeltas = [
    { row: -1, col: 0 }, { row: 1, col: 0 },
    { row: 0, col: -1 }, { row: 0, col: 1 },
  ];
  for (const d of adjDeltas) {
    const ar = start.row + d.row;
    const ac = start.col + d.col;
    if (ar >= 0 && ar < rows && ac >= 0 && ac < cols) {
      adjacentToStart.add(`${ar},${ac}`);
    }
  }
  adjacentToStart.add(`${goal.row},${goal.col}`);

  const candidates: Position[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!adjacentToStart.has(`${r},${c}`)) {
        candidates.push({ row: r, col: c });
      }
    }
  }

  // 3. Shuffle candidates (Fisher-Yates)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // 4-6. Place obstacles one at a time, BFS-validate after each
  let placed = 0;
  for (const pos of candidates) {
    if (placed >= targetCount) break;

    grid[pos.row][pos.col] = 'obstacle';

    if (bfsPathExists(grid, start, goal)) {
      placed++;
    } else {
      // BFS failed — remove obstacle
      grid[pos.row][pos.col] = 'empty';
    }
  }

  return grid;
}

// ============================================================
// 5.1 — evaluateCondition helper
// ============================================================

/**
 * Evaluate a condition expression against the current game state.
 * Returns { result: boolean, error?: string }.
 * - Sensor conditions check the game world (obstacle-ahead, at-goal, not-at-goal, edge-ahead).
 * - Comparison conditions compare a variable from the environment to a literal value.
 * - Returns an error string when a referenced variable is undefined.
 */
export function evaluateCondition(
  condition: Condition,
  state: CharacterState,
  level: Level,
  env: VariableEnvironment,
): { result: boolean; error?: string } {
  if (condition.type === 'sensor') {
    switch (condition.sensor) {
      case 'obstacle-ahead': {
        const delta = DIR_DELTA[state.dir];
        const ahead: Position = { row: state.pos.row + delta.row, col: state.pos.col + delta.col };
        if (!inBounds(ahead, level)) return { result: false }; // edge, not obstacle
        const blocked = level.grid[ahead.row][ahead.col] === 'wall' || level.grid[ahead.row][ahead.col] === 'obstacle';
        return { result: blocked };
      }
      case 'at-goal':
        return { result: state.pos.row === level.goal.row && state.pos.col === level.goal.col };
      case 'not-at-goal':
        return { result: !(state.pos.row === level.goal.row && state.pos.col === level.goal.col) };
      case 'edge-ahead': {
        const delta = DIR_DELTA[state.dir];
        const ahead: Position = { row: state.pos.row + delta.row, col: state.pos.col + delta.col };
        return { result: !inBounds(ahead, level) };
      }
    }
  }
  // Comparison condition
  const { variable, operator, value } = condition;
  const currentValue = env[variable];
  if (currentValue === undefined) {
    return { result: false, error: `undefined-variable:${variable}` };
  }
  if (variable === 'var-num') {
    const numVal = currentValue as number;
    const compareVal = value as number;
    switch (operator) {
      case '<': return { result: numVal < compareVal };
      case '>': return { result: numVal > compareVal };
      case '=': return { result: numVal === compareVal };
    }
  } else {
    const charCode = (currentValue as string).charCodeAt(0);
    const compareCode = (value as string).charCodeAt(0);
    switch (operator) {
      case '<': return { result: charCode < compareCode };
      case '>': return { result: charCode > compareCode };
      case '=': return { result: charCode === compareCode };
    }
  }
}

// ============================================================
// 5 — executeProgramV2 (New Execution Engine)
// ============================================================

/**
 * Build a mapping from command ID to line index in the programToText output.
 * This is used to set lineIndex on each ExecutionStep for CodeEditor highlighting.
 */
function buildCommandIdToLineIndex(
  commands: Command[],
  startLine: number = 0,
): { mapping: Map<string, number>; nextLine: number } {
  const mapping = new Map<string, number>();
  let currentLine = startLine;

  for (const cmd of commands) {
    // Map the command ID to its opening line
    mapping.set(cmd.id, currentLine);

    switch (cmd.type) {
      case 'LOOP': {
        currentLine++; // loop(n) line
        const bodyResult = buildCommandIdToLineIndex(cmd.body ?? [], currentLine);
        bodyResult.mapping.forEach((v, k) => mapping.set(k, v));
        currentLine = bodyResult.nextLine;
        currentLine++; // next line
        break;
      }
      case 'IF': {
        currentLine++; // if(<condition>) line
        const thenResult = buildCommandIdToLineIndex(cmd.body ?? [], currentLine);
        thenResult.mapping.forEach((v, k) => mapping.set(k, v));
        currentLine = thenResult.nextLine;
        currentLine++; // else line
        const elseResult = buildCommandIdToLineIndex(cmd.elseBody ?? [], currentLine);
        elseResult.mapping.forEach((v, k) => mapping.set(k, v));
        currentLine = elseResult.nextLine;
        currentLine++; // end-if line
        break;
      }
      case 'WHILE': {
        currentLine++; // while(<condition>) line
        const whileResult = buildCommandIdToLineIndex(cmd.body ?? [], currentLine);
        whileResult.mapping.forEach((v, k) => mapping.set(k, v));
        currentLine = whileResult.nextLine;
        currentLine++; // end-while line
        break;
      }
      default: {
        currentLine++; // simple command line
        break;
      }
    }
  }

  return { mapping, nextLine: currentLine };
}

/**
 * New execution engine that handles the terminal rework command types.
 * Keeps the old executeProgram for backward compatibility.
 *
 * Handles: FORWARD, TURN_LEFT, TURN_RIGHT, JUMP, LOOP, IF, WHILE, VAR_NUM_DECL, VAR_CHAR_DECL, VAR_NUM_INC, VAR_NUM_DEC
 */
export function executeProgramV2(level: Level, program: Command[]): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const state: CharacterState = {
    pos: { ...level.start },
    dir: level.startDir,
    alive: true,
  };
  const env: VariableEnvironment = {};

  // 5.6 — Build command ID to line index mapping
  const { mapping: cmdLineMap } = buildCommandIdToLineIndex(program);

  function isDone(): boolean {
    if (!state.alive) return true;
    if (steps.length > 0 && steps[steps.length - 1].reachedGoal) return true;
    if (steps.length >= MAX_STEPS) return true;
    return false;
  }

  function pushStep(
    commandId: string,
    overrides: Partial<ExecutionStep> = {},
  ): void {
    const reachedGoal =
      state.pos.row === level.goal.row && state.pos.col === level.goal.col;
    steps.push({
      blockId: commandId,
      pos: { ...state.pos },
      dir: state.dir,
      alive: state.alive,
      reachedGoal: overrides.reachedGoal ?? reachedGoal,
      hitWall: overrides.hitWall ?? false,
      outOfBounds: overrides.outOfBounds ?? false,
      hitObstacle: overrides.hitObstacle ?? false,
      isJumpMidpoint: overrides.isJumpMidpoint ?? false,
      errorType: overrides.errorType,
      lineIndex: cmdLineMap.get(commandId) ?? 0,
    });
  }

  function executeCommand(cmd: Command): void {
    if (isDone()) return;

    switch (cmd.type) {
      // 5.1 — FORWARD execution
      case 'FORWARD': {
        const delta = DIR_DELTA[state.dir];
        const next: Position = {
          row: state.pos.row + delta.row,
          col: state.pos.col + delta.col,
        };

        const oob = !inBounds(next, level);
        if (oob) {
          state.alive = false;
          pushStep(cmd.id, {
            outOfBounds: true,
            reachedGoal: false,
            errorType: 'collision',
          });
          return;
        }

        const cell = level.grid[next.row][next.col];
        if (cell === 'wall') {
          state.alive = false;
          pushStep(cmd.id, {
            hitWall: true,
            reachedGoal: false,
            errorType: 'collision',
          });
          return;
        }

        if (cell === 'obstacle') {
          state.alive = false;
          pushStep(cmd.id, {
            hitObstacle: true,
            reachedGoal: false,
            errorType: 'collision',
          });
          return;
        }

        // Valid move
        state.pos = next;
        pushStep(cmd.id);
        break;
      }

      // TURN_LEFT
      case 'TURN_LEFT': {
        state.dir = TURN_LEFT_MAP[state.dir];
        pushStep(cmd.id);
        break;
      }

      // TURN_RIGHT
      case 'TURN_RIGHT': {
        state.dir = TURN_RIGHT_MAP[state.dir];
        pushStep(cmd.id);
        break;
      }

      // 5.2 — JUMP execution
      case 'JUMP': {
        const delta = DIR_DELTA[state.dir];
        const ahead: Position = {
          row: state.pos.row + delta.row,
          col: state.pos.col + delta.col,
        };

        // Check if obstacle is directly ahead
        const aheadInBounds = inBounds(ahead, level);
        const obstacleAhead =
          aheadInBounds && level.grid[ahead.row][ahead.col] === 'obstacle';

        if (!obstacleAhead) {
          // No obstacle ahead — error
          state.alive = false;
          pushStep(cmd.id, {
            reachedGoal: false,
            errorType: 'no-obstacle-to-jump',
          });
          return;
        }

        // Check landing cell (2 ahead)
        const landing: Position = {
          row: state.pos.row + delta.row * 2,
          col: state.pos.col + delta.col * 2,
        };

        const landingInBounds = inBounds(landing, level);
        if (!landingInBounds) {
          state.alive = false;
          pushStep(cmd.id, {
            outOfBounds: true,
            reachedGoal: false,
            errorType: 'jump-landing-blocked',
          });
          return;
        }

        const landingCell = level.grid[landing.row][landing.col];
        if (landingCell === 'wall' || landingCell === 'obstacle') {
          state.alive = false;
          pushStep(cmd.id, {
            hitWall: landingCell === 'wall',
            hitObstacle: landingCell === 'obstacle',
            reachedGoal: false,
            errorType: 'jump-landing-blocked',
          });
          return;
        }

        // Valid jump — produce 2 steps: midpoint + landing
        // Step 1: midpoint (above obstacle)
        state.pos = ahead;
        pushStep(cmd.id, {
          isJumpMidpoint: true,
          reachedGoal: false,
        });

        // Step 2: landing
        state.pos = landing;
        pushStep(cmd.id);
        break;
      }

      // 5.3 — LOOP execution
      case 'LOOP': {
        const count = cmd.parameter ?? 2;
        for (let i = 0; i < count; i++) {
          for (const child of cmd.body ?? []) {
            executeCommand(child);
            if (isDone()) return;
          }
        }
        break;
      }

      // 5.4 — IF execution (generic condition)
      case 'IF': {
        const condition = cmd.condition ?? { type: 'sensor', sensor: 'obstacle-ahead' } as Condition;
        const evalResult = evaluateCondition(condition, state, level, env);
        if (evalResult.error) {
          state.alive = false;
          pushStep(cmd.id, { reachedGoal: false, errorType: 'undefined-variable' });
          return;
        }
        const branch = evalResult.result ? (cmd.body ?? []) : (cmd.elseBody ?? []);
        for (const child of branch) {
          executeCommand(child);
          if (isDone()) return;
        }
        break;
      }

      // 5.5 — WHILE execution (generic condition)
      case 'WHILE': {
        const condition = cmd.condition ?? { type: 'sensor', sensor: 'not-at-goal' } as Condition;
        let whileIterations = 0;
        const MAX_WHILE_ITERATIONS = 1000;
        while (!isDone()) {
          whileIterations++;
          if (whileIterations > MAX_WHILE_ITERATIONS) {
            state.alive = false;
            pushStep(cmd.id, { reachedGoal: false, errorType: 'infinite-loop' });
            return;
          }
          const evalResult = evaluateCondition(condition, state, level, env);
          if (evalResult.error) {
            state.alive = false;
            pushStep(cmd.id, { reachedGoal: false, errorType: 'undefined-variable' });
            return;
          }
          if (!evalResult.result) break; // condition is false, exit while
          for (const child of cmd.body ?? []) {
            executeCommand(child);
            if (isDone()) return;
          }
          if (steps.length >= MAX_STEPS) {
            state.alive = false;
            pushStep(cmd.id, { reachedGoal: false, errorType: 'infinite-loop' });
            return;
          }
        }
        break;
      }

      // 5.6 — Variable commands
      case 'VAR_NUM_DECL': {
        env['var-num'] = (cmd.varValue as number) ?? 0;
        // No step produced — variable declaration is silent
        break;
      }
      case 'VAR_CHAR_DECL': {
        env['var-char'] = (cmd.varValue as string) ?? 'a';
        break;
      }
      case 'VAR_NUM_INC': {
        if (env['var-num'] === undefined) {
          state.alive = false;
          pushStep(cmd.id, { reachedGoal: false, errorType: 'undefined-variable' });
          return;
        }
        env['var-num']++;
        break;
      }
      case 'VAR_NUM_DEC': {
        if (env['var-num'] === undefined) {
          state.alive = false;
          pushStep(cmd.id, { reachedGoal: false, errorType: 'undefined-variable' });
          return;
        }
        env['var-num']--;
        break;
      }
    }
  }

  for (const cmd of program) {
    executeCommand(cmd);
    if (isDone()) break;
  }

  // Check if we hit the step limit without an explicit infinite-loop error
  if (steps.length >= MAX_STEPS && state.alive) {
    const lastStep = steps[steps.length - 1];
    if (!lastStep.reachedGoal && lastStep.errorType !== 'infinite-loop') {
      state.alive = false;
      // Overwrite the last step's error info
      lastStep.alive = false;
      lastStep.errorType = 'infinite-loop';
    }
  }

  return steps;
}

// ============================================================
// 6.1 — computeLineEfficiency (also referenced in Task 2)
// ============================================================

/**
 * Compute line efficiency from an array of level results.
 * Returns min(1.0, sum(optimalLines) / sum(actualLines)).
 * If actualLines sum is 0, returns 1.0.
 */
export function computeLineEfficiency(
  results: Array<{ optimalLines: number; actualLines: number }>,
): number {
  let sumOptimal = 0;
  let sumActual = 0;
  for (const r of results) {
    sumOptimal += r.optimalLines;
    sumActual += r.actualLines;
  }
  if (sumActual === 0) return 1.0;
  return Math.min(1.0, sumOptimal / sumActual);
}
