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

// ── Spanish Word Lists ────────────────────────────────────────────────────────

// Easy: up to 5 letters (Spanish)
export const EASY_WORDS_ES: HangmanWord[] = [
  { word: 'GATO', hint: 'Animal que maulla', category: 'Animales' },
  { word: 'LUNA', hint: 'Brilla en la noche', category: 'Naturaleza' },
  { word: 'MESA', hint: 'Mueble para comer', category: 'Objetos' },
  { word: 'AGUA', hint: 'Liquido para beber', category: 'Naturaleza' },
  { word: 'FLOR', hint: 'Crece en el jardin', category: 'Naturaleza' },
  { word: 'PERRO', hint: 'Mejor amigo del hombre', category: 'Animales' },
  { word: 'ARBOL', hint: 'Planta grande con hojas', category: 'Naturaleza' },
  { word: 'CIELO', hint: 'Lo ves al mirar arriba', category: 'Naturaleza' },
  { word: 'PLAYA', hint: 'Arena junto al mar', category: 'Lugares' },
  { word: 'LIBRO', hint: 'Tiene paginas para leer', category: 'Objetos' },
  { word: 'FUEGO', hint: 'Produce calor y luz', category: 'Naturaleza' },
  { word: 'NIEVE', hint: 'Cae blanca del cielo en invierno', category: 'Naturaleza' },
  { word: 'RELOJ', hint: 'Muestra la hora', category: 'Objetos' },
  { word: 'TIGRE', hint: 'Felino con rayas', category: 'Animales' },
  { word: 'MUNDO', hint: 'Nuestro planeta', category: 'Ciencia' },
  { word: 'NOCHE', hint: 'Cuando el sol se va', category: 'Tiempo' },
  { word: 'LECHE', hint: 'Bebida blanca de la vaca', category: 'Comida' },
  { word: 'QUESO', hint: 'Se hace con leche', category: 'Comida' },
  { word: 'BARCO', hint: 'Navega en el agua', category: 'Transporte' },
  { word: 'SILLA', hint: 'Te sientas en ella', category: 'Objetos' },
  { word: 'HONGO', hint: 'Crece en lugares humedos', category: 'Naturaleza' },
]

// Medium: 6-10 letters (Spanish)
export const MEDIUM_WORDS_ES: HangmanWord[] = [
  { word: 'MARIPOSA', hint: 'Insecto con alas coloridas', category: 'Animales' },
  { word: 'ELEFANTE', hint: 'Animal terrestre mas grande', category: 'Animales' },
  { word: 'MONTANA', hint: 'Formacion de tierra muy alta', category: 'Naturaleza' },
  { word: 'ESTRELLA', hint: 'Brilla en el cielo nocturno', category: 'Naturaleza' },
  { word: 'CHOCOLATE', hint: 'Dulce hecho de cacao', category: 'Comida' },
  { word: 'DINOSAURIO', hint: 'Reptil gigante extinto', category: 'Animales' },
  { word: 'UNIVERSO', hint: 'Todo lo que existe', category: 'Ciencia' },
  { word: 'CASCADA', hint: 'Agua que cae de un acantilado', category: 'Naturaleza' },
  { word: 'GUITARRA', hint: 'Instrumento musical con cuerdas', category: 'Musica' },
  { word: 'PARAGUAS', hint: 'Te protege de la lluvia', category: 'Objetos' },
  { word: 'SANDWICH', hint: 'Comida entre dos panes', category: 'Comida' },
  { word: 'TECLADO', hint: 'Dispositivo para escribir en la computadora', category: 'Tecnologia' },
  { word: 'LIMONADA', hint: 'Bebida dulce de limon', category: 'Comida' },
  { word: 'ARCOIRIS', hint: 'Arco de colores en el cielo', category: 'Naturaleza' },
  { word: 'ESQUELETO', hint: 'Huesos del cuerpo', category: 'Cuerpo' },
  { word: 'VOLCAN', hint: 'Montana que lanza lava', category: 'Naturaleza' },
  { word: 'PANQUEQUE', hint: 'Comida plana para el desayuno', category: 'Comida' },
  { word: 'TOMATE', hint: 'Fruta roja para ensaladas', category: 'Comida' },
  { word: 'ZANAHORIA', hint: 'Vegetal naranja largo', category: 'Comida' },
  { word: 'CARPINTERO', hint: 'Persona que trabaja con madera', category: 'Personas' },
]

