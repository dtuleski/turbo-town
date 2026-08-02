/**
 * Word Puzzle Game Utilities
 * Generates word search puzzles with hidden words
 */

export interface WordPuzzle {
  grid: string[][]
  words: string[]
  foundWords: Set<string>
  gridSize: number
}

export interface WordPosition {
  word: string
  startRow: number
  startCol: number
  direction: 'horizontal' | 'vertical' | 'diagonal'
}

// Word lists by difficulty and language
const WORD_LISTS_BY_LOCALE: Record<string, Record<string, string[]>> = {
  en: {
    easy: [
      'CAT', 'DOG', 'SUN', 'MOON', 'STAR', 'TREE', 'FISH', 'BIRD',
      'BOOK', 'CAKE', 'BALL', 'RAIN', 'SNOW', 'WIND', 'FIRE', 'WATER',
      'BEAR', 'FROG', 'DUCK', 'WOLF', 'SEED', 'LEAF', 'ROCK', 'HILL',
      'LAMP', 'SHIP', 'COIN', 'DRUM', 'BELL', 'KITE', 'NEST', 'ROPE',
      'RING', 'GATE', 'PATH', 'LAKE', 'CAVE', 'DEER', 'CORN', 'BEAN',
      'CRAB', 'WORM', 'TOAD', 'GOAT', 'MILK', 'SOUP', 'RICE', 'PLUM'
    ],
    medium: [
      'APPLE', 'BEACH', 'CLOUD', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HEART',
      'ISLAND', 'JUNGLE', 'KNIGHT', 'LEMON', 'MAGIC', 'NIGHT', 'OCEAN', 'PIANO',
      'QUEEN', 'RIVER', 'STORM', 'TIGER', 'URBAN', 'VOICE', 'WHALE', 'YOUTH',
      'BRAVE', 'CREAM', 'DRIFT', 'FROST', 'GLOBE', 'HONEY', 'IVORY', 'JEWEL',
      'MAPLE', 'NOBLE', 'OLIVE', 'PEARL', 'QUILT', 'ROBIN', 'SPINE', 'TORCH',
      'VAPOR', 'WAGON', 'CORAL', 'DELTA', 'EMBER', 'FLUTE', 'GRAIN', 'HIKER'
    ],
    hard: [
      'ADVENTURE', 'BUTTERFLY', 'CHAMPION', 'DIAMOND', 'ELEPHANT', 'FOUNTAIN',
      'GALAXY', 'HARMONY', 'INFINITY', 'JOURNEY', 'KINGDOM', 'LIGHTNING',
      'MOUNTAIN', 'NOTEBOOK', 'ORCHESTRA', 'PARADISE', 'TREASURE', 'UMBRELLA',
      'VACATION', 'WATERFALL', 'ALPHABET', 'BLIZZARD', 'CALENDAR', 'DINOSAUR',
      'FIREWORK', 'GARDENER', 'HOSPITAL', 'KANGAROO', 'LAVENDER', 'MUSHROOM',
      'NIGHTFALL', 'PAINTING', 'SANDWICH', 'TRIANGLE', 'UNIVERSE', 'WINDMILL'
    ]
  },
  es: {
    easy: [
      'SOL', 'MAR', 'LUZ', 'PAN', 'REY', 'OJO', 'RIO', 'OSO',
      'FLOR', 'LUNA', 'MESA', 'GATO', 'PATO', 'NUBE', 'ROJO', 'AZUL',
      'PEZ', 'AVE', 'TIO', 'SAL', 'MIS', 'DOS', 'TEN', 'VER',
      'LOBO', 'RANA', 'PERA', 'HOJA', 'ROCA', 'LAGO', 'PELO', 'MANO',
      'SOPA', 'DADO', 'LEON', 'VINO', 'ROSA', 'ISLA', 'CAJA', 'TUBO',
      'PISO', 'MIEL', 'NAVE', 'TORO', 'CODO', 'SEDA', 'NUEZ', 'LIMA'
    ],
    medium: [
      'PLAYA', 'NOCHE', 'FUEGO', 'TIGRE', 'VERDE', 'CIELO', 'MUNDO', 'PIANO',
      'ARENA', 'BOSQUE', 'CAMPO', 'DULCE', 'HIELO', 'JARDIN', 'LLUVIA', 'MUSICA',
      'REINA', 'NIEVE', 'SILLA', 'PLUMA', 'GLOBO', 'CORTE', 'TORRE', 'GRUPO',
      'BARCO', 'FRUTA', 'JUEGO', 'GRITO', 'HUEVO', 'LIBRO', 'MANGO', 'PERRO',
      'PIEDRA', 'QUESO', 'RELOJ', 'SOMBRA', 'TRIGO', 'UNICO', 'VALLE', 'ZORRO',
      'ABEJA', 'BRISA', 'CANTO', 'DANZA', 'ESPADA', 'FERIA', 'GLOBO', 'HORNO'
    ],
    hard: [
      'AVENTURA', 'MARIPOSA', 'ELEFANTE', 'DIAMANTE', 'CAMPEON', 'GALAXIA',
      'ARMONIA', 'INFINITO', 'ESTRELLA', 'CASCADA', 'MISTERIO', 'UNIVERSO',
      'ACUARELA', 'BANDERA', 'CAPITULO', 'DESCANSO', 'ESCALERA', 'FANTASIA',
      'GIRASOL', 'HOSPITAL', 'INVIERNO', 'JABALINA', 'LABERINTO', 'MANTEQUILLA',
      'NARANJA', 'ORQUESTA', 'PARAGUAS', 'ROMPECABEZAS', 'SERPIENTE', 'TORMENTA',
      'UNIVERSO', 'VENTISCA', 'ZAPATILLA', 'CABALLERO', 'DINOSAURIO', 'ESPERANZA'
    ]
  },
  pt: {
    easy: [
      'SOL', 'MAR', 'LUA', 'COR', 'REI', 'PAZ', 'RIO', 'CHA',
      'FLOR', 'GATO', 'PATO', 'BOLA', 'NEVE', 'FOGO', 'AGUA', 'AZUL',
      'PEZ', 'AVE', 'TIO', 'SAL', 'MEL', 'DOI', 'TEM', 'VER',
      'LOBO', 'SAPO', 'PERA', 'FOLHA', 'ROCHA', 'LAGO', 'PELO', 'MANO',
      'SOPA', 'DADO', 'LEAO', 'VINHO', 'ROSA', 'ILHA', 'CAIXA', 'TUBO',
      'PISO', 'NAVE', 'TOURO', 'SEDA', 'NOZE', 'LIMA', 'REDE', 'URSO'
    ],
    medium: [
      'PRAIA', 'NOITE', 'NUVEM', 'TIGRE', 'VERDE', 'MUNDO', 'PIANO', 'SONHO',
      'AREIA', 'CAMPO', 'DOCE', 'GELO', 'JARDIM', 'CHUVA', 'MUSICA', 'OCEANO',
      'RAINHA', 'NEVE', 'CADEIRA', 'PLUMA', 'GLOBO', 'CORTE', 'TORRE', 'GRUPO',
      'BARCO', 'FRUTA', 'JOGO', 'GRITO', 'LIVRO', 'MANGA', 'PEDRA', 'QUEIJO',
      'BRISA', 'CANTO', 'DANCA', 'ESPADA', 'FESTA', 'FORNO', 'GRUTA', 'HEROI',
      'LEITE', 'MILHO', 'NOBRE', 'OLIVA', 'PEROLA', 'QUEDA', 'SOPRO', 'TOCHA'
    ],
    hard: [
      'AVENTURA', 'BORBOLETA', 'ELEFANTE', 'DIAMANTE', 'CAMPEAO', 'GALAXIA',
      'HARMONIA', 'INFINITO', 'MONTANHA', 'ESTRELA', 'CASCATA', 'MISTERIO',
      'AQUARELA', 'BANDEIRA', 'CAPITULO', 'DESCANSO', 'ESCADARIA', 'FANTASIA',
      'GIRASSOL', 'HOSPITAL', 'INVERNO', 'LABIRINTO', 'MANTEIGA', 'LARANJA',
      'ORQUESTRA', 'PARAGUAS', 'SERPENTE', 'TEMPESTADE', 'UNIVERSO', 'VENTANIA',
      'SAPATILHA', 'CAVALEIRO', 'DINOSSAURO', 'ESPERANCA', 'FOGUEIRA', 'GRANDEZA'
    ]
  }
}

