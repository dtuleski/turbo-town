import { describe, expect, it, vi } from 'vitest'
import { QuestMapView, type QuestMapViewProps } from '@/pages/quest/QuestMapPage'
import QuestNodePanel from '../QuestNodePanel'
import QuestWorldPath from '../QuestWorldPath'
import { decode, renderMarkup } from '@/test/renderWithProviders'
import { makeNode, makeProgress, makeWorld1, makeWorld2Locked, makeWorld2Paid } from '@/test/questFixtures'
import { QUEST_WORLDS } from '@/utils/questShared'
import { getPlayUrl } from '@/utils/questMap'
import type { QuestNodeView, QuestProgressView, QuestWorldView } from '@/types/quest'

interface ButtonInfo {
  label: string
  id: string
  className: string
}

const nodeButtons = (html: string): ButtonInfo[] =>
  [...html.matchAll(/<button[^>]*aria-label="([^"]*)"[^>]*data-node-id="([^"]*)"[^>]*class="([^"]*)"/g)].map(
    (m) => ({ label: decode(m[1]), id: m[2], className: m[3] })
  )

const viewProps = (overrides: Partial<QuestMapViewProps> = {}): QuestMapViewProps => ({
  data: makeProgress(),
  loading: false,
  error: false,
  onRetry: vi.fn(),
  notice: null,
  selected: null,
  onSelect: vi.fn(),
  onClosePanel: vi.fn(),
  onPlay: vi.fn(),
  reducedMotion: false,
  ...overrides,
})

const RATE = { limit: 10, used: 3, remaining: 7, resetAt: '2026-01-02T00:00:00.000Z' }

const panel = (node: QuestNodeView, world: QuestWorldView, rateLimit = RATE): string =>
  decode(
    renderMarkup(
      <QuestNodePanel node={node} world={world} rateLimit={rateLimit} onClose={vi.fn()} onPlay={vi.fn()} reducedMotion={false} />
    )
  )

describe('QuestWorldPath node states and accessible names', () => {
  const world = makeWorld1()
  const html = renderMarkup(<QuestWorldPath world={world} onSelect={vi.fn()} reducedMotion={false} />)
  const buttons = nodeButtons(html)

  it('renders one real button per node, in path order with the bonus last', () => {
    expect(buttons.map((b) => b.id)).toEqual(world.nodes.map((n) => n.id))
    expect(html).toContain('<ol')
    expect(buttons[buttons.length - 1].id).toBe('bp-bonus-sequence')
  })

  it('names each node with its name, state and stars', () => {
    const byId = Object.fromEntries(buttons.map((b) => [b.id, b.label]))
    expect(byId['bp-01-memory']).toBe('Animal Memory, 3 of 3 stars')
    expect(byId['bp-02-math']).toBe('Math Warm-up, 2 of 3 stars')
    expect(byId['bp-03-words']).toBe('Word Hunt, 1 of 3 stars')
    expect(byId['bp-04-sequence']).toBe('Sequence Steps, ready to play')
    expect(byId['bp-05-geo']).toBe('Geo Pass, not available')
    expect(byId['bp-06-maze']).toBe('Number Maze, locked')
    expect(byId['bp-boss']).toBe('Peak Boss, ready to play, boss')
    expect(byId['bp-bonus-sequence']).toBe('Bonus: Long Sequence, locked, bonus')
  })

  it('no two states share the same accessible name', () => {
    const states = ['bp-01-memory', 'bp-02-math', 'bp-03-words', 'bp-04-sequence', 'bp-05-geo', 'bp-06-maze']
    const suffixes = buttons.filter((b) => states.includes(b.id)).map((b) => b.label.split(', ').slice(1).join(', '))
    expect(new Set(suffixes).size).toBe(states.length)
  })

  it('meets the 48px target (64px for the boss)', () => {
    for (const button of buttons) {
      if (button.id === 'bp-boss') {
        expect(button.className).toContain('min-h-[64px]')
        expect(button.className).toContain('min-w-[64px]')
      } else {
        expect(button.className).toContain('min-h-[48px]')
        expect(button.className).toContain('min-w-[48px]')
      }
    }
  })

  it('uses a distinct shape for the bonus and a dashed outline for unavailable', () => {
    expect(buttons.find((b) => b.id === 'bp-bonus-sequence')?.className).toContain('rotate-45')
    expect(buttons.find((b) => b.id === 'bp-05-geo')?.className).toContain('border-dashed')
  })

  it('draws an aria-hidden, non-scaling SVG path and phone lane positions', () => {
    expect(html).toMatch(/<svg aria-hidden="true"[^>]*viewBox="0 0 100 100"[^>]*preserveAspectRatio="none"/)
    expect(html).toContain('vector-effect:non-scaling-stroke')
    expect(html).toContain('--qx:20%;--qy:92%;--px:20%')
    const edge = makeWorld1()
    edge.nodes[0] = { ...edge.nodes[0], map: { x: 5, y: 92 } }
    expect(renderMarkup(<QuestWorldPath world={edge} onSelect={vi.fn()} reducedMotion />)).toContain('--qx:5%;--qy:92%;--px:15%')
    expect(html).toContain('sm:aspect-[4/5]')
    expect(html).toContain('h-24')
  })

  it('has no pulsing class under reduced motion', () => {
    const reduced = renderMarkup(<QuestWorldPath world={world} onSelect={vi.fn()} reducedMotion />)
    expect(html).toContain('animate-pulse')
    expect(reduced).not.toContain('animate-pulse')
  })

  it('marks just-unlocked nodes with a text marker and the aria suffix', () => {
    const marked = renderMarkup(
      <QuestWorldPath world={world} onSelect={vi.fn()} reducedMotion justUnlocked={new Set(['bp-04-sequence'])} />
    )
    expect(nodeButtons(marked).find((b) => b.id === 'bp-04-sequence')?.label).toBe(
      'Sequence Steps, ready to play, newly unlocked'
    )
    expect(marked).toContain('>New<')
  })
})

