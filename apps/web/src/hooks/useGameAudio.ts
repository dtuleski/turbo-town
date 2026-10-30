import { useCallback, useEffect, useRef } from 'react'
import { createCircuitAudio } from '@/services/audioService'
import type { CircuitAudio, SoundCue } from '@/services/audioService'
import { lazyRefValue } from '@/utils/lazyRef'

export interface UseGameAudioOptions {
  /** Read on every play, so a mute toggle takes effect on the next sound (NFR-CB-14). */
  isSoundEnabled: () => boolean
}

export interface GameAudio {
  /** Call from the first user gesture. Idempotent, synchronous, and never throws. */
  unlock: () => void
  play: (cue: SoundCue) => void
}

/**
 * Component-scoped wrapper around the audio service (D1).
 *
 * Two things make this more than a one-liner. The service is held through `lazyRefValue`, so the
 * audio context is constructed at most once however many times the component re-renders — and this
 * surface re-renders on every pointer move during a drag. And `isSoundEnabled` is kept in a ref
 * rather than closed over, so a caller writing the natural `{ isSoundEnabled: () => prefs.sound }`
 * gets a new arrow function every render without ever re-creating the service behind it.
 *
 * The service is disposed in the effect cleanup, so audio cannot outlive the game (NFR-CB-15,
 * CB-6.6).
 */
export function useGameAudio({ isSoundEnabled }: UseGameAudioOptions): GameAudio {
  const enabledRef = useRef(isSoundEnabled)
  enabledRef.current = isSoundEnabled

  const serviceRef = useRef<CircuitAudio | null>(null)

  const service = useCallback(
    () =>
      lazyRefValue(serviceRef, () =>
        createCircuitAudio({ isSoundEnabled: () => enabledRef.current() })
      ),
    []
  )

  const unlock = useCallback(() => {
    service().unlock()
  }, [service])

  const play = useCallback(
    (cue: SoundCue) => {
      service().play(cue)
    },
    [service]
  )

  useEffect(() => {
    return () => {
      // Read inside the cleanup, not when the effect ran: an unmount before any gesture must
      // dispose nothing because nothing was ever created. Copying the ref while the effect runs —
      // the lint rule's usual advice — would capture `null` on the first pass and leave the context
      // of a component that WAS used open, which is the leak the rule exists to prevent.
      serviceRef.current?.dispose()
      serviceRef.current = null
    }
  }, [])

  return { unlock, play }
}
