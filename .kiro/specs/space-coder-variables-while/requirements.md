# Requirements Document

## Introduction

Phase 2 of the Space Coder Terminal Rework replaces the hardcoded `IF_OBSTACLE` and `WHILE_NOT_GOAL` command types with **generic `IF` and `WHILE` commands** that accept a **condition expression**, and adds **variables** (`var-num`, `var-char`) with increment/decrement operations. Instead of fixed-purpose conditionals, the game now has a unified condition system with two kinds of conditions:

- **Sensor functions**: `obstacle-ahead()`, `at-goal()`, `not-at-goal()`, `edge-ahead()` — check the game world state
- **Variable comparisons**: `var-num < 10`, `var-char = 'z'` — compare a variable to a literal value

This means `if(obstacle-ahead())` replaces the old `IF_OBSTACLE`, `while(not-at-goal())` replaces the old `WHILE_NOT_GOAL`, and new conditions like `while(var-num < 10)` and `if(at-goal())` become possible. The `if` command supports an `else` branch (same as the old `IF_OBSTACLE`). Variables are declared with an initial value and modified via `var-num++` / `var-num--`. All new commands are gated to hard difficulty. Existing hard levels that used `IF_OBSTACLE` and `WHILE_NOT_GOAL` are migrated to the new generic types. All changes are frontend-only within `scratchCodingUtils.ts` and the game page component.

## Glossary

- **Space_Coder_Game**: The retro terminal-style coding game within DashDen where players build programs to navigate an astronaut through a grid
- **Command_Palette**: The left-side panel displaying clickable command buttons that insert text commands into the Code_Editor
- **Code_Editor**: The retro terminal-style text editor (green monospace text on black background) where the player's program is displayed
- **Command**: A single text instruction in the player's program
- **Program**: The ordered sequence of Commands and control structures assembled by the player
- **Execution_Engine**: The component that interprets the player's Program and produces step-by-step animation of the astronaut on the Game_Stage
- **Condition_Expression**: A boolean expression used inside generic IF and WHILE commands; either a Sensor_Function or a Variable_Comparison
- **Sensor_Function**: A condition that checks the game world state — one of `obstacle-ahead()`, `at-goal()`, `not-at-goal()`, or `edge-ahead()`
- **Variable_Comparison**: A condition that compares a variable's current value to a literal using a Comparison_Operator — e.g., `var-num < 10` or `var-char = 'z'`
- **Comparison_Operator**: One of three operators used in Variable_Comparisons: `<` (less than), `>` (greater than), `=` (equal to)
- **Generic_IF**: A conditional command written as `if(<condition>)` that evaluates a Condition_Expression and executes the then-branch if true, or the else-branch if false
- **Generic_WHILE**: A while loop command written as `while(<condition>)` that evaluates a Condition_Expression each iteration and repeats the body while true
- **Variable_Declaration**: A command that creates a named variable with a type and initial value, written as `var-num = <value>` or `var-char = '<value>'`
- **Numeric_Variable**: A variable of type `var-num` that holds an integer value, initialized by the player when inserting the command
- **Character_Variable**: A variable of type `var-char` that holds a single character value (a–z), initialized by the player when inserting the command
- **Variable_Environment**: The runtime mapping of variable names to their current values, maintained by the Execution_Engine during program execution
- **Increment_Command**: A command written as `var-num++` that increases a Numeric_Variable's value by 1
- **Decrement_Command**: A command written as `var-num--` that decreases a Numeric_Variable's value by 1
- **Control_Structure**: A multi-line construct that groups Commands: `loop(n)...next`, `if(<condition>)...else...end-if`, or `while(<condition>)...end-while`
- **Line_Count**: The total number of command lines in the player's Program, including commands nested inside control structures at any depth

## Requirements

### Requirement 1: Generic IF Command with Condition Expression

**User Story:** As a player, I want a generic if command that can check different conditions (sensors or variable comparisons), so that I can write flexible conditional logic.

#### Acceptance Criteria

