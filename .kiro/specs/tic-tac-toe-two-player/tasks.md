# Implementation Plan: Tic Tac Toe Two-Player Mode

## Overview

Add a local Two-Player (hot-seat) mode to the existing Tic Tac Toe game. The implementation modifies two existing components (setup page and game page) to support a `mode=two-player` URL parameter that enables alternating human turns, session-only tally tracking, no backend calls, and unlimited rounds.

## Tasks

- [x] 1. Add Two-Player option to the Setup Page
  - [x] 1.1 Add Two-Player mode selection card to TicTacToeSetupPage
    - Add a "Two Player" option card visually distinguished from AI difficulty cards (use 👥 emoji, distinct color/section separator)
    - On selection, navigate to the game page with `?mode=two-player` search param
    - Ensure the existing Easy/Medium/Hard options still navigate with `?difficulty=` param as before
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement Two-Player game logic in TicTacToeGamePage
  - [x] 2.1 Add mode detection and conditional initialization
    - Read `mode` from URL search params: `const mode = searchParams.get('mode')`
    - Derive `isTwoPlayer = mode === 'two-player'`
    - When `isTwoPlayer` is true, skip the `startGame` API call in the `useEffect` initialization
    - Add new state: `activePlayer` ('X' | 'O'), initialized to 'X'
    - Add session tally state: `{ player1Wins: 0, player2Wins: 0, ties: 0 }`
    - Fallback: if `mode` is not 'two-player' and no valid `difficulty` param, default to AI mode with 'easy'
    - _Requirements: 2.1, 3.1, 5.2_

  - [x] 2.2 Implement two-player turn alternation and cell click handling
    - In two-player mode, `handleCellClick` places the `activePlayer` marker ('X' or 'O') on the clicked cell
    - After a valid move (no winner, board not full), toggle `activePlayer` between 'X' and 'O'
    - Guard against clicks on occupied cells or when game phase is not 'playing'
    - Disable the AI move `useEffect` when `isTwoPlayer` is true
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 2.3 Implement turn indicator for two-player mode
    - Display a turn indicator showing "Player 1 (X)" or "Player 2 (O)" based on `activePlayer`
    - Use distinct styling (e.g., blue for Player 1, red for Player 2) to clearly indicate whose turn it is
    - _Requirements: 2.4_

  - [x] 2.4 Implement round-end handling and tally updates
    - On win by X: increment `tally.player1Wins`, display "Player 1 wins!"
    - On win by O: increment `tally.player2Wins`, display "Player 2 wins!"
    - On draw (board full, no winner): increment `tally.ties`, display "Tie!"
    - Show winning line highlight (reuse existing `winLine` logic)
    - Set `gamePhase` to 'round-end'
    - _Requirements: 4.4, 4.5, 4.6, 6.1_

  - [x] 2.5 Implement "Play Again" flow with unlimited rounds
    - Show "Play Again" button when `gamePhase === 'round-end'` in two-player mode
    - On click: reset board to empty, set `activePlayer` to 'X', clear `winLine`, set `gamePhase` to 'playing'
    - Do NOT enforce `ROUNDS_PER_GAME` limit — rounds continue indefinitely
    - Do NOT call `completeGame` API or show `ScoreBreakdownModal`
    - _Requirements: 6.2, 6.3, 6.4, 3.2, 3.3, 3.4_

  - [x] 2.6 Implement session tally display
    - Replace the AI mode scoreboard (wins/draws/losses/score) with a two-player tally display
    - Show: Player 1 (X) wins count, Player 2 (O) wins count, Ties count
    - Tally state is React component state only — discarded on unmount (navigation away)
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

  - [x] 2.7 Implement exit/back button for two-player mode
    - Display a back button that navigates to the setup page
    - Do NOT make any backend calls on exit
    - _Requirements: 7.1, 7.2_

- [x] 3. Checkpoint - Verify core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Write property-based tests for two-player game logic
  - [ ]* 4.1 Write property test for turn alternation
    - **Property 1: Turn Alternation**
    - Generate random valid board states, apply a move, verify activePlayer toggles
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 4.2 Write property test for active player enforcement
    - **Property 2: Active Player Enforcement**
    - Generate random game sequences, verify marker placed always matches activePlayer
    - **Validates: Requirements 2.4, 2.5**

  - [ ]* 4.3 Write property test for no backend calls
    - **Property 3: No Backend Calls in Two-Player Mode**
    - Generate random game sessions with mocked APIs, verify startGame/completeGame never called
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 4.4 Write property test for tally tracking
    - **Property 4: Tally Correctly Tracks Outcomes**
    - Generate random sequences of round outcomes, verify only the correct counter increments by 1
    - **Validates: Requirements 4.4, 4.5, 4.6**

  - [ ]* 4.5 Write property test for board reset
    - **Property 5: Board Reset Produces Initial State**
    - Generate random completed boards, apply playAgain, verify all cells null and activePlayer is 'X'
    - **Validates: Requirements 2.1, 6.3**

  - [ ]* 4.6 Write property test for no round limit
    - **Property 6: No Round Limit**
    - Generate random N > 0, simulate N rounds, verify round N+1 can start
    - **Validates: Requirements 6.4**

  - [ ]* 4.7 Write property test for correct result display
    - **Property 7: Correct Result Display**
    - Generate random terminal boards, verify correct result classification (P1 win, P2 win, or Tie)
    - **Validates: Requirements 6.1**

- [ ] 5. Write unit tests for two-player mode
  - [ ]* 5.1 Write unit tests for setup page and game page integration
    - Test: Setup page renders "Two Player" option card
    - Test: Clicking Two Player option navigates with `?mode=two-player`
    - Test: Game page does not call `startGame` when mode is two-player
    - Test: Game page does not render `ScoreBreakdownModal` in two-player mode
    - Test: Back button navigates to setup page without API calls
    - Test: "Play Again" button appears after round end in two-player mode
    - Test: Tally initializes to all zeros on mount
    - Test: Invalid/missing mode parameter defaults to AI mode
    - _Requirements: 1.1, 1.2, 3.1, 3.4, 7.1, 7.2, 6.2, 5.2_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation is frontend-only — no backend or infrastructure changes required
- The existing AI mode logic must remain fully functional (regression safety)
- All tally state is in-memory React state, discarded on component unmount

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.6", "2.7"] },
    { "id": 3, "tasks": ["2.4"] },
    { "id": 4, "tasks": ["2.5"] },
    { "id": 5, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "5.1"] }
  ]
}
```
