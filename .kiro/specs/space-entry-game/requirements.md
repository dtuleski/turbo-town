# Requirements Document

## Introduction

A new web-based atmospheric reentry game for DashDen where players calculate entry angles and target coordinates to land a spaceship safely on Earth. The game combines simplified orbital physics, real-world geography, and resource management (heat shield integrity). Each mission assigns a random real-world target location; the player adjusts the angle of inclination, manages heat shield integrity, and accounts for regional atmospheric density to achieve a safe landing. Outcomes include Successful Landing, Orbital Burn-up (angle too steep / heat shield failure), or Skip-off (angle too shallow). A "Mission Control" UI displays the trajectory against a globe/map visualization. Three difficulty levels control variable count, tolerance ranges, and heat shield capacity. Scoring follows the standard DashDen formula (base score × difficulty multiplier × speed bonus × accuracy bonus) with additional weighting for landing accuracy and heat shield remaining. The game integrates with the existing startGame/completeGame API, ScoreBreakdownModal, leaderboard, i18n (en/es/pt), rate limiting, daily email, and game catalog infrastructure.

## Glossary

- **Space_Entry_Game**: The new atmospheric reentry game within DashDen
- **Setup_Page**: The pre-game screen where the player selects a difficulty level before starting a mission
- **Game_Page**: The main gameplay screen where the player configures reentry parameters and executes the landing attempt
- **Mission_Control_UI**: The primary interface on the Game_Page displaying the globe/map visualization, trajectory arc, and instrument panels
- **Trajectory_Calculator**: The pure function that takes entry angle and velocity as inputs and returns a Landing_Zone_Accuracy score and outcome
- **Entry_Angle**: The angle of inclination (in degrees) at which the spacecraft enters the atmosphere; the primary player input
- **Heat_Shield**: A resource that degrades during reentry; steeper angles and higher atmospheric density increase degradation rate
- **Heat_Shield_Integrity**: A percentage (0–100) representing the remaining capacity of the Heat_Shield
- **Atmospheric_Density**: A numeric modifier derived from the target landing zone's elevation or climate zone; affects heat shield degradation and trajectory deviation
- **Landing_Zone**: A pre-defined real-world geographic location with associated latitude, longitude, elevation, biome, and a geography fact
- **Target_Location**: The randomly assigned Landing_Zone the player must land near for a given mission
- **Landing_Zone_Accuracy**: A score (0–100) representing how close the actual landing point is to the Target_Location center, computed as a function of distance
- **Geography_Fact**: A short educational text about a Landing_Zone's biome, climate, or cultural significance, displayed on successful landing
- **Outcome**: The result of a reentry attempt — one of Successful_Landing, Orbital_Burn_Up, or Skip_Off
- **Successful_Landing**: Outcome when the spacecraft lands within acceptable parameters and the Heat_Shield_Integrity remains above zero
- **Orbital_Burn_Up**: Outcome when the Entry_Angle is too steep, causing excessive heat and Heat_Shield failure
- **Skip_Off**: Outcome when the Entry_Angle is too shallow, causing the spacecraft to bounce off the atmosphere
- **Difficulty_Level**: One of Easy, Medium, or Hard, controlling variable count, tolerance ranges, heat shield capacity, and atmospheric turbulence
- **Game_Service**: The existing DashDen backend Lambda that handles game session tracking, scoring, and rate limiting
- **Score_Calculator**: The existing DashDen service that computes scores using the formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
- **Leaderboard**: The existing DashDen ranking system that displays top scores per game
- **Game_Catalog**: The DynamoDB table listing all available games shown in the Game Hub
- **ScoreBreakdownModal**: The existing shared modal component that displays score breakdown, leaderboard rank, star rating, and action buttons after game completion
- **Daily_Email**: The existing DashDen Lambda that sends personalized daily digest emails to opted-in users

## Requirements

### Requirement 1: Game Setup — Difficulty Selection

**User Story:** As a player, I want to choose a difficulty level before starting a Space Entry mission, so that I can play at a challenge level appropriate for my skill.

#### Acceptance Criteria

