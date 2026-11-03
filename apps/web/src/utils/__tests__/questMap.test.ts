import { describe, expect, it } from 'vitest'
import type { QuestNodeView, QuestResultPayload, QuestWorldView } from '@/types/quest'
import { ROUTES } from '@/config/constants'
import { makeNode, makeWorld1 } from '@/test/questFixtures'
import {
  buildPathD,
  canLaunch,
  completedSegmentCount,
  getFrontierNodeId,
  getLegToRun,
  getNodeAriaParts,
  getNodeIcon,
  getNodeVisualState,
  getPhonePosition,
  getPlayLabelKey,
  getPlayUrl,
  getShownStars,
  orderNodes,
  resolveStartFailed,
} from '../questMap'
import { getNextLegUrl } from '../questModal'
import { QUEST_WORLDS } from '../questShared'

type Row = [string, Partial<QuestNodeView>, boolean, string]

describe('boss gauntlet launch after leg 0 (FR-QM-10, the reporting player)', () => {
  const world = (activeGauntlet: QuestWorldView['activeGauntlet']): QuestWorldView => ({
    ...makeWorld1(),
    activeGauntlet,
  })
  const boss = (w: QuestWorldView) => w.nodes.find((n) => n.id === 'bp-boss') as QuestNodeView

  it('Next leg launches BUBBLE_POP leg 1 with the world:node:leg quest param', () => {
    const url = getNextLegUrl({
      worldId: 'brain-peaks',
      nodeId: 'bp-boss',
      kind: 'BOSS',
      score: 4117,
      stars: 0,
      bestStars: 0,
      newlyUnlocked: [],
      worldCleared: false,
      badgesAwarded: [],
      thresholds: [5550, 7000, 7400],
      gauntlet: { legIndex: 0, legsTotal: 2, status: 'IN_PROGRESS', nextLeg: { themeId: 'BUBBLE_POP', difficulty: 2 } },
    } as unknown as QuestResultPayload)
    expect(url).toContain(ROUTES.BUBBLE_POP_GAME)
    expect(url).toContain('difficulty=medium')
    expect(new URLSearchParams(url!.split('?')[1]).get('quest')).toBe('brain-peaks:bp-boss:1')
  })

  it('Play on a boss with an active, unexpired attempt whose leg 0 is done launches leg 1', () => {
    const w = world({ nodeId: 'bp-boss', legsDone: 1, legsTotal: 2, expiresAt: '2026-11-03T21:00:00.000Z' })
    const url = getPlayUrl(boss(w), w)
    expect(url).toContain(ROUTES.BUBBLE_POP_GAME)
    expect(new URLSearchParams(url!.split('?')[1]).get('quest')).toBe('brain-peaks:bp-boss:1')
    expect(getPlayLabelKey(boss(w), w.activeGauntlet)).toBe('quest.panel.continue')
  })

  it('Play after expiry (server sends no active attempt) launches leg 0', () => {
    const w = world(null)
    const url = getPlayUrl(boss(w), w)
    expect(url).toContain(ROUTES.MATH_GAME)
    expect(new URLSearchParams(url!.split('?')[1]).get('quest')).toBe('brain-peaks:bp-boss:0')
  })

  it('an attempt for another node does not change which leg runs', () => {
    const w = world({ nodeId: 'bp-02-math', legsDone: 1, legsTotal: 2, expiresAt: '2026-11-03T21:00:00.000Z' })
    expect(getPlayUrl(boss(w), w)).toContain('quest=brain-peaks%3Abp-boss%3A0')
  })
})

