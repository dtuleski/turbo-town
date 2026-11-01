import { describe, expect, it } from 'vitest'
import { decode, renderMarkup } from '@/test/renderWithProviders'
import { makeProgress, makeWorld1 } from '@/test/questFixtures'
import { QuestMapView, type QuestMapViewProps } from '@/pages/quest/QuestMapPage'
import type { BadgeId } from '@/utils/questShared'
import BadgeShelf from '../BadgeShelf'
import { QuestAchievementsSection } from '../QuestAchievementsSection'

const world = (badges: BadgeId[]) => ({ ...makeWorld1(), badges })
const shelf = (badges: BadgeId[], reducedMotion: boolean, justEarned?: string[]): string =>
  decode(
    renderMarkup(
      <BadgeShelf world={world(badges)} reducedMotion={reducedMotion} justEarned={justEarned ? new Set(justEarned) : undefined} />
    )
  )

describe('BadgeShelf', () => {
  it('renders both badges locked with a text state', () => {
    const html = shelf([], false)
    expect(html).toContain('World Cleared')
    expect(html).toContain('World Mastered')
    expect(html).toContain('aria-label="Brain Peaks badges"')
    expect(html.match(/data-earned="false"/g)).toHaveLength(2)
    expect(html.match(/Locked/g)).toHaveLength(2)
    expect(html).not.toContain('Earned')
  })

  it('renders an earned badge as Earned and the other as Locked', () => {
    const html = shelf(['WORLD_CLEARED'], false)
    expect(html).toMatch(/data-badge="WORLD_CLEARED" data-earned="true"/)
    expect(html).toMatch(/data-badge="WORLD_MASTERED" data-earned="false"/)
    expect(html.match(/Earned/g)).toHaveLength(1)
  })

  it('animates a badge earned in the game just finished', () => {
    const html = shelf(['WORLD_CLEARED'], false, ['brain-peaks:WORLD_CLEARED'])
    expect(html).toContain('data-animated="true"')
    expect(html).toContain('New')
  })

  it('shows the static marker with no animation under reduced motion', () => {
    const html = shelf(['WORLD_CLEARED'], true, ['brain-peaks:WORLD_CLEARED'])
    expect(html).not.toContain('data-animated')
    expect(html).not.toContain('transform')
    expect(html).toContain('New')
  })

  it('does not animate or mark badges that were not just earned', () => {
    const html = shelf(['WORLD_CLEARED'], false, ['brain-peaks:WORLD_MASTERED'])
    expect(html).not.toContain('data-animated')
    expect(html).not.toContain('>New<')
  })

  it('shows hints only when asked', () => {
    expect(shelf([], false)).not.toContain('Beat the boss')
    const html = decode(renderMarkup(<BadgeShelf world={world([])} reducedMotion={false} showHints />))
    expect(html).toContain('Beat the boss with at least 1 star.')
  })
})

describe('Quest Map page shelf', () => {
  const props = (data = makeProgress()): QuestMapViewProps => ({
    data,
    loading: false,
    error: false,
    onRetry: () => undefined,
    notice: null,
    selected: null,
    onSelect: () => undefined,
    onClosePanel: () => undefined,
    onPlay: () => undefined,
    reducedMotion: false,
  })

  it('renders one shelf per world, locked and earned', () => {
    const data = makeProgress()
    data.worlds = data.worlds.map((w) => (w.id === 'brain-peaks' ? { ...w, badges: ['WORLD_CLEARED'] as BadgeId[] } : w))
    const html = decode(renderMarkup(<QuestMapView {...props(data)} />))
    expect(html).toContain('data-testid="badge-shelf-brain-peaks"')
    expect(html).toContain('data-testid="badge-shelf-science-island"')
    expect(html.match(/data-earned="true"/g)).toHaveLength(1)
    expect(html.match(/data-earned="false"/g)).toHaveLength(3)
  })

  it('shows no shelf while loading or on error', () => {
    expect(renderMarkup(<QuestMapView {...props()} loading />)).not.toContain('badge-shelf')
    expect(renderMarkup(<QuestMapView {...props(null as never)} data={null} error />)).not.toContain('badge-shelf')
  })
})

describe('QuestAchievementsSection', () => {
  const ok = (worlds = makeProgress().worlds) => ({ data: { ...makeProgress(), worlds }, loading: false, error: false })

  it('lists badges per world with a summary and hints', () => {
    const worlds = makeProgress().worlds.map((w) =>
      w.id === 'brain-peaks' ? { ...w, badges: ['WORLD_CLEARED', 'WORLD_MASTERED'] as BadgeId[] } : w
    )
    const html = decode(renderMarkup(<QuestAchievementsSection state={ok(worlds)} />))
    expect(html).toContain('Quest Map badges')
    expect(html).toContain('2 of 4 badges earned')
    expect(html).toContain('Brain Peaks')
    expect(html).toContain('Science Island')
    expect(html).toContain('Earn 3 stars on every path node.')
    expect(html.match(/data-earned="true"/g)).toHaveLength(2)
    expect(html.match(/data-earned="false"/g)).toHaveLength(2)
  })

  it('renders nothing while loading', () => {
    expect(renderMarkup(<QuestAchievementsSection state={{ data: null, loading: true, error: false }} />)).toBe('')
  })

  it('renders nothing on error (no scary message, no badges)', () => {
    const html = decode(renderMarkup(<QuestAchievementsSection state={{ data: null, loading: false, error: true }} />))
    expect(html).toBe('')
  })
})
