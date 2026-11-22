#!/usr/bin/env node
// Golden fixtures for the Dart Space Coder port (lib/game/space_coder/logic.dart): runs the
// real web TypeScript (apps/web/src/utils/scratchCodingUtils.ts) and records its outputs.
//
// Usage (from apps/mobile): <path-to>/apps/web/node_modules/.bin/tsx tools/export_space_coder_golden.mjs
// `tsx` is not installed in the worktree; the main checkout's apps/web has it.
// Output (committed): test/fixtures/space_coder_golden.json
//
// Random-driven web code runs with Math.random replaced by the LCG of
// test/helpers/lcg_random.dart, and command ids come from a counter (cmd-1, cmd-2, ...)
// like the Dart CommandIds, so the Dart tests can replay every case.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sc = await import(join(here, '..', '..', 'web', 'src', 'utils', 'scratchCodingUtils.ts'));

let idCounter = 0;
Object.defineProperty(globalThis.crypto, 'randomUUID', {
  value: () => `cmd-${++idCounter}`,
  configurable: true,
  writable: true,
});

function lcg(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
function withSeed(seed, fn) {
  const original = Math.random;
  Math.random = lcg(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

const CELL = { empty: '.', wall: '#', goal: 'G', obstacle: 'O' };
const gridText = (grid) => grid.map((row) => row.map((c) => CELL[c]).join(''));
const plainSteps = (steps) =>
  steps.map((s) => ({
    id: s.blockId,
    row: s.pos.row,
    col: s.pos.col,
    dir: s.dir,
    alive: s.alive,
    reachedGoal: s.reachedGoal,
    hitWall: s.hitWall,
    outOfBounds: s.outOfBounds,
    hitObstacle: s.hitObstacle ?? false,
    isJumpMidpoint: s.isJumpMidpoint ?? false,
    errorType: s.errorType ?? null,
    lineIndex: s.lineIndex ?? 0,
  }));

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------
const levels = {};
for (const d of ['easy', 'medium', 'hard']) {
  levels[d] = [];
  for (let n = 1; n <= sc.getTotalLevels(d); n++) {
    const l = sc.getLevel(d, n);
    levels[d].push({
      grid: gridText(l.grid),
      start: l.start,
      startDir: l.startDir,
      goal: l.goal,
      maxLines: l.maxLines,
      optimalLines: l.optimalLines,
      levelNumber: l.levelNumber,
      hint: l.hint,
      obstacleCount: l.generateObstacles ? l.obstacleCount : null,
    });
  }
}
const palette = Object.fromEntries(
  ['easy', 'medium', 'hard'].map((d) => [d, sc.getCommandsForDifficulty(d).map((c) => [c.type, c.textRepresentation])]),
);

// ---------------------------------------------------------------------------
// Obstacles
// ---------------------------------------------------------------------------
const obstacles = [];
for (const d of ['hard']) {
  for (let n = 1; n <= 5; n++) {
    const l = sc.getLevel(d, n);
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const grid = withSeed(seed, () => sc.generateObstacles(l.rows, l.cols, l.start, l.goal, l.obstacleCount));
      obstacles.push({ difficulty: d, level: n, seed, grid: gridText(grid) });
    }
  }
}

// ---------------------------------------------------------------------------
// Random programs and their runs
// ---------------------------------------------------------------------------
const SENSORS = ['obstacle-ahead', 'at-goal', 'not-at-goal', 'edge-ahead'];
function randomCondition(rnd) {
  if (rnd() < 0.8) return { type: 'sensor', sensor: SENSORS[Math.floor(rnd() * 4)] };
  const variable = rnd() < 0.6 ? 'var-num' : 'var-char';
  const operator = ['<', '>', '='][Math.floor(rnd() * 3)];
  const value = variable === 'var-num' ? Math.floor(rnd() * 9) - 3 : 'abcdz'[Math.floor(rnd() * 5)];
  return { type: 'comparison', variable, operator, value };
}
function randomProgram(rnd, depth, types) {
  const out = [];
  const n = 1 + Math.floor(rnd() * (depth === 0 ? 7 : 3));
  for (let i = 0; i < n; i++) {
    const type = types[Math.floor(rnd() * types.length)];
    const cmd = sc.createCommand(type);
    if (type === 'LOOP') cmd.parameter = 1 + Math.floor(rnd() * 6);
    if (type === 'IF' || type === 'WHILE') cmd.condition = randomCondition(rnd);
    if (type === 'VAR_NUM_DECL') cmd.varValue = Math.floor(rnd() * 7) - 2;
    if (type === 'VAR_CHAR_DECL') cmd.varValue = 'abcxyz'[Math.floor(rnd() * 6)];
    if (cmd.body && depth < 2) cmd.body = randomProgram(rnd, depth + 1, types);
    if (cmd.elseBody && depth < 2 && rnd() < 0.7) cmd.elseBody = randomProgram(rnd, depth + 1, types);
    out.push(cmd);
  }
  return out;
}
const runs = [];
const ALL = sc.COMMAND_DEFINITIONS.map((d) => d.type);
for (let seed = 1; seed <= 300; seed++) {
  idCounter = 0;
  const rnd = lcg(seed);
  const difficulty = ['easy', 'medium', 'hard'][seed % 3];
  const n = 1 + (seed % 5);
  const base = sc.getLevel(difficulty, n);
  const level = base.generateObstacles
    ? { ...base, grid: withSeed(seed, () => sc.generateObstacles(base.rows, base.cols, base.start, base.goal, base.obstacleCount)) }
    : base;
  // Bias towards movement so runs go somewhere.
  const types = [...ALL, 'VAR_NUM_DECL', 'FORWARD', 'FORWARD', 'FORWARD', 'FORWARD', 'FORWARD', 'FORWARD', 'TURN_LEFT', 'TURN_LEFT', 'TURN_RIGHT', 'TURN_RIGHT', 'WHILE', 'IF', 'LOOP', 'LOOP', 'JUMP'];
  const program = randomProgram(rnd, 0, types);
  runs.push({
    seed,
    difficulty,
    level: n,
    grid: gridText(level.grid),
    program: JSON.parse(JSON.stringify(program)),
    text: sc.programToText(program),
    lines: sc.countAllLines(program),
    steps: plainSteps(sc.executeProgramV2(level, program)),
  });
}

// Known solutions of the fixed levels.
const F = (id) => ({ id, type: 'FORWARD' });
const L = (id) => ({ id, type: 'TURN_LEFT' });
const R = (id) => ({ id, type: 'TURN_RIGHT' });
const solutions = [
  { difficulty: 'easy', level: 1, program: [F('a'), F('b'), F('c'), F('d'), F('e')] },
  { difficulty: 'easy', level: 2, program: [F('a'), F('b'), F('c'), R('d'), F('e'), F('f')] },
  {
    difficulty: 'medium', level: 1,
    program: [{ id: 'l', type: 'LOOP', parameter: 3, body: [F('a'), F('b'), R('c'), F('d'), F('e'), L('f')] }],
  },
  {
    difficulty: 'medium', level: 5,
    program: [{ id: 'l', type: 'LOOP', parameter: 6, body: [F('a'), R('b'), F('c'), L('d')] }],
  },
  {
    difficulty: 'medium', level: 4,
    program: [{ id: 'l', type: 'LOOP', parameter: 2, body: [F('a'), F('b'), F('c'), R('d'), F('e'), F('f'), F('g'), L('h')] }],
  },
];
for (const s of solutions) {
  const level = sc.getLevel(s.difficulty, s.level);
  runs.push({
    seed: 0,
    difficulty: s.difficulty,
    level: s.level,
    grid: gridText(level.grid),
    program: s.program,
    text: sc.programToText(s.program),
    lines: sc.countAllLines(s.program),
    steps: plainSteps(sc.executeProgramV2(level, s.program)),
  });
}

// ---------------------------------------------------------------------------
// Editing sequences: insertCommand / removeAtLine
// ---------------------------------------------------------------------------
const edits = [];
for (let seed = 1; seed <= 120; seed++) {
  idCounter = 0;
  const rnd = lcg(seed * 31 + 5);
  let program = [];
  let cursor = { parentId: null, branch: 'body', index: 0 };
  const ops = [];
  for (let k = 0; k < 18; k++) {
    const total = sc.countAllLines(program);
    if (total > 0 && rnd() < 0.25) {
      const line = Math.floor(rnd() * total);
      const res = sc.removeAtLine(program, line);
      program = res.program;
      cursor = res.cursor;
      ops.push({ op: 'remove', line, text: sc.programToText(program), cursor });
    } else {
      const type = ALL[Math.floor(rnd() * ALL.length)];
      const res = sc.insertCommand(program, type, cursor);
      program = res.program;
      cursor = res.cursor;
      ops.push({ op: 'insert', type, text: sc.programToText(program), cursor });
    }
  }
  edits.push({ seed, ops });
}

// ---------------------------------------------------------------------------
// Efficiency
// ---------------------------------------------------------------------------
const efficiency = [
  [],
  [{ optimalLines: 5, actualLines: 5 }],
  [{ optimalLines: 5, actualLines: 9 }],
  [{ optimalLines: 5, actualLines: 4 }],
  [{ optimalLines: 5, actualLines: 7 }, { optimalLines: 8, actualLines: 8 }, { optimalLines: 12, actualLines: 20 }],
  [{ optimalLines: 3, actualLines: 0 }],
].map((results) => ({ results, expected: sc.computeLineEfficiency(results) }));

const out = { levels, palette, obstacles, runs, edits, efficiency };
mkdirSync(join(here, '..', 'test', 'fixtures'), { recursive: true });
writeFileSync(join(here, '..', 'test', 'fixtures', 'space_coder_golden.json'), JSON.stringify(out));
const reached = runs.filter((r) => r.steps.length && r.steps[r.steps.length - 1].reachedGoal).length;
const errors = {};
for (const r of runs) {
  const e = r.steps.length ? r.steps[r.steps.length - 1].errorType : 'empty';
  errors[e ?? 'none'] = (errors[e ?? 'none'] ?? 0) + 1;
}
console.log(`runs ${runs.length} (reached ${reached})`, errors, `edits ${edits.length}, obstacles ${obstacles.length}`);
