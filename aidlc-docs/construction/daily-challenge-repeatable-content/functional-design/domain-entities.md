# DC3 Repeatable Content: Domain Entities

All types live in `packages/shared/src/challenge/types.ts`. Content is plain JSON (numbers, strings,
`null`, arrays, objects); the server stores it on the `CHALLENGE` item and `getDailyChallenge` sends it
as JSON text in `content`. Clients JSON-parse it and switch on `kind`, which always equals the
rotation `gameId`.

## Content shapes (`ChallengeContent` union)

| kind | Shape | Size for the medium settings |
|---|---|---|
| `code-a-bot` | `{ kind, difficulty: 'medium', levelNumbers: number[] }` (DC2) | `[1, 2, 3, 4, 5]` |
| `sudoku` | `{ kind, puzzle: (number \| null)[][], solution: number[][] }` | 9x9; `null` = blank; up to 46 blanks; unique solution |
| `math-challenge` | `{ kind, questions: { question: string, answer: number, operation: 'addition' \| 'subtraction' \| 'multiplication' \| 'division' }[] }` | 15 questions |
| `math-maze` | `{ kind, maze: MazeContent }` | 10x10, 5 to 8 gates, 4 to 6 collectibles |
| `word-puzzle` | `{ kind, byLanguage: { en, es, pt: { grid: string[][], words: string[], gridSize: number } } }` | 12x12 grid, 8 words per language |
| `hangman` | `{ kind, byLanguage: { en, es, pt: { word: string, hint: string, category: string }[] } }` | 5 words per language |

`MazeContent` = `{ grid: MazeCell[][], start: {row, col}, exit: {row, col}, gates: { position: {row, col},
equation: { display: string, answer: number, operation } }[], collectibles: {row, col}[], rows: number,
cols: number }`, with `MazeCell` = `'wall' | 'path' | 'gate' | 'collectible' | 'start' | 'exit'`. It is the
web's `MazeData` shape, so the page plays it as is.

Text formats match the web generators: math questions `a + b = ?`, `a - b = ?`, `a × b = ?`,
`a ÷ b = ?`; maze equations `a + b = ?`, `a − b = ?` (U+2212), `a × b = ?`, `a ÷ b = ?`. Words are
upper-case ASCII; grid cells are single letters `A` to `Z`.

## Example (abridged JSON)

```json
{ "kind": "hangman", "byLanguage": {
  "en": [{ "word": "KANGAROO", "hint": "Australian jumping animal", "category": "Animals" }],
  "es": [{ "word": "CASCADA", "hint": "Agua que cae de un acantilado", "category": "Naturaleza" }],
  "pt": [{ "word": "GIRAFA", "hint": "Animal mais alto do mundo", "category": "Animais" }] } }
```

## Expected totals (C7, `expectedTotals(content, language?)`)

| kind | Totals | Reported by the web page as |
|---|---|---|
| `code-a-bot` | `totalQuestions = levelNumbers.length` | `totalQuestions: totalLevels` |
| `sudoku` | `totalQuestions` = count of `null` in `puzzle` | `totalQuestions: 81 - given cells` |
| `math-challenge` | `totalQuestions = questions.length` | `totalQuestions` (list length) |
| `math-maze` | `totalQuestions = maze.gates.length` | `totalQuestions: maze.gates.length` |
| `word-puzzle` | `totalWords = byLanguage[lang].words.length` | `totalWords: puzzle.words.length` |
| `hangman` | `totalQuestions = byLanguage[lang].length` | `totalQuestions: rounds` |

`language` defaults to `en`; the counts are equal in every language by construction (business rule
BR-C5), so the server check without a language is correct for every player.

## Source files

- Generators: `packages/shared/src/challenge/generators/{sudoku,math-challenge,math-maze,word-puzzle,hangman}.ts`
- Word lists: `packages/shared/src/challenge/generators/data/{word-puzzle-words,hangman-words}.ts`
- Registry and totals: `packages/shared/src/challenge/generators/index.ts`
