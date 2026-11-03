# Star Thresholds - QM1 Shared Quest Core

**Stage**: CONSTRUCTION - Functional Design, unit QM1
**Status**: **Seed values, to be calibrated against real percentiles before launch (pre-launch check PL3).** No leaderboard or history data was read; every number below is computed from the score formulas and from stated assumptions about how a player behaves. Time and accuracy anchors are assumptions (requirements U2 and U3: durations and score distributions are not measured).
**Target**: 1 star is reachable by a typical 8-year-old who finishes the game. 3 stars needs near-best play. 2 stars sits between.

---

## 1. Threshold table

Scores are the server-computed score of one play (boss: sum of all legs). All values are in `QUEST_WORLDS` as `thresholds: [one, two, three]`.

### World 1 - Brain Peaks (free)

| Node id | Game / themeId | Diff | 1 star | 2 stars | 3 stars |
|---|---|---|---|---|---|
| `bp-01-memory` | Memory Match / `ANIMALS` | 1 | 1450 | 2300 | 2650 |
| `bp-02-math` | `MATH_CHALLENGE` | 1 | 1800 | 2350 | 2650 |
| `bp-03-words` | `WORD_PUZZLE` | 1 | 1600 | 2200 | 2600 |
| `bp-04-sequence` | `SEQUENCE_MEMORY` | 2 | 2650 | 3450 | 3950 |
| `bp-05-geo` | `GEO_QUIZ` | 2 | 2700 | 3500 | 3950 |
| `bp-06-maze` | `MATH_MAZE` | 2 | 2500 | 3350 | 3900 |
| `bp-07-memory-space` | Memory Match / `SPACE` | 3 | 2500 | 4000 | 5100 |
| `bp-boss` | `MATH_CHALLENGE` d2 + `BUBBLE_POP` d2 (combined) | 2 + 2 | 5550 | 7000 | 7400 |
| `bp-bonus-sequence` | `SEQUENCE_MEMORY` | 3 | 3500 | 4600 | 5300 |

Bonus star threshold: **14** of a maximum 24 path stars (8 path nodes x 3).

### World 2 - Science Island (paid)

| Node id | Game / themeId | Diff | 1 star | 2 stars | 3 stars |
|---|---|---|---|---|---|
| `si-01-bond-burn` | `BOND_AND_BURN` | 1 | 1550 | 2750 | 3300 |
| `si-02-space-entry` | `SPACE_ENTRY` | 1 | 2550 | 3600 | 4250 |
| `si-03-circuit-series` | `CIRCUIT_BUILDER` / `cb-03-series-loop` | 2 | 2200 | 2950 | 3900 |
| `si-05-scratch` | `SCRATCH_CODING` | 1 | 250 | 1500 | 3150 |
| `si-04-circuit-branches` | `CIRCUIT_BUILDER` / `cb-04-parallel-branches` | 2 | 2200 | 2950 | 3900 |
| `si-06-mini-golf` | `MINI_GOLF` | 2 | 250 | 1850 | 4150 |
| `si-07-circuit-parallel` | `CIRCUIT_BUILDER` / `cb-05-series-vs-parallel` | 3 | 2900 | 3900 | 5200 |
| `si-boss` | `BOND_AND_BURN` d3 + `SPACE_ENTRY` d2 (combined) | 3 + 2 | 5950 | 9800 | 11150 |
| `si-bonus` | `CIRCUIT_BUILDER` / `cb-07-resistance-limits-current` | 4 | 3650 | 4900 | 6500 |

Bonus star threshold: **16** of a maximum 24 path stars.

All values are strictly ascending per node (validator V7), and no 3-star value exceeds 8000 x leg count (V17). The largest single-leg 3-star value is 6500 (`si-bonus`), under the 8000 cap.

---

## 2. Method

Every score is `base x difficulty multiplier x speed bonus x accuracy bonus`, then capped. Source: `services/game/src/services/score-calculator.service.ts`, `calculateScoreBreakdown` (lines 124 to 141) and `services/game/src/services/game.service.ts` (`completeGame`, lines 181 to 194).

