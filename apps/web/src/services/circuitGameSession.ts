// Circuit Builder — guided session service (S1).
//
// React-free and clock-free: the API, the clock and the scheduler are injected, so the whole
// lifecycle is testable without a DOM or real timers. A thin hook (FEAT-003) binds it to React.
//
// Security posture:
//   - Fails closed. Every start failure is classified to a destination; nothing throws out of here
//     and no promise rejects unhandled.
//   - Server text is never stored or shown. Errors are only inspected to classify them.
//   - The score is whatever the server returned, by identity. This module computes none.
//   - No logging of any kind, so no circuit data can leak through it.

import { ROUTES } from '@/config/constants'
import type {
  CompleteGameInput,
  CompleteGameResult,
  CircuitSubmissionInput,
  StartGameResult,
} from '@/api/game'
import { evaluateSuccess } from '@/utils/circuitEngine'
import type { CircuitResult, LevelDefinition } from '@/utils/circuitEngine'

/** Setup page path: the shared route constant, kept under its session-level name. */
export const CIRCUIT_BUILDER_SETUP_PATH = ROUTES.CIRCUIT_BUILDER_SETUP

export const CIRCUIT_BUILDER_THEME_ID = 'CIRCUIT_BUILDER'

/** Server bounds for the top-level completion time, in seconds. */
export const MAX_COMPLETION_SECONDS = 3600

/** How long a satisfied circuit must stay satisfied before it is submitted. */
export const DEFAULT_SETTLE_MS = 750

export interface CircuitSessionApi {
  startGame(input: { themeId: string; difficulty: number }): Promise<StartGameResult>
  completeGame(input: CompleteGameInput): Promise<CompleteGameResult>
}

export type StartOutcome =
  | { kind: 'started'; gameId: string }
  | { kind: 'paywall' }
  | { kind: 'rateLimited' }
  | { kind: 'failed' }

/** What the session needs from the surface per frame. Structurally the surface's `CircuitFrame`. */
export interface SessionFrame {
  draft: SessionDraft
  result: CircuitResult | null
  fuseBlown: boolean
}

/** Structurally the reducer's `CircuitSubmissionDraft`. */
export interface SessionDraft {
  levelId: string
  layout: {
    elements: CircuitSubmissionInput['layout']['elements']
    connections: CircuitSubmissionInput['layout']['connections']
    gridSize: CircuitSubmissionInput['layout']['gridSize']
  }
  switches: CircuitSubmissionInput['switches']
  environment: CircuitSubmissionInput['environment']
  completionTime: number
  faultCount: number
}

export type GuidedPhase =
  | 'idle'
  | 'starting'
  | 'playing'
  | 'submitting'
  | 'submitted'
  | 'submitFailed'
  | 'startFailed'

export type SubmitFailure = 'rejected' | 'unavailable'

export interface GuidedSessionState {
  phase: GuidedPhase
  gameId: string | null
  startOutcome: StartOutcome | null
  failure: SubmitFailure | null
  /** Exactly the object `completeGame` returned. `null` until the server answers. */
  result: CompleteGameResult | null
}

export interface CompletedSnapshot {
  draft: SessionDraft
  elapsedMs: number
}

export type Cancel = () => void

export interface GuidedSessionDeps {
  api: CircuitSessionApi
  level: LevelDefinition
  now: () => number
  schedule: (fn: () => void, ms: number) => Cancel
  settleMs?: number
}

