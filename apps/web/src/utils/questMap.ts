import type { LegView, QuestActiveGauntlet, QuestNodeView, QuestWorldView } from '@/types/quest'

/**
 * Pure Quest Map view logic (FD sections 1 to 3). The server decides statuses, stars and access;
 * nothing here recomputes unlock rules, it only maps what the server sent to what is drawn.
 */
export type NodeVisualState = 'locked' | 'available' | 'earned1' | 'earned2' | 'earned3' | 'unavailable'

const KNOWN_KINDS: ReadonlySet<string> = new Set(['GAME', 'BOSS', 'BONUS'])
const KNOWN_STATUSES: ReadonlySet<string> = new Set(['LOCKED', 'AVAILABLE', 'UNAVAILABLE'])

const isKnown = (node: Pick<QuestNodeView, 'kind' | 'status'>): boolean =>
  KNOWN_KINDS.has(node.kind) && KNOWN_STATUSES.has(node.status)

/** Stars to draw under a node (0 to 3); unavailable nodes show none. */
export function getShownStars(node: Pick<QuestNodeView, 'stars' | 'status'>): number {
  if (node.status === 'UNAVAILABLE') return 0
  const stars = Number(node.stars)
  return Number.isInteger(stars) ? Math.min(3, Math.max(0, stars)) : 0
}

export function getNodeVisualState(
  node: Pick<QuestNodeView, 'kind' | 'status' | 'stars'>,
  worldAccessible: boolean
): NodeVisualState {
  if (!worldAccessible || !isKnown(node)) return 'locked'
  if (node.status === 'LOCKED') return 'locked'
  if (node.status === 'UNAVAILABLE') return 'unavailable'
  const stars = getShownStars(node)
  if (stars === 0) return 'available'
  return `earned${stars}` as NodeVisualState
}

export interface NodeAriaParts {
  /** Main key, interpolated with `{ name, count }`. */
  key: string
  count: number
  /** Extra keys appended in order (boss, bonus, new). */
  extras: string[]
}

export function getNodeAriaParts(
  node: Pick<QuestNodeView, 'kind' | 'status' | 'stars'>,
  state: NodeVisualState,
  justUnlocked = false
): NodeAriaParts {
  const key = state.startsWith('earned') ? 'quest.node.aria.earned' : `quest.node.aria.${state}`
  const extras: string[] = []
  if (node.kind === 'BOSS') extras.push('quest.node.aria.boss')
  if (node.kind === 'BONUS') extras.push('quest.node.aria.bonus')
  if (justUnlocked) extras.push('quest.node.aria.new')
  return { key, count: getShownStars(node), extras }
}

/** A non-colour cue per state, so the state is never conveyed by colour alone. */
export function getNodeIcon(state: NodeVisualState): string {
  switch (state) {
    case 'locked':
      return '🔒'
    case 'available':
      return '▶'
    case 'unavailable':
      return '⊘'
    default:
      return '★'.repeat(Number(state.slice(-1)))
  }
}

/** Horizontal lane position on phones: keeps a 48px node inside a 288px lane at 320px. */
export function getPhonePosition(x: number): number {
  return Math.min(85, Math.max(15, x))
}

export function canLaunch(node: QuestNodeView, world: Pick<QuestWorldView, 'accessible'>): boolean {
  return world.accessible && isKnown(node) && node.status === 'AVAILABLE'
}

/** First AVAILABLE node with the lowest stars, in path order. */
export function getFrontierNodeId(world: QuestWorldView): string | null {
  let best: QuestNodeView | null = null
  for (const node of world.nodes) {
    if (!canLaunch(node, world)) continue
    if (best === null || getShownStars(node) < getShownStars(best)) best = node
  }
  return best?.id ?? null
}

export interface Point {
  x: number
  y: number
}

const fmt = (n: number): string => String(Math.round(n * 100) / 100)

/**
 * Smooth winding path through the points: per pair, a quadratic segment to the midpoint with the
 * control point above the start, then a reflected (`T`) segment to the end. Tangents at every node
 * are vertical, so consecutive pairs join without a kink.
 */
export function buildPathD(points: readonly Point[]): string {
  if (points.length === 0) return ''
  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    d += ` Q ${fmt(a.x)} ${fmt(my)} ${fmt(mx)} ${fmt(my)} T ${fmt(b.x)} ${fmt(b.y)}`
  }
  return d
}

/** Path nodes (bonus excluded), in order. */
export function getPathNodes(nodes: readonly QuestNodeView[]): QuestNodeView[] {
  return nodes.filter((node) => node.kind !== 'BONUS')
}

/** Segments drawn as completed: up to the last path node with stars > 0. */
export function completedSegmentCount(nodes: readonly QuestNodeView[]): number {
  const path = getPathNodes(nodes)
  let last = -1
  path.forEach((node, index) => {
    if (getShownStars(node) > 0) last = index
  })
  return Math.max(0, last)
}

/** Nodes in DOM order: path order, bonus last. */
export function orderNodes(nodes: readonly QuestNodeView[]): QuestNodeView[] {
  return [...getPathNodes(nodes), ...nodes.filter((node) => node.kind === 'BONUS')]
}

/** Vertical (phone) row centre in a 0-100 box, row 0 at the bottom. */
export function getPhoneRowY(index: number, rows: number): number {
  return 100 - ((index + 0.5) * 100) / Math.max(1, rows)
}

const isActiveRun = (node: QuestNodeView, run: QuestActiveGauntlet | null | undefined): boolean =>
  node.kind === 'BOSS' && run != null && run.nodeId === node.id && run.legsDone < node.legs.length

export function getPlayLabelKey(
  node: QuestNodeView,
  activeGauntlet: QuestActiveGauntlet | null | undefined
): string {
  if (isActiveRun(node, activeGauntlet)) return 'quest.panel.continue'
  return getShownStars(node) > 0 ? 'quest.panel.replay' : 'quest.panel.play'
}

export function getLegToRun(
  node: QuestNodeView,
  activeGauntlet: QuestActiveGauntlet | null | undefined
): { leg: LegView; legIndex: number } | null {
  if (node.legs.length === 0) return null
  if (isActiveRun(node, activeGauntlet) && activeGauntlet) {
    return { leg: node.legs[activeGauntlet.legsDone], legIndex: activeGauntlet.legsDone }
  }
  return { leg: node.legs[0], legIndex: 0 }
}

export type StartFailed = 'rate' | 'quest' | null

/** Allowlisted `?startFailed=` (R1 return); anything else is ignored. */
export function resolveStartFailed(search: string): StartFailed {
  try {
    const value = new URLSearchParams(search).get('startFailed')
    return value === 'rate' || value === 'quest' ? value : null
  } catch {
    return null
  }
}
