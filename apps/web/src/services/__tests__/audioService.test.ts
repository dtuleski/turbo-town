import { describe, expect, it } from 'vitest'
import { SOUND_CUES, createCircuitAudio } from '../audioService'
import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  CircuitAudio,
  SoundCue,
  SoundLoader,
} from '../audioService'
import { isActivatingPhase } from '../../utils/circuitBuilderInteraction'
import type { PointerPhase } from '../../utils/circuitBuilderInteraction'

const SAMPLE_RATE = 48000

interface SourceRecord {
  start: number
  stop: number
  connect: number
  disconnect: number
}

interface RecordingSource extends AudioBufferSourceNodeLike {
  readonly record: SourceRecord
}

interface FakeContext {
  context: AudioContextLike
  sources: RecordingSource[]
  counters: {
    resume: number
    close: number
    gains: number
    bufferLengths: number[]
  }
}

interface FakeContextOptions {
  resumeRejects?: boolean
  closeRejects?: boolean
}

/**
 * A fake `AudioContextLike`.
 *
 * Vitest runs in the node environment here, so there is no real `AudioContext` to drive. The
 * service's structural types are narrow enough that this plain object satisfies them, which is what
 * makes the whole lifecycle — unlock, preload, play, dispose — assertable.
 */
function fakeContext(options: FakeContextOptions = {}): FakeContext {
  const sources: RecordingSource[] = []
  const counters = { resume: 0, close: 0, gains: 0, bufferLengths: [] as number[] }

  const context: AudioContextLike = {
    state: 'suspended',
    sampleRate: SAMPLE_RATE,
    destination: { connect: () => undefined, disconnect: () => undefined },
    currentTime: 0,
    createBuffer: (_channels, length, sampleRate) => {
      counters.bufferLengths.push(length)
      const data = new Float32Array(length)
      return { length, sampleRate, getChannelData: () => data }
    },
    createBufferSource: () => {
      const record: SourceRecord = { start: 0, stop: 0, connect: 0, disconnect: 0 }
      const source: RecordingSource = {
        buffer: null,
        onended: null,
        record,
        start: () => {
          record.start += 1
        },
        stop: () => {
          record.stop += 1
        },
        connect: () => {
          record.connect += 1
        },
        disconnect: () => {
          record.disconnect += 1
        },
      }
      sources.push(source)
      return source
    },
    createGain: () => {
      counters.gains += 1
      return { gain: { value: 0 }, connect: () => undefined, disconnect: () => undefined }
    },
    resume: () => {
      counters.resume += 1
      return options.resumeRejects === true
        ? Promise.reject(new Error('autoplay blocked'))
        : Promise.resolve()
    },
    close: () => {
      counters.close += 1
      return options.closeRejects === true
        ? Promise.reject(new Error('context busy'))
        : Promise.resolve()
    },
  }

  return { context, sources, counters }
}

/**
 * The node process, reached through `globalThis` and typed locally.
 *
 * `apps/web` is browser code, so its tsconfig has no `@types/node`, and adding the dependency for
 * one assertion is out of scope. The probe needs exactly two methods for one event name.
 */
interface RejectionProbeHost {
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): void
  off(event: 'unhandledRejection', listener: (reason: unknown) => void): void
}

const nodeProcess = (globalThis as unknown as { process: RejectionProbeHost }).process

/** Let every queued microtask and timer callback run, so preload has settled. */
function flush(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

describe('createCircuitAudio lifecycle', () => {
  it('constructs nothing until a gesture unlocks it', () => {
    let created = 0
    const audio = createCircuitAudio({
      adapter: {
        createContext: () => {
          created += 1
          return fakeContext().context
        },
      },
      isSoundEnabled: () => true,
    })

    audio.play('celebration')
    expect(created).toBe(0)
    expect(audio.state).toBe('idle')

    audio.unlock()
    expect(created).toBe(1)
  })

  it('becomes ready after unlock and resumes the context exactly once', async () => {
    const fake = fakeContext()
    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      isSoundEnabled: () => true,
    })

    audio.unlock()
    expect(audio.state).toBe('unlocking')
    audio.unlock()

    await flush()
    expect(audio.state).toBe('ready')
    expect(fake.counters.resume).toBe(1)
  })

  it('preloads every cue only after unlock, each inside the one-second budget', async () => {
    const fake = fakeContext()
    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      isSoundEnabled: () => true,
    })
    expect(fake.counters.bufferLengths).toHaveLength(0)

    audio.unlock()
    await flush()

    expect(fake.counters.bufferLengths).toHaveLength(SOUND_CUES.length)
    for (const length of fake.counters.bufferLengths) {
      expect(length).toBeGreaterThan(0)
      expect(length).toBeLessThanOrEqual(SAMPLE_RATE)
    }
  })

  it('plays a cue through a tracked source that releases itself on end', async () => {
    const fake = fakeContext()
    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      isSoundEnabled: () => true,
    })

    audio.unlock()
    await flush()
    audio.play('spark')

    expect(fake.sources).toHaveLength(1)
    const source = fake.sources[0]
    expect(source?.record.start).toBe(1)
    expect(source?.record.connect).toBe(1)
    expect(source?.buffer).not.toBeNull()

    source?.onended?.()
    expect(source?.record.disconnect).toBe(1)

    // The source is no longer live, so disposing does not try to stop it again.
    audio.dispose()
    expect(source?.record.stop).toBe(0)
  })
})

