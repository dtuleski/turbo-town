# MR2 Shared Race Core - Implementation Summary

Plan: `construction/plans/math-rally-shared-core-code-generation-plan.md` (all 15 steps done).

## Files

Created (`packages/shared/`):

| File | Purpose |
|---|---|
| `src/math-rally/types.ts` | Difficulty, kinds, question, payload, record, submission, `Exact`, `TrackConstants` |
| `src/math-rally/exact.ts` | Canonical option patterns, `parseOption`, `sameValue`, `formatExact`, fraction helpers |
| `src/math-rally/rng.ts` | mulberry32 RNG with `nextInt`, `pick`, `weightedPick`, `shuffle` |
| `src/math-rally/protocols.ts` | Theme id, client and supported protocols, update message, `ProtocolSpec`, `protocolSpec` |
| `src/math-rally/track.ts` | `trackLayout` |
| `src/math-rally/motion.ts` | `initialMotion`, `speedAt`, `advanceMotion`, `applyOutcome`, closed-form `timeToReach` |
| `src/math-rally/timing.ts` | `expectedRaceTimesMs`, `isPlausibleTiming` |
| `src/math-rally/race.ts` | `buildRace` |
| `src/math-rally/index.ts` | Public exports |
| `src/math-rally/v1/{params,track,questions,distractors,index}.ts` | Protocol v1: parameters, track constants, 14 generators, mistake rules, `PROTOCOL_V1` |
| `src/math-rally/__fixtures__/protocol-v1-{races,times}.json` | Golden fixtures (`"frozen": false` until PL8) |
| `scripts/write-math-rally-fixtures.mjs` | Writes the fixtures from `dist/`; refuses if any target is frozen, before writing anything |
| Tests: `exact`, `rng`, `track`, `timing`, `motion.property`, `questions`, `distractors`, `race.property`, `options.property`, `isolation`, `golden` (`src/math-rally/`), `src/constants/paid-games.test.ts` | |

Edited (additions only, checked with `git diff`):

- `src/constants/paid-games.ts`: `FREE_DIFFICULTIES_IN_PAID_GAMES`, `isBlockedForFreeTier`
- `src/types/entities.ts`: optional `mathRally?: MathRallyGameRecord` on `Game`
- `src/index.ts`: `export * from './math-rally'`

## Results

| Check | Result |
|---|---|
| `packages/shared` `npx jest` | 36 suites, 693 tests pass (baseline 24 suites, 539 tests) |
| `packages/shared` `npx tsc --noEmit`, `npm run build` | Pass; no test files in `dist/math-rally` |
| `services/game` `npx tsc --noEmit` against the new shared build | Pass |
| `services/game` `npx jest` | 222 tests pass; the same 2 suites fail to compile as on `main` (event-publisher, event-flow) |

Property tests run 1000 cases per difficulty for: frame-loop timing (AC-30.2), race contracts (AC-13.1, AC-14.1, AC-15.2, FR-MK-17), options (FR-MK-14, FR-MK-15), and rule-based distractors (AC-15.1). Position balance is checked over 10 000 forks per difficulty (AC-16.1).

## Values settled in Code Generation

- `timingToleranceMs = 50`: the AC-30.2 property passes with 0 ms for every difficulty over 3 x 1000 races with different seeds, so 0 + 50 ms margin (FD `domain-entities.md` Section 3.3 updated). The frame-loop kart is never earlier than the closed-form times, as the design's argument predicts.
- RNG pin: seed 1 gives `2693262067, 11749833, 2265367787` (standard mulberry32).

## Differences from the plan or design

- `ProtocolSpec` gained `KindWeight` lists (`kinds` holds weights as well as kinds) to carry the owner's mix (FD Section 3.2).
- `TrackConstants.approachLength` is a record per difficulty and has two added fields (`firstQuestionAt`, `mergeToNextQuestion`), as the FD recorded.
- The protocol registry is a static map built from `PROTOCOL_V1` (no registration function), so importing `timing.ts` alone still finds v1.
- `buildDistractors` (exported for tests) reports which rule produced each distractor.

## Security Baseline (SECURITY-03, 04, 05, 08, 09, 10, 11, 13, 15)

| Rule | Status | Note |
|---|---|---|
| 03 Logging | N/A | No logging in the module |
| 04, 08, 09, 10, 11, 13 | N/A | No I/O, network, storage, secrets, auth or dependencies added |
| 05 Input validation | Compliant | `protocolSpec` accepts only registered integers; `isPlausibleTiming` refuses non-finite and wrong-length input; `buildRace` throws `RangeError` for an unknown version or difficulty |
| 15 Error handling | Compliant | Bounded redraws throw a descriptive `Error`; no silent fallback to an invalid race |

## Deploy note

Nothing deployed. `packages/shared/**` is a trigger path of `.github/workflows/deploy-lambdas.yml`: merging this to `main` redeploys the Game, Leaderboard and Email Sender Lambdas. Nothing calls the new code until MR3, so behaviour does not change. The shared package grows by the new compiled module only; the fixtures are not part of the build.
