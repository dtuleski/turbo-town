# Requirements Document

## Introduction

This feature adds a Two-Player (hot-seat) mode to the existing Tic Tac Toe game. Two players alternate turns on the same device, playing as X and O respectively. This mode appears as a new difficulty option alongside Easy, Medium, and Hard. No scores are submitted to the backend or leaderboard. A running session tally tracks victories for each player and ties, resetting when either player leaves the game.

## Glossary

- **Game_Page**: The Tic Tac Toe game page component responsible for rendering the board, handling moves, and displaying results
- **Setup_Page**: The Tic Tac Toe setup/configuration page where the user selects difficulty or mode before starting a game
- **Two_Player_Mode**: A local multiplayer mode where two human players alternate turns on the same device without AI involvement
- **Session_Tally**: An in-memory counter tracking Player 1 wins, Player 2 wins, and ties for the current session
- **Player_1**: The human player using the X marker who always takes the first turn in each round
- **Player_2**: The human player using the O marker who always takes the second turn in each round

## Requirements

### Requirement 1: Two-Player Mode Selection

**User Story:** As a player, I want to select a Two-Player mode from the game setup screen, so that I can play against another person on the same device.

#### Acceptance Criteria

1. THE Setup_Page SHALL display a "Two Player" option alongside the existing Easy, Medium, and Hard difficulty options
2. WHEN a user selects the "Two Player" option, THE Setup_Page SHALL navigate to the Game_Page with a mode parameter indicating Two_Player_Mode
3. THE Setup_Page SHALL visually distinguish the Two-Player option from AI difficulty levels to indicate it is a different type of play

### Requirement 2: Alternating Player Turns

**User Story:** As a player, I want Player 1 (X) and Player 2 (O) to alternate turns on the same device, so that two people can play together locally.

#### Acceptance Criteria

1. WHEN a new round begins in Two_Player_Mode, THE Game_Page SHALL assign the first turn to Player_1 (X)
2. WHEN Player_1 places an X on the board, THE Game_Page SHALL switch the active turn to Player_2 (O)
3. WHEN Player_2 places an O on the board, THE Game_Page SHALL switch the active turn to Player_1 (X)
4. WHILE it is a given player's turn, THE Game_Page SHALL display a turn indicator showing which player (Player 1 or Player 2) is currently active
5. WHILE it is a given player's turn, THE Game_Page SHALL only accept input from the active player's marker placement

### Requirement 3: No Backend Score Submission

**User Story:** As the system owner, I want Two-Player mode to operate without backend calls, so that casual local games do not affect the leaderboard or scoring system.

#### Acceptance Criteria

1. WHEN Two_Player_Mode is selected, THE Game_Page SHALL NOT call the startGame API
2. WHEN a round or session ends in Two_Player_Mode, THE Game_Page SHALL NOT call the completeGame API
3. WHEN a game concludes in Two_Player_Mode, THE Game_Page SHALL NOT submit any score to the leaderboard service
4. WHEN a game concludes in Two_Player_Mode, THE Game_Page SHALL NOT display the ScoreBreakdownModal

### Requirement 4: Session Tally Display

**User Story:** As a player, I want to see a running tally of Player 1 wins, Player 2 wins, and ties during the session, so that we can track who is winning overall.

#### Acceptance Criteria

1. WHILE in Two_Player_Mode, THE Game_Page SHALL display the number of victories for Player_1 (X)
2. WHILE in Two_Player_Mode, THE Game_Page SHALL display the number of victories for Player_2 (O)
3. WHILE in Two_Player_Mode, THE Game_Page SHALL display the number of ties
4. WHEN Player_1 wins a round, THE Game_Page SHALL increment the Player_1 victory count by one
5. WHEN Player_2 wins a round, THE Game_Page SHALL increment the Player_2 victory count by one
6. WHEN a round ends in a tie, THE Game_Page SHALL increment the tie count by one

### Requirement 5: Session Tally Reset on Exit

**User Story:** As a player, I want the session tally to reset when I leave the game, so that each play session starts fresh.

#### Acceptance Criteria

1. WHEN a user navigates away from the Game_Page in Two_Player_Mode, THE Game_Page SHALL discard the Session_Tally
2. WHEN a user returns to the Game_Page in Two_Player_Mode after having left, THE Game_Page SHALL initialize the Session_Tally to zero for all counters (Player_1 wins, Player_2 wins, and ties)

### Requirement 6: Round Flow in Two-Player Mode

**User Story:** As a player, I want rounds to continue indefinitely until we choose to leave, so that we can play as many rounds as we want.

#### Acceptance Criteria

1. WHEN a round ends in Two_Player_Mode, THE Game_Page SHALL display the round result (Player 1 wins, Player 2 wins, or Tie)
2. WHEN a round ends in Two_Player_Mode, THE Game_Page SHALL present a "Play Again" button to start another round
3. WHEN the user clicks "Play Again", THE Game_Page SHALL reset the board to an empty state and begin a new round with Player_1's turn
4. THE Game_Page SHALL NOT enforce a fixed number of rounds in Two_Player_Mode

### Requirement 7: Exit Game

**User Story:** As a player, I want to be able to leave the Two-Player game at any time, so that I can return to the setup screen or hub.

#### Acceptance Criteria

1. WHILE in Two_Player_Mode, THE Game_Page SHALL display a back/exit button that navigates to the Setup_Page
2. WHEN the user clicks the back/exit button, THE Game_Page SHALL immediately navigate to the Setup_Page without any backend calls