```text
difficulty multiplier  d1 = 1.0   d2 = 1.5   d3 = 2.0   d4 = 2.5               (getDifficultyMultiplier)
speed bonus            min(cap, max(0.1, 1 + (maxTime - t) / maxTime))           (line 124)
accuracy bonus         0.5 + accuracy                                            (line 132)   range 0.5 to 1.5
calculator cap         d1 5000, d2 6500, d3+ 8000                                (line 139)
game.service cap       Mini Golf none; d4 8000; paid games 8000; every other game 6000   (lines 181-194)
```

Per game (lines 82 to 124 of the calculator):

| themeId | base | maxTime by difficulty (s) | speed cap | accuracy input |
|---|---|---|---|---|
| Standard games (Memory Match, Math Challenge, Word Puzzle, Sequence Memory, Pattern Recall, Math Maze, Bubble Pop) | 1000 | 600 | 2.0 | Memory Match: attempts, `1 - (attempts - pairs) / (3 x pairs)` with 6, 8, 10 pairs for d1 to d3. Others: `correct / total` (Word Puzzle: `wordsFound / totalWords`) |
| `BOND_AND_BURN` | 1700 | d1 60, d2 45, d3 30 | 1.3 | `correct / recipes` (5 recipes) |
| `SPACE_ENTRY` | 1700 | d1 180, d2 120, d3 90 | 2.0 | `correct / puzzles`; time = `countdownSeconds - countdown` (d1: 90 s limit) |
| `TRAFFIC_LAB` | 1700 | d1 60, d2 90, d3 120 | 1.3 | `throughput / (throughput + strikes)`; time = `simulationTime - timeLeft` (d2: 90 s) |
| `SCRATCH_CODING` | 1700 | d1 120, d2 180, d3 240 | 2.0 | `levels done / total levels` |
| `MINI_GOLF` | 1800 | d1 40, d2 50, d3 60 | 1.5 | `((maxTotal - strokes) / (maxTotal - par))^2` (`MiniGolfGamePage.tsx` `handleGameComplete`) |
| `CIRCUIT_BUILDER` | `CB_BASE_SCORE` | not used; `CB_TARGET_TIME_BY_DIFFICULTY` d1 90, d2 120, d3 150, d4 180 | 0.9 to 1.15 | `0.5 + quality`, quality = efficiency minus fault penalty (`calculateCircuitBuilderBreakdown`, `utils/circuit-builder.ts`) |

Three anchor profiles per leg (accuracy and time are assumptions):

- **W (weak, completes)**: about 50% accuracy (60% for 5-item games), slow. Star 1 is set at W's score, rounded to the nearest 50.
- **M (middle)**: about 75% accuracy (80% for 5-item games), a moderate pace. Star 2 is set at M's score, rounded to the nearest 50.
- **B (near-best)**: one slip in about ten items (about 90%), fast. Star 3 is set at B's score, **rounded down** to a multiple of 50.
- Boss: stars 1 and 2 are the sum of the legs' W and M scores. Star 3 is **90% of the summed B scores** (one slip allowed across 2 to 3 legs).
- Exceptions are explained in section 4 (rows where a measured floor or a flat curve forces a different value).

Score caps do not bind at any threshold: every 3-star score is below its calculator and `game.service` cap.

---

## 3. Per-node rationale

Format: anchors (time t in seconds, accuracy a) and the score the formula gives.

