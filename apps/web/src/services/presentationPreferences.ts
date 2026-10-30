// Circuit Builder — presentation preferences adapter (component D3).
//
// Two preferences, one module: the operating system's `prefers-reduced-motion`, exposed reactively,
// and the player's stored sound preference. No React import, because nothing here needs a render
// to be correct and the hook wrapper (`usePresentationPreferences`) is where component scope lives.
//
// EVERY browser call sits behind the `PreferencesEnvironment` seam. That is not decoration: this
// package's Vitest runs in the NODE environment with no jsdom, so `window`, `localStorage` and
// `matchMedia` are all `undefined` inside a test. A module that reached them directly could not be
// tested at all. The seam also delivers the required degradation — an absent or throwing browser
// API returns the documented default instead of propagating a failure (SECURITY-15, fail closed).
//
// Nothing here throws out and nothing is logged. A preference read is not an event worth a console
// line, and a log of what a browser does or does not support is engine detail the player must never
// see (SECURITY-09).
//
// WHY `env.features.enableSoundEffects` IS DELIBERATELY NOT CONSULTED.
// `apps/web/src/config/env.ts` already defines a build-time flag,
// `enableSoundEffects: import.meta.env.VITE_ENABLE_SOUND_EFFECTS === 'true'`. It is read nowhere in
// the codebase today, and it evaluates to `false` whenever `VITE_ENABLE_SOUND_EFFECTS` is unset —
// which is every environment that has not explicitly opted in, including local development and the
// current Vercel projects. Honouring it would therefore mute the game everywhere, a silent failure
// indistinguishable from a bug and impossible for a player to diagnose or override. The sound
// preference is read from storage only. Wiring the flag is a deliberate non-decision recorded here
// so a later reader does not mistake it for an oversight.
//
// WHY AN ABSENT PREFERENCE MEANS ENABLED.
// `readSoundPreference` returns `true` when the key is missing, unreadable or unparseable. Absence
// of a preference is not a preference for silence, and a sound playing has no security consequence,
// so the default that fails usefully is "on". The one thing that must never happen — sound playing
// after the player has turned it off — is a stored `false`, which is honoured exactly.

import { STORAGE_KEYS } from '@/config/constants'

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * The narrow slice of `MediaQueryList` this adapter uses.
 *
 * Both subscription APIs are optional because both exist in the wild: `addEventListener('change')`
 * is the standard, and older Safari offers only the deprecated `addListener`. Methods rather than
 * function-typed properties so a node-environment fake can satisfy the type without matching the
 * full DOM signatures.
 */
export interface MediaQueryListLike {
  readonly matches: boolean
  addEventListener?(type: 'change', listener: (event: { matches: boolean }) => void): void
  removeEventListener?(type: 'change', listener: (event: { matches: boolean }) => void): void
  addListener?(listener: (event: { matches: boolean }) => void): void
  removeListener?(listener: (event: { matches: boolean }) => void): void
}

/** The injectable seam. Every member is optional, and an absent member means "unsupported here". */
export interface PreferencesEnvironment {
  matchMedia?: (query: string) => MediaQueryListLike | null
  readStored?: () => string | null
  writeStored?: (value: string) => void
}

function browserMatchMedia(query: string): MediaQueryListLike | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }
  return window.matchMedia(query)
}

function browserReadStored(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED)
}

function browserWriteStored(value: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, value)
}

/** The real browser, reached only through the guards above. */
export const browserPreferencesEnvironment: PreferencesEnvironment = {
  matchMedia: browserMatchMedia,
  readStored: browserReadStored,
  writeStored: browserWriteStored,
}

const NO_OP_UNSUBSCRIBE = (): void => undefined

/** `false` when the query cannot be asked — a player who cannot be asked has not asked for less. */
export function readReducedMotion(
  env: PreferencesEnvironment = browserPreferencesEnvironment
): boolean {
  const ask = env.matchMedia
  if (typeof ask !== 'function') {
    return false
  }
  try {
    return ask(REDUCED_MOTION_QUERY)?.matches === true
  } catch {
    // An unsupported or throwing media-query implementation is not an error the player can act on.
    return false
  }
}

/**
 * Observe `prefers-reduced-motion` and return an unsubscribe.
 *
 * The teardown detaches with whichever API the subscription attached with, so a legacy
 * `addListener`-only implementation is released as cleanly as a standard one. Returning a real
 * unsubscribe in every branch — including the unsupported ones — is what lets the caller's effect
 * cleanup be unconditional (SECURITY-15, every listener released).
 */
export function subscribeReducedMotion(
  listener: (enabled: boolean) => void,
  env: PreferencesEnvironment = browserPreferencesEnvironment
): () => void {
  const ask = env.matchMedia
  if (typeof ask !== 'function') {
    return NO_OP_UNSUBSCRIBE
  }

  let list: MediaQueryListLike | null = null
  try {
    list = ask(REDUCED_MOTION_QUERY)
  } catch {
    // Nothing was attached, so nothing needs detaching.
    return NO_OP_UNSUBSCRIBE
  }
  if (list === null) {
    return NO_OP_UNSUBSCRIBE
  }

  const target = list
  const handler = (event: { matches: boolean }): void => {
    try {
      listener(event.matches === true)
    } catch {
      // A consumer's own failure is the consumer's to handle; it must not break the subscription.
    }
  }

  if (typeof target.addEventListener === 'function') {
    try {
      target.addEventListener('change', handler)
    } catch {
      return NO_OP_UNSUBSCRIBE
    }
    return () => {
      try {
        target.removeEventListener?.('change', handler)
      } catch {
        // Already detached, or an implementation that refuses to; either way we are done with it.
      }
    }
  }

  if (typeof target.addListener === 'function') {
    try {
      target.addListener(handler)
    } catch {
      return NO_OP_UNSUBSCRIBE
    }
    return () => {
      try {
        target.removeListener?.(handler)
      } catch {
        // As above.
      }
    }
  }

  return NO_OP_UNSUBSCRIBE
}

/**
 * Interpret a stored sound preference.
 *
 * Written with `JSON.stringify` to match `utils/storage.ts`, so the canonical values are `true` and
 * `false`. Read tolerantly — a quoted `"false"` left by a hand edit or an older writer is still an
 * unambiguous "off" — and anything else is treated as no preference at all, which is `true`.
 */
function interpretSoundPreference(raw: string): boolean {
  const trimmed = raw.trim()
  const unquoted =
    trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
      ? trimmed.slice(1, -1)
      : trimmed
  if (unquoted === 'false') {
    return false
  }
  return true
}

/** `true` unless the player has stored an explicit `false`. See the header for why. */
export function readSoundPreference(
  env: PreferencesEnvironment = browserPreferencesEnvironment
): boolean {
  const read = env.readStored
  if (typeof read !== 'function') {
    return true
  }
  try {
    const raw = read()
    if (raw === null) {
      return true
    }
    return interpretSoundPreference(raw)
  } catch {
    // Storage disabled, full, or blocked by a privacy mode. The game still plays.
    return true
  }
}

export function writeSoundPreference(
  enabled: boolean,
  env: PreferencesEnvironment = browserPreferencesEnvironment
): void {
  try {
    env.writeStored?.(JSON.stringify(enabled))
  } catch {
    // A preference that could not be persisted still applies for this session; the caller holds it
    // in state. Failing to save is not worth interrupting a game for.
  }
}
