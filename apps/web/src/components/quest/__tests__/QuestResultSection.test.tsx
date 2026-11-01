import { describe, expect, it, vi } from 'vitest'
import type { QuestResultPayload } from '@/types/quest'
import QuestResultSection from '../QuestResultSection'
import { decode, renderMarkup } from '@/test/renderWithProviders'
import { getNextLegUrl, isQuestMode } from '@/utils/questModal'

const PLAIN: QuestResultPayload = {
  worldId: 'brain-peaks',
  nodeId: 'bp-02-math',
  kind: 'GAME',
  score: 2400,
  thresholds: [1800, 2350, 2650],
  stars: 2,
  bestStars: 3,
  newlyUnlocked: [],
  worldCleared: false,
  badgesAwarded: [],
}

const html = (result: QuestResultPayload | null, onNextLeg?: () => void): string =>
  decode(renderMarkup(<QuestResultSection result={result} onNextLeg={onNextLeg} />))

describe('QuestResultSection (FD section 4)', () => {
  it('plain node: stars this run, best, ladder with reached goals, next threshold', () => {
    const out = html(PLAIN)
    expect(out).toContain('★★☆')
    expect(out).toContain('Stars this run: 2 of 3')
    expect(out).toContain('Best: 3 of 3 stars')
    expect(out).toContain('Your score: 2,400')
    expect((out.match(/\(Reached\)/g) ?? []).length).toBe(2)
    expect(out).toContain('Next star at 2,650 points')
  })

  it('all goals reached', () => {
    expect(html({ ...PLAIN, score: 3000, stars: 3 })).toContain('All goals reached')
  })

  it('boss mid-run: leg done, leg score, Next leg, no stars', () => {
    const result: QuestResultPayload = {
      ...PLAIN,
      kind: 'BOSS',
      nodeId: 'bp-boss',
      gauntlet: { legIndex: 0, legsTotal: 2, status: 'IN_PROGRESS', nextLeg: { themeId: 'BUBBLE_POP', difficulty: 2 } },
    }
    const out = html(result, vi.fn())
    expect(out).toContain('Leg 1 of 2 done')
    expect(out).toContain('Leg score: 2,400')
    expect(out).toMatch(/<button[^>]*>Next leg<\/button>/)
    expect(out).not.toContain('Stars this run')
    expect(getNextLegUrl(result)).toBe('/bubble-pop/game?difficulty=medium&quest=brain-peaks%3Abp-boss%3A1')
  })

  it('boss final leg: combined score, stars and ladder', () => {
    const out = html({ ...PLAIN, kind: 'BOSS', gauntlet: { legIndex: 1, legsTotal: 2, status: 'COMPLETE' } })
    expect(out).toContain('Combined score: 2,400')
    expect(out).toContain('Stars this run: 2 of 3')
    expect(getNextLegUrl({ ...PLAIN, gauntlet: { legIndex: 1, legsTotal: 2, status: 'COMPLETE' } })).toBeNull()
  })

  it('expired run: expired text only', () => {
    const out = html({ ...PLAIN, kind: 'BOSS', gauntlet: { legIndex: 1, legsTotal: 2, status: 'EXPIRED' } })
    expect(out).toContain('This run expired. Start the boss again from leg 1.')
    expect(out).not.toContain('Stars this run')
    expect(out).not.toContain('Next leg')
  })

  it('unlocked names skip unknown ids', () => {
    const out = html({ ...PLAIN, newlyUnlocked: ['bp-03-words', 'zz-unknown', 'bp-boss'] })
    expect(out).toContain('Unlocked: Word Hunt, Peak Boss')
    expect(out).not.toContain('zz-unknown')
  })

  it('no unlock line when only unknown ids', () => {
    expect(html({ ...PLAIN, newlyUnlocked: ['zz-unknown'] })).not.toContain('Unlocked:')
  })

  it('world cleared', () => {
    expect(html({ ...PLAIN, worldCleared: true })).toContain('World cleared!')
  })

  it('empty store fallback', () => {
    expect(html(null)).toContain('Progress could not be saved, replay to retry.')
  })
})

describe('isQuestMode', () => {
  it('is true with a valid param or a stored result, false otherwise', () => {
    expect(isQuestMode('?quest=a:b:0', null)).toBe(true)
    expect(isQuestMode('', PLAIN)).toBe(true)
    expect(isQuestMode('?quest=bad', null)).toBe(false)
    expect(isQuestMode('', null)).toBe(false)
  })
})
