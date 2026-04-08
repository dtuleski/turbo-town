// ── Hangman Game Data ────────────────────────────────────────────────────────

export interface HangmanWord {
  word: string
  hint: string
  category: string
}

// Easy: up to 5 letters
export const EASY_WORDS: HangmanWord[] = [
  { word: 'APPLE', hint: 'A red fruit', category: 'Food' },
  { word: 'BEACH', hint: 'Sandy place by the ocean', category: 'Places' },
  { word: 'CLOUD', hint: 'White fluffy thing in the sky', category: 'Nature' },
  { word: 'DANCE', hint: 'Move your body to music', category: 'Actions' },
  { word: 'EAGLE', hint: 'A large bird of prey', category: 'Animals' },
  { word: 'FLAME', hint: 'Part of a fire', category: 'Nature' },
  { word: 'GRAPE', hint: 'Small purple fruit', category: 'Food' },
  { word: 'HEART', hint: 'It pumps blood', category: 'Body' },
  { word: 'JUICE', hint: 'A drink from fruit', category: 'Food' },
  { word: 'KITE', hint: 'Flies in the wind on a string', category: 'Toys' },
  { word: 'LEMON', hint: 'Sour yellow fruit', category: 'Food' },
  { word: 'MOUSE', hint: 'Small rodent', category: 'Animals' },
  { word: 'NIGHT', hint: 'When the sun goes down', category: 'Time' },
  { word: 'OCEAN', hint: 'Huge body of salt water', category: 'Nature' },
  { word: 'PIANO', hint: 'Musical instrument with keys', category: 'Music' },
  { word: 'QUEEN', hint: 'Female ruler', category: 'People' },
  { word: 'RIVER', hint: 'Flowing body of water', category: 'Nature' },
  { word: 'SNAKE', hint: 'Reptile with no legs', category: 'Animals' },
  { word: 'TIGER', hint: 'Striped big cat', category: 'Animals' },
  { word: 'UMBRA', hint: 'Shadow region', category: 'Science' },
  { word: 'VIOLA', hint: 'String instrument', category: 'Music' },
  { word: 'WHALE', hint: 'Largest ocean mammal', category: 'Animals' },
  { word: 'ZEBRA', hint: 'Black and white striped animal', category: 'Animals' },
  { word: 'BREAD', hint: 'Baked food from flour', category: 'Food' },
  { word: 'CHAIR', hint: 'You sit on it', category: 'Objects' },
  { word: 'DREAM', hint: 'Happens when you sleep', category: 'Actions' },
  { word: 'EARTH', hint: 'Our planet', category: 'Science' },
  { word: 'FROST', hint: 'Ice crystals on surfaces', category: 'Nature' },
  { word: 'GLOBE', hint: 'Model of the Earth', category: 'Objects' },
  { word: 'HONEY', hint: 'Sweet food made by bees', category: 'Food' },
  { word: 'IGLOO', hint: 'Ice house', category: 'Places' },
  { word: 'JEWEL', hint: 'Precious stone', category: 'Objects' },
  { word: 'KOALA', hint: 'Australian tree animal', category: 'Animals' },
  { word: 'LIGHT', hint: 'Opposite of dark', category: 'Nature' },
  { word: 'MAGIC', hint: 'Tricks and illusions', category: 'Actions' },
  { word: 'NINJA', hint: 'Japanese warrior', category: 'People' },
  { word: 'OLIVE', hint: 'Small green or black fruit', category: 'Food' },
  { word: 'PEARL', hint: 'Gem from an oyster', category: 'Objects' },
  { word: 'RADAR', hint: 'Detects objects with radio waves', category: 'Science' },
  { word: 'STORM', hint: 'Bad weather with wind and rain', category: 'Nature' },
]

