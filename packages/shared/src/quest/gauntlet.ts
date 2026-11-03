/**
 * Quest Map - boss gauntlet rules (FR-QM-10). Pure: time is always an argument.
 *
 * Expiry is evaluated only at leg start (`canStartLeg`); `recordLeg` has no clock check.
 * A duplicate of the FINAL leg arrives with no attempt left, so the caller detects it through
 * `NodeProgress.lastGameId` before calling `recordLeg`.
 */
import type { GauntletAttempt, QuestNode, RecordLegInput, RecordLegOutcome } from './types';

export const GAUNTLET_TTL_MS = 30 * 60 * 1000;

function sanitizeScore(score: number): number {
  return Number.isFinite(score) && score >= 0 ? score : 0;
}

/** Sum of leg scores; a non-finite or negative entry counts as 0. */
export function combineLegScores(scores: readonly number[]): number {
  return scores.reduce((sum, s) => sum + sanitizeScore(s), 0);
}

/**
 * Expired when idle for 30 minutes or more, measured from the last completed leg.
 * Fail closed: an unparseable timestamp or a non-finite clock is expired.
 */
export function isGauntletExpired(attempt: GauntletAttempt, nowMs: number): boolean {
  const last = Date.parse(attempt.lastActivityAt);
  if (!Number.isFinite(last) || !Number.isFinite(nowMs)) return true;
  return nowMs - last >= GAUNTLET_TTL_MS;
}

function isValidLegIndex(node: QuestNode, legIndex: number): boolean {
  return Number.isInteger(legIndex) && legIndex >= 0 && legIndex < node.legs.length;
}

export function canStartLeg(
  attempt: GauntletAttempt | undefined,
  node: QuestNode,
  legIndex: number,
  nowMs: number
): boolean {
  if (node.kind !== 'BOSS') return legIndex === 0;
  if (!isValidLegIndex(node, legIndex)) return false;
  if (legIndex === 0) return true;
  return (
    attempt !== undefined &&
    attempt.nodeId === node.id &&
    !isGauntletExpired(attempt, nowMs) &&
    attempt.legs.length === legIndex
  );
}

/** Leg 0 replaces any attempt; a single-leg node completes at once. */
function recordFirstLeg(
  node: QuestNode,
  gameId: string,
  score: number,
  nowIso: string
): RecordLegOutcome {
  if (node.legs.length === 1) {
    return { attempt: undefined, status: 'COMPLETE', combinedScore: combineLegScores([score]) };
  }
  return {
    attempt: {
      nodeId: node.id,
      legs: [{ gameId, score }],
      startedAt: nowIso,
      lastActivityAt: nowIso,
    },
    status: 'IN_PROGRESS',
  };
}

/** Leg k > 0 needs an attempt for this node with exactly k completed legs; otherwise EXPIRED. */
function recordLaterLeg(
  attempt: GauntletAttempt | undefined,
  node: QuestNode,
  legIndex: number,
  gameId: string,
  score: number,
  nowIso: string
): RecordLegOutcome {
  if (!attempt || attempt.nodeId !== node.id || attempt.legs.length !== legIndex) {
    return { attempt: undefined, status: 'EXPIRED' };
  }
  const updated: GauntletAttempt = {
    ...attempt,
    legs: [...attempt.legs, { gameId, score }],
    lastActivityAt: nowIso,
  };
  if (legIndex === node.legs.length - 1) {
    return {
      attempt: undefined,
      status: 'COMPLETE',
      combinedScore: combineLegScores(updated.legs.map((l) => l.score)),
    };
  }
  return { attempt: updated, status: 'IN_PROGRESS' };
}

export function recordLeg(
  attempt: GauntletAttempt | undefined,
  node: QuestNode,
  leg: RecordLegInput
): RecordLegOutcome {
  const { legIndex, gameId, nowIso } = leg;
  const score = sanitizeScore(leg.score);

  // a. Idempotent on gameId (checked first): nothing is written.
  // A missing id never matches: `undefined === undefined` must not read as "already recorded".
  const recorded = attempt?.legs[legIndex]?.gameId;
  if (attempt && attempt.nodeId === node.id && typeof gameId === 'string' && recorded === gameId) {
    return { attempt, status: 'IN_PROGRESS' };
  }
  // b. Invalid index never throws.
  if (!isValidLegIndex(node, legIndex)) {
    return { attempt: undefined, status: 'EXPIRED' };
  }
  return legIndex === 0
    ? recordFirstLeg(node, gameId, score, nowIso)
    : recordLaterLeg(attempt, node, legIndex, gameId, score, nowIso);
}
