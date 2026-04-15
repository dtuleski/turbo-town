# Requirements Document

## Introduction

Math Maze is a new educational game for DashDen (dashden.app) that combines maze navigation with math problem-solving. Players navigate a procedurally generated maze where paths are blocked by math gates. Solving the equation at each gate opens the path; wrong answers lead to dead ends. The game rewards speed, accuracy, and efficient pathfinding. Difficulty levels scale the math from basic addition up to algebra, and collectible bonus items add extra scoring opportunities. Math Maze is distinct from the existing Math Challenge game by introducing spatial navigation, strategic path selection, and time pressure through a countdown timer.

## Glossary

- **Maze_Grid**: A two-dimensional grid of cells representing the maze layout, including walls, open paths, gates, collectibles, a start cell, and an exit cell.
- **Math_Gate**: A barrier on a maze path that displays a math equation the player must solve to open the gate and proceed.
- **Player_Avatar**: The visual representation of the player within the Maze_Grid that moves in response to input.
- **Dead_End_Penalty**: The consequence of answering a Math_Gate equation incorrectly — the gate path becomes permanently blocked for that attempt, forcing the player to find an alternative route.
- **Collectible**: A bonus item (star or gem) placed within the Maze_Grid that awards extra points when the Player_Avatar moves onto its cell.
- **Countdown_Timer**: A visible timer that counts down from a difficulty-dependent starting value; when it reaches zero the game ends.
- **Difficulty_Level**: One of three levels (Easy, Medium, Hard) that determines maze size, math operation types, timer duration, and gate complexity.
- **Maze_Generator**: The procedural algorithm that creates a new, solvable Maze_Grid for each game session.
- **Score_Calculator**: The backend service that computes the final score using the formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus.
- **Setup_Page**: The pre-game screen where the player selects a Difficulty_Level before starting.
- **Game_Page**: The main gameplay screen showing the Maze_Grid, Player_Avatar, Countdown_Timer, and current score.
- **Gate_Prompt**: The UI overlay that appears when the Player_Avatar reaches a Math_Gate, displaying the equation and an input field.
- **Game_Service**: The backend AWS Lambda that handles game session tracking, rate limiting, score calculation, and leaderboard integration.

## Requirements

### Requirement 1: Maze Setup and Difficulty Selection

**User Story:** As a player, I want to choose a difficulty level before starting, so that the maze and math problems match my skill level.

#### Acceptance Criteria

1. THE Setup_Page SHALL display three Difficulty_Level options: Easy, Medium, and Hard.
2. WHEN the player selects Easy, THE Setup_Page SHALL describe the level as addition and subtraction problems with a small maze and a 3-minute timer.
3. WHEN the player selects Medium, THE Setup_Page SHALL describe the level as all four basic operations with a medium maze and a 4-minute timer.
4. WHEN the player selects Hard, THE Setup_Page SHALL describe the level as including multiplication, division, powers, and simple algebra with a large maze and a 5-minute timer.
5. WHEN the player presses the Start button with a Difficulty_Level selected, THE Setup_Page SHALL navigate to the Game_Page with the chosen difficulty.
6. IF no Difficulty_Level is selected, THEN THE Setup_Page SHALL keep the Start button disabled.

### Requirement 2: Procedural Maze Generation

**User Story:** As a player, I want a new maze every time I play, so that the game stays fresh and replayable.

#### Acceptance Criteria

1. WHEN a new game session starts, THE Maze_Generator SHALL create a unique Maze_Grid with exactly one start cell and one exit cell.
2. THE Maze_Generator SHALL guarantee at least two distinct paths from the start cell to the exit cell.
3. WHEN Difficulty_Level is Easy, THE Maze_Generator SHALL produce a grid of approximately 7×7 cells with 3 to 5 Math_Gates.
4. WHEN Difficulty_Level is Medium, THE Maze_Generator SHALL produce a grid of approximately 10×10 cells with 5 to 8 Math_Gates.
5. WHEN Difficulty_Level is Hard, THE Maze_Generator SHALL produce a grid of approximately 13×13 cells with 8 to 12 Math_Gates.
6. THE Maze_Generator SHALL place Collectibles on non-critical paths so that collecting them requires optional detours.
7. THE Maze_Generator SHALL complete maze generation within 500 milliseconds.