// Medium: 6-10 letters
export const MEDIUM_WORDS: HangmanWord[] = [
  { word: 'AIRPLANE', hint: 'Flying vehicle', category: 'Transport' },
  { word: 'BIRTHDAY', hint: 'Annual celebration of birth', category: 'Events' },
  { word: 'CAMPFIRE', hint: 'Outdoor fire for warmth', category: 'Nature' },
  { word: 'DINOSAUR', hint: 'Extinct giant reptile', category: 'Animals' },
  { word: 'ELEPHANT', hint: 'Largest land animal', category: 'Animals' },
  { word: 'FOOTBALL', hint: 'Popular team sport', category: 'Sports' },
  { word: 'GIRAFFE', hint: 'Tallest animal', category: 'Animals' },
  { word: 'HOSPITAL', hint: 'Where sick people go', category: 'Places' },
  { word: 'INTERNET', hint: 'Global computer network', category: 'Technology' },
  { word: 'KANGAROO', hint: 'Australian jumping animal', category: 'Animals' },
  { word: 'LANGUAGE', hint: 'System of communication', category: 'Culture' },
  { word: 'MOUNTAIN', hint: 'Very tall landform', category: 'Nature' },
  { word: 'NOTEBOOK', hint: 'Paper for writing', category: 'Objects' },
  { word: 'PAINTING', hint: 'Art on canvas', category: 'Art' },
  { word: 'QUESTION', hint: 'Something you ask', category: 'Language' },
  { word: 'SANDWICH', hint: 'Food between two slices of bread', category: 'Food' },
  { word: 'TREASURE', hint: 'Hidden valuable things', category: 'Objects' },
  { word: 'UMBRELLA', hint: 'Protects from rain', category: 'Objects' },
  { word: 'VACATION', hint: 'Time off from work', category: 'Events' },
  { word: 'WATERFALL', hint: 'Water falling from a cliff', category: 'Nature' },
  { word: 'ALPHABET', hint: 'A, B, C, D...', category: 'Language' },
  { word: 'BACKPACK', hint: 'Bag carried on shoulders', category: 'Objects' },
  { word: 'CALENDAR', hint: 'Shows days and months', category: 'Objects' },
  { word: 'DARKNESS', hint: 'Absence of light', category: 'Nature' },
  { word: 'EXERCISE', hint: 'Physical activity for health', category: 'Actions' },
  { word: 'FIREWORK', hint: 'Exploding lights in the sky', category: 'Events' },
  { word: 'GOLDFISH', hint: 'Small orange pet fish', category: 'Animals' },
  { word: 'HOMEWORK', hint: 'School assignments done at home', category: 'School' },
  { word: 'ICECREAM', hint: 'Frozen sweet dessert', category: 'Food' },
  { word: 'KEYBOARD', hint: 'Input device with keys', category: 'Technology' },
  { word: 'LEMONADE', hint: 'Sweet lemon drink', category: 'Food' },
  { word: 'MUSHROOM', hint: 'Fungus that grows in forests', category: 'Nature' },
  { word: 'NECKLACE', hint: 'Jewelry worn around the neck', category: 'Objects' },
  { word: 'PANCAKE', hint: 'Flat breakfast food', category: 'Food' },
  { word: 'RAINBOW', hint: 'Colorful arc in the sky', category: 'Nature' },
  { word: 'SKELETON', hint: 'Bones of the body', category: 'Body' },
  { word: 'TOMATO', hint: 'Red fruit used in salads', category: 'Food' },
  { word: 'UNIVERSE', hint: 'Everything that exists', category: 'Science' },
  { word: 'VOLCANO', hint: 'Mountain that erupts lava', category: 'Nature' },
  { word: 'WINDMILL', hint: 'Uses wind to generate power', category: 'Objects' },
]