export interface GuidedSession {
  getState(): GuidedSessionState
  subscribe(listener: () => void): () => void
  start(): Promise<void>
  observe(frame: SessionFrame): void
  retry(): void
  detach(): void
  /** The completed circuit being (or waiting to be) submitted, kept so a failure loses nothing. */
  getCompletedSnapshot(): CompletedSnapshot | null
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

interface ErrorFacts {
  message: string
  codes: string[]
}

/** Reads only what is needed to classify. Never throws; copies no text out of this module. */
function factsOf(err: unknown): ErrorFacts {
  const facts: ErrorFacts = { message: '', codes: [] }
  try {
    if (typeof err !== 'object' || err === null) {
      return facts
    }
    const record = err as Record<string, unknown>
    if (typeof record.message === 'string') {
      facts.message = record.message.toLowerCase()
    }
    const collect = (holder: unknown): void => {
      if (typeof holder !== 'object' || holder === null) return
      const extensions = (holder as Record<string, unknown>).extensions
      if (typeof extensions !== 'object' || extensions === null) return
      const code = (extensions as Record<string, unknown>).code
      if (typeof code === 'string') {
        facts.codes.push(code)
      }
    }
    collect(record)
    const graphQLErrors = record.graphQLErrors
    if (Array.isArray(graphQLErrors)) {
      for (const entry of graphQLErrors) {
        collect(entry)
      }
    }
  } catch {
    // A hostile getter must not turn classification into a throw.
  }
  return facts
}

export function classifyStartFailure(err: unknown): 'paywall' | 'rateLimited' | 'failed' {
  const { message, codes } = factsOf(err)
  if (message.includes('rate limit') || codes.includes('RATE_LIMIT_EXCEEDED')) {
    return 'rateLimited'
  }
  if (
    message.includes('paid subscription') ||
    message.includes('upgrade to play') ||
    message.includes('requires a paid') ||
    codes.includes('FORBIDDEN')
  ) {
    return 'paywall'
  }
  return 'failed'
}

export function classifyStartResult(result: StartGameResult | null | undefined): StartOutcome {
  try {
    if (typeof result !== 'object' || result === null) {
      return { kind: 'failed' }
    }
    if (result.canPlay === true) {
      return typeof result.id === 'string' && result.id.length > 0
        ? { kind: 'started', gameId: result.id }
        : { kind: 'failed' }
    }
    if (result.canPlay === false) {
      const tier = result.rateLimit?.tier
      return typeof tier === 'string' && tier.toUpperCase() === 'FREE'
        ? { kind: 'paywall' }
        : { kind: 'rateLimited' }
    }
  } catch {
    // fall through to failed
  }
  return { kind: 'failed' }
}

export function routeForStartOutcome(
  outcome: StartOutcome
): { path: string; state?: Record<string, boolean> } | null {
  switch (outcome.kind) {
    case 'started':
      return null
    case 'paywall':
      return { path: ROUTES.SUBSCRIPTION, state: { premiumRequired: true } }
    case 'rateLimited':
      return { path: ROUTES.RATE_LIMIT, state: { rateLimited: true } }
    default:
      return { path: CIRCUIT_BUILDER_SETUP_PATH, state: { startFailed: true } }
  }
}

/** The server refused this circuit (it re-evaluates and disagreed) rather than being unreachable. */
function isRejection(err: unknown): boolean {
  const { message, codes } = factsOf(err)
  return message.includes('could not be verified') || codes.includes('VALIDATION_ERROR')
}

// ---------------------------------------------------------------------------
// Completion and payload
// ---------------------------------------------------------------------------

export function isCompleted(level: LevelDefinition, frame: SessionFrame): boolean {
  try {
    return (
      frame.result !== null &&
      !frame.fuseBlown &&
      frame.draft.levelId === level.id &&
      evaluateSuccess(level, frame.result).satisfied
    )
  } catch {
    return false
  }
}

/**
 * Whole seconds, floored to the server's minimum for the difficulty and capped at its maximum.
 *
 * The floor protects a legitimately fast solve from a spurious server rejection. It cannot raise a
 * score: the speed weight is modest and capped, and the score is computed server-side.
 */
export function clampCompletionSeconds(elapsedMs: number, difficulty: number): number {
  const minimum = Math.max(0, Math.floor(difficulty)) * 2
  const seconds = Number.isFinite(elapsedMs) ? Math.floor(elapsedMs / 1000) : 0
  return Math.min(MAX_COMPLETION_SECONDS, Math.max(minimum, seconds))
}

/** Rebuilds every object key by key, so nothing unexpected can ride along (server is strict). */
export function buildCompleteGameInput(
  gameId: string,
  snapshot: SessionDraft,
  seconds: number
): CompleteGameInput {
  const elements = snapshot.layout.elements.map((element) => {
    const copy: CircuitSubmissionInput['layout']['elements'][number] = {
      id: element.id,
      kind: element.kind,
      terminals: [element.terminals[0], element.terminals[1]],
      position: {
        col: element.position.col,
        row: element.position.row,
        rotation: element.position.rotation,
      },
    }
    if (element.params === undefined) {
      return copy
    }
    const params: Record<string, number> = {}
    for (const key of Object.keys(element.params)) {
      const value = element.params[key]
      if (typeof value === 'number') {
        params[key] = value
      }
    }
    return { ...copy, params }
  })

  const switches: Record<string, 'open' | 'closed'> = {}
  for (const key of Object.keys(snapshot.switches)) {
    const value = snapshot.switches[key]
    if (value === 'open' || value === 'closed') {
      switches[key] = value
    }
  }

  return {
    gameId,
    completionTime: seconds,
    attempts: 1,
    circuitSubmission: {
      levelId: snapshot.levelId,
      layout: {
        elements,
        connections: snapshot.layout.connections.map((connection) => ({
          id: connection.id,
          from: connection.from,
          to: connection.to,
        })),
        gridSize: {
          cols: snapshot.layout.gridSize.cols,
          rows: snapshot.layout.gridSize.rows,
        },
      },
      switches,
      environment: {
        sourceVoltage: snapshot.environment.sourceVoltage,
        lightLevel: snapshot.environment.lightLevel,
      },
      faultCount: snapshot.faultCount,
    },
  }
}

/** Identity of a completed circuit, for "same circuit again" decisions. Not sent anywhere. */
function circuitKey(draft: SessionDraft): string {
  return JSON.stringify([
    draft.layout.elements,
    draft.layout.connections,
    draft.layout.gridSize,
    draft.switches,
    draft.environment,
    draft.faultCount,
  ])
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export function createGuidedSession(deps: GuidedSessionDeps): GuidedSession {
  const { api, level, now, schedule } = deps
  const settleMs = deps.settleMs ?? DEFAULT_SETTLE_MS

  let state: GuidedSessionState = {
    phase: 'idle',
    gameId: null,
    startOutcome: null,
    failure: null,
    result: null,
  }
  const listeners = new Set<() => void>()

  let attached = true
  let startPromise: Promise<void> | null = null
  let startedAtMs = 0

  let pending: { snapshot: CompletedSnapshot; key: string } | null = null
  let cancelSettle: Cancel | null = null
  let latched = false
  let rejectedKey: string | null = null
  let completed: CompletedSnapshot | null = null

  function setState(patch: Partial<GuidedSessionState>): void {
    state = { ...state, ...patch }
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch {
        // A faulty subscriber must not break the session or leak out as a rejection.
      }
    }
  }

  function clearSettle(): void {
    if (cancelSettle !== null) {
      cancelSettle()
      cancelSettle = null
    }
    pending = null
  }

  async function runStart(): Promise<void> {
    setState({ phase: 'starting' })
    let outcome: StartOutcome
    try {
      outcome = classifyStartResult(
        await api.startGame({ themeId: CIRCUIT_BUILDER_THEME_ID, difficulty: level.difficulty })
      )
    } catch (err) {
      const kind = classifyStartFailure(err)
      outcome = { kind }
    }
    if (outcome.kind === 'started') {
      startedAtMs = now()
      setState({ phase: 'playing', gameId: outcome.gameId, startOutcome: outcome })
    } else {
      setState({ phase: 'startFailed', startOutcome: outcome })
    }
  }

  function submit(snapshot: CompletedSnapshot): void {
    const gameId = state.gameId
    if (gameId === null) {
      return
    }
    setState({ phase: 'submitting', failure: null })
    const input = buildCompleteGameInput(
      gameId,
      snapshot.draft,
      clampCompletionSeconds(snapshot.elapsedMs, level.difficulty)
    )

    let request: Promise<CompleteGameResult>
    try {
      request = Promise.resolve(api.completeGame(input))
    } catch (err) {
      request = Promise.reject(err)
    }

    request.then(
      (result) => {
        setState({ phase: 'submitted', result, failure: null })
      },
      (err: unknown) => {
        if (isRejection(err)) {
          // The server disagreed with this circuit. Let the player change it and try again.
          latched = false
          rejectedKey = circuitKey(snapshot.draft)
          completed = null
          setState({ phase: 'playing', failure: 'rejected' })
        } else {
          // Unreachable or failed server-side: keep the result in view and offer a retry.
          setState({ phase: 'submitFailed', failure: 'unavailable' })
        }
      }
    )
  }

  function fireSettled(): void {
    cancelSettle = null
    const current = pending
    pending = null
    if (current === null || latched || state.phase !== 'playing') {
      return
    }
    latched = true
    completed = current.snapshot
    submit(current.snapshot)
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    start() {
      // Re-attaching on start is what lets a dev-mode unmount/remount reuse this session.
      attached = true
      if (startPromise === null) {
        startPromise = runStart()
      }
      return startPromise
    },

    observe(frame) {
      if (!attached || state.phase !== 'playing' || latched) {
        return
      }
      if (!isCompleted(level, frame)) {
        clearSettle()
        return
      }
      const key = circuitKey(frame.draft)
      if (rejectedKey !== null) {
        if (key === rejectedKey) {
          return
        }
        rejectedKey = null
      }
      if (pending !== null && pending.key === key) {
        return
      }
      clearSettle()
      pending = {
        key,
        snapshot: { draft: frame.draft, elapsedMs: Math.max(0, now() - startedAtMs) },
      }
      cancelSettle = schedule(fireSettled, settleMs)
    },

    retry() {
      if (state.phase !== 'submitFailed' || completed === null) {
        return
      }
      submit(completed)
    },

    detach() {
      attached = false
      clearSettle()
      listeners.clear()
    },

    getCompletedSnapshot: () => completed,
  }
}