describe('getNodeVisualState (FD section 1)', () => {
  const rows: Row[] = [
    ['locked', { status: 'LOCKED' }, true, 'locked'],
    ['available', { status: 'AVAILABLE', stars: 0 }, true, 'available'],
    ['earned 1', { status: 'AVAILABLE', stars: 1 }, true, 'earned1'],
    ['earned 2', { status: 'AVAILABLE', stars: 2 }, true, 'earned2'],
    ['earned 3', { status: 'AVAILABLE', stars: 3 }, true, 'earned3'],
    ['unavailable', { status: 'UNAVAILABLE', stars: 2 }, true, 'unavailable'],
    ['boss available', { kind: 'BOSS', status: 'AVAILABLE' }, true, 'available'],
    ['boss locked', { kind: 'BOSS', status: 'LOCKED' }, true, 'locked'],
    ['boss earned', { kind: 'BOSS', status: 'AVAILABLE', stars: 3 }, true, 'earned3'],
    ['bonus locked', { kind: 'BONUS', status: 'LOCKED' }, true, 'locked'],
    ['bonus earned', { kind: 'BONUS', status: 'AVAILABLE', stars: 1 }, true, 'earned1'],
    ['bonus unavailable', { kind: 'BONUS', status: 'UNAVAILABLE' }, true, 'unavailable'],
    ['world not accessible', { status: 'AVAILABLE', stars: 2 }, false, 'locked'],
    ['world not accessible unavailable', { status: 'UNAVAILABLE' }, false, 'locked'],
    ['unknown status', { status: 'WHATEVER' as never }, true, 'locked'],
    ['unknown kind', { kind: 'SECRET' as never }, true, 'locked'],
  ]
  it.each(rows)('%s', (_label, overrides, accessible, expected) => {
    expect(getNodeVisualState(makeNode({ id: 'n', ...overrides }), accessible)).toBe(expected)
  })

  it('unknown kind or status is never startable', () => {
    const world = { accessible: true }
    expect(canLaunch(makeNode({ id: 'n', kind: 'SECRET' as never }), world)).toBe(false)
    expect(canLaunch(makeNode({ id: 'n', status: 'X' as never }), world)).toBe(false)
    expect(canLaunch(makeNode({ id: 'n' }), world)).toBe(true)
    expect(canLaunch(makeNode({ id: 'n' }), { accessible: false })).toBe(false)
    expect(canLaunch(makeNode({ id: 'n', status: 'LOCKED' }), world)).toBe(false)
  })

  it('keeps stored stars visible when the world is not accessible, hides them when unavailable', () => {
    expect(getShownStars(makeNode({ id: 'n', stars: 2 }))).toBe(2)
    expect(getShownStars(makeNode({ id: 'n', stars: 2, status: 'UNAVAILABLE' }))).toBe(0)
    expect(getShownStars(makeNode({ id: 'n', stars: 7 as never }))).toBe(3)
  })
})

describe('accessible name parts and icons', () => {
  it('maps each state to its aria key with boss/bonus/new extras', () => {
    const boss = makeNode({ id: 'b', kind: 'BOSS', stars: 2 })
    expect(getNodeAriaParts(boss, 'earned2', true)).toEqual({
      key: 'quest.node.aria.earned',
      count: 2,
      extras: ['quest.node.aria.boss', 'quest.node.aria.new'],
    })
    const bonus = makeNode({ id: 'x', kind: 'BONUS', status: 'LOCKED' })
    expect(getNodeAriaParts(bonus, 'locked')).toEqual({
      key: 'quest.node.aria.locked',
      count: 0,
      extras: ['quest.node.aria.bonus'],
    })
    expect(getNodeAriaParts(makeNode({ id: 'u', status: 'UNAVAILABLE' }), 'unavailable').key).toBe(
      'quest.node.aria.unavailable'
    )
  })
  it('gives every state a distinct icon', () => {
    const states = ['locked', 'available', 'earned1', 'earned2', 'earned3', 'unavailable'] as const
    expect(new Set(states.map(getNodeIcon)).size).toBe(states.length)
  })
})