1. THE Setup_Page SHALL display three difficulty options: Easy, Medium, and Hard.
2. THE Setup_Page SHALL display a description for each difficulty: Easy ("Wider angle tolerance, stronger heat shield, fewer variables"), Medium ("All variables active, moderate tolerances"), and Hard ("Tight tolerances, atmospheric turbulence, limited heat shield").
3. WHEN the player selects a difficulty and clicks the start button, THE Space_Entry_Game SHALL navigate to the Game_Page with the selected difficulty as a URL query parameter.
4. WHILE the player has not selected a difficulty, THE Setup_Page SHALL disable the start button.
5. THE Setup_Page SHALL display all text labels using the current locale from react-i18next.
6. THE Setup_Page SHALL use a space-themed gradient background and visual styling consistent with the DashDen design language.

### Requirement 2: Game Session Initialization

**User Story:** As a player, I want the game to register my session with the backend when I start playing, so that my score and progress are tracked.

#### Acceptance Criteria

1. WHEN the Game_Page loads, THE Space_Entry_Game SHALL call the Game_Service startGame mutation with themeId "SPACE_ENTRY" and the corresponding difficulty value (Easy=1, Medium=2, Hard=3).
2. IF the Game_Service returns a rate limit error, THEN THE Space_Entry_Game SHALL redirect the player to the rate limit page.
3. WHEN the Game_Service returns a valid game session, THE Space_Entry_Game SHALL store the gameId for use during game completion.

### Requirement 3: Target Location Assignment

**User Story:** As a player, I want each mission to assign a random real-world target location, so that every game feels unique and educational.

#### Acceptance Criteria

1. WHEN a new mission begins, THE Space_Entry_Game SHALL randomly select a Target_Location from the pre-defined set of Landing_Zones.
2. THE Space_Entry_Game SHALL maintain a minimum of 20 pre-defined Landing_Zones spanning all major continents and climate zones.
3. THE Mission_Control_UI SHALL display the Target_Location name, latitude, longitude, and a visual marker on the globe/map visualization.
4. THE Space_Entry_Game SHALL store each Landing_Zone with the following data: name, latitude, longitude, elevation (meters), biome, Atmospheric_Density modifier, and Geography_Fact.

### Requirement 4: Player Input Controls

**User Story:** As a player, I want to adjust reentry parameters through intuitive controls, so that I can attempt a precise landing.

#### Acceptance Criteria

1. THE Mission_Control_UI SHALL display an Entry_Angle input control allowing the player to set the angle of inclination between 0 and 90 degrees.
2. THE Mission_Control_UI SHALL display the current Heat_Shield_Integrity as a percentage gauge (0–100%).
3. WHILE the difficulty is Easy, THE Space_Entry_Game SHALL set the initial Heat_Shield_Integrity to 100% and display only the Entry_Angle input.
4. WHILE the difficulty is Medium, THE Space_Entry_Game SHALL set the initial Heat_Shield_Integrity to 80% and display the Entry_Angle input and the Atmospheric_Density value for the Target_Location.
5. WHILE the difficulty is Hard, THE Space_Entry_Game SHALL set the initial Heat_Shield_Integrity to 60% and display the Entry_Angle input, the Atmospheric_Density value, and an atmospheric turbulence warning indicator.
6. THE Mission_Control_UI SHALL display the Atmospheric_Density value for the current Target_Location as a read-only informational panel when the difficulty is Medium or Hard.
7. THE Entry_Angle input SHALL update the trajectory preview on the globe/map visualization in real time as the player adjusts the value.

### Requirement 5: Trajectory Calculation

**User Story:** As a player, I want the game to compute my landing outcome based on physics, so that the gameplay feels realistic and educational.

#### Acceptance Criteria

