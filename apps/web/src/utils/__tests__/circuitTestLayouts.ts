// Shared fixtures for the Circuit Builder web tests. Not a test file (no `.test.`), so vitest does
// not collect it. Built only from the circuitEngine re-exports.

import {
  connectTerminals,
  createElement,
  createLayout,
  evaluate,
  getLevel,
  isEvaluationError,
} from '../circuitEngine'
import type {
  CircuitLayout,
  CircuitResult,
  ElementKind,
  Environment,
  GridSize,
  LevelDefinition,
  SwitchStates,
} from '../circuitEngine'

export const TEST_GRID: GridSize = { cols: 12, rows: 8 }

export interface Recipe {
  /** Player-placed elements: [id, kind]. Pre-placed ones come from the level. */
  placed: ReadonlyArray<readonly [string, ElementKind]>
  conns: ReadonlyArray<readonly [string, string]>
  switches: SwitchStates
}

export function mustLevel(id: string): LevelDefinition {
  const found = getLevel(id)
  if (found === undefined) {
    throw new Error(`missing level ${id}`)
  }
  return found
}

export function envAt(sourceVoltage = 9, lightLevel = 1): Environment {
  return { sourceVoltage, lightLevel }
}

export function layoutFromRecipe(
  recipe: Recipe,
  grid: GridSize,
  prePlaced: LevelDefinition['prePlaced'] = []
): CircuitLayout {
  const placed = recipe.placed.map(([id, kind], index) =>
    createElement(kind, {
      id,
      position: { col: index % grid.cols, row: 0, rotation: 0 },
    })
  )
  return createLayout(
    [...prePlaced, ...placed],
    recipe.conns.map(([from, to]) => connectTerminals(from, to)),
    grid
  )
}

export function solveLayout(
  layout: CircuitLayout,
  switches: SwitchStates,
  env: Environment = envAt()
): CircuitResult {
  const outcome = evaluate(layout, switches, env)
  if (isEvaluationError(outcome)) {
    throw new Error(`evaluation failed: ${outcome.errorCode}`)
  }
  return outcome
}

export function solveRecipe(
  level: LevelDefinition,
  recipe: Recipe,
  env: Environment = envAt()
): { layout: CircuitLayout; result: CircuitResult } {
  const layout = layoutFromRecipe(recipe, level.gridSize, level.prePlaced)
  return { layout, result: solveLayout(layout, recipe.switches, env) }
}

// ---------------------------------------------------------------------------
// Hand-built layouts
// ---------------------------------------------------------------------------

export const SERIES: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'resistor'],
    ['e3', 'led'],
  ],
  conns: [
    ['e1:0', 'e2:0'],
    ['e2:1', 'e3:0'],
    ['e3:1', 'e1:1'],
  ],
  switches: {},
}

export const PARALLEL: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'motor'],
    ['e3', 'buzzer'],
  ],
  conns: [
    ['e1:0', 'e2:0'],
    ['e1:0', 'e3:0'],
    ['e2:1', 'e1:1'],
    ['e3:1', 'e1:1'],
  ],
  switches: {},
}

export const MIXED: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'motor'],
    ['e3', 'resistor'],
    ['e4', 'led'],
    ['e5', 'buzzer'],
  ],
  conns: [
    ['e1:0', 'e2:0'],
    ['e1:0', 'e3:0'],
    ['e1:0', 'e5:0'],
    ['e3:1', 'e4:0'],
    ['e2:1', 'e1:1'],
    ['e4:1', 'e1:1'],
    ['e5:1', 'e1:1'],
  ],
  switches: {},
}

/** LED wired backwards. */
export const REVERSED_LED: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'resistor'],
    ['e3', 'led'],
  ],
  conns: [
    ['e1:0', 'e2:0'],
    ['e2:1', 'e3:1'],
    ['e3:0', 'e1:1'],
  ],
  switches: {},
}

/** Whole circuit wired from the negative terminal: every load sees reverse polarity. */
export const REVERSED_SUPPLY: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'resistor'],
    ['e3', 'led'],
  ],
  conns: [
    ['e1:1', 'e2:0'],
    ['e2:1', 'e3:0'],
    ['e3:1', 'e1:0'],
  ],
  switches: {},
}