function getWordLists(locale?: string): Record<string, string[]> {
  const lang = (locale || 'en').substring(0, 2)
  return WORD_LISTS_BY_LOCALE[lang] || WORD_LISTS_BY_LOCALE['en']
}

/**
 * Generate a word search puzzle
 */
export function generateWordPuzzle(difficulty: 'easy' | 'medium' | 'hard', locale?: string): WordPuzzle {
  const config = {
    easy: { gridSize: 10, wordCount: 6 },
    medium: { gridSize: 12, wordCount: 8 },
    hard: { gridSize: 15, wordCount: 10 }
  }

  const { gridSize, wordCount } = config[difficulty]
  const wordList = getWordLists(locale)[difficulty]
  
  // Select random words
  const selectedWords = selectRandomWords(wordList, wordCount)
  
  // Create empty grid
  const grid: string[][] = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill('')
  )
  
  // Place words in grid
  const positions: WordPosition[] = []
  for (const word of selectedWords) {
    const position = placeWord(grid, word, gridSize)
    if (position) {
      positions.push(position)
    }
  }
  
  // Fill empty cells with random letters
  fillEmptyCells(grid, gridSize)
  
  return {
    grid,
    words: selectedWords,
    foundWords: new Set(),
    gridSize
  }
}

/**
 * Select random words from list
 */
