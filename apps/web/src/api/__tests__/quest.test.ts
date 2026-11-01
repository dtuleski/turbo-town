import { describe, expect, it, vi } from 'vitest'

const query = vi.fn()
vi.mock('../client', () => ({ gameClient: { query: (...a: unknown[]) => query(...a) } }))

import { getQuestProgress } from '../quest'

describe('getQuestProgress', () => {
  it('queries network-only and returns the view', async () => {
    const view = { tier: 'FREE', rateLimit: { limit: 5, used: 0, remaining: 5, resetAt: 'x' }, worlds: [] }
    query.mockResolvedValue({ data: { getQuestProgress: view } })
    expect(await getQuestProgress()).toBe(view)
    expect(query.mock.calls[0][0].fetchPolicy).toBe('network-only')
  })

  it('never selects catalogGameId', async () => {
    query.mockResolvedValue({ data: { getQuestProgress: {} } })
    await getQuestProgress()
    expect(JSON.stringify(query.mock.calls[0][0].query)).not.toContain('catalogGameId')
  })
})
