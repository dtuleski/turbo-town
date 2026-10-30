// Circuit Builder — engine wrapper and evaluation memo (component D2).
//
// This is the ONLY module in apps/web that names packages/shared. Everything else in the unit
// imports the engine through this file, so switching to a package-name import later is a change
// to roughly ten lines here and nothing else.
//
// The import is a relative source import because apps/web does not depend on @memory-game/shared
// and neither package.json nor vite.config.ts is in this unit's permitted change set.
//
// ============================================================================
// BLOCKING DEPLOYMENT RISK — DO NOT DEPLOY THE FRONTEND UNTIL RESOLVED
// ============================================================================
// This relative import reaches OUTSIDE apps/web. It resolves locally only because a
// development machine has the whole monorepo on disk. Production probably does not:
//
//   - The deploy procedure runs `vercel --prod` FROM apps/web/, which uploads only
//     that directory as the deployment root.
//   - There is no root vercel.json, no .vercelignore, no turbo.json, and no npm
//     "workspaces" field in the root package.json.
//   - apps/web/vercel.json sets `buildCommand`, so Vercel BUILDS from source rather
//     than receiving a prebuilt dist.
//
// So packages/shared is very likely absent from the Vercel build context, and this
// import would fail there while passing every local gate. A local production bundle
// does NOT prove deployability; it only proves the path resolves when the monorepo
// is present.
//
// Resolving this is an infrastructure decision (the owner's call), not a code change.
// Options: configure Vercel as a monorepo build with root directory apps/web; publish
// packages/shared to a registry; or add a build-time staging step. Vendoring a copy of
// the engine is explicitly rejected, because browser and server must run identical code
// (requirement FR-CB-16) or they can disagree about whether a circuit is valid.
//
// This file is the single switch point. Changing the import strategy is a change here
// and nowhere else.
// ============================================================================

import {
  CIRCUIT_LIMITS,
  CURRENT_EPSILON,
  DEFAULT_RESISTOR_RESISTANCE,
  ELEMENT_KINDS,
  ELEMENT_SPECS,
  MARS_ROVER,
  MAX_CONNECTION_COUNT,
  MAX_ELEMENT_COUNT,
  MAX_FAULT_COUNT_PER_LEVEL,
  MAX_LIGHT_LEVEL,
  MAX_SOURCE_VOLTAGE,
  MIN_LIGHT_LEVEL,
  MIN_SOURCE_VOLTAGE,
  MIN_VISIBLE_INTENSITY,
  SOURCE_VOLTAGE_STEP,
  connectTerminals,
  createElement,
  createLayout,
  defaultSwitchStates,
  evaluate,
  evaluateRoleActivation,
  evaluateSuccess,
  getLevel,
  getMachine,
  isCircuitResult,
  isEvaluationError,
  listLevels,
  terminalOf,
} from '../../../../packages/shared/src/circuit'

import type {
  CircuitElement,
  CircuitLayout,
  CircuitResult,
  Connection,
  ElementId,
  ElementKind,
  ElementResult,
  Environment,
  EvaluationOutcome,
  Fault,
  FaultCode,
  GridPosition,
  GridSize,
  LevelDefinition,
  MachineRole,
  NodeId,
  NumericDisclosure,
  Rotation,
  SwitchState,
  SwitchStates,
  TargetMachine,
} from '../../../../packages/shared/src/circuit'

export {
  CIRCUIT_LIMITS,
  CURRENT_EPSILON,
  DEFAULT_RESISTOR_RESISTANCE,
  ELEMENT_KINDS,
  ELEMENT_SPECS,
  MARS_ROVER,
  MAX_CONNECTION_COUNT,
  MAX_ELEMENT_COUNT,
  MAX_FAULT_COUNT_PER_LEVEL,
  MAX_LIGHT_LEVEL,
  MAX_SOURCE_VOLTAGE,
  MIN_LIGHT_LEVEL,
  MIN_SOURCE_VOLTAGE,
  MIN_VISIBLE_INTENSITY,
  SOURCE_VOLTAGE_STEP,
  connectTerminals,
  createElement,
  createLayout,
  defaultSwitchStates,
  evaluate,
  evaluateRoleActivation,
  evaluateSuccess,
  getLevel,
  getMachine,
  isCircuitResult,
  isEvaluationError,
  listLevels,
  terminalOf,
}

export type {
  CircuitElement,
  CircuitLayout,
  CircuitResult,
  Connection,
  ElementId,
  ElementKind,
  ElementResult,
  Environment,
  EvaluationOutcome,
  Fault,
  FaultCode,
  GridPosition,
  GridSize,
  LevelDefinition,
  MachineRole,
  NodeId,
  NumericDisclosure,
  Rotation,
  SwitchState,
  SwitchStates,
  TargetMachine,
}

