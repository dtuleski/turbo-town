# Bond & Burn: The Reaction Lab — Requirements

## Overview
A kid-friendly chemistry simulation game where players combine molecules to create compounds. Molecules flow on conveyor belts into a reaction chamber. Players drag elements together to form recipes (like making water from hydrogen and oxygen). A heat gauge adds urgency — complete reactions before the lab overheats!

**Target Audience**: Ages 8-14
**Game ID**: `bond-and-burn`
**Category**: Science & Math
**Access**: Paid members only (Light, Standard, Premium)

---

## Functional Requirements

### REQ-1: Setup Page
- Player selects difficulty: Easy, Medium, Hard
- Brief tutorial/instructions shown before first play
- Difficulty descriptions:
  - Easy: Simple molecules (H₂O, NaCl, CO₂), slow conveyor, generous heat tolerance
  - Medium: Organic molecules, faster conveyor, multiple reaction chambers
  - Hard: Chain reactions, volatile materials, strict heat limits

### REQ-2: Conveyor Belt System
- Molecules (represented as colorful circles with element symbols) flow from left to right on a conveyor belt
- Elements available: H (red), O (blue), C (black), N (green), Na (purple), Cl (yellow)
- Player taps/clicks molecules on the belt to grab them
- Grabbed molecules go into the reaction chamber (center of screen)
- Conveyor speed increases over time within a round

### REQ-3: Reaction Chamber
- Central area where player drops grabbed molecules
- Shows the current "recipe" needed (e.g., "Make Water: 2×H₂ + 1×O₂")
- When correct molecules are placed, they snap together with a satisfying animation
- Successful synthesis: compound flies off to the "shipped" area, score increases
- Wrong combination: molecules bounce back, small heat penalty

### REQ-4: Heat/Energy Gauge
- A thermometer-style gauge on the side of the screen
- Starts at 0%, rises over time and with failed reactions
- Successful reactions cool the gauge slightly
- If gauge hits 100%: meltdown animation → game over
- Easy: gauge rises slowly, drops a lot on success
- Hard: gauge rises fast, drops little on success

### REQ-5: Recipe System
- Each round presents a target compound to synthesize
- Easy recipes: H₂O (water), NaCl (salt), CO₂ (carbon dioxide)
- Medium recipes: CH₄ (methane), NH₃ (ammonia), C₂H₆ (ethane)
- Hard recipes: C₆H₁₂O₆ (glucose), complex chains
- Recipe card shown at top with formula and visual molecule diagram
- Multiple recipes queued — complete one, next appears

### REQ-6: Scoring
- Points per successful synthesis (base 100, scaled by difficulty)
- Speed bonus: faster completion = more points
- Combo bonus: consecutive successful reactions without mistakes
- Heat efficiency bonus: finishing with low heat gauge
- Score cap: 8,000 (premium game)
- Final score = base × difficulty multiplier × speed × accuracy

### REQ-7: Game Flow
- 5 rounds per game (5 recipes to complete)
- Timer runs throughout all rounds
- Game ends when: all 5 recipes completed OR heat gauge hits 100%
- Results screen shows: score, time, accuracy, compounds created
- Integrates with existing leaderboard (game type: BOND_AND_BURN)
- Score breakdown modal (same pattern as other games)

### REQ-8: Visual Design
- Lab/factory aesthetic with dark background, glowing elements
- Game mascot: young scientist character (boy with safety goggles, lab coat, blue gloves) shown in-game as a guide
- Mascot appears on the left side of the game screen, gives speech-bubble hints/reactions
- Celebrates on successful synthesis, looks worried when heat rises, panics on meltdown
- Mascot image stored in S3: `dashden-assets-prod/game-assets/bond-and-burn-scientist.png`
- Molecules are large, colorful circles with element symbol (H, O, C, etc.)
- Reaction chamber has a glowing border that changes color with heat
- Satisfying particle effects on successful synthesis
- Meltdown animation: screen shakes, red flash, explosion emoji

### REQ-9: Educational Content
- Each recipe shows the real chemical equation
- Brief "Did you know?" fact after each successful synthesis
- Element colors match common chemistry conventions where possible

---

## Non-Functional Requirements

### NFR-1: Performance
- Smooth 60fps animations on conveyor belt
- Touch-friendly for mobile/tablet (drag and drop)
- No external dependencies — all game logic client-side

### NFR-2: Integration
- Uses existing `startGame` / `completeGame` API pattern
- Theme ID: `BOND_AND_BURN`
- Publishes to EventBridge for leaderboard tracking
- Standard score breakdown modal at end

### NFR-3: Accessibility
- Large tap targets for molecules (minimum 44px)
- Color + symbol for element identification (not color alone)
- Screen reader labels for key actions
