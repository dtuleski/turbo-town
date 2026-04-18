# Requirements Document

## Introduction

A new Simon Says-style pattern recall game for DashDen where players memorize and reproduce sequences of items. The player selects a theme (Colors, Animals, Musical Notes, or Emojis) and a difficulty level on the setup page. The game displays a grid of items (4–6 depending on difficulty) and plays a pattern by lighting up items in sequence. The player must repeat the pattern by tapping items in the same order. Each round extends the sequence by one item. A wrong tap ends the game. Scoring follows the standard DashDen formula (base score × difficulty multiplier × speed bonus × accuracy bonus) and integrates with the existing startGame/completeGame API, ScoreBreakdownModal, leaderboard, i18n (en/es/pt), and rate limiting infrastructure.

## Glossary

- **Pattern_Recall_Game**: The new Simon Says-style pattern recall game within DashDen
- **Setup_Page**: The pre-game screen where the player selects a theme and difficulty before starting
- **Game_Page**: The main gameplay screen where the player watches and reproduces patterns
- **Theme**: A visual set of items used in the game; one of Colors, Animals, Musical_Notes, or Emojis
- **Item_Grid**: The set of interactive items displayed on the Game_Page (4, 5, or 6 items depending on difficulty)
- **Pattern_Sequence**: The ordered list of items the game plays back for the player to memorize each round
- **Playback_Phase**: The phase of a round where the game animates items in the Pattern_Sequence one at a time
- **Input_Phase**: The phase of a round where the player taps items to reproduce the Pattern_Sequence
- **Round**: A single cycle consisting of a Playback_Phase followed by an Input_Phase; each successive Round adds one item to the Pattern_Sequence
- **Playback_Speed**: The duration each item is highlighted during the Playback_Phase; varies by difficulty (Easy=800ms, Medium=600ms, Hard=400ms)
- **Game_Service**: The existing DashDen backend Lambda that handles game session tracking, scoring, and rate limiting
- **Score_Calculator**: The existing DashDen service that computes scores using the formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
- **Leaderboard**: The existing DashDen ranking system that displays top scores per game
- **Game_Catalog**: The DynamoDB table listing all available games shown in the Game Hub
- **ScoreBreakdownModal**: The existing shared modal component that displays score breakdown, leaderboard rank, star rating, and action buttons after game completion

## Requirements

### Requirement 1: Game Setup — Theme and Difficulty Selection

**User Story:** As a player, I want to choose a theme and difficulty level before starting the Pattern Recall game, so that I can customize the experience to my preference and skill level.

#### Acceptance Criteria

1. THE Setup_Page SHALL display four theme options: Colors, Animals, Musical_Notes, and Emojis.
2. THE Setup_Page SHALL display three difficulty options: Easy, Medium, and Hard.
3. THE Setup_Page SHALL display a description for each difficulty: Easy ("Slower playback, 4 items"), Medium ("Medium speed, 5 items"), and Hard ("Fast playback, 6 items").
4. WHEN the player selects both a theme and a difficulty and clicks the start button, THE Pattern_Recall_Game SHALL navigate to the Game_Page with the selected theme and difficulty as URL query parameters.
5. WHILE the player has not selected both a theme and a difficulty, THE Setup_Page SHALL disable the start button.
6. THE Setup_Page SHALL display all text labels using the current locale from react-i18next.

### Requirement 2: Game Session Initialization

**User Story:** As a player, I want the game to register my session with the backend when I start playing, so that my score and progress are tracked.

#### Acceptance Criteria

1. WHEN the Game_Page loads, THE Pattern_Recall_Game SHALL call the Game_Service startGame mutation with themeId "PATTERN_RECALL" and the corresponding difficulty value (Easy=1, Medium=2, Hard=3).
2. IF the Game_Service returns a rate limit error, THEN THE Pattern_Recall_Game SHALL redirect the player to the rate limit page.
3. WHEN the Game_Service returns a valid game session, THE Pattern_Recall_Game SHALL store the gameId for use during game completion.

### Requirement 3: Item Grid Display

**User Story:** As a player, I want to see a set of distinct items on screen based on my chosen theme, so that I can identify and tap them during gameplay.

#### Acceptance Criteria

