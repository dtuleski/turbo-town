# Requirements Document

## Introduction

A new Scratch-style visual programming game for DashDen that teaches kids programming fundamentals through block-based coding challenges. Players drag and snap together visual code blocks (loops, conditionals, movement, variables) to guide a character through increasingly complex levels. The game uses the Scratch programming paradigm — colorful, categorized blocks that snap together — and integrates with DashDen's existing scoring system, leaderboard, and i18n infrastructure (English, Spanish, Portuguese).

## Glossary

- **Scratch_Game**: The new Scratch-style visual programming game within DashDen
- **Block_Editor**: The drag-and-drop workspace where players assemble code blocks into programs
- **Code_Block**: A visual programming element representing a single instruction (e.g., move, turn, repeat, if/else)
- **Block_Palette**: The categorized panel from which players select Code_Blocks to drag into the Block_Editor
- **Program**: The sequence of connected Code_Blocks assembled by the player in the Block_Editor
- **Character**: The on-screen sprite that executes the player's Program on the Game_Stage
- **Game_Stage**: The visual canvas where the Character moves and interacts with the level environment
- **Level**: A single challenge with a defined goal, grid layout, and set of available Code_Blocks
- **Goal**: The objective the player must achieve in a Level (e.g., reach a target, collect items, draw a shape)
- **Execution_Engine**: The component that interprets and runs the player's Program step-by-step on the Game_Stage
- **Setup_Page**: The pre-game screen where the player selects difficulty before starting
- **Game_Service**: The existing DashDen backend Lambda that handles game session tracking, scoring, and rate limiting
- **Score_Calculator**: The existing DashDen service that computes scores using the formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
- **Leaderboard**: The existing DashDen ranking system that displays top scores per game
- **Game_Catalog**: The DynamoDB table listing all available games shown in the Game Hub

## Requirements

### Requirement 1: Game Setup and Difficulty Selection

**User Story:** As a player, I want to choose a difficulty level before starting the Scratch coding game, so that I can play at a challenge level appropriate for my skill.

#### Acceptance Criteria

1. THE Setup_Page SHALL display three difficulty options: Easy, Medium, and Hard.
2. WHEN the player selects a difficulty and clicks the start button, THE Scratch_Game SHALL start a new game session by calling the Game_Service with themeId "SCRATCH_CODING" and the corresponding difficulty value (Easy=1, Medium=2, Hard=3).
3. IF the Game_Service returns a rate limit error, THEN THE Scratch_Game SHALL redirect the player to the rate limit page.
4. THE Setup_Page SHALL display all text labels using the current locale from react-i18next.

### Requirement 2: Block Palette and Code Block Categories

**User Story:** As a player, I want to see categorized programming blocks, so that I can find and use the right instructions to solve each level.

#### Acceptance Criteria

1. THE Block_Palette SHALL organize Code_Blocks into the following categories: Motion (move, turn), Control (repeat N times, if/else), and Events (on start).
2. WHILE the difficulty is set to Easy, THE Block_Palette SHALL display only Motion and Events blocks.
3. WHILE the difficulty is set to Medium, THE Block_Palette SHALL display Motion, Events, and Control blocks including "repeat N times."
4. WHILE the difficulty is set to Hard, THE Block_Palette SHALL display all block categories including nested loops and if/else conditionals.
5. THE Block_Palette SHALL display each category with a distinct color consistent with Scratch conventions (e.g., blue for Motion, orange for Control, yellow for Events).

### Requirement 3: Block Editor — Drag-and-Drop Program Assembly

**User Story:** As a player, I want to drag blocks from the palette and snap them together in a workspace, so that I can build a program visually.

#### Acceptance Criteria

1. WHEN the player drags a Code_Block from the Block_Palette into the Block_Editor, THE Block_Editor SHALL add the Code_Block to the program sequence at the drop position.
2. WHEN the player drags a Code_Block near another Code_Block in the Block_Editor, THE Block_Editor SHALL display a visual snap indicator showing where the block will attach.
3. WHEN the player clicks a Code_Block in the Block_Editor, THE Block_Editor SHALL allow the player to remove the Code_Block from the program.
4. WHEN the player drags a Code_Block that accepts a numeric parameter (e.g., "repeat N times", "move N steps"), THE Block_Editor SHALL display an editable numeric input field on the block with a default value.
5. THE Block_Editor SHALL enforce a maximum block count per level as defined by the Level configuration.
6. IF the player attempts to add a Code_Block beyond the maximum block count, THEN THE Block_Editor SHALL display a visual indicator that no more blocks can be added.

### Requirement 4: Program Execution and Character Animation

**User Story:** As a player, I want to run my program and watch the character follow my instructions, so that I can see if my solution works.

#### Acceptance Criteria

