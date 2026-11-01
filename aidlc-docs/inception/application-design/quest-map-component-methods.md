# Quest Map v1 - Component Methods

**Created**: 2026-11-01
**Stage**: INCEPTION - Application Design
**Note**: Signatures and contracts only. Detailed rules (threshold numbers, edge cases of world completion) belong to Functional Design per unit.

---

## 1. Shared module (`packages/shared/src/quest/`)

### Types (Q2)
```ts
export type QuestAccessTier = 'FREE' | 'PAID';
export type QuestNodeKind = 'GAME' | 'BOSS' | 'BONUS';
export type Stars = 0 | 1 | 2 | 3;
export type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'UNAVAILABLE'; // stars > 0 implies AVAILABLE
export type BadgeId = 'WORLD_CLEARED' | 'WORLD_MASTERED';

export interface QuestLeg {
  themeId: string;            // server theme id (for Memory Match, the card theme)
  catalogGameId: string;      // kebab-case catalog id used for availability
  difficulty: 1 | 2 | 3 | 4;
  params?: { levelId?: string; pageTheme?: string };
}
export interface QuestNode {
  id: string; kind: QuestNodeKind;
  legs: readonly QuestLeg[];                         // 1 leg, or 2-3 for BOSS
  thresholds: readonly [number, number, number];     // strictly ascending; combined score for BOSS
  map: { x: number; y: number };                     // 0-100 percent of the map box
}
export interface QuestWorld {
  id: string; order: number; accessTier: QuestAccessTier;
  nodes: readonly QuestNode[];                       // path order; last is BOSS
  bonus: QuestNode; bonusStarThreshold: number;
}
export interface NodeProgress { stars: Stars; bestScore: number; firstClearedAt: string; lastPlayedAt: string; lastGameId?: string } // lastGameId: the last gameId applied to this node, whether or not it improved the result (duplicate-completion detection)
export interface GauntletAttempt {
  nodeId: string; legs: { gameId: string; score: number }[];
  startedAt: string; lastActivityAt: string;
}
export interface WorldProgress {
  worldId: string; nodes: Record<string, NodeProgress>; totalStars: number;
  badges: BadgeId[]; activeGauntlet?: GauntletAttempt; version: number; updatedAt: string;
}
export interface QuestContext { worldId: string; nodeId: string; legIndex: number }
```

### Config and schema (Q1, Q3)
```ts
export const QUEST_WORLDS: readonly QuestWorld[];
export function listWorlds(): readonly QuestWorld[];
export function getWorld(worldId: string): QuestWorld | undefined;
export function getNode(world: QuestWorld, nodeId: string): QuestNode | undefined; // path nodes and bonus
export const questContextSchema: z.ZodType<QuestContext>; // strips unknown keys; does NOT check existence
```

### Evaluator (Q4) - pure, deterministic, no `Date.now()` (time is passed in)
```ts
export interface EvalContext { unavailableNodeIds: ReadonlySet<string> }

export function starsForScore(thresholds: QuestNode['thresholds'], score: number): Stars;
export function totalStars(world: QuestWorld, progress: WorldProgress | undefined, ctx: EvalContext): number;
export function computeNodeStatuses(world: QuestWorld, progress: WorldProgress | undefined, ctx: EvalContext): Record<string, NodeStatus>;
export function isNodeStartable(world: QuestWorld, nodeId: string, progress: WorldProgress | undefined, ctx: EvalContext): boolean;

export interface NodeResultOutcome {
  progress: WorldProgress; stars: Stars; bestStars: Stars; score: number;
  newlyUnlocked: string[]; worldCleared: boolean; badgesAwarded: BadgeId[];
}
export function applyNodeResult(
  world: QuestWorld, progress: WorldProgress | undefined,
  result: { nodeId: string; score: number; nowIso: string }, ctx: EvalContext
): NodeResultOutcome;                     // monotonic: max(bestScore), max(stars); never throws on valid ids
export function computeBadges(world: QuestWorld, progress: WorldProgress, ctx: EvalContext): BadgeId[];
export function emptyWorldProgress(worldId: string, nowIso: string): WorldProgress;
```
Contracts: `applyNodeResult` never mutates its input; applying the same result twice gives the same output; a lower score never lowers `stars` or `bestScore` (property-tested). Bonus unlock uses `min(bonusStarThreshold, 3 * availablePathNodes)` so removed games cannot make it unreachable.

