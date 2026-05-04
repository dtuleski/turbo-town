# Requirements Document

## Introduction

The Space Coder game in DashDen currently uses a Scratch-style block editor with colored drag-and-drop pills. This feature completely replaces that editor with a retro terminal-style text coding interface. Players click commands from a command palette to insert text lines into a green-on-black monospace code editor, building programs with forward(), turn-left(), turn-right(), jump(), loop(n)...next, if(obstacle-ahead)...else...end-if, and while(not-at-goal)...end-while constructs. The grid sizes change to 6×6 (easy), 8×8 (medium), and 12×12 (hard), with hard levels featuring randomly generated obstacle patterns. forward() always moves exactly 1 step (no parameter), encouraging loop usage for efficiency. Scoring rewards code efficiency (fewer lines), and the game retains the existing routes, themeId, difficulty selection page, execution animation, completeGame API integration, leaderboard integration, and i18n support (EN, ES, PT). All drag-and-drop code (@dnd-kit), colored block pills, BlockRenderer.tsx, and ContainerBlockWrapper are removed.

## Glossary

- **Space_Coder_Game**: The retro terminal-style coding game within DashDen, replacing the previous Scratch-style block editor
- **Command_Palette**: The left-side panel displaying clickable command buttons that insert text commands into the Code_Editor
- **Code_Editor**: The retro terminal-style text editor (green monospace text on black background) where the player's program is displayed as readable text lines with proper indentation
- **Command**: A single text instruction in the player's program (e.g., forward(), turn-left(), turn-right(), jump())
- **Program**: The ordered sequence of Commands and control structures assembled by the player in the Code_Editor
- **Line_Count**: The total number of command lines in the player's Program, including commands nested inside control structures at any depth
- **Control_Structure**: A multi-line construct that groups Commands: loop(n)...next, if(obstacle-ahead)...else...end-if, or while(not-at-goal)...end-while
- **forward_command**: A command that moves the astronaut exactly 1 cell in the current facing direction
- **turn_left_command**: A command that rotates the astronaut 90 degrees counter-clockwise
- **turn_right_command**: A command that rotates the astronaut 90 degrees clockwise
- **jump_command**: A command that hops the astronaut over an obstacle directly ahead, landing on the cell beyond the obstacle
- **loop_structure**: A control structure written as loop(n)...next that repeats its body N times, where N is a positive integer
- **if_structure**: A conditional control structure written as if(obstacle-ahead)...else...end-if that executes the then branch when an obstacle is directly ahead, and the else branch otherwise
- **while_structure**: A loop control structure written as while(not-at-goal)...end-while that repeats its body until the astronaut reaches the goal cell
- **Obstacle**: A rock or barrier cell on the grid that blocks movement; the astronaut cannot walk through an Obstacle but can jump() over one
- **Game_Stage**: The visual grid canvas in the center of the screen where the astronaut moves and obstacles are displayed
- **Execution_Engine**: The component that interprets the player's Program and produces step-by-step animation of the astronaut on the Game_Stage
- **Execution_Step**: A single state snapshot produced by the Execution_Engine, containing the astronaut's position, direction, and status
- **Setup_Page**: The pre-game screen at /scratch-coding/setup where the player selects difficulty
- **Game_Service**: The existing DashDen backend Lambda that handles game session tracking, scoring, and rate limiting
- **Score_Calculator**: The existing DashDen service that computes scores
- **Code_Efficiency_Score**: A ratio comparing the optimal Line_Count for a level to the player's actual Line_Count, used as a scoring factor
- **Optimal_Line_Count**: The minimum number of command lines needed to solve a level using the most efficient combination of commands and control structures
- **Scanline_Effect**: An optional visual overlay on the Code_Editor that simulates the horizontal scan lines of a CRT monitor

## Requirements

### Requirement 1: Retro Terminal Code Editor

**User Story:** As a player, I want to write my program in a retro terminal-style text editor, so that I feel like a real programmer using a classic mainframe terminal.

#### Acceptance Criteria