### Requirement 3: Player Movement and Navigation

**User Story:** As a player, I want to move through the maze using arrow keys or swipe gestures, so that I can navigate on both desktop and mobile.

#### Acceptance Criteria

1. WHEN the player presses an arrow key (Up, Down, Left, Right), THE Game_Page SHALL move the Player_Avatar one cell in the corresponding direction.
2. WHEN the player performs a swipe gesture on a touch device, THE Game_Page SHALL move the Player_Avatar one cell in the swipe direction.
3. IF the Player_Avatar attempts to move into a wall cell, THEN THE Game_Page SHALL keep the Player_Avatar in its current position.
4. IF the Player_Avatar attempts to move into a cell blocked by a Dead_End_Penalty, THEN THE Game_Page SHALL keep the Player_Avatar in its current position.
5. THE Game_Page SHALL display the Player_Avatar's current position on the Maze_Grid with a visible highlight or character sprite.
6. THE Game_Page SHALL render the Maze_Grid with visible walls, open paths, Math_Gate indicators, and Collectible indicators.

### Requirement 4: Math Gate Interaction

**User Story:** As a player, I want to solve math equations at gates to open paths, so that the game tests my math skills as I navigate.

#### Acceptance Criteria

1. WHEN the Player_Avatar moves onto a cell containing a Math_Gate, THE Game_Page SHALL display the Gate_Prompt with the gate's equation and a numeric input field.
2. WHEN the player submits a correct answer to the Gate_Prompt, THE Game_Page SHALL open the Math_Gate, remove the gate indicator from the cell, and allow the Player_Avatar to proceed.
3. WHEN the player submits an incorrect answer to the Gate_Prompt, THE Game_Page SHALL apply the Dead_End_Penalty by permanently blocking that gate's path and display feedback indicating the answer was wrong.
4. WHEN the player submits an incorrect answer, THE Game_Page SHALL display the correct answer for 2 seconds before closing the Gate_Prompt.
5. WHILE the Gate_Prompt is displayed, THE Countdown_Timer SHALL continue counting down.
6. WHEN Difficulty_Level is Easy, THE Math_Gate SHALL generate addition and subtraction equations with operands up to 20.
7. WHEN Difficulty_Level is Medium, THE Math_Gate SHALL generate addition, subtraction, multiplication, and division equations with operands up to 50.
8. WHEN Difficulty_Level is Hard, THE Math_Gate SHALL generate equations including multiplication, division, powers, square roots, and simple single-variable algebra (e.g., 3x + 5 = 20, solve for x).

### Requirement 5: Countdown Timer and Game Completion

**User Story:** As a player, I want a countdown timer that adds urgency, so that faster solving leads to a higher score.

#### Acceptance Criteria

1. WHEN the game session starts, THE Countdown_Timer SHALL begin at 180 seconds for Easy, 240 seconds for Medium, and 300 seconds for Hard.
2. WHILE the game is in progress, THE Game_Page SHALL display the Countdown_Timer in minutes and seconds format.
3. WHEN the Countdown_Timer reaches 30 seconds remaining, THE Game_Page SHALL visually indicate urgency by changing the timer display color to red.
4. WHEN the Countdown_Timer reaches zero, THE Game_Page SHALL end the game session and display the results screen with a "Time's Up" message.
5. WHEN the Player_Avatar reaches the exit cell, THE Game_Page SHALL end the game session and display the results screen with a "Maze Complete" message.
6. IF all paths to the exit cell are blocked by Dead_End_Penalties, THEN THE Game_Page SHALL end the game session and display the results screen with a "No Path Available" message.

### Requirement 6: Collectibles and Bonus Scoring

**User Story:** As a player, I want to collect bonus items in the maze for extra points, so that I am rewarded for exploring.

#### Acceptance Criteria

