# Pattern Recall Game — Implementation Tasks

## Task 1: Core Utility Module (Pure Logic)

- [x] 1.1 Create `apps/web/src/utils/patternRecallUtils.ts` with types (`PatternRecallTheme`, `PatternRecallDifficulty`, `ThemeItem`, `ThemeConfig`, `DifficultyConfig`), theme data (`THEMES` record with colors, animals, musical-notes, emojis — 6 items each), difficulty data (`DIFFICULTIES` record with easy/medium/hard — item counts 4/5/6, playback speeds 800/600/400ms, API values 1/2/3), and pure functions: `getGridItems(theme, difficulty)`, `generateInitialSequence(itemCount)`, `extendSequence(sequence, itemCount)`, `validateTap(sequence, inputIndex, tappedIndex)`, `getPlaybackSpeed(difficulty)`, `getDifficultyValue(difficulty)`.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.2, 6.3_

## Task 2: Property-Based Tests for Core Utils

- [ ]* 2.1 [PBT] Property 1: Difficulty configuration maps to correct item count and playback speed — for any valid difficulty level (easy, medium, hard), `DIFFICULTIES` config returns the correct item count (4, 5, 6), playback speed (800ms, 600ms, 400ms), and API value (1, 2, 3).
  - **Property 1: Difficulty configuration maps to correct item count and playback speed**
  - **Validates: Requirements 3.1, 3.2, 3.3, 4.2, 4.3, 4.4**

- [ ]* 2.2 [PBT] Property 2: Theme data provides sufficient distinct items for all difficulties — for any theme in `THEMES`, the theme has at least 6 items and all item IDs within the theme are unique.
  - **Property 2: Theme data provides sufficient distinct items for all difficulties**
  - **Validates: Requirements 3.4, 3.5, 3.6, 3.7**

- [ ]* 2.3 [PBT] Property 3: Sequence extension preserves prefix and appends one valid item — for any existing sequence of length N and item count M (M >= 2), `extendSequence` produces a sequence of length N+1 where the first N elements are identical to the original and the last element is in range [0, M).
  - **Property 3: Sequence extension preserves prefix and appends one valid item**
  - **Validates: Requirements 5.1, 5.2**

- [ ]* 2.4 [PBT] Property 4: Tap validation correctness — for any sequence of length N and input position i (0 <= i < N), `validateTap` returns true iff the tapped index equals `sequence[i]`, and false otherwise.
  - **Property 4: Tap validation correctness**
  - **Validates: Requirements 6.2, 6.3**

- [ ]* 2.5 [PBT] Property 5: Grid items are sliced correctly for theme and difficulty — for any combination of theme and difficulty, `getGridItems(theme, difficulty)` returns exactly `DIFFICULTIES[difficulty].itemCount` items, and those items are the first N items from the theme's full item list.
  - **Property 5: Grid items are sliced correctly for theme and difficulty**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

- [ ]* 2.6 [PBT] Property 6: i18n key completeness across locales — for every i18n key referenced under the `patternRecall` namespace, that key exists in all three locale files (en, es, pt) with a non-empty string value.
  - **Property 6: i18n key completeness across locales**
  - **Validates: Requirements 10.2**

## Task 3: Checkpoint — Core Logic Verified

- [ ] 3. Ensure all tests pass, ask the user if questions arise.

## Task 4: Setup Page

- [x] 4.1 Create `apps/web/src/pages/pattern-recall/PatternRecallSetupPage.tsx` — display 4 theme cards (Colors 🎨, Animals 🐾, Musical Notes 🎵, Emojis 😀) and 3 difficulty cards (Easy, Medium, Hard) with descriptions. Start button disabled until both theme and difficulty are selected. On start, navigate to `ROUTES.PATTERN_RECALL_GAME + ?theme=${theme}&difficulty=${difficulty}`. All text uses `t()` from react-i18next with keys under `patternRecall.setup.*`.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

## Task 5: Game Page

- [x] 5.1 Create `apps/web/src/pages/pattern-recall/PatternRecallGamePage.tsx` — implement the full game state machine with phases: loading, playback, input, correct, game-over, submitting, completed. On mount: read theme/difficulty from URL params (redirect to setup if invalid), call `startGame({ themeId: 'PATTERN_RECALL', difficulty })`, handle rate limit redirect. Generate initial sequence, start timer, run playback animation (highlight items one at a time at difficulty-specific speed), enable input phase with tap validation, show correct/wrong feedback flashes, extend sequence on success, end game on wrong tap. Game-over overlay shows rounds completed and total time with "See Score" button. On score submit: call `completeGame(gameId, completionTime, attempts, correctAnswers, totalQuestions)`. Display `ScoreBreakdownModal` on completion. Item grid renders themed items as buttons with ARIA labels, keyboard navigation, responsive sizing (min 64px, max 120px), and adaptive layout (2×2 for 4 items, 3+2 for 5, 3×2 for 6).
  - _Requirements: 2.1, 2.2, 2.3, 3.8, 4.1, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 11.2, 12.1, 12.2, 12.3, 12.4_

