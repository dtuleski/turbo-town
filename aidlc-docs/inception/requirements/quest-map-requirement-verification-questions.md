# Quest Map v1 - Requirement Verification Questions

**Status**: Every `[Answer]:` below is pre-filled with the analyst's recommendation, marked **Recommended (pending owner approval)**. The owner delegated these decisions. Change any letter to override; dependent requirements in `quest-map-requirements.md` (Section 9, traceability) must then be revisited.
**Basis**: Owner-approved v1 concept; code read at the current working tree (Circuit Builder already present). Code facts cited as `file`.

---

## Question 1
Several games are paid-only server-side (`PAID_GAMES` in `services/game/src/services/game.service.ts`). World 1 is free for signed-in users. How should World 1 handle this?

A) World 1 contains only games that are not in `PAID_GAMES`, and difficulty is capped at 3 (the free-tier cap in the same file)
B) World 1 may contain paid games, and a Quest Map context grants free users access to them
C) World 1 contains free games, but one "taster" paid node is allowed through challenge context
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Granting access through challenge context would let any client that sends a quest flag bypass the paywall, and it undercuts the reason paid games exist.

## Question 2
`startGame` enforces a daily allowance (`RATE_LIMITS` in `packages/shared/src/constants/rate-limits.ts`: FREE 3, LIGHT 10, STANDARD 30, PREMIUM 100 per 24h). A free player has 3 plays a day, so an 8-node World 1 takes at least 3 days. Do Quest Map plays count against it?

A) Yes, every quest play (including each boss leg) counts like any other game
B) Quest plays in World 1 are exempt from the allowance
C) Only the first leg of a boss gauntlet counts; later legs are free
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). It adds no new bypass path and no allowance code changes. The "come back tomorrow" pacing and the out-of-plays moment are the conversion funnel. Tradeoff: slow free progression; the map must show remaining plays.

## Question 3
Is difficulty fixed per node or chosen by the player?

A) Fixed per node in config
B) Player picks easy, medium or hard at node start; thresholds scale with the choice
C) Fixed per node, with an optional "challenge mode" toggle for a higher difficulty
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). A curated difficulty curve is the point of a map, and one fixed threshold set per node is easier to calibrate and to verify server-side.

## Question 4
How are the 1-3 star score thresholds set?

A) Hand-picked guesses, tuned after launch
B) Seed from the score formula (percent of the achievable score per game and difficulty), then validate against real score percentiles before launch
C) Dynamic per-player thresholds
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended (pending owner approval). Achievable maximum differs by game (caps are 5000/6000/8000 in `score-calculator.service.ts` and `game.service.ts`), so one percentage across games would be wrong. Target: 1 star is reachable by a typical 8-year-old, 3 stars needs near-best play. Percentiles come from existing score data, read-only.

## Question 5
What is the boss node format?

A) Gauntlet of 2-3 short games played back to back with a combined (summed) score, tracked as one server-side attempt
B) A single hard game
C) A gauntlet where each leg is scored and starred separately
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Matches the approved concept. World 1 boss has 2 legs and World 2 has 3, because each leg uses one play of the daily allowance (Question 2). The attempt expires if abandoned and restarts at leg 1.

## Question 6
What does collecting stars unlock?

A) One bonus node per world, unlocked at a star threshold, with free-only games in World 1
B) Cosmetic map decorations only
C) Nothing in v1
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Gives a reason to replay for 2-3 stars at the lowest content cost: one extra config node per world, no new systems.

## Question 7
What rewards exist in v1?

A) Two badges per world ("World Cleared" and "World Mastered"), stored in quest progress and shown on the map and the Achievements page. The backend achievement enum is not extended.
B) New backend `AchievementType` values written by `AchievementTrackerService`
C) No badges
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). The web Achievements page computes badges client-side from leaderboard history (`apps/web/src/pages/dashboard/AchievementsPage.tsx`) and never reads the backend table, so option B would be invisible there. The enum has 8 fixed values (`packages/shared/src/types/enums.ts`) and the tracker has known drift, so extending it widens the change.

## Question 8
What is the replay and best-score rule?

A) Replay any unlocked node any time; keep best score and best stars; stars never decrease; each replay costs one play
B) Nodes are one-shot
C) Replay allowed, but the latest score replaces the best
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Monotonic progress is safe against a bad run and simple to enforce with a conditional write.

## Question 9
What happens when a game referenced by a node is removed or deactivated from the catalog?

A) The node shows an "unavailable" state, is treated as passed for unlocking, and is excluded from star totals; a build-time test fails if config references an unknown theme
B) Block all progress past the node until config is edited
C) Silently remove the node at runtime
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Players are never stuck by a catalog change, and the build-time test catches typos before release. Availability uses `listAvailableGames` status (`ACTIVE`).

## Question 10
Is the Flutter mobile app (`apps/mobile`) in scope?

A) No. Responsive web only; the API is designed so mobile can consume it later
B) Yes, port at the same time
C) Read-only progress view in mobile
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Same decision as Circuit Builder (NFR-CB-27). The game pages being wrapped are web pages.

## Question 11
How big is launch content?

A) 2 worlds. Each has 7 regular nodes plus 1 boss (8 path nodes) and 1 bonus node
B) 1 world only, then add World 2
C) 3 or more worlds
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Matches the approved concept ("about 8 nodes each") and exercises both the free and paid paths. Content is static config, so adding worlds later is cheap.

## Question 12
What analytics are captured?

A) CloudWatch custom metrics through the existing `metricsPublisher` (`services/game/src/utils/metrics.ts`): node started, node cleared, world cleared, paywall hit. No PII, no third-party SDK
B) Third-party product analytics
C) None
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Reuses the existing mechanism, keeps child data inside the current AWS boundary (audience is ages 8-16), and answers the key funnel question: do World 1 players hit the paywall.

## Question 13
How far does anti-cheat go for stars?

A) Stars come from the server-computed score of a server-created game session linked to the node. No new re-verification of what each game reports; the limit is documented
B) Add per-game server re-verification of results, as Circuit Builder does
C) No server linkage; client reports stars
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Per-game re-verification is out of proportion for v1. Stars carry no money value and grant no paid access. Stars inherit exactly today's leaderboard trust level, which must be stated honestly: the generic path scores from client-reported `completionTime`, `correctAnswers` and `totalQuestions`, bounded only by `validateCompletionTime` (`services/game/src/utils/validation.ts`). Only Circuit Builder re-evaluates server-side.
