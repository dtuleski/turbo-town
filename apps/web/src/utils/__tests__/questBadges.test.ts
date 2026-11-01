import { describe, expect, it } from 'vitest'
import { makeProgress, makeWorld1, makeWorld2Locked } from '@/test/questFixtures'
import type { BadgeId } from '@/utils/questShared'
import { BADGE_IDS, badgeKey, deriveWorldBadges, summarizeBadges } from '../questBadges'

describe('deriveWorldBadges', () => {
  it('shows both badges locked when the world has none', () => {
    expect(deriveWorldBadges(makeWorld1())).toEqual([
      { id: 'WORLD_CLEARED', earned: false },
      { id: 'WORLD_MASTERED', earned: false },
    ])
  })

  it('marks only the badges the server listed as earned', () => {
    const cleared = { badges: ['WORLD_CLEARED'] as BadgeId[] }
    expect(deriveWorldBadges(cleared).map((b) => b.earned)).toEqual([true, false])
    const both = { badges: ['WORLD_MASTERED', 'WORLD_CLEARED'] as BadgeId[] }
    expect(deriveWorldBadges(both).map((b) => b.earned)).toEqual([true, true])
  })

  it('ignores unknown badge ids and a missing list', () => {
    expect(deriveWorldBadges({ badges: ['FUTURE_BADGE' as BadgeId] }).every((b) => !b.earned)).toBe(true)
    expect(deriveWorldBadges({ badges: undefined as unknown as BadgeId[] }).every((b) => !b.earned)).toBe(true)
  })

  it('keeps a stable display order', () => {
    expect(deriveWorldBadges({ badges: [] }).map((b) => b.id)).toEqual([...BADGE_IDS])
  })
})

describe('summarizeBadges', () => {
  it('counts earned and total across worlds', () => {
    const progress = makeProgress({
      worlds: [{ ...makeWorld2Locked(), badges: [] }, { ...makeWorld1(), badges: ['WORLD_CLEARED', 'WORLD_MASTERED'] }],
    })
    expect(summarizeBadges(progress)).toEqual({ earned: 2, total: 4 })
  })
})

describe('badgeKey', () => {
  it('joins world and badge ids', () => {
    expect(badgeKey('brain-peaks', 'WORLD_CLEARED')).toBe('brain-peaks:WORLD_CLEARED')
  })
})
