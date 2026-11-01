import type { QuestNodeView, QuestProgressView, QuestWorldView } from '@/types/quest'
import { getWorld } from '@/utils/questShared'

/** Test fixtures for the Quest Map (not shipped code paths; only tests import this). */
export function makeNode(overrides: Partial<QuestNodeView> & { id: string }): QuestNodeView {
  return {
    kind: 'GAME',
    status: 'AVAILABLE',
    stars: 0,
    bestScore: 0,
    thresholds: [100, 200, 300],
    map: { x: 50, y: 50 },
    legs: [{ themeId: 'MATH_CHALLENGE', difficulty: 1 }],
    ...overrides,
  }
}

/** World 1 with every visual state: earned 3/2/1, available, locked, unavailable, boss, bonus. */
export function makeWorld1(): QuestWorldView {
  return {
    id: 'brain-peaks',
    order: 1,
    accessible: true,
    totalStars: 6,
    maxStars: 24,
    badges: [],
    activeGauntlet: null,
    nodes: [
      makeNode({ id: 'bp-01-memory', stars: 3, bestScore: 2700, map: { x: 20, y: 92 }, legs: [{ themeId: 'ANIMALS', difficulty: 1 }] }),
      makeNode({ id: 'bp-02-math', stars: 2, bestScore: 2400, map: { x: 60, y: 84 } }),
      makeNode({ id: 'bp-03-words', stars: 1, bestScore: 1700, map: { x: 80, y: 70 }, legs: [{ themeId: 'WORD_PUZZLE', difficulty: 1 }] }),
      makeNode({ id: 'bp-04-sequence', map: { x: 45, y: 62 }, legs: [{ themeId: 'SEQUENCE_MEMORY', difficulty: 2 }] }),
      makeNode({ id: 'bp-05-geo', status: 'UNAVAILABLE', map: { x: 18, y: 50 }, legs: [{ themeId: 'GEO_QUIZ', difficulty: 2 }] }),
      makeNode({ id: 'bp-06-maze', status: 'LOCKED', map: { x: 42, y: 38 }, legs: [{ themeId: 'MATH_MAZE', difficulty: 2 }] }),
      makeNode({ id: 'bp-07-memory-space', status: 'LOCKED', map: { x: 72, y: 28 }, legs: [{ themeId: 'SPACE', difficulty: 3 }] }),
      makeNode({
        id: 'bp-boss',
        kind: 'BOSS',
        status: 'AVAILABLE',
        map: { x: 50, y: 10 },
        thresholds: [5550, 7000, 7400],
        legs: [
          { themeId: 'MATH_CHALLENGE', difficulty: 2 },
          { themeId: 'BUBBLE_POP', difficulty: 2 },
        ],
      }),
      makeNode({ id: 'bp-bonus-sequence', kind: 'BONUS', status: 'LOCKED', map: { x: 84, y: 10 }, legs: [{ themeId: 'SEQUENCE_MEMORY', difficulty: 3 }] }),
    ],
  }
}

/**
 * A world built from the shared QUEST_WORLDS config exactly as the server maps it (every path
 * node, then the bonus; catalogGameId dropped, leg params kept), so a fixture cannot drift from
 * the real node list. `stars` and `status` are overridable per node id.
 */
export function makeWorldFromConfig(
  worldId: string,
  options: {
    accessible: boolean
    stars?: Record<string, 1 | 2 | 3>
    status?: Record<string, QuestNodeView['status']>
  }
): QuestWorldView {
  const world = getWorld(worldId)
  if (!world) throw new Error(`Unknown quest world ${worldId}`)
  const nodes = [...world.nodes, world.bonus].map((n) =>
    makeNode({
      id: n.id,
      kind: n.kind,
      status: options.status?.[n.id] ?? 'LOCKED',
      stars: options.stars?.[n.id] ?? 0,
      thresholds: [...n.thresholds] as [number, number, number],
      map: { x: n.map.x, y: n.map.y },
      legs: n.legs.map((l) => ({
        themeId: l.themeId,
        difficulty: l.difficulty,
        ...(l.params ? { params: { ...l.params } } : {}),
      })),
    })
  )
  const total = Object.values(options.stars ?? {}).reduce<number>((sum, s) => sum + s, 0)
  return {
    id: world.id,
    order: world.order,
    accessible: options.accessible,
    totalStars: total,
    maxStars: 24,
    badges: [],
    activeGauntlet: null,
    nodes,
  }
}

/** World 2 as a FREE user sees it: not accessible, all 9 nodes locked, stored stars on one node. */
export function makeWorld2Locked(): QuestWorldView {
  return makeWorldFromConfig('science-island', {
    accessible: false,
    stars: { 'si-01-bond-burn': 2 },
    status: { 'si-01-bond-burn': 'AVAILABLE' },
  })
}

/** World 2 as a PAID user sees it: accessible, node 1 done, node 2 next, the rest locked. */
export function makeWorld2Paid(): QuestWorldView {
  return makeWorldFromConfig('science-island', {
    accessible: true,
    stars: { 'si-01-bond-burn': 2 },
    status: { 'si-01-bond-burn': 'AVAILABLE', 'si-02-space-entry': 'AVAILABLE' },
  })
}
export function makeProgress(overrides: Partial<QuestProgressView> = {}): QuestProgressView {
  return {
    tier: 'FREE',
    rateLimit: { limit: 10, used: 3, remaining: 7, resetAt: '2026-01-02T00:00:00.000Z' },
    worlds: [makeWorld2Locked(), makeWorld1()],
    ...overrides,
  }
}
