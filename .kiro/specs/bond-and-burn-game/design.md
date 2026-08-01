# Bond & Burn: The Reaction Lab — Design

## Architecture Overview

Frontend-only game logic (React + TypeScript), integrated with existing DashDen backend for scoring/leaderboard via `startGame`/`completeGame` API pattern.

## File Structure

```
apps/web/src/
├── pages/bond-and-burn/
│   ├── BondAndBurnSetupPage.tsx     # Difficulty selection
│   └── BondAndBurnGamePage.tsx      # Main game component
├── utils/
│   └── bondAndBurnData.ts           # Recipes, elements, difficulty configs
└── assets/
    └── (scientist image referenced from S3)
```

## Component Design

### BondAndBurnSetupPage
- Difficulty selector (Easy/Medium/Hard) with descriptions
- "Start Mission" button
- Navigates to game page with difficulty in URL query param

### BondAndBurnGamePage (Main Game)
Manages all game state. Layout:

```
┌─────────────────────────────────────────────────┐
│  Recipe Card          Timer    Heat Gauge  Round │
├────────┬─────────────────────────────┬──────────┤
│        │                             │          │
│ Mascot │   REACTION CHAMBER          │  Heat    │
│ (left) │   (drop zone)              │  Thermo  │
│        │                             │  meter   │
│        │                             │          │
├────────┴─────────────────────────────┴──────────┤
│         ◀═══ CONVEYOR BELT ═══▶                 │
│         [H] [O] [H] [C] [Na] [O] [N]           │
└─────────────────────────────────────────────────┘
```

### Sub-Components
- **ConveyorBelt** — Animated strip of molecule circles flowing left-to-right
- **ReactionChamber** — Drop zone where molecules are placed; shows slots for current recipe
- **HeatGauge** — Vertical thermometer with color gradient (green→yellow→red)
- **RecipeCard** — Shows target compound, formula, and required elements
- **ScientistMascot** — Character image with speech bubble for hints/reactions
- **MoleculeCircle** — Draggable/tappable element with symbol and color

## Data Model

### Element
```ts
interface Element {
  symbol: string       // 'H', 'O', 'C', 'N', 'Na', 'Cl'
  name: string         // 'Hydrogen', 'Oxygen', etc.
  color: string        // Tailwind color class
  emoji: string        // Fallback visual
}
```

### Recipe
```ts
interface Recipe {
  id: string
  name: string              // 'Water', 'Salt', etc.
  formula: string           // 'H₂O', 'NaCl'
  equation: string          // '2H₂ + O₂ → 2H₂O'
  ingredients: { symbol: string; count: number }[]
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  funFact: string           // Educational "Did you know?"
}
```

### GameState
```ts
interface GameState {
  phase: 'playing' | 'meltdown' | 'complete'
  difficulty: 'easy' | 'medium' | 'hard'
  currentRecipeIndex: number
  recipes: Recipe[]
  chamber: string[]          // Elements currently in chamber
  heatLevel: number          // 0-100
  score: number
  combo: number
  timer: number              // seconds elapsed
  roundsCompleted: number
}
```

## Game Logic

### Conveyor Belt
- Elements spawn at left edge every `spawnInterval` ms
- Speed: Easy=3s crossing, Medium=2s, Hard=1.5s
- Element distribution weighted toward what's needed for current recipe
- Elements that reach right edge disappear (missed opportunity, small heat penalty)

### Reaction Chamber
- Player taps a molecule on belt → it moves to the chamber
- Chamber shows "slots" based on recipe (e.g., 2 H-slots and 1 O-slot for water)
- When all slots filled correctly → synthesis animation → score awarded → next recipe
- Wrong element placed → bounces back to belt, +5% heat, combo reset

### Heat Management
- Passive rise: +1%/second (Easy), +2%/second (Medium), +3%/second (Hard)
- Failed reaction: +5% heat
- Missed element (off belt): +2% heat
- Successful synthesis: -15% heat (Easy), -10% (Medium), -5% (Hard)
- At 100%: meltdown → game over

### Scoring
- Base points per recipe: Easy=100, Medium=200, Hard=300
- Speed bonus: max 2x if completed in under 5 seconds
- Combo multiplier: consecutive correct = 1x, 2x, 3x (caps at 3x)
- Final score = sum of all recipe scores, capped at 8,000
- Accuracy = recipes_completed / total_recipes_attempted

### Mascot Reactions
- Idle: Normal pose with speech bubble "Grab the right elements!"
- Success: Celebrates "Great synthesis! 🎉"
- Heat rising (>60%): Worried face "It's getting hot in here! 🥵"
- Heat critical (>85%): Panic "Cool it down! Complete a reaction!"
- Meltdown: Shocked "MELTDOWN! 💥"
- Fun fact: Shows after each synthesis "Did you know? Water is H₂O..."

## Integration Points

### Backend (existing)
- `startGame({ themeId: 'BOND_AND_BURN', difficulty })` on game start
- `completeGame({ gameId, completionTime, attempts, correctAnswers, totalQuestions })` on finish
- Score calculated by backend ScoreCalculatorService
- EventBridge publishes `BOND_AND_BURN` game type for leaderboard

### Leaderboard
- Add `BOND_AND_BURN` to `GameType` enum in:
  - `services/leaderboard/src/types/index.ts`
  - `apps/web/src/api/leaderboard.ts`
  - `apps/web/src/components/leaderboard/GameTypeFilter.tsx`
  - `services/leaderboard/src/services/leaderboard.service.ts` (OVERALL aggregation)
- Add to game service exclusion lists (attempts validation, accuracy override)

### Game Catalog
- Add entry to `memory-game-catalog-prod` DynamoDB table
- Add theme to `memory-game-themes-prod` DynamoDB table

### Routing
- `/bond-and-burn/setup` → BondAndBurnSetupPage
- `/bond-and-burn/game?difficulty=easy` → BondAndBurnGamePage

## Difficulty Configurations

```ts
const DIFFICULTY_CONFIGS = {
  easy: {
    recipes: 5,
    conveyorSpeed: 3000,        // ms to cross screen
    spawnInterval: 1500,        // ms between new elements
    heatRisePerSecond: 1,
    heatDropOnSuccess: 15,
    heatPenaltyWrong: 5,
    elements: ['H', 'O', 'Na', 'Cl', 'C'],
    availableRecipes: ['water', 'salt', 'co2'],
  },
  medium: {
    recipes: 5,
    conveyorSpeed: 2000,
    spawnInterval: 1200,
    heatRisePerSecond: 2,
    heatDropOnSuccess: 10,
    heatPenaltyWrong: 8,
    elements: ['H', 'O', 'C', 'N', 'Na', 'Cl'],
    availableRecipes: ['water', 'salt', 'co2', 'methane', 'ammonia'],
  },
  hard: {
    recipes: 5,
    conveyorSpeed: 1500,
    spawnInterval: 900,
    heatRisePerSecond: 3,
    heatDropOnSuccess: 5,
    heatPenaltyWrong: 12,
    elements: ['H', 'O', 'C', 'N', 'Na', 'Cl'],
    availableRecipes: ['water', 'salt', 'co2', 'methane', 'ammonia', 'ethane'],
  },
}
```
