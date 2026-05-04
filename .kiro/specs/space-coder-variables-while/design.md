# Design Document: Space Coder Generic Conditions & Variables

## Overview

This design replaces the hardcoded `IF_OBSTACLE` and `WHILE_NOT_GOAL` command types with **generic `IF` and `WHILE` commands** that accept a **condition expression**, and adds **variables** (`var-num`, `var-char`) with increment/decrement operations. The condition expression is a union type with two variants:

- **Sensor condition**: `{ type: 'sensor', sensor: 'obstacle-ahead' | 'at-goal' | 'not-at-goal' }` — checks the game world
- **Comparison condition**: `{ type: 'comparison', variable: 'var-num' | 'var-char', operator: '<' | '>' | '=', value: number | string }` — compares a variable to a literal

The old `IF_OBSTACLE` becomes `IF` with condition `{ type: 'sensor', sensor: 'obstacle-ahead' }`. The old `WHILE_NOT_GOAL` becomes `WHILE` with condition `{ type: 'sensor', sensor: 'not-at-goal' }`. New capabilities include `if(at-goal())`, `while(var-num < 10)`, etc.

The design is entirely frontend, modifying `scratchCodingUtils.ts` (types, command definitions, execution engine, serialization) and the game page component (command palette, code editor with condition picker). All new commands are gated to hard difficulty.

### Design Rationale

Replacing hardcoded conditionals with a generic condition system is cleaner and more extensible. Instead of adding a new `CommandType` for every condition (e.g., `IF_AT_GOAL`, `WHILE_VAR_NUM_LT`), we have two command types (`IF`, `WHILE`) that each carry a `Condition` field. This reduces the type system surface area, simplifies the execution engine (one `IF` case instead of multiple), and makes the UI more uniform (one condition picker component shared by both `if` and `while`). Variables and their operations (`var-num++`, `var-num--`) remain separate simple command types since they don't involve conditions.

## Architecture

The feature touches three layers of the existing architecture:

```
UI Layer
  CommandPalette ──insert command──> CodeEditor
                                       │
Data Layer                             │
  CodeEditor ──program: Command[]──> scratchCodingUtils.ts
                                       ├── programToText / textToProgram (Serialization)
                                       ├── countAllLines / buildLineMapping (Line Operations)
                                       └── insertCommand / removeAtLine (Tree Operations)
                                       │
Execution Layer                        │
  scratchCodingUtils.ts ──executeProgramV2──> Execution Engine
                                                ├── evaluateCondition() helper
                                                ├── reads/writes VariableEnvironment
                                                └── produces ExecutionStep[]
```

### Change Summary by Layer

1. **Type System** — Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` from `CommandType`. Add `IF`, `WHILE`, `VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC`. Add `Condition` union type (`SensorCondition | ComparisonCondition`). Add `condition` field to `Command`. Add `VariableEnvironment` type.

2. **Command Definitions** — Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` entries. Add `IF`, `WHILE`, and 4 variable command entries. Update `DIFFICULTY_CONFIG.hard.availableCommands`.

3. **Serialization** — Rewrite `IF_OBSTACLE` / `WHILE_NOT_GOAL` cases in `programToText` as generic `IF` / `WHILE` with condition rendering. Rewrite `textToProgram` matchers to parse `if(<condition>)` and `while(<condition>)` with both sensor and comparison variants.

4. **Line Operations** — Replace `IF_OBSTACLE` case with `IF` case (same structure: if + body + else + elseBody + end-if). Replace `WHILE_NOT_GOAL` case with `WHILE` case (same structure: while + body + end-while). Simple variable commands fall through to `default`.

5. **Execution Engine** — Replace `IF_OBSTACLE` case with generic `IF` case that calls `evaluateCondition()`. Replace `WHILE_NOT_GOAL` case with generic `WHILE` case that calls `evaluateCondition()`. Add `evaluateCondition()` helper that dispatches on condition type (sensor vs comparison). Add `VariableEnvironment` to execution state. Add 4 variable command cases.

