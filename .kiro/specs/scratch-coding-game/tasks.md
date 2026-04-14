# Implementation Plan: Scratch Coding Game

## Overview

Implement a Scratch-style visual programming game for DashDen. The game is entirely frontend-driven (React + TypeScript), using `@dnd-kit/core` for drag-and-drop, with all game logic in `scratchCodingUtils.ts`. Integrates with the existing Game Service backend via `startGame`/`completeGame` mutations. The implementation follows the established DashDen game pattern: SetupPage → GamePage → ScoreBreakdownModal → Hub.

## Tasks

- [x] 1. Install dependencies and set up project structure
  - [x] 1.1 Install `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` in `apps/web/`
    - Run `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` from `apps/web/`
    - _Requirements: 3.1, 9.2_

  - [x] 1.2 Create the `apps/web/src/pages/scratch-coding/` directory
    - Create empty placeholder files for `ScratchCodingSetupPage.tsx` and `ScratchCodingGamePage.tsx`
    - _Requirements: 10.1_

- [x] 2. Implement utility module (`scratchCodingUtils.ts`)
  - [x] 2.1 Create block type definitions, categories, and difficulty config
    - Create `apps/web/src/utils/scratchCodingUtils.ts`
    - Define `BlockCategory`, `BlockType`, `BlockDefinition`, `Block`, `Difficulty`, `DifficultyConfig` types
    - Define `BLOCK_DEFINITIONS` array with all 7 block types, their categories, colors, parameter ranges, and `minDifficulty`
    - Define `DIFFICULTY_CONFIG` map with label, emoji, description, levelCount (5), gridSize, and availableCategories per difficulty
    - Export `getBlocksForDifficulty(difficulty)` helper that filters blocks by `minDifficulty` rank
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Create level data structures and all 15 levels
    - Define `CellType`, `Direction`, `Position`, `Level` types
    - Define `DIR_DELTA`, `TURN_LEFT_MAP`, `TURN_RIGHT_MAP` direction lookup tables
    - Define `inBounds(pos, level)` helper
    - Create 5 Easy levels (6×6 grid, Motion + Events blocks)
    - Create 5 Medium levels (7×7 grid, adds REPEAT)
    - Create 5 Hard levels (8×8 grid, adds IF_WALL_AHEAD, IF_ON_GOAL)
    - Export `getLevel(difficulty, levelNumber)` and `getTotalLevels(difficulty)`
    - _Requirements: 5.1_

  - [x] 2.3 Implement the execution engine
    - Define `CharacterState`, `ExecutionStep` types
    - Implement `executeProgram(level, program): ExecutionStep[]` — recursive AST interpreter
    - Handle all block types: ON_START, MOVE_FORWARD (with parameter), TURN_LEFT, TURN_RIGHT, REPEAT (with body), IF_WALL_AHEAD (with body/elseBody), IF_ON_GOAL (with body)
    - Implement step limit safety (max 500 steps) to prevent infinite loops
    - Each step must include `blockId`, `pos`, `dir`, `alive`, `reachedGoal`, `hitWall`, `outOfBounds`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.4 Implement program manipulation helpers
    - Export `insertBlock(program, block, index, maxBlocks)` — returns new program or null if at capacity
    - Export `removeBlock(program, index)` — returns new program with block removed, preserving order
    - Export `createBlock(type)` — creates a Block instance with unique ID and default parameter
    - _Requirements: 3.1, 3.3, 3.5_

  - [ ]* 2.5 Write property tests for block visibility (Property 1)
    - **Property 1: Block visibility is determined by difficulty threshold**
    - Using `fast-check`, for any block definition and any difficulty, verify `getBlocksForDifficulty` returns the block iff its `minDifficulty` rank ≤ current difficulty rank
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ]* 2.6 Write property tests for program manipulation (Properties 2 & 3)
    - **Property 2: Program insertion respects position and capacity**
    - For any program of length L < maxBlocks and valid index i, inserting produces length L+1 with block at position i; at capacity, insertion is rejected
    - **Property 3: Block removal preserves remaining program order**
    - For any non-empty program and valid index i, removing produces length L-1 with relative order preserved
    - **Validates: Requirements 3.1, 3.3, 3.5**

  - [ ]* 2.7 Write property tests for execution engine (Properties 4 & 5)
    - **Property 4: Execution engine produces valid step sequences with correct block references**
    - For any valid level and program, each step's position is within bounds (or collision point), each `blockId` references an existing block, consecutive steps are valid movements/rotations
    - **Property 5: Execution terminates correctly based on outcome**
    - Execution result satisfies exactly one terminal condition: (a) reachedGoal, (b) alive=false, or (c) program completed without reaching goal. No steps after terminal.
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ]* 2.8 Write unit tests for execution engine edge cases
    - Test empty program returns empty steps
    - Test MOVE_FORWARD into wall sets `alive=false`, `hitWall=true`
    - Test MOVE_FORWARD off-grid sets `alive=false`, `outOfBounds=true`
    - Test REPEAT with body executes correct number of iterations
    - Test IF_WALL_AHEAD branches correctly (then vs else)
    - Test step limit (500) stops execution for large repeat values
    - Test reaching goal stops execution immediately
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [x] 3. Checkpoint — Verify utility module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement page components
  - [x] 4.1 Implement `ScratchCodingSetupPage`
    - Create `apps/web/src/pages/scratch-coding/ScratchCodingSetupPage.tsx`
    - Display three difficulty cards (Easy/Medium/Hard) with emoji, label, description, and features from `DIFFICULTY_CONFIG`
    - Display how-to-play instructions section
    - Start button navigates to `/scratch-coding/game?difficulty=<selected>`
    - Use `useTranslation()` for all text via `scratchCoding.*` i18n keys
    - Follow the same visual pattern as `CodeABotSetupPage`
    - _Requirements: 1.1, 1.4, 10.1_

  - [x] 4.2 Implement `ScratchCodingGamePage` — core game orchestration
    - Create `apps/web/src/pages/scratch-coding/ScratchCodingGamePage.tsx`
    - Read `difficulty` from `useSearchParams`
    - On mount: call `startGame({ themeId: 'SCRATCH_CODING', difficulty: 1|2|3 })`, handle rate limit redirect to `ROUTES.RATE_LIMIT`
    - Manage state: `gameId`, `currentLevel`, `phase` (building|running|success|fail|submitting|completed), `program` (Block[]), `timer`, `levelsCompleted`, `totalAttempts`, `scoreBreakdown`, `leaderboardRank`
    - Running timer visible to player (start on mount, stop on game end)
    - Render header with back button, timer, level counter, difficulty label
    - Render `BlockPalette`, `BlockEditor`, `GameStage` sub-components
    - Run button: pass program to `executeProgram()`, animate steps on GameStage, highlight current block in BlockEditor
    - Disable Run button and BlockEditor during execution (phase !== 'building')
    - Level complete overlay: show blocks used, optimal indicator, "Next Level" or "See Score" button
    - Fail overlay: show error message, "Try Again" and "End Game" buttons
    - On game end: call `completeGame({ gameId, completionTime, attempts, correctAnswers, totalQuestions })`, show `ScoreBreakdownModal`
    - _Requirements: 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 10.2, 10.3_