1. WHEN the player clicks the "if(...)" button in the Command_Palette, THE Code_Editor SHALL insert an `if(obstacle-ahead())` line, an `else` line, and an `end-if` line, with the insertion cursor positioned inside the then-branch.
2. THE Generic_IF command SHALL display an editable condition picker that allows the player to select a Sensor_Function or configure a Variable_Comparison.
3. WHEN the Execution_Engine processes a Generic_IF with a Sensor_Function condition, THE Execution_Engine SHALL evaluate the sensor against the current game state and execute the then-branch if true or the else-branch if false.
4. WHEN the Execution_Engine processes a Generic_IF with a Variable_Comparison condition, THE Execution_Engine SHALL read the variable's current value from the Variable_Environment and compare it to the literal value using the specified Comparison_Operator, executing the then-branch if true or the else-branch if false.
5. IF the Generic_IF condition references a variable that has not been declared, THEN THE Execution_Engine SHALL stop execution and report an error indicating the variable is not defined.
6. THE Generic_IF command SHALL support nesting other Control_Structures inside both its then-branch and else-branch.

### Requirement 2: Generic WHILE Command with Condition Expression

**User Story:** As a player, I want a generic while loop that can check different conditions (sensors or variable comparisons), so that I can write loops that repeat based on game state or a counter.

#### Acceptance Criteria

1. WHEN the player clicks the "while(...)" button in the Command_Palette, THE Code_Editor SHALL insert a `while(not-at-goal())` line and an `end-while` line, with the insertion cursor positioned between them.
2. THE Generic_WHILE command SHALL display an editable condition picker that allows the player to select a Sensor_Function or configure a Variable_Comparison.
3. WHEN the Execution_Engine processes a Generic_WHILE command, THE Execution_Engine SHALL evaluate the Condition_Expression before each iteration and execute the body while the condition is true.
4. WHEN the Condition_Expression evaluates to FALSE, THE Execution_Engine SHALL exit the Generic_WHILE and continue with the next command after end-while.
5. IF the total number of execution steps produced by a Generic_WHILE exceeds 500, THEN THE Execution_Engine SHALL stop execution and report an infinite loop safeguard error.
6. IF the Generic_WHILE condition references a variable that has not been declared, THEN THE Execution_Engine SHALL stop execution and report an error indicating the variable is not defined.
7. THE Generic_WHILE command SHALL support nesting other Control_Structures inside its body, including loop, other Generic_WHILE commands, and Generic_IF commands.

### Requirement 3: Sensor Functions

**User Story:** As a player, I want sensor functions that check the game world, so that I can use them as conditions in my if and while commands.

#### Acceptance Criteria

1. THE Execution_Engine SHALL support the `obstacle-ahead()` sensor, which evaluates to TRUE when the cell directly ahead of the astronaut (in the current facing direction) contains a wall, obstacle, or is out of bounds.
2. THE Execution_Engine SHALL support the `at-goal()` sensor, which evaluates to TRUE when the astronaut is currently on the goal cell.
3. THE Execution_Engine SHALL support the `not-at-goal()` sensor, which evaluates to TRUE when the astronaut is not currently on the goal cell.
4. THE Execution_Engine SHALL support the `edge-ahead()` sensor, which evaluates to TRUE when the cell directly ahead of the astronaut (in the current facing direction) is out of bounds (beyond the grid boundary), regardless of walls or obstacles.
5. THE condition picker in the Code_Editor SHALL list all four sensor functions as selectable options when editing a Generic_IF or Generic_WHILE condition.

### Requirement 4: Variable Comparison Conditions

**User Story:** As a player, I want to compare my variables to values inside if and while conditions, so that I can write counter-based loops and value-based branching.

#### Acceptance Criteria