1. WHEN the player presses the Run button, THE Execution_Engine SHALL interpret the Program and animate the Character on the Game_Stage step-by-step.
2. WHILE the Program is executing, THE Block_Editor SHALL visually highlight the Code_Block currently being executed.
3. WHEN the Character reaches the Goal during execution, THE Execution_Engine SHALL stop execution and display a level-complete overlay.
4. WHEN the Program finishes executing without the Character reaching the Goal, THE Execution_Engine SHALL display a failure message with a "Try Again" option.
5. IF the Character moves to an invalid position (e.g., off-grid or into a wall) during execution, THEN THE Execution_Engine SHALL stop execution and display an error message indicating the collision.
6. WHILE the Program is executing, THE Scratch_Game SHALL disable the Run button and the Block_Editor to prevent modifications.

### Requirement 5: Level Progression

**User Story:** As a player, I want to progress through multiple levels of increasing complexity, so that I can gradually learn new programming concepts.

#### Acceptance Criteria

1. THE Scratch_Game SHALL provide a minimum of 5 levels per difficulty setting (Easy, Medium, Hard).
2. WHEN the player completes a Level, THE Scratch_Game SHALL display the number of blocks used and whether the solution was optimal (fewest blocks possible).
3. WHEN the player completes a Level and more levels remain, THE Scratch_Game SHALL display a "Next Level" button.
4. WHEN the player completes the final Level for the selected difficulty, THE Scratch_Game SHALL trigger the game completion flow.
5. WHEN the player fails a Level, THE Scratch_Game SHALL allow the player to retry the Level or end the game early.

### Requirement 6: Scoring Integration

**User Story:** As a player, I want my performance scored consistently with other DashDen games, so that I can compare my results on the leaderboard.

#### Acceptance Criteria

1. WHEN the player completes the game (all levels or ends early), THE Scratch_Game SHALL call the Game_Service completeGame mutation with gameId, completionTime (total seconds), attempts (total run attempts across all levels), correctAnswers (levels completed), and totalQuestions (total levels for the difficulty).
2. THE Score_Calculator SHALL compute the final score using the standard DashDen formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus.
3. WHEN the Game_Service returns the score breakdown, THE Scratch_Game SHALL display the ScoreBreakdownModal with the score breakdown, leaderboard rank, and a "Play Again" option.
4. THE Scratch_Game SHALL track total elapsed time from game start using a running timer visible to the player.

### Requirement 7: Game Catalog Registration

**User Story:** As a platform operator, I want the Scratch coding game listed in the Game Hub, so that players can discover and launch the game.

#### Acceptance Criteria

1. THE Game_Catalog SHALL contain an entry for the Scratch coding game with gameId "scratch-coding", a descriptive title, description, icon, route to the Setup_Page, status "ACTIVE", an appropriate displayOrder, ageRange, and category.
2. THE Game_Hub filter map SHALL include "scratch-coding" in the "Puzzles & Logic" category.

### Requirement 8: Internationalization (i18n)

**User Story:** As a player who speaks Spanish or Portuguese, I want the game fully translated, so that I can play in my preferred language.

#### Acceptance Criteria

1. THE Scratch_Game SHALL use react-i18next for all user-facing text including block labels, level instructions, UI buttons, success messages, and error messages.
2. THE Scratch_Game SHALL provide complete translations in English (en), Spanish (es), and Portuguese (pt) locale files.
3. WHEN the player changes the application language, THE Scratch_Game SHALL immediately reflect the new language for all displayed text without requiring a page reload.
4. THE Scratch_Game SHALL translate Code_Block labels (e.g., "move", "turn", "repeat") to the active locale so that programming concepts are taught in the player's language.

### Requirement 9: Accessibility and Responsiveness

**User Story:** As a player using different devices, I want the game to be usable on both desktop and tablet screens, so that I can play comfortably on my preferred device.

#### Acceptance Criteria

1. THE Scratch_Game SHALL render a responsive layout that adapts to screen widths from 768px (tablet) to 1440px (desktop).
2. THE Block_Editor SHALL support both mouse drag-and-drop and touch drag-and-drop interactions.
3. THE Scratch_Game SHALL provide keyboard-accessible controls for the Run button, retry, and navigation between levels.
4. THE Game_Stage SHALL scale the grid and Character proportionally to fit the available viewport without horizontal scrolling.

### Requirement 10: Routing and Navigation

**User Story:** As a player, I want to navigate to and from the Scratch coding game using standard DashDen navigation, so that the experience is consistent with other games.

#### Acceptance Criteria

1. THE Scratch_Game SHALL register two routes: "/scratch-coding/setup" for the Setup_Page and "/scratch-coding/game" for the game page.
2. WHEN the player clicks the back button on the game page, THE Scratch_Game SHALL navigate to the Setup_Page.
3. WHEN the player completes the game and closes the ScoreBreakdownModal, THE Scratch_Game SHALL navigate to the Game Hub.
