# DC2 Challenge Core: Business Rules

Requirement ids from `inception/requirements/daily-challenge-requirements.md`.

## Day and clock (C3)

- **BR-C1** The challenge day of an instant is its calendar date in `America/New_York`
  (`Intl.DateTimeFormat` with `timeZone`, so DST is handled by the runtime's tz data). Winter: 04:59Z is
  the previous day, 05:00Z the new day. Summer: 03:59Z and 04:00Z. (FR-DC-12)
- **BR-C2** `challengeDayBounds(day)` returns the Eastern midnight that starts the day and the next
  Eastern midnight (end exclusive). On DST change days the day is 23 hours (2026-03-08) or 25 hours
  (2026-11-01) long.
- **BR-C3** `isChallengeDay` accepts only `YYYY-MM-DD` strings that are real dates (no 2026-02-30).
- **BR-C4** `isValidTimeZone` accepts only strings of 1 to 64 characters that `Intl.DateTimeFormat`
  accepts as `timeZone`; a `RangeError` means invalid.

## Draw (C5, S1)

- **BR-D1** The draw is a pure function of the day, the eligible list and the previous day's game:
  `mulberry32(seedFrom('draw:' + day))` picks from the candidates. (FR-DC-13)
- **BR-D2** With 2 or more eligible games, the previous day's game is excluded. (FR-DC-13)
- **BR-D3** With exactly 1 eligible game, it repeats. With none, the draw throws (no challenge).
- **BR-D4** The stored CHALLENGE item is the truth. It is written once with `attribute_not_exists(pk)`;
  a writer that loses the race re-reads and serves the stored item. Later code versions never redraw
  an existing day. (FR-DC-11)
- **BR-D5** Content is generated from the seed `${day}:${gameId}` (C4). Generators use only the seeded
  rng. Code-a-Bot content is the fixed list of medium levels `[1..settings.levels]`.

## Start (S2, FR-DC-16, FR-DC-19)

- **BR-S1** A start with `challengeContext` present (not undefined or null) is a challenge start.
- **BR-S2** Without a configured service (`DAILY_CHALLENGE_TABLE_NAME` unset) a challenge start fails
  closed with `CHALLENGE_UNAVAILABLE_MESSAGE` ("This challenge is not available right now.").
- **BR-S3** Validation order (F3): shape, real date, equals today, challenge exists, theme and difficulty
  match. Every failure throws the same `ValidationError(CHALLENGE_UNAVAILABLE_MESSAGE)`.
- **BR-S4** Validation runs after the Quest Map validation and before the paid-game gate, the Super Hard
  gate, `rateLimiter.checkLimit`, theme validation and the game write. A failure consumes no play.
- **BR-S5** A validated challenge start skips only the `PAID_GAME_THEME_IDS` gate. The Super Hard gate,
  rate limit and usage increment apply as for any game (D3: the challenge is a normal play).
- **BR-S6** The game record stores `challengeDay` (the validated day).

## Completion (S2, FR-DC-17 to FR-DC-20)

- **BR-P1** The normal completion is unchanged: score computed, game updated, event published, normal
  leaderboards counted. The challenge hook runs after the Quest Map hook, only on the generic path
  (Circuit Builder is not in the rotation), only when `game.challengeDay` is set.
- **BR-P2** The hook is fail-soft: any error is logged and the response has no `challenge` field
  (`null` in GraphQL); the completion still succeeds.
- **BR-P3** A completion is recorded only when all hold: `challengeDayOf(now) === game.challengeDay`;
  the stored challenge exists; game theme and difficulty equal the challenge's; every total in
  `expectedTotals(content)` equals the reported metric; `correctAnswers <= totalQuestions` and
  `wordsFound <= totalWords` when both are reported. Otherwise the result is
  `{ recorded: false, bestScore: null, rank: null, isNewBest: false }` and nothing is written.
- **BR-P4** Best score per user per day: the SCORE item is written only when it does not exist or its
  `bestScore` is strictly lower (`attribute_not_exists(bestScore) OR bestScore < :s`). An equal score
  keeps the earlier `achievedAt`, so the earlier player ranks higher. (FR-DC-17, FR-DC-18)
- **BR-P5** A recorded completion returns the stored best (new or kept), its rank and `isNewBest`.

## Leaderboard (S3, FR-DC-21)

- **BR-L1** Order: `rankKey` ascending (higher score first, then earlier time). Rank of an entry in the
  top list is its position; rank of `me` is 1 + count of lower `rankKey` values.
- **BR-L2** Inputs per F6: future or malformed days are rejected with a validation error; `limit` is
  clamped to 1..50 (default 10).
- **BR-L3** Entries carry usernames and `isMe`, never user ids (SECURITY-08). `me` is null when the
  caller has no score that day. `final` is true when the day is before today.
- **BR-L4** Today is drawn on demand; a past day without a CHALLENGE item returns null.

## Feature switch and deletion (NFR-DC-7, NFR-DC-2)

- **BR-F1** `createChallengeService(env)` returns `undefined` when `DAILY_CHALLENGE_TABLE_NAME` is unset;
  `getDailyChallenge` and `getChallengeLeaderboard` then return null, and every existing operation is
  unchanged.
- **BR-F2** Account deletion removes the user's SCORE items through `user-index`, only when
  `DAILY_CHALLENGE_TABLE_NAME` is set (no default table name: a missing table would fail deletion).
  CHALLENGE items hold no user data and stay.