6. **UI** — Replace `if(obstacle-ahead)` and `while(not-at-goal)` palette buttons with `if(...)` and `while(...)`. Add condition picker/editor component. Add variable command buttons in a "Variables" section. Add i18n keys.

## Components and Interfaces

### New Types

```typescript
// Sensor functions that check game world state
export type SensorType = 'obstacle-ahead' | 'at-goal' | 'not-at-goal' | 'edge-ahead';

// Condition expression — union of sensor and comparison
export type Condition =
  | { type: 'sensor'; sensor: SensorType }
  | { type: 'comparison'; variable: 'var-num' | 'var-char'; operator: ComparisonOperator; value: number | string };

// Comparison operators for variable conditions
export type ComparisonOperator = '<' | '>' | '=';

// Runtime variable storage during execution
export interface VariableEnvironment {
  'var-num'?: number;
  'var-char'?: string;
}
```

### Updated CommandType Union

```typescript
export type CommandType =
  | 'FORWARD'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'JUMP'
  | 'LOOP'
  // Generic conditionals (replace IF_OBSTACLE and WHILE_NOT_GOAL)
  | 'IF'
  | 'WHILE'
  // Variable commands
  | 'VAR_NUM_DECL'
  | 'VAR_CHAR_DECL'
  | 'VAR_NUM_INC'
  | 'VAR_NUM_DEC';
```

### Updated Command Interface

```typescript
export interface Command {
  id: string;
  type: CommandType;
  parameter?: number;
  body?: Command[];
  elseBody?: Command[];
  // Generic condition for IF and WHILE commands
  condition?: Condition;
  // Initial value for variable declarations
  varValue?: number | string;  // number for VAR_NUM_DECL, string for VAR_CHAR_DECL
}
```

### Updated ExecutionStep

```typescript
export interface ExecutionStep {
  // ... existing fields ...
  errorType?: 'collision' | 'no-obstacle-to-jump' | 'infinite-loop'
            | 'jump-landing-blocked' | 'undefined-variable';
}
```

### Updated Command Definitions

The `IF_OBSTACLE` and `WHILE_NOT_GOAL` entries are removed. New entries:

| Type | textRepresentation | isControlStructure | hasBody | hasElseBody | minDifficulty |
|------|-------------------|--------------------|---------|-------------|---------------|
| `IF` | `if(obstacle-ahead())` | true | true | true | hard |
| `WHILE` | `while(not-at-goal())` | true | true | false | hard |
| `VAR_NUM_DECL` | `var-num = 0` | false | false | false | hard |
| `VAR_CHAR_DECL` | `var-char = 'a'` | false | false | false | hard |
| `VAR_NUM_INC` | `var-num++` | false | false | false | hard |
| `VAR_NUM_DEC` | `var-num--` | false | false | false | hard |

The `textRepresentation` for `IF` and `WHILE` shows the default condition. The actual rendered text depends on the command's `condition` field.

### Updated DIFFICULTY_CONFIG

```typescript
hard: {
  label: 'Hard', emoji: '🔴', description: '12×12 grid · conditions & variables',
  levelCount: 5, gridSize: 12,
  availableCategories: ['motion', 'events', 'control'],
  availableCommands: [
    'FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'JUMP', 'LOOP',
    'IF', 'WHILE',
    'VAR_NUM_DECL', 'VAR_CHAR_DECL', 'VAR_NUM_INC', 'VAR_NUM_DEC',
  ],
},
```

### Key Functions Modified

