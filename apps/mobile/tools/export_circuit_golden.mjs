#!/usr/bin/env node
// Golden fixtures for the Dart circuit engine: runs the real shared TypeScript evaluator
// (packages/shared/src/circuit) over every level, the reference solution of every guided
// level with mutations of it, and seeded random layouts, and records the outputs. The Dart
// tests (test/game/circuit_golden_test.dart) must reproduce them.
//
// Usage (from apps/mobile): <path-to>/apps/web/node_modules/.bin/tsx tools/export_circuit_golden.mjs
// `tsx` is not installed in the worktree; the main checkout's apps/web has it.
// Output (committed): test/fixtures/circuit_golden.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shared = await import(join(here, '..', '..', '..', 'packages', 'shared', 'src', 'circuit', 'index.ts'));
const {
  evaluate, evaluateSuccess, evaluateRoleActivation, getMachine, listLevels, createElement,
  connectTerminals, isEvaluationError, clampFaultCount, MARS_ROVER,
} = shared;

/** LCG shared with test/helpers/lcg_random.dart. */
function lcg(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Reference solutions (the recipes of packages/shared guided-levels.test.ts)
// ---------------------------------------------------------------------------
const REFERENCE = {
  'cb-01-closed-circuit': {
    placed: [['e1', 'battery'], ['e2', 'resistor'], ['e3', 'led']],
    conns: [['e1:0', 'e2:0'], ['e2:1', 'e3:0'], ['e3:1', 'e1:1']],
    switches: {},
  },
  'cb-02-switch-control': {
    placed: [['e1', 'battery'], ['e2', 'resistor'], ['e3', 'led']],
    conns: [['e1:0', 'pre-switch:0'], ['pre-switch:1', 'e2:0'], ['e2:1', 'e3:0'], ['e3:1', 'e1:1']],
    switches: { 'pre-switch': 'closed' },
  },
  'cb-03-series-loop': {
    placed: [['e1', 'battery'], ['e2', 'resistor'], ['e3', 'led'], ['e4', 'buzzer']],
    conns: [['e1:0', 'pre-switch:0'], ['pre-switch:1', 'e2:0'], ['e2:1', 'e3:0'], ['e3:1', 'e4:0'], ['e4:1', 'e1:1']],
    switches: { 'pre-switch': 'closed' },
  },
  'cb-04-parallel-branches': {
    placed: [['e1', 'battery'], ['e2', 'resistor'], ['e3', 'led'], ['e4', 'buzzer']],
    conns: [
      ['e1:0', 'pre-switch-led:0'], ['pre-switch-led:1', 'e2:0'], ['e2:1', 'e3:0'], ['e3:1', 'e1:1'],
      ['e1:0', 'pre-switch-buzzer:0'], ['pre-switch-buzzer:1', 'e4:0'], ['e4:1', 'e1:1'],
    ],
    switches: { 'pre-switch-led': 'closed', 'pre-switch-buzzer': 'closed' },
  },
  'cb-05-series-vs-parallel': {
    placed: [['e1', 'battery'], ['e2', 'motor'], ['e3', 'motor'], ['e4', 'resistor'], ['e5', 'led'], ['e6', 'buzzer']],
    conns: [
      ['e1:0', 'e2:0'], ['e1:0', 'e3:0'], ['e1:0', 'e4:0'], ['e1:0', 'e6:0'], ['e4:1', 'e5:0'],
      ['e2:1', 'e1:1'], ['e3:1', 'e1:1'], ['e5:1', 'e1:1'], ['e6:1', 'e1:1'],
    ],
    switches: {},
  },
  'cb-06-short-circuit-recovery': {
    placed: [['e1', 'battery'], ['e2', 'resistor'], ['e3', 'led'], ['e4', 'wire']],
    conns: [['e1:0', 'e2:0'], ['e2:1', 'e3:0'], ['e3:1', 'e4:0'], ['e4:1', 'e1:1']],
    switches: {},
  },
  'cb-07-resistance-limits-current': {
    placed: [['e1', 'resistor']],
    conns: [['pre-battery:0', 'e1:0'], ['e1:1', 'pre-led:0'], ['pre-led:1', 'pre-battery:1']],
    switches: {},
  },
  'cb-08-variable-voltage': {
    placed: [['e1', 'battery'], ['e2', 'motor'], ['e3', 'buzzer'], ['e4', 'resistor'], ['e5', 'led']],
    conns: [
      ['e1:0', 'pre-switch-master:0'], ['pre-switch-master:1', 'e2:0'], ['pre-switch-master:1', 'e3:0'],
      ['pre-switch-master:1', 'pre-switch-headlight:0'], ['pre-switch-headlight:1', 'e4:0'],
      ['e4:1', 'e5:0'], ['e2:1', 'e1:1'], ['e3:1', 'e1:1'], ['e5:1', 'e1:1'],
    ],
    switches: { 'pre-switch-master': 'closed', 'pre-switch-headlight': 'closed' },
  },
};

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function layoutOf(level, recipe) {
  const placed = recipe.placed.map(([id, kind], index) =>
    createElement(kind, { id, position: { col: index % level.gridSize.cols, row: 0, rotation: 0 } }),
  );
  return {
    elements: [...level.prePlaced, ...placed],
    connections: recipe.conns.map(([from, to]) => connectTerminals(from, to)),
    gridSize: level.gridSize,
  };
}

function outcomeOf(layout, switches, env, levelId) {
  const out = evaluate(layout, switches, env);
  const expected = isEvaluationError(out) ? { errorCode: out.errorCode } : plain(out);
  const entry = { layout: plain(layout), switches, env, expected };
  if (levelId && !isEvaluationError(out)) {
    const level = listLevels().find((l) => l.id === levelId);
    const success = evaluateSuccess(level, out);
    entry.levelId = levelId;
    entry.success = { satisfied: success.satisfied, unmetClauses: [...success.unmetClauses] };
    entry.roles = evaluateRoleActivation(getMachine(level.targetMachineId), out);
  }
  return entry;
}

const cases = [];
const levels = listLevels();

for (const level of levels) {
  // Pre-placed elements alone.
  const base = { elements: [...level.prePlaced], connections: [], gridSize: level.gridSize };
  const sw = Object.fromEntries(level.prePlaced.filter((e) => e.kind === 'switch').map((e) => [e.id, 'closed']));
  cases.push({ name: `${level.id}: pre-placed only`, ...outcomeOf(base, sw, { sourceVoltage: 9, lightLevel: 1 }, level.id) });
}

for (const [levelId, recipe] of Object.entries(REFERENCE)) {
  const level = levels.find((l) => l.id === levelId);
  const layout = layoutOf(level, recipe);
  // Reference solution across the whole voltage range.
  for (let v = 1.5; v <= 12; v += 0.5) {
    cases.push({ name: `${levelId}: reference at ${v} V`, ...outcomeOf(layout, recipe.switches, { sourceVoltage: v, lightLevel: 1 }, levelId) });
  }
  // Every switch open, then each switch alone open.
  const switchIds = Object.keys(recipe.switches);
  for (const id of switchIds) {
    cases.push({
      name: `${levelId}: ${id} open`,
      ...outcomeOf(layout, { ...recipe.switches, [id]: 'open' }, { sourceVoltage: 9, lightLevel: 1 }, levelId),
    });
  }
  // Drop each connection in turn.
  recipe.conns.forEach((_, i) => {
    const trimmed = { ...layout, connections: layout.connections.filter((__, j) => j !== i) };
    cases.push({ name: `${levelId}: without connection ${i}`, ...outcomeOf(trimmed, recipe.switches, { sourceVoltage: 9, lightLevel: 1 }, levelId) });
  });
  // Flip each LED (swap the endpoints of its connections).
  for (const el of layout.elements.filter((e) => e.kind === 'led')) {
    const [a, b] = el.terminals;
    const swap = (n) => (n === a ? b : n === b ? a : n);
    const flipped = { ...layout, connections: layout.connections.map((c) => ({ ...c, from: swap(c.from), to: swap(c.to) })) };
    cases.push({ name: `${levelId}: ${el.id} flipped`, ...outcomeOf(flipped, recipe.switches, { sourceVoltage: 9, lightLevel: 1 }, levelId) });
  }
  // A wire across the battery.
  const battery = layout.elements.find((e) => e.kind === 'battery');
  if (battery) {
    const wire = createElement('wire', { id: 'ex-wire', position: { col: 1, row: 1, rotation: 0 } });
    const shorted = {
      ...layout,
      elements: [...layout.elements, wire],
      connections: [
        ...layout.connections,
        connectTerminals('ex-wire:0', battery.terminals[0]),
        connectTerminals('ex-wire:1', battery.terminals[1]),
      ],
    };
    cases.push({ name: `${levelId}: wire across battery`, ...outcomeOf(shorted, recipe.switches, { sourceVoltage: 9, lightLevel: 1 }, levelId) });
  }
}

// ---------------------------------------------------------------------------
// Seeded random layouts
// ---------------------------------------------------------------------------
const KINDS = ['battery', 'solar', 'wire', 'switch', 'resistor', 'led', 'motor', 'buzzer'];
function randomCase(seed) {
  const rnd = lcg(seed);
  const pick = (n) => Math.floor(rnd() * n);
  const n = 2 + pick(8);
  const elements = [];
  for (let i = 0; i < n; i++) {
    const kind = KINDS[pick(KINDS.length)];
    const params = {};
    if (kind === 'resistor' && rnd() < 0.7) params.resistance = rnd() < 0.5 ? 1 + pick(10000) : 1 + rnd() * 9999;
    if ((kind === 'battery' || kind === 'solar') && rnd() < 0.25) params.internalResistance = rnd() < 0.5 ? 0 : rnd() * 20;
    elements.push(createElement(kind, {
      id: `r${i}`,
      position: { col: pick(8), row: pick(6), rotation: [0, 90, 180, 270][pick(4)] },
      ...(Object.keys(params).length ? { params } : {}),
    }));
  }
  const terminals = elements.flatMap((e) => e.terminals);
  const connections = [];
  const connCount = n + pick(n + 1);
  for (let i = 0; i < connCount; i++) {
    const a = terminals[pick(terminals.length)];
    const b = terminals[pick(terminals.length)];
    if (a !== b) connections.push(connectTerminals(a, b, `k${i}`));
  }
  const switches = {};
  for (const e of elements) if (e.kind === 'switch' && rnd() < 0.85) switches[e.id] = rnd() < 0.7 ? 'closed' : 'open';
  const env = { sourceVoltage: 1.5 + pick(22) * 0.5, lightLevel: [0, 0.25, 0.5, 0.8, 1][pick(5)] };
  return { name: `random ${seed}`, ...outcomeOf({ elements, connections, gridSize: { cols: 8, rows: 6 } }, switches, env) };
}
for (let seed = 1; seed <= 400; seed++) cases.push(randomCase(seed));

// ---------------------------------------------------------------------------
// Structural error cases
// ---------------------------------------------------------------------------
const ok = { sourceVoltage: 9, lightLevel: 1 };
const el = (id, kind, col = 0, row = 0, extra = {}) => createElement(kind, { id, position: { col, row, rotation: 0 }, ...extra });
const grid = { cols: 8, rows: 6 };
const errorCases = [
  ['duplicate element id', { elements: [el('a', 'led'), el('a', 'resistor')], connections: [], gridSize: grid }, {}, ok],
  ['duplicate connection id', { elements: [el('a', 'led'), el('b', 'resistor')], connections: [connectTerminals('a:0', 'b:0', 'x'), connectTerminals('a:1', 'b:1', 'x')], gridSize: grid }, {}, ok],
  ['unresolved terminal', { elements: [el('a', 'led')], connections: [connectTerminals('a:0', 'zzz:0')], gridSize: grid }, {}, ok],
  ['self connection', { elements: [el('a', 'led')], connections: [connectTerminals('a:0', 'a:0', 's')], gridSize: grid }, {}, ok],
  ['position out of bounds', { elements: [el('a', 'led', 9, 0)], connections: [], gridSize: grid }, {}, ok],
  ['grid too small', { elements: [], connections: [], gridSize: { cols: 1, rows: 6 } }, {}, ok],
  ['grid too large', { elements: [], connections: [], gridSize: { cols: 25, rows: 6 } }, {}, ok],
  ['bad rotation', { elements: [{ ...el('a', 'led'), position: { col: 0, row: 0, rotation: 45 } }], connections: [], gridSize: grid }, {}, ok],
  ['resistor out of range', { elements: [el('a', 'resistor', 0, 0, { params: { resistance: 20000 } })], connections: [], gridSize: grid }, {}, ok],
  ['resistor below range', { elements: [el('a', 'resistor', 0, 0, { params: { resistance: 0.5 } })], connections: [], gridSize: grid }, {}, ok],
  ['voltage too low', { elements: [], connections: [], gridSize: grid }, {}, { sourceVoltage: 1, lightLevel: 1 }],
  ['voltage too high', { elements: [], connections: [], gridSize: grid }, {}, { sourceVoltage: 13, lightLevel: 1 }],
  ['light too high', { elements: [], connections: [], gridSize: grid }, {}, { sourceVoltage: 9, lightLevel: 1.5 }],
  ['switch entry for a non switch', { elements: [el('a', 'led')], connections: [], gridSize: grid }, { a: 'closed' }, ok],
  ['switch entry for nothing', { elements: [], connections: [], gridSize: grid }, { ghost: 'open' }, ok],
  ['65 elements', { elements: Array.from({ length: 65 }, (_, i) => el(`m${i}`, 'wire', i % 8, 0)), connections: [], gridSize: grid }, {}, ok],
  ['129 connections', { elements: [el('a', 'led'), el('b', 'led')], connections: Array.from({ length: 129 }, (_, i) => connectTerminals('a:0', 'b:0', `q${i}`)), gridSize: grid }, {}, ok],
  ['long id', { elements: [el('x'.repeat(65), 'led')], connections: [], gridSize: grid }, {}, ok],
  ['empty layout', { elements: [], connections: [], gridSize: grid }, {}, ok],
];
for (const [name, layout, switches, env] of errorCases) {
  cases.push({ name: `error: ${name}`, ...outcomeOf(layout, switches, env) });
}

// ---------------------------------------------------------------------------
// Level data, machine and clamp
// ---------------------------------------------------------------------------
const levelData = levels.map((l) => plain(l));
const clamps = [];
for (const level of levels) {
  for (const reported of [0, 1, 5, 20, 21, 100, -1]) {
    clamps.push({ levelId: level.id, reported, expected: clampFaultCount(reported, level) });
  }
}

const out = { levels: levelData, machine: plain(MARS_ROVER), clamps, cases };
mkdirSync(join(here, '..', 'test', 'fixtures'), { recursive: true });
writeFileSync(join(here, '..', 'test', 'fixtures', 'circuit_golden.json'), JSON.stringify(out));
const errors = cases.filter((c) => c.expected.errorCode).length;
console.log(`wrote ${cases.length} cases (${errors} structural errors), ${levelData.length} levels`);