1. THE condition picker SHALL allow the player to configure a Variable_Comparison by selecting a variable name (`var-num` or `var-char`), a Comparison_Operator (`<`, `>`, or `=`), and a literal comparison value.
2. WHEN the Variable_Comparison uses the `<` operator with a Numeric_Variable, THE Execution_Engine SHALL evaluate the condition as TRUE when the variable's current value is strictly less than the comparison value.
3. WHEN the Variable_Comparison uses the `>` operator with a Numeric_Variable, THE Execution_Engine SHALL evaluate the condition as TRUE when the variable's current value is strictly greater than the comparison value.
4. WHEN the Variable_Comparison uses the `=` operator with a Numeric_Variable, THE Execution_Engine SHALL evaluate the condition as TRUE when the variable's current value is exactly equal to the comparison value.
5. WHEN the Variable_Comparison uses the `<` operator with a Character_Variable, THE Execution_Engine SHALL evaluate the condition as TRUE when the variable's character code is strictly less than the comparison character's code.
6. WHEN the Variable_Comparison uses the `>` operator with a Character_Variable, THE Execution_Engine SHALL evaluate the condition as TRUE when the variable's character code is strictly greater than the comparison character's code.
7. WHEN the Variable_Comparison uses the `=` operator with a Character_Variable, THE Execution_Engine SHALL evaluate the condition as TRUE when the variable's character equals the comparison character.
8. WHEN the player switches the variable selector in a Variable_Comparison from `var-num` to `var-char` or vice versa, THE condition picker SHALL reset the comparison value to the appropriate default (0 for var-num, 'a' for var-char).

### Requirement 5: Numeric Variable Declaration

**User Story:** As a player, I want to declare a numeric variable with an initial value, so that I can use counters and state in my programs.

#### Acceptance Criteria

1. WHEN the player clicks the "var-num" button in the Command_Palette, THE Code_Editor SHALL insert a `var-num = 0` line at the current insertion cursor position.
2. THE Variable_Declaration for var-num SHALL display an editable numeric input for the initial value, with a default of 0, a minimum of -99, and a maximum of 99.
3. WHEN the player changes the initial value of a var-num declaration, THE Code_Editor SHALL update only that declaration's value without affecting other lines.
4. THE Execution_Engine SHALL store the Numeric_Variable in the Variable_Environment with its declared initial value when the declaration line is executed.
5. IF a program contains more than one var-num declaration, THEN THE Execution_Engine SHALL treat each declaration as reassigning the single `var-num` variable to the new initial value.

### Requirement 6: Character Variable Declaration

**User Story:** As a player, I want to declare a character variable with an initial value, so that I can work with letter-based conditions in my programs.

#### Acceptance Criteria

1. WHEN the player clicks the "var-char" button in the Command_Palette, THE Code_Editor SHALL insert a `var-char = 'a'` line at the current insertion cursor position.
2. THE Variable_Declaration for var-char SHALL display an editable single-character input for the initial value, restricted to lowercase letters a through z, with a default of 'a'.
3. WHEN the player changes the initial value of a var-char declaration, THE Code_Editor SHALL update only that declaration's value without affecting other lines.
4. THE Execution_Engine SHALL store the Character_Variable in the Variable_Environment with its declared initial value when the declaration line is executed.
5. IF a program contains more than one var-char declaration, THEN THE Execution_Engine SHALL treat each declaration as reassigning the single `var-char` variable to the new initial value.

### Requirement 7: Variable Increment and Decrement

**User Story:** As a player, I want to increment or decrement my numeric variable, so that I can build counting loops and update state during execution.

#### Acceptance Criteria

1. WHEN the player clicks the "var-num++" button in the Command_Palette, THE Code_Editor SHALL insert a `var-num++` line at the current insertion cursor position.
2. WHEN the player clicks the "var-num--" button in the Command_Palette, THE Code_Editor SHALL insert a `var-num--` line at the current insertion cursor position.
3. WHEN the Execution_Engine processes a var-num++ command, THE Execution_Engine SHALL increase the current value of var-num in the Variable_Environment by 1.
4. WHEN the Execution_Engine processes a var-num-- command, THE Execution_Engine SHALL decrease the current value of var-num in the Variable_Environment by 1.
5. IF the Execution_Engine processes a var-num++ or var-num-- command and no var-num has been declared, THEN THE Execution_Engine SHALL stop execution and report an error indicating the variable is not defined.

### Requirement 8: Migration of Existing IF_OBSTACLE and WHILE_NOT_GOAL

**User Story:** As a developer, I want the old IF_OBSTACLE and WHILE_NOT_GOAL command types removed and replaced by generic IF and WHILE with sensor conditions, so that the type system is unified.

#### Acceptance Criteria

