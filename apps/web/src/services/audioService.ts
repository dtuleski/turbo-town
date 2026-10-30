// Circuit Builder — audio service (component D1, orchestration S5).
//
// A plain module with no React import, because an audio context must outlive individual renders;
// `hooks/useGameAudio.ts` is the thin wrapper that gives it component-scoped cleanup.
//
// THE LIFECYCLE, which is the whole point of the module:
//   `createCircuitAudio` constructs NOTHING. A browser that is handed an AudioContext before the
//   player has touched anything logs an autoplay warning and starts the context suspended, so the
//   factory is inert and `unlock()` — called from the first real user gesture — is what creates it
//   (CB-6.5). `unlock()` is synchronous and void-returning so a gesture handler can call it without
//   becoming async. After creation it resumes the context and only THEN preloads (S5 step 3).
//   `dispose()` releases everything, and every later `play` is a no-op (CB-6.6, NFR-CB-15).
//
// WHY BUFFERS ARE SYNTHESISED RATHER THAN FETCHED (decision D4): this repository contains no audio
// assets at all, and adding binary files is outside this unit's remit and unverifiable without a
// browser. Each cue is built by filling a `Float32Array` from `ctx.createBuffer`, which removes the
// network request, the 404 path and the asset-pipeline question in one move. The `SoundLoader` seam
// keeps fetched files possible later without touching anything above.
//
// WHY THE TYPES ARE STRUCTURAL: this package's Vitest runs in the NODE environment with no jsdom,
// so `AudioContext` is `undefined` inside a test. The `*Like` interfaces below describe only the
// Web Audio surface actually used, which is little enough that a plain object fake can satisfy them
// and the entire lifecycle becomes assertable.
//
// SECURITY-15: every external call is wrapped, every internal promise chain ends in a terminal
// `.catch`, so no unhandled rejection can exist, and `play` is wrapped so it can never throw in any
// state. SECURITY-09: nothing is logged and no engine detail, error code or stack reaches anyone —
// an unsupported browser or a failed buffer is silence, which is the correct user-visible outcome
// for a decorative subsystem.

/** Anything this module connects to something else. */
export interface AudioNodeLike {
  connect(destination: AudioNodeLike): void
  disconnect(): void
}

export interface AudioBufferLike {
  readonly length: number
  readonly sampleRate: number
  getChannelData(channel: number): Float32Array
}

export interface AudioBufferSourceNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null
  onended: (() => void) | null
  start(when?: number): void
  stop(when?: number): void
}

export interface GainNodeLike extends AudioNodeLike {
  readonly gain: { value: number }
}

export interface AudioContextLike {
  readonly state: string
  readonly sampleRate: number
  readonly destination: AudioNodeLike
  readonly currentTime: number
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike
  createBufferSource(): AudioBufferSourceNodeLike
  createGain(): GainNodeLike
  resume(): Promise<void>
  close(): Promise<void>
}

export type SoundCue = 'celebration' | 'fusePop' | 'spark' | 'place' | 'connect'

/** Every cue, in preload order. Exported so a caller can iterate without restating the union. */
export const SOUND_CUES: readonly SoundCue[] = ['celebration', 'fusePop', 'spark', 'place', 'connect']

export type AudioLifecycleState = 'idle' | 'unlocking' | 'ready' | 'unsupported' | 'disposed'

/** The one place a real `AudioContext` is reached. Swapped for a fake in tests. */
export interface AudioAdapter {
  createContext: () => AudioContextLike | null
}

/**
 * How a cue's buffer comes into being.
 *
 * Synthesis today (D4); the seam is here so a later unit can fetch real files without touching the
 * lifecycle. A loader may return a buffer or a promise of one, and may reject — a single failed cue
 * leaves the others playable.
 */
export type SoundLoader = (
  context: AudioContextLike,
  cue: SoundCue
) => AudioBufferLike | Promise<AudioBufferLike>

export interface CircuitAudio {
  unlock(): void
  play(cue: SoundCue): void
  dispose(): void
  readonly state: AudioLifecycleState
}

export interface CircuitAudioOptions {
  adapter?: AudioAdapter
  loader?: SoundLoader
  /** Re-read on EVERY play, so a mute toggle takes effect on the next sound (NFR-CB-14). */
  isSoundEnabled: () => boolean
}

/** Peak amplitude of a synthesised cue. Well under 1 so nothing clips when two cues overlap. */
const CUE_PEAK = 0.22

/** Playback gain. A game's feedback sound should be noticed, not announced. */
const CUE_GAIN = 0.5

const FALLBACK_SAMPLE_RATE = 48000

/**
 * Cue lengths in milliseconds. Every one is at or under 1 s, which keeps all five mono buffers
 * inside roughly 260 KB of Float32 at 48 kHz — comfortably under the 430 KB budget.
 */