1. THE Trajectory_Calculator SHALL accept Entry_Angle (degrees) and a base velocity constant as inputs and return a Landing_Zone_Accuracy score (0–100) and an Outcome.
2. WHEN the Entry_Angle is within the acceptable range for the current difficulty, THE Trajectory_Calculator SHALL return a Successful_Landing Outcome.
3. WHEN the Entry_Angle exceeds the steep threshold for the current difficulty, THE Trajectory_Calculator SHALL return an Orbital_Burn_Up Outcome.
4. WHEN the Entry_Angle is below the shallow threshold for the current difficulty, THE Trajectory_Calculator SHALL return a Skip_Off Outcome.
5. WHILE the difficulty is Easy, THE Trajectory_Calculator SHALL use an acceptable Entry_Angle range of 5 to 12 degrees with a ±3-degree tolerance.
6. WHILE the difficulty is Medium, THE Trajectory_Calculator SHALL use an acceptable Entry_Angle range of 5.5 to 9 degrees with a ±1.5-degree tolerance.
7. WHILE the difficulty is Hard, THE Trajectory_Calculator SHALL use an acceptable Entry_Angle range of 6 to 8 degrees with a ±0.5-degree tolerance and apply a random atmospheric turbulence offset between -0.5 and +0.5 degrees.
8. THE Trajectory_Calculator SHALL compute Landing_Zone_Accuracy as a function of the angular deviation from the ideal entry angle, where zero deviation yields 100 and maximum tolerated deviation yields 0.
9. THE Trajectory_Calculator SHALL be implemented as a pure function with no side effects to enable property-based testing.

### Requirement 6: Heat Shield Degradation

**User Story:** As a player, I want the heat shield to degrade realistically during reentry, so that I must manage this resource carefully.

#### Acceptance Criteria

1. WHEN the player initiates reentry, THE Space_Entry_Game SHALL compute Heat_Shield degradation based on the Entry_Angle steepness and the Target_Location Atmospheric_Density modifier.
2. THE Space_Entry_Game SHALL compute degradation using the formula: degradation = base_rate × (Entry_Angle / reference_angle) × Atmospheric_Density modifier, where base_rate is a constant per difficulty.
3. IF the Heat_Shield_Integrity reaches zero during reentry, THEN THE Space_Entry_Game SHALL override the Outcome to Orbital_Burn_Up regardless of the Entry_Angle.
4. WHEN the Outcome is Successful_Landing, THE Space_Entry_Game SHALL display the remaining Heat_Shield_Integrity as part of the mission results.
5. THE Space_Entry_Game SHALL animate the Heat_Shield_Integrity gauge decreasing during the reentry animation sequence.

### Requirement 7: Reentry Animation and Visualization

**User Story:** As a player, I want to see my spacecraft's trajectory animated on a globe, so that the experience is visually engaging and educational.

#### Acceptance Criteria

1. THE Mission_Control_UI SHALL display a globe or map visualization showing the spacecraft's orbital path and the Target_Location marker.
2. WHEN the player initiates reentry, THE Mission_Control_UI SHALL animate the spacecraft descending along the computed trajectory arc toward the landing point.
3. WHEN the Outcome is Orbital_Burn_Up, THE Mission_Control_UI SHALL display a burn-up animation with fire and breakup visual effects.
4. WHEN the Outcome is Skip_Off, THE Mission_Control_UI SHALL display a skip-off animation showing the spacecraft bouncing away from the atmosphere.
5. WHEN the Outcome is Successful_Landing, THE Mission_Control_UI SHALL display a landing animation with parachute deployment and touchdown visual effects.
6. THE reentry animation SHALL last between 3 and 6 seconds to maintain engagement without excessive waiting.

### Requirement 8: Landing Results and Geography Facts

**User Story:** As a player, I want to learn about the region where I landed, so that the game is educational beyond physics.

#### Acceptance Criteria

1. WHEN the Outcome is Successful_Landing, THE Space_Entry_Game SHALL display a results overlay showing the Target_Location name, the Landing_Zone_Accuracy score, the remaining Heat_Shield_Integrity, and the Geography_Fact for that location.
2. WHEN the Outcome is Orbital_Burn_Up, THE Space_Entry_Game SHALL display a failure overlay with the message "Orbital Burn-up — Entry angle too steep" and the Heat_Shield_Integrity at failure.
3. WHEN the Outcome is Skip_Off, THE Space_Entry_Game SHALL display a failure overlay with the message "Skip-off — Entry angle too shallow" and the Entry_Angle used.
4. THE results overlay SHALL include a "See Score" button for successful landings and a "Try Again" button for all outcomes.
5. THE Geography_Fact SHALL contain between 1 and 3 sentences describing the biome, climate, or cultural significance of the Landing_Zone.