1. THE Code_Editor SHALL render with a black (#000000) background and green (#00FF00) monospace font to simulate a retro terminal aesthetic.
2. THE Code_Editor SHALL display the player's Program as readable text lines with automatic indentation for commands nested inside Control_Structures.
3. WHEN a command is nested inside a Control_Structure, THE Code_Editor SHALL indent that command by 2 spaces per nesting level.
4. THE Code_Editor SHALL display a blinking cursor or insertion indicator at the end of the program to reinforce the terminal aesthetic.
5. THE Code_Editor SHALL be read-only for direct keyboard typing; commands are inserted only via the Command_Palette.
6. WHEN the program exceeds the visible area of the Code_Editor, THE Code_Editor SHALL provide vertical scrolling to view all lines.
7. THE Code_Editor SHALL display line numbers alongside each command line.

### Requirement 2: Command Palette

**User Story:** As a player, I want a command palette with clickable buttons, so that I can insert commands into my program without typing.

#### Acceptance Criteria

1. THE Command_Palette SHALL display buttons for the following commands: forward(), turn-left(), turn-right(), jump(), loop(n)...next, if(obstacle-ahead)...end-if, and while(not-at-goal)...end-while.
2. WHILE the difficulty is set to Easy, THE Command_Palette SHALL display only forward(), turn-left(), and turn-right() commands.
3. WHILE the difficulty is set to Medium, THE Command_Palette SHALL display forward(), turn-left(), turn-right(), and loop(n)...next commands.
4. WHILE the difficulty is set to Hard, THE Command_Palette SHALL display all commands: forward(), turn-left(), turn-right(), jump(), loop(n)...next, if(obstacle-ahead)...end-if, and while(not-at-goal)...end-while.
5. WHEN the player clicks a simple command button (forward(), turn-left(), turn-right(), jump()), THE Command_Palette SHALL insert that command as a new line at the end of the current program in the Code_Editor.
6. WHEN the player clicks a loop(n)...next button, THE Command_Palette SHALL insert a loop(n) line and a next line into the Code_Editor, with the cursor positioned between them for subsequent command insertion.
7. WHEN the player clicks an if(obstacle-ahead)...end-if button, THE Command_Palette SHALL insert if(obstacle-ahead), else, and end-if lines into the Code_Editor.
8. WHEN the player clicks a while(not-at-goal)...end-while button, THE Command_Palette SHALL insert while(not-at-goal) and end-while lines into the Code_Editor.
9. WHILE the program is executing, THE Command_Palette SHALL disable all command buttons to prevent modifications.
10. IF the player's Line_Count equals the level's maximum line limit, THEN THE Command_Palette SHALL disable all command buttons and display a visual indicator that the maximum has been reached.

### Requirement 3: Program Editing and Line Management

**User Story:** As a player, I want to remove lines and edit loop parameters in my program, so that I can refine my solution before running it.

#### Acceptance Criteria

1. WHEN the player clicks a command line in the Code_Editor, THE Code_Editor SHALL remove that line from the program.
2. WHEN the player clicks a Control_Structure's opening line (loop, if, or while), THE Code_Editor SHALL remove the entire Control_Structure including its opening line, body, and closing line.
3. WHEN the player clicks a command line nested inside a Control_Structure, THE Code_Editor SHALL remove only that single line, leaving the Control_Structure and sibling lines intact.
4. THE Code_Editor SHALL display a "Clear All" button that removes all lines from the program.
5. WHEN a loop_structure is in the program, THE Code_Editor SHALL display an editable numeric input on the loop line for the repeat count with a default value of 2, minimum of 1, and maximum of 20.
6. WHEN the player changes the loop repeat count, THE Code_Editor SHALL update only that loop_structure's parameter without affecting other lines.
7. WHEN the player clicks a closing line (next, end-if, or end-while), THE Code_Editor SHALL remove the entire parent Control_Structure including its opening line, body, and closing line.

### Requirement 4: Command Insertion Context

**User Story:** As a player, I want commands to be inserted at the correct position in my program, so that I can build programs inside loops and conditionals naturally.

#### Acceptance Criteria

1. THE Code_Editor SHALL maintain an insertion cursor that indicates where the next command will be placed.
2. WHEN the player inserts a Control_Structure, THE Code_Editor SHALL position the insertion cursor inside that structure's body so subsequent commands are added within the structure.
3. WHEN the player clicks a line in the Code_Editor to select it (without removing it), THE Code_Editor SHALL move the insertion cursor to the position after the selected line.
4. WHEN the player inserts a command while the insertion cursor is inside a Control_Structure, THE Code_Editor SHALL add the command inside that structure's body at the cursor position.
5. WHEN the player inserts a command while the insertion cursor is inside the else branch of an if_structure, THE Code_Editor SHALL add the command to the else branch at the cursor position.
6. THE Code_Editor SHALL visually highlight the current insertion context (e.g., highlighting the active Control_Structure body or else branch) so the player knows where the next command will be placed.

### Requirement 5: Grid Configuration by Difficulty

**User Story:** As a player, I want the grid size to match my difficulty level, so that easy levels are approachable and hard levels are challenging.

#### Acceptance Criteria

1. WHILE the difficulty is set to Easy, THE Game_Stage SHALL render a 6×6 grid.
2. WHILE the difficulty is set to Medium, THE Game_Stage SHALL render an 8×8 grid.
3. WHILE the difficulty is set to Hard, THE Game_Stage SHALL render a 12×12 grid.
4. THE Game_Stage SHALL scale cell sizes proportionally so the grid fits within the available viewport without horizontal scrolling across all three grid sizes.
5. WHILE the difficulty is set to Hard, THE Game_Stage SHALL display Obstacle cells as rocks scattered throughout the grid.

### Requirement 6: forward() Command (Single Step)

**User Story:** As a player, I want forward() to always move exactly 1 step, so that I must use loops to move efficiently across the grid.

#### Acceptance Criteria

1. WHEN the Execution_Engine processes a forward_command, THE Execution_Engine SHALL move the astronaut exactly 1 cell in the current facing direction.
2. THE forward_command SHALL accept no numeric parameter; the step count is always 1.
3. IF the cell directly ahead of the astronaut is a wall or out of bounds, THEN THE Execution_Engine SHALL stop execution and report a collision.
4. IF the cell directly ahead of the astronaut is an Obstacle, THEN THE Execution_Engine SHALL stop execution and report a collision (the player must use jump() to pass obstacles).

### Requirement 7: jump() Command

**User Story:** As a player, I want a jump() command that hops over an obstacle, so that I can navigate around rocks on hard levels.

#### Acceptance Criteria

1. WHEN the Execution_Engine processes a jump_command and an Obstacle is in the cell directly ahead, THE Execution_Engine SHALL move the astronaut to the cell two positions ahead in the current facing direction, skipping over the Obstacle.
2. IF the cell directly ahead is not an Obstacle when jump() is executed, THEN THE Execution_Engine SHALL stop execution and report an error indicating there is no obstacle to jump over.
3. IF the landing cell (two positions ahead) is out of bounds, a wall, or an Obstacle, THEN THE Execution_Engine SHALL stop execution and report a collision.
4. THE jump_command SHALL produce two Execution_Steps: one showing the astronaut above the obstacle (mid-jump) and one showing the astronaut on the landing cell.

### Requirement 8: loop Structure Execution

**User Story:** As a player, I want loop(n)...next to repeat commands N times, so that I can write efficient programs for repetitive movements.

#### Acceptance Criteria

1. WHEN the Execution_Engine processes a loop_structure with parameter N, THE Execution_Engine SHALL execute all commands between loop(n) and next exactly N times in sequence.
2. THE loop_structure SHALL support nesting other Control_Structures inside its body, including other loop_structures, if_structures, and while_structures.
3. THE Execution_Engine SHALL support loop_structures nested up to a depth of 3 levels.
4. IF the total number of Execution_Steps produced by a loop_structure exceeds 500, THEN THE Execution_Engine SHALL stop execution and report an infinite loop safeguard error.

### Requirement 9: if Conditional Structure Execution

**User Story:** As a player, I want if(obstacle-ahead) to check for obstacles and branch my code, so that I can write programs that react to the grid layout.

#### Acceptance Criteria

1. WHEN the Execution_Engine processes an if_structure, THE Execution_Engine SHALL evaluate whether an Obstacle or wall is in the cell directly ahead of the astronaut.
2. WHEN the condition obstacle-ahead evaluates to TRUE, THE Execution_Engine SHALL execute the commands in the then branch.
3. WHEN the condition obstacle-ahead evaluates to FALSE, THE Execution_Engine SHALL execute the commands in the else branch.
4. WHEN the if_structure has no commands in the else branch, THE Execution_Engine SHALL skip the else branch and continue with the next command after end-if.
5. THE if_structure SHALL support nesting other Control_Structures inside both the then and else branches.

### Requirement 10: while Loop Structure Execution

**User Story:** As a player, I want while(not-at-goal) to repeat commands until I reach the goal, so that I can write programs that adapt to varying distances.

#### Acceptance Criteria

1. WHEN the Execution_Engine processes a while_structure, THE Execution_Engine SHALL evaluate the condition not-at-goal before each iteration.
2. WHILE the astronaut has not reached the goal cell, THE Execution_Engine SHALL execute the commands inside the while body and then re-evaluate the condition.
3. WHEN the astronaut reaches the goal cell, THE Execution_Engine SHALL exit the while_structure and continue with the next command.
4. IF the total number of Execution_Steps produced by a while_structure exceeds 500, THEN THE Execution_Engine SHALL stop execution and report an infinite loop safeguard error.
5. THE while_structure SHALL support nesting other Control_Structures inside its body.

### Requirement 11: Level Design — Easy Levels

**User Story:** As a beginner player, I want easy levels with simple paths requiring only forward() and turn commands, so that I can learn the basics of sequential programming.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL provide a minimum of 5 easy-difficulty levels on a 6×6 grid.
2. FOR ALL easy-difficulty levels, the optimal solution SHALL require only forward_command, turn_left_command, and turn_right_command.
3. FOR ALL easy-difficulty levels, the grid SHALL contain no Obstacles.
4. THE easy-difficulty levels SHALL progress from simple straight-line paths to paths requiring multiple turns (L-shapes, U-turns, zigzags).
5. FOR ALL easy-difficulty levels, the maximum line limit SHALL allow a reasonable margin above the Optimal_Line_Count (at least Optimal_Line_Count + 4).

### Requirement 12: Level Design — Medium Levels

**User Story:** As an intermediate player, I want medium levels that require loops for efficient solutions, so that I learn the value of loop structures.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL provide a minimum of 5 medium-difficulty levels on an 8×8 grid.
2. FOR ALL medium-difficulty levels, the maximum line limit SHALL be set so that a flat solution (without loop) exceeds the maximum, forcing the player to use at least one loop_structure to solve the level.
3. THE medium-difficulty levels SHALL feature corridors with repeating movement patterns (staircases, zigzags, spirals) that map naturally to loop_structures.
4. FOR ALL medium-difficulty levels, the grid SHALL contain walls but no Obstacles.
5. WHEN the player completes a medium-difficulty level using the Optimal_Line_Count, THE Space_Coder_Game SHALL display an optimal solution indicator.

### Requirement 13: Level Design — Hard Levels with Random Obstacles

**User Story:** As an advanced player, I want hard levels with randomly placed obstacles on a large grid, so that I must combine if, jump(), loop, and while to solve challenging puzzles.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL provide a minimum of 5 hard-difficulty levels on a 12×12 grid.
2. FOR ALL hard-difficulty levels, THE Space_Coder_Game SHALL randomly generate Obstacle positions on the grid each time the level is loaded, ensuring a valid path from start to goal exists.
3. FOR ALL hard-difficulty levels, the maximum line limit SHALL be set so that a solution without Control_Structures exceeds the maximum, forcing the player to use loop_structures, if_structures, or while_structures.
4. AT LEAST 2 hard-difficulty levels SHALL require the jump_command in the optimal solution.
5. AT LEAST 2 hard-difficulty levels SHALL require the if_structure in the optimal solution.
6. AT LEAST 1 hard-difficulty level SHALL require the while_structure in the optimal solution.
7. WHEN generating random Obstacle patterns, THE Space_Coder_Game SHALL validate that a solvable path exists from the start position to the goal position before presenting the level to the player.
8. THE hard-difficulty levels SHALL place between 8 and 20 Obstacles on the 12×12 grid, distributed across the grid rather than clustered in one area.

### Requirement 14: Execution Animation

**User Story:** As a player, I want to watch my astronaut execute my program step by step on the grid, so that I can understand how my code works.

#### Acceptance Criteria

1. WHEN the player presses the Run button, THE Execution_Engine SHALL interpret the Program and animate the astronaut on the Game_Stage step-by-step.
2. WHILE the Program is executing, THE Code_Editor SHALL visually highlight the command line currently being executed with a distinct color (e.g., bright yellow or cyan highlight on the active line).
3. WHEN execution moves from one command to the next, THE Code_Editor SHALL move the highlight to the next command within 350 milliseconds.
4. WHEN the astronaut reaches the goal during execution, THE Execution_Engine SHALL stop execution and display a level-complete overlay.
5. WHEN the Program finishes executing without the astronaut reaching the goal, THE Execution_Engine SHALL display a failure message with a "Try Again" option.
6. IF the astronaut moves to an invalid position during execution, THEN THE Execution_Engine SHALL stop execution and display an error message indicating the collision type (wall, obstacle, or out of bounds).
7. WHILE the Program is executing, THE Space_Coder_Game SHALL disable the Run button and the Command_Palette to prevent modifications.

### Requirement 15: Code Efficiency Scoring

**User Story:** As a player, I want my score to reflect how efficiently I wrote my code, so that I am rewarded for concise programs.

#### Acceptance Criteria

1. WHEN the player completes the game, THE Space_Coder_Game SHALL compute the Code_Efficiency_Score as the ratio of total Optimal_Line_Count across completed levels to the player's total Line_Count across completed levels, capped at 1.0.
2. WHEN calling the Game_Service completeGame mutation, THE Space_Coder_Game SHALL pass the Code_Efficiency_Score as a factor in the correctAnswers parameter so the backend can incorporate efficiency into scoring.
3. WHEN displaying the level-complete overlay, THE Space_Coder_Game SHALL show the player's Line_Count compared to the level's Optimal_Line_Count.
4. WHEN the player's Line_Count equals the level's Optimal_Line_Count, THE Space_Coder_Game SHALL display a "Perfect Code" indicator.
5. WHEN the player's Line_Count exceeds the optimal but is within 2 lines, THE Space_Coder_Game SHALL display a "Clean Code" indicator.

### Requirement 16: Scoring and Leaderboard Integration

**User Story:** As a player, I want my performance scored consistently with other DashDen games, so that I can compare my results on the leaderboard.

#### Acceptance Criteria

1. WHEN the player completes the game (all levels or ends early), THE Space_Coder_Game SHALL call the Game_Service completeGame mutation with gameId, completionTime (total seconds), attempts (total run attempts across all levels), correctAnswers (efficiency-weighted levels completed), and totalQuestions (total levels for the difficulty).
2. THE Space_Coder_Game SHALL use themeId "SCRATCH_CODING" for all Game_Service API calls.
3. WHEN the Game_Service returns the score breakdown, THE Space_Coder_Game SHALL display the ScoreBreakdownModal with the score breakdown, leaderboard rank, and a "Play Again" option.
4. THE Space_Coder_Game SHALL track total elapsed time from game start using a running timer visible to the player.
5. THE Space_Coder_Game SHALL track total run attempts across all levels for the attempts parameter.

### Requirement 17: Removal of Drag-and-Drop and Block Editor

**User Story:** As a developer, I want all drag-and-drop code and colored block components removed, so that the codebase is clean and only contains the terminal-style editor.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL not import or use @dnd-kit/core or any @dnd-kit packages.
2. THE Space_Coder_Game SHALL not render BlockRenderer, ContainerBlockWrapper, or any colored block pill components.
3. THE Space_Coder_Game SHALL not use DndContext, useDraggable, useDroppable, or any drag-and-drop hooks.
4. THE Space_Coder_Game SHALL remove all references to BlockPath-based tree manipulation (insertBlockAtPath, removeBlockAtPath, updateParameterAtPath) and replace them with line-based program manipulation.
5. THE scratchCodingUtils module SHALL be refactored to use the new command types (FORWARD, TURN_LEFT, TURN_RIGHT, JUMP, LOOP, IF_OBSTACLE, WHILE_NOT_GOAL) instead of the old block types (MOVE_FORWARD, REPEAT, IF_WALL_AHEAD, IF_ON_GOAL, ON_START).

### Requirement 18: Program Data Model

**User Story:** As a developer, I want a clean data model for the terminal-style program, so that the Code_Editor, Execution_Engine, and scoring system can operate on a consistent structure.

#### Acceptance Criteria

1. THE program data model SHALL represent a program as a tree of Command nodes, where each node has a type, an optional parameter (for loop), and an optional body array (for loop, IF_OBSTACLE then branch, and while).
2. THE IF_OBSTACLE command node SHALL have both a body array (then branch) and an elseBody array (else branch).
3. THE scratchCodingUtils module SHALL export a countAllLines function that accepts a Command array and returns the Line_Count by recursively counting all commands including those nested inside Control_Structures, plus the structural lines (loop, next, if, else, end-if, while, end-while).
4. THE scratchCodingUtils module SHALL export a programToText function that accepts a Command array and returns an array of display strings with proper indentation for rendering in the Code_Editor.
5. FOR ALL valid programs, converting to text via programToText and parsing back via textToProgram SHALL produce an equivalent program tree (round-trip property).
6. FOR ALL valid programs, countAllLines SHALL return a value greater than or equal to the number of top-level commands.

### Requirement 19: Internationalization

**User Story:** As a player who speaks Spanish or Portuguese, I want all terminal UI text translated, so that I can understand the commands and interface in my language.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL provide localized labels for all command buttons in the Command_Palette in English, Spanish, and Portuguese.
2. THE Space_Coder_Game SHALL provide localized text for the Code_Editor UI elements (line numbers label, clear all button, insertion cursor hint) in English, Spanish, and Portuguese.
3. THE Space_Coder_Game SHALL provide localized messages for execution errors (collision, obstacle, out of bounds, infinite loop) in English, Spanish, and Portuguese.
4. THE Space_Coder_Game SHALL provide localized "Perfect Code" and "Clean Code" efficiency labels in English, Spanish, and Portuguese.
5. WHEN the player changes the application language, THE Space_Coder_Game SHALL immediately reflect the new language for all displayed text without requiring a page reload.
6. THE command text displayed in the Code_Editor (forward(), turn-left(), loop(), etc.) SHALL remain in English regardless of locale, as these represent programming keywords.

### Requirement 20: Routing and Navigation Preservation

**User Story:** As a player, I want the game to use the same routes and navigation as before, so that bookmarks and links continue to work.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL use the route /scratch-coding/setup for the Setup_Page.
2. THE Space_Coder_Game SHALL use the route /scratch-coding/game for the game page.
3. WHEN the player clicks the back button on the game page, THE Space_Coder_Game SHALL navigate to the Setup_Page.
4. WHEN the player completes the game and closes the ScoreBreakdownModal, THE Space_Coder_Game SHALL navigate to the Game Hub.
5. THE Setup_Page SHALL retain the existing difficulty selection UI with Easy, Medium, and Hard options, updating the descriptions to reflect the new grid sizes and command sets.

### Requirement 21: Obstacle Generation for Hard Levels

**User Story:** As a developer, I want a reliable obstacle generation algorithm for hard levels, so that every generated level is solvable and fair.

#### Acceptance Criteria

1. THE obstacle generator SHALL accept a 12×12 grid, a start position, a goal position, and a target obstacle count as inputs.
2. THE obstacle generator SHALL place obstacles randomly on empty cells, excluding the start position, the goal position, and cells adjacent to the start position.
3. AFTER placing obstacles, THE obstacle generator SHALL verify a valid path exists from start to goal using a pathfinding algorithm (e.g., BFS or A*).
4. IF no valid path exists after obstacle placement, THEN THE obstacle generator SHALL remove obstacles one at a time (starting from the most recently placed) until a valid path is restored.
5. THE obstacle generator SHALL return the final grid with obstacle positions and the verified path length.
6. FOR ALL outputs of the obstacle generator, a valid path from start to goal SHALL exist (solvability invariant).
7. FOR ALL outputs of the obstacle generator, the obstacle count SHALL be between 1 and the target obstacle count (inclusive).

### Requirement 22: Responsive Layout and Accessibility

**User Story:** As a player using different devices, I want the game to be usable on both desktop and tablet screens, so that I can play comfortably.

#### Acceptance Criteria

1. THE Space_Coder_Game SHALL render a responsive three-panel layout: Command_Palette on the left, Game_Stage in the center, and Code_Editor on the right.
2. THE Space_Coder_Game SHALL adapt the layout for screen widths from 768px (tablet) to 1440px (desktop).
3. THE Game_Stage SHALL scale the 12×12 grid cells proportionally to fit within the center panel without horizontal scrolling.
4. THE Space_Coder_Game SHALL provide keyboard-accessible controls for the Run button, retry, navigation between levels, and command palette buttons.
5. THE Code_Editor SHALL support touch interactions for selecting and removing lines on tablet devices.
