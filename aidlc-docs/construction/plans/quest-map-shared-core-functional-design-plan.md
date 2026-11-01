# Functional Design Plan - Quest Map QM1 Shared Quest Core

**Created**: 2026-11-01
**Stage**: CONSTRUCTION - Functional Design (Standard depth), unit QM1
**Unit**: `packages/shared/src/quest/` plus two constants files (components Q1 to Q7)
**Basis**: `quest-map-requirements.md`, `quest-map-stories.md`, `quest-map-components.md`, `quest-map-component-methods.md`, `quest-map-unit-of-work.md` (section QM1)
**Answers**: The owner delegated all questions. Every `[Answer]:` below is filled by the design agent with its recommendation, and each is flagged for owner review at the approval gate. No answer is vague or conditional; no follow-up file is needed.

---

## Execution Steps

- [x] Step 1: Analyze unit context (unit-of-work QM1, stories QM-8 and QM-14, FR-QM-1/2/5/9/10/11/12/13/18, NFR-QM-5/12/13)
- [x] Step 2: Create this plan
- [x] Step 3: Generate questions (below)
- [x] Step 4: Store plan
- [x] Step 5: Collect answers (self-answered by delegation) and check for ambiguity: none left
- [x] Step 6a: Read score sources (`score-calculator.service.ts`, `game.service.ts` caps, `utils/circuit-builder.ts`, `guided-levels.ts`, web page configs) for threshold derivation
- [x] Step 6b: Create `domain-entities.md`
- [x] Step 6c: Create `business-logic-model.md` (algorithms, state diagram)
- [x] Step 6d: Create `business-rules.md` (rules, validator, security compliance)
- [x] Step 6e: Create `thresholds.md` (per-node star scores with formula rationale)
- [x] Step 7: Log in audit.md and present completion message (no approval is recorded here; approval is the workflow's gate)

---

## Questions and Answers

### Question 1: What does `NodeResultOutcome.worldCleared` mean?
A) True whenever the world is in a cleared state after the result
B) True only when this result newly awarded the WORLD_CLEARED badge (first time)
C) True whenever the node just played was the boss and scored 1 star or more
X) Other

[Answer]: B. `FR-QM-9` returns `worldCleared` next to `newlyUnlocked`, both are one-shot "what changed" signals. The persistent state is already in `badges`. A one-shot flag lets the result modal celebrate once.

### Question 2: What happens to World Cleared when the boss itself is unavailable (FR-QM-18)?
A) The badge can never be earned for that world
B) The badge is awarded once the boss is reached (all path nodes before it passed), because an unavailable boss counts as passed
C) The badge is awarded automatically on the first read
X) Other

[Answer]: B. An unavailable node "counts as passed for unlocking" (QM-13), so the boss is passed once it is reachable. Reaching it still requires every earlier node to be passed (stars or unavailable), so the badge cannot be earned without playing. The badge is awarded on the next `applyNodeResult` or `computeBadges` call, not by a read-only view.

### Question 3: What if one leg of a multi-leg boss is not ACTIVE in the catalog?
A) Drop the missing leg and rescale thresholds
B) The whole boss node is unavailable (the caller puts the node id in `unavailableNodeIds`)
C) Keep the boss playable and skip the leg
X) Other

[Answer]: B. Combined thresholds are sums over fixed legs. Rescaling or skipping a leg changes what a star means and needs a new design. The evaluator takes `unavailableNodeIds` per node, and QM2 builds that set (a node is unavailable when any leg's `catalogGameId` is not ACTIVE).

### Question 4: How is a 0-star result stored, and what is `firstClearedAt` before the first star?
A) Do not store 0-star results
B) Store `bestScore` and `lastPlayedAt`; `firstClearedAt` is the empty string until the first result of 1 star or more
C) Make `firstClearedAt` optional in the type
X) Other

[Answer]: B. A 0-star attempt still counts as a play and the best score must be monotonic (FR-QM-11). The type in `component-methods.md` keeps `firstClearedAt: string`, so the sentinel is `''`. The empty string is not displayed. Making it optional is a signature change the approved design did not take.

### Question 5: Where does a `gameId` enter the evaluator?
A) Not at all; `QuestService` owns duplicate detection
B) `applyNodeResult` takes an optional `gameId` and stores it as `NodeProgress.lastGameId` (set whether or not the result improved)
X) Other

[Answer]: B. The unit-of-work completion criteria require `lastGameId` to be set on every applied result, and the evaluator is the only writer of `NodeProgress`. The new field is optional and additive to the approved signature. The duplicate check itself stays in `QuestService` (`lastGameId === gameId` means return the stored result, no write).

### Question 6: Bonus star thresholds
A) 50% of the world's path stars
B) World 1: 14 of 24 (about 58%); World 2: 16 of 24 (about 67%)
C) 100%
X) Other

