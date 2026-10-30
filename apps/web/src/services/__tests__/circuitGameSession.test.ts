import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/config/constants'
import type { CompleteGameInput, CompleteGameResult, StartGameResult } from '@/api/game'
import type { CircuitResult, LevelDefinition } from '@/utils/circuitEngine'
import {
  REFERENCE,
  envAt,
  layoutFromRecipe,
  mustLevel,
  solveLayout,
  SHORTED,
} from '@/utils/__tests__/circuitTestLayouts'
import {
  CIRCUIT_BUILDER_SETUP_PATH,
  buildCompleteGameInput,
  classifyStartFailure,
  classifyStartResult,
  clampCompletionSeconds,
  createGuidedSession,
  isCompleted,
  routeForStartOutcome,
} from '../circuitGameSession'
import type {
  CircuitSessionApi,
  GuidedSession,
  SessionDraft,
  SessionFrame,
  StartOutcome,
} from '../circuitGameSession'

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

function startResult(over: Partial<StartGameResult> = {}): StartGameResult {
  return {
    id: 'game-1',
    userId: 'u',
    themeId: 'CIRCUIT_BUILDER',
    difficulty: 1,
    status: 'IN_PROGRESS',
    startedAt: '2026-01-01T00:00:00Z',
    canPlay: true,
    rateLimit: { tier: 'PREMIUM', limit: 10, used: 1, remaining: 9, resetAt: 'x' },
    ...over,
  }
}

const SERVER_RESULT = { id: 'game-1', score: 1234 } as unknown as CompleteGameResult

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

interface FakeApi extends CircuitSessionApi {
  startCalls: Array<{ themeId: string; difficulty: number }>
  completeCalls: CompleteGameInput[]
  startQueue: Array<() => Promise<StartGameResult>>
  completeQueue: Array<() => Promise<CompleteGameResult>>
}

function fakeApi(): FakeApi {
  const api: FakeApi = {
    startCalls: [],
    completeCalls: [],
    startQueue: [],
    completeQueue: [],
    startGame(input) {
      api.startCalls.push(input)
      const next = api.startQueue.shift()
      return next === undefined ? Promise.resolve(startResult()) : next()
    },
    completeGame(input) {
      api.completeCalls.push(input)
      const next = api.completeQueue.shift()
      return next === undefined ? Promise.resolve(SERVER_RESULT) : next()
    },
  }
  return api
}

