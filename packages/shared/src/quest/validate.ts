/**
 * Quest Map - config validator (FR-QM-2). Rules V1 to V17 are in the QM1 functional design
 * (business-rules.md section 5). Returns messages; an empty array means valid.
 *
 * Dependencies are passed in so the validator imports nothing from the circuit module and
 * stays testable with fakes.
 */
import type { QuestLeg, QuestNode, QuestNodeKind, QuestWorld, ValidatorDeps } from './types';

const ID_PATTERN = /^[a-z0-9-]{1,40}$/;
const CATALOG_ID_PATTERN = /^[a-z0-9-]+$/;
const CIRCUIT_BUILDER_THEME = 'CIRCUIT_BUILDER';
const FREE_MAX_DIFFICULTY = 3;
const NON_CIRCUIT_MAX_DIFFICULTY = 3;
const MAX_SCORE_PER_LEG = 8000;
const MAP_MIN = 4;
const MAP_MAX = 96;
const MIN_NODE_DISTANCE = 10;

type Errors = string[];

function legKey(l: QuestLeg): string {
  return JSON.stringify([
    l.themeId,
    l.difficulty,
    l.params?.levelId ?? null,
    l.params?.pageTheme ?? null,
  ]);
}

function isPositiveFinite(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** V7, V17 */
function checkThresholds(label: string, node: QuestNode, errors: Errors): void {
  const t = node.thresholds;
  if (!Array.isArray(t) || t.length !== 3 || !t.every(isPositiveFinite)) {
    errors.push(`${label}: thresholds must be three finite positive numbers`);
    return;
  }
  if (!(t[0] < t[1] && t[1] < t[2])) {
    errors.push(`${label}: thresholds must be strictly ascending`);
  }
  if (t[2] > MAX_SCORE_PER_LEG * node.legs.length) {
    errors.push(`${label}: 3-star threshold exceeds ${MAX_SCORE_PER_LEG} per leg`);
  }
}

/** V10 */
function checkDifficulty(label: string, l: QuestLeg, errors: Errors): void {
  if (!Number.isInteger(l.difficulty) || l.difficulty < 1 || l.difficulty > 4) {
    errors.push(`${label}: difficulty must be an integer from 1 to 4`);
  } else if (l.themeId !== CIRCUIT_BUILDER_THEME && l.difficulty > NON_CIRCUIT_MAX_DIFFICULTY) {
    errors.push(`${label}: difficulty above 3 is only allowed for ${CIRCUIT_BUILDER_THEME}`);
  }
}

/** V8 */
function checkFreeWorldLeg(
  world: QuestWorld,
  label: string,
  l: QuestLeg,
  deps: ValidatorDeps,
  errors: Errors
): void {
  if (world.accessTier !== 'FREE') return;
  if (deps.paidThemeIds.has(l.themeId))
    errors.push(`${label}: paid game ${l.themeId} in a FREE world`);
  if (l.difficulty > FREE_MAX_DIFFICULTY) {
    errors.push(
      `${label}: difficulty ${l.difficulty} above ${FREE_MAX_DIFFICULTY} in a FREE world`
    );
  }
}

/** V9 */
function checkCircuitLevel(label: string, l: QuestLeg, deps: ValidatorDeps, errors: Errors): void {
  const levelId = l.params?.levelId;
  if (l.themeId !== CIRCUIT_BUILDER_THEME) {
    if (levelId !== undefined)
      errors.push(`${label}: params.levelId is only valid for ${CIRCUIT_BUILDER_THEME}`);
    return;
  }
  if (!levelId) {
    errors.push(`${label}: ${CIRCUIT_BUILDER_THEME} leg needs params.levelId`);
    return;
  }
  const levelDifficulty = deps.levelDifficulty(levelId);
  if (levelDifficulty === undefined) {
    errors.push(`${label}: unknown Circuit Builder level ${levelId}`);
  } else if (levelDifficulty !== l.difficulty) {
    errors.push(
      `${label}: difficulty ${l.difficulty} does not match level ${levelId} difficulty ${levelDifficulty}`
    );
  }
}

/** V6, V8, V9, V10, V11, V15 */
function checkLeg(
  world: QuestWorld,
  label: string,
  l: QuestLeg,
  deps: ValidatorDeps,
  errors: Errors
): void {
  if (!deps.knownThemeIds.has(l.themeId)) errors.push(`${label}: unknown themeId ${l.themeId}`);
  checkDifficulty(label, l, errors);
  checkFreeWorldLeg(world, label, l, deps, errors);
  checkCircuitLevel(label, l, deps, errors);
  if (deps.pageThemeRequired.has(l.themeId) && !l.params?.pageTheme) {
    errors.push(`${label}: ${l.themeId} leg needs params.pageTheme`);
  }
  if (typeof l.catalogGameId !== 'string' || !CATALOG_ID_PATTERN.test(l.catalogGameId)) {
    errors.push(`${label}: catalogGameId must match ${CATALOG_ID_PATTERN}`);
  }
}

/** V5 */
function checkLegCount(label: string, n: QuestNode, errors: Errors): void {
  const count = n.legs.length;
  const ok = n.kind === 'BOSS' ? count >= 2 && count <= 3 : count === 1;
  if (!ok)
    errors.push(`${label}: ${n.kind} node has ${count} legs (BOSS needs 2-3, others exactly 1)`);
}

/** V16 */
function checkBossDuplicates(label: string, n: QuestNode, errors: Errors): void {
  if (n.kind !== 'BOSS') return;
  const seen = new Set<string>();
  for (const l of n.legs) {
    const key = legKey(l);
    if (seen.has(key)) {
      errors.push(`${label}: duplicate boss leg ${l.themeId} d${l.difficulty}`);
      return;
    }
    seen.add(key);
  }
}

function inMapRange(v: number): boolean {
  return Number.isFinite(v) && v >= MAP_MIN && v <= MAP_MAX;
}

/** V3, V4, V5, V7, V13, V16, V17 and every leg rule */
function checkNode(
  world: QuestWorld,
  n: QuestNode,
  expectedKind: QuestNodeKind,
  deps: ValidatorDeps,
  errors: Errors
): void {
  const label = `${world.id}/${n.id}`;
  if (!ID_PATTERN.test(n.id)) errors.push(`${label}: node id must match ${ID_PATTERN}`);
  if (n.kind !== expectedKind)
    errors.push(`${label}: kind must be ${expectedKind} but is ${n.kind}`);
  checkLegCount(label, n, errors);
  n.legs.forEach((l) => checkLeg(world, label, l, deps, errors));
  checkThresholds(label, n, errors);
  checkBossDuplicates(label, n, errors);
  if (!inMapRange(n.map.x) || !inMapRange(n.map.y)) {
    errors.push(`${label}: map coordinates must be within ${MAP_MIN} to ${MAP_MAX}`);
  }
}

/** V1, V3 (world level) */
function checkWorldHeader(
  world: QuestWorld,
  worldIds: Set<string>,
  orders: Set<number>,
  errors: Errors
): void {
  if (worldIds.has(world.id)) errors.push(`${world.id}: duplicate world id`);
  worldIds.add(world.id);
  if (!ID_PATTERN.test(world.id)) errors.push(`${world.id}: world id must match ${ID_PATTERN}`);
  if (orders.has(world.order)) errors.push(`${world.id}: duplicate world order ${world.order}`);
  orders.add(world.order);
  if (world.accessTier !== 'FREE' && world.accessTier !== 'PAID') {
    errors.push(`${world.id}: accessTier must be FREE or PAID`);
  }
}

/** V12 */
function checkBonusThreshold(world: QuestWorld, errors: Errors): void {
  const max = 3 * world.nodes.length;
  const t = world.bonusStarThreshold;
  if (!Number.isInteger(t) || t < 1 || t > max) {
    errors.push(`${world.id}: bonusStarThreshold must be an integer from 1 to ${max}`);
  }
}

/** V14, bonus included */
function checkSpacing(world: QuestWorld, errors: Errors): void {
  const all = [...world.nodes, world.bonus];
  all.forEach((a, i) => {
    all.slice(i + 1).forEach((b) => {
      if (Math.hypot(a.map.x - b.map.x, a.map.y - b.map.y) < MIN_NODE_DISTANCE) {
        errors.push(
          `${world.id}/${b.id}: map position is closer than ${MIN_NODE_DISTANCE} to ${a.id}`
        );
      }
    });
  });
}

export function validateQuestConfig(worlds: readonly QuestWorld[], deps: ValidatorDeps): string[] {
  const errors: Errors = [];
  const worldIds = new Set<string>();
  const orders = new Set<number>();
  const nodeIds = new Set<string>();

  for (const world of worlds) {
    checkWorldHeader(world, worldIds, orders, errors);

    // V4: non-empty path, last is BOSS, others GAME, bonus is BONUS
    if (world.nodes.length === 0) errors.push(`${world.id}: world has no nodes`);
    const lastIndex = world.nodes.length - 1;
    world.nodes.forEach((n, i) =>
      checkNode(world, n, i === lastIndex ? 'BOSS' : 'GAME', deps, errors)
    );
    checkNode(world, world.bonus, 'BONUS', deps, errors);

    // V2: node ids unique across all worlds, bonus included
    for (const n of [...world.nodes, world.bonus]) {
      if (nodeIds.has(n.id)) errors.push(`${world.id}/${n.id}: duplicate node id`);
      nodeIds.add(n.id);
    }

    checkBonusThreshold(world, errors);
    checkSpacing(world, errors);
  }
  return errors;
}
