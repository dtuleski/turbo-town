import { useCallback, useEffect, useState } from 'react'
import {
  readReducedMotion,
  readSoundPreference,
  subscribeReducedMotion,
  writeSoundPreference,
} from '@/services/presentationPreferences'

export interface PresentationPreferences {
  /** The operating system's `prefers-reduced-motion`, kept current while the component is mounted. */
  reducedMotion: boolean
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
}

/**
 * Component-scoped access to the presentation preferences adapter (D3).
 *
 * The adapter holds all the browser knowledge; this hook adds only the two things a component
 * needs: state that re-renders on a change, and a subscription released on unmount.
 *
 * Seeding from a lazy `useState` initialiser rather than an effect means the first paint already
 * has the right motion mode, so a reduced-motion player never sees one animated frame before the
 * preference lands.
 */
export function usePresentationPreferences(): PresentationPreferences {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => readReducedMotion())
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => readSoundPreference())

  useEffect(() => {
    // Re-read on mount: the preference can change between the render that seeded state and the
    // commit that subscribes, and the subscription only reports changes after it is attached.
    setReducedMotion(readReducedMotion())
    // `subscribeReducedMotion` returns a real unsubscribe in every branch, including the
    // unsupported ones, so this cleanup needs no guard (SECURITY-15, every listener released).
    return subscribeReducedMotion(setReducedMotion)
  }, [])

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled)
    writeSoundPreference(enabled)
  }, [])

  return { reducedMotion, soundEnabled, setSoundEnabled }
}