| Function | Change |
|----------|--------|
| `createCommand` | For `IF`: initialize `condition` to `{ type: 'sensor', sensor: 'obstacle-ahead' }`, `body: []`, `elseBody: []`. For `WHILE`: initialize `condition` to `{ type: 'sensor', sensor: 'not-at-goal' }`, `body: []`. For `VAR_NUM_DECL`: initialize `varValue: 0`. For `VAR_CHAR_DECL`: initialize `varValue: 'a'`. |
| `programToText` | Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` cases. Add `IF` case: render `if(<conditionText>)` + body + `else` + elseBody + `end-if`. Add `WHILE` case: render `while(<conditionText>)` + body + `end-while`. Add `VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC` cases. |
| `textToProgram` | Remove `if(obstacle-ahead)` and `while(not-at-goal)` matchers. Add regex for `if(<condition>)` and `while(<condition>)` that parse both sensor and comparison conditions. Add matchers for variable commands. |
| `conditionToText` | New helper: converts a `Condition` to its text form. Sensor: `obstacle-ahead()`, `at-goal()`, `not-at-goal()`. Comparison with var-num: `var-num < 10`. Comparison with var-char: `var-char < z`. |
| `textToCondition` | New helper: parses a condition string back to a `Condition` object. Matches sensor patterns `obstacle-ahead()`, `at-goal()`, `not-at-goal()` and comparison patterns `var-num|var-char <|>|= value`. |
| `countAllLines` | Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` cases. Add `IF` case: `1 + body + 1 + elseBody + 1`. Add `WHILE` case: `1 + body + 1`. Variable commands fall through to `default` (count 1). |
| `buildLineMapping` | Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` cases. Add `IF` case (same structure as old IF_OBSTACLE). Add `WHILE` case (same structure as old WHILE_NOT_GOAL). |
| `buildCommandIdToLineIndex` | Same changes as `buildLineMapping` — replace `IF_OBSTACLE`/`WHILE_NOT_GOAL` with `IF`/`WHILE`. |
| `executeProgramV2` | Remove `IF_OBSTACLE` and `WHILE_NOT_GOAL` cases. Add `IF` case that calls `evaluateCondition()`. Add `WHILE` case that calls `evaluateCondition()`. Add `VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC` cases. Add `VariableEnvironment`. |
| `deepCloneProgram` | Clone `condition` and `varValue` fields. |
| `insertCommand` | No structural change — `IF` has `isControlStructure: true`, `hasBody: true`, `hasElseBody: true`; `WHILE` has `isControlStructure: true`, `hasBody: true`. Existing logic handles cursor positioning. |
| `removeAtLine` | No structural change — `IF` and `WHILE` map to opening/closing/else line types, so existing removal logic handles them. |


### evaluateCondition Helper

```typescript
function evaluateCondition(
  condition: Condition,
  state: CharacterState,
  level: Level,
  env: VariableEnvironment,
): { result: boolean; error?: string } {
  if (condition.type === 'sensor') {
    switch (condition.sensor) {
      case 'obstacle-ahead': {
        const delta = DIR_DELTA[state.dir];
        const ahead: Position = {
          row: state.pos.row + delta.row,
          col: state.pos.col + delta.col,
        };
        const blocked =
          !inBounds(ahead, level) ||
          level.grid[ahead.row][ahead.col] === 'wall' ||
          level.grid[ahead.row][ahead.col] === 'obstacle';
        return { result: blocked };
      }
      case 'at-goal':
        return {
          result: state.pos.row === level.goal.row && state.pos.col === level.goal.col,
        };
      case 'not-at-goal':
        return {
          result: !(state.pos.row === level.goal.row && state.pos.col === level.goal.col),
        };
      case 'edge-ahead': {
        const delta = DIR_DELTA[state.dir];
        const ahead: Position = {
          row: state.pos.row + delta.row,
          col: state.pos.col + delta.col,
        };
        return { result: !inBounds(ahead, level) };
      }
    }
  }

  // Comparison condition
  const { variable, operator, value } = condition;
  const currentValue = env[variable];

  if (currentValue === undefined) {
    return { result: false, error: `undefined-variable:${variable}` };
  }

  if (variable === 'var-num') {
    const numVal = currentValue as number;
    const compareVal = value as number;
    switch (operator) {
      case '<': return { result: numVal < compareVal };
      case '>': return { result: numVal > compareVal };
      case '=': return { result: numVal === compareVal };
    }
  } else {
    // var-char: compare character codes
    const charCode = (currentValue as string).charCodeAt(0);
    const compareCode = (value as string).charCodeAt(0);
    switch (operator) {
      case '<': return { result: charCode < compareCode };
      case '>': return { result: charCode > compareCode };
      case '=': return { result: charCode === compareCode };
    }
  }
}
```

### conditionToText Helper

```typescript
function conditionToText(condition: Condition): string {
  if (condition.type === 'sensor') {
    return `${condition.sensor}()`;
  }
  // Comparison: var-num < 10, var-char < z
  const val = condition.variable === 'var-char'
    ? condition.value as string
    : String(condition.value);
  return `${condition.variable} ${condition.operator} ${val}`;
}
```

### textToCondition Helper

```typescript
function textToCondition(text: string): Condition | null {
  // Sensor patterns
  if (text === 'obstacle-ahead()') return { type: 'sensor', sensor: 'obstacle-ahead' };
  if (text === 'at-goal()') return { type: 'sensor', sensor: 'at-goal' };
  if (text === 'not-at-goal()') return { type: 'sensor', sensor: 'not-at-goal' };
  if (text === 'edge-ahead()') return { type: 'sensor', sensor: 'edge-ahead' };

  // Comparison pattern: var-num|var-char <|>|= value
  const match = text.match(/^(var-num|var-char)\s+([<>=])\s+(.+)$/);
  if (match) {
    const variable = match[1] as 'var-num' | 'var-char';
    const operator = match[2] as ComparisonOperator;
    const rawValue = match[3];
    const value = variable === 'var-num' ? parseInt(rawValue, 10) : rawValue;
    if (variable === 'var-num' && isNaN(value as number)) return null;
    return { type: 'comparison', variable, operator, value };
  }

  return null;
}
```

### UI Components

**CommandPalette changes:**
- Remove the old `if(obstacle-ahead)` and `while(not-at-goal)` buttons.
- Add `if(...)` button in the control structures group. Inserts a generic IF with default condition `obstacle-ahead()`.
- Add `while(...)` button in the control structures group. Inserts a generic WHILE with default condition `not-at-goal()`.
- Add a "Variables" section (hard only) with buttons: `var-num`, `var-char`, `var-num++`, `var-num--`.
- All new buttons are only rendered when `difficulty === 'hard'`.

**CodeEditor changes — Condition Picker:**
- `IF` and `WHILE` lines show an inline condition editor next to the command keyword.
- The condition editor has two modes:
  1. **Sensor mode**: A dropdown listing `obstacle-ahead()`, `at-goal()`, `not-at-goal()`.
  2. **Comparison mode**: Three inline inputs — variable dropdown (`var-num` | `var-char`), operator dropdown (`<` | `>` | `=`), and value input (numeric spinner for var-num clamped to [-99, 99], single-char dropdown a–z for var-char).
- A toggle or tab switches between sensor and comparison modes.
- When switching from comparison to sensor mode, the condition resets to `obstacle-ahead()`.
- When switching variable type in comparison mode (var-num ↔ var-char), the value resets to the appropriate default (0 or 'a').

**CodeEditor changes — Variable commands:**
- `VAR_NUM_DECL` lines show an inline numeric input (spinner) for the initial value, clamped to [-99, 99].
- `VAR_CHAR_DECL` lines show an inline single-character dropdown or input restricted to a–z.
- `VAR_NUM_INC` and `VAR_NUM_DEC` render as plain text (`var-num++`, `var-num--`) with no editable parameters.

## Data Models

### Condition Type (New)

The `Condition` type is a discriminated union:

```typescript
// Sensor condition — checks game world state
interface SensorCondition {
  type: 'sensor';
  sensor: 'obstacle-ahead' | 'at-goal' | 'not-at-goal';
}