// Hard: 11+ letters (Spanish)
export const HARD_WORDS_ES: HangmanWord[] = [
  { word: 'AGRICULTURA', hint: 'Cultivo de la tierra', category: 'Ciencia' },
  { word: 'ELECTRICIDAD', hint: 'Energia que alimenta tu casa', category: 'Ciencia' },
  { word: 'FOTOGRAFIA', hint: 'Arte de tomar fotos', category: 'Arte' },
  { word: 'IMAGINACION', hint: 'Crear imagenes en tu mente', category: 'Acciones' },
  { word: 'VETERINARIO', hint: 'Doctor de animales', category: 'Personas' },
  { word: 'TERMOMETRO', hint: 'Mide la temperatura', category: 'Ciencia' },
  { word: 'ENCICLOPEDIA', hint: 'Libro con todo el conocimiento', category: 'Objetos' },
  { word: 'SALTAMONTES', hint: 'Insecto verde que salta', category: 'Animales' },
  { word: 'OBSERVATORIO', hint: 'Lugar para ver las estrellas', category: 'Lugares' },
  { word: 'VECINDARIO', hint: 'Zona donde vives', category: 'Lugares' },
  { word: 'SOBRESALIENTE', hint: 'Excepcionalmente bueno', category: 'Lenguaje' },
  { word: 'TRAMPOLIN', hint: 'Superficie para saltar', category: 'Deportes' },
  { word: 'COMPUTADORA', hint: 'Maquina para trabajar y jugar', category: 'Tecnologia' },
  { word: 'RESTAURANTE', hint: 'Lugar donde comes fuera de casa', category: 'Lugares' },
  { word: 'HELICOPTERO', hint: 'Vehiculo volador con helices', category: 'Transporte' },
  { word: 'SUPERMERCADO', hint: 'Tienda grande para comprar comida', category: 'Lugares' },
  { word: 'COMUNICACION', hint: 'Intercambio de informacion', category: 'Lenguaje' },
  { word: 'MATEMATICAS', hint: 'Ciencia de los numeros', category: 'Ciencia' },
  { word: 'TEMPERATURA', hint: 'Medida de calor o frio', category: 'Ciencia' },
  { word: 'ROMPECABEZAS', hint: 'Juego de piezas que encajan', category: 'Juegos' },
]

// ── Portuguese Word Lists ────────────────────────────────────────────────────

// Easy: up to 5 letters (Portuguese)
export const EASY_WORDS_PT: HangmanWord[] = [
  { word: 'GATO', hint: 'Animal que mia', category: 'Animais' },
  { word: 'LUA', hint: 'Brilha a noite', category: 'Natureza' },
  { word: 'MESA', hint: 'Movel para comer', category: 'Objetos' },
  { word: 'AGUA', hint: 'Liquido para beber', category: 'Natureza' },
  { word: 'FLOR', hint: 'Cresce no jardim', category: 'Natureza' },
  { word: 'PEIXE', hint: 'Vive na agua', category: 'Animais' },
  { word: 'LIVRO', hint: 'Tem paginas para ler', category: 'Objetos' },
  { word: 'FOGO', hint: 'Produz calor e luz', category: 'Natureza' },
  { word: 'NEVE', hint: 'Cai branca do ceu no inverno', category: 'Natureza' },
  { word: 'TIGRE', hint: 'Felino com listras', category: 'Animais' },
  { word: 'MUNDO', hint: 'Nosso planeta', category: 'Ciencia' },
  { word: 'NOITE', hint: 'Quando o sol se vai', category: 'Tempo' },
  { word: 'LEITE', hint: 'Bebida branca da vaca', category: 'Comida' },
  { word: 'QUEIJO', hint: 'Feito com leite', category: 'Comida' },
  { word: 'BARCO', hint: 'Navega na agua', category: 'Transporte' },
  { word: 'PRAIA', hint: 'Areia junto ao mar', category: 'Lugares' },
  { word: 'PORTA', hint: 'Abre e fecha a entrada', category: 'Objetos' },
  { word: 'PEDRA', hint: 'Encontrada no chao, dura', category: 'Natureza' },
  { word: 'NUVEM', hint: 'Branca e fofa no ceu', category: 'Natureza' },
  { word: 'CHUVA', hint: 'Agua que cai do ceu', category: 'Natureza' },
]