| Node | W | M | B | Resulting stars |
|---|---|---|---|---|
| `bp-01-memory` (6 pairs, base 1000, maxTime 600) | t 150, 18 attempts, a 0.33: 1.75 x 0.83 x 1000 = 1458 | t 75, 11 attempts, a 0.72: 1.875 x 1.22 = 2292 | t 45, 8 attempts, a 0.89: 1.925 x 1.39 = 2674 | 1450 / 2300 / 2650. Perfect play (6 attempts) scores above 2650, so 3 stars needs at most about 2 misses |
| `bp-02-math` (10 questions, base 1000) | t 110, a 0.50: 1.82 x 1.0 = 1817 | t 75, a 0.75: 1.875 x 1.25 = 2344 | t 45, a 0.90: 1.925 x 1.4 = 2695 | 1800 / 2350 / 2650 (B rounded down to a multiple of 50 is 2650) |
| `bp-03-words` (base 1000) | t 240, a 0.50: 1.6 x 1.0 = 1600 | t 150, a 0.75: 1.75 x 1.25 = 2188 | t 80, a 0.90: 1.867 x 1.4 = 2613 | 1600 / 2200 / 2600 |
| `bp-04-sequence` (10 cards, base 1000 x 1.5) | t 150, a 0.50: 1500 x 1.75 x 1.0 = 2625 | t 100, a 0.75: 1500 x 1.833 x 1.25 = 3438 | t 60, a 0.90: 1500 x 1.9 x 1.4 = 3990 | 2650 / 3450 / 3950 |
| `bp-05-geo` (Geo Quiz d2, 10 questions, base 1000 x 1.5, maxTime 600; t includes about 2.5 s of feedback per question) | t 115 (about 9 s per answer), 5 of 10 correct: 1500 x 1.808 x 1.0 = 2712 | t 85, a 0.75: 1500 x 1.858 x 1.25 = 3484 | t 60, 9 of 10 correct: 1500 x 1.9 x 1.4 = 3990 | 2700 / 3500 / 3950. Perfect play (10 of 10, t 55) scores 4293, above 3950. See F1 |
| `bp-06-maze` (base 1000 x 1.5) | t 200, a 0.50: 1500 x 1.667 x 1.0 = 2500 | t 130, a 0.75: 1500 x 1.783 x 1.25 = 3344 | t 80, a 0.90: 1500 x 1.867 x 1.4 = 3920 | 2500 / 3350 / 3900 |
| `bp-07-memory-space` (was `bp-07-memory-hard` / `OCEAN`; same game, difficulty and pairs; 10 pairs, base 1000 x 2.0) | t 300, 30 attempts, a 0.33: 2000 x 1.5 x 0.83 = 2500 | t 180, 20 attempts, a 0.67: 2000 x 1.7 x 1.17 = 3967 | t 100, 13 attempts, a 0.90: 2000 x 1.833 x 1.4 = 5133 | 2500 / 4000 / 5100. Ten pairs is hard for an 8-year-old; W is set at 30 attempts so the boss is not gated by a coin flip |
| `bp-boss` leg 0 `MATH_CHALLENGE` d2 (15 q) | t 170, a 0.50: 2575 | t 120, a 0.75: 3375 | t 75, a 0.90: 3937 | |
| `bp-boss` leg 1 `BUBBLE_POP` d2 (5 rounds) | t 120, a 0.60: 2970 | t 80, a 0.80: 3640 | t 50, a 1.00: 4313 | sums 5545 / 7015 / 8250; 3 stars = 0.9 x 8250 = 7425. Stored 5550 / 7000 / 7400 |
| `bp-bonus-sequence` (d3, base 1000 x 2.0, same anchors as `bp-04-sequence`) | t 150, a 0.50: 2000 x 1.75 x 1.0 = 3500 | t 100, a 0.75: 2000 x 1.833 x 1.25 = 4583 | t 60, a 0.90: 2000 x 1.9 x 1.4 = 5320 | 3500 / 4600 / 5300. Perfect play at t 60 scores 5700, under the 6000 `game.service` cap |
| `si-01-bond-burn` (5 recipes, base 1700, maxTime 60, cap 1.3) | t 70, a 0.60: 1700 x 0.833 x 1.1 = 1558 | t 45, a 0.80: 1700 x 1.25 x 1.3 = 2763 | t 38, a 1.00: 1700 x 1.3 (capped) x 1.5 = 3315 | 1550 / 2750 / 3300. The speed cap makes 3 stars an all-recipes run at about 38 s or faster |
| `si-02-space-entry` (d1, maxTime 180, countdown 90 s) | t 90 (whole countdown), a 0.50: 1700 x 1.5 x 1.0 = 2550 | t 55, a 0.75: 1700 x 1.694 x 1.25 = 3600 | t 35, a 0.90: 1700 x 1.806 x 1.4 = 4297 | 2550 / 3600 / 4250 |
| `si-03-circuit-series` | see section 5 | | | 2200 / 2950 / 3900 |
| `si-04-circuit-branches` | see section 5 and section 7 (same d2 anchors as `si-03`) | | | 2200 / 2950 / 3900 |
| `si-05-scratch` (d1, base 1700, maxTime 120) | t 240+: speed floor 0.1 x 1.5 x 1700 = 255 | t 140, a 1.0: 1700 x 0.833 x 1.5 = 2125 | t 90, a 1.0: 1700 x 1.25 x 1.5 = 3188 | 250 / 1500 / 3150. See F2 |
| `si-06-mini-golf` (d2, base 1800 x 1.5, maxTime 50, cap 1.5) | slow and wild: speed floor 0.1: about 135 to 365 | t 70, strokes ratio 0.8 so a 0.64: 2700 x 0.6 x 1.14 = 1847 | t 45, ratio 0.95 so a 0.90: 2700 x 1.1 x 1.4 = 4158 | 250 / 1850 / 4150. See F2 |
| `si-boss` leg 0 `BOND_AND_BURN` d3 (maxTime 30) | t 36, a 0.60: 3400 x 0.8 x 1.1 = 2992 | t 24, a 0.80: 3400 x 1.2 x 1.3 = 5304 | t 20, a 1.00: 3400 x 1.3 x 1.5 = 6630 | |
| `si-boss` leg 1 `SPACE_ENTRY` d2 (maxTime 120) | t 100, a 0.50: 2975 | t 70, a 0.75: 4516 | t 45, a 0.90: 5801 | |
| `si-boss` (2 legs, Traffic Lab leg dropped, section 7) | sum 5967 | sum 9820 | sum 12431 | 5950 / 9800 / 11150 (3 stars = 0.9 x 12431 = 11188, rounded down) |
| `si-bonus` | section 5 | | | 3650 / 4900 / 6500 |

