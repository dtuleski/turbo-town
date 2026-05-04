# Implementation Plan: Space Coder Generic Conditions & Variables

## Overview

Replace hardcoded `IF_OBSTACLE` and `WHILE_NOT_GOAL` with generic `IF` and `WHILE` commands that accept a `Condition` expression (sensor or comparison), add variable commands (`VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC`), add `VariableEnvironment` to the execution engine, update serialization, UI (CommandPalette + CodeEditor condition picker), migrate existing hard levels, and add i18n keys. All changes are in `apps/web/`.

## Tasks

- [x] 1. Update type system and command definitions
  - [x] 1.1 Update types, CommandType union, Command interface, and add Condition types
    - In `apps/web/src/utils/scratchCodingUtils.ts`:
    - Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` from the `CommandType` union
    - Add `IF`, `WHILE`, `VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC` to `CommandType`
    - Add `SensorType` type: `'obstacle-ahead' | 'at-goal' | 'not-at-goal' | 'edge-ahead'`
    - Add `ComparisonOperator` type: `'<' | '>' | '='`
    - Add `Condition` discriminated union type (`SensorCondition | ComparisonCondition`)
    - Add `VariableEnvironment` interface: `{ 'var-num'?: number; 'var-char'?: string }`
    - Add `condition?: Condition` field to `Command` interface
    - Add `varValue?: number | string` field to `Command` interface
    - Add `'undefined-variable'` to `ExecutionStep.errorType`
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 1.2 Update COMMAND_DEFINITIONS and DIFFICULTY_CONFIG
    - Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` entries from `COMMAND_DEFINITIONS`
    - Add `IF` entry: `isControlStructure: true`, `hasBody: true`, `hasElseBody: true`, `textRepresentation: 'if(obstacle-ahead())'`, `minDifficulty: 'hard'`
    - Add `WHILE` entry: `isControlStructure: true`, `hasBody: true`, `hasElseBody: false`, `textRepresentation: 'while(not-at-goal())'`, `minDifficulty: 'hard'`
    - Add `VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC` entries (all `isControlStructure: false`, `minDifficulty: 'hard'`)
    - Update `DIFFICULTY_CONFIG.hard.availableCommands` to use `IF`, `WHILE`, and the 4 variable types instead of `IF_OBSTACLE`, `WHILE_NOT_GOAL`
    - _Requirements: 8.1, 8.2, 11.4_

  - [x] 1.3 Update `createCommand` for new command types
    - For `IF`: initialize `condition` to `{ type: 'sensor', sensor: 'obstacle-ahead' }`, `body: []`, `elseBody: []`
    - For `WHILE`: initialize `condition` to `{ type: 'sensor', sensor: 'not-at-goal' }`, `body: []`
    - For `VAR_NUM_DECL`: initialize `varValue: 0`
    - For `VAR_CHAR_DECL`: initialize `varValue: 'a'`
    - For `VAR_NUM_INC` and `VAR_NUM_DEC`: no special fields
    - Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` cases
    - _Requirements: 1.1, 2.1, 5.1, 6.1_

  - [x] 1.4 Update `deepCloneProgram` to clone `condition` and `varValue` fields
    - Clone the `condition` object (spread or structured clone) when present
    - Copy `varValue` when present
    - _Requirements: 11.2, 11.3_

- [x] 2. Implement condition helpers and update serialization
  - [x] 2.1 Add `conditionToText` and `textToCondition` helper functions
    - `conditionToText`: sensor → `obstacle-ahead()`, `at-goal()`, etc.; comparison → `var-num < 10`, `var-char = z`
    - `textToCondition`: parse sensor patterns (`obstacle-ahead()`, etc.) and comparison patterns (`var-num|var-char <|>|= value`)
    - Return `null` from `textToCondition` for unparseable strings
    - Export both functions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.9_

  - [x] 2.2 Update `programToText` for new command types
    - Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` cases
    - Add `IF` case: render `if(<conditionToText(condition)>)` + indented body + `else` + indented elseBody + `end-if`
    - Add `WHILE` case: render `while(<conditionToText(condition)>)` + indented body + `end-while`
    - Add `VAR_NUM_DECL` case: render `var-num = <varValue>`
    - Add `VAR_CHAR_DECL` case: render `var-char = '<varValue>'`
    - Add `VAR_NUM_INC` case: render `var-num++`
    - Add `VAR_NUM_DEC` case: render `var-num--`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 2.3 Update `textToProgram` for new command types
    - Remove `if(obstacle-ahead)` and `while(not-at-goal)` matchers
    - Add regex for `if(<condition>)` that extracts the condition string and calls `textToCondition`
    - Add regex for `while(<condition>)` that extracts the condition string and calls `textToCondition`
    - Add matchers for `var-num = <value>`, `var-char = '<value>'`, `var-num++`, `var-num--`
    - Keep `else`, `end-if`, `end-while` matchers as-is
    - _Requirements: 10.9, 10.10, 8.4_

  - [ ]* 2.4 Write property tests for serialization round-trip and line count invariant
    - Create `apps/web/src/utils/__tests__/scratchCodingGenericConditionsPBT.test.ts`
    - Build a `commandTreeArb` generator that produces random program trees with all 11 command types, random conditions (sensor or comparison), random varValues
    - **Property 1: Serialization round-trip** — `textToProgram(programToText(program))` produces structurally equivalent tree (ignoring IDs)
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10**
    - **Property 2: Line count invariant** — `countAllLines(program) === programToText(program).length`
    - **Validates: Requirements 11.5, 11.6, 11.7**