const CUE_DURATION_MS: Record<SoundCue, number> = {
  celebration: 900,
  fusePop: 180,
  spark: 90,
  place: 60,
  connect: 110,
}

function clampSample(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(1, Math.max(-1, value))
}

/** A tiny deterministic noise source, so a synthesised cue is reproducible run to run. */
function noiseSource(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return (state / 2147483648) * 2 - 1
  }
}

/** Three rising notes with an exponential decay each — the success jingle. */
function writeCelebration(data: Float32Array, sampleRate: number): void {
  const notes = [523.25, 659.25, 783.99]
  const noteFrames = Math.max(1, Math.floor(data.length / notes.length))
  for (let frame = 0; frame < data.length; frame += 1) {
    const seconds = frame / sampleRate
    let sample = 0
    for (let note = 0; note < notes.length; note += 1) {
      const start = note * noteFrames
      if (frame < start) {
        continue
      }
      const age = (frame - start) / sampleRate
      sample += Math.sin(2 * Math.PI * notes[note] * seconds) * Math.exp(-age * 4.5)
    }
    data[frame] = clampSample(sample * CUE_PEAK)
  }
}

/** Low-passed noise with a fast decay: the blown fuse. */
function writeFusePop(data: Float32Array, sampleRate: number): void {
  const noise = noiseSource(7919)
  let filtered = 0
  for (let frame = 0; frame < data.length; frame += 1) {
    // A one-pole low pass, which is what makes it a thud rather than a hiss.
    filtered += (noise() - filtered) * 0.12
    const age = frame / sampleRate
    data[frame] = clampSample(filtered * Math.exp(-age * 26) * CUE_PEAK * 4)
  }
}

/** Very short, very bright noise: the spark. */
function writeSpark(data: Float32Array, sampleRate: number): void {
  const noise = noiseSource(104729)
  for (let frame = 0; frame < data.length; frame += 1) {
    const age = frame / sampleRate
    data[frame] = clampSample(noise() * Math.exp(-age * 48) * CUE_PEAK)
  }
}

/** A soft click, for dropping a component on the grid. */
function writePlace(data: Float32Array, sampleRate: number): void {
  for (let frame = 0; frame < data.length; frame += 1) {
    const age = frame / sampleRate
    const body = Math.sin(2 * Math.PI * 320 * age) * Math.exp(-age * 60)
    data[frame] = clampSample(body * CUE_PEAK)
  }
}

/** A two-tone blip, for completing a connection. */
function writeConnect(data: Float32Array, sampleRate: number): void {
  const half = Math.max(1, Math.floor(data.length / 2))
  for (let frame = 0; frame < data.length; frame += 1) {
    const age = frame / sampleRate
    const frequency = frame < half ? 440 : 660
    data[frame] = clampSample(Math.sin(2 * Math.PI * frequency * age) * Math.exp(-age * 12) * CUE_PEAK)
  }
}

const CUE_WRITERS: Record<SoundCue, (data: Float32Array, sampleRate: number) => void> = {
  celebration: writeCelebration,
  fusePop: writeFusePop,
  spark: writeSpark,
  place: writePlace,
  connect: writeConnect,
}

/**
 * Build one cue's buffer in the context, with no network and no asset.
 *
 * Exported so the synthesis can be exercised on its own, and so a replacement loader can reuse it
 * for the cues it has no file for.
 */
export function synthesiseCue(context: AudioContextLike, cue: SoundCue): AudioBufferLike {
  const rate =
    Number.isFinite(context.sampleRate) && context.sampleRate > 0
      ? context.sampleRate
      : FALLBACK_SAMPLE_RATE
  const frames = Math.max(1, Math.round((CUE_DURATION_MS[cue] / 1000) * rate))
  const buffer = context.createBuffer(1, frames, rate)
  const data = buffer.getChannelData(0)
  CUE_WRITERS[cue](data, rate)
  return buffer
}

const synthesisLoader: SoundLoader = (context, cue) => synthesiseCue(context, cue)

interface WebAudioWindow {
  AudioContext?: new () => unknown
  webkitAudioContext?: new () => unknown
}

const browserAdapter: AudioAdapter = {
  createContext: () => {
    if (typeof window === 'undefined') {
      return null
    }
    const scope = window as unknown as WebAudioWindow
    const Constructor = scope.AudioContext ?? scope.webkitAudioContext
    if (typeof Constructor !== 'function') {
      return null
    }
    // The real Web Audio types are a superset of the narrow structural types above, which exist so
    // a node-environment fake can satisfy them. One cast at the single boundary where a real
    // context is produced keeps every other line of this module honestly typed.
    return new Constructor() as AudioContextLike
  },
}

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

/**
 * Settle a promise-or-value without ever leaving a rejection unhandled.
 *
 * The `.catch` after `.then(onDone, onFail)` is not redundant: it is what guarantees a terminal
 * handler even if `onDone` itself throws, which is the SECURITY-15 requirement.
 */