### Requirement 9: Score Submission and Breakdown

**User Story:** As a player, I want to see my score after a successful mission, so that I can track my improvement and compare with others on the leaderboard.

#### Acceptance Criteria

1. WHEN the player clicks "See Score" after a Successful_Landing, THE Space_Entry_Game SHALL call the Game_Service completeGame mutation with gameId, completionTime (total seconds from mission start to landing), attempts (1 for success on first try, incremented for retries within the session), correctAnswers (1 for successful landing, 0 for failure), and totalQuestions (1).
2. WHEN the Game_Service returns the score breakdown, THE Space_Entry_Game SHALL display the ScoreBreakdownModal with the score breakdown, leaderboard rank, a "Play Again" option that navigates to the Setup_Page, and the gameType "SPACE_ENTRY".
3. THE Space_Entry_Game SHALL track total elapsed time from mission start using a running timer visible to the player during gameplay.
4. WHEN the player clicks "Try Again" after a failure, THE Space_Entry_Game SHALL reset the mission with the same Target_Location and difficulty, increment the attempts counter, and allow the player to adjust parameters and retry.

### Requirement 10: Scoring Integration

**User Story:** As a player, I want my Space Entry score calculated consistently with other DashDen games, so that leaderboard rankings are fair across games.

#### Acceptance Criteria

1. THE Score_Calculator SHALL compute the Space Entry final score using the standard DashDen formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus.
2. THE Score_Calculator SHALL apply difficulty multipliers of 1.0x for Easy, 1.5x for Medium, and 2.0x for Hard.
3. THE Score_Calculator SHALL compute the speed bonus based on total completion time relative to the maximum allowed time.
4. THE Score_Calculator SHALL compute the accuracy bonus using the Landing_Zone_Accuracy score (0–100) normalized to a 0–1 ratio.

### Requirement 11: Landing Zone Data Module

**User Story:** As a developer, I want landing zone data organized in a maintainable module, so that new locations can be added easily.

#### Acceptance Criteria

1. THE Space_Entry_Game SHALL store all Landing_Zone data in a dedicated TypeScript data module at a predictable path under the game's source directory.
2. THE Landing_Zone data module SHALL export an array of Landing_Zone objects, each containing: id (string), name (string), latitude (number), longitude (number), elevation (number in meters), biome (string), atmosphericDensity (number between 0.5 and 2.0), and geographyFact (string).
3. THE Landing_Zone data module SHALL contain a minimum of 20 entries covering locations across North America, South America, Europe, Africa, Asia, and Oceania.
4. THE Landing_Zone data module SHALL include locations with varied elevations (sea level to high altitude) and biomes (desert, tropical, tundra, temperate, mountain) to provide diverse Atmospheric_Density values.

### Requirement 12: Game Catalog Registration

**User Story:** As a platform operator, I want the Space Entry game listed in the Game Hub, so that players can discover and launch the game.

#### Acceptance Criteria

1. THE Game_Catalog SHALL contain an entry for the Space Entry game with gameId "space-entry", title "Space Entry", a descriptive description, the rocket emoji (🚀) as icon, route "/space-entry/setup", status "ACTIVE", an appropriate displayOrder, ageRange, and category.
2. THE Game_Hub filter map SHALL include "space-entry" in the "Science & Math" category.

### Requirement 13: Internationalization (i18n)

**User Story:** As a player who speaks Spanish or Portuguese, I want the game fully translated, so that I can play in my preferred language.

#### Acceptance Criteria

