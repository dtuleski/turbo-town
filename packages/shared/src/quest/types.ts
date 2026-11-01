/**
 * Quest Map - shared types.
 *
 * Pure data shapes only. Nothing in the quest module reads a clock, a database or the network
 * (NFR-QM-12), so the same types can describe a v2 weekly node list.
 */

export type QuestAccessTier = 'FREE' | 'PAID';
export type QuestNodeKind = 'GAME' | 'BOSS' | 'BONUS';
export type Stars = 0 | 1 | 2 | 3;
/** A node with stars > 0 is always reported AVAILABLE (replay). */
export type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'UNAVAILABLE';
export type BadgeId = 'WORLD_CLEARED' | 'WORLD_MASTERED';
export type QuestDifficulty = 1 | 2 | 3 | 4;

export interface QuestLeg {
  /** Server theme id (for Memory Match, the card theme such as ANIMALS). */
  themeId: string;
  /** Kebab-case catalog id used to decide availability (FR-QM-18). */
  catalogGameId: string;
  difficulty: QuestDifficulty;
  params?: { levelId?: string; pageTheme?: string };
}

export interface QuestNode {
  id: string;
  kind: QuestNodeKind;
  /** 1 leg, or 2-3 legs for a BOSS. */
  legs: readonly QuestLeg[];
  /** Strictly ascending score bounds; the combined score of all legs for a BOSS. */
  thresholds: readonly [number, number, number];
  /** Percent of the map box (0-100), y grows downward. */
  map: { x: number; y: number };
}

export interface QuestWorld {
  id: string;
  order: number;
  accessTier: QuestAccessTier;
  /** Path order; the last node is the BOSS. The bonus node is not part of the path. */
  nodes: readonly QuestNode[];
  bonus: QuestNode;
  bonusStarThreshold: number;
}

export interface NodeProgress {
  stars: Stars;
  bestScore: number;
  /** '' until the first result of 1 star or more. */
  firstClearedAt: string;
  lastPlayedAt: string;
  /** Last gameId applied to this node, whether or not it improved the result. */
  lastGameId?: string;
}

export interface GauntletLegResult {
  gameId: string;
  score: number;
}

export interface GauntletAttempt {
  nodeId: string;
  /** One entry per completed leg, in order. */
  legs: GauntletLegResult[];
  startedAt: string;
  lastActivityAt: string;
}

export interface WorldProgress {
  worldId: string;
  nodes: Record<string, NodeProgress>;
  totalStars: number;
  badges: BadgeId[];
  activeGauntlet?: GauntletAttempt;
  version: number;
  updatedAt: string;
}

export interface QuestContext {
  worldId: string;
  nodeId: string;
  legIndex: number;
}

/** Built by the caller from the catalog: nodes with any non-ACTIVE game (FR-QM-18). */
export interface EvalContext {
  unavailableNodeIds: ReadonlySet<string>;
}

export interface NodeResultInput {
  nodeId: string;
  score: number;
  nowIso: string;
  gameId?: string;
}

export interface NodeResultOutcome {
  progress: WorldProgress;
  /** Stars earned by this play. */
  stars: Stars;
  /** Best stars after this play. */
  bestStars: Stars;
  /** The sanitized score used for this play. */
  score: number;
  newlyUnlocked: string[];
  worldCleared: boolean;
  badgesAwarded: BadgeId[];
}

export type GauntletStatus = 'IN_PROGRESS' | 'COMPLETE' | 'EXPIRED';

export interface RecordLegInput {
  legIndex: number;
  gameId: string;
  score: number;
  nowIso: string;
}

export interface RecordLegOutcome {
  attempt: GauntletAttempt | undefined;
  status: GauntletStatus;
  combinedScore?: number;
}

export interface ValidatorDeps {
  knownThemeIds: ReadonlySet<string>;
  paidThemeIds: ReadonlySet<string>;
  levelDifficulty: (levelId: string) => number | undefined;
  pageThemeRequired: ReadonlySet<string>;
}
