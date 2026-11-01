# Quest Map v1 - Application Design and Units Plan

**Created**: 2026-11-01
**Stage**: INCEPTION - Application Design and Units Generation (planning for both, combined to stay light)
**Basis**: approved requirements and stories, plus code read for this stage (cited in the design files)
**File naming**: `quest-map-` prefix. The Units Generation plan is merged here instead of a separate `unit-of-work-plan` file because Quest Map has four units.
**Answers**: delegated to me by the owner. Each `[Answer]:` holds my recommendation with the evidence behind it.

---

## Section A: Design Questions

## Question 1
Where does the web app get world, node and threshold data?

A) Import the shared quest config from `packages/shared` into `apps/web`, like the Circuit Builder engine
B) The server returns a ready-made view model (nodes, states, goals, launch info) from one new query; the web imports nothing from `packages/shared`
C) Duplicate the config in the web app
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. `aidlc-docs/construction/game-surface/SHARED-ENGINE-IMPORT-DECISION.md` and the header of `apps/web/src/utils/circuitEngine.ts` record that `apps/web` has no dependency on `@memory-game/shared` and that the Vercel build context may not include `packages/shared`. Option B adds no new dependence on that unresolved item, keeps one source of truth, and the web already duplicates API types by hand in `apps/web/src/api/game.ts`. Cost: a larger query response (2 worlds, 18 nodes, a few KB).

## Question 2
How do the 13 game pages learn they were launched from a node (resolves U1)?

A) Edit each game page to read a quest parameter and pass it to `startGame`
B) One URL parameter `quest=<worldId>:<nodeId>:<legIndex>` read in one place, `startGame()` in `apps/web/src/api/game.ts`, which every page already calls
C) Pass quest data in router `state`
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. All 13 pages call `startGame` from `@/api/game` (read for this stage). One read point means zero per-page edits for the start path and the lowest regression risk (requirements R5). Router state (C) is lost on refresh and is already the weak point of Memory Match. Only two pages need real changes: Memory Match (reads `location.state` today) and Circuit Builder (its result panel has buttons that would leave the quest).

## Question 3
How does the shared result modal show stars and "Back to map" (resolves U7)?

A) Add new props to `ScoreBreakdownModal` and edit all 13 v1 pages to pass them
B) A small in-memory store filled by `completeGame()` in `api/game.ts`; the modal reads it itself; no prop changes
C) A second modal opened by each page
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. The modal's props today are `isOpen, onClose, scoreBreakdown, leaderboardRank, onPlayAgain, gameType` (read in `ScoreBreakdownModal.tsx`); there is no slot for extra actions, so U7's assumption "accepts extra actions without per-page changes" is **false as stated**. A store keeps the 22 importing pages untouched. The store is cleared on every `startGame`, so a hub game never shows stale stars.

## Question 4
Where is the boss gauntlet attempt stored?

A) In the per-world progress item (`activeGauntlet`), one attempt at a time
B) A separate table keyed by attempt id
C) On each leg's game record only
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended. It is already in the approved data model. One conditional write updates node result, badges and attempt together. Only one attempt per world can exist, and a new leg-1 start replaces it. Option C would need a query over game records to find the attempt.

## Question 5
How are conflicting concurrent progress writes handled?

A) Version attribute plus conditional put, one re-read and retry, then give up (log and metric)
B) DynamoDB transactions
C) Last write wins
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended. Matches NFR-QM-8 and FR-QM-11. The evaluator is monotonic (maximum of old and new), so a retry on fresh data cannot lower a result. Transactions add nothing for a single item.

## Question 6
Where is the "Playing from Quest Map" banner rendered?

A) In each game page
B) Once in `AppLayout`, driven by the `quest` URL parameter
C) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. `AppLayout` wraps every protected route. The banner shows only when the parameter is present and valid. No per-page work, and it carries the "Back to map" link that works even on pages that only know their own setup route.

## Question 7
What backs "remaining plays" (FR-QM-17)?

A) Existing `canStartGame`
B) A new read-only `RateLimiterService.getUsage` that reads the same rate-limit record `checkLimit` reads
C) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. `GameService.canStartGame` is a stub that returns `used: 0` (read in `game.service.ts`). Fixing it is out of scope and would change hub behavior.

---

## Section B: Units Questions

## Question 8
How many units?

A) One unit for the whole feature
B) Four units: shared core, backend with infrastructure, web map and launch, rewards and polish
C) Seven or more units as for Circuit Builder
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. Each unit is one package boundary with its own verification commands. `packages/shared` and `services/game` are Lambda deploy trigger paths, so isolating them keeps each production-affecting merge small. QM4 is small on purpose: it keeps badge and animation work out of the riskiest web unit.

## Question 9
Should the infrastructure change be its own unit?

A) Yes, a separate unit
B) No, inside the backend unit, because the Lambda env var and IAM are useless without the code and ship in the same release
C) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. One table, one env var, one IAM statement. The release sequencing (infra deployed manually before the code merge) is recorded in the unit and the execution plan.

## Question 10
Which units run Infrastructure Design?

A) All
B) Only the backend unit (QM2)
C) None
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. Only QM2 adds a cloud resource.

---

## Section C: Ambiguity Analysis

All answers are single letters with no hedging. Q2=B and Q3=B depend on Q1=B (the web reads only server data) and are consistent with it. No follow-ups needed.

---

## Section D: Execution Checklist

### Application Design
- [x] Analyse context: requirements, stories, code of Game Service, shared package, web pages, CDK stacks
- [x] Resolve U1 (launch contract) from page code
- [x] Resolve U4 (how infrastructure is deployed) from `.github/workflows` and `infrastructure/`
- [x] Resolve U7 (modal props) from `ScoreBreakdownModal.tsx`
- [x] Generate `quest-map-components.md`
- [x] Generate `quest-map-component-methods.md`
- [x] Generate `quest-map-services.md`
- [x] Generate `quest-map-component-dependency.md`
- [x] Validate completeness: every FR-QM maps to a component (table in components file)
- [x] Security Baseline compliance summary (components file, Section 5)

### Units Generation
- [x] Generate `quest-map-unit-of-work.md`
- [x] Generate `quest-map-unit-of-work-dependency.md`
- [x] Generate `quest-map-unit-of-work-story-map.md`
- [x] Validate boundaries and dependencies (no cycles, matrix in dependency file)
- [x] Assign all 15 stories to units
- [x] Greenfield code-organization step: not applicable (brownfield)
