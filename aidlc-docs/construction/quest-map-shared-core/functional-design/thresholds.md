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
| `bp-07-memory-hard` | Memory Match / `OCEAN` | 3 | 2500 | 4000 | 5100 |
| `bp-boss` | `MATH_CHALLENGE` d2 + `BUBBLE_POP` d2 (combined) | 2 + 2 | 5550 | 7000 | 7400 |
| `bp-bonus-sequence` | `SEQUENCE_MEMORY` | 3 | 3500 | 4600 | 5300 |

Bonus star threshold: **14** of a maximum 24 path stars (8 path nodes x 3).

### World 2 - Science Island (paid)

| Node id | Game / themeId | Diff | 1 star | 2 stars | 3 stars |
|---|---|---|---|---|---|
| `si-01-bond-burn` | `BOND_AND_BURN` | 1 | 1550 | 2750 | 3300 |
| `si-02-space-entry` | `SPACE_ENTRY` | 1 | 2550 | 3600 | 4250 |
| `si-03-circuit-series` | `CIRCUIT_BUILDER` / `cb-03-series-loop` | 2 | 2200 | 2950 | 3900 |
| `si-04-traffic-lab` | `TRAFFIC_LAB` | 2 | 2800 | 3300 | 3650 |
| `si-05-scratch` | `SCRATCH_CODING` | 1 | 250 | 1500 | 3150 |
| `si-06-mini-golf` | `MINI_GOLF` | 2 | 250 | 1850 | 4150 |
| `si-07-circuit-parallel` | `CIRCUIT_BUILDER` / `cb-05-series-vs-parallel` | 3 | 2900 | 3900 | 5200 |
| `si-boss` | `BOND_AND_BURN` d3 + `SPACE_ENTRY` d2 + `TRAFFIC_LAB` d2 (combined) | 3 + 2 + 2 | 8750 | 13150 | 14500 |
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
| `bp-07-memory-hard` (10 pairs, base 1000 x 2.0) | t 300, 30 attempts, a 0.33: 2000 x 1.5 x 0.83 = 2500 | t 180, 20 attempts, a 0.67: 2000 x 1.7 x 1.17 = 3967 | t 100, 13 attempts, a 0.90: 2000 x 1.833 x 1.4 = 5133 | 2500 / 4000 / 5100. Ten pairs is hard for an 8-year-old; W is set at 30 attempts so the boss is not gated by a coin flip |
| `bp-boss` leg 0 `MATH_CHALLENGE` d2 (15 q) | t 170, a 0.50: 2575 | t 120, a 0.75: 3375 | t 75, a 0.90: 3937 | |
| `bp-boss` leg 1 `BUBBLE_POP` d2 (5 rounds) | t 120, a 0.60: 2970 | t 80, a 0.80: 3640 | t 50, a 1.00: 4313 | sums 5545 / 7015 / 8250; 3 stars = 0.9 x 8250 = 7425. Stored 5550 / 7000 / 7400 |
| `bp-bonus-sequence` (d3, base 1000 x 2.0, same anchors as `bp-04-sequence`) | t 150, a 0.50: 2000 x 1.75 x 1.0 = 3500 | t 100, a 0.75: 2000 x 1.833 x 1.25 = 4583 | t 60, a 0.90: 2000 x 1.9 x 1.4 = 5320 | 3500 / 4600 / 5300. Perfect play at t 60 scores 5700, under the 6000 `game.service` cap |
| `si-01-bond-burn` (5 recipes, base 1700, maxTime 60, cap 1.3) | t 70, a 0.60: 1700 x 0.833 x 1.1 = 1558 | t 45, a 0.80: 1700 x 1.25 x 1.3 = 2763 | t 38, a 1.00: 1700 x 1.3 (capped) x 1.5 = 3315 | 1550 / 2750 / 3300. The speed cap makes 3 stars an all-recipes run at about 38 s or faster |
| `si-02-space-entry` (d1, maxTime 180, countdown 90 s) | t 90 (whole countdown), a 0.50: 1700 x 1.5 x 1.0 = 2550 | t 55, a 0.75: 1700 x 1.694 x 1.25 = 3600 | t 35, a 0.90: 1700 x 1.806 x 1.4 = 4297 | 2550 / 3600 / 4250 |
| `si-03-circuit-series` | see section 5 | | | 2200 / 2950 / 3900 |
| `si-04-traffic-lab` (d2, maxTime 90, sim 90 s, cap 1.3) | t 90, a 0.60: 2550 x 1.0 x 1.1 = 2805 | t 90, a 0.80: 2550 x 1.3 = 3315 | t 90, a 0.95: 2550 x 1.45 = 3698 | 2800 / 3300 / 3650. Time is the whole simulation, so speed is 1.0 and accuracy decides |
| `si-05-scratch` (d1, base 1700, maxTime 120) | t 240+: speed floor 0.1 x 1.5 x 1700 = 255 | t 140, a 1.0: 1700 x 0.833 x 1.5 = 2125 | t 90, a 1.0: 1700 x 1.25 x 1.5 = 3188 | 250 / 1500 / 3150. See F2 |
| `si-06-mini-golf` (d2, base 1800 x 1.5, maxTime 50, cap 1.5) | slow and wild: speed floor 0.1: about 135 to 365 | t 70, strokes ratio 0.8 so a 0.64: 2700 x 0.6 x 1.14 = 1847 | t 45, ratio 0.95 so a 0.90: 2700 x 1.1 x 1.4 = 4158 | 250 / 1850 / 4150. See F2 |
| `si-boss` leg 0 `BOND_AND_BURN` d3 (maxTime 30) | t 36, a 0.60: 3400 x 0.8 x 1.1 = 2992 | t 24, a 0.80: 3400 x 1.2 x 1.3 = 5304 | t 20, a 1.00: 3400 x 1.3 x 1.5 = 6630 | |
| `si-boss` leg 1 `SPACE_ENTRY` d2 (maxTime 120) | t 100, a 0.50: 2975 | t 70, a 0.75: 4516 | t 45, a 0.90: 5801 | |
| `si-boss` leg 2 `TRAFFIC_LAB` d2 | 2805 | 3315 | 3698 | sums 8772 / 13135 / 16129; 3 stars = 0.9 x 16129 = 14516. Stored 8750 / 13150 / 14500 |
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
