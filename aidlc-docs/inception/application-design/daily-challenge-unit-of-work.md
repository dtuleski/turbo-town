# Daily Challenge and Push: Units of Work

Component ids from `daily-challenge-components.md`. Every unit leaves `main` safe to merge on its own:
new behavior stays off until the production steps set the table env vars.

## DC2 Challenge core

- **Branch**: `feat/dc2-challenge-core`, cut from `feat/daily-challenge`. PR against `main`.
- **Components**: C1 to C5, C6 (Code-a-Bot generator only), C7; G1, G2, G3, G4 (challenge operations), G8
  (challenge scores); `Game.challengeDay`; I1 (daily-challenge table in CDK).
- **Stages**: Functional Design (draw, start validation, completion check, ranking), Infrastructure
  Design (table, IAM, env var), Code Generation, Build and Test.
- **Acceptance**:
  - Same day always yields the same stored challenge; no game two days running when 2 or more are
    eligible; Eastern day boundaries correct across DST (unit tests on fixed instants).
  - A challenge start with a wrong day, game or difficulty fails with one generic message and uses no
    play; a valid one counts as a normal play; free users can start it.
  - Best score per user per day; equal score keeps the earlier time; rank correct; completions after
    Eastern midnight or with wrong totals are not recorded and the normal completion still succeeds.
  - Without `DAILY_CHALLENGE_TABLE_NAME`: `getDailyChallenge` returns null, challenge starts fail closed,
    every existing test still passes.

## DC3 Repeatable content (first batch)

- **Branch**: `feat/dc3-repeatable-content`, cut from the DC2 branch. PR against `main`.
- **Components**: C6 generators for sudoku, math-challenge, math-maze, word-puzzle, hangman (enabled in
  the rotation); W1 (get operations), W2, W3, W4; M1, M2, M3; Code-a-Bot parity fixture test.
- **Stages**: Functional Design (generator contracts and content shapes, expected totals per game), Code
  Generation, Build and Test.
- **Acceptance**:
  - Each generator is deterministic for a seed (same seed, same content; different days differ), its
    output is valid (Sudoku has a unique solution, the maze has a path through the gates, words fit the
    grid) and JSON-serializable.
  - Web and app pages opened with `challenge=<day>` play the served content with the challenge
    difficulty and send `challengeContext`; without the param they behave exactly as today.
  - Completion totals reported by each page equal `expectedTotals(content)`.
  - App Code-a-Bot medium levels equal the web's (fixture test).

## DC1 Notifications backend

- **Branch**: `feat/dc1-notifications-backend`, cut from the DC3 branch. PR against `main`.
- **Components**: G4 (device and settings operations), G5, G6, G7, G8 (devices); N1 to N7; I1
  (push-devices table in CDK), I2, I3, I4, I5 as written steps.
- **Stages**: NFR Requirements and NFR Design (delivery window, idempotency, scale to 10,000 users,
  secret handling), Infrastructure Design, Code Generation, Build and Test.
- **Acceptance**:
  - Digest email at 8am local, digest push at 8am local, challenge push at 12pm local, each at most once
    per local day across retries and overlapping runs (unit tests with fixed clocks and zones including
    a half-hour zone and DST change days).
  - Toggle off: nothing sent. Unknown zone: America/New_York. Users who played today get no challenge
    push.
  - Existing digest content unchanged; the challenge section added (winner, top 3, own score and rank,
    or invitation).
  - Without the APNs secret: no push attempts, email unaffected. One failing device does not stop others;
    invalid tokens are removed.
  - `setPrefs` keeps time zone, language and claims; account deletion removes devices and endpoints.
  - `scripts/deploy-daily-email-lambda.sh --build-only` produces a zip with `dist/daily-email.js` and makes
    no AWS write call.

## DC4 Web

- **Branch**: `feat/dc4-web-challenge`, cut from the DC1 branch. PR against `main`.
- **Components**: W1 (`saveNotificationSettings`), W5, W6, W7, W8.
- **Stages**: Code Generation, Build and Test.
- **Acceptance**: card at the top of the hub with game, Play, own best and rank, top 5, hidden when the
  challenge is off or fails to load; results page for a day; time zone and language saved once per
  change; toggle text "Daily emails and notifications" in en/es/pt with the 8am local time; privacy page
  text from plan Q9.

## DC5 App

- **Branch**: `feat/dc5-app-challenge-push`, cut from the DC4 branch. PR against `main`.
- **Components**: M4, M5, M6, M7, M8.
- **Stages**: Code Generation, Build and Test.
- **Acceptance**: soft-ask rules of plan Q10; iOS prompt only after "Allow"; token registered; sign-out
  unregisters; tap routing per FR-DC-23; card and results screen; toggle renamed; zone and language saved;
  Android and tests run without the native channel (calls fail soft).

## Deferred (not built in this run)

DC3 increments for geo-quiz, history-quiz, civics-quiz, sequence-memory, pattern-recall, memory-match,
scratch-coding, space-entry, bond-and-burn, mini-golf (one pull request per game). Android push.

## Production steps

Drafted in `../../construction/plans/daily-challenge-production-steps.md`; DC2 and DC1 Infrastructure
Design complete it with exact commands. Nothing in it runs without the owner's approval.