### Gauntlet rules (Q5)
```ts
export const GAUNTLET_TTL_MS = 30 * 60 * 1000;
export type GauntletStatus = 'IN_PROGRESS' | 'COMPLETE' | 'EXPIRED';

export function isGauntletExpired(attempt: GauntletAttempt, nowMs: number): boolean;
// expired = nowMs - Date.parse(attempt.lastActivityAt) >= GAUNTLET_TTL_MS. "Idle" is measured from the last
// COMPLETED leg (lastActivityAt), never from startedAt. lastActivityAt is set when leg 0 is recorded and on every later leg.
export function canStartLeg(attempt: GauntletAttempt | undefined, node: QuestNode, legIndex: number, nowMs: number): boolean;
// leg 0: always allowed. leg k>0: attempt exists for this node, !isGauntletExpired, attempt.legs.length === k.
// THIS is the only place expiry is evaluated (at leg start).
export function recordLeg(
  attempt: GauntletAttempt | undefined, node: QuestNode,
  leg: { legIndex: number; gameId: string; score: number; nowIso: string }
): { attempt: GauntletAttempt | undefined; status: GauntletStatus; combinedScore?: number };
// No clock check: a leg whose game passed canStartLeg is never expired at completion, however long it took.
// IDEMPOTENT ON gameId (checked first): if attempt?.legs[legIndex]?.gameId === leg.gameId, return the attempt
// unchanged with status IN_PROGRESS (non-final leg) and write nothing. completeGame's status check is not atomic,
// so duplicate or concurrent completions of one gameId can reach this function.
// Then: leg 0 replaces any attempt; leg k>0 requires attempt.legs.length === k, otherwise EXPIRED (out of order) and
// attempt undefined; last leg returns COMPLETE with the summed score and attempt undefined.
// A duplicate of the FINAL leg arrives with no attempt; QuestService detects it via NodeProgress.lastGameId === gameId
// and returns the stored result without calling recordLeg (no error, no write).
export function combineLegScores(scores: readonly number[]): number;
```

### Validator (Q6) and constants (Q7)
```ts
export interface ValidatorDeps {
  knownThemeIds: ReadonlySet<string>;   // callers pass new Set(QUEST_KNOWN_THEME_IDS) (shared constant, Q7)
  paidThemeIds: ReadonlySet<string>;    // new Set(PAID_GAME_THEME_IDS)
  levelDifficulty: (levelId: string) => number | undefined;   // from the circuit level registry
  pageThemeRequired: ReadonlySet<string>;                     // e.g. PATTERN_RECALL
}
export function validateQuestConfig(worlds: readonly QuestWorld[], deps: ValidatorDeps): string[];
export const PAID_GAME_THEME_IDS: readonly string[];
export const QUEST_CARD_THEME_IDS: readonly string[];  // Memory Match card themes; a QM3 web test compares with GAME_THEMES
export const QUEST_GAME_THEME_IDS: readonly string[];  // the 12 non-card game themeIds of the launch content
export const QUEST_KNOWN_THEME_IDS: readonly string[]; // union of the two; allowlist for FR-QM-2 AC2
```
Errors reported: unknown themeId; duplicate ids; thresholds not strictly ascending; World 1 leg in the paid set or above difficulty 3; Circuit Builder leg difficulty differs from its level; non-Circuit-Builder leg above 3; missing required `pageTheme`; boss with fewer than 2 or more than 3 legs; non-boss with more than 1 leg; bonus threshold above `3 * path nodes`.

---

## 2. Game Service

### B1 QuestProgressRepository
```ts
class QuestProgressRepository {
  getWorld(userId: string, worldId: string): Promise<WorldProgress | undefined>;
  listWorlds(userId: string): Promise<WorldProgress[]>;                 // Query by userId
  saveWorld(userId: string, progress: WorldProgress, expectedVersion: number): Promise<void>;
  // PutItem with ConditionExpression: attribute_not_exists(userId) OR version = :expected.
  // New item: expectedVersion 0, stored version 1. Throws QuestVersionConflictError on ConditionalCheckFailedException.
}
```

### B2 QuestService
```ts
// GameService constructor: existing 7 params unchanged, then `questService?: QuestService` (optional, trailing).
// Not injected + questContext sent => generic QUEST_UNAVAILABLE_MESSAGE, no play consumed. Not injected + no questContext => as today.
class QuestService {
  constructor(repo: QuestProgressRepository, catalog: Pick<GameCatalogRepository, 'listAvailableGames'>, rateLimiter: RateLimiterService, clock?: () => number);

  validateStart(userId: string, tier: SubscriptionTier, rawContext: unknown,
                themeId: string, difficulty: number): Promise<ValidatedQuestStart>; // read-only; throws ValidationError(QUEST_UNAVAILABLE_MESSAGE)
  applyCompletion(userId: string, game: Game, score: number, extras?: { levelId?: string }): Promise<QuestResultPayload | undefined>; // never throws
  getProgressView(userId: string, tier: SubscriptionTier): Promise<QuestProgressView>;
}
export interface ValidatedQuestStart { worldId: string; nodeId: string; legIndex: number; context: QuestContext }
```

