/**
 * Daily Challenge - Math Maze generator. Port of `apps/web/src/utils/mazeGenerator.ts` `generateMaze`
 * (medium) with the gate equations of `apps/web/src/utils/mazeEquations.ts` `generateEquation`
 * (medium) and every `Math.random` replaced by the seeded rng. Differences from the web: equations are
 * drawn when a gate is placed (no placeholder step), and a maze whose gate or collectible count falls
 * outside the settings, or that has no path to the exit, is generated again from the same rng.
 */
import { pick, randInt, shuffle } from '../rng';
import type {
  ChallengeTotals,
  MathChallengeOperation,
  MathMazeContent,
  MazeCell,
  MazeContent,
  MazeGate,
  MazePosition,
  RotationEntry,
} from '../types';

type Rng = () => number;
type Grid = MazeCell[][];

const DIRECTIONS: readonly MazePosition[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];
/** Medium values of the web generator. */
const MEDIUM_EXTRA_PASSAGES = 3;
const EQUATION_OPERATIONS: readonly MathChallengeOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
const EQUATION_MAX_OPERAND = 50;
const MAX_DISTINCT_PATHS = 10;
const MAX_MAZE_ATTEMPTS = 50;

function num(settings: RotationEntry['settings'], key: string, fallback: number): number {
  const v = settings[key];
  return typeof v === 'number' ? v : fallback;
}

function posKey(p: MazePosition): string {
  return `${p.row},${p.col}`;
}

function at(grid: Grid, row: number, col: number): MazeCell {
  return (grid[row] as MazeCell[])[col] as MazeCell;
}

function put(grid: Grid, row: number, col: number, value: MazeCell): void {
  (grid[row] as MazeCell[])[col] = value;
}

function inBounds(grid: Grid, row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < (grid[0] as MazeCell[]).length;
}