function manualRuntime(): {
  now: () => number
  schedule: (fn: () => void, ms: number) => () => void
  advance: (ms: number) => void
  pendingTimers: () => number
} {
  let time = 1_000_000
  interface Task {
    at: number
    fn: () => void
    cancelled: boolean
  }
  const tasks: Task[] = []
  return {
    now: () => time,
    schedule(fn, ms) {
      const task: Task = { at: time + ms, fn, cancelled: false }
      tasks.push(task)
      return () => {
        task.cancelled = true
      }
    },
    advance(ms) {
      const target = time + ms
      for (;;) {
        const due = tasks
          .filter((t) => !t.cancelled && t.at <= target)
          .sort((a, b) => a.at - b.at)[0]
        if (due === undefined) break
        time = due.at
        due.cancelled = true
        due.fn()
      }
      time = target
    },
    pendingTimers: () => tasks.filter((t) => !t.cancelled).length,
  }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

const LEVEL_1 = mustLevel('cb-01-closed-circuit')
const LEVEL_3 = mustLevel('cb-05-series-vs-parallel')

function frameOf(
  level: LevelDefinition,
  options: { volts?: number; faultCount?: number; fuseBlown?: boolean; unsatisfied?: boolean; id?: string } = {}
): SessionFrame {
  const recipe = options.unsatisfied === true ? SHORTED : REFERENCE[level.id]
  if (recipe === undefined) throw new Error('no recipe')
  const layout = layoutFromRecipe(recipe, level.gridSize, level.prePlaced)
  const env = envAt(options.volts ?? 9)
  const result: CircuitResult = solveLayout(layout, recipe.switches, env)
  const draft: SessionDraft = {
    levelId: options.id ?? level.id,
    layout,
    switches: recipe.switches,
    environment: env,
    completionTime: 0,
    faultCount: options.faultCount ?? 0,
  }
  return { draft, result, fuseBlown: options.fuseBlown ?? false }
}

interface Harness {
  api: FakeApi
  rt: ReturnType<typeof manualRuntime>
  session: GuidedSession
}

function harness(level: LevelDefinition = LEVEL_1, settleMs?: number): Harness {
  const api = fakeApi()
  const rt = manualRuntime()
  const session = createGuidedSession({
    api,
    level,
    now: rt.now,
    schedule: rt.schedule,
    ...(settleMs === undefined ? {} : { settleMs }),
  })
  return { api, rt, session }
}

async function playing(level: LevelDefinition = LEVEL_1, settleMs?: number): Promise<Harness> {
  const h = harness(level, settleMs)
  await h.session.start()
  return h
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

describe('classifyStartFailure', () => {
  const rateLimit = [
    new Error('Rate limit exceeded for tier'),
    { message: 'x', extensions: { code: 'RATE_LIMIT_EXCEEDED' } },
    { message: 'x', graphQLErrors: [{ extensions: { code: 'RATE_LIMIT_EXCEEDED' } }] },
  ]
  const paywall = [
    new Error('This game requires a paid subscription. Upgrade to play!'),
    new Error('Super Hard difficulty requires a paid subscription'),
    { message: 'nope', extensions: { code: 'FORBIDDEN' } },
    { message: 'nope', graphQLErrors: [{ extensions: { code: 'FORBIDDEN' } }] },
  ]
  const failed: unknown[] = [
    new Error('boom'),
    'Rate limit exceeded',
    null,
    undefined,
    42,
    {},
    { message: 5 },
    { extensions: { code: 'INTERNAL' } },
  ]

  it.each(rateLimit.map((e, i) => [i, e] as const))('rate limit %s -> rateLimited', (_i, err) => {
    expect(classifyStartFailure(err)).toBe('rateLimited')
  })
  it.each(paywall.map((e, i) => [i, e] as const))('paywall %s -> paywall', (_i, err) => {
    expect(classifyStartFailure(err)).toBe('paywall')
  })
  it.each(failed.map((e, i) => [i, e] as const))('other value %s -> failed', (_i, err) => {
    expect(classifyStartFailure(err)).toBe('failed')
  })

  it('never throws on a hostile object', () => {
    const hostile = {
      get message(): string {
        throw new Error('x')
      },
    }
    expect(classifyStartFailure(hostile)).toBe('failed')
  })
})

describe('classifyStartResult', () => {
  it('started when canPlay with an id', () => {
    expect(classifyStartResult(startResult())).toEqual({ kind: 'started', gameId: 'game-1' })
  })
  it('paywall for canPlay false on the FREE tier', () => {
    const r = startResult({ canPlay: false, rateLimit: { tier: 'FREE', limit: 1, used: 1, remaining: 0, resetAt: 'x' } })
    expect(classifyStartResult(r)).toEqual({ kind: 'paywall' })
  })
  it('rateLimited for canPlay false on any other tier', () => {
    expect(classifyStartResult(startResult({ canPlay: false }))).toEqual({ kind: 'rateLimited' })
    expect(classifyStartResult(startResult({ canPlay: false, rateLimit: null }))).toEqual({ kind: 'rateLimited' })
  })
  it('failed for malformed results', () => {
    expect(classifyStartResult(null)).toEqual({ kind: 'failed' })
    expect(classifyStartResult(undefined)).toEqual({ kind: 'failed' })
    expect(classifyStartResult(startResult({ id: '' }))).toEqual({ kind: 'failed' })
    expect(classifyStartResult({} as unknown as StartGameResult)).toEqual({ kind: 'failed' })
  })
})

describe('routeForStartOutcome', () => {
  it('routes every outcome to a destination, never a dead screen', () => {
    const cases: Array<[StartOutcome, { path: string; state?: object } | null]> = [
      [{ kind: 'started', gameId: 'g' }, null],
      [{ kind: 'paywall' }, { path: ROUTES.SUBSCRIPTION, state: { premiumRequired: true } }],
      [{ kind: 'rateLimited' }, { path: ROUTES.RATE_LIMIT, state: { rateLimited: true } }],
      [{ kind: 'failed' }, { path: CIRCUIT_BUILDER_SETUP_PATH, state: { startFailed: true } }],
    ]
    for (const [outcome, expected] of cases) {
      expect(routeForStartOutcome(outcome)).toEqual(expected)
    }
  })

  it('keeps the setup path literal in step with the catalog path', () => {
    expect(CIRCUIT_BUILDER_SETUP_PATH).toBe('/circuit-builder/setup')
  })
})

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('clampCompletionSeconds', () => {
  it('floors to whole seconds', () => {
    expect(clampCompletionSeconds(61_999, 1)).toBe(61)
  })
  it('raises a fast solve to the difficulty minimum (difficulty * 2)', () => {
    expect(clampCompletionSeconds(0, 1)).toBe(2)
    expect(clampCompletionSeconds(500, 4)).toBe(8)
  })
  it('caps at 3600', () => {
    expect(clampCompletionSeconds(10_000_000, 2)).toBe(3600)
  })
  it('treats non-finite and negative input as the minimum', () => {
    expect(clampCompletionSeconds(Number.NaN, 3)).toBe(6)
    expect(clampCompletionSeconds(Number.POSITIVE_INFINITY, 3)).toBe(6)
    expect(clampCompletionSeconds(-5000, 3)).toBe(6)
  })
  it('always returns an integer in range', () => {
    for (const ms of [0, 1, 999, 1000, 123_456, 5_000_000]) {
      for (const d of [1, 2, 3, 4]) {
        const s = clampCompletionSeconds(ms, d)
        expect(Number.isInteger(s)).toBe(true)
        expect(s).toBeGreaterThanOrEqual(d * 2)
        expect(s).toBeLessThanOrEqual(3600)
      }
    }
  })
})

describe('isCompleted', () => {
  it('is true for a satisfied reference frame', () => {
    expect(isCompleted(LEVEL_1, frameOf(LEVEL_1))).toBe(true)
  })
  it('is false when the fuse is blown', () => {
    expect(isCompleted(LEVEL_1, frameOf(LEVEL_1, { fuseBlown: true }))).toBe(false)
  })
  it('is false without a result', () => {
    expect(isCompleted(LEVEL_1, { ...frameOf(LEVEL_1), result: null })).toBe(false)
  })
  it('is false for another level id', () => {
    expect(isCompleted(LEVEL_1, frameOf(LEVEL_1, { id: 'cb-02-switch-control' }))).toBe(false)
  })
  it('is false for an unsatisfied circuit', () => {
    expect(isCompleted(LEVEL_1, frameOf(LEVEL_1, { unsatisfied: true }))).toBe(false)
  })
})

describe('buildCompleteGameInput', () => {
  const frame = frameOf(LEVEL_1, { faultCount: 2 })
  const input = buildCompleteGameInput('game-9', frame.draft, 47)

  it('has exactly the top-level contract keys', () => {
    expect(Object.keys(input).sort()).toEqual(['attempts', 'circuitSubmission', 'completionTime', 'gameId'])
    expect(input.gameId).toBe('game-9')
    expect(input.completionTime).toBe(47)
    expect(input.attempts).toBe(1)
  })

  it('has exactly the strict circuitSubmission keys and no completionTime inside', () => {
    const submission = input.circuitSubmission
    if (submission === undefined) throw new Error('missing')
    expect(Object.keys(submission).sort()).toEqual(['environment', 'faultCount', 'layout', 'levelId', 'switches'])
    expect(Object.keys(submission.layout).sort()).toEqual(['connections', 'elements', 'gridSize'])
    expect(Object.keys(submission.environment).sort()).toEqual(['lightLevel', 'sourceVoltage'])
    expect(submission.faultCount).toBe(2)
    expect(submission.levelId).toBe(LEVEL_1.id)
  })

  it('whitelists element and connection keys', () => {
    const polluted = {
      ...frame.draft,
      layout: {
        ...frame.draft.layout,
        elements: frame.draft.layout.elements.map((e) => ({ ...e, extra: 'x', secret: 1 })),
        connections: frame.draft.layout.connections.map((c) => ({ ...c, extra: 'x' })),
      },
      score: 999,
    }
    const built = buildCompleteGameInput('g', polluted as unknown as SessionDraft, 5)
    for (const element of built.circuitSubmission?.layout.elements ?? []) {
      expect(Object.keys(element).every((k) => ['id', 'kind', 'terminals', 'position', 'params'].includes(k))).toBe(true)
      expect(Object.keys(element.position).sort()).toEqual(['col', 'rotation', 'row'])
    }
    for (const c of built.circuitSubmission?.layout.connections ?? []) {
      expect(Object.keys(c).sort()).toEqual(['from', 'id', 'to'])
    }
    expect(JSON.stringify(built)).not.toContain('secret')
    expect(JSON.stringify(built)).not.toContain('999')
  })

  it('copies params only when present and keeps numbers only', () => {
    const withParams: SessionDraft = {
      ...frame.draft,
      layout: {
        ...frame.draft.layout,
        elements: [
          {
            id: 'r',
            kind: 'resistor',
            terminals: ['r:0', 'r:1'],
            position: { col: 0, row: 0, rotation: 0 },
            params: { resistance: 220, bad: 'x' as unknown as number },
          },
        ],
      },
    }
    const built = buildCompleteGameInput('g', withParams, 5)
    expect(built.circuitSubmission?.layout.elements[0]?.params).toEqual({ resistance: 220 })
  })

  it('is JSON-serialisable and does not alias the draft', () => {
    expect(JSON.parse(JSON.stringify(input))).toEqual(input)
    expect(input.circuitSubmission?.layout.elements).not.toBe(frame.draft.layout.elements)
  })
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

describe('guided session: start', () => {
  it('calls startGame once with the theme id and the level difficulty', async () => {
    const h = harness(LEVEL_3)
    await h.session.start()
    expect(h.api.startCalls).toEqual([{ themeId: 'CIRCUIT_BUILDER', difficulty: LEVEL_3.difficulty }])
    expect(h.session.getState().phase).toBe('playing')
    expect(h.session.getState().gameId).toBe('game-1')
  })

  it('is idempotent across repeated and concurrent start() calls', async () => {
    const h = harness()
    const a = h.session.start()
    const b = h.session.start()
    expect(a).toBe(b)
    await Promise.all([a, b, h.session.start()])
    expect(h.api.startCalls).toHaveLength(1)
  })

  it('survives a StrictMode detach and start without a second startGame', async () => {
    const h = harness()
    const first = h.session.start()
    h.session.detach()
    const second = h.session.start()
    await Promise.all([first, second])
    expect(h.api.startCalls).toHaveLength(1)
    expect(h.session.getState().phase).toBe('playing')
  })

  it('calls startGame once even after the first call completed and detach ran', async () => {
    const h = await playing()
    h.session.detach()
    await h.session.start()
    expect(h.api.startCalls).toHaveLength(1)
  })

  it('reports starting while the request is in flight', async () => {
    const h = harness()
    const gate = deferred<StartGameResult>()
    h.api.startQueue.push(() => gate.promise)
    const p = h.session.start()
    expect(h.session.getState().phase).toBe('starting')
    gate.resolve(startResult())
    await p
    expect(h.session.getState().phase).toBe('playing')
  })

  it.each([
    ['paywall result', () => Promise.resolve(startResult({ canPlay: false, rateLimit: { tier: 'FREE', limit: 1, used: 1, remaining: 0, resetAt: 'x' } })), 'paywall'],
    ['rate limited result', () => Promise.resolve(startResult({ canPlay: false })), 'rateLimited'],
    ['paywall error', () => Promise.reject(new Error('This game requires a paid subscription')), 'paywall'],
    ['rate limit error', () => Promise.reject(new Error('Rate limit exceeded')), 'rateLimited'],
    ['other error', () => Promise.reject(new Error('network down')), 'failed'],
    ['non-error rejection', () => Promise.reject('weird'), 'failed'],
  ] as const)('%s ends in startFailed/%s without throwing', async (_name, make, kind) => {
    const h = harness()
    h.api.startQueue.push(make)
    await expect(h.session.start()).resolves.toBeUndefined()
    expect(h.session.getState().phase).toBe('startFailed')
    expect(h.session.getState().startOutcome).toEqual({ kind })
    expect(h.session.getState().gameId).toBeNull()
    expect(routeForStartOutcome(h.session.getState().startOutcome as StartOutcome)).not.toBeNull()
  })

  it('does not start a second game after a failure', async () => {
    const h = harness()
    h.api.startQueue.push(() => Promise.reject(new Error('x')))
    await h.session.start()
    await h.session.start()
    expect(h.api.startCalls).toHaveLength(1)
  })

  it('ignores frames until playing', async () => {
    const h = harness()
    h.session.observe(frameOf(LEVEL_1))
    expect(h.rt.pendingTimers()).toBe(0)
    await h.session.start()
    expect(h.api.completeCalls).toHaveLength(0)
  })

  it('stores no error text anywhere in its state', async () => {
    const h = harness()
    h.api.startQueue.push(() => Promise.reject(new Error('SECRET-STACK-TEXT')))
    await h.session.start()
    expect(JSON.stringify(h.session.getState())).not.toContain('SECRET')
  })
})

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

describe('guided session: settle and single submission', () => {
  it('submits once after the settle delay with the exact contract', async () => {
    const h = await playing(LEVEL_1, 750)
    h.rt.advance(42_500)
    h.session.observe(frameOf(LEVEL_1, { faultCount: 1 }))
    expect(h.api.completeCalls).toHaveLength(0)
    h.rt.advance(749)
    expect(h.api.completeCalls).toHaveLength(0)
    h.rt.advance(1)
    expect(h.api.completeCalls).toHaveLength(1)
    expect(h.session.getState().phase).toBe('submitting')

    const call = h.api.completeCalls[0]
    if (call === undefined) throw new Error('no call')
    expect(call.gameId).toBe('game-1')
    expect(call.completionTime).toBe(42)
    expect(call.attempts).toBe(1)
    expect(call.circuitSubmission?.faultCount).toBe(1)
    expect(call.circuitSubmission?.levelId).toBe(LEVEL_1.id)
    expect(JSON.stringify(call.circuitSubmission)).not.toContain('completionTime')
  })

  it('clamps a fast solve to difficulty * 2 seconds', async () => {
    const h = await playing(LEVEL_3)
    h.session.observe(frameOf(LEVEL_3))
    h.rt.advance(750)
    expect(h.api.completeCalls[0]?.completionTime).toBe(LEVEL_3.difficulty * 2)
  })

  it('caps a very slow solve at 3600 seconds', async () => {
    const h = await playing()
    h.rt.advance(9_000_000)
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    expect(h.api.completeCalls[0]?.completionTime).toBe(3600)
  })

  it('measures time at the moment of completion, not at submission', async () => {
    const h = await playing()
    h.rt.advance(20_000)
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    expect(h.api.completeCalls[0]?.completionTime).toBe(20)
  })

  it('fifty identical satisfied frames produce one call', async () => {
    const h = await playing()
    for (let i = 0; i < 50; i += 1) h.session.observe(frameOf(LEVEL_1))
    expect(h.rt.pendingTimers()).toBe(1)
    h.rt.advance(750)
    await flush()
    for (let i = 0; i < 50; i += 1) h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(5000)
    expect(h.api.completeCalls).toHaveLength(1)
  })

  it('does not extend the settle window for repeated identical frames', async () => {
    const h = await playing()
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(500)
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(250)
    expect(h.api.completeCalls).toHaveLength(1)
  })

  it('flapping satisfied/unsatisfied frames never submit a circuit that is not settled', async () => {
    const h = await playing()
    for (let i = 0; i < 10; i += 1) {
      h.session.observe(frameOf(LEVEL_1))
      h.rt.advance(300)
      h.session.observe(frameOf(LEVEL_1, { unsatisfied: true }))
      h.rt.advance(300)
    }
    expect(h.api.completeCalls).toHaveLength(0)
    expect(h.rt.pendingTimers()).toBe(0)
  })

  it('a blown fuse cancels a pending submission', async () => {
    const h = await playing()
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(400)
    h.session.observe(frameOf(LEVEL_1, { fuseBlown: true }))
    h.rt.advance(5000)
    expect(h.api.completeCalls).toHaveLength(0)
  })

  it('a changed circuit re-arms the settle timer against the new snapshot', async () => {
    const h = await playing()
    h.session.observe(frameOf(LEVEL_1, { volts: 9 }))
    h.rt.advance(500)
    h.session.observe(frameOf(LEVEL_1, { volts: 10 }))
    h.rt.advance(500)
    expect(h.api.completeCalls).toHaveLength(0)
    h.rt.advance(250)
    expect(h.api.completeCalls).toHaveLength(1)
    expect(h.api.completeCalls[0]?.circuitSubmission?.environment.sourceVoltage).toBe(10)
  })

  it('ignores frames while submitting and after submitted', async () => {
    const h = await playing()
    const gate = deferred<CompleteGameResult>()
    h.api.completeQueue.push(() => gate.promise)
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    h.session.observe(frameOf(LEVEL_1, { volts: 11 }))
    h.rt.advance(2000)
    expect(h.api.completeCalls).toHaveLength(1)
    gate.resolve(SERVER_RESULT)
    await flush()
    h.session.observe(frameOf(LEVEL_1, { volts: 12 }))
    h.rt.advance(2000)
    expect(h.api.completeCalls).toHaveLength(1)
    expect(h.session.getState().phase).toBe('submitted')
  })

  it('exposes the server object by identity, and null before it', async () => {
    const h = await playing()
    expect(h.session.getState().result).toBeNull()
    const gate = deferred<CompleteGameResult>()
    h.api.completeQueue.push(() => gate.promise)
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    expect(h.session.getState().result).toBeNull()
    gate.resolve(SERVER_RESULT)
    await flush()
    expect(h.session.getState().result).toBe(SERVER_RESULT)
  })

  it('never invents a score of its own', async () => {
    const h = await playing()
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    expect(Object.keys(h.session.getState()).sort()).toEqual(['failure', 'gameId', 'phase', 'result', 'startOutcome'])
  })

  it('notifies subscribers and stops after unsubscribe', async () => {
    const h = harness()
    let calls = 0
    const off = h.session.subscribe(() => {
      calls += 1
    })
    await h.session.start()
    expect(calls).toBeGreaterThanOrEqual(2)
    off()
    const before = calls
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    expect(calls).toBe(before)
  })

  it('survives a throwing subscriber', async () => {
    const h = harness()
    h.session.subscribe(() => {
      throw new Error('subscriber bug')
    })
    await expect(h.session.start()).resolves.toBeUndefined()
    expect(h.session.getState().phase).toBe('playing')
  })
})

describe('guided session: failures keep the result', () => {
  async function completedHarness(): Promise<Harness> {
    const h = await playing()
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    return h
  }

  it('an unavailable server keeps the snapshot and offers retry of the SAME snapshot', async () => {
    const h = await playing()
    h.api.completeQueue.push(() => Promise.reject(new Error('Network error')))
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    await flush()

    expect(h.session.getState().phase).toBe('submitFailed')
    expect(h.session.getState().failure).toBe('unavailable')
    expect(h.session.getState().result).toBeNull()
    const snapshot = h.session.getCompletedSnapshot()
    expect(snapshot).not.toBeNull()

    h.session.retry()
    await flush()
    expect(h.api.completeCalls).toHaveLength(2)
    expect(h.api.completeCalls[1]).toEqual(h.api.completeCalls[0])
    expect(h.session.getState().phase).toBe('submitted')
    expect(h.session.getState().result).toBe(SERVER_RESULT)
  })

  it('retry is ignored while a request is in flight and outside submitFailed', async () => {
    const h = await playing()
    h.session.retry()
    expect(h.api.completeCalls).toHaveLength(0)
    const gate = deferred<CompleteGameResult>()
    h.api.completeQueue.push(() => gate.promise)
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    h.session.retry()
    h.session.retry()
    expect(h.api.completeCalls).toHaveLength(1)
    gate.resolve(SERVER_RESULT)
    await flush()
    h.session.retry()
    expect(h.api.completeCalls).toHaveLength(1)
  })

  it('repeated failures can be retried again and stay a single in-flight request', async () => {
    const h = await playing()
    h.api.completeQueue.push(() => Promise.reject(new Error('x')), () => Promise.reject(new Error('y')))
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    await flush()
    h.session.retry()
    await flush()
    expect(h.session.getState().phase).toBe('submitFailed')
    h.session.retry()
    await flush()
    expect(h.api.completeCalls).toHaveLength(3)
    expect(h.session.getState().phase).toBe('submitted')
  })

  it('a rejected circuit returns to playing so the player can edit', async () => {
    const h = await playing()
    h.api.completeQueue.push(() => Promise.reject(new Error('Circuit could not be verified')))
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    await flush()
    expect(h.session.getState().phase).toBe('playing')
    expect(h.session.getState().failure).toBe('rejected')
    expect(h.session.getState().result).toBeNull()

    // The identical circuit is not resubmitted on its own.
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(5000)
    expect(h.api.completeCalls).toHaveLength(1)

    // A different circuit can be, and clears the rejection memory.
    h.session.observe(frameOf(LEVEL_1, { volts: 10 }))
    h.rt.advance(750)
    expect(h.api.completeCalls).toHaveLength(2)
  })

  it('treats a VALIDATION_ERROR code as a rejection', async () => {
    const h = await playing()
    h.api.completeQueue.push(() =>
      Promise.reject({ message: 'x', graphQLErrors: [{ extensions: { code: 'VALIDATION_ERROR' } }] })
    )
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    await flush()
    expect(h.session.getState().failure).toBe('rejected')
  })

  it('handles a synchronous throw from completeGame as unavailable', async () => {
    const h = await playing()
    h.api.completeGame = () => {
      throw new Error('sync')
    }
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    await flush()
    expect(h.session.getState().phase).toBe('submitFailed')
  })

  it('stores no server text', async () => {
    const h = await playing()
    h.api.completeQueue.push(() => Promise.reject(new Error('LEAKY-SERVER-TEXT')))
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    await flush()
    expect(JSON.stringify(h.session.getState())).not.toContain('LEAKY')
  })

  it('keeps the snapshot after a successful submission as well', async () => {
    const h = await completedHarness()
    await flush()
    expect(h.session.getCompletedSnapshot()).not.toBeNull()
  })
})

describe('guided session: detach', () => {
  it('cancels the settle timer and silences the frame', async () => {
    const h = await playing()
    h.session.observe(frameOf(LEVEL_1))
    expect(h.rt.pendingTimers()).toBe(1)
    h.session.detach()
    expect(h.rt.pendingTimers()).toBe(0)
    h.rt.advance(5000)
    expect(h.api.completeCalls).toHaveLength(0)
    h.session.observe(frameOf(LEVEL_1))
    expect(h.rt.pendingTimers()).toBe(0)
  })

  it('drops listeners', async () => {
    const h = await playing()
    let calls = 0
    h.session.subscribe(() => {
      calls += 1
    })
    h.session.detach()
    h.session.observe(frameOf(LEVEL_1))
    expect(calls).toBe(0)
  })

  it('a start resolving after detach updates state without throwing or scheduling', async () => {
    const h = harness()
    const gate = deferred<StartGameResult>()
    h.api.startQueue.push(() => gate.promise)
    const p = h.session.start()
    h.session.detach()
    gate.resolve(startResult())
    await expect(p).resolves.toBeUndefined()
    expect(h.session.getState().phase).toBe('playing')
    expect(h.rt.pendingTimers()).toBe(0)
  })

  it('a submission resolving after detach records the result without scheduling', async () => {
    const h = await playing()
    const gate = deferred<CompleteGameResult>()
    h.api.completeQueue.push(() => gate.promise)
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    h.session.detach()
    gate.resolve(SERVER_RESULT)
    await flush()
    expect(h.session.getState().result).toBe(SERVER_RESULT)
    expect(h.rt.pendingTimers()).toBe(0)
  })

  it('a failure resolving after detach does not throw', async () => {
    const h = await playing()
    const gate = deferred<CompleteGameResult>()
    h.api.completeQueue.push(() => gate.promise)
    h.session.observe(frameOf(LEVEL_1))
    h.rt.advance(750)
    h.session.detach()
    gate.reject(new Error('late'))
    await flush()
    expect(h.session.getState().phase).toBe('submitFailed')
  })
})

describe('guided session: module hygiene', () => {
  const sources = import.meta.glob<string>('../circuitGameSession.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  })
  const source = Object.values(sources)[0] ?? ''

  it('is readable by the test', () => {
    expect(source.length).toBeGreaterThan(1000)
  })

  it('never logs', () => {
    expect(source).not.toMatch(/console\./)
  })

  it('computes no score of its own', () => {
    expect(source).not.toMatch(/finalScore|baseScore|speedBonus|Math\.random/)
  })
})
