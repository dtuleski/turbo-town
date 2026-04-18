# Space Entry Game — Implementation Tasks

## Task 1: Core Utility Modules (Pure Logic)

- [x] 1.1 Create `apps/web/src/utils/spaceEntryConfig.ts` with `DifficultyConfig` interface and `DIFFICULTY_CONFIGS` record containing Easy (idealAngleMin: 5, idealAngleMax: 12, tolerance: 3, initialHeatShield: 100, baseDegradationRate: 15, referenceAngle: 8.5, turbulenceRange: 0), Medium (idealAngleMin: 5.5, idealAngleMax: 9, tolerance: 1.5, initialHeatShield: 80, baseDegradationRate: 25, referenceAngle: 7.25, turbulenceRange: 0), Hard (idealAngleMin: 6, idealAngleMax: 8, tolerance: 0.5, initialHeatShield: 60, baseDegradationRate: 35, referenceAngle: 7, turbulenceRange: 0.5). Export constants `ANIMATION_DURATION_MS`, `MAX_GAME_TIME_SECONDS`, `BASE_VELOCITY`.
  - _Requirements: 5.5, 5.6, 5.7, 4.3, 4.4, 4.5_

- [x] 1.2 Create `apps/web/src/utils/spaceEntryPhysics.ts` with pure functions: `calculateTrajectory(entryAngle, atmosphericDensity, config, turbulenceOffset?)` returning `TrajectoryResult` (outcome, landingZoneAccuracy 0–100, heatShieldRemaining 0–100, finalAngle), `calculateHeatShieldDegradation(entryAngle, atmosphericDensity, config)` returning degradation amount using formula `baseDegradationRate × (entryAngle / referenceAngle) × atmosphericDensity`, `calculateLandingAccuracy(entryAngle, idealAngle, tolerance)` returning 0–100 where zero deviation yields 100, `determineOutcome(effectiveAngle, config)` returning one of `SUCCESSFUL_LANDING`, `ORBITAL_BURN_UP`, `SKIP_OFF`. Heat shield depletion overrides outcome to `ORBITAL_BURN_UP`. Export `Outcome` and `TrajectoryResult` types.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.8, 5.9, 6.1, 6.2, 6.3, 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 1.3 Create `apps/web/src/utils/spaceEntryLandingZones.ts` with `LandingZone` interface (id, name, latitude, longitude, elevation, biome, atmosphericDensity, geographyFact) and `LANDING_ZONES` array containing 20+ real-world locations spanning North America, South America, Europe, Africa, Asia, and Oceania with varied elevations (sea level to 4000m+) and biomes (desert, tropical, tundra, temperate, mountain). Export `getRandomLandingZone()` function that returns a random member of the array.
  - _Requirements: 3.1, 3.2, 3.4, 11.1, 11.2, 11.3, 11.4_

## Task 2: Property-Based Tests for Core Utils

- [ ]* 2.1 [PBT] Property 1: Outcome exclusivity and accuracy bounds — for any entry angle (0–90), atmospheric density (0.5–2.0), and any difficulty config, `calculateTrajectory` returns exactly one of three outcomes and `landingZoneAccuracy` is between 0 and 100 inclusive.
  - **Property 1: Outcome exclusivity and accuracy bounds**
  - **Validates: Requirements 17.1, 17.5, 5.1**

- [ ]* 2.2 [PBT] Property 2: Acceptable angle range produces successful landing — for any entry angle within `[idealAngleMin - tolerance, idealAngleMax + tolerance]` and atmospheric density where heat shield does not reach zero, `calculateTrajectory` returns `SUCCESSFUL_LANDING` with accuracy 0–100.
  - **Property 2: Acceptable angle range produces successful landing**
  - **Validates: Requirements 17.2, 5.2**

- [ ]* 2.3 [PBT] Property 3: Landing accuracy monotonically decreases with angular deviation — for any two angles `a1` and `a2` within the acceptable range where `a1` is closer to the ideal midpoint than `a2`, `calculateLandingAccuracy` for `a1` >= value for `a2`.
  - **Property 3: Landing accuracy monotonically decreases with angular deviation**
  - **Validates: Requirements 17.3, 5.8**

- [ ]* 2.4 [PBT] Property 4: Determinism without turbulence — for any inputs where `turbulenceRange` is 0 (Easy/Medium), calling `calculateTrajectory` twice with identical inputs produces identical outputs.
  - **Property 4: Determinism without turbulence**
  - **Validates: Requirements 17.4, 5.9**