---

## 4. Findings for the owner and PL3

**F1 - Pattern Recall scores are nearly flat in skill (RESOLVED by owner decision: both Pattern Recall nodes replaced).** The page sends `correctAnswers = rounds completed` and `totalQuestions = round reached` (`PatternRecallGamePage.tsx`, `handleSeeScore`), so accuracy is `n / (n + 1)`. The game ends at the first wrong tap, so a longer run also takes longer and the speed bonus falls. Assuming about `20 + 18 x n` seconds for n rounds, the d2 score peaks near 6 rounds (3637) and then falls slowly (3325 at 14 rounds), and d3 peaks at 4850. A longer run could therefore earn fewer stars than a medium one.
**Decision (owner, approved):** replace both nodes with games whose formula rewards skill monotonically. `bp-bonus` becomes `bp-bonus-sequence` (`SEQUENCE_MEMORY` d3). `bp-05-pattern` becomes `bp-05-geo` (`GEO_QUIZ` d2). `PATTERN_RECALL` stays in the theme allowlist but is no longer used by launch content.
**Why Geo Quiz for node 5.** Both candidates were read. `GeoQuizGamePage.tsx` sends `correctAnswers` = correct count and `totalQuestions` = 10 (fixed), with `completionTime` = total seconds. Accuracy is `correct / 10`, a fixed denominator, and each wrong answer also costs time, so more correct answers always means a higher score; no plateau. `HangmanGamePage.tsx` sends `correctAnswers` = rounds won out of a fixed round count, also monotone, but Hangman is a word game next to `bp-03-words` and `bp-04-sequence` on the path, and its time depends on wrong letter guesses. Geo Quiz differs from both neighbours (`bp-04-sequence` and `bp-06-maze`) and from `bp-03-words`, so no game repeats next to itself. Sequence Memory in the bonus repeats `bp-04-sequence` at d3, as the owner specified; the two are not adjacent (the bonus sits off the path).
**Derivation.** Same W/M/B method as section 2 (standard game: base 1000, maxTime 600, speed cap 2.0, accuracy `0.5 + a`). Geo Quiz d2 time per question is the answer time plus about 2.5 s of fixed feedback (the page waits 2500 ms); the d2 answer limit is 12 s. W: 5 of 10, about 9 s per answer; M: a 0.75, about 6 s; B: 9 of 10, about 3.5 s. Results in section 3. Sequence Memory d3 reuses the `bp-04-sequence` anchors (t 150 / 100 / 60 and a 0.50 / 0.75 / 0.90) with the d3 multiplier of 2.0. Both caps are not binding: the 3-star values (3950, 5300) are below the 6000 `game.service` cap for non-premium games and below the 8000 calculator cap. The bonus stays under the 8000 single-leg limit (V17). Page inputs for Sequence Memory: `correctAnswers` = rounds, `totalQuestions` = card count, `attempts` = rounds + mistakes (`SequenceMemoryGamePage.tsx`). Quest launches Geo Quiz with its default `mode` (capitals); the config has no mode parameter.
**PL3 note.** The Geo Quiz time anchors are assumptions (answer speed per question is not measured). The 1-star value (2700) needs about 5 correct answers at a relaxed pace; fewer than 5 correct gives no star.