/** A wire straight across the battery. */
export const SHORTED: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'wire'],
  ],
  conns: [
    ['e1:0', 'e2:0'],
    ['e2:1', 'e1:1'],
  ],
  switches: {},
}

/** Two batteries wired in parallel with each other through nothing else. */
export const BATTERY_FIGHT: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'battery'],
  ],
  conns: [
    ['e1:0', 'e2:0'],
    ['e1:1', 'e2:1'],
  ],
  switches: {},
}

/** Series loop with a switch that is open. */
export const OPEN_SWITCH: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'switch'],
    ['e3', 'resistor'],
    ['e4', 'led'],
  ],
  conns: [
    ['e1:0', 'e2:0'],
    ['e2:1', 'e3:0'],
    ['e3:1', 'e4:0'],
    ['e4:1', 'e1:1'],
  ],
  switches: { e2: 'open' },
}

/** A source and nothing else. */
export const LONE_BATTERY: Recipe = {
  placed: [['e1', 'battery']],
  conns: [],
  switches: {},
}

export const EMPTY: Recipe = { placed: [], conns: [], switches: {} }

// ---------------------------------------------------------------------------
// Reference solutions of the guided levels (mirror of the packages/shared fixtures)
// ---------------------------------------------------------------------------

export const REFERENCE: Readonly<Record<string, Recipe>> = {
  'cb-01-closed-circuit': SERIES,
  'cb-02-switch-control': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
    ],
    conns: [
      ['e1:0', 'pre-switch:0'],
      ['pre-switch:1', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e1:1'],
    ],
    switches: { 'pre-switch': 'closed' },
  },
  'cb-03-series-loop': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
      ['e4', 'buzzer'],
    ],
    conns: [
      ['e1:0', 'pre-switch:0'],
      ['pre-switch:1', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e4:0'],
      ['e4:1', 'e1:1'],
    ],
    switches: { 'pre-switch': 'closed' },
  },
  'cb-04-parallel-branches': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
      ['e4', 'buzzer'],
    ],
    conns: [
      ['e1:0', 'pre-switch-led:0'],
      ['pre-switch-led:1', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e1:1'],
      ['e1:0', 'pre-switch-buzzer:0'],
      ['pre-switch-buzzer:1', 'e4:0'],
      ['e4:1', 'e1:1'],
    ],
    switches: { 'pre-switch-led': 'closed', 'pre-switch-buzzer': 'closed' },
  },
  'cb-05-series-vs-parallel': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'motor'],
      ['e3', 'motor'],
      ['e4', 'resistor'],
      ['e5', 'led'],
      ['e6', 'buzzer'],
    ],
    conns: [
      ['e1:0', 'e2:0'],
      ['e1:0', 'e3:0'],
      ['e1:0', 'e4:0'],
      ['e1:0', 'e6:0'],
      ['e4:1', 'e5:0'],
      ['e2:1', 'e1:1'],
      ['e3:1', 'e1:1'],
      ['e5:1', 'e1:1'],
      ['e6:1', 'e1:1'],
    ],
    switches: {},
  },
  'cb-06-short-circuit-recovery': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
      ['e4', 'wire'],
    ],
    conns: [
      ['e1:0', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e4:0'],
      ['e4:1', 'e1:1'],
    ],
    switches: {},
  },
  'cb-07-resistance-limits-current': {
    placed: [['e1', 'resistor']],
    conns: [
      ['pre-battery:0', 'e1:0'],
      ['e1:1', 'pre-led:0'],
      ['pre-led:1', 'pre-battery:1'],
    ],
    switches: {},
  },
  'cb-08-variable-voltage': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'motor'],
      ['e3', 'buzzer'],
      ['e4', 'resistor'],
      ['e5', 'led'],
    ],
    conns: [
      ['e1:0', 'pre-switch-master:0'],
      ['pre-switch-master:1', 'e2:0'],
      ['pre-switch-master:1', 'e3:0'],
      ['pre-switch-master:1', 'pre-switch-headlight:0'],
      ['pre-switch-headlight:1', 'e4:0'],
      ['e4:1', 'e5:0'],
      ['e2:1', 'e1:1'],
      ['e3:1', 'e1:1'],
      ['e5:1', 'e1:1'],
    ],
    switches: { 'pre-switch-master': 'closed', 'pre-switch-headlight': 'closed' },
  },
}
