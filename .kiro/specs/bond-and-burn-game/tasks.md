# Bond & Burn: The Reaction Lab — Tasks

## Phase 1: Data & Utilities

### Task 1: Create game data file
- [ ] Create `apps/web/src/utils/bondAndBurnData.ts`
- [ ] Define `Element` interface and element constants (H, O, C, N, Na, Cl) with colors
- [ ] Define `Recipe` interface and all recipes (water, salt, CO₂, methane, ammonia, ethane)
- [ ] Define `DifficultyConfig` with conveyor speed, heat rates, available recipes
- [ ] Include fun facts for each compound
- [ ] Export difficulty configs for easy/medium/hard

### Task 2: Create game logic utilities
- [ ] Create `apps/web/src/utils/bondAndBurnLogic.ts`
- [ ] Implement `checkRecipeComplete(chamber: string[], recipe: Recipe): boolean`
- [ ] Implement `calculateHeat(current, delta, config): number`
- [ ] Implement `calculateScore(recipesCompleted, combo, time, difficulty): number`
- [ ] Implement `getRandomElement(config, currentRecipe): Element` (weighted toward needed elements)
- [ ] Implement `selectRecipes(difficulty, count): Recipe[]`

## Phase 2: Setup Page

### Task 3: Create setup page
- [ ] Create `apps/web/src/pages/bond-and-burn/BondAndBurnSetupPage.tsx`
- [ ] Difficulty selector cards (Easy/Medium/Hard) with descriptions
- [ ] Show scientist mascot image on setup page
- [ ] "Start Mission" button navigates to game with difficulty param
- [ ] Match existing DashDen setup page styling (gradient background, card layout)

### Task 4: Add routing
- [ ] Add routes in `apps/web/src/App.tsx`:
  - `/bond-and-burn/setup` → BondAndBurnSetupPage
  - `/bond-and-burn/game` → BondAndBurnGamePage
- [ ] Add to game hub navigation (GameHubPage category mapping)

## Phase 3: Core Game UI

### Task 5: Create main game page shell
- [ ] Create `apps/web/src/pages/bond-and-burn/BondAndBurnGamePage.tsx`
- [ ] Game state management (phase, heat, score, timer, combo, recipes)
- [ ] Layout: mascot left, chamber center, heat gauge right, conveyor bottom
- [ ] Timer (counts up from 0)
- [ ] Parse difficulty from URL query param
- [ ] Call `startGame` API on mount

### Task 6: Build ConveyorBelt component
- [ ] Animated horizontal strip at bottom of screen
- [ ] Elements spawn at left, flow right at configurable speed
- [ ] CSS animation (translateX) for smooth movement
- [ ] Tap/click on element → removes from belt, adds to chamber
- [ ] Elements that exit right edge → small heat penalty
- [ ] Weighted random spawning (favor elements needed for current recipe)

### Task 7: Build ReactionChamber component
- [ ] Central drop zone showing "slots" for current recipe
- [ ] Visual: colored circles in slots, empty slots shown as dashed outlines
- [ ] When element added: animate into slot if correct, bounce back if wrong
- [ ] When all slots filled: synthesis animation (glow + particle burst)
- [ ] After synthesis: clear chamber, advance to next recipe, update score

### Task 8: Build HeatGauge component
- [ ] Vertical thermometer (0-100%)
- [ ] Color gradient: green (0-40%), yellow (40-70%), orange (70-85%), red (85-100%)
- [ ] Animated fill level with smooth transitions
- [ ] Pulse animation when above 85%
- [ ] Shows numeric percentage

### Task 9: Build RecipeCard component
- [ ] Shows at top of screen: compound name, formula, required elements
- [ ] Visual molecule diagram (circles connected by lines)
- [ ] Progress indicator (round X of 5)
- [ ] Animate transition between recipes

### Task 10: Build ScientistMascot component
- [ ] Display scientist image from S3 on left side
- [ ] Speech bubble with reactive text based on game state
- [ ] States: idle, success celebration, worried (heat>60%), panic (heat>85%), meltdown
- [ ] Fun fact speech bubble after each successful synthesis

## Phase 4: Game Logic Integration

### Task 11: Implement game loop
- [ ] Heat rises passively every second (based on difficulty config)
- [ ] Check for meltdown (heat >= 100%) → game over
- [ ] Track combo (reset on wrong element, increment on correct synthesis)
- [ ] Calculate score per synthesis: base × difficulty × speed bonus × combo
- [ ] When all 5 recipes completed → game complete phase

### Task 12: Implement game completion
- [ ] Call `completeGame` API with gameId, completionTime, attempts, correctAnswers, totalQuestions
- [ ] Show ScoreBreakdownModal (existing component)
- [ ] Handle meltdown game over (partial score for completed recipes)
- [ ] "Play Again" → navigate to setup, "Leaderboard" → navigate to leaderboard

## Phase 5: Backend Integration

### Task 13: Add BOND_AND_BURN to backend
- [ ] Add `BOND_AND_BURN` to PAID_GAMES list in `game.service.ts`
- [ ] Add `BOND_AND_BURN` to PREMIUM_GAME_THEMES in `score-calculator.service.ts` (base 1700, cap 8000)
- [ ] Add `BOND_AND_BURN` to attempts validation exclusion list
- [ ] Add `BOND_AND_BURN` to accuracy override list
- [ ] Add `BOND_AND_BURN` gameType mapping in completeGame switch
- [ ] Add theme entry to `memory-game-themes-prod` DynamoDB (status: PUBLISHED)
- [ ] Add game catalog entry to `memory-game-catalog-prod` DynamoDB
- [ ] Deploy game Lambda

### Task 14: Add to leaderboard
- [ ] Add `BOND_AND_BURN` to `GameType` enum in `services/leaderboard/src/types/index.ts`
- [ ] Add `BOND_AND_BURN` to OVERALL aggregation list in `leaderboard.service.ts`
- [ ] Add `BOND_AND_BURN` to frontend `GameType` enum in `apps/web/src/api/leaderboard.ts`
- [ ] Add to `GameTypeFilter.tsx` dropdown
- [ ] Add to `RecentImprovements.tsx` game info map
- [ ] Deploy leaderboard Lambda

### Task 15: Add to game hub
- [ ] Add `bond-and-burn` to `PREMIUM_GAMES` set in `GameTile.tsx`
- [ ] Add category mapping in `GameHubPage.tsx`

## Phase 6: Polish & Deploy

### Task 16: Animations and effects
- [ ] Synthesis success: particle burst effect (CSS keyframes)
- [ ] Meltdown: screen shake + red flash + explosion
- [ ] Conveyor belt: smooth continuous animation
- [ ] Element grab: scale up briefly on tap
- [ ] Heat gauge: smooth fill transitions

### Task 17: Deploy to production
- [ ] Verify TypeScript compiles clean
- [ ] Deploy frontend to dashden.app (Vercel)
- [ ] Verify game appears in hub with "⭐ Paid" badge
- [ ] Test full flow: setup → play → score → leaderboard
- [ ] Verify leaderboard shows Bond & Burn entries