**F2 - Scratch Coding and Mini Golf have tight speed windows, so slow completions are near the floor.** Scratch d1 uses `maxTime` 120 s, but its own comment expects 1 to 4 minutes (`score-calculator.service.ts`, Scratch branch). A finish after about 240 s hits the speed floor of 0.1, which is about 255 points for a full completion. Mini Golf d2 uses `maxTime` 50 s against an expected 40 to 120 s. To keep "1 star reachable by a typical 8-year-old", star 1 is set to the completion floor (250) on both nodes, and star 2 starts the real speed ladder. If PL3 shows most children finish slower than the floor, those two nodes award star 1 for any completion, which is acceptable for an entry star.

**F3 - Bond and Burn speed cap.** The 1.3 speed cap (line 85) means a fast run cannot lift the score above 3315 at d1, so star 3 is effectively "all five recipes, fast". It is reachable (B at 38 s) but sensitive to the real duration of the game, which is not measured (U2).

**F4 - Typical 8-year-old and the standard games.** For standard games the 600 s window makes the speed factor nearly constant (1.5 to 1.95 for 1 to 5 minutes), so stars there track accuracy. That is why thresholds for Math, Words, Sequence and Maze are close to each other in shape.

---

## 5. Circuit Builder and the pending PR #25

Circuit Builder on this branch (`origin/main`, `services/game/src/utils/circuit-builder.ts`): `CB_BASE_SCORE = 1700` (line 57), `CB_SCORE_CAP = 8000`, `CB_TIME_WEIGHT = 0.15`, speed bonus 0.9 to 1.15, target times 90 / 120 / 150 / 180 s for d1 to d4. PR #25 reportedly sets the base to **1866** (max score 8000) and may not be merged. This was not verified from the repository (the value 1866 does not appear on this branch); the figure comes from the task statement.

```text
score = base x difficulty multiplier x speed x (0.5 + quality)
speed   = clamp(1 + 0.15 x (target - t) / target, 0.9, 1.15)
quality = clamp(efficiency - fault penalty, 0, 1)
```

Anchors (assumptions): W = quality 0.40 at 1.3 x target time (speed 0.955); M = quality 0.65 at the target time (speed 1.0); B = quality 0.95 at 0.6 x target time (speed 1.06). The three anchors are computed on both bases:

| Node (level, d) | Base | W | M | B | Stored 1 / 2 / 3 |
|---|---|---|---|---|---|
| `si-03` `cb-03-series-loop`, d2 (x1.5) | 1700 | 2192 | 2933 | 3919 | 2200 / 2950 / 3900 |
| | 1866 | 2406 | 3219 | 4302 | |
| `si-07` `cb-05-series-vs-parallel`, d3 (x2.0) | 1700 | 2922 | 3910 | 5226 | 2900 / 3900 / 5200 |
| | 1866 | 3208 | 4292 | 5736 | |
| `si-bonus` `cb-07-resistance-limits-current`, d4 (x2.5) | 1700 | 3653 | 4888 | 6532 | 3650 / 4900 / 6500 |
| | 1866 | 4010 | 5365 | 7170 | |

Robustness check (plan Q7): the thresholds are derived on 1700, the value in this branch. The change to 1866 multiplies every score by 1.0976. The check requires that no anchor profile moves up a tier: W at 1866 must stay below the 2-star value and M at 1866 must stay below the 3-star value. All three nodes pass (2406 < 2950, 3219 < 3900; 3208 < 3900, 4292 < 5200; 4010 < 4900, 5365 < 6500). Star 1 remains reachable (higher scores only help) and star 3 needs near-best play on either base (it becomes about 9% easier at 1866). No threshold change is needed if PR #25 merges first; PL3 recalibration should read whichever base is live. The 8000 cap binds at 1866 only on a perfect `cb-07` run (4250 x 1.0976 x 1.15 x 1.5 = 8047), so 6500 is well below it.