- [x] 5. Implement game sub-components
  - [x] 5.1 Implement `BlockPalette` component
    - Create as a component within the scratch-coding page directory or as part of `ScratchCodingGamePage`
    - Display blocks organized by category (Motion=blue, Control=orange, Events=yellow)
    - Filter blocks by difficulty using `getBlocksForDifficulty()`
    - Each block is a `@dnd-kit` draggable source
    - Disable palette items when `maxBlocks` reached or during execution
    - Support both mouse and touch drag interactions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 3.6, 9.2_

  - [x] 5.2 Implement `BlockEditor` component
    - Droppable workspace using `@dnd-kit/core` and `@dnd-kit/sortable`
    - Accept drops from BlockPalette, insert at drop position via `insertBlock()`
    - Show snap indicators when dragging near existing blocks
    - Click-to-remove blocks via `removeBlock()`
    - Editable numeric input fields on parameterized blocks (MOVE_FORWARD steps, REPEAT count) with min/max validation
    - Display block count vs max (`{{used}}/{{max}} blocks`)
    - Support nested droppable zones for REPEAT body and IF_WALL_AHEAD body/elseBody
    - Highlight currently executing block via `highlightedBlockId` prop
    - Disable editing when `disabled=true` (during execution)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.2, 4.6, 9.2_

  - [x] 5.3 Implement `GameStage` component
    - Render the grid based on `level.grid` (empty, wall, goal cells)
    - Render character at `characterPos` with direction indicator
    - Scale grid proportionally to fit viewport without horizontal scrolling
    - Animate character movement between positions during execution
    - Responsive layout adapting from 768px to 1440px
    - _Requirements: 4.1, 9.1, 9.4_

  - [ ]* 5.4 Write unit tests for sub-components
    - Test BlockPalette renders correct categories per difficulty
    - Test BlockEditor handles drop, remove, and numeric input
    - Test GameStage renders grid and character correctly
    - _Requirements: 2.1, 3.1, 3.3, 4.1_

