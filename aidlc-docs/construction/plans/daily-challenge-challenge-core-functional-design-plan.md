# DC2 Challenge Core: Functional Design and Infrastructure Design Plan

Unit: DC2 Challenge core (`feat/dc2-challenge-core`, cut from `feat/daily-challenge` at 0e2cd8e).
Inputs: `inception/requirements/daily-challenge-requirements.md` (FR-DC-11 to FR-DC-21, NFR-DC-1,
NFR-DC-2, NFR-DC-7), `inception/plans/daily-challenge-application-design-plan.md` (Q4, Q5, Q7, Q11),
`inception/application-design/daily-challenge-{components,component-methods,services,unit-of-work}.md`.
The application design fixes components, signatures, item shapes and flows; this plan only settles the
remaining unit-level details. Answers are self-approved under the owner's delegation ("I want to defer
to all your recommendations. Just go!!") and flagged for owner review. Depth: standard.

## Plan

- [x] Read the application design and the code the unit touches (Quest Map is the template)
- [x] Answer the unit questions below
- [x] Write `construction/daily-challenge-challenge-core/functional-design/domain-entities.md`
- [x] Write `construction/daily-challenge-challenge-core/functional-design/business-rules.md`
- [x] Write `construction/daily-challenge-challenge-core/functional-design/business-logic-model.md`
- [x] Write `construction/daily-challenge-challenge-core/infrastructure-design/infrastructure-design.md`
- [x] Fill P1 to P4 of `construction/plans/daily-challenge-production-steps.md` with exact commands
- [x] Code Generation (plan.md items 2 to 8)
- [x] Build and Test (`construction/build-and-test/daily-challenge-challenge-core-build-and-test-summary.md`)

## Questions and answers

### F1. Which content types does DC2 define?
[Answer]: Only the Code-a-Bot content (`{ kind: 'code-a-bot', difficulty: 'medium', levelNumbers }`).
The `ChallengeContent` union is extended by DC3, whose functional design fixes the shape of the other
five games. Defining them now would fix shapes before their generators exist.

### F2. Which theme id does Memory Match use in the rotation?
[Answer]: `ANIMALS` (the first card theme in `apps/web/src/config/constants.ts`). The entry is disabled
until Memory Match has a generator; the run that adds it may change the theme before it becomes eligible.

### F3. What does a challenge start validate, and in which order?
[Answer]: Shape (an object with a `day` string), real `YYYY-MM-DD` date, equal to today's Eastern day,
challenge exists (drawn on demand), `themeId` and `difficulty` equal the challenge's. Any failure,
including a database error while ensuring the challenge, throws `CHALLENGE_UNAVAILABLE_MESSAGE`. The
reason is logged from a fixed list, never the raw input.

### F4. What does a completion report when it is not recorded?
[Answer]: `{ day, recorded: false, bestScore: null, rank: null, isNewBest: false }`. Reasons (logged):
`LATE` (finished after Eastern midnight), `NO_CHALLENGE`, `MISMATCH` (game theme or difficulty differs
from the stored challenge), `TOTALS` (reported totals differ from `expectedTotals`, or
`correctAnswers > totalQuestions`, or `wordsFound > totalWords`). No database write happens.

### F5. How is the rank computed?
[Answer]: `rankKey = pad12(999999999999 - bestScore) + '#' + achievedAt` (ISO time). Ascending
`rankKey` on `rank-index` orders by higher score first and, for equal scores, the earlier time first.
Rank = 1 + number of items of the day with a lower `rankKey` (`Select: 'COUNT'`, paginated).

### F6. Leaderboard input rules?
[Answer]: `day` absent or null means today; otherwise it must pass `isChallengeDay` and be today or
earlier, else `ValidationError('Invalid challenge day')`. `limit` that is a finite number is truncated and
clamped to 1..50; any other value means 10. A past day without a challenge item returns null.

### F7. IAM actions for the Game Lambda on the new table?
[Answer]: Read: `GetItem`, `Query` on the table and `index/*`. Write: `PutItem`, `BatchWriteItem`
(account deletion) on the table. No `UpdateItem` or `DeleteItem`: the code does not use them
(SECURITY-06). DC1 adds its device-table and SNS statements to the same inline policy
`DailyChallengeAccess` before P3 is run.

## Approval

Self-approved 2026-11-26 under the owner's delegation; logged in `aidlc-docs/audit.md`.