Level budgets (read from `guided-levels.ts`): `cb-03` allows 7 components plus 1 pre-placed switch (budget 8, efficiency denominator 6); `cb-05` allows 9 and none pre-placed (denominator 7); `cb-07` allows 2 resistors and 3 wires with a pre-placed battery and LED (budget 7, denominator 5). Quality 0.95 therefore means using close to the minimum parts and clearing faults. These budgets are used only to judge whether the quality anchors are plausible; the exact component counts of the canonical solves were not derived in this stage.

---

## 6. What the owner can change without code

Thresholds, the two bonus star thresholds, node order and coordinates are config. A new threshold set passes the config test if each triple is strictly ascending and each 3-star value is at most 8000 x leg count. Calibration (PL3) should: pull read-only score percentiles per `(themeId, difficulty)` for completed games, set star 1 near the 25th percentile of finishers, star 2 near the median, star 3 near the 90th, and keep the boss sums as defined in section 2. Percentiles are a proposal, not a measured fit.

---
## 7. Production pre-launch findings (PL1 and PL2) and the config changes they caused
Read-only prod checks found two content problems. Both were fixed in `config.ts`; no other node changed.
- **PL1: theme `OCEAN` does not exist in `memory-game-themes-prod`**, so `startGame` for `OCEAN` fails with "Theme not found". Published Memory Match themes in prod: ANIMALS, FRUITS, VEHICLES, SPACE, FORMULA1, SPORTS. Every other Quest Map themeId is published.
- **PL2: catalog `traffic-lab` is COMING_SOON**, not ACTIVE. Every other `catalogGameId` used by the config is ACTIVE.

**Change 1 - `bp-07-memory-hard` becomes `bp-07-memory-space`.** Memory Match difficulty 3 (10 pairs) with themeId `SPACE` instead of `OCEAN`. Same game, difficulty and pairs, so the formula inputs and the derivation in section 3 are unchanged; thresholds stay 2500 / 4000 / 5100. Display name "Space Memory" (es "Memoria del Espacio", pt "MemÃƒÂ³ria do EspaÃƒÂ§o").

**Change 2a - `si-04-traffic-lab` becomes `si-04-circuit-branches`.** Circuit Builder `cb-04-parallel-branches`, difficulty 2 (the only other d2 guided level; `cb-03` is used by `si-03`). The leg difficulty equals the level's, as the validator requires. Thresholds 2200 / 2950 / 3900 are the section 5 W/M/B result for a d2 level (base 1700: 2192 / 2933 / 3919). Robustness at base 1866 (PR #25): W 2406 < 2950 and M 3219 < 3900, so no anchor moves up a tier; no change needed. The level's own budget was not re-derived; it is assumed comparable to `cb-03`.
Order: to avoid two Circuit Builder nodes side by side, the new node sits after `si-05-scratch` and before `si-06-mini-golf` (path: bond, space, circuit, scratch, circuit, golf, circuit, boss). The node ids keep their original numbers, so array order is si-05-scratch then si-04-circuit-branches. `si-05-scratch` took the old Traffic Lab map slot (55, 62) and the new node took the old Scratch slot (82, 50). Boss and bonus did not move. The bonus is off the path.

**Change 2b - `si-boss` becomes a 2-leg gauntlet.** `BOND_AND_BURN` d3 + `SPACE_ENTRY` d2. Section 2 method with the section 3 anchors: W 2992 + 2975 = 5967, M 5304 + 4516 = 9820, B 6630 + 5801 = 12431. Star 1 = 5950, star 2 = 9800 (nearest 50), star 3 = 0.9 x 12431 = 11188, rounded down to 11150. Thresholds 5950 / 9800 / 11150 (was 8750 / 13150 / 14500). The 3-star value is far under the 8000 x 2 limit (V17).

