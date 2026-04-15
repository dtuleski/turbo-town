# Math Maze Game — Implementation Tasks

## Task 1: Core Utility Modules (Pure Logic)

- [x] 1.1 Create `apps/web/src/utils/mazeGenerator.ts` with `generateMaze(difficulty)` function using modified recursive backtracker algorithm. Must produce a grid with exactly one start, one exit, walls, paths, gates, and collectibles. Must guarantee ≥2 distinct paths from start to exit. Include `getConfigForDifficulty()`, `hasPathToExit()`, and `findDistinctPaths()` helpers.
- [x] 1.2 Create `apps/web/src/utils/mazeEquations.ts` with `generateEquation(difficulty)` and `checkEquationAnswer(equation, answer)`. Easy: add/subtract, operands 1–20. Medium: +−×÷, operands 1–50. Hard: adds powers, roots, simple algebra (ax+b=c). All answers are integers.
- [x] 1.3 Create `apps/web/src/utils/mazeScoringUtils.ts` with `calculateMazeScore(result)` implementing the formula: `round(1000 × DifficultyMultiplier × SpeedBonus × AccuracyBonus) + collectiblesGathered × 50`.

## Task 2: Property-Based Tests for Core Utils

- [x] 2.1 [PBT] Property 1: Maze structural invariant — for any difficulty, generated maze has exactly 1 start and 1 exit cell
- [x] 2.2 [PBT] Property 2: Maze path guarantee — for any generated maze, at least 2 distinct paths exist from start to exit
- [x] 2.3 [PBT] Property 3: Maze dimensions and content scale with difficulty — grid size, gate count, collectible count match config
- [x] 2.4 [PBT] Property 4: Collectibles on non-critical paths — no collectible lies on any shortest path from start to exit
- [x] 2.5 [PBT] Property 5: Player movement validity — player moves iff target cell is walkable; walls and blocked gates block movement
- [x] 2.6 [PBT] Property 6: Gate answer determines outcome — correct answer opens gate, incorrect blocks it
- [x] 2.7 [PBT] Property 7: Equation generation respects difficulty constraints — operations and operand ranges match difficulty config
- [x] 2.8 [PBT] Property 8: No-path detection — hasPathToExit returns false when no unblocked path exists
- [x] 2.9 [PBT] Property 9: Score calculation formula — computed score matches the defined formula exactly
- [x] 2.10 [PBT] Property 10: Collectible pickup — collecting removes item and increments count by 1

## Task 3: React Components

- [x] 3.1 Create `apps/web/src/components/math-maze/MazeGrid.tsx` — renders the maze grid using CSS Grid with Tailwind. Cell types: wall (dark), path (light), gate (yellow lock icon / red if blocked), collectible (star), start (green), exit (flag). Player avatar highlighted. Responsive cell sizing based on viewport.
- [x] 3.2 Create `apps/web/src/components/math-maze/GatePrompt.tsx` — modal overlay showing equation, numeric input, submit button. Auto-focuses input. Shows correct/incorrect feedback for 2 seconds. Keyboard accessible with ARIA labels and visible focus indicators.

## Task 4: Game Pages

- [x] 4.1 Create `apps/web/src/pages/math-maze/MathMazeSetupPage.tsx` — three difficulty cards (Easy/Medium/Hard) with descriptions, Start button disabled until selection, navigates to `/math-maze/game?difficulty={level}`. Uses i18n keys under `mathMaze.*`.
- [x] 4.2 Create `apps/web/src/pages/math-maze/MathMazeGamePage.tsx` — orchestrates game state: calls `startGame({ themeId: 'MATH_MAZE', difficulty })`, generates maze, handles keyboard (arrow keys) and touch (swipe) input, manages timer countdown, gate prompt flow, collectible pickup, game-over detection (exit reached / time up / no path), calls `completeGame(...)`, shows ScoreBreakdownModal. Handles rate limit redirect.

## Task 5: Routing and Hub Integration

- [x] 5.1 Add `MATH_MAZE_SETUP` and `MATH_MAZE_GAME` routes to `apps/web/src/config/constants.ts`
- [x] 5.2 Add route entries and lazy imports to `apps/web/src/App.tsx` for MathMazeSetupPage and MathMazeGamePage
- [x] 5.3 Add `'math-maze': 'Science & Math'` to `GAME_FILTER_MAP` in `apps/web/src/pages/hub/GameHubPage.tsx`

## Task 6: Internationalization

- [x] 6.1 Add `mathMaze` key block to `apps/web/src/locales/en.json` with all setup, game, and feedback strings
- [x] 6.2 Add `mathMaze` key block to `apps/web/src/locales/es.json` with Spanish translations
- [x] 6.3 Add `mathMaze` key block to `apps/web/src/locales/pt.json` with Portuguese translations

## Task 7: Game Catalog Registration

- [x] 7.1 Create a DynamoDB seed script or document the `PutItem` command to register Math Maze in the game catalog table with gameId `math-maze`, title, description, icon `🧮`, route `/math-maze/setup`, status `ACTIVE`, displayOrder `16`, ageRange `6-14`, category `Science & Math`

## Task 8: Unit Tests (Example-Based)

- [x] 8.1 Write unit tests for MathMazeSetupPage: renders 3 difficulty options, Start button disabled initially, navigates with correct query param
- [x] 8.2 Write unit tests for GatePrompt: displays equation, auto-focuses input, shows feedback, keyboard accessible
- [x] 8.3 Write unit tests for timer display formatting and urgency color change at ≤30s
- [x] 8.4 Write unit tests for game completion flow: correct completion messages per reason (exit-reached, time-up, no-path)