// Medium: 6-10 letters (Portuguese)
export const MEDIUM_WORDS_PT: HangmanWord[] = [
  { word: 'BORBOLETA', hint: 'Inseto com asas coloridas', category: 'Animais' },
  { word: 'ELEFANTE', hint: 'Maior animal terrestre', category: 'Animais' },
  { word: 'MONTANHA', hint: 'Formacao de terra muito alta', category: 'Natureza' },
  { word: 'ESTRELA', hint: 'Brilha no ceu a noite', category: 'Natureza' },
  { word: 'CHOCOLATE', hint: 'Doce feito de cacau', category: 'Comida' },
  { word: 'UNIVERSO', hint: 'Tudo que existe', category: 'Ciencia' },
  { word: 'CASCATA', hint: 'Agua caindo de um penhasco', category: 'Natureza' },
  { word: 'GUITARRA', hint: 'Instrumento musical com cordas', category: 'Musica' },
  { word: 'TECLADO', hint: 'Dispositivo para digitar', category: 'Tecnologia' },
  { word: 'LIMONADA', hint: 'Bebida doce de limao', category: 'Comida' },
  { word: 'ARCOIRIS', hint: 'Arco de cores no ceu', category: 'Natureza' },
  { word: 'ESQUELETO', hint: 'Ossos do corpo', category: 'Corpo' },
  { word: 'VULCAO', hint: 'Montanha que lanca lava', category: 'Natureza' },
  { word: 'PANQUECA', hint: 'Comida plana para o cafe', category: 'Comida' },
  { word: 'TOMATE', hint: 'Fruta vermelha para saladas', category: 'Comida' },
  { word: 'CENOURA', hint: 'Vegetal laranja comprido', category: 'Comida' },
  { word: 'TARTARUGA', hint: 'Animal lento com casco', category: 'Animais' },
  { word: 'COGUMELO', hint: 'Fungo que cresce na floresta', category: 'Natureza' },
  { word: 'CANGURU', hint: 'Animal australiano que pula', category: 'Animais' },
  { word: 'GIRAFA', hint: 'Animal mais alto do mundo', category: 'Animais' },
]

// Hard: 11+ letters (Portuguese)
export const HARD_WORDS_PT: HangmanWord[] = [
  { word: 'AGRICULTURA', hint: 'Cultivo da terra', category: 'Ciencia' },
  { word: 'ELETRICIDADE', hint: 'Energia que alimenta sua casa', category: 'Ciencia' },
  { word: 'FOTOGRAFIA', hint: 'Arte de tirar fotos', category: 'Arte' },
  { word: 'IMAGINACAO', hint: 'Criar imagens na mente', category: 'Acoes' },
  { word: 'VETERINARIO', hint: 'Medico de animais', category: 'Pessoas' },
  { word: 'TERMOMETRO', hint: 'Mede a temperatura', category: 'Ciencia' },
  { word: 'ENCICLOPEDIA', hint: 'Livro com todo o conhecimento', category: 'Objetos' },
  { word: 'GAFANHOTO', hint: 'Inseto verde que pula', category: 'Animais' },
  { word: 'OBSERVATORIO', hint: 'Lugar para ver as estrelas', category: 'Lugares' },
  { word: 'VIZINHANCA', hint: 'Area onde voce mora', category: 'Lugares' },
  { word: 'EXCEPCIONAL', hint: 'Excepcionalmente bom', category: 'Linguagem' },
  { word: 'TRAMPOLIM', hint: 'Superficie para pular', category: 'Esportes' },
  { word: 'COMPUTADOR', hint: 'Maquina para trabalhar e jogar', category: 'Tecnologia' },
  { word: 'RESTAURANTE', hint: 'Lugar onde come fora de casa', category: 'Lugares' },
  { word: 'HELICOPTERO', hint: 'Veiculo voador com helices', category: 'Transporte' },
  { word: 'SUPERMERCADO', hint: 'Loja grande para comprar comida', category: 'Lugares' },
  { word: 'COMUNICACAO', hint: 'Troca de informacao', category: 'Linguagem' },
  { word: 'MATEMATICA', hint: 'Ciencia dos numeros', category: 'Ciencia' },
  { word: 'TEMPERATURA', hint: 'Medida de calor ou frio', category: 'Ciencia' },
  { word: 'QUEBRACABECA', hint: 'Jogo de pecas que encaixam', category: 'Jogos' },
]

export const MAX_WRONG = 6 // head, body, left arm, right arm, left leg, right leg
export const ROUNDS_PER_GAME = 5

export function getWordsForDifficulty(difficulty: string, lang: string = 'en'): HangmanWord[] {
  if (lang === 'es') {
    if (difficulty === 'easy') return EASY_WORDS_ES
    if (difficulty === 'medium') return MEDIUM_WORDS_ES
    return HARD_WORDS_ES
  }
  if (lang === 'pt') {
    if (difficulty === 'easy') return EASY_WORDS_PT
    if (difficulty === 'medium') return MEDIUM_WORDS_PT
    return HARD_WORDS_PT
  }
  // Default: English
  if (difficulty === 'easy') return EASY_WORDS
  if (difficulty === 'medium') return MEDIUM_WORDS
  return HARD_WORDS
}

export function pickRandomWords(difficulty: string, count: number, lang: string = 'en'): HangmanWord[] {
  const pool = getWordsForDifficulty(difficulty, lang)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