**Allowlist and launch table.** `TRAFFIC_LAB` was removed from `QUEST_GAME_THEME_IDS` (now 12 game ids, 18 known with the 6 card ids) and from the web launch table, because nothing in quest mode references it. The Traffic Lab page and its route are untouched. `PATTERN_RECALL` stays in both, as in section 4 F1.

**Not fixed here (pre-existing):** the hub's Memory Match offers `OCEAN` (`GAME_THEMES` in `apps/web/src/config/constants.ts`), but prod has no `OCEAN` row, so that hub option fails today.
---
## 8. PL3 calibration, 2026-11-03

**Trigger.** Owner report: the World 1 boss showed "5,550 points" for Math Challenge (Medium) + Bubble Pop (Medium), and was read as a single-game target. 5,550 is the **combined** total of both legs (about 2,775 per leg). Sections 1 to 7 above keep the seed table for history; the live values are the "Final" column below.

**Data.** Read-only scan of `memory-game-games-prod` (status COMPLETED), full paginated scan, linear-interpolation percentiles. Aggregates only; no user ids are recorded. Level id is not stored on a game, so Circuit Builder levels cannot be separated; Circuit Builder d2 to d4 has no completions (n = 0) and keeps seed values. Circuit Builder scores before 2026-11-02T12:31Z were scaled x1866/1700 to the current base.

| Game | Diff | n | p25 | p50 | p90 | Confidence |
|---|---|---|---|---|---|---|
| ANIMALS | 1 | 57 | 2385 | 2737 | 3012.2 | ok |
| MATH_CHALLENGE | 1 | 11 | 2623 | 2690 | 2813 | low |
| MATH_CHALLENGE | 2 | 17 | 3670 | 3857 | 4025.6 | low |
| WORD_PUZZLE | 1 | 14 | 2434.5 | 2644 | 2854.9 | low |
| SEQUENCE_MEMORY | 2 | 5 | 2076 | 2358 | 2804.6 | low |
| SEQUENCE_MEMORY | 3 | 5 | 2975 | 3000 | 4384.6 | low |
| GEO_QUIZ | 2 | 7 | 2719 | 3905 | 4154.8 | low |
| MATH_MAZE | 2 | 7 | 2750 | 2943 | 4278.8 | low |
| SPACE (Memory Match) | 3 | 18 | 4662.5 | 5157 | 5727 | low |
| BUBBLE_POP | 2 | 2 | 4126.2 | 4213.5 | 4353.1 | low |
| BOND_AND_BURN | 1 | 3 | 3315 | 3315 | 4391.8 | low |
| BOND_AND_BURN | 3 | 8 | 3757 | 3978 | 7258 | low |
| SPACE_ENTRY | 1 | 10 | 2847 | 2904 | 2985.3 | low |
| SPACE_ENTRY | 2 | 5 | 3705 | 4018 | 4419.8 | low |
| CIRCUIT_BUILDER | 2, 3, 4 | 0 | none | none | none | no data, seed kept |
| SCRATCH_CODING | 1 | 3 | 3217 | 3487 | 4018.2 | low |
| MINI_GOLF | 2 | 12 | 3117.8 | 4460 | 5029 | low |

Medium Math Challenge (n = 17): 15 of 17 completions score 2,775 or more. Hypothetical independent pairs of Math d2 x Bubble Pop d2 (no real pairing exists, Bubble n = 2): 33 of 34 pairs reach 5,550.

