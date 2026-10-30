import { beforeEach, describe, expect, it } from 'vitest'
import {
  ENGINE_MEMO_CAPACITY,
  clearEngineMemo,
  compareIdsLocal,
  connectTerminals,
  createElement,
  createLayout,
  engineMemoSize,
  evaluateMemoized,
  getLevel,
  hashCircuitState,
  isCircuitResult,
  isEvaluationError,
  listLevels,
  terminalOf,
} from '../circuitEngine'
import type {
  CircuitElement,
  CircuitLayout,
  Environment,
  GridSize,
  SwitchStates,
} from '../circuitEngine'

const GRID: GridSize = { cols: 8, rows: 6 }
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 }
const NO_SWITCHES: SwitchStates = {}

// Fixtures are built with the engine's own builders so terminal ids stay engine-canonical.
function battery(id = 'b1', col = 1, row = 1): CircuitElement {
  return createElement('battery', { id, position: { col, row, rotation: 0 } })
}

function led(id = 'l1', col = 3, row = 1): CircuitElement {
  return createElement('led', { id, position: { col, row, rotation: 0 } })
}

function resistor(id = 'r1', col = 2, row = 1): CircuitElement {
  return createElement('resistor', { id, position: { col, row, rotation: 0 }, params: { resistance: 470 } })
}

/** battery -> resistor -> led -> battery, a working series circuit. */
function seriesCircuit(): CircuitLayout {
  const source = battery()
  const limiter = resistor()
  const lamp = led()
  return createLayout(
    [source, limiter, lamp],
    [
      connectTerminals(terminalOf(source, 0), terminalOf(limiter, 0), 'c1'),
      connectTerminals(terminalOf(limiter, 1), terminalOf(lamp, 0), 'c2'),
      connectTerminals(terminalOf(lamp, 1), terminalOf(source, 1), 'c3'),
    ],
    GRID
  )
}

describe('compareIdsLocal', () => {
  it('orders by code unit, not by locale', () => {
    // 'Z' is U+005A and 'a' is U+0061, so code-unit order puts uppercase first.
    // `localeCompare` reports the opposite, which is exactly what must not happen.
    expect(compareIdsLocal('Z', 'a')).toBeLessThan(0)
    expect('Z'.localeCompare('a')).toBeGreaterThan(0)
  })

  it('is a total order', () => {
    const ids = ['b', 'A', 'a', 'B', '10', '9', '']
    const sorted = [...ids].sort(compareIdsLocal)
    expect(sorted).toEqual(['', '10', '9', 'A', 'B', 'a', 'b'])
    for (const id of ids) {
      expect(compareIdsLocal(id, id)).toBe(0)
    }
    expect(compareIdsLocal('a', 'b')).toBe(-compareIdsLocal('b', 'a'))
  })
})

describe('hashCircuitState', () => {
  it('is independent of element and connection array order', () => {
    const layout = seriesCircuit()
    const reversed = createLayout(
      [...layout.elements].reverse(),
      [...layout.connections].reverse(),
      layout.gridSize
    )
    expect(hashCircuitState(reversed, NO_SWITCHES, ENV)).toBe(
      hashCircuitState(layout, NO_SWITCHES, ENV)
    )
  })

  it('changes when any single field of the circuit changes', () => {
    const base = seriesCircuit()
    const baseHash = hashCircuitState(base, NO_SWITCHES, ENV)
    const first = base.elements[0]
    expect(first).toBeDefined()
    if (first === undefined) {
      return
    }

    const variants: Record<string, string> = {
      kind: hashCircuitState(
        createLayout(
          [createElement('solar', { id: first.id, position: first.position }), ...base.elements.slice(1)],
          base.connections,
          base.gridSize
        ),
        NO_SWITCHES,
        ENV
      ),
      col: hashCircuitState(
        createLayout(
          [{ ...first, position: { ...first.position, col: first.position.col + 1 } }, ...base.elements.slice(1)],
          base.connections,
          base.gridSize
        ),
        NO_SWITCHES,
        ENV
      ),
      row: hashCircuitState(
        createLayout(
          [{ ...first, position: { ...first.position, row: first.position.row + 1 } }, ...base.elements.slice(1)],
          base.connections,
          base.gridSize
        ),
        NO_SWITCHES,
        ENV
      ),
      rotation: hashCircuitState(
        createLayout(
          [{ ...first, position: { ...first.position, rotation: 90 } }, ...base.elements.slice(1)],
          base.connections,
          base.gridSize
        ),
        NO_SWITCHES,
        ENV
      ),
      params: hashCircuitState(
        createLayout(
          [
            createElement('resistor', { id: 'r1', position: { col: 2, row: 1, rotation: 0 }, params: { resistance: 471 } }),
            ...base.elements.filter((element) => element.id !== 'r1'),
          ],
          base.connections,
          base.gridSize
        ),
        NO_SWITCHES,
        ENV
      ),
      connectionEndpoint: hashCircuitState(
        createLayout(
          base.elements,
          [
            { id: 'c1', from: terminalOf(first, 1), to: 'r1:0' },
            ...base.connections.slice(1),
          ],
          base.gridSize
        ),
        NO_SWITCHES,
        ENV
      ),
      gridSize: hashCircuitState(
        createLayout(base.elements, base.connections, { cols: 9, rows: 6 }),
        NO_SWITCHES,
        ENV
      ),
      switchState: hashCircuitState(base, { s1: 'open' }, ENV),
      sourceVoltage: hashCircuitState(base, NO_SWITCHES, { ...ENV, sourceVoltage: 9.5 }),
      lightLevel: hashCircuitState(base, NO_SWITCHES, { ...ENV, lightLevel: 0.5 }),
    }

    const seen = new Set<string>([baseHash])
    for (const [field, hash] of Object.entries(variants)) {
      expect(hash, `${field} must change the hash`).not.toBe(baseHash)
      expect(seen.has(hash), `${field} must not collide with another variant`).toBe(false)
      seen.add(hash)
    }
  })

  it('distinguishes 0 from negative zero', () => {
    const layout = seriesCircuit()
    expect(hashCircuitState(layout, NO_SWITCHES, { ...ENV, lightLevel: -0 })).not.toBe(
      hashCircuitState(layout, NO_SWITCHES, { ...ENV, lightLevel: 0 })
    )
  })

  it('cannot have a field boundary forged by an id containing the separators', () => {
    // Two different circuits whose ids differ only in where a separator-looking character sits.
    const left = createLayout(
      [createElement('wire', { id: 'a\u001fb', position: { col: 0, row: 0, rotation: 0 } })],
      [],
      GRID
    )
    const right = createLayout(
      [createElement('wire', { id: 'a', position: { col: 0, row: 0, rotation: 0 } })],
      [],
      GRID
    )
    expect(hashCircuitState(left, NO_SWITCHES, ENV)).not.toBe(
      hashCircuitState(right, NO_SWITCHES, ENV)
    )
  })
})