describe('positions and spacing', () => {
  it.each([
    [0, 15],
    [14, 15],
    [15, 15],
    [50, 50],
    [85, 85],
    [86, 85],
    [100, 85],
  ])('clamps %d to %d', (x, expected) => {
    expect(getPhonePosition(x)).toBe(expected)
  })

  it('no two nodes of a configured world are closer than 8 units', () => {
    for (const world of QUEST_WORLDS) {
      const nodes = [...world.nodes, world.bonus]
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const d = Math.hypot(nodes[i].map.x - nodes[j].map.x, nodes[i].map.y - nodes[j].map.y)
          expect(d, `${nodes[i].id} vs ${nodes[j].id}`).toBeGreaterThanOrEqual(8)
        }
      }
    }
  })
})

describe('frontier, path and order', () => {
  it('frontier is the first AVAILABLE node with the lowest stars', () => {
    expect(getFrontierNodeId(makeWorld1())).toBe('bp-04-sequence')
    const world = makeWorld1()
    world.nodes = world.nodes.map((n) => ({ ...n, stars: n.status === 'AVAILABLE' ? 3 : 0 }) as QuestNodeView)
    expect(getFrontierNodeId(world)).toBe('bp-01-memory')
    expect(getFrontierNodeId({ ...makeWorld1(), accessible: false })).toBeNull()
  })

  it('path string starts with M and has one segment per node pair', () => {
    const d = buildPathD([
      { x: 20, y: 92 },
      { x: 60, y: 84 },
      { x: 80, y: 70 },
    ])
    expect(d.startsWith('M 20 92')).toBe(true)
    expect(d.match(/Q/g)).toHaveLength(2)
    expect(d.endsWith('T 80 70')).toBe(true)
    expect(buildPathD([])).toBe('')
  })

  it('counts completed segments up to the last path node with stars', () => {
    expect(completedSegmentCount(makeWorld1().nodes)).toBe(2)
    expect(completedSegmentCount([makeNode({ id: 'a' }), makeNode({ id: 'b' })])).toBe(0)
  })

  it('orders nodes with the bonus last', () => {
    const nodes = makeWorld1().nodes
    const ordered = orderNodes([nodes[8], ...nodes.slice(0, 8)])
    expect(ordered[ordered.length - 1].id).toBe('bp-bonus-sequence')
    expect(ordered[0].id).toBe('bp-01-memory')
  })
})

describe('play label and leg selection', () => {
  const boss = makeWorld1().nodes[7]
  it('play / replay / continue', () => {
    expect(getPlayLabelKey(boss, null)).toBe('quest.panel.play')
    expect(getPlayLabelKey({ ...boss, stars: 1 }, null)).toBe('quest.panel.replay')
    const run = { nodeId: 'bp-boss', legsDone: 1, legsTotal: 2, expiresAt: 'x' }
    expect(getPlayLabelKey(boss, run)).toBe('quest.panel.continue')
    expect(getPlayLabelKey(boss, { ...run, nodeId: 'other' })).toBe('quest.panel.play')
  })
  it('runs leg 0 or the active run leg', () => {
    expect(getLegToRun(boss, null)).toEqual({ leg: boss.legs[0], legIndex: 0 })
    const run = { nodeId: 'bp-boss', legsDone: 1, legsTotal: 2, expiresAt: 'x' }
    expect(getLegToRun(boss, run)).toEqual({ leg: boss.legs[1], legIndex: 1 })
    expect(getLegToRun(boss, { ...run, legsDone: 2 })).toEqual({ leg: boss.legs[0], legIndex: 0 })
    expect(getLegToRun({ ...boss, legs: [] }, null)).toBeNull()
  })
})

describe('resolveStartFailed', () => {
  it.each([
    ['?startFailed=rate', 'rate'],
    ['?startFailed=quest', 'quest'],
    ['?startFailed=other', null],
    ['?startFailed=', null],
    ['', null],
  ])('%s -> %s', (search, expected) => {
    expect(resolveStartFailed(search)).toBe(expected)
  })
})