1. WHILE the difficulty is Easy, THE Item_Grid SHALL display 4 items.
2. WHILE the difficulty is Medium, THE Item_Grid SHALL display 5 items.
3. WHILE the difficulty is Hard, THE Item_Grid SHALL display 6 items.
4. WHEN the theme is Colors, THE Item_Grid SHALL display colored buttons (e.g., Red, Blue, Green, Yellow, and additional colors for higher difficulties).
5. WHEN the theme is Animals, THE Item_Grid SHALL display animal icons or emoji representations.
6. WHEN the theme is Musical_Notes, THE Item_Grid SHALL display musical note symbols or instrument icons.
7. WHEN the theme is Emojis, THE Item_Grid SHALL display distinct emoji characters.
8. THE Item_Grid SHALL arrange items in a visually balanced layout that adapts to the number of items and the screen size.

### Requirement 4: Pattern Playback

**User Story:** As a player, I want the game to show me the pattern by highlighting items one at a time, so that I can memorize the sequence before reproducing it.

#### Acceptance Criteria

1. WHEN a new Round begins, THE Pattern_Recall_Game SHALL enter the Playback_Phase and animate each item in the Pattern_Sequence one at a time in order.
2. WHILE the difficulty is Easy, THE Playback_Speed SHALL be 800 milliseconds per item.
3. WHILE the difficulty is Medium, THE Playback_Speed SHALL be 600 milliseconds per item.
4. WHILE the difficulty is Hard, THE Playback_Speed SHALL be 400 milliseconds per item.
5. WHILE the Playback_Phase is active, THE Pattern_Recall_Game SHALL visually highlight the current item using a scale animation, brightness increase, or glow effect distinguishable from the idle state.
6. WHILE the Playback_Phase is active, THE Item_Grid SHALL disable player input to prevent taps during playback.
7. WHEN the Playback_Phase completes, THE Pattern_Recall_Game SHALL transition to the Input_Phase.

### Requirement 5: Pattern Sequence Generation

**User Story:** As a player, I want each round to extend the pattern by one item, so that the challenge increases progressively.

#### Acceptance Criteria

1. WHEN the game starts, THE Pattern_Recall_Game SHALL generate the first Pattern_Sequence containing exactly one randomly selected item from the Item_Grid.
2. WHEN a new Round begins after a successful round, THE Pattern_Recall_Game SHALL append one randomly selected item from the Item_Grid to the existing Pattern_Sequence.
3. THE Pattern_Recall_Game SHALL allow the same item to appear multiple times in the Pattern_Sequence.
4. THE Pattern_Recall_Game SHALL use a pseudo-random selection for each appended item, drawing uniformly from all items in the Item_Grid.

### Requirement 6: Player Input and Validation

**User Story:** As a player, I want to tap items to reproduce the pattern and receive immediate feedback, so that I know whether my recall is correct.

#### Acceptance Criteria

1. WHILE the Input_Phase is active, THE Item_Grid SHALL accept player taps on any item.
2. WHEN the player taps an item that matches the next expected item in the Pattern_Sequence, THE Pattern_Recall_Game SHALL display a brief correct-tap visual indicator (e.g., green flash) and advance to the next expected position.
3. WHEN the player taps an item that does not match the next expected item in the Pattern_Sequence, THE Pattern_Recall_Game SHALL end the game immediately.
4. WHEN the player successfully reproduces the entire Pattern_Sequence for the current Round, THE Pattern_Recall_Game SHALL display a brief success indicator and advance to the next Round.
5. WHEN the player taps an incorrect item, THE Pattern_Recall_Game SHALL display a brief wrong-tap visual indicator (e.g., red flash) before transitioning to the game-over state.

### Requirement 7: Game Over and Score Submission

**User Story:** As a player, I want to see my score after the game ends, so that I can track my improvement and compare with others on the leaderboard.

#### Acceptance Criteria

1. WHEN the game ends (incorrect tap), THE Pattern_Recall_Game SHALL display a game-over overlay showing the number of rounds completed and total time elapsed.
2. WHEN the player clicks "See Score" on the game-over overlay, THE Pattern_Recall_Game SHALL call the Game_Service completeGame mutation with gameId, completionTime (total seconds elapsed), attempts (total taps made), correctAnswers (rounds completed), and totalQuestions (rounds completed plus one, representing the failed round).
3. WHEN the Game_Service returns the score breakdown, THE Pattern_Recall_Game SHALL display the ScoreBreakdownModal with the score breakdown, leaderboard rank, a "Play Again" option that navigates to the Setup_Page, and the gameType "PATTERN_RECALL".
4. THE Pattern_Recall_Game SHALL track total elapsed time from the first Playback_Phase using a running timer visible to the player during gameplay.

