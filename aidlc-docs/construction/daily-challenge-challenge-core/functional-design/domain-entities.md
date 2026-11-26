# DC2 Challenge Core: Domain Entities

Source of signatures: `inception/application-design/daily-challenge-component-methods.md` sections 1
and 2. Decisions: `construction/plans/daily-challenge-challenge-core-functional-design-plan.md` (F1 to F7).

## 1. Shared core (`packages/shared/src/challenge/`)

| Entity | Shape | Notes |
|---|---|---|
| `ChallengeDay` | `string`, `YYYY-MM-DD` | A US Eastern calendar day (`America/New_York`), midnight to midnight |
| `ChallengeLanguage` | `'en' \| 'es' \| 'pt'` | `CHALLENGE_LANGUAGES` lists them |
| `RotationEntry` | `{ gameId, themeId, difficulty: 1 \| 2 \| 3, settings: Record<string, number \| string>, languageDependent }` | One per rotation game; difficulty 2 for all (plan Q7) |
| `CodeABotContent` | `{ kind: 'code-a-bot', difficulty: 'medium', levelNumbers: number[] }` | `levelNumbers` is `[1, 2, 3, 4, 5]` |
| `ChallengeContent` | union of the content types | DC2: `CodeABotContent` only; DC3 adds sudoku, math-challenge, math-maze, word-puzzle, hangman |
| `ChallengeTotals` | `{ totalQuestions?: number; totalWords?: number }` | What a completion must report for the content |
| `DailyChallenge` | `{ day, gameId, themeId, difficulty, settings, content }` | The drawn challenge of a day |

### Rotation (`CHALLENGE_ROTATION`, FR-DC-14 order)

| gameId | themeId | difficulty | settings | languageDependent | Eligible in DC2 |
|---|---|---|---|---|---|
| memory-match | ANIMALS | 2 | `{ difficulty: 'medium' }` | false | no |
| math-challenge | MATH_CHALLENGE | 2 | `{ questions: 15 }` | false | no (DC3) |
| word-puzzle | WORD_PUZZLE | 2 | `{ gridSize: 12, words: 8 }` | true | no (DC3) |
| sudoku | SUDOKU | 2 | `{ blanks: 46 }` | false | no (DC3) |
| sequence-memory | SEQUENCE_MEMORY | 2 | `{ difficulty: 'medium' }` | false | no |
| code-a-bot | CODE_A_BOT | 2 | `{ levels: 5 }` | false | yes |
| geo-quiz | GEO_QUIZ | 2 | `{ difficulty: 'medium' }` | false | no |
| history-quiz | HISTORY_QUIZ | 2 | `{ difficulty: 'medium' }` | false | no |
| civics-quiz | CIVICS_QUIZ | 2 | `{ difficulty: 'medium' }` | false | no |
| hangman | HANGMAN | 2 | `{ words: 5 }` | true | no (DC3) |
| scratch-coding | SCRATCH_CODING | 2 | `{ difficulty: 'medium' }` | false | no |
| math-maze | MATH_MAZE | 2 | `{ size: 10, gatesMin: 5, gatesMax: 8, collectiblesMin: 4, collectiblesMax: 6 }` | false | no (DC3) |
| pattern-recall | PATTERN_RECALL | 2 | `{ difficulty: 'medium' }` | false | no |
| space-entry | SPACE_ENTRY | 2 | `{ difficulty: 'medium' }` | false | no |
| bond-and-burn | BOND_AND_BURN | 2 | `{ difficulty: 'medium' }` | false | no |
| mini-golf | MINI_GOLF | 2 | `{ difficulty: 'medium' }` | false | no |

An entry is eligible when a generator is registered for its `gameId` (`hasGenerator`). After DC2 only
code-a-bot is eligible, so the draw repeats it every day (rule BR-D3) until DC3 registers the others.

## 2. Game Lambda (`services/game`)

### `Game` entity (`packages/shared/src/types/entities.ts`)

`challengeDay?: string` beside `questContext`. Set only on a validated challenge start; stored on the
games item and read back by `GameRepository.getById` (the item mapper spreads every attribute).

### Items in `memory-game-daily-challenge-<stage>`

| Item | Key | Attributes |
|---|---|---|
| CHALLENGE | `pk` = day, `sk` = `CHALLENGE` | `gameId`, `themeId`, `difficulty`, `settings` (map), `content` (map), `createdAt` (ISO) |
| SCORE | `pk` = day, `sk` = `SCORE#<userId>` | `userId`, `username`, `bestScore` (number), `achievedAt` (ISO), `rankPk` = day, `rankKey` = `pad12(999999999999 - bestScore)#achievedAt` |

GSIs: `rank-index` (`rankPk`, `rankKey`), only SCORE items; `user-index` (`userId`, `pk`), only SCORE
items. Both project ALL.

### Service views (`services/game/src/types/challenge.ts`)

| View | Shape |
|---|---|
| `ChallengeMyEntry` | `{ bestScore, rank, achievedAt }` |
| `DailyChallengeView` | `DailyChallenge` + `{ endsAt (ISO, next Eastern midnight), me: ChallengeMyEntry \| null }` |
| `ChallengeEntry` | `{ rank, username, score, achievedAt, isMe }` (never a user id) |
| `ChallengeLeaderboardView` | `{ day, gameId, themeId, final, entries, me }` |
| `ChallengeCompletion` | `{ day, recorded, bestScore: number \| null, rank: number \| null, isNewBest }` |

The GraphQL handler sends `settings` and `content` as JSON text (contract in component-methods).