describe('QuestMapView', () => {
  it('orders worlds by order and shows world stars', () => {
    const html = decode(renderMarkup(<QuestMapView {...viewProps()} />))
    expect(html.indexOf('Brain Peaks')).toBeLessThan(html.indexOf('Science Island'))
    expect(html).toContain('6 of 24 stars')
    expect(html).toContain('2 of 24 stars')
    expect(html).not.toContain('of 27')
    expect(html).toContain('7 plays left today')
    expect(html).toContain('role="progressbar"')
  })

  it('FREE tier: World 2 nodes all locked, stored stars still shown, subscription link', () => {
    const html = decode(renderMarkup(<QuestMapView {...viewProps()} />))
    const world2 = nodeButtons(html).filter((b) => b.id.startsWith('si-'))
    expect(world2.length).toBe(9)
    for (const b of world2) expect(b.label).toContain('locked')
    expect(html).toContain('Locked: subscribers only')
    expect(html).toMatch(/<a [^>]*href="\/subscription"[^>]*>Subscribe to unlock World 2<\/a>/)
    // si-01 has 2 stored stars: two filled glyphs then one empty
    const si01 = html.slice(html.indexOf('data-node-id="si-01-bond-burn"'))
    expect(si01).toMatch(/★★<span class="text-slate-500">☆<\/span>/)
  })

  it('loading shows the skeleton and no stale data', () => {
    const html = decode(renderMarkup(<QuestMapView {...viewProps({ loading: true, data: null })} />))
    expect(html).toContain('Loading your Quest Map...')
    expect(html).toContain('aria-busy="true"')
    expect(nodeButtons(html)).toHaveLength(0)
  })

  it('error shows the message and a Retry button', () => {
    const html = decode(renderMarkup(<QuestMapView {...viewProps({ error: true, data: null })} />))
    expect(html).toContain('We could not load the Quest Map.')
    expect(html).toMatch(/<button[^>]*>Retry<\/button>/)
  })

  it('renders the notice in the status region', () => {
    const html = decode(renderMarkup(<QuestMapView {...viewProps({ notice: 'That node is not available right now.' })} />))
    expect(html).toMatch(/role="status"[^>]*>.*That node is not available right now\./s)
  })

  it('opens the panel for the selected node', () => {
    const html = decode(
      renderMarkup(<QuestMapView {...viewProps({ selected: { worldId: 'brain-peaks', nodeId: 'bp-04-sequence' } })} />)
    )
    expect(html).toContain('role="dialog"')
    expect(html).toMatch(/<h2 id="[^"]+"[^>]*tabindex="-1"[^>]*>Sequence Steps<\/h2>/)
  })
})