// Comparison condition — compares a variable to a literal
interface ComparisonCondition {
  type: 'comparison';
  variable: 'var-num' | 'var-char';
  operator: '<' | '>' | '=';
  value: number | string;  // number for var-num, single char string for var-char
}

type Condition = SensorCondition | ComparisonCondition;
```

### Command Tree Structure (Updated)

The `Command[]` tree structure replaces `IF_OBSTACLE` and `WHILE_NOT_GOAL` with generic `IF` and `WHILE` that carry a `condition` field.

```typescript
// Example: old IF_OBSTACLE behavior via generic IF
const ifExample: Command = {
  id: '1',
  type: 'IF',
  condition: { type: 'sensor', sensor: 'obstacle-ahead' },
  body: [{ id: '2', type: 'JUMP' }],
  elseBody: [{ id: '3', type: 'FORWARD' }],
};
// Text: if(obstacle-ahead())
//         jump()
//       else
//         forward()
//       end-if

// Example: old WHILE_NOT_GOAL behavior via generic WHILE
const whileExample: Command = {
  id: '4',
  type: 'WHILE',
  condition: { type: 'sensor', sensor: 'not-at-goal' },
  body: [{ id: '5', type: 'FORWARD' }],
};
// Text: while(not-at-goal())
//         forward()
//       end-while