1. THE Maze_Generator SHALL place between 3 and 8 Collectibles in the Maze_Grid, scaled by Difficulty_Level.
2. WHEN the Player_Avatar moves onto a cell containing a Collectible, THE Game_Page SHALL award bonus points and remove the Collectible from the cell.
3. WHEN a Collectible is collected, THE Game_Page SHALL display a brief visual animation and update the score display.
4. THE Game_Page SHALL display the count of collected Collectibles out of the total available.

### Requirement 7: Scoring and Leaderboard Integration

**User Story:** As a player, I want my score calculated based on speed, accuracy, and difficulty, so that I can compete on the leaderboard.

#### Acceptance Criteria

1. WHEN the game session ends, THE Score_Calculator SHALL compute the final score using the formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus.
2. THE Score_Calculator SHALL set the Difficulty Multiplier to 1.0 for Easy, 1.5 for Medium, and 2.0 for Hard.
3. THE Score_Calculator SHALL compute the Speed Bonus based on remaining time relative to the total time allowed.
4. THE Score_Calculator SHALL compute the Accuracy Bonus based on the ratio of correctly answered Math_Gates to total Math_Gates attempted.
5. THE Score_Calculator SHALL add Collectible bonus points to the final score after applying the base formula.
6. WHEN the game session ends, THE Game_Page SHALL display the ScoreBreakdownModal showing base score, difficulty multiplier, speed bonus, accuracy bonus, collectible bonus, and final score.
7. WHEN the game session ends, THE Game_Service SHALL record the game result and update the leaderboard.
8. THE Game_Service SHALL use the themeId "MATH_MAZE" to distinguish Math Maze scores from other games.

### Requirement 8: Backend Game Session Management

**User Story:** As a platform operator, I want Math Maze sessions tracked and rate-limited like other games, so that the system remains fair and consistent.

#### Acceptance Criteria

1. WHEN the player starts a Math Maze game, THE Game_Service SHALL create a new game session with themeId "MATH_MAZE" and the selected difficulty.
2. THE Game_Service SHALL enforce the same rate limiting rules as other DashDen games for Math Maze sessions.
3. IF the rate limit is exceeded, THEN THE Game_Page SHALL redirect the player to the rate limit page.
4. WHEN the game session completes, THE Game_Service SHALL receive completion data including completion time, gates attempted, gates solved, and collectibles gathered.

### Requirement 9: Internationalization

**User Story:** As a non-English-speaking player, I want the game UI in my language, so that I can play comfortably.

#### Acceptance Criteria

1. THE Setup_Page SHALL display all labels, descriptions, and button text using react-i18next translation keys.
2. THE Game_Page SHALL display all UI text (timer label, score label, gate prompt instructions, feedback messages, completion messages) using react-i18next translation keys.
3. THE Game_Page SHALL support English, Spanish, and Portuguese translations for all user-facing text.

### Requirement 10: Accessibility and Responsive Design

**User Story:** As a player using different devices or assistive technology, I want the game to be usable and navigable, so that the experience is inclusive.

#### Acceptance Criteria

1. THE Game_Page SHALL support keyboard-only navigation through the maze using arrow keys.
2. THE Gate_Prompt input field SHALL be focusable and operable via keyboard with visible focus indicators.
3. THE Game_Page SHALL use ARIA labels on interactive elements including the maze grid, gate prompt, timer, and score displays.
4. THE Game_Page SHALL render responsively, adapting the Maze_Grid cell size to fit screens from 320px to 1920px wide.
5. WHEN the viewport width is below 768px, THE Game_Page SHALL use touch-optimized controls with larger tap targets for mobile play.

### Requirement 11: Game Catalog Registration

**User Story:** As a platform operator, I want Math Maze listed in the Game Hub, so that players can discover and play the game.

#### Acceptance Criteria

1. THE Game_Service SHALL register Math Maze in the DynamoDB game catalog table with gameId "math-maze", a title, description, icon, route, status "ACTIVE", and appropriate displayOrder.
2. THE GameHubPage SHALL display Math Maze in the "Science & Math" filter category.
3. WHEN the player clicks the Math Maze tile in the Game Hub, THE GameHubPage SHALL navigate to the Math Maze Setup_Page.
