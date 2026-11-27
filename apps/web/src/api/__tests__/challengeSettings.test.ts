import { beforeEach, describe, expect, it, vi } from 'vitest'

const mutate = vi.fn()
vi.mock('../client', () => ({ gameClient: { mutate: (...a: unknown[]) => mutate(...a), query: vi.fn() } }))

import { saveNotificationSettings } from '../challenge'

beforeEach(() => {
  mutate.mockReset()
})

describe('saveNotificationSettings', () => {
  it('sends the saveNotificationSettings mutation with only the given fields', async () => {
    mutate.mockResolvedValue({ data: { saveNotificationSettings: { timeZone: 'America/Chicago', language: 'es' } } })
    await saveNotificationSettings({ timeZone: 'America/Chicago', language: 'es' })
    const call = mutate.mock.calls[0][0]
    expect(call.mutation.loc.source.body).toContain('saveNotificationSettings(input: $input)')
    expect(call.variables).toEqual({ input: { timeZone: 'America/Chicago', language: 'es' } })
  })

  it('rethrows a failure so the caller does not remember the values', async () => {
    mutate.mockRejectedValue(new Error('Invalid notification settings'))
    await expect(saveNotificationSettings({ language: 'en' })).rejects.toThrow('Invalid notification settings')
  })
})
