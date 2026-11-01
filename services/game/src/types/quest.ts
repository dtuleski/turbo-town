import type {
  BadgeId,
  GauntletStatus,
  NodeStatus,
  QuestLeg,
  QuestNodeKind,
  Stars,
} from '@memory-game/shared';

/**
 * Quest Map response contracts (additive). `catalogGameId` is never part of these.
 */

export interface QuestResultPayload {
  worldId: string;
  nodeId: string;
  kind: QuestNodeKind;
  score: number;
  thresholds: [number, number, number];
  stars: Stars;
  bestStars: Stars;
  newlyUnlocked: string[];
  worldCleared: boolean;
  badgesAwarded: BadgeId[];
  gauntlet?: {
    legIndex: number;
    legsTotal: number;
    status: GauntletStatus;
    nextLeg?: { themeId: string; difficulty: number; params?: QuestLeg['params'] };
  };
}

export interface QuestNodeView {
  id: string;
  kind: QuestNodeKind;
  status: NodeStatus;
  stars: Stars;
  bestScore: number;
  thresholds: [number, number, number];
  map: { x: number; y: number };
  legs: { themeId: string; difficulty: number; params?: QuestLeg['params'] }[];
}

export interface QuestWorldView {
  id: string;
  order: number;
  accessible: boolean;
  totalStars: number;
  maxStars: number;
  badges: BadgeId[];
  activeGauntlet?: { nodeId: string; legsDone: number; legsTotal: number; expiresAt: string };
  /** Path nodes in order, bonus node last. */
  nodes: QuestNodeView[];
}

export interface QuestProgressView {
  tier: string;
  rateLimit: { limit: number; used: number; remaining: number; resetAt: string };
  worlds: QuestWorldView[];
}
