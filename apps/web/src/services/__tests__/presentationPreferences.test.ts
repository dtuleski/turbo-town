import { describe, expect, it } from 'vitest'
import {
  REDUCED_MOTION_QUERY,
  readReducedMotion,
  readSoundPreference,
  subscribeReducedMotion,
  writeSoundPreference,
} from '../presentationPreferences'
import type { PreferencesEnvironment } from '../presentationPreferences'
import { CircuitEffects } from '../../utils/circuitBuilderEffects'
import type { GridPosition } from '../../utils/circuitEngine'

type ChangeListener = (event: { matches: boolean }) => void

interface FakeMedia {
  env: PreferencesEnvironment
  listenerCount: () => number
  fire: (matches: boolean) => void
  queries: string[]
}

/** A `matchMedia` speaking the standard `addEventListener('change')` API. */
function modernMedia(initial: boolean): FakeMedia {
  const listeners = new Set<ChangeListener>()
  const queries: string[] = []
  const list = {
    matches: initial,
    addEventListener(_type: 'change', listener: ChangeListener): void {
      listeners.add(listener)
    },
    removeEventListener(_type: 'change', listener: ChangeListener): void {
      listeners.delete(listener)
    },
  }
  return {
    env: {
      matchMedia: (query) => {
        queries.push(query)
        return list
      },
    },
    listenerCount: () => listeners.size,
    fire: (matches) => {
      list.matches = matches
      for (const listener of [...listeners]) {
        listener({ matches })
      }
    },
    queries,
  }
}

/** A `matchMedia` offering only the deprecated `addListener`, as older Safari does. */
function legacyMedia(initial: boolean): FakeMedia {
  const listeners = new Set<ChangeListener>()
  const queries: string[] = []
  const list = {
    matches: initial,
    addListener(listener: ChangeListener): void {
      listeners.add(listener)
    },
    removeListener(listener: ChangeListener): void {
      listeners.delete(listener)
    },
  }
  return {
    env: {
      matchMedia: (query) => {
        queries.push(query)
        return list
      },
    },
    listenerCount: () => listeners.size,
    fire: (matches) => {
      list.matches = matches
      for (const listener of [...listeners]) {
        listener({ matches })
      }
    },
    queries,
  }
}

/** A fixed pseudo-random source, so a run is reproducible. */
function sequence(): () => number {
  let seed = 1
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
}

describe('readReducedMotion', () => {
  it('is false when the environment cannot be asked at all', () => {
    expect(readReducedMotion({})).toBe(false)
  })

  it('reads the matching media query', () => {
    const media = modernMedia(true)
    expect(readReducedMotion(media.env)).toBe(true)
    expect(media.queries).toEqual([REDUCED_MOTION_QUERY])
  })

  it('is false when the query does not match', () => {
    expect(readReducedMotion(modernMedia(false).env)).toBe(false)
  })

  it('degrades to false when matchMedia throws, without throwing out', () => {
    const env: PreferencesEnvironment = {
      matchMedia: () => {
        throw new Error('matchMedia is unavailable')
      },
    }
    expect(() => readReducedMotion(env)).not.toThrow()
    expect(readReducedMotion(env)).toBe(false)
  })

  it('is false when matchMedia returns nothing', () => {
    expect(readReducedMotion({ matchMedia: () => null })).toBe(false)
  })
})

describe('subscribeReducedMotion', () => {
  it('returns a usable no-op unsubscribe when there is no matchMedia', () => {
    let calls = 0
    const unsubscribe = subscribeReducedMotion(() => {
      calls += 1
    }, {})
    expect(() => unsubscribe()).not.toThrow()
    expect(calls).toBe(0)
  })

  it('reports a change with the new value', () => {
    const media = modernMedia(false)
    const seen: boolean[] = []
    subscribeReducedMotion((enabled) => seen.push(enabled), media.env)

    media.fire(true)
    media.fire(false)
    expect(seen).toEqual([true, false])
  })

  it('removes the listener on unsubscribe, so a later change is not delivered', () => {
    const media = modernMedia(false)
    const seen: boolean[] = []
    const unsubscribe = subscribeReducedMotion((enabled) => seen.push(enabled), media.env)
    expect(media.listenerCount()).toBe(1)

    media.fire(true)
    unsubscribe()
    expect(media.listenerCount()).toBe(0)

    media.fire(false)
    expect(seen).toEqual([true])
  })

  it('drives and tears down a legacy addListener-only implementation', () => {
    const media = legacyMedia(false)
    const seen: boolean[] = []
    const unsubscribe = subscribeReducedMotion((enabled) => seen.push(enabled), media.env)
    expect(media.listenerCount()).toBe(1)

    media.fire(true)
    expect(seen).toEqual([true])

    unsubscribe()
    expect(media.listenerCount()).toBe(0)
    media.fire(false)
    expect(seen).toEqual([true])
  })

  it('returns a no-op unsubscribe when matchMedia throws', () => {
    const unsubscribe = subscribeReducedMotion(
      () => undefined,
      {
        matchMedia: () => {
          throw new Error('matchMedia is unavailable')
        },
      }
    )
    expect(() => unsubscribe()).not.toThrow()
  })

  it('keeps the subscription alive when a consumer throws', () => {
    const media = modernMedia(false)
    const seen: boolean[] = []
    subscribeReducedMotion((enabled) => {
      seen.push(enabled)
      throw new Error('consumer failed')
    }, media.env)

    expect(() => media.fire(true)).not.toThrow()
    expect(() => media.fire(false)).not.toThrow()
    expect(seen).toEqual([true, false])
  })
})

