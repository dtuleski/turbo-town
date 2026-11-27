import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { saveNotificationSettings } from '@/api/challenge'
import { challengeLanguage } from '@/utils/challengeContent'
import type { ChallengeLanguage } from '@/utils/challengeShared'

/** localStorage key holding the last values saved to the server: `{ userId, timeZone?, language }`. */
export const NOTIFICATION_SETTINGS_KEY = 'dashden.notificationSettings'

export interface NotificationSettingsSnapshot {
  userId: string
  timeZone?: string
  language: ChallengeLanguage
}

type SnapshotStorage = Pick<Storage, 'getItem' | 'setItem'>

/** The browser's IANA time zone, or undefined when the browser does not report a usable one. */
export function browserTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return typeof zone === 'string' && zone.length > 0 && zone.length <= 64 ? zone : undefined
  } catch {
    return undefined
  }
}

/** The values to keep on the server for this user: browser zone and the base code of the UI language. */
export function currentNotificationSettings(userId: string, language: string | undefined): NotificationSettingsSnapshot {
  const timeZone = browserTimeZone()
  return timeZone ? { userId, timeZone, language: challengeLanguage(language) } : { userId, language: challengeLanguage(language) }
}

function readSaved(storage: SnapshotStorage | null): Partial<NotificationSettingsSnapshot> | null {
  try {
    const raw = storage?.getItem(NOTIFICATION_SETTINGS_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Partial<NotificationSettingsSnapshot>) : null
  } catch {
    return null
  }
}

/**
 * Saves `current` when it differs from the last values saved from this browser (another user, zone or
 * language), then remembers it. Returns true when a save was made. A failed save is not remembered, so
 * the next sign-in or page load tries again. Never throws.
 */
export async function syncNotificationSettings(
  current: NotificationSettingsSnapshot,
  storage: SnapshotStorage | null,
  save: (input: { timeZone?: string; language?: string }) => Promise<void>
): Promise<boolean> {
  const saved = readSaved(storage)
  if (
    saved &&
    saved.userId === current.userId &&
    saved.timeZone === current.timeZone &&
    saved.language === current.language
  ) {
    return false
  }
  try {
    await save(current.timeZone ? { timeZone: current.timeZone, language: current.language } : { language: current.language })
  } catch {
    console.error('Notification settings could not be saved')
    return false
  }
  try {
    storage?.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(current))
  } catch {
    /* storage full or blocked: the next load saves again */
  }
  return true
}

function browserStorage(): SnapshotStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/**
 * Locale sync (W7). For a signed-in user, keeps the server's time zone and language (used for the 8am
 * digest and the noon challenge reminder) in step with this browser: one save per change, none on a
 * load where nothing changed. Mounted once, in the signed-in layout.
 */
export function useNotificationSettingsSync(): void {
  const { user, isAuthenticated } = useAuth()
  const { i18n } = useTranslation()
  const userId = user?.id
  const language = i18n.language
  useEffect(() => {
    if (!isAuthenticated || !userId) return
    void syncNotificationSettings(currentNotificationSettings(userId, language), browserStorage(), saveNotificationSettings)
  }, [isAuthenticated, userId, language])
}