describe('createCircuitAudio makes no sound it should not', () => {
  it('creates zero buffer sources while muted', async () => {
    const fake = fakeContext()
    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      isSoundEnabled: () => false,
    })

    audio.unlock()
    await flush()
    expect(audio.state).toBe('ready')

    audio.play('celebration')
    audio.play('fusePop')
    expect(fake.sources).toHaveLength(0)
  })

  it('re-reads the preference on every play', async () => {
    const fake = fakeContext()
    let enabled = true
    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      isSoundEnabled: () => enabled,
    })

    audio.unlock()
    await flush()

    audio.play('place')
    enabled = false
    audio.play('place')

    expect(fake.sources).toHaveLength(1)
  })

  it('stays silent when the preference getter throws', async () => {
    const fake = fakeContext()
    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      isSoundEnabled: () => {
        throw new Error('preference unreadable')
      },
    })

    audio.unlock()
    await flush()
    expect(() => audio.play('connect')).not.toThrow()
    expect(fake.sources).toHaveLength(0)
  })
})

describe('createCircuitAudio degrades silently', () => {
  it('is permanently unsupported when the adapter returns no context', () => {
    const audio = createCircuitAudio({
      adapter: { createContext: () => null },
      isSoundEnabled: () => true,
    })

    audio.unlock()
    expect(audio.state).toBe('unsupported')
    expect(() => audio.play('celebration')).not.toThrow()

    audio.unlock()
    expect(audio.state).toBe('unsupported')
  })

  it('is permanently unsupported when the adapter throws', () => {
    const audio = createCircuitAudio({
      adapter: {
        createContext: () => {
          throw new Error('AudioContext is not a constructor')
        },
      },
      isSoundEnabled: () => true,
    })

    expect(() => audio.unlock()).not.toThrow()
    expect(audio.state).toBe('unsupported')
    expect(() => audio.play('spark')).not.toThrow()
  })

  it('leaves the other cues playable when one buffer fails', async () => {
    const fake = fakeContext()
    const failing: SoundLoader = (context, cue) => {
      if (cue === 'celebration') {
        return Promise.reject(new Error('cue unavailable'))
      }
      const length = 128
      const data = new Float32Array(length)
      const buffer: AudioBufferLike = {
        length,
        sampleRate: context.sampleRate,
        getChannelData: () => data,
      }
      return Promise.resolve(buffer)
    }

    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      loader: failing,
      isSoundEnabled: () => true,
    })

    audio.unlock()
    await flush()
    expect(audio.state).toBe('ready')

    // The missing cue is dropped, never queued.
    expect(() => audio.play('celebration')).not.toThrow()
    expect(fake.sources).toHaveLength(0)

    audio.play('fusePop')
    expect(fake.sources).toHaveLength(1)
  })

  it('survives a loader that throws synchronously', async () => {
    const fake = fakeContext()
    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      loader: (_context, cue) => {
        if (cue === 'spark') {
          throw new Error('synthesis failed')
        }
        const data = new Float32Array(64)
        return { length: 64, sampleRate: SAMPLE_RATE, getChannelData: () => data }
      },
      isSoundEnabled: () => true,
    })

    audio.unlock()
    await flush()
    expect(audio.state).toBe('ready')
    audio.play('spark')
    expect(fake.sources).toHaveLength(0)
    audio.play('place')
    expect(fake.sources).toHaveLength(1)
  })

  it('becomes unsupported when resume rejects, with no unhandled rejection', async () => {
    const seen: unknown[] = []
    const probe = (reason: unknown): void => {
      seen.push(reason)
    }
    nodeProcess.on('unhandledRejection', probe)

    try {
      const fake = fakeContext({ resumeRejects: true })
      const audio = createCircuitAudio({
        adapter: { createContext: () => fake.context },
        isSoundEnabled: () => true,
      })

      audio.unlock()
      await flush()
      await flush()

      expect(audio.state).toBe('unsupported')
      expect(fake.counters.bufferLengths).toHaveLength(0)
      expect(() => audio.play('celebration')).not.toThrow()
      expect(fake.sources).toHaveLength(0)
    } finally {
      nodeProcess.off('unhandledRejection', probe)
    }

    expect(seen).toHaveLength(0)
  })

  it('survives a close that rejects, with no unhandled rejection', async () => {
    const seen: unknown[] = []
    const probe = (reason: unknown): void => {
      seen.push(reason)
    }
    nodeProcess.on('unhandledRejection', probe)

    try {
      const fake = fakeContext({ closeRejects: true })
      const audio = createCircuitAudio({
        adapter: { createContext: () => fake.context },
        isSoundEnabled: () => true,
      })

      audio.unlock()
      await flush()
      expect(() => audio.dispose()).not.toThrow()
      await flush()
      await flush()

      expect(audio.state).toBe('disposed')
      expect(fake.counters.close).toBe(1)
    } finally {
      nodeProcess.off('unhandledRejection', probe)
    }

    expect(seen).toHaveLength(0)
  })
})

