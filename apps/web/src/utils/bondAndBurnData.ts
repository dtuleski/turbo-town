// Bond & Burn: The Reaction Lab — Game Data

export interface Element {
  symbol: string
  name: string
  color: string        // Tailwind bg color class
  textColor: string    // Tailwind text color class
  emoji: string
}

export interface RecipeIngredient {
  symbol: string
  count: number
}

export interface Recipe {
  id: string
  name: string
  formula: string
  equation: string
  hint: string                // Plain English explanation of the formula
  ingredients: RecipeIngredient[]
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  funFact: string
}

export interface DifficultyConfig {
  label: string
  emoji: string
  description: string
  recipes: number
  conveyorSpeed: number       // ms to cross screen
  spawnInterval: number       // ms between new elements
  heatRisePerSecond: number
  heatDropOnSuccess: number
  heatPenaltyWrong: number
  heatPenaltyMissed: number
  elements: string[]
  availableRecipeIds: string[]
}

// ─── Elements ────────────────────────────────────────────────────────────────

export const ELEMENTS: Record<string, Element> = {
  H:  { symbol: 'H',  name: 'Hydrogen', color: 'bg-red-500',    textColor: 'text-red-500',    emoji: '🔴' },
  O:  { symbol: 'O',  name: 'Oxygen',   color: 'bg-blue-500',   textColor: 'text-blue-500',   emoji: '🔵' },
  C:  { symbol: 'C',  name: 'Carbon',   color: 'bg-gray-800',   textColor: 'text-gray-800',   emoji: '⚫' },
  N:  { symbol: 'N',  name: 'Nitrogen', color: 'bg-green-500',  textColor: 'text-green-500',  emoji: '🟢' },
  Na: { symbol: 'Na', name: 'Sodium',   color: 'bg-purple-500', textColor: 'text-purple-500', emoji: '🟣' },
  Cl: { symbol: 'Cl', name: 'Chlorine', color: 'bg-yellow-500', textColor: 'text-yellow-500', emoji: '🟡' },
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

export const RECIPES: Recipe[] = [
  {
    id: 'water',
    name: 'Water',
    formula: 'H₂O',
    equation: '2H + O → H₂O',
    hint: 'Grab 2 Hydrogen and 1 Oxygen',
    ingredients: [{ symbol: 'H', count: 2 }, { symbol: 'O', count: 1 }],
    difficulty: 'easy',
    points: 100,
    funFact: 'Water covers 71% of Earth\'s surface! Every living thing needs it.',
  },
  {
    id: 'salt',
    name: 'Table Salt',
    formula: 'NaCl',
    equation: 'Na + Cl → NaCl',
    hint: 'Grab 1 Sodium and 1 Chlorine',
    ingredients: [{ symbol: 'Na', count: 1 }, { symbol: 'Cl', count: 1 }],
    difficulty: 'easy',
    points: 100,
    funFact: 'Salt was so valuable in ancient Rome that soldiers were paid with it!',
  },
  {
    id: 'co2',
    name: 'Carbon Dioxide',
    formula: 'CO₂',
    equation: 'C + 2O → CO₂',
    hint: 'Grab 1 Carbon and 2 Oxygen',
    ingredients: [{ symbol: 'C', count: 1 }, { symbol: 'O', count: 2 }],
    difficulty: 'easy',
    points: 120,
    funFact: 'Plants breathe in CO₂ and breathe out oxygen — the opposite of us!',
  },
  {
    id: 'methane',
    name: 'Methane',
    formula: 'CH₄',
    equation: 'C + 4H → CH₄',
    hint: 'Grab 1 Carbon and 4 Hydrogen',
    ingredients: [{ symbol: 'C', count: 1 }, { symbol: 'H', count: 4 }],
    difficulty: 'medium',
    points: 200,
    funFact: 'Methane is the main ingredient in natural gas used for cooking!',
  },
  {
    id: 'ammonia',
    name: 'Ammonia',
    formula: 'NH₃',
    equation: 'N + 3H → NH₃',
    hint: 'Grab 1 Nitrogen and 3 Hydrogen',
    ingredients: [{ symbol: 'N', count: 1 }, { symbol: 'H', count: 3 }],
    difficulty: 'medium',
    points: 200,
    funFact: 'Ammonia is used to make fertilizer that helps grow food for billions!',
  },
  {
    id: 'ethane',
    name: 'Ethane',
    formula: 'C₂H₆',
    equation: '2C + 6H → C₂H₆',
    hint: 'Grab 2 Carbon and 6 Hydrogen',
    ingredients: [{ symbol: 'C', count: 2 }, { symbol: 'H', count: 6 }],
    difficulty: 'hard',
    points: 300,
    funFact: 'Ethane is found in natural gas and on the surface of Saturn\'s moon Titan!',
  },
  {
    id: 'hydrogen-peroxide',
    name: 'Hydrogen Peroxide',
    formula: 'H₂O₂',
    equation: '2H + 2O → H₂O₂',
    hint: 'Grab 2 Hydrogen and 2 Oxygen',
    ingredients: [{ symbol: 'H', count: 2 }, { symbol: 'O', count: 2 }],
    difficulty: 'medium',
    points: 180,
    funFact: 'Hydrogen peroxide is used to clean wounds and even bleach hair!',
  },
  {
    id: 'hydrochloric-acid',
    name: 'Hydrochloric Acid',
    formula: 'HCl',
    equation: 'H + Cl → HCl',
    hint: 'Grab 1 Hydrogen and 1 Chlorine',
    ingredients: [{ symbol: 'H', count: 1 }, { symbol: 'Cl', count: 1 }],
    difficulty: 'medium',
    points: 150,
    funFact: 'Your stomach makes hydrochloric acid to digest food!',
  },
  {
    id: 'sodium-hydroxide',
    name: 'Sodium Hydroxide',
    formula: 'NaOH',
    equation: 'Na + O + H → NaOH',
    hint: 'Grab 1 Sodium, 1 Oxygen, and 1 Hydrogen',
    ingredients: [{ symbol: 'Na', count: 1 }, { symbol: 'O', count: 1 }, { symbol: 'H', count: 1 }],
    difficulty: 'hard',
    points: 280,
    funFact: 'Sodium hydroxide (lye) is used to make soap and unclog drains!',
  },
  {
    id: 'nitrous-oxide',
    name: 'Laughing Gas',
    formula: 'N₂O',
    equation: '2N + O → N₂O',
    hint: 'Grab 2 Nitrogen and 1 Oxygen',
    ingredients: [{ symbol: 'N', count: 2 }, { symbol: 'O', count: 1 }],
    difficulty: 'hard',
    points: 300,
    funFact: 'Dentists use laughing gas (N₂O) to help patients relax during procedures!',
  },
]

// ─── Difficulty Configs ──────────────────────────────────────────────────────

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    emoji: '🟢',
    description: 'Simple molecules, slow conveyor, forgiving heat',
    recipes: 5,
    conveyorSpeed: 12000,
    spawnInterval: 2500,
    heatRisePerSecond: 2.0,
    heatDropOnSuccess: 12,
    heatPenaltyWrong: 8,
    heatPenaltyMissed: 2,
    elements: ['H', 'O', 'Na', 'Cl', 'C'],
    availableRecipeIds: ['water', 'salt', 'co2'],
  },
  medium: {
    label: 'Medium',
    emoji: '🟡',
    description: 'More complex compounds, faster pace',
    recipes: 5,
    conveyorSpeed: 8000,
    spawnInterval: 2000,
    heatRisePerSecond: 3.0,
    heatDropOnSuccess: 10,
    heatPenaltyWrong: 10,
    heatPenaltyMissed: 3,
    elements: ['H', 'O', 'C', 'N', 'Na', 'Cl'],
    availableRecipeIds: ['water', 'salt', 'co2', 'methane', 'ammonia', 'hydrogen-peroxide', 'hydrochloric-acid'],
  },
  hard: {
    label: 'Hard',
    emoji: '🔴',
    description: 'Complex reactions, high pressure, strict heat!',
    recipes: 5,
    conveyorSpeed: 5500,
    spawnInterval: 1500,
    heatRisePerSecond: 4.5,
    heatDropOnSuccess: 6,
    heatPenaltyWrong: 15,
    heatPenaltyMissed: 5,
    elements: ['H', 'O', 'C', 'N', 'Na', 'Cl'],
    availableRecipeIds: ['methane', 'ammonia', 'ethane', 'hydrogen-peroxide', 'sodium-hydroxide', 'nitrous-oxide'],
  },
}