/** BFS from `start` to `exit`; gates in `blocked` (keys `row,col`) are impassable. Same as the web. */
export function mazeHasPath(grid: Grid, start: MazePosition, exit: MazePosition, blocked?: Set<string>): boolean {
  const visited = new Set<string>([posKey(start)]);
  const queue: MazePosition[] = [start];
  while (queue.length > 0) {
    const cur = queue.shift() as MazePosition;
    if (cur.row === exit.row && cur.col === exit.col) return true;
    for (const d of DIRECTIONS) {
      const next = { row: cur.row + d.row, col: cur.col + d.col };
      if (!inBounds(grid, next.row, next.col)) continue;
      const key = posKey(next);
      if (visited.has(key)) continue;
      const c = at(grid, next.row, next.col);
      if (c === 'wall') continue;
      if (blocked && c === 'gate' && blocked.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

/** Up to 10 simple paths (DFS); only the count matters. Same as the web's `findDistinctPaths`. */
function countDistinctPaths(grid: Grid, start: MazePosition, exit: MazePosition): number {
  let paths = 0;
  const visited = new Set<string>([posKey(start)]);
  const dfs = (cur: MazePosition): void => {
    if (paths >= MAX_DISTINCT_PATHS) return;
    if (cur.row === exit.row && cur.col === exit.col) {
      paths++;
      return;
    }
    for (const d of DIRECTIONS) {
      const next = { row: cur.row + d.row, col: cur.col + d.col };
      if (!inBounds(grid, next.row, next.col)) continue;
      const key = posKey(next);
      if (visited.has(key) || at(grid, next.row, next.col) === 'wall') continue;
      visited.add(key);
      dfs(next);
      visited.delete(key);
      if (paths >= MAX_DISTINCT_PATHS) return;
    }
  };
  dfs(start);
  return paths;
}

function distancesFrom(grid: Grid, origin: MazePosition): Map<string, number> {
  const dist = new Map<string, number>([[posKey(origin), 0]]);
  const queue: MazePosition[] = [origin];
  while (queue.length > 0) {
    const cur = queue.shift() as MazePosition;
    const d0 = dist.get(posKey(cur)) as number;
    for (const d of DIRECTIONS) {
      const next = { row: cur.row + d.row, col: cur.col + d.col };
      if (!inBounds(grid, next.row, next.col)) continue;
      const key = posKey(next);
      if (dist.has(key) || at(grid, next.row, next.col) === 'wall') continue;
      dist.set(key, d0 + 1);
      queue.push(next);
    }
  }
  return dist;
}

/** Cells on any shortest start-exit path. */
function shortestPathCells(grid: Grid, start: MazePosition, exit: MazePosition): Set<string> {
  const result = new Set<string>();
  const fromStart = distancesFrom(grid, start);
  const fromExit = distancesFrom(grid, exit);
  const shortest = fromStart.get(posKey(exit));
  if (shortest === undefined) return result;
  for (const [key, ds] of fromStart) {
    const de = fromExit.get(key);
    if (de !== undefined && ds + de === shortest) result.add(key);
  }
  return result;
}

/** Iterative recursive backtracker in cell space (odd grid coordinates). */
function carve(grid: Grid, rows: number, cols: number, rng: Rng): void {
  const cellRows = Math.floor(rows / 2);
  const cellCols = Math.floor(cols / 2);
  const visited = new Set<string>(['0,0']);
  const stack: MazePosition[] = [{ row: 0, col: 0 }];
  put(grid, 1, 1, 'path');
  while (stack.length > 0) {
    const current = stack[stack.length - 1] as MazePosition;
    const neighbors = shuffle(rng, DIRECTIONS)
      .map((d) => ({ row: current.row + d.row, col: current.col + d.col }))
      .filter((n) => n.row >= 0 && n.row < cellRows && n.col >= 0 && n.col < cellCols && !visited.has(posKey(n)));
    const next = neighbors[0];
    if (!next) {
      stack.pop();
      continue;
    }
    visited.add(posKey(next));
    put(grid, current.row * 2 + 1 + (next.row - current.row), current.col * 2 + 1 + (next.col - current.col), 'path');
    put(grid, next.row * 2 + 1, next.col * 2 + 1, 'path');
    stack.push(next);
  }
}

/** Opens walls between two path cells to create loops. */
function addExtraPassages(grid: Grid, rows: number, cols: number, count: number, rng: Rng): void {
  const candidates: MazePosition[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (at(grid, r, c) !== 'wall') continue;
      const horizontal = at(grid, r, c - 1) === 'path' && at(grid, r, c + 1) === 'path';
      const vertical = at(grid, r - 1, c) === 'path' && at(grid, r + 1, c) === 'path';
      if (horizontal || vertical) candidates.push({ row: r, col: c });
    }
  }
  for (const p of shuffle(rng, candidates).slice(0, count)) put(grid, p.row, p.col, 'path');
}

function findPathCell(grid: Grid, rows: number, cols: number, region: 'top-left' | 'bottom-right'): MazePosition {
  const halfR = Math.ceil(rows / 2);
  const halfC = Math.ceil(cols / 2);
  if (region === 'top-left') {
    for (let r = 1; r < halfR; r++) for (let c = 1; c < halfC; c++) if (at(grid, r, c) === 'path') return { row: r, col: c };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (at(grid, r, c) === 'path') return { row: r, col: c };
    return { row: 1, col: 1 };
  }
  for (let r = rows - 2; r >= halfR; r--) for (let c = cols - 2; c >= halfC; c--) if (at(grid, r, c) === 'path') return { row: r, col: c };
  for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) if (at(grid, r, c) === 'path') return { row: r, col: c };
  return { row: rows - 2, col: cols - 2 };
}

/** `generateEquation('medium')` of the web (all answers are integers). */
function equation(rng: Rng): MazeGate['equation'] {
  const operation = pick(rng, EQUATION_OPERATIONS);
  switch (operation) {
    case 'addition': {
      const a = randInt(rng, 1, EQUATION_MAX_OPERAND);
      const b = randInt(rng, 1, EQUATION_MAX_OPERAND);
      return { display: `${a} + ${b} = ?`, answer: a + b, operation };
    }
    case 'subtraction': {
      let a = randInt(rng, 1, EQUATION_MAX_OPERAND);
      let b = randInt(rng, 1, EQUATION_MAX_OPERAND);
      if (a < b) [a, b] = [b, a];
      return { display: `${a} − ${b} = ?`, answer: a - b, operation };
    }
    case 'multiplication': {
      const cap = Math.min(EQUATION_MAX_OPERAND, 12);
      const a = randInt(rng, 1, cap);
      const b = randInt(rng, 1, cap);
      return { display: `${a} × ${b} = ?`, answer: a * b, operation };
    }
    case 'division': {
      const cap = Math.min(EQUATION_MAX_OPERAND, 12);
      const answer = randInt(rng, 1, cap);
      const divisor = randInt(rng, 2, cap);
      return { display: `${answer * divisor} ÷ ${divisor} = ?`, answer, operation };
    }
  }
}

/** Gates on non-critical path cells, shortest-path cells first (same rules as the web). */
function placeGates(grid: Grid, start: MazePosition, exit: MazePosition, count: number, rng: Rng): MazeGate[] {
  const gates: MazeGate[] = [];
  const shortest = shortestPathCells(grid, start, exit);
  const on: MazePosition[] = [];
  const off: MazePosition[] = [];
  grid.forEach((row, r) =>
    row.forEach((c, col) => {
      if (c !== 'path') return;
      if (Math.abs(r - start.row) + Math.abs(col - start.col) <= 1) return;
      if (Math.abs(r - exit.row) + Math.abs(col - exit.col) <= 1) return;
      (shortest.has(posKey({ row: r, col })) ? on : off).push({ row: r, col });
    })
  );
  for (const pos of [...shuffle(rng, on), ...shuffle(rng, off)]) {
    if (gates.length >= count) break;
    put(grid, pos.row, pos.col, 'gate');
    const bypassable = mazeHasPath(grid, start, exit, new Set([posKey(pos)]));
    if (bypassable && countDistinctPaths(grid, start, exit) >= 2) {
      gates.push({ position: pos, equation: equation(rng) });
    } else {
      put(grid, pos.row, pos.col, 'path');
    }
  }
  return gates;
}

/** Collectibles off every shortest path. */
function placeCollectibles(grid: Grid, start: MazePosition, exit: MazePosition, count: number, rng: Rng): MazePosition[] {
  const shortest = shortestPathCells(grid, start, exit);
  const candidates: MazePosition[] = [];
  grid.forEach((row, r) =>
    row.forEach((c, col) => {
      if (c === 'path' && !shortest.has(posKey({ row: r, col }))) candidates.push({ row: r, col });
    })
  );
  const chosen = shuffle(rng, candidates).slice(0, count);
  for (const p of chosen) put(grid, p.row, p.col, 'collectible');
  return chosen;
}

function buildMaze(rows: number, cols: number, gateCount: number, collectibleCount: number, rng: Rng): MazeContent {
  const grid: Grid = Array.from({ length: rows }, () => Array.from({ length: cols }, (): MazeCell => 'wall'));
  carve(grid, rows, cols, rng);
  addExtraPassages(grid, rows, cols, MEDIUM_EXTRA_PASSAGES, rng);
  const start = findPathCell(grid, rows, cols, 'top-left');
  const exit = findPathCell(grid, rows, cols, 'bottom-right');
  put(grid, start.row, start.col, 'start');
  put(grid, exit.row, exit.col, 'exit');
  for (let attempts = 0; attempts < 20 && countDistinctPaths(grid, start, exit) < 2; attempts++) {
    addExtraPassages(grid, rows, cols, 2, rng);
  }
  const gates = placeGates(grid, start, exit, gateCount, rng);
  const collectibles = placeCollectibles(grid, start, exit, collectibleCount, rng);
  return { grid, start, exit, gates, collectibles, rows, cols };
}

export function generateMathMaze(entry: RotationEntry, rng: Rng): MathMazeContent {
  const size = num(entry.settings, 'size', 10);
  const gatesMin = num(entry.settings, 'gatesMin', 5);
  const gatesMax = num(entry.settings, 'gatesMax', 8);
  const collectiblesMin = num(entry.settings, 'collectiblesMin', 4);
  const collectiblesMax = num(entry.settings, 'collectiblesMax', 6);
  let maze: MazeContent | undefined;
  for (let attempt = 0; attempt < MAX_MAZE_ATTEMPTS; attempt++) {
    maze = buildMaze(size, size, randInt(rng, gatesMin, gatesMax), randInt(rng, collectiblesMin, collectiblesMax), rng);
    const ok =
      maze.gates.length >= gatesMin &&
      maze.gates.length <= gatesMax &&
      maze.collectibles.length >= collectiblesMin &&
      mazeHasPath(maze.grid, maze.start, maze.exit);
    if (ok) break;
  }
  return { kind: 'math-maze', maze: maze as MazeContent };
}

/** The web page reports one question per gate. */
export function mathMazeTotals(content: MathMazeContent): ChallengeTotals {
  return { totalQuestions: content.maze.gates.length };
}
