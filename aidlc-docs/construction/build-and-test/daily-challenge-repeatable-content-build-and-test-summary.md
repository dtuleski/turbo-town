# DC3 Repeatable Content (first batch): Build and Test Summary
Branch `feat/dc3-repeatable-content` (cut from `feat/dc2-challenge-core` at cf15e32). Run 2026-11-26 on
macOS, Node 20, Flutter stable, in the worktree. Nothing was deployed; no AWS call was made.

## Commands and results
| # | Command | Result | Baseline (1a5e044) |
|---|---|---|---|
| 1 | `cd packages/shared && npx jest` | 29 suites, 617 tests, all pass | 24 suites, 539 tests |
| 2 | `cd packages/shared && npm run build` | pass | pass |
| 3 | `cd services/game && npx tsc --noEmit` | pass | pass |
| 4 | `cd services/game && npx jest` | 22 suites pass, 2 fail (`tests/unit/services/event-publisher.service.test.ts`, `tests/integration/event-flow.test.ts`, the known failures on main); 354 tests pass | 17 suites pass, 2 fail; 291 tests |
| 5 | `cd apps/web && npx tsc --noEmit -p tsconfig.json --types vite/client` | pass | pass |
| 6 | `cd apps/web && npx vitest run` | 55 files, 961 tests, all pass | 52 files, 919 tests |
| 7 | `cd apps/web && npm run build` | pass (existing chunk-size warning only) | pass |
| 8 | `cd apps/mobile && flutter analyze` | no issues | no issues |
| 9 | `cd apps/mobile && flutter test` | 763 tests, all pass | 727 tests |
| 10 | `cd infrastructure && npx tsc --noEmit` | pass | pass |

## New tests
Shared, game and web suites are listed in the FEAT-002 commit (013c2f1) and in
`functional-design/business-logic-model.md`. App suites added by this part:

| Suite | Covers |
|---|---|
| `apps/mobile/test/api/challenge_api_test.dart` (16) | `getDailyChallenge` parses the JSON text `settings` and `content` of all six kinds; null when off, on a GraphQL error, malformed JSON, `kind` not equal to `gameId`, an invalid day, an 8-row Sudoku, a given cell that differs from the solution, Word Puzzle without `en`, an unknown maze cell, an unknown kind; content equality by JSON (provider keys); `getChallengeLeaderboard` variables and parsing, null on error; `startGame` sends `challengeContext` only for a challenge launch and the quest context wins; `completeGame` parses `challenge` and null; `isChallengeDay`, `parseChallengeParam` (quest wins), `selectChallengeContent`, `challengeLanguage`; converters: Sudoku blanks, Math order, Maze grid and gates, Word Puzzle variant with every word located, Hangman language and fallback |
| `apps/mobile/test/game/game_session_test.dart` (5 added) | Challenge start sends the day and an accepted start is playable with `canPlay: false`; normal start sends no day; rate limit blocks with the limit screen; any other failure (incl. paywall and non-API errors) blocks with `challengeFailed`, never offline play; quest context wins |
| `apps/mobile/test/games/code_a_bot_parity_test.dart` (6) | App medium levels 1..5 equal the web's (`test/fixtures/code_a_bot_levels.json` from `tools/export_code_a_bot_levels.mjs`): size, start, direction, goal, limits, hint, every cell |
| `apps/mobile/test/games/challenge_flow_test.dart` (9) | Through the real router with fixed content: Code-a-Bot plays `[3, 1]` in order and reports 2; Sudoku plays the served puzzle, reports its blanks, Play again restarts the same puzzle with the day; Math plays the 15 questions in order; Math Maze plays the served maze to the exit and reports `gates.length`; Word Puzzle and Hangman play the `es` variant; another game, another day or no challenge goes to `/?challengeFailed=1` with no start; a rejected start goes to the hub; without `challenge=` (or with an invalid day, or next to a valid quest) nothing is loaded and no day is sent for all six routes |

A one-off check (not committed) parsed real `generateContent` output of the six eligible games for three
days with the Dart models and confirmed that the app's totals equal the shared `expectedTotals`.

## Security Baseline
| Rule | Status |
|---|---|
| SECURITY-01 Encryption | N/A for this part: no new storage; app calls use the existing HTTPS game endpoint |
| SECURITY-02 Access logging on intermediaries | N/A: no new API Gateway, load balancer or CDN |
| SECURITY-03 Application logging | Compliant: the app adds no logging; the web logs fixed messages only (`Daily challenge could not be loaded`, `Challenge start failed`), never content, tokens or user ids |
| SECURITY-04 HTTP security headers | N/A: no web host change |
| SECURITY-05 Input validation | Compliant: the `challenge` query parameter must be a real `YYYY-MM-DD` day; served `settings` and `content` are JSON-parsed inside a try and shape-checked per kind (sizes, digits 1 to 9, given cells match the solution, known maze cells and operations, positions in range, `A`-`Z` letters and words, `en` variant present); anything else is "no challenge" |
| SECURITY-06 Least privilege | N/A: no IAM or permission change |
| SECURITY-07 Network | N/A: no network change |
| SECURITY-08 Access control | Compliant: unchanged; the user id comes from the verified JWT on the server; the app sends only `challengeContext: { day }` |
| SECURITY-09 Hardening | Compliant: a rejected challenge start shows no server message; the player is sent to the hub |
| SECURITY-10 Supply chain | Compliant: no new dependency (app, web, shared) |
| SECURITY-11 Secure design | Compliant with the stated limit: content is server-chosen; the score still comes from client-reported metrics within the server's totals check, as for normal leaderboards |
| SECURITY-12 Credentials | N/A: no credentials or secrets |
| SECURITY-13 Integrity | Compliant: clients cannot choose content; the generators are seeded by day and game; Code-a-Bot levels are pinned to the web by the parity test |
| SECURITY-14 Alerting | N/A: no new scheduled job or service |
| SECURITY-15 Fail-safe | Compliant: feature off, load error or mismatched content sends the player to the hub before any start (no play used); a failed challenge start never falls back to an unscored offline round; routes without `challenge=` are unchanged |

## Notes for later units
- App: `lib/api/challenge_api.dart` (`ChallengeApi`), `lib/api/challenge_models.dart`, providers
  `challengeApiProvider` and `dailyChallengeProvider` in `lib/api/game_providers.dart`,
  `lib/challenge/challenge_launch.dart` (`parseChallengeParam`, `kChallengeFailedPath = '/?challengeFailed=1'`),
  `lib/challenge/challenge_content.dart` (converters), `lib/game/framework/challenge_gate.dart`.
- DC5 hub card: launch `<playRoute>?difficulty=medium&challenge=<day>` for the six themes; the hub does not
  yet read `challengeFailed=1` (DC5 shows the message). `CompleteGameResult.challenge` is parsed but not yet
  carried into `GameResult` or shown on the result screen (DC5).
- Tests: `test/helpers/challenge_fixtures.dart` (content builders, `dailyChallengeView`, `FakeChallengeApi`);
  `FakeGameApi` logs `:challenge=<day>` after the start call when a day is sent.
