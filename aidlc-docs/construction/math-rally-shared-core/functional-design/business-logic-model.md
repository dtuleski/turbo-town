# MR2 Shared Race Core - Business Logic Model

## 1. Race build flow

```text
buildRace(seed, difficulty, version)
  |-- protocolSpec(version)          -> RangeError if not registered
  |-- createRng(seed >>> 0)
  |-- for k in 0..forks-1:
  |     pick kind by weight
  |     draw operands until the answer is canonical       (business-rules 2, R-4)
  |     redraw if the prompt repeats                       (R-3)
  |     options = correct + distractors (rules, then near values)
  |     place the correct option (uniform, no 4th repeat)
  |-- payload = { protocolVersion, difficulty, forks, paths, readSeconds, questions }
  |-- record  = { seed, protocolVersion, paths, forks, key = correctIndex per fork }
```

The same seed, difficulty and version always give the same race (deep equality).

## 2. Track layout with the v1 numbers

Using `domain-entities.md` Sections 3.3 and 3.4. Easy (difficulty 1):

| Line | Position |
|---|---|
| `questionStart[0]` | 600 |
| `decisionLine[0]` | 30 600 |
| `mergeEnd[0]` | 36 600 |
| `questionStart[1]` | 36 800 |
| Fork period (decision line to next decision line) | 36 200 |
| `decisionLine[9]` | 356 400 |
| `mergeEnd[9]` | 362 400 |
| `finishLine` | 371 400 |

The other difficulties follow the same formulas with their approach lengths (fork periods 32 600, 28 800 and 25 000).

## 3. Contract checks (methods file Section 1, all difficulties)

| Contract | Check with the v1 numbers | Holds |
|---|---|---|
| `(decisionLine[k] - questionStart[k]) / maxSpeed >= readSeconds` | 30000/3750 = 8.00; 26400/3750 = 7.04; 22600/3750 = 6.03; 18800/3750 = 5.01 | Yes |
| `mergeEnd[k] < questionStart[k + 1]` | gap of 200 units | Yes |
| `(branchLength + gapLength) / maxSpeed >= 1.5` | 6000 / 3750 = 1.6 s | Yes |
| `cruiseSpeed^2 / (2 x accel) < decisionLine[0]` | 9 000 000 / 3000 = 3000 < 19 400 (smallest, Super Hard) | Yes |
| Every decision line and the finish lie beyond the longest window plus one frame at top speed after the previous line (frame-rule argument) | Longest window distance: boost 1 s x 3750 = 3750 (slowdown 1.5 s x 1800 = 2700), plus 50 ms x 3750 = 187.5, total 3937.5. Next decision line at least 25 000 away; finish 15 000 after the last decision line | Yes |
| Windows never overlap | A window lasts at most 1.5 s and the next line is at least 25 000 units (6.7 s at top speed) away | Yes |

## 4. Motion model

- Speed outside windows: `min(cruiseSpeed, accel x t)`; `t` is kinematic time since "Go".
- Boost window (right answer): `maxSpeed` for `boostSeconds`, opened at the decision line.
- Slowdown window (wrong answer): `slowFactor x cruiseSpeed` (1800) for `slowSeconds`, opened at the decision line.
- `advanceMotion` integrates exactly over each frame interval, split at the end of acceleration (t = 2 s) and at window ends.
- `expectedRaceTimesMs` solves the same model in closed form: each line is crossed at its exact time, each window opens at that time; values are `Math.floor` of exact milliseconds.

Example (Easy, all correct): first decision line at 11.2 s (2 s of acceleration over 3000 units, then 27 600 units at cruise); each later fork adds 1 s of boost (3750 units) plus 32 450 units at cruise, 11.82 s; finish 4.75 s after the last decision line; total about 122.3 s.

## 5. Timing tolerance (AC-30.2)

The property test runs 1000 races per difficulty with random answers, frame deltas of 1 to 50 ms (10% of frames 51 to 500 ms, clamped) and up to 3 pauses. Code Generation runs it with tolerances from 10 ms upward in steps of 10 ms, takes the smallest that passes, adds 50 ms, caps the result at 250 ms, and writes it into `v1/track.ts` and `domain-entities.md` Section 3.3. If no value up to 200 ms passes, the unit stops: the frame-rule argument would be wrong, and the design goes back for review.

## 6. Golden fixtures

- `protocol-v1-races.json`: `buildRace` for seeds 1 to 25 at each difficulty.
- `protocol-v1-times.json`: `expectedRaceTimesMs` for all-right, all-wrong and the two alternating patterns at each difficulty.
- Both carry `"frozen": false` until pre-launch check PL8; the fixture script refuses to overwrite a frozen file.
