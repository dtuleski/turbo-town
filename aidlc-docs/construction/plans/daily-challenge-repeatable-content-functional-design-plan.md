# DC3 Repeatable Content (first batch): Functional Design Plan

Unit: DC3 Repeatable content, first batch (`feat/dc3-repeatable-content`, cut from the
`feat/dc2-challenge-core` tip cf15e32).
Inputs: `inception/requirements/daily-challenge-requirements.md` (FR-DC-13 to FR-DC-16, FR-DC-19,
NFR-DC-7), `inception/plans/daily-challenge-application-design-plan.md` (Q7, Q8),
`inception/application-design/daily-challenge-{components,component-methods,services,unit-of-work}.md`
(C6, C7, W1 to W4, M1 to M3, flow S2), DC2 functional design
(`construction/daily-challenge-challenge-core/functional-design/`).
The application design fixes the components, the content union and the flows; this plan settles the
unit-level details. Answers are self-approved under the owner's delegation ("I want to defer to all
your recommendations. Just go!!") and flagged for owner review. Depth: standard.

## Plan

- [x] Read the application design, the DC2 core and the six web generators and pages
- [x] Answer the unit questions below
- [x] Write `construction/daily-challenge-repeatable-content/functional-design/domain-entities.md`
- [x] Write `construction/daily-challenge-repeatable-content/functional-design/business-rules.md`
- [x] Write `construction/daily-challenge-repeatable-content/functional-design/business-logic-model.md`
- [x] Code Generation, shared and web (plan.md items 11 to 13)
- [x] Code Generation, app (plan.md items 14 and 15)
- [x] Build and Test (`construction/build-and-test/daily-challenge-repeatable-content-build-and-test-summary.md`, plan.md item 16)

## Questions and answers

### R1. Which word lists do the shared generators carry?
[Answer]: The medium lists only, copied verbatim into `packages/shared/src/challenge/generators/data/`
(`word-puzzle-words.ts` from `wordPuzzleUtils.ts` medium en/es/pt, 48 words each; `hangman-words.ts`
from `hangmanData.ts` `MEDIUM_WORDS{,_ES,_PT}`, 40/20/20 words). Every challenge is medium (Q7), so the
easy and hard lists would be unused code.

### R2. The web Word Puzzle lists a word even when it could not place it. What does the challenge do?
[Answer]: A word that does not fit is skipped and the next word of the shuffled list is tried, until 8
words are placed. Every listed word is in the grid and every language has the same count, so
`expectedTotals` is one number for all languages. Duplicates in a list (`GLOBO` twice in es) are removed
before the shuffle.

### R3. The web Math Maze may place fewer gates than its minimum. What does the challenge do?
[Answer]: The maze is built again from the same rng until it has 5 to 8 gates, at least 4 collectibles
and a path to the exit (at most 50 attempts; the last maze is used if none qualifies, which no tested day
reaches). Gate equations are drawn when the gate is placed instead of a placeholder replaced later.

### R4. How do language variants get their randomness?
[Answer]: One rng per language, seeded with `floor(rng() * 2^32)` from the day's rng
(`${day}:${gameId}`) in `CHALLENGE_LANGUAGES` order (en, es, pt). Each variant is deterministic for the
day and does not depend on another language's list length.

### R5. What does `expectedTotals` return per game?
[Answer]: code-a-bot `totalQuestions = levelNumbers.length` (5); sudoku `totalQuestions` = blanks in
`puzzle` (at most 46, fewer when a removal would break uniqueness); math-challenge
`totalQuestions = questions.length` (15); math-maze `totalQuestions = gates.length` (5 to 8);
word-puzzle `totalWords = words.length` (8, same in every language); hangman
`totalQuestions` = words per language (5). These are exactly the numbers each web page already reports.

### R6. When does a web page start the game in challenge mode, and with which difficulty?
[Answer]: Only after `useChallengeContent` has today's challenge for that game (status `ready`), with
the challenge's difficulty (2, medium). Content that fails to load or is for another game or day sends
the player to `/hub?challengeFailed=1` before any start, so no play is used.

### R7. Which start failures redirect to the hub?
[Answer]: Every failure of a start with a valid `challenge` param except a rate-limit error. A
rate-limit error reaches the page, which shows the rate-limit screen as for any play (a challenge is a
normal play, D3). The quest param wins when both are present.

### R8. Do the service tests keep running on Code-a-Bot?
[Answer]: Yes. The DC2 suites that build Code-a-Bot fixtures pin `eligibleRotation` to Code-a-Bot with a
`jest.mock` of `@memory-game/shared`; the new suite `challenge.service.rotation.test.ts` runs the real
six-game rotation (draw, start validation, recorded completion with `expectedTotals`, not recorded with
one total short).