1. THE Space_Entry_Game SHALL use react-i18next for all user-facing text including difficulty labels, UI buttons, instrument panel labels, outcome messages, results overlay text, and Geography_Facts.
2. THE Space_Entry_Game SHALL provide complete translations in English (en), Spanish (es), and Portuguese (pt) locale files.
3. WHEN the player changes the application language, THE Space_Entry_Game SHALL immediately reflect the new language for all displayed text without requiring a page reload.

### Requirement 14: Routing and Navigation

**User Story:** As a player, I want to navigate to and from the Space Entry game using standard DashDen navigation, so that the experience is consistent with other games.

#### Acceptance Criteria

1. THE Space_Entry_Game SHALL register two routes: "/space-entry/setup" for the Setup_Page and "/space-entry/game" for the Game_Page.
2. WHEN the player clicks the back button on the Game_Page, THE Space_Entry_Game SHALL navigate to the Setup_Page.
3. WHEN the player completes the game and closes the ScoreBreakdownModal, THE Space_Entry_Game SHALL navigate to the Game Hub.
4. THE ROUTES constant in the application configuration SHALL include SPACE_ENTRY_SETUP and SPACE_ENTRY_GAME entries.

### Requirement 15: Responsiveness and Accessibility

**User Story:** As a player using different devices, I want the game to work well on both desktop and mobile screens, so that I can play comfortably on any device.

#### Acceptance Criteria

1. THE Space_Entry_Game SHALL render a responsive layout that adapts to screen widths from 375px (mobile) to 1440px (desktop).
2. THE Mission_Control_UI SHALL rearrange instrument panels and the globe visualization to stack vertically on narrow screens and display side-by-side on wide screens.
3. THE Space_Entry_Game SHALL provide sufficient color contrast and non-color-only indicators for all outcome states (Successful_Landing, Orbital_Burn_Up, Skip_Off) so that color-blind players can distinguish results.
4. THE Entry_Angle input and all interactive controls SHALL be accessible via keyboard navigation and include appropriate ARIA labels.
5. THE globe/map visualization SHALL scale proportionally to fit the available viewport without horizontal scrolling.

### Requirement 16: Backend Leaderboard Integration

**User Story:** As a player, I want to see Space Entry scores on the leaderboard and filter by this game, so that I can compete with other players.

#### Acceptance Criteria

1. THE Game_Service SHALL include "SPACE_ENTRY" in its list of recognized themeIds for validation, accuracy calculation, and event publishing.
2. THE Leaderboard_Service SHALL include "SPACE_ENTRY" in its GameType enum so that leaderboard queries accept this game type.
3. THE Leaderboard frontend dropdown SHALL include a "Space Entry" option with the rocket emoji (🚀).
4. THE Dashboard RecentImprovements component SHALL include a "SPACE_ENTRY" entry in its game type map.
5. THE DynamoDB themes table SHALL contain a "SPACE_ENTRY" entry with status "PUBLISHED" so that startGame succeeds.
6. THE Daily_Email Lambda SHALL include "SPACE_ENTRY" in its ALL_GAMES list and GAME_NAMES map so that Space Entry activity appears in daily digest emails.

### Requirement 17: Trajectory Calculator Correctness

**User Story:** As a developer, I want the trajectory calculator to be thoroughly tested, so that game outcomes are deterministic and fair.

#### Acceptance Criteria

1. FOR ALL valid Entry_Angle inputs (0–90 degrees), THE Trajectory_Calculator SHALL return exactly one of the three Outcomes: Successful_Landing, Orbital_Burn_Up, or Skip_Off.
2. FOR ALL Entry_Angle inputs within the acceptable range for a given difficulty, THE Trajectory_Calculator SHALL return Successful_Landing with a Landing_Zone_Accuracy between 0 and 100 inclusive.
3. FOR ALL difficulty levels, THE Trajectory_Calculator SHALL produce monotonically decreasing Landing_Zone_Accuracy as the Entry_Angle deviates further from the ideal angle.
4. THE Trajectory_Calculator SHALL produce identical outputs for identical inputs when no turbulence is applied (deterministic behavior for Easy and Medium difficulties).
5. FOR ALL Landing_Zone_Accuracy values, THE value SHALL be a number between 0 and 100 inclusive.