- [x] 3. Update line operations and tree operations
  - [x] 3.1 Update `countAllLines` for new command types
    - Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` cases
    - Add `IF` case: `1 + countAllLines(body) + 1 + countAllLines(elseBody) + 1`
    - Add `WHILE` case: `1 + countAllLines(body) + 1`
    - Variable commands (`VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC`) fall through to `default` (count 1)
    - _Requirements: 11.5, 11.6, 11.7_

  - [x] 3.2 Update `buildLineMapping` and `buildCommandIdToLineIndex` for new command types
    - Replace `IF_OBSTACLE` case with `IF` case (same structure: if-line + body + else-line + elseBody + end-if-line)
    - Replace `WHILE_NOT_GOAL` case with `WHILE` case (same structure: while-line + body + end-while-line)
    - Variable commands fall through to default handling
    - _Requirements: 11.5, 12.1_

  - [x] 3.3 Update `insertCommand` for new command types (if needed)
    - Verify `IF` with `isControlStructure: true`, `hasBody: true`, `hasElseBody: true` works correctly with existing insertion logic
    - Verify `WHILE` with `isControlStructure: true`, `hasBody: true` works correctly
    - Verify simple variable commands insert correctly
    - Fix any issues found
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 3.4 Update `removeAtLine` for new command types
    - Replace `IF_OBSTACLE` references with `IF` in line-type detection
    - Replace `WHILE_NOT_GOAL` references with `WHILE` in line-type detection
    - Ensure clicking opening/else/closing line of IF or WHILE removes entire structure
    - _Requirements: 12.4, 12.5_

  - [ ]* 3.5 Write property tests for insertion line count deltas
    - **Property 11: Simple command insertion increases line count by 1** — Insert `VAR_NUM_DECL`/`VAR_CHAR_DECL`/`VAR_NUM_INC`/`VAR_NUM_DEC` at valid cursor, assert `countAllLines` delta is 1
    - **Validates: Requirements 12.1**
    - **Property 12: IF insertion increases line count by 3** — Insert `IF`, assert delta is 3 and cursor `parentId` equals new command ID with `branch === 'body'`
    - **Validates: Requirements 12.2**
    - **Property 13: WHILE insertion increases line count by 2** — Insert `WHILE`, assert delta is 2 and cursor `parentId` equals new command ID with `branch === 'body'`
    - **Validates: Requirements 12.3**

- [x] 4. Checkpoint — Verify type system, serialization, and tree operations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement execution engine changes
  - [x] 5.1 Add `evaluateCondition` helper function
    - Implement sensor evaluation: `obstacle-ahead` (wall/obstacle/OOB ahead), `at-goal` (pos === goal), `not-at-goal` (pos !== goal), `edge-ahead` (next cell OOB)
    - Implement comparison evaluation: read variable from `VariableEnvironment`, compare with `<`, `>`, `=` (numeric for var-num, charCode for var-char)
    - Return `{ result: boolean, error?: string }` — error when variable is undefined
    - Export the function
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 5.2 Update `executeProgramV2` with generic IF, WHILE, and variable commands
    - Add `VariableEnvironment` to execution state, initialized as `{}`
    - Remove `IF_OBSTACLE` case; add `IF` case that calls `evaluateCondition(cmd.condition, state, level, env)` and branches accordingly
    - Remove `WHILE_NOT_GOAL` case; add `WHILE` case that calls `evaluateCondition` each iteration
    - Add `VAR_NUM_DECL` case: set `env['var-num'] = cmd.varValue`
    - Add `VAR_CHAR_DECL` case: set `env['var-char'] = cmd.varValue`
    - Add `VAR_NUM_INC` case: check `env['var-num']` defined, increment by 1, produce step
    - Add `VAR_NUM_DEC` case: check `env['var-num']` defined, decrement by 1, produce step
    - Handle `undefined-variable` errors: stop execution with `errorType: 'undefined-variable'`
    - Existing `MAX_STEPS = 500` safeguard applies to generic WHILE
    - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 2.6, 5.4, 5.5, 6.4, 6.5, 7.3, 7.4, 7.5, 13.1, 13.2, 13.3_

  - [ ]* 5.3 Write property tests for condition evaluation
    - **Property 3: Sensor condition evaluation correctness** — For random sensor types, character states, and levels, `evaluateCondition` matches direct game-state check
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - **Property 4: Comparison condition evaluation correctness** — For random variable types, operators, current values, and target values, `evaluateCondition` matches native JS comparison
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

  - [ ]* 5.4 Write property tests for backward compatibility
    - **Property 5: Sensor-based IF matches old IF_OBSTACLE behavior** — Generic IF with `obstacle-ahead` sensor selects same branch as old IF_OBSTACLE logic
    - **Validates: Requirements 8.3**
    - **Property 6: Sensor-based WHILE matches old WHILE_NOT_GOAL behavior** — Generic WHILE with `not-at-goal` sensor produces same step sequence as old WHILE_NOT_GOAL
    - **Validates: Requirements 8.3**

  - [ ]* 5.5 Write property tests for variable execution
    - **Property 7: Counting loop produces correct iteration count** — `var-num = start; while(var-num < target) { forward(); var-num++ }` on straight-line level produces exactly `(target - start)` forward steps
    - **Validates: Requirements 2.3, 7.3, 5.4**
    - **Property 8: Undefined variable produces error** — Programs using inc/dec/comparison without prior declaration produce `errorType: 'undefined-variable'`
    - **Validates: Requirements 1.5, 2.6, 7.5, 13.1, 13.2, 13.3**
    - **Property 9: Increment and decrement arithmetic** — `var-num = n` followed by `k` increments and `j` decrements yields `n + k - j`
    - **Validates: Requirements 7.3, 7.4, 5.4**
    - **Property 10: Last declaration wins** — Multiple declarations for same variable, final value matches last declaration
    - **Validates: Requirements 5.5, 6.5**

- [x] 6. Checkpoint — Verify execution engine
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update UI components
  - [x] 7.1 Update CommandPalette for new commands
    - In `ScratchCodingGamePage.tsx` (or extracted CommandPalette component):
    - Remove `if(obstacle-ahead)` and `while(not-at-goal)` buttons
    - Add `if(...)` button that inserts a generic IF with default condition `obstacle-ahead()`
    - Add `while(...)` button that inserts a generic WHILE with default condition `not-at-goal()`
    - Add a "Variables" section (visible only when `difficulty === 'hard'`) with buttons: `var-num`, `var-char`, `var-num++`, `var-num--`
    - All new buttons only rendered when `difficulty === 'hard'`
    - Disable all buttons during execution
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 1.1, 2.1, 5.1, 6.1, 7.1, 7.2_

  - [x] 7.2 Add inline condition editor to CodeEditor
    - For `IF` and `WHILE` lines, render an inline condition editor next to the command keyword
    - Implement sensor mode: dropdown with `obstacle-ahead()`, `at-goal()`, `not-at-goal()`, `edge-ahead()`
    - Implement comparison mode: variable dropdown (`var-num` | `var-char`), operator dropdown (`<` | `>` | `=`), value input (numeric spinner [-99, 99] for var-num, single-char dropdown a–z for var-char)
    - Add toggle/tab to switch between sensor and comparison modes
    - When switching to sensor mode, reset condition to `obstacle-ahead()`
    - When switching variable type in comparison mode, reset value to default (0 or 'a')
    - Update the command's `condition` field when the user changes the condition
    - _Requirements: 1.2, 2.2, 3.5, 4.1, 4.8_

  - [x] 7.3 Add inline editors for variable declaration commands
    - `VAR_NUM_DECL` lines: show inline numeric spinner for initial value, clamped [-99, 99], default 0
    - `VAR_CHAR_DECL` lines: show inline single-character dropdown (a–z), default 'a'
    - `VAR_NUM_INC` and `VAR_NUM_DEC`: render as plain text (`var-num++`, `var-num--`)
    - Update the command's `varValue` field when the user changes the value
    - _Requirements: 5.2, 5.3, 6.2, 6.3_

  - [x] 7.4 Display undefined-variable error messages in the game UI
    - When `executeProgramV2` returns a step with `errorType: 'undefined-variable'`, display the localized error message in the same error toast/banner used for collision and infinite-loop errors
    - Use i18n keys `spaceCoder.errors.undefinedVarNum` and `spaceCoder.errors.undefinedVarChar`
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 8. Migrate existing hard levels and update level data
  - [x] 8.1 Migrate hard-level definitions from IF_OBSTACLE/WHILE_NOT_GOAL to IF/WHILE
    - In `getLevel` function or level data: replace any `IF_OBSTACLE` references with `IF` + `{ type: 'sensor', sensor: 'obstacle-ahead' }` condition
    - Replace any `WHILE_NOT_GOAL` references with `WHILE` + `{ type: 'sensor', sensor: 'not-at-goal' }` condition
    - Update `DIFFICULTY_CONFIG.hard.availableCommands` (already done in 1.2, verify here)
    - Ensure at least 1 hard level is designed so the optimal solution uses a counting loop pattern (`var-num` + `while(var-num < N)`)
    - _Requirements: 8.3, 14.1, 14.2, 14.3, 14.4_

- [x] 9. Add i18n keys for all three locales
  - [x] 9.1 Add new i18n keys to `en.json`, `es.json`, and `pt.json`
    - Add `spaceCoder.commands.if`, `spaceCoder.commands.while`, `spaceCoder.commands.varNumDecl`, `spaceCoder.commands.varCharDecl`, `spaceCoder.commands.varNumInc`, `spaceCoder.commands.varNumDec`
    - Add `spaceCoder.conditions.sensorMode`, `spaceCoder.conditions.comparisonMode`, `spaceCoder.conditions.obstacleAhead`, `spaceCoder.conditions.atGoal`, `spaceCoder.conditions.notAtGoal`, `spaceCoder.conditions.edgeAhead`
    - Add `spaceCoder.variables.sectionTitle`, `spaceCoder.variables.numLabel`, `spaceCoder.variables.charLabel`
    - Add `spaceCoder.errors.undefinedVarNum`, `spaceCoder.errors.undefinedVarChar`
    - Remove old `spaceCoder.commands.ifObstacle` and `spaceCoder.commands.whileNotGoal` keys
    - Translate labels and error messages for ES and PT; command syntax stays in English
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 10. Update existing tests for migration
  - [x] 10.1 Update existing PBT tests in `scratchCodingTreePBT.test.ts`
    - The existing PBT tests use the legacy Block-based API (`IF_WALL_AHEAD`, `IF_ON_GOAL`, `REPEAT`), which is separate from the Command-based API
    - If any tests reference `IF_OBSTACLE` or `WHILE_NOT_GOAL` command types, update them to use `IF` and `WHILE` with appropriate conditions
    - Verify all existing property tests still pass
    - _Requirements: 8.3_

  - [x] 10.2 Update existing nesting UI tests in `scratchCodingNestingUI.test.ts`
    - Replace any `IF_OBSTACLE` or `WHILE_NOT_GOAL` references with `IF` and `WHILE`
    - Verify all existing tests still pass
    - _Requirements: 8.3_

  - [ ]* 10.3 Write unit tests for new functionality
    - Create `apps/web/src/utils/__tests__/scratchCodingGenericConditions.test.ts`
    - Test `createCommand('IF')`, `createCommand('WHILE')`, `createCommand('VAR_NUM_DECL')`, `createCommand('VAR_CHAR_DECL')`
    - Test `getCommandsForDifficulty('hard')` includes new types, excludes old types
    - Test `conditionToText` and `textToCondition` for all sensor and comparison variants
    - Test specific `programToText` output for IF/WHILE with sensor and comparison conditions
    - Test specific `textToProgram` parsing for each condition format
    - Test `evaluateCondition` matches old IF_OBSTACLE/WHILE_NOT_GOAL behavior
    - Test infinite loop safeguard triggers for non-terminating generic while
    - Test undefined-variable error cases
    - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.4, 5.5, 6.4, 6.5, 7.3, 7.4, 7.5, 8.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 13.1, 13.2, 13.3_

- [x] 11. Final checkpoint — Full verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (13 properties total)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all code examples and implementations use TypeScript
- All changes are frontend-only within `apps/web/`