// ─── Helper Functions ────────────────────────────────────────────────────────

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find(r => r.id === id)
}

export function selectRecipes(difficulty: 'easy' | 'medium' | 'hard', count: number): Recipe[] {
  const config = DIFFICULTY_CONFIGS[difficulty]
  const available = RECIPES.filter(r => config.availableRecipeIds.includes(r.id))
  // Shuffle and pick
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function getRandomElement(config: DifficultyConfig, currentRecipe?: Recipe): Element {
  const { elements } = config
  // Weight toward elements needed for current recipe (40% chance — reduced for more challenge)
  if (currentRecipe && Math.random() < 0.4) {
    const needed = currentRecipe.ingredients.map(i => i.symbol)
    const neededAvailable = needed.filter(s => elements.includes(s))
    if (neededAvailable.length > 0) {
      const symbol = neededAvailable[Math.floor(Math.random() * neededAvailable.length)]
      return ELEMENTS[symbol]
    }
  }
  // Random from available elements
  const symbol = elements[Math.floor(Math.random() * elements.length)]
  return ELEMENTS[symbol]
}

export function checkRecipeComplete(chamber: string[], recipe: Recipe): boolean {
  // Count elements in chamber
  const counts: Record<string, number> = {}
  for (const symbol of chamber) {
    counts[symbol] = (counts[symbol] || 0) + 1
  }
  // Check all ingredients satisfied
  return recipe.ingredients.every(ing => (counts[ing.symbol] || 0) >= ing.count)
}

export function getTotalIngredientsCount(recipe: Recipe): number {
  return recipe.ingredients.reduce((sum, ing) => sum + ing.count, 0)
}
