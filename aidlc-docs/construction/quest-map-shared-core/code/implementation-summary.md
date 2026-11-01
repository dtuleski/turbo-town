# Implementation Summary - QM1 Shared Quest Core

**Stage**: CONSTRUCTION - Code Generation, unit QM1 (`packages/shared`)
**Plan**: `aidlc-docs/construction/plans/quest-map-shared-core-code-generation-plan.md` (self-approved under owner delegation; all steps checked)
**Basis**: functional design in `../functional-design/` (business-logic-model, business-rules, domain-entities, thresholds), `quest-map-component-methods.md` section 1, `quest-map-unit-of-work.md` QM1

## Files

Created (`packages/shared/src/`):
- `quest/types.ts`: `QuestWorld`, `QuestNode`, `QuestLeg`, `NodeProgress`, `GauntletAttempt`, `WorldProgress`, `QuestContext`, `EvalContext`, `NodeResultInput`, `NodeResultOutcome`, `RecordLegInput`, `RecordLegOutcome`, `ValidatorDeps`, and the enum-like unions
- `quest/themes.ts`: `QUEST_CARD_THEME_IDS` (6), `QUEST_GAME_THEME_IDS` (12), `QUEST_KNOWN_THEME_IDS` (union, 18), with a source citation comment
- `quest/config.ts`: frozen `QUEST_WORLDS` (Brain Peaks FREE, Science Island PAID; 7 GAME + BOSS + BONUS each, thresholds from `thresholds.md`, coordinates from `domain-entities.md`), `listWorlds`, `getWorld`, `getNode`
- `quest/schema.ts`: `questContextSchema` (zod; ids `^[a-z0-9-]{1,40}$`, `legIndex` int 0-2, unknown keys stripped, no coercion)
- `quest/evaluator.ts`: `starsForScore`, `totalStars`, `computeNodeStatuses`, `isNodeStartable`, `applyNodeResult`, `computeBadges`, `emptyWorldProgress`
- `quest/gauntlet.ts`: `GAUNTLET_TTL_MS`, `isGauntletExpired`, `canStartLeg`, `recordLeg`, `combineLegScores`
- `quest/validate.ts`: `validateQuestConfig` (rules V1 to V17, one small function per rule group)
- `quest/index.ts`: barrel
- `constants/paid-games.ts`: `PAID_GAME_THEME_IDS` (the 7 ids of the server `PAID_GAMES`)
- Tests: `quest/schema.test.ts`, `quest/config.test.ts`, `quest/evaluator.test.ts`, `quest/evaluator.property.test.ts` (fast-check), `quest/gauntlet.test.ts` (unit + fast-check)

Edited (additive only):
- `index.ts`: `export * from './quest'`
- `constants/index.ts`: `export * from './paid-games'`
- `types/entities.ts`: optional `questContext?: QuestContext` on `Game` (type-only import)

No existing export changed. Nothing under `services/*`, `apps/web` or `infrastructure` was touched.

## Design decisions