function settle(value: unknown, onDone: () => void, onFail: () => void): void {
  if (!isThenable(value)) {
    onDone()
    return
  }
  value.then(onDone, onFail).catch(() => undefined)
}

/**
 * Create the audio service.
 *
 * Constructs nothing: no context, no buffer, no node. The first `unlock()` from a user gesture is
 * what brings the service to life, and a browser that cannot provide a context leaves it
 * permanently and silently `unsupported`.
 */
export function createCircuitAudio({
  adapter = browserAdapter,
  loader = synthesisLoader,
  isSoundEnabled,
}: CircuitAudioOptions): CircuitAudio {
  let state: AudioLifecycleState = 'idle'
  let context: AudioContextLike | null = null
  const buffers = new Map<SoundCue, AudioBufferLike>()
  const live = new Set<AudioBufferSourceNodeLike>()

  const closeContext = (): void => {
    const closing = context
    context = null
    if (closing === null) {
      return
    }
    try {
      settle(
        closing.close(),
        () => undefined,
        () => undefined
      )
    } catch {
      // A context that refuses to close is already past being useful; there is nothing to report.
    }
  }

  /** Permanent, silent, and reached from every failure path. */
  const markUnsupported = (): void => {
    if (state === 'disposed') {
      return
    }
    state = 'unsupported'
    buffers.clear()
    live.clear()
    closeContext()
  }

  const loadCue = (active: AudioContextLike, cue: SoundCue): Promise<void> =>
    new Promise<void>((resolve) => {
      const keep = (buffer: unknown): void => {
        if (state !== 'disposed' && state !== 'unsupported' && buffer !== null && buffer !== undefined) {
          buffers.set(cue, buffer as AudioBufferLike)
        }
        resolve()
      }
      try {
        const produced = loader(active, cue)
        if (isThenable(produced)) {
          produced.then(keep, () => resolve()).catch(() => resolve())
          return
        }
        keep(produced)
      } catch {
        // One cue failing to synthesise leaves every other cue playable.
        resolve()
      }
    })

  /** Preloading IS synthesis (D4), and it happens after unlock, never before (S5 step 3). */
  const preload = (active: AudioContextLike): void => {
    const pending = SOUND_CUES.map((cue) => loadCue(active, cue))
    Promise.all(pending)
      .then(
        () => {
          if (state === 'unlocking') {
            state = 'ready'
          }
        },
        () => undefined
      )
      .catch(() => undefined)
  }

  const unlock = (): void => {
    // Idempotent by state, so a caller can wire it to every gesture handler without a guard.
    if (state !== 'idle') {
      return
    }
    state = 'unlocking'

    let created: AudioContextLike | null = null
    try {
      created = adapter.createContext()
    } catch {
      // A browser that throws on construction is indistinguishable from one without Web Audio.
      created = null
    }
    if (created === null || created === undefined) {
      state = 'unsupported'
      return
    }
    context = created

    try {
      settle(
        created.resume(),
        () => preload(created),
        () => markUnsupported()
      )
    } catch {
      markUnsupported()
    }
  }

  const soundIsOn = (): boolean => {
    try {
      return isSoundEnabled() === true
    } catch {
      // A preference getter that throws is read as "off": the quiet outcome is the safe one.
      return false
    }
  }

  const play = (cue: SoundCue): void => {
    // The whole body is wrapped: `play` is called from render-adjacent code and from event
    // handlers, and a decorative sound must never be able to break a game interaction.
    try {
      if (state !== 'ready') {
        return
      }
      const active = context
      if (active === null) {
        return
      }
      if (!soundIsOn()) {
        return
      }
      const buffer = buffers.get(cue)
      if (buffer === undefined) {
        // Dropped, not queued: a sound that arrives late is worse than one that never arrives.
        return
      }

      const source = active.createBufferSource()
      const gain = active.createGain()
      source.buffer = buffer
      gain.gain.value = CUE_GAIN
      source.connect(gain)
      gain.connect(active.destination)
      source.onended = () => {
        live.delete(source)
        try {
          source.disconnect()
          gain.disconnect()
        } catch {
          // Already torn down by `dispose`.
        }
      }
      live.add(source)
      source.start()
    } catch {
      // Silence is the correct user-visible failure for audio (SECURITY-09).
    }
  }

  const dispose = (): void => {
    if (state === 'disposed') {
      return
    }
    state = 'disposed'
    for (const source of live) {
      try {
        source.onended = null
        source.stop()
        source.disconnect()
      } catch {
        // A source that has already ended throws on stop in some browsers.
      }
    }
    live.clear()
    buffers.clear()
    closeContext()
  }

  return {
    unlock,
    play,
    dispose,
    get state(): AudioLifecycleState {
      return state
    },
  }
}
