/**
 * Quest Map - pure evaluator (FR-QM-5, 9, 11, 12, 13, 18; NFR-QM-12).
 *
 * No I/O, no clock (time is an argument), inputs are never mutated. Every function takes the
 * world as an argument, so a v2 weekly node list can be evaluated with the same code.
 */
import type {
  BadgeId,
  EvalContext,
  NodeProgress,
  NodeResultInput,
  NodeResultOutcome,
  NodeStatus,
  QuestNode,
  QuestWorld,
  Stars,
  WorldProgress,
} from './types';

const BADGE_ORDER: readonly BadgeId[] = ['WORLD_CLEARED', 'WORLD_MASTERED'];

function toStars(n: number): Stars {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 3) return 3;
  return Math.floor(n) as Stars;
}

/** Inclusive lower bounds. Non-finite scores earn 0. */
export function starsForScore(thresholds: QuestNode['thresholds'], score: number): Stars {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 0;
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

function storedNode(progress: WorldProgress | undefined, nodeId: string): NodeProgress | undefined {
  if (!progress || !Object.prototype.hasOwnProperty.call(progress.nodes, nodeId)) return undefined;
  return progress.nodes[nodeId];
}

function starsOf(progress: WorldProgress | undefined, nodeId: string): number {
  const stars = storedNode(progress, nodeId)?.stars ?? 0;
  return Number.isFinite(stars) ? stars : 0;
}

/** Path nodes that are not unavailable (boss included, bonus never). */
function availablePath(world: QuestWorld, ctx: EvalContext): QuestNode[] {
  return world.nodes.filter((n) => !ctx.unavailableNodeIds.has(n.id));
}

function effectiveBonusThreshold(world: QuestWorld, ctx: EvalContext): number {
  return Math.min(world.bonusStarThreshold, 3 * availablePath(world, ctx).length);
}

/** Recomputed from node stars; the stored `totalStars` is never trusted. */
export function totalStars(
  world: QuestWorld,
  progress: WorldProgress | undefined,
  ctx: EvalContext
): number {
  return availablePath(world, ctx).reduce((sum, n) => sum + starsOf(progress, n.id), 0);
}

/** Maximum stars: 3 per available path node (boss included, bonus excluded, unavailable excluded). */
export function maxStars(world: QuestWorld, ctx: EvalContext): number {
  return 3 * availablePath(world, ctx).length;
}

interface Chain {
  statuses: Record<string, NodeStatus>;
  /** The "unlocked" flag at the boss: every earlier node was passed. */
  bossReached: boolean;
}

function evaluateChain(
  world: QuestWorld,
  progress: WorldProgress | undefined,
  ctx: EvalContext
): Chain {
  const statuses: Record<string, NodeStatus> = {};
  let unlocked = true;
  let bossReached = false;
  const lastIndex = world.nodes.length - 1;

  world.nodes.forEach((n, index) => {
    if (index === lastIndex) bossReached = unlocked;
    const stars = starsOf(progress, n.id);
    const unavailable = ctx.unavailableNodeIds.has(n.id);

    if (unavailable) statuses[n.id] = 'UNAVAILABLE';
    else if (stars > 0) statuses[n.id] = 'AVAILABLE';
    else statuses[n.id] = unlocked ? 'AVAILABLE' : 'LOCKED';

    // Does the next node unlock?
    if (stars > 0) unlocked = true;
    else if (!unavailable) unlocked = false; // unavailable: passed only if itself reached
  });

  if (ctx.unavailableNodeIds.has(world.bonus.id)) statuses[world.bonus.id] = 'UNAVAILABLE';
  else if (starsOf(progress, world.bonus.id) > 0) statuses[world.bonus.id] = 'AVAILABLE';
  else if (totalStars(world, progress, ctx) >= effectiveBonusThreshold(world, ctx)) {
    statuses[world.bonus.id] = 'AVAILABLE';
  } else statuses[world.bonus.id] = 'LOCKED';

  return { statuses, bossReached };
}

export function computeNodeStatuses(
  world: QuestWorld,
  progress: WorldProgress | undefined,
  ctx: EvalContext
): Record<string, NodeStatus> {
  return evaluateChain(world, progress, ctx).statuses;
}

/** True exactly for AVAILABLE; unknown ids are false. World tier access is not decided here. */
export function isNodeStartable(
  world: QuestWorld,
  nodeId: string,
  progress: WorldProgress | undefined,
  ctx: EvalContext
): boolean {
  const statuses = computeNodeStatuses(world, progress, ctx);
  return Object.prototype.hasOwnProperty.call(statuses, nodeId) && statuses[nodeId] === 'AVAILABLE';
}

export function emptyWorldProgress(worldId: string, nowIso: string): WorldProgress {
  return { worldId, nodes: {}, totalStars: 0, badges: [], version: 0, updatedAt: nowIso };
}

/** Existing badges plus anything newly earned, in fixed order. Badges are never removed. */
export function computeBadges(
  world: QuestWorld,
  progress: WorldProgress,
  ctx: EvalContext
): BadgeId[] {
  const { bossReached } = evaluateChain(world, progress, ctx);
  const boss = world.nodes[world.nodes.length - 1];
  const path = availablePath(world, ctx);

  const earned = new Set<BadgeId>();
  if (boss) {
    const bossUnavailable = ctx.unavailableNodeIds.has(boss.id);
    if (starsOf(progress, boss.id) >= 1 || (bossUnavailable && bossReached)) {
      earned.add('WORLD_CLEARED');
    }
  }
  if (path.length > 0 && path.every((n) => starsOf(progress, n.id) >= 3)) {
    earned.add('WORLD_MASTERED');
  }
  return BADGE_ORDER.filter((b) => progress.badges.includes(b) || earned.has(b));
}

/** The node's stored progress after one play: best values only rise (R-MONO-1, 4, 6). */
function nextNodeProgress(
  prev: NodeProgress | undefined,
  earned: Stars,
  score: number,
  result: NodeResultInput
): NodeProgress {
  const bestStars = toStars(Math.max(prev?.stars ?? 0, earned));
  const lastGameId = result.gameId ?? prev?.lastGameId;
  let firstClearedAt = prev?.firstClearedAt ?? '';
  if (!firstClearedAt && bestStars >= 1) firstClearedAt = result.nowIso;
  return {
    stars: bestStars,
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    firstClearedAt,
    lastPlayedAt: result.nowIso,
    ...(lastGameId !== undefined ? { lastGameId } : {}),
  };
}

function findNode(world: QuestWorld, nodeId: string): QuestNode | undefined {
  return world.bonus.id === nodeId ? world.bonus : world.nodes.find((n) => n.id === nodeId);
}

/** Monotonic: bestScore and stars never decrease. Throws only for an unknown node id. */
export function applyNodeResult(
  world: QuestWorld,
  progress: WorldProgress | undefined,
  result: NodeResultInput,
  ctx: EvalContext
): NodeResultOutcome {
  const node = findNode(world, result.nodeId);
  if (!node) throw new Error('Unknown quest node');

  const base: WorldProgress = progress
    ? { ...progress, nodes: { ...progress.nodes }, badges: [...progress.badges] }
    : emptyWorldProgress(world.id, result.nowIso);
  const before = computeNodeStatuses(world, progress, ctx);

  const score = Number.isFinite(result.score) && result.score >= 0 ? result.score : 0;
  const earned = starsForScore(node.thresholds, score);
  const next = nextNodeProgress(storedNode(progress, node.id), earned, score, result);
  const bestStars = next.stars;

  const nodes = { ...base.nodes, [node.id]: next };
  const interim: WorldProgress = { ...base, nodes };
  const updated: WorldProgress = {
    ...interim,
    totalStars: totalStars(world, interim, ctx),
    updatedAt: result.nowIso,
    badges: computeBadges(world, interim, ctx),
  };

  const after = computeNodeStatuses(world, updated, ctx);
  const newlyUnlocked = [...world.nodes, world.bonus]
    .map((n) => n.id)
    .filter((id) => id !== node.id && before[id] === 'LOCKED' && after[id] === 'AVAILABLE');
  const badgesAwarded = updated.badges.filter((b) => !base.badges.includes(b));

  return {
    progress: updated,
    stars: earned,
    bestStars,
    score,
    newlyUnlocked,
    worldCleared: badgesAwarded.includes('WORLD_CLEARED'),
    badgesAwarded,
  };
}