## Task 6: Routing and Hub Integration

- [x] 6.1 Add `PATTERN_RECALL_SETUP` and `PATTERN_RECALL_GAME` routes to `apps/web/src/config/constants.ts`
  - _Requirements: 11.1, 11.4_

- [x] 6.2 Add route entries and lazy imports to `apps/web/src/App.tsx` for PatternRecallSetupPage and PatternRecallGamePage
  - _Requirements: 11.1_

- [x] 6.3 Add `'pattern-recall': 'Puzzles & Logic'` to `GAME_FILTER_MAP` in `apps/web/src/pages/hub/GameHubPage.tsx`
  - _Requirements: 9.2_

## Task 7: Internationalization

- [x] 7.1 Add `patternRecall` key block to `apps/web/src/locales/en.json` with all setup, game, theme, difficulty, item, and feedback strings
  - _Requirements: 10.1, 10.2_

- [x] 7.2 Add `patternRecall` key block to `apps/web/src/locales/es.json` with Spanish translations
  - _Requirements: 10.2_

- [x] 7.3 Add `patternRecall` key block to `apps/web/src/locales/pt.json` with Portuguese translations
  - _Requirements: 10.2_

## Task 8: Checkpoint — Frontend Complete

- [ ] 8. Ensure all tests pass, ask the user if questions arise.

## Task 9: Backend Integration

- [x] 9.1 Add `'PATTERN_RECALL'` to the themeId validation arrays in `services/game/src/services/game.service.ts` (attempts validation skip list and accuracy calculation list)
  - _Requirements: 13.1_

- [x] 9.2 Add `PATTERN_RECALL = 'PATTERN_RECALL'` to the `GameType` enum in `services/leaderboard/src/types/index.ts`
  - _Requirements: 13.2_

- [x] 9.3 Add `PATTERN_RECALL = 'PATTERN_RECALL'` to the frontend `GameType` enum in `apps/web/src/api/leaderboard.ts`
  - _Requirements: 13.2_

- [x] 9.4 Add Pattern Recall entry to the leaderboard `GameTypeFilter.tsx` dropdown: `{ value: GameType.PATTERN_RECALL, label: 'Pattern Recall', icon: '🧩' }`
  - _Requirements: 13.3_

- [x] 9.5 Add `PATTERN_RECALL` entry to `gameTypeInfo` in `apps/web/src/components/dashboard/RecentImprovements.tsx`: `{ icon: '🧩', name: 'Pattern Recall' }`
  - _Requirements: 13.4_

- [x] 9.6 Add `'PATTERN_RECALL'` to `ALL_GAMES` array and `PATTERN_RECALL: '🧩 Pattern Recall'` to `GAME_NAMES` map in `services/game/src/daily-email.ts`
  - _Requirements: 13.6_

## Task 10: Game Catalog and DynamoDB Registration

- [x] 10.1 Create a DynamoDB seed script or document the `PutItem` command to seed the `PATTERN_RECALL` entry in the themes table with status `PUBLISHED`, and register Pattern Recall in the game catalog with gameId `pattern-recall`, title `Pattern Recall`, icon `🧩`, route `/pattern-recall/setup`, status `ACTIVE`, category `Puzzles & Logic`
  - _Requirements: 9.1, 13.5_

## Task 11: Unit Tests (Example-Based)

- [ ]* 11.1 Write unit tests for PatternRecallSetupPage: renders 4 theme options and 3 difficulty options, Start button disabled until both selected, navigates with correct query params on start
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [ ]* 11.2 Write unit tests for PatternRecallGamePage: phase transitions (loading → playback → input → game-over → completed), API calls with correct params, ScoreBreakdownModal rendering, invalid URL param redirect
  - _Requirements: 2.1, 4.1, 4.7, 7.2, 7.3_

- [ ]* 11.3 Write unit tests for timer display formatting and game-over overlay content (rounds completed, total time)
  - _Requirements: 7.1, 7.4_

## Task 12: Final Checkpoint

- [ ] 12. Ensure all tests pass, ask the user if questions arise.
