# Functional Design Plan - Quest Map QM2 Backend and Table
**Created**: 2026-11-01
**Stage**: CONSTRUCTION - Functional Design (Minimal depth), unit QM2
**Unit**: `services/game` quest persistence and orchestration (components B1 to B8; infrastructure I1 to I3 are in the infrastructure plan)
**Basis**: `quest-map-requirements.md`, `quest-map-components.md`, `quest-map-component-methods.md`, `quest-map-services.md` (already holds the flows, error table and invariants), `quest-map-unit-of-work.md` section QM2, `quest-map-unit-of-work-dependency.md`, QM1 outputs (`aidlc-docs/construction/quest-map-shared-core/`, `packages/shared/src/quest/`)
**Depth rationale**: Application Design already fixed the flows, the error contract and the injection rule. This stage adds only what was left open: the stored item shape, the repository contract, the completion decision table, and logging/metric details. It does not repeat `quest-map-services.md`.
**Answers**: The owner delegated all questions. Every `[Answer]:` is filled with the design agent's recommendation and flagged for owner review at the approval gate. No answer is vague; no follow-up file is needed.
**Extensions**: Security Baseline is enabled. Compliance summary is in `business-rules.md` section 6.
---
## Execution Steps
- [x] Step 1: Analyze unit context (QM2 section of unit-of-work, services doc, component methods)
- [x] Step 2: Create this plan
- [x] Step 3: Generate questions (below)
- [x] Step 4: Store plan
- [x] Step 5: Collect answers (self-answered by delegation); no ambiguity left
- [x] Step 6a: Create `domain-entities.md` (stored item, game record field, view/payload mapping)
- [x] Step 6b: Create `business-logic-model.md` (repository contract, validateStart, applyCompletion, getProgressView, getUsage)
- [x] Step 6c: Create `business-rules.md` (rules with ids, reason codes, logging, metrics, security compliance)
- [x] Step 7: Present completion (approval is the workflow's gate)
---
## Questions and Answers

### Question 1: How is a `WorldProgress` stored in DynamoDB?
A) One item per user per world, PutItem of the whole item guarded by `version` (matches the approved table design)
B) One item per node, UpdateItem per node
C) Single item per user holding both worlds

[Answer]: A. Two small items per user, well under the 400 KB item limit (about 9 nodes per world). The whole-item conditional Put gives one atomic unit for stars, totals, badges and the gauntlet attempt, and the `version` check closes the multi-tab window (R6).

### Question 2: How does the repository handle optional fields when writing?
A) Strip `undefined` before the Put (no `removeUndefinedValues` on the shared client)
B) Rely on the client marshall option

[Answer]: A. The repository builds the Item explicitly and omits `activeGauntlet` when absent. A whole-item Put also means clearing a finished attempt simply omits the attribute. The repo does not depend on how the shared document client is configured.

### Question 3: What does `getWorld` return for an item that fails shape checks (hand-edited or corrupt)?
A) Throw, request fails closed
B) Treat as "no progress" and let the next save overwrite it
C) Return it as is

[Answer]: A for `startGame` and `getQuestProgress` (fail closed, SECURITY-15; treating corrupt data as empty could overwrite real progress). For the `completeGame` hook the same throw is caught by the fail-soft wrapper (reward skipped, `QuestProgressWriteFailed`). Shape check is a light structural check in the repository (types of `nodes`, `version`, `badges`), not a zod schema.

### Question 4: Which ids count as the "last gameId" for duplicate detection on a plain node?
A) `NodeProgress.lastGameId` equals `game.gameId` means duplicate: return the stored result, write nothing
B) Compare scores only

[Answer]: A. This is the rule already fixed in `quest-map-services.md` section 3. Applies to plain nodes and to the final boss leg.

### Question 5: What does `getProgressView` do if the catalog read fails?
A) Fail the request (map shows its retry state)
B) Treat all nodes as available

[Answer]: A. B would silently grant "available" to removed games and hide an outage. Matches the error table (`getQuestProgress`: any read failure is fatal for the request).

### Question 6: What goes in the structured log lines?
A) ids, stars, scores, reason code from a fixed enum, previous and new best stars; never raw input, tokens, emails, usernames
B) Whole request context for debugging

[Answer]: A (SECURITY-03, SECURITY-13). Progress changes log userId, worldId, nodeId, previous and new best stars, score, gameId.

### Question 7: Should the quest metrics carry a node dimension?
A) World only (as the approved `publishQuestMetric(name, worldId)` signature)
B) World and node

[Answer]: A. Keeps CloudWatch dimension cardinality small and matches the frozen signature. Node-level detail is in logs.

### Question 8: Does the new env var `QUEST_PROGRESS_TABLE_NAME` get a default value?
A) No default; unset means quest operations fail closed with `Quest progress is not configured`
B) Default to `memory-game-quest-progress-prod` like the email-sender does

[Answer]: A. A prod default would let a dev deployment write to prod data. Unset must fail closed (approved release-order behavior, services doc section 8). The variable is intentionally not in `validateEnvironment()`.