// Hard: 11+ letters
export const HARD_WORDS: HangmanWord[] = [
  { word: 'AGRICULTURE', hint: 'Farming and growing crops', category: 'Science' },
  { word: 'BUTTERSCOTCH', hint: 'Sweet caramel-like candy', category: 'Food' },
  { word: 'CATERPILLAR', hint: 'Becomes a butterfly', category: 'Animals' },
  { word: 'DOCUMENTARY', hint: 'Non-fiction film', category: 'Entertainment' },
  { word: 'ELECTRICITY', hint: 'Powers your home', category: 'Science' },
  { word: 'FIREFIGHTER', hint: 'Person who puts out fires', category: 'People' },
  { word: 'GRASSHOPPER', hint: 'Jumping green insect', category: 'Animals' },
  { word: 'HANDWRITING', hint: 'Writing by hand', category: 'Actions' },
  { word: 'IMAGINATION', hint: 'Creating pictures in your mind', category: 'Actions' },
  { word: 'JELLYFISH', hint: 'Transparent sea creature', category: 'Animals' },
  { word: 'KINDERGARTEN', hint: 'First year of school', category: 'School' },
  { word: 'LOUDSPEAKER', hint: 'Device that amplifies sound', category: 'Technology' },
  { word: 'MARSHMALLOW', hint: 'Soft white candy', category: 'Food' },
  { word: 'NIGHTINGALE', hint: 'Bird known for its song', category: 'Animals' },
  { word: 'OBSERVATORY', hint: 'Place to watch stars', category: 'Places' },
  { word: 'PHOTOGRAPHY', hint: 'Art of taking pictures', category: 'Art' },
  { word: 'QUARTERBACK', hint: 'Football position that throws', category: 'Sports' },
  { word: 'ROLLERCOASTER', hint: 'Amusement park ride', category: 'Entertainment' },
  { word: 'SKATEBOARD', hint: 'Board with wheels for tricks', category: 'Sports' },
  { word: 'THERMOMETER', hint: 'Measures temperature', category: 'Science' },
  { word: 'UNDERGROUND', hint: 'Below the surface', category: 'Places' },
  { word: 'VETERINARIAN', hint: 'Animal doctor', category: 'People' },
  { word: 'WHEELBARROW', hint: 'Garden cart with one wheel', category: 'Objects' },
  { word: 'XYLOPHONE', hint: 'Musical instrument with bars', category: 'Music' },
  { word: 'YELLOWSTONE', hint: 'Famous US national park', category: 'Places' },
  { word: 'ARCHIPELAGO', hint: 'Group of islands', category: 'Nature' },
  { word: 'BLACKSMITH', hint: 'Person who forges metal', category: 'People' },
  { word: 'COUNTRYSIDE', hint: 'Rural area outside cities', category: 'Places' },
  { word: 'DRAGONFLY', hint: 'Insect with large wings', category: 'Animals' },
  { word: 'ENCYCLOPEDIA', hint: 'Book of knowledge', category: 'Objects' },
  { word: 'FRANKENSTEIN', hint: 'Famous monster story', category: 'Entertainment' },
  { word: 'HUMMINGBIRD', hint: 'Tiny bird that hovers', category: 'Animals' },
  { word: 'INSTRUMENTS', hint: 'Tools for making music', category: 'Music' },
  { word: 'MARKETPLACE', hint: 'Place to buy and sell', category: 'Places' },
  { word: 'NEIGHBORHOOD', hint: 'Area where you live', category: 'Places' },
  { word: 'OUTSTANDING', hint: 'Exceptionally good', category: 'Language' },
  { word: 'POMEGRANATE', hint: 'Red fruit with many seeds', category: 'Food' },
  { word: 'TRAMPOLINE', hint: 'Bouncy surface for jumping', category: 'Sports' },
  { word: 'WOODPECKER', hint: 'Bird that pecks trees', category: 'Animals' },
  { word: 'THUMBTACK', hint: 'Small pin for bulletin boards', category: 'Objects' },
]

export const MAX_WRONG = 6 // head, body, left arm, right arm, left leg, right leg
export const ROUNDS_PER_GAME = 5

export function getWordsForDifficulty(difficulty: string): HangmanWord[] {
  if (difficulty === 'easy') return EASY_WORDS
  if (difficulty === 'medium') return MEDIUM_WORDS
  return HARD_WORDS
}

export function pickRandomWords(difficulty: string, count: number): HangmanWord[] {
  const pool = getWordsForDifficulty(difficulty)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