1. THE CommandType union SHALL NOT include `IF_OBSTACLE` or `WHILE_NOT_GOAL` as separate members; these are replaced by `IF` and `WHILE` with Condition_Expression fields.
2. THE HARD_COMMANDS array and DIFFICULTY_CONFIG for hard levels SHALL reference `IF` and `WHILE` instead of `IF_OBSTACLE` and `WHILE_NOT_GOAL`.
3. THE existing hard-difficulty levels SHALL remain solvable after migration, with `IF` using `obstacle-ahead()` sensor and `WHILE` using `not-at-goal()` sensor producing identical execution behavior to the old types.
4. THE textToProgram parser SHALL parse `if(obstacle-ahead())` as a Generic_IF with sensor condition `obstacle-ahead`, and `while(not-at-goal())` as a Generic_WHILE with sensor condition `not-at-goal`.

### Requirement 9: Command Palette Updates

**User Story:** As a player, I want the new commands available in the command palette at the appropriate difficulty, so that I can use them when building programs.

#### Acceptance Criteria

1. WHILE the difficulty is set to Hard, THE Command_Palette SHALL display buttons for `if(...)`, `while(...)`, var-num, var-char, var-num++, and var-num-- in addition to forward, turn-left, turn-right, jump, and loop.
2. WHILE the difficulty is set to Easy or Medium, THE Command_Palette SHALL not display if, while, variable, or generic condition commands.
3. THE Command_Palette SHALL group variable-related commands (var-num, var-char, var-num++, var-num--) visually together, separate from movement and control structure commands.
4. WHILE the program is executing, THE Command_Palette SHALL disable all command buttons.

### Requirement 10: Text Representation and Serialization

**User Story:** As a developer, I want consistent text representations for all commands including generic if/while with conditions, so that programToText and textToProgram handle them correctly.

#### Acceptance Criteria

1. THE programToText function SHALL render a Generic_IF with a sensor condition as `if(<sensor>())` (e.g., `if(obstacle-ahead())`), followed by indented then-body, `else`, indented else-body, and `end-if`.
2. THE programToText function SHALL render a Generic_IF with a variable comparison as `if(<variable> <operator> <value>)` (e.g., `if(var-num < 10)`), followed by indented then-body, `else`, indented else-body, and `end-if`.
3. THE programToText function SHALL render a Generic_WHILE with a sensor condition as `while(<sensor>())` (e.g., `while(not-at-goal())`), followed by indented body and `end-while`.
4. THE programToText function SHALL render a Generic_WHILE with a variable comparison as `while(<variable> <operator> <value>)` (e.g., `while(var-num < 10)`), followed by indented body and `end-while`.
5. THE programToText function SHALL render a Numeric_Variable declaration as `var-num = <value>` (e.g., `var-num = 0`).
6. THE programToText function SHALL render a Character_Variable declaration as `var-char = '<value>'` (e.g., `var-char = 'a'`).
7. THE programToText function SHALL render an Increment_Command as `var-num++`.
8. THE programToText function SHALL render a Decrement_Command as `var-num--`.
9. THE textToProgram function SHALL parse all text formats back into the correct command types with correct condition, varValue, and whileCondition fields.
10. FOR ALL valid programs containing any combination of command types, converting to text via programToText and parsing back via textToProgram SHALL produce an equivalent program tree (round-trip property).

### Requirement 11: Data Model Extensions

**User Story:** As a developer, I want clean type definitions for the new generic command types, so that the type system enforces correctness across the codebase.

#### Acceptance Criteria

1. THE CommandType union SHALL include: `FORWARD`, `TURN_LEFT`, `TURN_RIGHT`, `JUMP`, `LOOP`, `IF`, `WHILE`, `VAR_NUM_DECL`, `VAR_CHAR_DECL`, `VAR_NUM_INC`, and `VAR_NUM_DEC`.
2. THE Command interface SHALL support a `condition` field for IF and WHILE commands, typed as a Condition_Expression union (sensor or variable comparison).
3. THE Command interface SHALL support a `varValue` field for variable declarations (number for VAR_NUM_DECL, string for VAR_CHAR_DECL).
4. THE COMMAND_DEFINITIONS array SHALL include definitions for all command types with appropriate minDifficulty values.
5. THE countAllLines function SHALL count IF as 1 (if line) + then body lines + 1 (else line) + else body lines + 1 (end-if line).
6. THE countAllLines function SHALL count WHILE as 1 (while line) + body lines + 1 (end-while line).
7. THE countAllLines function SHALL count VAR_NUM_DECL, VAR_CHAR_DECL, VAR_NUM_INC, and VAR_NUM_DEC as 1 line each.

