import type { BadgeId, GauntletStatus, NodeStatus, QuestNodeKind, Stars } from '@/utils/questShared'

/**
 * Web copies of the Quest Map response contracts (the GraphQL response shape). The server owns the
 * originals in services/game; `catalogGameId` is never part of them.
 */
export interface LegParams {
  levelId?: string | null
  pageTheme?: string | null
}

export interface LegView {
  themeId: string
  difficulty: number
  params?: LegParams | null
}

export interface QuestNodeView {
  id: string
  kind: QuestNodeKind
  status: NodeStatus
  stars: Stars
  bestScore: number
  thresholds: [number, number, number]
  map: { x: number; y: number }
  legs: LegView[]
}

export interface QuestActiveGauntlet {
  nodeId: string
  legsDone: number
  legsTotal: number
  expiresAt: string
}

export interface QuestWorldView {
  id: string
  order: number
  accessible: boolean
  totalStars: number
  maxStars: number
  badges: BadgeId[]
  activeGauntlet?: QuestActiveGauntlet | null
  /** Path nodes in order, bonus node last. */
  nodes: QuestNodeView[]
}

export interface QuestRateLimitView {
  limit: number
  used: number
  remaining: number
  resetAt: string
}

export interface QuestProgressView {
  tier: string
  rateLimit: QuestRateLimitView
  worlds: QuestWorldView[]
}

export interface QuestResultPayload {
  worldId: string
  nodeId: string
  kind: QuestNodeKind
  score: number
  thresholds: number[]
  stars: Stars
  bestStars: Stars
  newlyUnlocked: string[]
  worldCleared: boolean
  badgesAwarded: BadgeId[]
  gauntlet?: {
    legIndex: number
    legsTotal: number
    status: GauntletStatus
    nextLeg?: LegView | null
  } | null
}