// Example: variable-based counting loop
const countingLoop: Command[] = [
  { id: '6', type: 'VAR_NUM_DECL', varValue: 0 },
  {
    id: '7',
    type: 'WHILE',
    condition: { type: 'comparison', variable: 'var-num', operator: '<', value: 5 },
    body: [
      { id: '8', type: 'FORWARD' },
      { id: '9', type: 'VAR_NUM_INC' },
    ],
  },
];
// Text: var-num = 0
//       while(var-num < 5)
//         forward()
//         var-num++
//       end-while

// Example: sensor-based if with at-goal
const atGoalIf: Command = {
  id: '10',
  type: 'IF',
  condition: { type: 'sensor', sensor: 'at-goal' },
  body: [],
  elseBody: [{ id: '11', type: 'FORWARD' }],
};
// Text: if(at-goal())
//       else
//         forward()
//       end-if
```

### Variable Environment (Runtime Only)

The `VariableEnvironment` is created fresh at the start of each `executeProgramV2` call. It is not persisted.

```typescript
// Initial state at execution start:
const env: VariableEnvironment = {};
// After executing `var-num = 5`:
// env = { 'var-num': 5 }
// After executing `var-char = 'm'`:
// env = { 'var-num': 5, 'var-char': 'm' }
// After executing `var-num++`:
// env = { 'var-num': 6, 'var-char': 'm' }
```

### Text Serialization Format

| Command | Text Format | Example |
|---------|------------|---------|
| `IF` (sensor) | `if(<sensor>())` + body + `else` + elseBody + `end-if` | `if(obstacle-ahead())`, `if(at-goal())` |
| `IF` (comparison) | `if(<var> <op> <val>)` + body + `else` + elseBody + `end-if` | `if(var-num < 10)`, `if(var-char = z)` |
| `WHILE` (sensor) | `while(<sensor>())` + body + `end-while` | `while(not-at-goal())`, `while(at-goal())` |
| `WHILE` (comparison) | `while(<var> <op> <val>)` + body + `end-while` | `while(var-num < 10)`, `while(var-char < z)` |
| `VAR_NUM_DECL` | `var-num = <integer>` | `var-num = 0`, `var-num = -5` |
| `VAR_CHAR_DECL` | `var-char = '<char>'` | `var-char = 'a'`, `var-char = 'z'` |
| `VAR_NUM_INC` | `var-num++` | `var-num++` |
| `VAR_NUM_DEC` | `var-num--` | `var-num--` |

For comparison conditions with `var-char`, the value is unquoted inside the if/while parentheses: `while(var-char < z)`. This keeps the syntax concise. The `var-char` declaration uses quotes (`var-char = 'a'`) to clearly denote a character literal.

### i18n Keys

New keys added to `spaceCoder` namespace:

```json
{
  "spaceCoder": {
    "commands": {
      "if": "if(...)",
      "while": "while(...)",
      "varNumDecl": "var-num",
      "varCharDecl": "var-char",
      "varNumInc": "var-num++",
      "varNumDec": "var-num--"
    },
    "conditions": {
      "sensorMode": "Sensor",
      "comparisonMode": "Compare",
      "obstacleAhead": "obstacle-ahead()",
      "atGoal": "at-goal()",
      "notAtGoal": "not-at-goal()",
      "edgeAhead": "edge-ahead()"
    },
    "variables": {
      "sectionTitle": "Variables",
      "numLabel": "Number",
      "charLabel": "Character"
    },
    "errors": {
      "undefinedVarNum": "Variable not defined! Add var-num = <value> before using it.",
      "undefinedVarChar": "Variable not defined! Add var-char = '<value>' before using it."
    }
  }
}
```

Equivalent keys in `es.json` and `pt.json` with translated labels and error messages. Command syntax in the code editor (`var-num`, `if(...)`, `while(...)`, sensor names) remains in English regardless of locale.

## Correctness Properties

### Property 1: Serialization round-trip

*For any* valid program tree containing any combination of command types (`FORWARD`, `TURN_LEFT`, `TURN_RIGHT`, `JUMP`, `LOOP`, `IF`, `WHILE`, `VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC`) with any valid conditions (sensor or comparison), converting to text via `programToText` and parsing back via `textToProgram` shall produce a structurally equivalent program tree (same types, same parameters, same conditions, same varValues, same nesting structure — ignoring command IDs).

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10**

### Property 2: Line count invariant

*For any* valid program tree, `countAllLines(program)` shall equal the number of lines produced by `programToText(program).length`. This ensures the line counting logic stays consistent with the text serialization for all command types.

**Validates: Requirements 11.5, 11.6, 11.7**

### Property 3: Condition evaluation correctness — sensors

*For any* sensor type (`obstacle-ahead`, `at-goal`, `not-at-goal`, `edge-ahead`), *any* valid character state (position, direction), and *any* valid level, `evaluateCondition` with a sensor condition shall return the same boolean as the equivalent direct game-state check (obstacle/wall/OOB ahead for `obstacle-ahead`, position === goal for `at-goal`, position !== goal for `not-at-goal`, next cell out of bounds for `edge-ahead`).

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Condition evaluation correctness — comparisons

*For any* variable type (`var-num` or `var-char`), *any* comparison operator (`<`, `>`, `=`), *any* current variable value, and *any* comparison target value, `evaluateCondition` with a comparison condition shall return the same boolean result as the equivalent native JavaScript comparison (numeric comparison for `var-num`, character code comparison for `var-char`).

**Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

### Property 5: Sensor-based IF matches old IF_OBSTACLE behavior

*For any* valid level and *any* valid character state, executing a generic `IF` with condition `{ type: 'sensor', sensor: 'obstacle-ahead' }` shall produce the same branch selection (then vs else) as the old `IF_OBSTACLE` execution logic would have.

**Validates: Requirements 8.3**

### Property 6: Sensor-based WHILE matches old WHILE_NOT_GOAL behavior

*For any* valid level and *any* valid program where a `WHILE` with condition `{ type: 'sensor', sensor: 'not-at-goal' }` is used, the execution shall produce the same sequence of steps as the old `WHILE_NOT_GOAL` execution logic would have.

**Validates: Requirements 8.3**

### Property 7: Counting loop produces correct iteration count

*For any* initial numeric value `start` and *any* target value `target` where `start < target` and `target - start <= 20`, a program consisting of `var-num = start`, `while(var-num < target) { forward(); var-num++ }` executed on a sufficiently long straight-line level shall produce exactly `(target - start)` forward steps.

**Validates: Requirements 2.3, 7.3, 5.4**

### Property 8: Undefined variable produces error

*For any* program that uses `VAR_NUM_INC`, `VAR_NUM_DEC`, or an `IF`/`WHILE` with a comparison condition referencing a variable that has not been declared by a preceding `VAR_NUM_DECL` or `VAR_CHAR_DECL` command in the execution path, `executeProgramV2` shall produce an execution step with `errorType: 'undefined-variable'`.

**Validates: Requirements 1.5, 2.6, 7.5, 13.1, 13.2, 13.3**

### Property 9: Increment and decrement arithmetic

*For any* integer initial value `n` in [-99, 99], executing `var-num = n` followed by `k` increment commands and `j` decrement commands (in any order) shall result in the variable environment holding `n + k - j` for `var-num`.

**Validates: Requirements 7.3, 7.4, 5.4**

### Property 10: Last declaration wins

*For any* sequence of variable declarations for the same variable name (multiple `VAR_NUM_DECL` or multiple `VAR_CHAR_DECL`), the variable environment after execution shall hold the value from the last declaration executed, regardless of earlier declarations.

**Validates: Requirements 5.5, 6.5**

### Property 11: Simple command insertion increases line count by 1

*For any* valid program tree and *any* valid insertion cursor position, inserting a simple (non-control-structure) command (`VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, `VAR_NUM_DEC`) via `insertCommand` shall increase `countAllLines` by exactly 1.