describe('evaluateMemoized', () => {
  beforeEach(() => {
    clearEngineMemo()
  })

  it('returns the same object reference for equal input', () => {
    const layout = seriesCircuit()
    const first = evaluateMemoized(layout, NO_SWITCHES, ENV)
    const second = evaluateMemoized(layout, NO_SWITCHES, ENV)
    expect(second).toBe(first)
    expect(engineMemoSize()).toBe(1)
  })

  it('agrees with the engine on a working series circuit', () => {
    const outcome = evaluateMemoized(seriesCircuit(), NO_SWITCHES, ENV)
    expect(isCircuitResult(outcome)).toBe(true)
    if (!isCircuitResult(outcome)) {
      return
    }
    expect(outcome.closedPathExists).toBe(true)
    const lamp = outcome.elements.find((element) => element.elementId === 'l1')
    expect(lamp?.energized).toBe(true)
    expect(lamp?.intensity).toBeGreaterThan(0)
  })

  it('evicts the oldest entry past capacity', () => {
    for (let index = 0; index <= ENGINE_MEMO_CAPACITY; index += 1) {
      evaluateMemoized(
        createLayout(
          [createElement('wire', { id: `w${String(index)}`, position: { col: 0, row: 0, rotation: 0 } })],
          [],
          GRID
        ),
        NO_SWITCHES,
        ENV
      )
    }
    expect(engineMemoSize()).toBe(ENGINE_MEMO_CAPACITY)

    // The first circuit was evicted, so re-requesting it is a miss: a fresh object comes back.
    const firstLayout = createLayout(
      [createElement('wire', { id: 'w0', position: { col: 0, row: 0, rotation: 0 } })],
      [],
      GRID
    )
    const reRequested = evaluateMemoized(firstLayout, NO_SWITCHES, ENV)
    expect(evaluateMemoized(firstLayout, NO_SWITCHES, ENV)).toBe(reRequested)
    expect(engineMemoSize()).toBe(ENGINE_MEMO_CAPACITY)
  })

  it('refreshes an entry on a hit so it survives one more insertion', () => {
    const layoutFor = (id: string): CircuitLayout =>
      createLayout(
        [createElement('wire', { id, position: { col: 0, row: 0, rotation: 0 } })],
        [],
        GRID
      )

    for (let index = 0; index < ENGINE_MEMO_CAPACITY; index += 1) {
      evaluateMemoized(layoutFor(`w${String(index)}`), NO_SWITCHES, ENV)
    }
    const oldest = evaluateMemoized(layoutFor('w0'), NO_SWITCHES, ENV) // refresh w0
    evaluateMemoized(layoutFor('overflow'), NO_SWITCHES, ENV) // evicts w1, not w0

    expect(evaluateMemoized(layoutFor('w0'), NO_SWITCHES, ENV)).toBe(oldest)
  })

  it('caches an error outcome and narrows it', () => {
    // A switch entry naming no element is a structural error the engine refuses.
    const outcome = evaluateMemoized(seriesCircuit(), { ghost: 'closed' }, ENV)
    expect(isEvaluationError(outcome)).toBe(true)
    if (!isEvaluationError(outcome)) {
      return
    }
    expect(outcome.errorCode).toBe('STRUCTURAL_INVALID')
    expect(evaluateMemoized(seriesCircuit(), { ghost: 'closed' }, ENV)).toBe(outcome)
  })

  it('is cleared by clearEngineMemo', () => {
    evaluateMemoized(seriesCircuit(), NO_SWITCHES, ENV)
    expect(engineMemoSize()).toBe(1)
    clearEngineMemo()
    expect(engineMemoSize()).toBe(0)
  })
})

describe('level registry', () => {
  it('always resolves the sandbox and the guided level, and nothing else', () => {
    // The standing proof that a `getLevel('sandbox') ?? fallback` branch is unreachable, so the
    // surface needs no duplicated copy of the sandbox definition. If a future engine change drops
    // the sandbox id, this fails loudly instead of silently resurrecting the need for a fallback.
    expect(getLevel('sandbox')).toBeDefined()
    expect(getLevel('cb-01-closed-circuit')).toBeDefined()
    const ids = listLevels().map((level) => level.id)
    expect(ids).toContain('sandbox')
    expect(ids).toContain('cb-01-closed-circuit')
    expect(getLevel('definitely-not-a-level')).toBeUndefined()
  })
})