### B4 / B7 / B8
```ts
RateLimiterService.getUsage(userId: string, tier: SubscriptionTier): Promise<RateLimitInfo>; // read-only; expired or missing record means used 0
MetricsPublisher.publishQuestMetric(name: QuestMetricName, worldId: string): Promise<void>;     // never throws
type QuestMetricName = 'QuestNodeStarted' | 'QuestNodeCleared' | 'QuestWorldCleared' | 'QuestPaywallHit' | 'QuestProgressWriteFailed';
GameRepository.create(game: Omit<Game,...> & { questContext?: QuestContext }): Promise<Game>;
```

### Response contracts (additive)
```ts
interface QuestResultPayload {
  worldId: string; nodeId: string; kind: QuestNodeKind;
  score: number; thresholds: [number, number, number];
  stars: Stars; bestStars: Stars; newlyUnlocked: string[]; worldCleared: boolean; badgesAwarded: BadgeId[];
  gauntlet?: { legIndex: number; legsTotal: number; status: GauntletStatus;
               nextLeg?: { themeId: string; difficulty: number; params?: QuestLeg['params'] } };
}
interface QuestProgressView {
  tier: string; rateLimit: { limit: number; used: number; remaining: number; resetAt: string };
  worlds: {
    id: string; order: number; accessible: boolean; totalStars: number; maxStars: number; badges: BadgeId[];
    activeGauntlet?: { nodeId: string; legsDone: number; legsTotal: number; expiresAt: string };
    nodes: { id: string; kind: QuestNodeKind; status: NodeStatus; stars: Stars; bestScore: number;
             thresholds: [number, number, number]; map: { x: number; y: number };
             legs: { themeId: string; difficulty: number; params?: QuestLeg['params'] }[] }[]; // bonus node last
  }[];
}
```
`catalogGameId` is never sent to the client. `completeGame` returns `quest` as `QuestResultPayload | null`.

### B5 GameHandler
`case 'getQuestProgress': return this.getQuestProgress(userId)`; the method gets the tier from `subscriptionRepository.getTier` and calls `QuestService.getProgressView`. In `completeGame`, add `quest: result.quest ?? null` to the mapped object.

---

## 3. Web

```ts
// api/quest.ts (W1)
export function getQuestProgress(): Promise<QuestProgressView>;          // fetchPolicy 'network-only'
// api/game.ts (W1) - changes
export interface StartGameInput { themeId: string; difficulty: number; questContext?: { worldId: string; nodeId: string; legIndex: number } }
// startGame(input): reads parseQuestParam(window.location.search); if valid, sets input.questContext; clears the result store.
//   Rule R1: on any error with a valid quest param, window.location.replace(ROUTES.QUEST_MAP + '?startFailed=rate' | '?startFailed=quest')
//   and return new Promise<never>(() => {}) so the calling page's catch block never runs. No valid quest param: rethrow as today.
//   Rule R1 (canPlay): valid quest param and the start resolves with a non-empty id -> return { ...result, canPlay: true }. The server
//   sets canPlay = remaining > 0 AFTER the increment, so the last allowed play would otherwise read as a failure on Bond and Burn,
//   Traffic Lab, Mini Golf and Circuit Builder. checkLimit already ran before the game was created.
// isRateLimitError(error): boolean   // same test the pages use: message includes 'Rate limit' or extensions.code === 'RATE_LIMIT_EXCEEDED'
// completeGame(input): selects `quest {...}`; if present, calls questResultStore.set(result.quest).

// utils/questLaunch.ts (W2)
export function parseQuestParam(search: string): QuestContext | null;    // never throws
export function buildLaunchUrl(leg: LegView, ref: QuestContext): string | null; // null if themeId has no table entry
// utils/questResultStore.ts (W3)
export const questResultStore: { get(): QuestResultPayload | null; set(r: QuestResultPayload): void; clear(): void; subscribe(fn: () => void): () => void };
export function useQuestResult(): QuestResultPayload | null;              // useSyncExternalStore

// hooks/useQuestProgress.ts
export function useQuestProgress(): { data: QuestProgressView | null; loading: boolean; error: boolean; refetch: () => void };
```
`ScoreBreakdownModal` (rule R2): props unchanged. Internally `const result = useQuestResult(); const questMode = parseQuestParam(location.search) !== null || result !== null` (the hook is called unconditionally); when `questMode`, "Play again" is not rendered, and the Modal's `onClose` and the "Close" button call `navigate(ROUTES.QUEST_MAP)` instead of the `onClose` prop.

`QuestMapPage` reads `?startFailed=rate|quest` once on mount: `rate` calls `navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true }, replace: true })`; `quest` shows a generic notice and refetches progress; the parameter is then removed from the URL.

Components: `QuestMapPage()`, `QuestWorldPath({world})`, `QuestNodeButton({node, onSelect})` (a `<button>` whose `aria-label` is built from `quest.node.aria.*` keys), `QuestNodePanel({node, onPlay})`, `PlaysLeftBar({rateLimit})`, `QuestBanner()`, `QuestResultSection({result})`, `QuestHubCard()`, `BadgeShelf({badges})`, `AchievementsQuestBadges()`.