**Validates: Requirements 12.1**

### Property 12: IF insertion increases line count by 3

*For any* valid program tree and *any* valid insertion cursor position, inserting an `IF` command via `insertCommand` shall increase `countAllLines` by exactly 3 (if line + else line + end-if line), and the returned cursor shall have `parentId` equal to the new command's ID and `branch` equal to `'body'`.

**Validates: Requirements 12.2**

### Property 13: WHILE insertion increases line count by 2

*For any* valid program tree and *any* valid insertion cursor position, inserting a `WHILE` command via `insertCommand` shall increase `countAllLines` by exactly 2 (while line + end-while line), and the returned cursor shall have `parentId` equal to the new command's ID and `branch` equal to `'body'`.

**Validates: Requirements 12.3**

## Error Handling

### Undefined Variable Errors

When the execution engine encounters a command that reads or modifies a variable that hasn't been declared:

| Trigger | Error Type | Error Message (EN) |
|---------|-----------|-------------------|
| `var-num++` without prior `var-num = ...` | `undefined-variable` | "Variable not defined! Add var-num = \<value\> before using it." |
| `var-num--` without prior `var-num = ...` | `undefined-variable` | "Variable not defined! Add var-num = \<value\> before using it." |
| `if(var-num ...)` or `while(var-num ...)` without prior `var-num = ...` | `undefined-variable` | "Variable not defined! Add var-num = \<value\> before using it." |
| `if(var-char ...)` or `while(var-char ...)` without prior `var-char = ...` | `undefined-variable` | "Variable not defined! Add var-char = '\<value\>' before using it." |

