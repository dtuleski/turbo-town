import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/challenge', () => ({ saveNotificationSettings: vi.fn() }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }))

import {
  NOTIFICATION_SETTINGS_KEY,
  browserTimeZone,
  currentNotificationSettings,
  syncNotificationSettings,
  type NotificationSettingsSnapshot,
} from '../useNotificationSettingsSync'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const NY: NotificationSettingsSnapshot = { userId: 'u1', timeZone: 'America/New_York', language: 'en' }

let storage: MemoryStorage
let save: ReturnType<typeof vi.fn<(input: { timeZone?: string; language?: string }) => Promise<void>>>

beforeEach(() => {
  storage = new MemoryStorage()
  save = vi.fn<(input: { timeZone?: string; language?: string }) => Promise<void>>().mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('syncNotificationSettings', () => {
  it('saves the zone and language on the first load and remembers them', async () => {
    expect(await syncNotificationSettings(NY, storage, save)).toBe(true)
    expect(save).toHaveBeenCalledWith({ timeZone: 'America/New_York', language: 'en' })
    expect(JSON.parse(storage.getItem(NOTIFICATION_SETTINGS_KEY)!)).toEqual(NY)
  })

  it('does not save again on later loads with the same values', async () => {
    await syncNotificationSettings(NY, storage, save)
    await syncNotificationSettings({ ...NY }, storage, save)
    await syncNotificationSettings({ ...NY }, storage, save)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('saves once when the time zone changes', async () => {
    await syncNotificationSettings(NY, storage, save)
    const lisbon = { ...NY, timeZone: 'Europe/Lisbon' }
    expect(await syncNotificationSettings(lisbon, storage, save)).toBe(true)
    expect(await syncNotificationSettings(lisbon, storage, save)).toBe(false)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith({ timeZone: 'Europe/Lisbon', language: 'en' })
  })

  it('saves once when the language changes', async () => {
    await syncNotificationSettings(NY, storage, save)
    const spanish = { ...NY, language: 'es' as const }
    await syncNotificationSettings(spanish, storage, save)
    await syncNotificationSettings(spanish, storage, save)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith({ timeZone: 'America/New_York', language: 'es' })
  })

  it('saves for another user signing in on the same browser', async () => {
    await syncNotificationSettings(NY, storage, save)
    expect(await syncNotificationSettings({ ...NY, userId: 'u2' }, storage, save)).toBe(true)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('does not remember a failed save, so the next load tries again', async () => {
    save.mockRejectedValueOnce(new Error('network'))
    expect(await syncNotificationSettings(NY, storage, save)).toBe(false)
    expect(storage.getItem(NOTIFICATION_SETTINGS_KEY)).toBeNull()
    expect(await syncNotificationSettings(NY, storage, save)).toBe(true)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('sends only the language when the browser reports no time zone', async () => {
    await syncNotificationSettings({ userId: 'u1', language: 'pt' }, storage, save)
    expect(save).toHaveBeenCalledWith({ language: 'pt' })
    await syncNotificationSettings({ userId: 'u1', language: 'pt' }, storage, save)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('treats unreadable saved values as nothing saved', async () => {
    storage.setItem(NOTIFICATION_SETTINGS_KEY, '{not json')
    expect(await syncNotificationSettings(NY, storage, save)).toBe(true)
  })

  it('still saves when storage is unavailable or throws, and never throws itself', async () => {
    expect(await syncNotificationSettings(NY, null, save)).toBe(true)
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(await syncNotificationSettings(NY, broken, save)).toBe(true)
  })
})

describe('currentNotificationSettings', () => {
  it('uses the base code of the UI language, falling back to en', () => {
    expect(currentNotificationSettings('u1', 'pt-BR').language).toBe('pt')
    expect(currentNotificationSettings('u1', 'es').language).toBe('es')
    expect(currentNotificationSettings('u1', 'fr-FR').language).toBe('en')
    expect(currentNotificationSettings('u1', undefined).language).toBe('en')
  })

  it("uses the browser's IANA time zone", () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(browserTimeZone()).toBe(zone)
    expect(currentNotificationSettings('u1', 'en')).toEqual({ userId: 'u1', timeZone: zone, language: 'en' })
  })

  it('omits the zone when Intl fails', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('no Intl')
    })
    expect(currentNotificationSettings('u1', 'en')).toEqual({ userId: 'u1', language: 'en' })
  })
})