**Rule (revised after review of PR #28).** Seed = the formula values from before PR #28. Real = the percentile-derived values (star 1 = p25, star 2 = p50, star 3 = p90; boss from combined values). Most legs have n < 20, so raw percentiles were noise: tiers collapsed and several nodes became harder.
1. If every leg has n >= 20: final = real, but star 1 never exceeds seed star 1 (it must stay reachable for a typical 8-year-old).
2. If any leg has n < 20 (low confidence): each tier = min(seed, real). Data may only make a star easier, never harder. With no real value (n = 0, Circuit Builder), keep seed.
3. Spacing: star 2 >= star 1 x 1.15 and star 3 >= star 2 x 1.08 (upper tier raised, rounded up to 50), strictly ascending, within the cap (free 6000 per leg, paid 8000 per leg).
4. Bosses use the same rule on the node-level combined values.

**Recalibrate again later, once every leg of a node has n >= 20.** Until then the final values are mostly the seed.

The percentile table above is kept as is.

### Seed, real and final
| Node | Seed (before PR #28) | Real (percentiles) | Final | Note |
|---|---|---|---|---|
| `bp-01-memory` | 1450 / 2300 / 2650 | 2400 / 2750 / 3000 | 1450 / 2750 / 3000 | n = 57: real, star 1 capped at seed |
| `bp-02-math` | 1800 / 2350 / 2650 | 1800 / 2700 / 2800 | 1800 / 2350 / 2650 | low n: min(seed, real) |
| `bp-03-words` | 1600 / 2200 / 2600 | 1600 / 2650 / 2850 | 1600 / 2200 / 2600 | low n: seed kept |
| `bp-04-sequence` | 2650 / 3450 / 3950 | 2100 / 2350 / 2800 | 2100 / 2450 / 2800 | low n; star 2 raised for 1.15 spacing |
| `bp-05-geo` | 2700 / 3500 / 3950 | 2700 / 3900 / 4150 | 2700 / 3500 / 3950 | low n: seed kept |
| `bp-06-maze` | 2500 / 3350 / 3900 | 2500 / 2950 / 4250 | 2500 / 2950 / 3900 | low n: min(seed, real) |
| `bp-07-memory-space` | 2500 / 4000 / 5100 | 2500 / 5150 / 5700 | 2500 / 4000 / 5100 | n = 18: seed kept |
| `bp-boss` | 5550 / 7000 / 7400 | 5550 / 8050 / 8100 | 5550 / 7000 / 7600 | low n; star 3 raised for 1.08 spacing |
| `bp-bonus-sequence` | 3500 / 4600 / 5300 | 3000 / 3050 / 4350 | 3000 / 3450 / 4350 | n = 5; star 2 raised for 1.15 spacing |
| `si-01-bond-burn` | 1550 / 2750 / 3300 | 1550 / 3300 / 4350 | 1550 / 2750 / 3300 | n = 3: seed kept |
| `si-02-space-entry` | 2550 / 3600 / 4250 | 2550 / 2900 / 2950 | 2550 / 2950 / 3200 | n = 10; spacing raised stars 2 and 3 |
| `si-03-circuit-series` | 2200 / 2950 / 3900 | none | 2200 / 2950 / 3900 | no data, seed kept |
| `si-05-scratch` | 250 / 1500 / 3150 | 250 / 3500 / 4000 | 250 / 1500 / 3150 | n = 3: seed kept |
| `si-04-circuit-branches` | 2200 / 2950 / 3900 | none | 2200 / 2950 / 3900 | no data, seed kept |
| `si-06-mini-golf` | 250 / 1850 / 4150 | 250 / 4450 / 5000 | 250 / 1850 / 4150 | n = 12: seed kept |
| `si-07-circuit-parallel` | 2900 / 3900 / 5200 | none | 2900 / 3900 / 5200 | no data, seed kept |
| `si-boss` | 5950 / 9800 / 11150 | 6000 / 8000 / 10500 | 5950 / 8000 / 10500 | low n: min(seed, real) |
| `si-bonus` | 3650 / 4900 / 6500 | none | 3650 / 4900 / 6500 | no data, seed kept |

**Boss detail.** Real boss values come from PR #28 (stars 1 and 2 = sums of leg p25 / p50 with formula floor on star 1; star 3 = 0.9 x summed leg p90). Both bosses have low-confidence legs, so the final value is min(seed, real) per tier, then spacing. p-boss real star 3 was 8100 (above its raised star 2) and seed star 3 is 7400, raised to 7600 to satisfy star 3 >= star 2 x 1.08 (7000 x 1.08 = 7560). Star 1 stays 5550, about 2775 per game. si-boss star 1 returns to the seed 5950 (real 6000 was harder).

**Caveats.** Most p50 and p90 values rest on 2 to 18 games, and the data mixes strong and weak players, so star 2 and 3 are still approximate. Re-run the scan once each node has 20 or more completions. Circuit Builder needs per-level data (level id is not stored on a game).

**UI.** The boss panel now says "Total of both games" under Star goals and shows "about X per game" next to each goal (threshold / leg count, rounded to 50), so the combined score is not read as a single-game target.