The error stops execution immediately (sets `alive = false`) and produces an `ExecutionStep` with the `errorType` field set to `'undefined-variable'`. The game page displays the localized error message in the same error toast/banner used for collision and infinite-loop errors.

### Infinite Loop Safeguard

The existing `MAX_STEPS = 500` safeguard applies to generic `WHILE` loops identically to the old `WHILE_NOT_GOAL`. If any while loop (or combination of loops) causes the total step count to reach 500, execution stops with `errorType: 'infinite-loop'`. No additional safeguard is needed.

### Variable Value Overflow

The `varValue` for `VAR_NUM_DECL` is clamped to [-99, 99] in the UI. However, increment/decrement operations during execution are not clamped — a variable can exceed these bounds at runtime (e.g., `var-num = 99` followed by `var-num++` produces 100). This is intentional: the bounds apply to the initial declaration UI input, not to runtime arithmetic. The `MAX_STEPS` safeguard prevents runaway loops regardless.

### Parse Errors

`textToProgram` silently skips lines it cannot parse (existing behavior). If a condition inside `if(...)` or `while(...)` cannot be parsed as a valid sensor or comparison, the line is skipped. This matches the existing graceful degradation pattern.

## Testing Strategy

### Property-Based Tests (fast-check, minimum 100 iterations each)

The project uses **Vitest** with **fast-check** for property-based testing, following the pattern established in `scratchCodingTreePBT.test.ts`.

A new test file `apps/web/src/utils/__tests__/scratchCodingGenericConditionsPBT.test.ts` will contain:

| Property | Test Description | Generator Strategy |
|----------|-----------------|-------------------|
| Property 1 | Serialization round-trip | Generate random program trees with all 11 command types (depth 0–3, width 0–4), random conditions (sensor or comparison with random variable/operator/value). Serialize via `programToText`, parse via `textToProgram`, compare structure ignoring IDs. |
| Property 2 | Line count invariant | Generate random program trees. Assert `countAllLines(program) === programToText(program).length`. |
| Property 3 | Sensor condition evaluation | Generate random sensor types, random character states (position, direction), random levels. Assert `evaluateCondition` matches direct game-state check. |
| Property 4 | Comparison condition evaluation | Generate random `Condition` objects (comparison variant) and random current values. Assert `evaluateCondition` matches native JS comparison. |
| Property 5 | Sensor IF matches old IF_OBSTACLE | Generate random levels and character states. Assert generic IF with `obstacle-ahead` sensor selects the same branch as old IF_OBSTACLE logic. |
| Property 6 | Sensor WHILE matches old WHILE_NOT_GOAL | Generate random programs with sensor-based WHILE. Execute and compare step sequences to old WHILE_NOT_GOAL execution. |
| Property 7 | Counting loop iteration count | Generate random `start` in [-20, 20] and `delta` in [1, 20]. Build a counting loop program. Execute on a straight-line level. Assert forward step count equals `delta`. |
| Property 8 | Undefined variable error | Generate programs with inc/dec/if/while-comparison but no matching declaration. Assert execution produces `undefined-variable` error. |
| Property 9 | Increment/decrement arithmetic | Generate random initial value, random sequence of inc/dec operations. Execute and verify final variable value. |
| Property 10 | Last declaration wins | Generate random sequences of 2+ declarations for the same variable. Execute and verify final value matches last declaration. |
| Property 11 | Simple insertion +1 line | Generate random programs and valid cursors. Insert a simple variable command. Assert line count delta is 1. |
| Property 12 | IF insertion +3 lines | Generate random programs and valid cursors. Insert IF. Assert line count delta is 3 and cursor is inside body. |
| Property 13 | WHILE insertion +2 lines | Generate random programs and valid cursors. Insert WHILE. Assert line count delta is 2 and cursor is inside body. |

Each test tagged with: `Feature: space-coder-generic-conditions, Property N: <title>`

### Unit Tests (example-based)

A new test file `apps/web/src/utils/__tests__/scratchCodingGenericConditions.test.ts` will contain:

- `createCommand('IF')` produces `condition: { type: 'sensor', sensor: 'obstacle-ahead' }`, `body: []`, `elseBody: []`
- `createCommand('WHILE')` produces `condition: { type: 'sensor', sensor: 'not-at-goal' }`, `body: []`
- `createCommand('VAR_NUM_DECL')` produces `varValue: 0`
- `createCommand('VAR_CHAR_DECL')` produces `varValue: 'a'`
- `getCommandsForDifficulty('hard')` includes `IF`, `WHILE`, and all 4 variable types
- `getCommandsForDifficulty('hard')` does NOT include `IF_OBSTACLE` or `WHILE_NOT_GOAL`
- `getCommandsForDifficulty('easy')` and `('medium')` exclude `IF`, `WHILE`, and all variable types
- `conditionToText` for each sensor type and comparison variants
- `textToCondition` for each sensor string and comparison strings
- Specific `programToText` output for IF with sensor, IF with comparison, WHILE with sensor, WHILE with comparison
- Specific `textToProgram` parsing for each condition format
- Infinite loop safeguard triggers for non-terminating generic while
- `evaluateCondition` with `obstacle-ahead` sensor matches old IF_OBSTACLE check
- `evaluateCondition` with `not-at-goal` sensor matches old WHILE_NOT_GOAL check
- Locale files contain all new i18n keys

### Integration / Regression

- Existing level solvability tests continue to pass (levels migrated from IF_OBSTACLE/WHILE_NOT_GOAL to IF/WHILE with sensors)
- Existing PBT tests in `scratchCodingTreePBT.test.ts` updated to use `IF`/`WHILE` instead of `IF_OBSTACLE`/`WHILE_NOT_GOAL`
- Existing nesting UI tests in `scratchCodingNestingUI.test.ts` updated to use `IF`/`WHILE`