- [ ]* 2.5 [PBT] Property 5: Heat shield degradation formula correctness — for any entry angle (0–90), atmospheric density (0.5–2.0), and difficulty config, `calculateHeatShieldDegradation` returns `baseDegradationRate × (entryAngle / referenceAngle) × atmosphericDensity` and the value is non-negative.
  - **Property 5: Heat shield degradation formula correctness**
  - **Validates: Requirements 6.2, 6.1**

- [ ]* 2.6 [PBT] Property 6: Heat shield depletion overrides outcome to burn-up — for any entry angle that would normally produce `SUCCESSFUL_LANDING`, if computed degradation exceeds initial heat shield (remaining ≤ 0), `calculateTrajectory` returns `ORBITAL_BURN_UP`.
  - **Property 6: Heat shield depletion overrides outcome to burn-up**
  - **Validates: Requirements 6.3**

- [ ]* 2.7 [PBT] Property 7: Landing zone data integrity — for every zone in `LANDING_ZONES`: id is non-empty, name is non-empty, latitude is -90 to 90, longitude is -180 to 180, elevation is non-negative, biome is non-empty, atmosphericDensity is 0.5 to 2.0, geographyFact contains 1–3 sentences.
  - **Property 7: Landing zone data integrity**
  - **Validates: Requirements 3.4, 11.2, 8.5**

- [ ]* 2.8 [PBT] Property 8: Random zone selection validity — for any invocation of `getRandomLandingZone()`, the returned value is a member of the `LANDING_ZONES` array (id matches one of the zones).
  - **Property 8: Random zone selection validity**
  - **Validates: Requirements 3.1**

## Task 3: Checkpoint — Core Logic Verified

- [ ] 3. Ensure all tests pass, ask the user if questions arise.

## Task 4: Setup Page

- [x] 4.1 Create `apps/web/src/pages/space-entry/SpaceEntrySetupPage.tsx` — display three difficulty cards (Easy 🟢, Medium 🟡, Hard 🔴) with descriptions: Easy ("Wider angle tolerance, stronger heat shield, fewer variables"), Medium ("All variables active, moderate tolerances"), Hard ("Tight tolerances, atmospheric turbulence, limited heat shield"). Start button disabled until difficulty selected. On start, navigate to `ROUTES.SPACE_ENTRY_GAME + '?difficulty=' + selectedDifficulty`. Space-themed gradient background (`from-indigo-900 via-purple-900 to-black`). All text uses `t()` from react-i18next with keys under `spaceEntry.*`.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

## Task 5: Game Page

- [x] 5.1 Create `apps/web/src/pages/space-entry/SpaceEntryGamePage.tsx` — implement the full game lifecycle with phases: `setup`, `reentry`, `results`, `submitting`, `completed`. On mount: read difficulty from URL params (default to `easy` if missing), call `startGame({ themeId: 'SPACE_ENTRY', difficulty })`, handle rate limit redirect, select random `LandingZone`, start elapsed timer. During `setup` phase: render Mission Control UI with GlobeVisualization (CSS/SVG circular globe with continent outlines, target marker via `latLngToGlobeXY`), InstrumentPanel (target info, entry angle slider 0–90° step 0.1, atmospheric density display for Medium/Hard, turbulence warning for Hard, "Initiate Reentry" button), TrajectoryArc (SVG bezier path color-coded green/orange/red updating in real time), and heat shield gauge bar. On "Initiate Reentry": compute trajectory via `calculateTrajectory()` + `calculateHeatShieldDegradation()`, set phase to `reentry`. Play CSS keyframe reentry animation (3–6s): successful landing (descent → parachute → touchdown), burn-up (glow → breakup particles), skip-off (bounce away). After animation: set phase to `results`, show ResultsOverlay — success shows target name, accuracy, heat shield remaining, geography fact, "See Score" button; burn-up shows failure message + heat shield at failure + "Try Again"; skip-off shows failure message + angle used + "Try Again". On "See Score": call `completeGame(gameId, completionTime, attempts, 1, 1)`, show `ScoreBreakdownModal` with gameType `SPACE_ENTRY`. On "Try Again": reset to `setup` phase with same target, increment attempts. Responsive layout: side-by-side on md+, stacked on mobile. Keyboard accessible controls with ARIA labels. Sufficient color contrast for all outcome states.
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 15.1, 15.2, 15.3, 15.4, 15.5_

## Task 6: Routing and Hub Integration