describe('QuestNodePanel forms', () => {
  const world = makeWorld1()
  const byId = (id: string): QuestNodeView => world.nodes.find((n) => n.id === id) as QuestNodeView
  const playButton = /<button[^>]*>(Play|Replay|Continue run)<\/button>/

  it('available shows Play, goals and plays left', () => {
    const html = panel(byId('bp-04-sequence'), world)
    expect(html).toMatch(/<button type="button" class="[^"]*">Play<\/button>/)
    expect(html).toContain('1 star: 100 points')
    expect(html).toContain('3 stars: 300 points')
    expect(html).toContain('Sequence Memory')
    expect(html).toContain('(Medium)')
    expect(html).toContain('7 plays left today')
  })

  it('earned shows Replay, the reached goals and the best score', () => {
    const html = panel(byId('bp-02-math'), world)
    expect(html).toMatch(/>Replay<\/button>/)
    expect((html.match(/\(Reached\)/g) ?? []).length).toBe(2)
    expect(html).toContain('Best: 2,400')
  })

  it('locked shows the unlock line and no Play', () => {
    const html = panel(byId('bp-06-maze'), world)
    expect(html).toContain('Earn a star on the previous node to unlock.')
    expect(html).not.toMatch(playButton)
  })

  it('locked bonus shows the collect-stars line', () => {
    expect(panel(byId('bp-bonus-sequence'), world)).toContain('Collect stars in this world to unlock.')
  })

  it('unavailable shows the notice and no Play', () => {
    const html = panel(byId('bp-05-geo'), world)
    expect(html).toContain('This game is not available right now. Skipping it counts as passed.')
    expect(html).not.toMatch(playButton)
  })

  it('paywall (World 2 for FREE) shows the subscription link and no Play', () => {
    const w2 = makeWorld2Locked()
    const html = panel(w2.nodes[0], w2)
    expect(html).toMatch(/<a [^>]*href="\/subscription"[^>]*>Subscribe to unlock World 2<\/a>/)
    expect(html).not.toMatch(playButton)
  })

  it('boss shows legs in order, the 30-minute text and combined score', () => {
    const html = panel(byId('bp-boss'), world)
    expect(html.indexOf('Leg 1 of 2')).toBeLessThan(html.indexOf('Leg 2 of 2'))
    expect(html.indexOf('Math Challenge')).toBeLessThan(html.indexOf('Bubble Pop'))
    expect(html).toContain('Play the legs in order within 30 minutes.')
    expect(html).toContain('Combined score')
  })

  it('boss makes the combined rule explicit with per-game rough targets', () => {
    const boss = byId('bp-boss')
    const html = panel(boss, world)
    expect(html).toContain('Total of both games')
    const per = (p: number) => `about ${(Math.round(p / 2 / 50) * 50).toLocaleString()} per game`
    for (const p of boss.thresholds) expect(html).toContain(per(p))
  })

  it('single-game nodes do not show the combined rule or per-game targets', () => {
    const html = panel(byId('bp-02-math'), world)
    expect(html).not.toContain('Total of both games')
    expect(html).not.toContain('per game')
  })

  it('boss with an active run shows the run and Continue run', () => {
    const runWorld = { ...world, activeGauntlet: { nodeId: 'bp-boss', legsDone: 1, legsTotal: 2, expiresAt: '2026-01-01T10:30:00.000Z' } }
    const html = panel(byId('bp-boss'), runWorld)
    expect(html).toContain('Run in progress: 1 of 2 legs')
    expect(html).toMatch(/>Continue run<\/button>/)
  })

  it('0 plays left keeps Play enabled and shows the plays-left text', () => {
    const html = panel(byId('bp-04-sequence'), world, { ...RATE, used: 10, remaining: 0 })
    expect(html).toMatch(/<button type="button" class="[^"]*">Play<\/button>/)
    expect(html).toContain('0 plays left today')
    expect(html).toContain('You have no plays left today.')
  })

  it('a leg that cannot be launched disables Play with the generic line', () => {
    const node = makeNode({ id: 'bp-04-sequence', legs: [{ themeId: 'PATTERN_RECALL', difficulty: 1 }] })
    const html = panel(node, world)
    expect(html).toMatch(/<button type="button" disabled=""[^>]*>Play<\/button>/)
    expect(html).toContain('This node is not available right now.')
  })

  it('never renders catalogGameId', () => {
    expect(panel(byId('bp-04-sequence'), world)).not.toContain('catalog')
  })
})