### Requirement 12: Line Count and Insertion Behavior

**User Story:** As a player, I want all commands to integrate naturally with the existing insertion cursor system, so that building programs feels consistent.

#### Acceptance Criteria

1. WHEN the player inserts a VAR_NUM_DECL, VAR_CHAR_DECL, VAR_NUM_INC, or VAR_NUM_DEC command, THE Code_Editor SHALL increase the Line_Count by exactly 1 and advance the insertion cursor by 1.
2. WHEN the player inserts an IF command, THE Code_Editor SHALL increase the Line_Count by 3 (if line + else line + end-if line) and position the insertion cursor inside the then-branch.
3. WHEN the player inserts a WHILE command, THE Code_Editor SHALL increase the Line_Count by 2 (while line + end-while line) and position the insertion cursor inside the while body.
4. WHEN the player clicks a simple command line (VAR_NUM_DECL, VAR_CHAR_DECL, VAR_NUM_INC, VAR_NUM_DEC), THE Code_Editor SHALL remove that single line from the program.
5. WHEN the player clicks the opening, else, or closing line of an IF or WHILE, THE Code_Editor SHALL remove the entire control structure including its body.

### Requirement 13: Execution Error Handling for Variables

**User Story:** As a player, I want clear error messages when my program uses variables incorrectly, so that I can understand and fix my mistakes.

#### Acceptance Criteria

1. IF the Execution_Engine encounters a var-num++ or var-num-- command and var-num has not been declared earlier in the execution, THEN THE Execution_Engine SHALL stop execution and display an error message: "Variable not defined! Add var-num = <value> before using it."
2. IF the Execution_Engine encounters an IF or WHILE condition referencing var-num and var-num has not been declared, THEN THE Execution_Engine SHALL stop execution and display an error message: "Variable not defined! Add var-num = <value> before using it."
3. IF the Execution_Engine encounters an IF or WHILE condition referencing var-char and var-char has not been declared, THEN THE Execution_Engine SHALL stop execution and display an error message: "Variable not defined! Add var-char = '<value>' before using it."
4. THE error messages for undefined variables SHALL be localized in English, Spanish, and Portuguese.

### Requirement 14: Level Design Updates

**User Story:** As a player, I want hard levels that use the new generic if/while commands, so that I have a reason to learn these concepts.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL include the new generic IF, WHILE, and variable commands in the availableCommands list for all hard-difficulty levels.
2. AT LEAST 1 hard-difficulty level SHALL be designed so that the optimal solution uses a Numeric_Variable with a Generic_WHILE loop (e.g., a counting loop pattern).
3. THE existing hard-difficulty levels SHALL remain solvable using `if(obstacle-ahead())` and `while(not-at-goal())` sensor conditions, matching the behavior of the old IF_OBSTACLE and WHILE_NOT_GOAL.
4. WHEN a hard-difficulty level is loaded, THE Command_Palette SHALL display all generic if/while and variable commands alongside the existing hard-level commands.

### Requirement 15: Internationalization for New Commands

**User Story:** As a player who speaks Spanish or Portuguese, I want the new command labels translated, so that I can understand the command palette in my language.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL provide localized labels for the if(...), while(...), var-num, var-char, var-num++, var-num--, and sensor function names in the Command_Palette in English, Spanish, and Portuguese.
2. THE Space_Coder_Game SHALL provide localized error messages for undefined variable errors in English, Spanish, and Portuguese.
3. THE command syntax displayed in the Code_Editor (var-num, var-char, if(...), while(...), obstacle-ahead(), at-goal(), not-at-goal(), edge-ahead()) SHALL remain in English regardless of locale, as these represent programming keywords.
