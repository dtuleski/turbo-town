# MR2 Shared Race Core - Domain Entities

Location: `packages/shared/src/math-rally/`. Type shapes are fixed by `inception/application-design/math-rally-component-methods.md` Section 1; this file fixes the values the design left to Functional Design.

## 1. Race entities

| Entity | Fields | Notes |
|---|---|---|
| `MathRallyDifficulty` | `1 \| 2 \| 3 \| 4` | Easy, Medium, Hard, Super Hard |
| `QuestionKind` | 14 kinds (Section 3) | Fixed per protocol version |
| `GeneratedQuestion` | `kind`, `operands` (integers, at most 4, each within -1000..1000), `answer: Exact` | Internal to the generator |
| `MathRallyQuestion` | `kind`, `operands`, `options` (`paths` canonical strings), `correctIndex` | Sent to the client |
| `MathRallyRacePayload` | `protocolVersion`, `difficulty`, `forks`, `paths`, `readSeconds`, `questions` | Sent to the client; contains no key separate from `correctIndex` (the server never trusts the client's copy) |
| `MathRallyGameRecord` | `seed`, `protocolVersion`, `paths`, `forks`, `key` | Stored on the game record by MR3 |
| `MathRallySubmission` | `choices`, `forkTimesMs` | Sent by the client at completion |

## 2. Option values

- `Exact { num, den }`: `den > 0`, `gcd(|num|, den) = 1`, `den = 1` for whole numbers.
- Canonical option string: at most 4 characters, either an integer `^(0|-?[1-9][0-9]{0,2})$` (-999 to 999) or a fraction `^-?[1-9][0-9]?/[1-9][0-9]?$`.
- Consequence of the 4-character limit: a fraction answer has at most 4 characters in total, so `7/12` and `11/6` are allowed but `13/20` is not. The generator redraws any question whose answer does not fit (Section 4 of `business-rules.md`).

## 3. Protocol v1 (`PROTOCOL_V1`)

### 3.1 Parameters (requirements Section 4.0)

| Difficulty | `paths` | `forks` | `readSeconds` |
|---|---|---|---|
| 1 Easy | 2 | 10 | 8 |
| 2 Medium | 3 | 12 | 7 |
| 3 Hard | 4 | 15 | 6 |
| 4 Super Hard | 4 | 15 | 5 |

### 3.2 Kinds per difficulty (FR-MK-13, owner answers Q3 to Q6)

| Difficulty | Kinds and draw weights |
|---|---|
| 1 | `add` 50, `sub` 50 |
| 2 | `mul` 30, `div` 30, `add` 20, `sub` 20 |
| 3 | `twoStep` 25, `fractionOf` 25, `percentOf` 25, `square` 25 |
| 4 | `negArith` 25, `equation` 20, `fracAdd` 15, `percentOfAny` 15, `power` 15, `sqrt` 10 |

`add` and `sub` use different operand rules at difficulty 1 and 2 (`business-rules.md` Section 2).

### 3.3 Track constants (`v1/track.ts`)

| Constant | Value | Source |
|---|---|---|
| `segmentLength` | 200 | FD |
| `accel` | 1500 units/s^2 | FD (cruise 2 s after "Go") |
| `cruiseSpeed` | 3000 units/s | FD |
| `maxSpeed` | 3750 units/s (1.25 x cruise) | Owner answer Q2 |
| `slowFactor` | 0.6 | Design |
| `boostSeconds` | 1 | Q4 (inception) |
| `slowSeconds` | 1.5 | Q3 (inception) |
| `firstQuestionAt` | 600 | Owner answer Q8 (new field, see note) |
| `approachLength` | per difficulty, Section 3.4 | Owner answer Q1 (see note) |
| `branchLength` | 4000 | FD |
| `gapLength` | 2000 | FD |
| `mergeToNextQuestion` | 200 (one segment) | FD (new field, see note) |
| `finishLength` | 9000 | FD (about 3 s at cruise) |
| `timingToleranceMs` | 50 | Measured in Code Generation (MR2 Step 6): the AC-30.2 property test passes with 0 ms for every difficulty over 3 x 1000 races, so 0 + 50 ms margin |

Note on the `TrackConstants` shape: the design lists one `approachLength`. Owner answer Q1 makes it depend on the difficulty, so v1 stores `approachLength` as a record per difficulty, and two fields are added (`firstQuestionAt`, `mergeToNextQuestion`). The change stays inside `TrackConstants`, which is frozen per protocol version like everything else in `v1/`.

### 3.4 Approach length per difficulty

`approachLength[d] = ceil(readSeconds[d] x maxSpeed / segmentLength) x segmentLength`

| Difficulty | `readSeconds x maxSpeed` | `approachLength` | Reading time at top speed |
|---|---|---|---|
| 1 | 30 000 | 30 000 | 8.00 s |
| 2 | 26 250 | 26 400 | 7.04 s |
| 3 | 22 500 | 22 600 | 6.03 s |
| 4 | 18 750 | 18 800 | 5.01 s |

## 4. Track layout (`trackLayout(spec, difficulty)`)

For fork k (0-based):

- `questionStart[0] = firstQuestionAt`
- `decisionLine[k] = questionStart[k] + approachLength[d]`
- `mergeEnd[k] = decisionLine[k] + branchLength + gapLength`
- `questionStart[k + 1] = mergeEnd[k] + mergeToNextQuestion`
- `finishLine = mergeEnd[forks - 1] + finishLength`

The road splits at the decision line, the branches run for `branchLength` with the answer signs, and merge back to one road over `gapLength`.

## 5. Free-tier gate (`constants/paid-games.ts`)

- `FREE_DIFFICULTIES_IN_PAID_GAMES = { MATH_RALLY: [1] }` (frozen objects).
- `isBlockedForFreeTier(themeId, difficulty, paidThemeIds, exceptions)`: true when `themeId` is in `paidThemeIds` and `difficulty` is not in `exceptions[themeId]`.
- At launch `MATH_RALLY` is not in `PAID_GAME_THEME_IDS`, so the function returns false for every difficulty; the difficulty-4 rule stays a separate check in `startGame` (MR3).

## 6. Optional attribute on the shared `Game` type

`mathRally?: MathRallyGameRecord` on `Game` in `types/entities.ts`, additive.