- [x] 6. Checkpoint — Verify components render and interact correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add i18n translations
  - [x] 7.1 Add English translations
    - Add `scratchCoding` namespace to `apps/web/src/locales/en.json`
    - Include all keys: title, subtitle, howToPlay, chooseDifficulty, startCoding, blocks.*, categories.*, game.*, difficulty.*
    - _Requirements: 8.1, 8.2_

  - [x] 7.2 Add Spanish translations
    - Add `scratchCoding` namespace to `apps/web/src/locales/es.json` with complete Spanish translations
    - _Requirements: 8.2_

  - [x] 7.3 Add Portuguese translations
    - Add `scratchCoding` namespace to `apps/web/src/locales/pt.json` with complete Portuguese translations
    - _Requirements: 8.2_

  - [ ]* 7.4 Write property test for translation completeness (Property 6)
    - **Property 6: Translation completeness across locales**
    - For any key in the `scratchCoding` i18n namespace, all three locale files (en, es, pt) contain a non-empty string value
    - **Validates: Requirements 8.2**

- [x] 8. Add routing and Game Hub integration
  - [x] 8.1 Register routes in constants and App.tsx
    - Add `SCRATCH_CODING_SETUP: '/scratch-coding/setup'` and `SCRATCH_CODING_GAME: '/scratch-coding/game'` to `apps/web/src/config/constants.ts` ROUTES
    - Add imports for `ScratchCodingSetupPage` and `ScratchCodingGamePage` in `apps/web/src/App.tsx`
    - Add `<Route>` entries inside the protected routes section
    - _Requirements: 10.1_

  - [x] 8.2 Add Game Hub filter mapping
    - Add `'scratch-coding': 'Puzzles & Logic'` to `GAME_FILTER_MAP` in `apps/web/src/pages/hub/GameHubPage.tsx`
    - _Requirements: 7.2_

- [x] 9. Seed game catalog entry in DynamoDB
  - [x] 9.1 Create seed script and run against prod
    - Create `scripts/seed-scratch-coding-catalog.sh` following the pattern in `seed-game-catalog.sh`
    - Use `--profile dashden-new` for the production account (table: `memory-game-catalog-dev`, region: `us-east-1`)
    - Seed item: `gameId=scratch-coding`, `title=Scratch Coding`, `description=Learn programming with visual code blocks! Drag and snap blocks to guide your character through puzzles.`, `icon=🧩`, `route=/scratch-coding/setup`, `status=ACTIVE`, `displayOrder=16`, `ageRange=6-14`, `category=PUZZLES_LOGIC`
    - _Requirements: 7.1_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The design uses TypeScript throughout — all code in `apps/web/`
- Property tests use `fast-check` with Vitest
- The game catalog DynamoDB seed uses `--profile dashden-new` per deployment rules
- No backend code changes needed — only the existing `startGame`/`completeGame` mutations are used