- **Pure and stateless (NFR-QM-12).** Every evaluator and gauntlet function takes the world (or node) and time as arguments. None imports `QUEST_WORLDS`, the circuit module, AWS, or reads `Date.now()` (a test spies on `Date.now` to prove this). A v2 weekly node list can be passed as a `QuestWorld`.
- **Validator dependencies are injected.** `ValidatorDeps` carries the theme allowlist, paid ids, `levelDifficulty` and `pageThemeRequired`. The config test builds them from the real constants and `GUIDED_LEVELS` (`packages/shared/src/circuit/guided-levels.ts`), so the Circuit Builder rule checks the real level difficulties (cb-03 d2, cb-05 d3, cb-07 d4).
- **Unlock chain** follows business-logic-model section 4: stars imply available; an unavailable node passes the chain only if it was itself reached; the bonus uses `min(bonusStarThreshold, 3 x available path nodes)`. Totals cover path nodes (boss included), never the bonus, and are always recomputed (the stored `totalStars` is ignored).
- **Badges.** World Cleared when the boss holds 1 star or more, or the boss is unavailable and reached. World Mastered when every available path node has 3 stars. Badges are never removed. `worldCleared` is true only on the call that newly awards it.
- **Gauntlet.** Expiry is evaluated only in `canStartLeg`, from `lastActivityAt`, with `>= 30 min` meaning expired and unparseable timestamps or a non-finite clock failing closed. `recordLeg` is idempotent on `gameId`, returns `EXPIRED` (never throws) for invalid or out-of-order legs, and has no clock check. Final-leg duplicates are detected by the caller through `NodeProgress.lastGameId`, which `applyNodeResult` sets on every applied result; the named tests exercise that rule as a small pure helper.
- **Fail-safe inputs (SECURITY-15).** Non-finite or negative scores become 0. Stored progress is read through `hasOwnProperty`, so ids like `constructor` or `toString` are never treated as nodes. An unknown node id passed to `applyNodeResult` throws `Error('Unknown quest node')`, as specified.
- **Config immutability.** `QUEST_WORLDS` and all nested objects are `Object.freeze`d. Validator negative tests deep-copy the real config and inject exactly one defect each.
- **Lint style.** The existing circuit source has zero lint warnings, so validator, `recordLeg` and `applyNodeResult` were split into small helpers to stay under the complexity and length limits.

## Verification

Run in `packages/shared` (details and mutation list in `.agents/tasks/qm1/verification.md`):

| Command | Result |
|---|---|
| `npx jest` | 23 suites / 532 tests passed (baseline 18 / 363; +5 suites, +169 tests) |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 |
| `npx prettier --check` (new files) | clean |
| `npx eslint` (new files) | 0 warnings; the only errors are the pre-existing "TSConfig does not include this file" parser errors on `*.test.ts`, identical for the circuit tests |
| Mutation check | 39 hand-written mutants of validator, gauntlet and evaluator; 39 killed |

Coverage of the requested tests: evaluator monotonicity (unit + property), thresholds strictly ascending (real config + V7 negatives), unlock chain (unit + property), gauntlet order and 30-minute expiry boundary (unit + property), the three named duplicate-completion tests, and one validator negative per FR-QM-2 AC2 rule (unknown themeId, duplicate world/node ids, non-ascending thresholds, World 1 paid leg, World 1 difficulty above 3, Circuit Builder difficulty mismatch against `guided-levels.ts`) plus V1 to V17. The real `QUEST_WORLDS` passes the validator with an empty error list.

## Not verified / carried forward

- Thresholds are seed values (pre-launch check PL3); whether every `catalogGameId` is ACTIVE and every themeId PUBLISHED in prod (PL1, PL2) is outside unit tests.
- `QUEST_CARD_THEME_IDS` against the web `GAME_THEMES` is a QM3 test; `PAID_GAME_THEME_IDS` replacing the local server list is QM2.

## Security Baseline compliance

| Rule | Status | Basis |
|---|---|---|
| SECURITY-05 Input validation | Compliant | `questContextSchema` allowlist pattern, length bound, integer range, strip unknown keys, no coercion; tests cover oversize ids, `__proto__`/`constructor` keys, non-object input. V3 keeps every config id schema-valid |
| SECURITY-11 Secure design | Compliant | Rules isolated in pure modules; misuse cases tested (forged ids, replayed and out-of-order legs, expiry boundary, non-finite scores) |
| SECURITY-15 Fail-safe defaults | Compliant | Non-finite scores to 0, bad timestamps expired, invalid legs `EXPIRED`, unknown node throws |
| SECURITY-10 Supply chain | Compliant | No new dependency (`zod`, `fast-check` already present) |
| SECURITY-03 Logging | N/A | No logging in pure code |
| SECURITY-08 Access control | N/A | No identity in QM1; tier gate is QM2 |
| SECURITY-01, 02, 04, 06, 07, 09, 12, 13, 14 | N/A | No storage, network, header, IAM, auth or deployment change |
