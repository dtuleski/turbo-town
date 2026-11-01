import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuestProgressState } from '@/hooks/useQuestProgress'
import { makeProgress } from '@/test/questFixtures'

const useQuestProgress = vi.fn<() => QuestProgressState>()
vi.mock('@/hooks/useQuestProgress', () => ({ useQuestProgress: () => useQuestProgress() }))

import QuestBanner from '../QuestBanner'
import { decode, renderMarkup } from '@/test/renderWithProviders'

const state = (data: QuestProgressState['data']): QuestProgressState => ({
  data,
  loading: false,
  error: false,
  refetch: vi.fn(),
})

beforeEach(() => {
  useQuestProgress.mockReset()
  useQuestProgress.mockReturnValue(state(makeProgress()))
})

describe('QuestBanner', () => {
  it('shows the node name, the 3-star goal and Back to map in quest mode', () => {
    const html = decode(renderMarkup(<QuestBanner />, ['/math/game?difficulty=easy&quest=brain-peaks:bp-02-math:0']))
    expect(html).toContain('Playing from Quest Map')
    expect(html).toContain('Math Warm-up')
    expect(html).toContain('3-star goal: 300 points')
    expect(html).toMatch(/<a [^>]*href="\/quest-map"[^>]*>Back to map<\/a>/)
  })

  it('shows only the generic text while data is loading', () => {
    useQuestProgress.mockReturnValue({ ...state(null), loading: true })
    const html = decode(renderMarkup(<QuestBanner />, ['/math/game?quest=brain-peaks:bp-02-math:0']))
    expect(html).toContain('Playing from Quest Map')
    expect(html).toContain('Math Warm-up')
    expect(html).not.toContain('3-star goal')
  })

  it('unknown node id shows only the generic text and the link', () => {
    const html = decode(renderMarkup(<QuestBanner />, ['/math/game?quest=brain-peaks:zz-unknown:0']))
    expect(html).toContain('Playing from Quest Map')
    expect(html).not.toContain('zz-unknown')
    expect(html).not.toContain('3-star goal')
    expect(html).toContain('href="/quest-map"')
  })

  it.each([
    ['no quest param', '/math/game?difficulty=easy'],
    ['invalid param', '/math/game?quest=bad'],
    ['hub', '/hub'],
  ])('renders nothing and requests nothing outside quest mode (%s)', (_label, url) => {
    expect(renderMarkup(<QuestBanner />, [url])).toBe('')
    expect(useQuestProgress).not.toHaveBeenCalled()
  })
})