/**
 * Memo capacity.
 *
 * The engine costs single-digit milliseconds at the 64-element ceiling, which does not fit a
 * 16.7 ms frame, so a repeat evaluation has to be free. 32 entries covers the oscillation real
 * play produces — toggle a switch and back, drag an element and return, nudge the voltage up and
 * down — at under ~128 KB of keys and results.
 */
export const ENGINE_MEMO_CAPACITY = 32

/** Field separator inside one canonical record. */
const FIELD_SEPARATOR = '\u001f'

/** Record separator between canonical records. */
const RECORD_SEPARATOR = '\u001e'

/**
 * Code-unit ordering, never `localeCompare`.
 *
 * The engine sorts with its own `compareIds`, which the public barrel deliberately does not
 * export. A locale-aware comparator would make the memo key and the submission payload depend on
 * the player's locale, so two identical circuits could hash differently on different devices.
 */
export function compareIdsLocal(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/**
 * Serialize a number so that no two distinguishable values collide.
 *
 * `String(-0)` is `'0'`, so negative zero needs its own branch. `NaN` and `Infinity` stringify to
 * names no finite value produces, so they cannot be confused with one.
 */
function serializeNumber(value: number): string {
  return Object.is(value, -0) ? '-0' : String(value)
}

/**
 * The canonical description of a circuit state: the memo key.
 *
 * Elements, connections, switch entries, and element params are each sorted, so two layouts that
 * differ only in array order produce the identical string — which matches the engine, whose output
 * is order-independent. The two separators are C0 control characters; element and connection ids
 * are bounded to 64 characters by the engine's `MAX_ID_LENGTH` and cannot contain them, so no id
 * can forge a field or record boundary.
 */
export function hashCircuitState(
  layout: CircuitLayout,
  switches: SwitchStates,
  env: Environment
): string {
  const records: string[] = [
    ['g', serializeNumber(layout.gridSize.cols), serializeNumber(layout.gridSize.rows)].join(
      FIELD_SEPARATOR
    ),
  ]

  const elements = [...layout.elements].sort((left, right) => compareIdsLocal(left.id, right.id))
  for (const element of elements) {
    const params = element.params
    const serializedParams =
      params === undefined
        ? ''
        : Object.keys(params)
            .sort(compareIdsLocal)
            .map((key) => `${key}=${serializeNumber(params[key])}`)
            .join(',')
    records.push(
      [
        'E',
        element.id,
        element.kind,
        serializeNumber(element.position.col),
        serializeNumber(element.position.row),
        serializeNumber(element.position.rotation),
        serializedParams,
      ].join(FIELD_SEPARATOR)
    )
  }

  const connections = [...layout.connections].sort((left, right) =>
    compareIdsLocal(left.id, right.id)
  )
  for (const connection of connections) {
    records.push(['C', connection.id, connection.from, connection.to].join(FIELD_SEPARATOR))
  }

  for (const elementId of Object.keys(switches).sort(compareIdsLocal)) {
    records.push(['S', elementId, String(switches[elementId])].join(FIELD_SEPARATOR))
  }

  records.push(
    ['V', serializeNumber(env.sourceVoltage), serializeNumber(env.lightLevel)].join(FIELD_SEPARATOR)
  )

  return records.join(RECORD_SEPARATOR)
}

/**
 * Insertion-ordered cache. A `Map` already preserves insertion order, so refreshing an entry is
 * delete-then-set and evicting the oldest is "delete the first key" — no second data structure.
 */
const memo = new Map<string, EvaluationOutcome>()

/**
 * `evaluate`, memoized on the full canonical state string.
 *
 * The key is the canonical string rather than a numeric digest on purpose: a digest collision
 * would show the player a different circuit's answer, silently and with no error signal. At the
 * 64-element ceiling the string is a few kilobytes, so the safety costs nothing measurable.
 *
 * Error outcomes are cached too — identical input is identically invalid.
 *
 * Fails closed: if hashing or the lookup itself throws, the caller gets a typed `INTERNAL_ERROR`
 * outcome carrying no message and no stack (SECURITY-09, SECURITY-15). `evaluate` already never
 * throws, so this guard covers only this wrapper.
 */
export function evaluateMemoized(
  layout: CircuitLayout,
  switches: SwitchStates,
  env: Environment
): EvaluationOutcome {
  try {
    const key = hashCircuitState(layout, switches, env)
    const cached = memo.get(key)
    if (cached !== undefined) {
      memo.delete(key)
      memo.set(key, cached)
      return cached
    }
    const outcome = evaluate(layout, switches, env)
    memo.set(key, outcome)
    if (memo.size > ENGINE_MEMO_CAPACITY) {
      const oldest = memo.keys().next()
      if (oldest.done !== true) {
        memo.delete(oldest.value)
      }
    }
    return outcome
  } catch {
    return { errorCode: 'INTERNAL_ERROR', issues: [] }
  }
}

export function clearEngineMemo(): void {
  memo.clear()
}

/** Observability for tests and for the eviction assertions. */
export function engineMemoSize(): number {
  return memo.size
}