[Answer]: B. 14 means a free player needs an average of about 1.75 stars across 8 path nodes (replaying a few for 2 stars is enough). World 2 is for paying players who chose a harder world, so 16 asks for an average of 2 stars. The effective threshold is `min(threshold, 3 x available path nodes)` as already specified. Both are seed values (PL3).

### Question 7: Circuit Builder basis score, given PR #25 may change `CB_BASE_SCORE` from 1700 to 1866
A) Derive on 1700 only and ignore the pending change
B) Derive on 1700 (the value in this branch) and check that the star tiers hold at 1866 (scores rise 9.76%): no profile may jump a tier
C) Wait for the PR
X) Other

[Answer]: B. `thresholds.md` shows both columns. The check is: the weak anchor at 1866 stays below the 2-star value and the mid anchor at 1866 stays below the 3-star value, for all three Circuit Builder nodes. They pass, so no retune is needed if PR #25 merges first. With 1866 the cap of 8000 is reached only by a perfect run on `cb-07`.

### Question 8: How are star thresholds derived?
A) Pick round numbers
B) Compute the game's score formula at three anchor profiles (weak-but-completing, middle, near-best) and set 1/2/3 stars at those scores (3 stars rounded down to a multiple of 50)
C) Use percentiles from the leaderboard table
X) Other

[Answer]: B. There is no percentile data in the repo (U3) and reading prod data needs owner approval (PL3). The formulas are deterministic, so profiles can be computed. The anchors are assumptions (time and accuracy per game), listed per row in `thresholds.md`. For bosses, 1 and 2 stars are the sums of the legs' anchors and 3 stars is 90% of the summed near-best (one slip allowed across 2 to 3 legs).

### Question 9: Treat a malformed or missing `lastActivityAt` in a gauntlet attempt
A) Not expired (a `NaN` comparison is false)
B) Expired (fail closed)
X) Other

[Answer]: B. SECURITY-15 fail closed. `Date.parse` returns `NaN` for a corrupt value and `NaN >= TTL` is false, which would keep a corrupt attempt alive forever. The function tests `Number.isFinite` first.

### Question 10: Node ids and world ids
A) Numeric (`w1-n1`)
B) Short readable ids, stable across difficulty edits: `brain-peaks`, `science-island`; nodes `bp-01-memory`, ... `bp-boss`, `bp-bonus-sequence`; `si-01-bond-burn`, ... `si-boss`, `si-bonus`
X) Other

[Answer]: B. Ids appear in stored items and URLs (`quest=<worldId>:<nodeId>:<legIndex>`), so they must not embed difficulty (it is tunable). All match `^[a-z0-9-]{1,40}$`, and the validator checks this and global uniqueness.

### Question 11: Which Memory Match card themes do legs use, and what is `QUEST_CARD_THEME_IDS`?
A) Only the two used by legs
B) All six ids of web `GAME_THEMES`: ANIMALS, FRUITS, VEHICLES, SPACE, OCEAN, FORMULA1. Legs use ANIMALS (d1 node) and OCEAN (d3 node)
X) Other

[Answer]: B. The QM3 vitest compares the array with `GAME_THEMES`, so a mirror of the whole list gives a clean equality check (source: `apps/web/src/config/constants.ts`). Legs may then use any card theme without touching the constant.

### Question 12: Map coordinates
A) Hand-placed per world, 0 to 100 percent of the map box, vertical climb (node 1 at the bottom, boss at the top), World 2 mirrored
B) Computed at runtime
X) Other

[Answer]: A. See `domain-entities.md` section 4. Validator rule: all inside 4 to 96, pairwise distance at least 10, bonus off the path line.

### Question 13: Pattern Recall scores are flat above a few rounds. What to do?
A) Change the node (swap the game)
B) Keep the approved launch content, set thresholds on the plateau, and record it as a finding for PL3 and the owner
X) Other

[Answer]: B. Swapping a game changes approved requirements (section 2). Finding: Pattern Recall's accuracy is `rounds completed / round number` and the time factor falls as the run grows, so the score peaks at about 6 rounds and declines slowly (see `thresholds.md`). It is both the `bp-05` node and the World 1 bonus. Owner decision requested at approval: keep, or replace with another free game by a config-only change.

### Question 14: What does an unknown `nodeId` do in `applyNodeResult`?
A) Return the progress unchanged
B) Throw an `Error`
X) Other

[Answer]: B. The contract says "never throws on valid ids". An unknown id is a programmer or config error, and `QuestService.applyCompletion` already validated the id and "never throws" by catching. Silent success would hide a drift bug.

### Question 15: `maxStars` and `totalStars` with unavailable nodes
A) Count all nodes
B) Count only available path nodes (boss included, bonus excluded); `maxStars = 3 x available path nodes`
X) Other

[Answer]: B. Matches FR-QM-18 ("excluded from star totals") and the existing bonus formula.

---

## Extension Compliance (Security Baseline, enabled)
See `business-rules.md` section 8. SECURITY-05, SECURITY-11 and SECURITY-15 apply to this unit; the rest are N/A (no I/O, infrastructure or dependency in QM1).