describe('the sound preference', () => {
  it('is enabled when there is no storage to read', () => {
    expect(readSoundPreference({})).toBe(true)
  })

  it('is enabled when the key is absent', () => {
    expect(readSoundPreference({ readStored: () => null })).toBe(true)
  })

  it('is disabled by an explicitly stored false, quoted or not', () => {
    expect(readSoundPreference({ readStored: () => 'false' })).toBe(false)
    expect(readSoundPreference({ readStored: () => '"false"' })).toBe(false)
  })

  it('is enabled by a stored true', () => {
    expect(readSoundPreference({ readStored: () => 'true' })).toBe(true)
  })

  it('is enabled when the stored value is garbage', () => {
    expect(readSoundPreference({ readStored: () => '{not json at all' })).toBe(true)
    expect(readSoundPreference({ readStored: () => '' })).toBe(true)
  })

  it('is enabled when the storage getter throws, without throwing out', () => {
    const env: PreferencesEnvironment = {
      readStored: () => {
        throw new Error('storage is blocked')
      },
    }
    expect(() => readSoundPreference(env)).not.toThrow()
    expect(readSoundPreference(env)).toBe(true)
  })

  it('round-trips through the writer it is read with', () => {
    let stored: string | null = null
    const env: PreferencesEnvironment = {
      readStored: () => stored,
      writeStored: (value) => {
        stored = value
      },
    }

    writeSoundPreference(false, env)
    expect(stored).toBe('false')
    expect(readSoundPreference(env)).toBe(false)

    writeSoundPreference(true, env)
    expect(stored).toBe('true')
    expect(readSoundPreference(env)).toBe(true)
  })

  it('swallows a failing write, because an unsaved preference still applies this session', () => {
    expect(() =>
      writeSoundPreference(false, {
        writeStored: () => {
          throw new Error('storage is full')
        },
      })
    ).not.toThrow()
  })

  it('does nothing at all when there is no writer', () => {
    expect(() => writeSoundPreference(false, {})).not.toThrow()
  })
})

describe('the adapter reaches the effects layer', () => {
  const at: GridPosition = { col: 7, row: 4, rotation: 0 }

  it('turns a media-query change into a static mark instead of particles', () => {
    const media = modernMedia(false)
    const effects = new CircuitEffects(sequence())
    const unsubscribe = subscribeReducedMotion(
      (enabled) => effects.setReducedMotion(enabled),
      media.env
    )

    media.fire(true)
    effects.emitSparks(at, 1)

    // Substitution, not silence: no animation, but the fault is still shown.
    expect(effects.activeParticleCount).toBe(0)
    expect(effects.staticMarks).toHaveLength(1)
    expect(effects.staticMarks[0]?.cell).toEqual({ col: at.col, row: at.row })

    unsubscribe()
  })

  it('switches animation back on when the preference is withdrawn', () => {
    const media = modernMedia(true)
    const effects = new CircuitEffects(sequence())
    const unsubscribe = subscribeReducedMotion(
      (enabled) => effects.setReducedMotion(enabled),
      media.env
    )

    media.fire(true)
    effects.emitSparks(at, 1)
    expect(effects.activeParticleCount).toBe(0)

    media.fire(false)
    effects.emitSparks(at, 1)
    expect(effects.activeParticleCount).toBeGreaterThan(0)

    unsubscribe()
  })
})
