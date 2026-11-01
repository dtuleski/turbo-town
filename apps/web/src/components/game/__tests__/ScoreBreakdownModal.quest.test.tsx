import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuestResultPayload } from '@/types/quest'

// Stand-ins: Modal portals to document.body (no DOM in node) and Button handlers are captured.
const captured = vi.hoisted(() => ({
  modalOnClose: null as null | (() => void),
  buttons: new Map<string, () => void>(),
  navigate: null as unknown as ReturnType<typeof vi.fn>,
}))

vi.mock('@/components/common/Modal', () => ({
  default: ({ onClose, children }: { onClose: () => void; children: ReactNode }) => {
    captured.modalOnClose = onClose
    return <div data-testid="modal">{children}</div>
  },
}))

vi.mock('@/components/common/Button', () => ({
  default: ({ onClick, children }: { onClick?: () => void; children: ReactNode }) => {
    const text = Array.isArray(children) ? children.join('') : String(children)
    if (onClick) captured.buttons.set(text, onClick)
    return <button type="button">{children}</button>
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => captured.navigate }
})

vi.mock('@/api/game', () => ({ submitGameReview: vi.fn() }))

import ScoreBreakdownModal from '../ScoreBreakdownModal'
import { questResultStore } from '@/utils/questResultStore'
import { decode, renderMarkup } from '@/test/renderWithProviders'

const BREAKDOWN = {
  baseScore: 1000,
  difficultyMultiplier: 1,
  speedBonus: 1,
  accuracyBonus: 1,
  finalScore: 2400,
  difficulty: 'EASY',
  completionTime: 40,
  accuracy: 0.9,
}

const PLAIN: QuestResultPayload = {
  worldId: 'brain-peaks',
  nodeId: 'bp-02-math',
  kind: 'GAME',
  score: 2400,
  thresholds: [1800, 2350, 2650],
  stars: 2,
  bestStars: 2,
  newlyUnlocked: ['bp-03-words'],
  worldCleared: false,
  badgesAwarded: [],
}

const BOSS_MID: QuestResultPayload = {
  ...PLAIN,
  nodeId: 'bp-boss',
  kind: 'BOSS',
  newlyUnlocked: [],
  stars: 0,
  bestStars: 0,
  gauntlet: { legIndex: 0, legsTotal: 2, status: 'IN_PROGRESS', nextLeg: { themeId: 'BUBBLE_POP', difficulty: 2 } },
}

const QUEST_URL = '/math/game?difficulty=easy&quest=brain-peaks:bp-02-math:0'

function render(url: string, onClose = vi.fn(), onPlayAgain = vi.fn()) {
  const html = decode(
    renderMarkup(
      <ScoreBreakdownModal isOpen onClose={onClose} scoreBreakdown={BREAKDOWN} leaderboardRank={5} onPlayAgain={onPlayAgain} gameType="MATH_CHALLENGE" />,
      [url]
    )
  )
  return { html, onClose, onPlayAgain }
}

beforeEach(() => {
  captured.modalOnClose = null
  captured.buttons = new Map()
  captured.navigate = vi.fn()
  questResultStore.set(null)
})
afterEach(() => questResultStore.set(null))

describe('ScoreBreakdownModal in quest mode (R2)', () => {
  it.each([
    ['valid quest param, empty store', QUEST_URL, null],
    ['no param, stored result', '/math/game?difficulty=easy', PLAIN],
  ])('%s: no Play again, every close path goes to the map', (_label, url, stored) => {
    questResultStore.set(stored)
    const { html, onClose, onPlayAgain } = render(url)
    expect(html).not.toContain('Play Again')
    expect([...captured.buttons.keys()].some((k) => k.includes('Play Again'))).toBe(false)
    expect(html).toContain('Back to map')

    captured.modalOnClose?.()
    captured.buttons.get('Close')?.()
    captured.buttons.get('Back to map')?.()
    expect(captured.navigate).toHaveBeenCalledTimes(3)
    for (const call of captured.navigate.mock.calls) expect(call).toEqual(['/quest-map'])
    expect(onClose).not.toHaveBeenCalled()
    expect(onPlayAgain).not.toHaveBeenCalled()
  })

  it('shows the quest section with stars and unlocks', () => {
    questResultStore.set(PLAIN)
    const { html } = render(QUEST_URL)
    expect(html).toContain('Stars this run: 2 of 3')
    expect(html).toContain('Unlocked: Word Hunt')
  })

  it('empty store in quest mode shows the not-saved line and Back to map', () => {
    const { html } = render(QUEST_URL)
    expect(html).toContain('Progress could not be saved, replay to retry.')
    expect(html).toContain('Back to map')
  })

  it('boss mid-run offers Next leg to the next leg URL', () => {
    questResultStore.set(BOSS_MID)
    const { html } = render('/math/game?difficulty=medium&quest=brain-peaks:bp-boss:0')
    expect(html).toContain('Leg 1 of 2 done')
    expect(html).toMatch(/<button[^>]*>Next leg<\/button>/)
  })

  it('keeps the leaderboard button', () => {
    questResultStore.set(PLAIN)
    render(QUEST_URL)
    const key = [...captured.buttons.keys()].find((k) => k.includes('Leaderboard'))
    expect(key).toBeDefined()
    captured.buttons.get(key as string)?.()
    expect(captured.navigate).toHaveBeenCalledWith('/leaderboard')
  })
})

describe('ScoreBreakdownModal outside quest mode (unchanged)', () => {
  it('shows Play again, which calls onPlayAgain then onClose; Close calls onClose', () => {
    const { html, onClose, onPlayAgain } = render('/math/game?difficulty=easy')
    const playAgainLabel = [...captured.buttons.keys()].find((k) => k.includes('Play Again'))
    expect(playAgainLabel).toBeDefined()
    expect(html).not.toContain('Back to map')
    expect(html).not.toContain('Stars this run')

    captured.buttons.get(playAgainLabel as string)?.()
    expect(onPlayAgain).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)

    captured.buttons.get('Close')?.()
    captured.modalOnClose?.()
    expect(onClose).toHaveBeenCalledTimes(3)
    expect(captured.navigate).not.toHaveBeenCalled()
  })

  it('an invalid quest param is not quest mode', () => {
    const { html } = render('/math/game?quest=nope')
    expect(html).not.toContain('Back to map')
  })
})