function selectRandomWords(wordList: string[], count: number): string[] {
  const shuffled = [...wordList].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Place a word in the grid
 */
function placeWord(
  grid: string[][],
  word: string,
  gridSize: number
): WordPosition | null {
  const directions: Array<'horizontal' | 'vertical' | 'diagonal'> = [
    'horizontal',
    'vertical',
    'diagonal'
  ]
  
  // Shuffle directions
  const shuffledDirections = directions.sort(() => Math.random() - 0.5)
  
  // Try each direction
  for (const direction of shuffledDirections) {
    const maxAttempts = 50
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const position = tryPlaceWord(grid, word, gridSize, direction)
      if (position) {
        return position
      }
    }
  }
  
  return null
}

/**
 * Try to place word in a specific direction
 */
function tryPlaceWord(
  grid: string[][],
  word: string,
  gridSize: number,
  direction: 'horizontal' | 'vertical' | 'diagonal'
): WordPosition | null {
  let startRow: number
  let startCol: number
  
  // Calculate valid starting positions
  if (direction === 'horizontal') {
    startRow = Math.floor(Math.random() * gridSize)
    startCol = Math.floor(Math.random() * (gridSize - word.length + 1))
  } else if (direction === 'vertical') {
    startRow = Math.floor(Math.random() * (gridSize - word.length + 1))
    startCol = Math.floor(Math.random() * gridSize)
  } else { // diagonal
    startRow = Math.floor(Math.random() * (gridSize - word.length + 1))
    startCol = Math.floor(Math.random() * (gridSize - word.length + 1))
  }
  
  // Check if word can be placed
  if (!canPlaceWord(grid, word, startRow, startCol, direction)) {
    return null
  }
  
  // Place the word
  for (let i = 0; i < word.length; i++) {
    if (direction === 'horizontal') {
      grid[startRow][startCol + i] = word[i]
    } else if (direction === 'vertical') {
      grid[startRow + i][startCol] = word[i]
    } else { // diagonal
      grid[startRow + i][startCol + i] = word[i]
    }
  }
  
  return { word, startRow, startCol, direction }
}

/**
 * Check if word can be placed at position
 */
function canPlaceWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: 'horizontal' | 'vertical' | 'diagonal'
): boolean {
  for (let i = 0; i < word.length; i++) {
    let row: number
    let col: number
    
    if (direction === 'horizontal') {
      row = startRow
      col = startCol + i
    } else if (direction === 'vertical') {
      row = startRow + i
      col = startCol
    } else { // diagonal
      row = startRow + i
      col = startCol + i
    }
    
    // Check if cell is empty or has the same letter
    if (grid[row][col] !== '' && grid[row][col] !== word[i]) {
      return false
    }
  }
  
  return true
}

/**
 * Fill empty cells with random letters
 */
function fillEmptyCells(grid: string[][], gridSize: number): void {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] === '') {
        grid[row][col] = letters[Math.floor(Math.random() * letters.length)]
      }
    }
  }
}

/**
 * Check if selected cells form a word
 */
export function checkWord(
  grid: string[][],
  selectedCells: Array<{ row: number; col: number }>,
  words: string[]
): string | null {
  if (selectedCells.length < 3) return null
  
  // Get the word from selected cells
  const word = selectedCells.map(cell => grid[cell.row][cell.col]).join('')
  
  // Check if it matches any word (forward or backward)
  for (const targetWord of words) {
    if (word === targetWord || word === targetWord.split('').reverse().join('')) {
      return targetWord
    }
  }
  
  return null
}

/**
 * Check if selection is valid (straight line)
 */
export function isValidSelection(
  selectedCells: Array<{ row: number; col: number }>
): boolean {
  if (selectedCells.length < 2) return true
  
  const first = selectedCells[0]
  const second = selectedCells[1]
  
  const rowDiff = second.row - first.row
  const colDiff = second.col - first.col
  
  // Check if it's horizontal, vertical, or diagonal
  const isHorizontal = rowDiff === 0
  const isVertical = colDiff === 0
  const isDiagonal = Math.abs(rowDiff) === Math.abs(colDiff)
  
  if (!isHorizontal && !isVertical && !isDiagonal) {
    return false
  }
  
  // Check if all cells are in a straight line
  for (let i = 2; i < selectedCells.length; i++) {
    const curr = selectedCells[i]
    const prev = selectedCells[i - 1]
    
    const currRowDiff = curr.row - prev.row
    const currColDiff = curr.col - prev.col
    
    if (currRowDiff !== rowDiff || currColDiff !== colDiff) {
      return false
    }
  }
  
  return true
}
