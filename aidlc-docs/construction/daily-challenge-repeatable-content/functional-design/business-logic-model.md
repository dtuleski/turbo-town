# DC3 Repeatable Content: Business Logic Model

## Port notes per web generator

| Game | Web source | Shared generator | Changes in the port |
|---|---|---|---|
| Sudoku | `apps/web/src/utils/sudokuUtils.ts` `generateSudoku` | `generators/sudoku.ts` `generateSudoku(entry, rng)` | `shuffle(rng, ...)` for digits and cell order; `blanks` from settings; `countSudokuSolutions` exported for tests |
| Math Challenge | `apps/web/src/utils/mathUtils.ts` `generateQuestion` with `MathGamePage` medium config | `generators/math-challenge.ts` | medium operations and limits fixed; the 15 questions are generated up front instead of one per step |
| Math Maze | `apps/web/src/utils/mazeGenerator.ts` `generateMaze` + `mazeEquations.ts` `generateEquation` | `generators/math-maze.ts` | equation drawn at gate placement; rebuild until 5 to 8 gates and at least 4 collectibles (BR-C7); `mazeHasPath` exported for tests |
| Word Puzzle | `apps/web/src/utils/wordPuzzleUtils.ts` `generateWordPuzzle` | `generators/word-puzzle.ts` | `sort(() => Math.random() - 0.5)` replaced by `shuffle`; unplaceable words skipped (BR-C5); one variant per language |
| Hangman | `apps/web/src/utils/hangmanData.ts` `pickRandomWords` | `generators/hangman.ts` | `shuffle` instead of the random sort; one list per language |

## Flow: draw and serve (S1, unchanged in DC2 code)

```
ensureChallenge(day)
  -> drawChallenge(day, eligibleRotation() /* 6 games */, previousGameId)
  -> generateContent(entry, day)            // GENERATORS[gameId](entry, mulberry32(seedFrom(`${day}:${gameId}`)))
  -> conditional put of the CHALLENGE item  // stored item wins afterwards
getDailyChallenge -> { ..., settings: JSON text, content: JSON text }
```

## Flow: web challenge play (S2)

```
Hub card (DC4) -> buildChallengeUrl -> /<game>/game?difficulty=medium&challenge=<day>
Page mounts
  useChallengeContent(kind): parseChallengeParam(location.search)
    null      -> status 'off'   -> page runs its own generator and startGame as before
    { day }   -> status 'loading' (loading screen)
              -> getDailyChallenge() -> selectChallengeContent(view, kind, day)
                   null    -> location.replace('/hub?challengeFailed=1')
                   content -> status 'ready' { content, day, difficulty }
  status 'ready' -> converter (challengeContent.ts) -> page state
                 -> startGame({ themeId, difficulty: 2 })
                      api/game.ts adds challengeContext { day } (quest param wins)
                      rate-limit error -> page rate-limit screen
                      other error      -> location.replace('/hub?challengeFailed=1'), never settles
  finish -> completeGame({ ..., totals derived from the content }) -> response.challenge
```

## Converters (`apps/web/src/utils/challengeContent.ts`)

| Function | Output used by the page |
|---|---|
| `codeABotPlan(content)` | `{ difficulty, levelNumbers }`; level `i` = `getLevel(difficulty, levelNumbers[i-1])`, `totalLevels = levelNumbers.length` |
| `sudokuState(content)` | `{ puzzle, solution, initial }` copies |
| `mathQuestions(content)` | `MathQuestion[]` played in order; `totalQuestions = length` |
| `mathMazeData(content)` | `MazeData` deep copy (the page mutates nothing in the content) |
| `wordPuzzleFor(content, i18n.language)` | `WordPuzzle` for the language variant |
| `hangmanWordsFor(content, i18n.language)` | `HangmanWord[]`; `rounds = length` |
| `selectChallengeContent(view, kind, day)` | content or null (game and day check) |
| `difficultyName(n)`, `challengeLanguage(tag)` | `'medium'`; `'en' \| 'es' \| 'pt'` |

## Tests

- Shared (`packages/shared/src/challenge/content.test.ts`, `generators.test.ts`, `draw.test.ts`): same day
  same content; at least 2 distinct contents over 30 days (10 for Sudoku); JSON round trip; Sudoku valid,
  consistent and unique; maze 10x10, 5 to 8 gates each bypassable, 4 to 6 collectibles, path to exit;
  every word in its grid, 8 per language; hangman 5 distinct listed words per language; math answers
  correct, no consecutive repeat; `expectedTotals` per game and language; six games eligible and drawn
  without consecutive repeats over 365 days.
- Game service (`tests/unit/services/challenge.service.rotation.test.ts`): real rotation over 14 days.
- Web (`src/utils/__tests__/challengeLaunch.test.ts`, `challengeContent.test.ts`,
  `src/api/__tests__/gameChallenge.test.ts`): param parsing, URLs, start context and redirects, completion
  selection, API parsing, converters and page totals equal `expectedTotals`.