describe('createCircuitAudio disposal', () => {
  it('closes the context once, stops live sources, and never sounds again', async () => {
    const fake = fakeContext()
    const audio = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      isSoundEnabled: () => true,
    })

    audio.unlock()
    await flush()
    audio.play('celebration')
    expect(fake.sources).toHaveLength(1)
    const source = fake.sources[0]

    audio.dispose()
    expect(audio.state).toBe('disposed')
    expect(fake.counters.close).toBe(1)
    expect(source?.record.stop).toBe(1)
    expect(source?.record.disconnect).toBe(1)

    audio.play('celebration')
    audio.unlock()
    audio.dispose()
    expect(fake.sources).toHaveLength(1)
    expect(fake.counters.close).toBe(1)
    expect(audio.state).toBe('disposed')
  })

  it('disposes cleanly having never been unlocked', () => {
    let created = 0
    const audio = createCircuitAudio({
      adapter: {
        createContext: () => {
          created += 1
          return fakeContext().context
        },
      },
      isSoundEnabled: () => true,
    })

    expect(() => audio.dispose()).not.toThrow()
    expect(created).toBe(0)
    expect(audio.state).toBe('disposed')
  })
})

describe('play never throws, in any state', () => {
  const everyCue: readonly SoundCue[] = SOUND_CUES

  function playAll(play: (cue: SoundCue) => void): void {
    for (const cue of everyCue) {
      play(cue)
    }
  }

  it('is safe in idle, unlocking, ready, unsupported and disposed', async () => {
    const fake = fakeContext()
    const live = createCircuitAudio({
      adapter: { createContext: () => fake.context },
      isSoundEnabled: () => true,
    })

    expect(live.state).toBe('idle')
    expect(() => playAll(live.play)).not.toThrow()

    live.unlock()
    expect(live.state).toBe('unlocking')
    expect(() => playAll(live.play)).not.toThrow()

    await flush()
    expect(live.state).toBe('ready')
    expect(() => playAll(live.play)).not.toThrow()

    live.dispose()
    expect(live.state).toBe('disposed')
    expect(() => playAll(live.play)).not.toThrow()

    const broken = createCircuitAudio({
      adapter: { createContext: () => null },
      isSoundEnabled: () => true,
    })
    broken.unlock()
    expect(broken.state).toBe('unsupported')
    expect(() => playAll(broken.play)).not.toThrow()
  })

  it('is safe when the context itself throws on every call', async () => {
    const hostile: AudioContextLike = {
      state: 'running',
      sampleRate: SAMPLE_RATE,
      destination: { connect: () => undefined, disconnect: () => undefined },
      currentTime: 0,
      createBuffer: (_channels, length, sampleRate) => {
        const data = new Float32Array(length)
        return { length, sampleRate, getChannelData: () => data }
      },
      createBufferSource: () => {
        throw new Error('no sources available')
      },
      createGain: () => {
        throw new Error('no gain available')
      },
      resume: () => Promise.resolve(),
      close: () => Promise.resolve(),
    }

    const audio = createCircuitAudio({
      adapter: { createContext: () => hostile },
      isSoundEnabled: () => true,
    })

    audio.unlock()
    await flush()
    expect(() => playAll(audio.play)).not.toThrow()
  })
})

