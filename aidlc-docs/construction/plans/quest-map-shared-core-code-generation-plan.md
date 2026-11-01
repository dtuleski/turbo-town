# Code Generation Plan - QM1 Shared Quest Core

**Unit**: QM1 (`packages/shared`) · **Stories**: QM-8, QM-14 (primary) · **Requirements**: FR-QM-1, 2, 5, 10, 11, 12, 13, NFR-QM-5, 12, 13
**Approval**: self-approved under owner delegation (workflow instruction). Application code in `packages/shared/src/`; docs only here.
**Dependencies**: none upstream; blocks QM2. **Entities owned**: none (pure, stateless). **Interfaces**: `quest-map-component-methods.md` section 1, plus `gameId?` on `applyNodeResult` (functional design).
**Security Baseline**: SECURITY-05 (schema allowlist), 11 (pure isolated rules, misuse tests), 15 (fail-closed defaults) applied; others N/A (no I/O, no new dependency).

## Steps

- [x] 1. Create `src/quest/types.ts` (entities, enums, EvalContext, outcome, gauntlet and validator types)
- [x] 2. Create `src/quest/themes.ts` (`QUEST_CARD_THEME_IDS`, `QUEST_GAME_THEME_IDS`, `QUEST_KNOWN_THEME_IDS`, source citations)
- [x] 3. Create `src/constants/paid-games.ts` (`PAID_GAME_THEME_IDS`) and export from `constants/index.ts`
- [x] 4. Create `src/quest/config.ts` (`QUEST_WORLDS` with thresholds.md values, `listWorlds`, `getWorld`, `getNode`)
- [x] 5. Create `src/quest/schema.ts` (`questContextSchema`)
- [x] 6. Create `src/quest/evaluator.ts` (stars, totals, statuses, startable, applyNodeResult, badges, emptyWorldProgress)
- [x] 7. Create `src/quest/gauntlet.ts` (TTL, expiry, canStartLeg, recordLeg, combineLegScores)
- [x] 8. Create `src/quest/validate.ts` (`validateQuestConfig`, rules V1 to V17)
- [x] 9. Create `src/quest/index.ts`; edit `src/index.ts` (`export * from './quest'`); add optional `questContext` to `Game` in `types/entities.ts`
- [x] 10. Tests: `schema.test.ts`, `evaluator.test.ts`, `evaluator.property.test.ts`, `gauntlet.test.ts`, `config.test.ts` (real config + one negative case per rule V1 to V17)
- [x] 11. Run `npx jest`, `npx tsc --noEmit`, `npm run build`; run mutation checks on the validator, evaluator and gauntlet
- [x] 12. Write `.agents/tasks/qm1/verification.md` and `aidlc-docs/construction/quest-map-shared-core/code/implementation-summary.md`
- [x] 13. Commit specific files (`feat(shared): quest core types, config, evaluator, validator (QM1)`)