describe('play URL from a node', () => {
  const world = makeWorld1()
  it('launches leg 0 of a plain node with the quest param', () => {
    expect(getPlayUrl(world.nodes[0], world)).toBe('/game?theme=ANIMALS&difficulty=easy&quest=brain-peaks%3Abp-01-memory%3A0')
  })
  it('launches the active run leg of the boss', () => {
    const runWorld = { ...world, activeGauntlet: { nodeId: 'bp-boss', legsDone: 1, legsTotal: 2, expiresAt: 'x' } }
    expect(getPlayUrl(world.nodes[7], runWorld)).toBe('/bubble-pop/game?difficulty=medium&quest=brain-peaks%3Abp-boss%3A1')
  })
  it('returns null for locked, unavailable and inaccessible nodes', () => {
    expect(getPlayUrl(world.nodes[5], world)).toBeNull()
    expect(getPlayUrl(world.nodes[4], world)).toBeNull()
    const w2 = makeWorld2Locked()
    expect(getPlayUrl(w2.nodes[0], w2)).toBeNull()
  })
})

describe('every config node is drawn (QUEST_WORLDS vs rendered buttons)', () => {
  const expectedIds = (worldId: string): string[] => {
    const world = QUEST_WORLDS.find((w) => w.id === worldId)!
    return [...world.nodes.map((n) => n.id), world.bonus.id]
  }
  const cases: Array<[string, string, () => QuestProgressView]> = [
    ['FREE (World 2 locked)', 'science-island', () => makeProgress()],
    ['FREE (World 2 locked)', 'brain-peaks', () => makeProgress()],
    ['paid', 'science-island', () => makeProgress({ tier: 'PAID', worlds: [makeWorld2Paid(), makeWorld1()] })],
    ['paid', 'brain-peaks', () => makeProgress({ tier: 'PAID', worlds: [makeWorld2Paid(), makeWorld1()] })],
  ]
  it.each(cases)('%s user: %s has a button for all 9 config nodes', (_label, worldId, build) => {
    const html = decode(renderMarkup(<QuestMapView {...viewProps({ data: build() })} />))
    const ids = nodeButtons(html)
      .map((b) => b.id)
      .filter((id) => expectedIds(worldId).includes(id))
    expect(expectedIds(worldId)).toHaveLength(9)
    expect(ids).toEqual(expectedIds(worldId))
  })
  it('fixture worlds list exactly the config nodes (no drift)', () => {
    for (const world of [makeWorld2Locked(), makeWorld2Paid()]) {
      expect(world.nodes.map((n) => n.id)).toEqual(expectedIds(world.id))
    }
    expect(makeWorld1().nodes.map((n) => n.id)).toEqual(expectedIds('brain-peaks'))
  })
  it('keeps Circuit Builder level params and launches them for a paid user', () => {
    const world = makeWorld2Paid()
    const node = world.nodes.find((n) => n.id === 'si-03-circuit-series')!
    expect(node.legs[0].params?.levelId).toBe('cb-03-series-loop')
    expect(getPlayUrl({ ...node, status: 'AVAILABLE' }, world)).toContain('cb-03-series-loop')
  })
})