/**
 * The one-shot unlock must be spent on real user activation, never on a hover (CB-6.5).
 *
 * `CircuitBuilderSurface` cannot be rendered here — `apps/web` has no DOM test environment — so the
 * rule itself lives in `isActivatingPhase`, and `reportPointer` below is the surface's
 * `handlePointerEvent` guard reproduced in one line. `GridCanvas` reports `move` on `onMouseMove`
 * and `cancel` on `onMouseLeave`, so an unfiltered unlock would be spent before the player has
 * pressed anything.
 */
describe('only activating pointer input unlocks audio', () => {
  /** What a plain hover across the grid and back out produces, in order. */
  const HOVER_SEQUENCE: readonly PointerPhase[] = ['move', 'move', 'move', 'cancel']

  function reportPointer(audio: CircuitAudio, phases: readonly PointerPhase[]): void {
    for (const phase of phases) {
      if (isActivatingPhase(phase)) {
        audio.unlock()
      }
    }
  }

  /** A context whose `resume()` rejects until activation is granted — Safari and Firefox outside a
   * gesture. The returned `fake` still records sources, because only `resume` is replaced. */
  function gestureStrictContext(activation: { granted: boolean }): {
    context: AudioContextLike
    fake: FakeContext
  } {
    const fake = fakeContext()
    const context: AudioContextLike = {
      ...fake.context,
      resume: () =>
        activation.granted
          ? Promise.resolve()
          : Promise.reject(new Error('gesture required')),
    }
    return { context, fake }
  }

  it('treats down and up as activating and move and cancel as not', () => {
    expect(isActivatingPhase('down')).toBe(true)
    expect(isActivatingPhase('up')).toBe(true)
    expect(isActivatingPhase('move')).toBe(false)
    expect(isActivatingPhase('cancel')).toBe(false)
  })

  it('creates no AudioContext while the pointer only hovers the grid', () => {
    let created = 0
    const audio = createCircuitAudio({
      adapter: {
        createContext: () => {
          created += 1
          return fakeContext().context
        },
      },
      isSoundEnabled: () => true,
    })

    reportPointer(audio, HOVER_SEQUENCE)

    expect(created).toBe(0)
    expect(audio.state).toBe('idle')
  })

  it('still has its one unlock left for the first press after any amount of hovering', async () => {
    let created = 0
    const fake = fakeContext()
    const audio = createCircuitAudio({
      adapter: {
        createContext: () => {
          created += 1
          return fake.context
        },
      },
      isSoundEnabled: () => true,
    })

    reportPointer(audio, HOVER_SEQUENCE)
    expect(created).toBe(0)

    reportPointer(audio, ['down', 'move', 'up'])
    expect(created).toBe(1)
    await flush()
    expect(audio.state).toBe('ready')

    audio.play('fusePop')
    expect(fake.sources).toHaveLength(1)
  })

  it('reaches ready on a gesture-strict browser, where unlocking on hover would latch unsupported', async () => {
    const activation = { granted: false }
    const strict = gestureStrictContext(activation)
    const audio = createCircuitAudio({
      adapter: { createContext: () => strict.context },
      isSoundEnabled: () => true,
    })

    // The real wiring: the hover changes nothing, so `resume()` is never called without activation.
    reportPointer(audio, HOVER_SEQUENCE)
    expect(audio.state).toBe('idle')
    expect(strict.fake.counters.resume).toBe(0)

    activation.granted = true
    reportPointer(audio, ['down'])
    await flush()
    expect(audio.state).toBe('ready')

    // The counterfactual, which is what this test exists to keep out: an unfiltered unlock spends
    // the one shot on the hover, `resume()` rejects with no activation behind it, and the service
    // is permanently `unsupported` — a later real press cannot recover it.
    const carelessActivation = { granted: false }
    const careless = gestureStrictContext(carelessActivation)
    const unfiltered = createCircuitAudio({
      adapter: { createContext: () => careless.context },
      isSoundEnabled: () => true,
    })

    unfiltered.unlock()
    await flush()
    expect(unfiltered.state).toBe('unsupported')

    carelessActivation.granted = true
    unfiltered.unlock()
    await flush()
    expect(unfiltered.state).toBe('unsupported')
    unfiltered.play('fusePop')
    expect(careless.fake.sources).toHaveLength(0)
  })
})