### Requirement 8: Scoring Integration

**User Story:** As a player, I want my Pattern Recall score calculated consistently with other DashDen games, so that leaderboard rankings are fair across games.

#### Acceptance Criteria

1. THE Score_Calculator SHALL compute the Pattern Recall final score using the standard DashDen formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus.
2. THE Score_Calculator SHALL apply difficulty multipliers of 1.0x for Easy, 1.5x for Medium, and 2.0x for Hard.
3. THE Score_Calculator SHALL compute the speed bonus based on total completion time relative to the maximum allowed time.
4. THE Score_Calculator SHALL compute the accuracy bonus based on the ratio of correct answers (rounds completed) to total questions.

### Requirement 9: Game Catalog Registration

**User Story:** As a platform operator, I want the Pattern Recall game listed in the Game Hub, so that players can discover and launch the game.

#### Acceptance Criteria

1. THE Game_Catalog SHALL contain an entry for the Pattern Recall game with gameId "pattern-recall", title "Pattern Recall", a descriptive description, an appropriate icon emoji, route "/pattern-recall/setup", status "ACTIVE", an appropriate displayOrder, ageRange, and category.
2. THE Game_Hub filter map SHALL include "pattern-recall" in the "Puzzles & Logic" category.

### Requirement 10: Internationalization (i18n)

**User Story:** As a player who speaks Spanish or Portuguese, I want the game fully translated, so that I can play in my preferred language.

#### Acceptance Criteria

1. THE Pattern_Recall_Game SHALL use react-i18next for all user-facing text including theme names, difficulty labels, UI buttons, round indicators, success messages, error messages, and game-over text.
2. THE Pattern_Recall_Game SHALL provide complete translations in English (en), Spanish (es), and Portuguese (pt) locale files.
3. WHEN the player changes the application language, THE Pattern_Recall_Game SHALL immediately reflect the new language for all displayed text without requiring a page reload.

### Requirement 11: Routing and Navigation

**User Story:** As a player, I want to navigate to and from the Pattern Recall game using standard DashDen navigation, so that the experience is consistent with other games.

#### Acceptance Criteria

1. THE Pattern_Recall_Game SHALL register two routes: "/pattern-recall/setup" for the Setup_Page and "/pattern-recall/game" for the Game_Page.
2. WHEN the player clicks the back button on the Game_Page, THE Pattern_Recall_Game SHALL navigate to the Setup_Page.
3. WHEN the player completes the game and closes the ScoreBreakdownModal, THE Pattern_Recall_Game SHALL navigate to the Game Hub.
4. THE ROUTES constant in the application configuration SHALL include PATTERN_RECALL_SETUP and PATTERN_RECALL_GAME entries.

### Requirement 12: Responsiveness and Accessibility

**User Story:** As a player using different devices, I want the game to work well on both desktop and mobile screens, so that I can play comfortably on any device.

#### Acceptance Criteria

1. THE Pattern_Recall_Game SHALL render a responsive layout that adapts to screen widths from 375px (mobile) to 1440px (desktop).
2. THE Item_Grid SHALL scale item sizes proportionally to fit the available viewport without horizontal scrolling.
3. THE Pattern_Recall_Game SHALL provide sufficient color contrast and non-color-only indicators during playback and input feedback so that color-blind players can distinguish item states.
4. THE Item_Grid items SHALL be accessible via keyboard navigation and include appropriate ARIA labels describing each item.

### Requirement 13: Backend Leaderboard Integration

**User Story:** As a player, I want to see Pattern Recall scores on the leaderboard and filter by this game, so that I can compete with other players.

#### Acceptance Criteria

1. THE Game_Service SHALL include "PATTERN_RECALL" in its list of recognized themeIds for validation, accuracy calculation, and event publishing.
2. THE Leaderboard_Service SHALL include "PATTERN_RECALL" in its GameType enum so that leaderboard queries accept this game type.
3. THE Leaderboard frontend dropdown SHALL include a "Pattern Recall" option with an appropriate icon emoji.
4. THE Dashboard RecentImprovements component SHALL include a "PATTERN_RECALL" entry in its game type map.
5. THE DynamoDB themes table SHALL contain a "PATTERN_RECALL" entry with status "PUBLISHED" so that startGame succeeds.
6. THE Daily_Email Lambda SHALL include "PATTERN_RECALL" in its ALL_GAMES list and GAME_NAMES map so that Pattern Recall activity appears in daily digest emails.