- [x] 6.1 Add `SPACE_ENTRY_SETUP` and `SPACE_ENTRY_GAME` routes to `apps/web/src/config/constants.ts`
  - _Requirements: 14.1, 14.4_

- [x] 6.2 Add route entries and lazy imports to `apps/web/src/App.tsx` for SpaceEntrySetupPage and SpaceEntryGamePage
  - _Requirements: 14.1_

- [x] 6.3 Add `'space-entry': 'Science & Math'` to `GAME_FILTER_MAP` in `apps/web/src/pages/hub/GameHubPage.tsx`
  - _Requirements: 12.2_

## Task 7: Internationalization

- [x] 7.1 Add `spaceEntry` key block to `apps/web/src/locales/en.json` with all setup, game, instrument panel, outcome, results overlay, and feedback strings
  - _Requirements: 13.1, 13.2_

- [x] 7.2 Add `spaceEntry` key block to `apps/web/src/locales/es.json` with Spanish translations
  - _Requirements: 13.2_

- [x] 7.3 Add `spaceEntry` key block to `apps/web/src/locales/pt.json` with Portuguese translations
  - _Requirements: 13.2_

## Task 8: Checkpoint — Frontend Complete

- [ ] 8. Ensure all tests pass, ask the user if questions arise.

## Task 9: Backend Integration

- [x] 9.1 Add `'SPACE_ENTRY'` to the themeId validation arrays in `services/game/src/services/game.service.ts` (attempts validation skip list and accuracy calculation list)
  - _Requirements: 16.1_

- [x] 9.2 Add `SPACE_ENTRY = 'SPACE_ENTRY'` to the `GameType` enum in `services/leaderboard/src/types/index.ts`
  - _Requirements: 16.2_

- [x] 9.3 Add `SPACE_ENTRY = 'SPACE_ENTRY'` to the frontend `GameType` enum in `apps/web/src/api/leaderboard.ts`
  - _Requirements: 16.2_

- [x] 9.4 Add Space Entry entry to the leaderboard `GameTypeFilter.tsx` dropdown: `{ value: GameType.SPACE_ENTRY, label: 'Space Entry', icon: '🚀' }`
  - _Requirements: 16.3_

- [x] 9.5 Add `SPACE_ENTRY` entry to `gameTypeInfo` in `apps/web/src/components/dashboard/RecentImprovements.tsx`: `{ icon: '🚀', name: 'Space Entry' }`
  - _Requirements: 16.4_

- [x] 9.6 Add `'SPACE_ENTRY'` to `ALL_GAMES` array and `SPACE_ENTRY: '🚀 Space Entry'` to `GAME_NAMES` map in `services/game/src/daily-email.ts`
  - _Requirements: 16.6_

## Task 10: Game Catalog and DynamoDB Registration

- [x] 10.1 Create a DynamoDB seed script or document the `PutItem` commands to seed the `SPACE_ENTRY` entry in the themes table with status `PUBLISHED`, and register Space Entry in the game catalog with gameId `space-entry`, title `Space Entry`, description, icon `🚀`, route `/space-entry/setup`, status `ACTIVE`, displayOrder `18`, ageRange `8+`, category `Science & Math`
  - _Requirements: 12.1, 16.5_

## Task 11: Unit Tests (Example-Based)

- [ ]* 11.1 Write unit tests for SpaceEntrySetupPage: renders 3 difficulty options with correct labels and descriptions, Start button disabled until selection, navigates with correct query param on start
  - _Requirements: 1.1, 1.2, 1.4_

- [ ]* 11.2 Write unit tests for SpaceEntryGamePage: calls startGame on mount with correct themeId and difficulty, redirects on rate limit error, displays correct initial heat shield per difficulty (100/80/60), shows/hides atmospheric density and turbulence per difficulty, entry angle slider updates trajectory preview, "Try Again" resets state with same target and increments attempts, "See Score" calls completeGame with correct params, shows ScoreBreakdownModal on completion
  - _Requirements: 2.1, 2.2, 4.2, 4.3, 4.4, 4.5, 4.7, 9.1, 9.2, 9.4_

- [ ]* 11.3 Write unit tests for ResultsOverlay: success shows target name, accuracy, heat shield, geography fact, "See Score" button; burn-up shows failure message, heat shield at failure, "Try Again" button; skip-off shows failure message, entry angle used, "Try Again" button
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

## Task 12: Final Checkpoint

- [ ] 12. Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 8 universal correctness properties from the design document
- Unit tests validate specific UI behaviors and integration points
- The physics engine is pure functions — ideal for property-based testing with fast-check
