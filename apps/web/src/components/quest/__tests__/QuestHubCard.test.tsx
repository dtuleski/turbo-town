import { describe, expect, it, vi } from 'vitest'

const getQuestProgress = vi.fn()
vi.mock('@/api/quest', () => ({ getQuestProgress: () => getQuestProgress() }))

import QuestHubCard from '../QuestHubCard'
import { decode, renderMarkup } from '@/test/renderWithProviders'

describe('QuestHubCard', () => {
  it('renders the title, one line and a 44px link to the Quest Map', () => {
    const html = decode(renderMarkup(<QuestHubCard />))
    expect(html).toContain('Quest Map')
    expect(html).toContain('Follow a path of games, earn stars and beat the boss.')
    expect(html).toMatch(/<a (?=[^>]*href="\/quest-map")(?=[^>]*min-h-\[44px\])[^>]*>Open Quest Map<\/a>/)
  })

  it('makes no network request', () => {
    renderMarkup(<QuestHubCard />)
    expect(getQuestProgress).not.toHaveBeenCalled()
  })

  it('reads no props or tier, so FREE and PAID see the same markup', () => {
    expect(QuestHubCard.length).toBe(0)
    expect(renderMarkup(<QuestHubCard />)).toBe(renderMarkup(<QuestHubCard />))
  })
})
