// ── GeoQuiz Data ────────────────────────────────────────────────────────────
// All geography data embedded in frontend — no DynamoDB needed

export interface Country {
  name: string
  capital: string
  flag: string
  continent: 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Central America' | 'Oceania'
  funFact: string
  silhouettePath?: string // SVG path for hard mode
}

export interface StateProvince {
  name: string
  capital: string
  country: string
  countryFlag: string
}

// ── COUNTRIES + CAPITALS ──────────────────────────────────────────────────────

export const COUNTRIES: Country[] = [
  // Americas
  { name: 'Brazil', capital: 'Brasília', flag: '🇧🇷', continent: 'South America', funFact: 'Largest country in South America' },
  { name: 'Argentina', capital: 'Buenos Aires', flag: '🇦🇷', continent: 'South America', funFact: 'Home of tango dance' },
  { name: 'Chile', capital: 'Santiago', flag: '🇨🇱', continent: 'South America', funFact: 'Longest north-south country' },
  { name: 'Colombia', capital: 'Bogotá', flag: '🇨🇴', continent: 'South America', funFact: 'Named after Christopher Columbus' },
  { name: 'Peru', capital: 'Lima', flag: '🇵🇪', continent: 'South America', funFact: 'Home of Machu Picchu' },
  { name: 'Mexico', capital: 'Mexico City', flag: '🇲🇽', continent: 'North America', funFact: 'Most populated Spanish-speaking country' },
  { name: 'Canada', capital: 'Ottawa', flag: '🇨🇦', continent: 'North America', funFact: 'Second largest country by area' },
  { name: 'United States', capital: 'Washington D.C.', flag: '🇺🇸', continent: 'North America', funFact: '50 states' },
  { name: 'Cuba', capital: 'Havana', flag: '🇨🇺', continent: 'Central America', funFact: 'Largest Caribbean island' },
  { name: 'Uruguay', capital: 'Montevideo', flag: '🇺🇾', continent: 'South America', funFact: 'First FIFA World Cup host' },
  // Europe
  { name: 'France', capital: 'Paris', flag: '🇫🇷', continent: 'Europe', funFact: 'Most visited country in the world' },
  { name: 'Germany', capital: 'Berlin', flag: '🇩🇪', continent: 'Europe', funFact: 'Largest economy in Europe' },
  { name: 'Italy', capital: 'Rome', flag: '🇮🇹', continent: 'Europe', funFact: 'Home of pizza and pasta' },
  { name: 'Spain', capital: 'Madrid', flag: '🇪🇸', continent: 'Europe', funFact: 'Second largest country in Europe' },
  { name: 'Portugal', capital: 'Lisbon', flag: '🇵🇹', continent: 'Europe', funFact: 'Oldest country in Europe with same borders' },
  { name: 'United Kingdom', capital: 'London', flag: '🇬🇧', continent: 'Europe', funFact: 'Home of Big Ben' },
  { name: 'Greece', capital: 'Athens', flag: '🇬🇷', continent: 'Europe', funFact: 'Birthplace of democracy' },
  { name: 'Netherlands', capital: 'Amsterdam', flag: '🇳🇱', continent: 'Europe', funFact: 'Famous for tulips and windmills' },
  { name: 'Switzerland', capital: 'Bern', flag: '🇨🇭', continent: 'Europe', funFact: 'Known for chocolate and watches' },
  { name: 'Poland', capital: 'Warsaw', flag: '🇵🇱', continent: 'Europe', funFact: 'Home of Copernicus' },
  { name: 'Sweden', capital: 'Stockholm', flag: '🇸🇪', continent: 'Europe', funFact: 'Home of the Nobel Prize' },
  { name: 'Norway', capital: 'Oslo', flag: '🇳🇴', continent: 'Europe', funFact: 'Land of the midnight sun' },
  { name: 'Austria', capital: 'Vienna', flag: '🇦🇹', continent: 'Europe', funFact: 'Home of Mozart' },
  { name: 'Belgium', capital: 'Brussels', flag: '🇧🇪', continent: 'Europe', funFact: 'EU headquarters' },
  { name: 'Ireland', capital: 'Dublin', flag: '🇮🇪', continent: 'Europe', funFact: 'The Emerald Isle' },
  { name: 'Czech Republic', capital: 'Prague', flag: '🇨🇿', continent: 'Europe', funFact: 'Most castles per capita' },
  { name: 'Denmark', capital: 'Copenhagen', flag: '🇩🇰', continent: 'Europe', funFact: 'Home of LEGO' },
  { name: 'Finland', capital: 'Helsinki', flag: '🇫🇮', continent: 'Europe', funFact: 'Land of a thousand lakes' },
  { name: 'Romania', capital: 'Bucharest', flag: '🇷🇴', continent: 'Europe', funFact: 'Home of Dracula legend' },
  { name: 'Turkey', capital: 'Ankara', flag: '🇹🇷', continent: 'Europe', funFact: 'Bridges two continents' },
  // Asia
  { name: 'Japan', capital: 'Tokyo', flag: '🇯🇵', continent: 'Asia', funFact: 'Land of the rising sun' },
  { name: 'China', capital: 'Beijing', flag: '🇨🇳', continent: 'Asia', funFact: 'Most populated country' },
  { name: 'India', capital: 'New Delhi', flag: '🇮🇳', continent: 'Asia', funFact: 'Home of the Taj Mahal' },
  { name: 'South Korea', capital: 'Seoul', flag: '🇰🇷', continent: 'Asia', funFact: 'Home of K-pop' },
  { name: 'Thailand', capital: 'Bangkok', flag: '🇹🇭', continent: 'Asia', funFact: 'Land of smiles' },
  { name: 'Vietnam', capital: 'Hanoi', flag: '🇻🇳', continent: 'Asia', funFact: 'Famous for pho soup' },
  { name: 'Indonesia', capital: 'Jakarta', flag: '🇮🇩', continent: 'Asia', funFact: 'Largest archipelago' },
  { name: 'Philippines', capital: 'Manila', flag: '🇵🇭', continent: 'Asia', funFact: 'Over 7,000 islands' },
  // Africa
  { name: 'Egypt', capital: 'Cairo', flag: '🇪🇬', continent: 'Africa', funFact: 'Home of the pyramids' },
  { name: 'South Africa', capital: 'Pretoria', flag: '🇿🇦', continent: 'Africa', funFact: 'Has three capital cities' },
  { name: 'Nigeria', capital: 'Abuja', flag: '🇳🇬', continent: 'Africa', funFact: 'Most populated African country' },
  { name: 'Kenya', capital: 'Nairobi', flag: '🇰🇪', continent: 'Africa', funFact: 'Famous for safaris' },
  { name: 'Morocco', capital: 'Rabat', flag: '🇲🇦', continent: 'Africa', funFact: 'Gateway to Africa' },
  { name: 'Ethiopia', capital: 'Addis Ababa', flag: '🇪🇹', continent: 'Africa', funFact: 'Birthplace of coffee' },
  // Oceania
  { name: 'Australia', capital: 'Canberra', flag: '🇦🇺', continent: 'Oceania', funFact: 'Both a country and a continent' },
  { name: 'New Zealand', capital: 'Wellington', flag: '🇳🇿', continent: 'Oceania', funFact: 'First country to give women the vote' },
]

// ── STATES/PROVINCES + CAPITALS (Medium mode) ─────────────────────────────────

export const STATES: StateProvince[] = [
  // US States
  { name: 'California', capital: 'Sacramento', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Texas', capital: 'Austin', country: 'US', countryFlag: '🇺🇸' },
  { name: 'New York', capital: 'Albany', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Florida', capital: 'Tallahassee', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Georgia', capital: 'Atlanta', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Illinois', capital: 'Springfield', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Ohio', capital: 'Columbus', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Pennsylvania', capital: 'Harrisburg', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Massachusetts', capital: 'Boston', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Virginia', capital: 'Richmond', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Washington', capital: 'Olympia', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Colorado', capital: 'Denver', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Arizona', capital: 'Phoenix', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Michigan', capital: 'Lansing', country: 'US', countryFlag: '🇺🇸' },
  { name: 'Minnesota', capital: 'Saint Paul', country: 'US', countryFlag: '🇺🇸' },
  // Brazil States
  { name: 'São Paulo', capital: 'São Paulo', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Rio de Janeiro', capital: 'Rio de Janeiro', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Minas Gerais', capital: 'Belo Horizonte', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Paraná', capital: 'Curitiba', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Bahia', capital: 'Salvador', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Rio Grande do Sul', capital: 'Porto Alegre', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Pernambuco', capital: 'Recife', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Ceará', capital: 'Fortaleza', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Goiás', capital: 'Goiânia', country: 'Brazil', countryFlag: '🇧🇷' },
  { name: 'Amazonas', capital: 'Manaus', country: 'Brazil', countryFlag: '🇧🇷' },
  // Mexico States
  { name: 'Jalisco', capital: 'Guadalajara', country: 'Mexico', countryFlag: '🇲🇽' },
  { name: 'Nuevo León', capital: 'Monterrey', country: 'Mexico', countryFlag: '🇲🇽' },
  { name: 'Yucatán', capital: 'Mérida', country: 'Mexico', countryFlag: '🇲🇽' },
  { name: 'Puebla', capital: 'Puebla', country: 'Mexico', countryFlag: '🇲🇽' },
  { name: 'Quintana Roo', capital: 'Chetumal', country: 'Mexico', countryFlag: '🇲🇽' },
  // Canada Provinces
  { name: 'Ontario', capital: 'Toronto', country: 'Canada', countryFlag: '🇨🇦' },
  { name: 'Quebec', capital: 'Quebec City', country: 'Canada', countryFlag: '🇨🇦' },
  { name: 'British Columbia', capital: 'Victoria', country: 'Canada', countryFlag: '🇨🇦' },
  { name: 'Alberta', capital: 'Edmonton', country: 'Canada', countryFlag: '🇨🇦' },
]

// ── GAME MODES ────────────────────────────────────────────────────────────────

export type GameMode = 'capitals' | 'flags' | 'states' | 'silhouettes' | 'continents'

export const GAME_MODES: Record<GameMode, { label: string; icon: string; description: string }> = {
  capitals: { label: 'Country Capitals', icon: '🏛️', description: 'Match countries to their capitals' },
  flags: { label: 'Flag Match', icon: '🏁', description: 'Identify countries by their flags' },
  states: { label: 'States & Capitals', icon: '📍', description: 'Match states to their capitals' },
  silhouettes: { label: 'Country Shapes', icon: '🗺️', description: 'Identify countries by their outline' },
  continents: { label: 'Continent Sort', icon: '🌍', description: 'Which continent is this country in?' },
}

export const DIFFICULTY_MODES: Record<string, GameMode[]> = {
  easy: ['capitals', 'flags', 'continents'],
  medium: ['states'],
  hard: ['silhouettes'],
}

// ── COUNTRY SILHOUETTES (for hard mode) ───────────────────────────────────────
// Real SVG paths from world-map-country-shapes (Robinson projection, viewBox 0 0 2000 1001)
// Source: https://github.com/sirlisko/world-map-country-shapes (MIT license)

export const COUNTRY_SILHOUETTES: Record<string, string> = {
  "Argentina": "M669.8 920.7l.9-3-7.3-1.5-7.7-3.6-4.3-4.6-3-2.8 5.9 13.5h5l2.9.2 3.3 2.1 4.3-.3zm-50.4-208.1l-7.4-1.5-4 5.7.9 1.6-1.1 6.6-5.6 3.2 1.6 10.6-.9 2 2 2.5-3.2 4-2.6 5.9-.9 5.8 1.7 6.2-2.1 6.5 4.9 10.9 1.6 1.2 1.3 5.9-1.6 6.2 1.4 5.4-2.9 4.3 1.5 5.9 3.3 6.3-2.5 2.4.3 5.7.7 6.4 3.3 7.6-1.6 1.2 3.6 7.1 3.1 2.3-.8 2.6 2.8 1.3 1.3 2.3-1.8 1.1 1.8 3.7 1.1 8.2-.7 5.3 1.8 3.2-.1 3.9-2.7 2.7 3.1 6.6 2.6 2.2 3.1-.4 1.8 4.6 3.5 3.6 12 .8 4.8.9 2.2.4-4.7-3.6-4.1-6.3.9-2.9 3.5-2.5.5-7.2 4.7-3.5-.2-5.6-5.2-1.3-6.4-4.5-.1-4.7 2.9-3.1 4.7-.1.2-3.3-1.2-6.1 2.9-3.9 4.1-1.9-2.5-3.2-2.2 2-4-1.9-2.5-6.2 1.5-1.6 5.6 2.3 5-.9 2.5-2.2-1.8-3.1-.1-4.8-2-3.8 5.8.6 10.2-1.3 6.9-3.4 3.3-8.3-.3-3.2-3.9-2.8-.1-4.5-7.8-5.5-.3-3.3-.4-4.2.9-1.4-1.1-6.3.3-6.5.5-5.1 5.9-8.6 5.3-6.2 3.3-2.6 4.2-3.5-.5-5.1-3.1-3.7-2.6 1.2-.3 5.7-4.3 4.8-4.2 1.1-6.2-1-5.7-1.8 4.2-9.6-1.1-2.8-5.9-2.5-7.2-4.7-4.6-1-11.2-10.4-1-1.3-6.3-.3-1.6 5.1-3.7-4.6z",
  "Australia": "M1726.7 832l-3-.5-1.9 2.9-.6 5.4-2.1 4-.5 5.3 3 .2.8.3 6.6-4.3.6 1.7 4-4.9 3.2-2.2 4.5-7.3-2.8-.5-4.8 1.2-3.4.9-3.6-2.2zm50.1-172.3l.5-2.3.1-3.6-1.6-3.2.1-2.7-1.3-.8.1-3.9-1.2-3.2-2.3 2.4-.4 1.8-1.5 3.5-1.8 3.4.6 2.1-1.2 1.3-1.5 4.8.1 3.7-.7 1.8.3 3.1-2.6 5-1.3 3.5-1.7 2.9-1.7 3.4-4.1 2.1-4.9-2.1-.5-2-2.5-1.6h-1.6l-3.3-3.8-2.5-2.2-3.9-2-3.9-3.5-.1-1.8 2.5-3.1 2.1-3.2-.3-2.6 1.9-.2 2.5-2.5 2-3.4-2.2-3.2-1.5 1.2-2-.5-3.5 1.8-3.2-2-1.7.7-4.5-1.6-2.7-2.7-3.5-1.5-3.1.9 3.9 2.1-.3 3.2-4.8 1.2-2.8-.7-3.6 2.2-2.9 3.7.6 1.5-2.7 1.7-3.4 5.1.6 3.5-3.4-.6h-3.5l-2.5-3.8-3.7-2.9-2.8.8-2.6.9-.3 1.6-2.4-.7-.3 1.8-3 1.1-1.7 2.5-3.5 3.1-1.4 4.8-2.3-1.3-2.2 3.1 1.5 3-2.6 1.2-1.4-5.5-4.8 5.4-.8 3.5-.7 2.5-3.8 3.3-2 3.4-3.5 2.8-6.1 1.9-3.1-.2-1.5.6-1.1 1.4-3.5.7-4.7 2.4-1.4-.8-2.6.5-4.6 2.3-3.2 2.7-4.8 2.1-3.1 4.4.4-4.8-3.1 4.6-.1 3.7-1.3 3.2-1.5 1.5-1.3 3.7.9 1.9.1 2 1.6 5-.7 3.3-1-2.5-2.3-1.8.4 5.9-1.7-2.8.1 2.8 1.8 5-.6 5 1.7 2.5-.4 1.9.9 4.1-1.3 3.6-.3 3.6.7 6.5-.7 3.7-2.2 4.4-.6 2.3-1.5 1.5-2.9.8-1.5 3.7 2.4 1.2 4 4.1h3.6l3.8.3 3.3-2.1 3.4-1.8 1.4.3 4.5-3.4 3.8-.3 4.1-.7 4.2 1.2 3.6-.6 4.6-.2 3-2.6 2.3-3.3 5.2-1.5 6.9-3.2 5 .4 6.9-2.1 7.8-2.3 9.8-.6 4 3.1 3.7.2 5.3 3.8-1.6 1.5 1.8 2.4 1.3 4.6-1.6 3.4 2.9 2.6 4.3-5.1 4.3-2.1 6.7-5.5-1.6 4.7-3.4 3.2-2.5 3.7-4.4 3.5 5.2-1.2 4.7-4.4-.9 4.8-3.2 3.1 4.7.8 1.3 2.6-.4 3.3-1.5 4.9 1.4 4 4 1.9 2.8.4 2.4 1 3.5 1.8 7.2-4.7 3.5-1.2-2.7 3.4 2.6 1.1 2.7 2.8 4.7-2.7 3.8-2.5 6.3-2.7 6-.2 4.2-2.3.9-2 3-4.5 3.9-4.8 3.6-3.2 4.4-5.6 3.3-3.1 4.4-5 5.4-3.1 5-5.8 3.1-4.5 1.4-3.6 3.8-5.7 2.1-2.9 2.5-5.7-.7-5.4 1.7-3.9 1.1-3.7v-5.1l-2.8-5.1-1.9-2.5-2.9-3.9.7-6.7-1.5 1-1.6-2.8-2.5 1.4-.6-6.9-2.2-4 1-1.5-3.1-2.8-3.2-3-5.3-3.3-.9-4.3 1.3-3.3-.4-5.5-1.3-.7-.2-3.2-.2-5.5 1.1-2.8-2.3-2.5-1.4-2.7-3.9 2.4-1.2-5z",
  "Brazil": "M659 560.1l-1.4.2-3.1-.5-1.8 1.7-2.6 1.1-1.7.2-.7 1.3-2.7-.3-3.5-3-.3-2.9-1.4-3.3 1-5.4 1.6-2.2-1.2-3-1.9-.9.8-2.8-1.3-1.5-2.9.3.7 1.8-2.1 2.4-6.4 2.4-4 1-1.7 1.5-4.4-1.6-4.2-.8-1 .6 2.4 1.6-.3 4.3.7 4 4.8.5.3 1.4-4.1 1.8-.7 2.7-2.3 1-4.2 1.5-1.1 1.9-4.4.5-3-3.4-1.1.8-1-3.8-1.6-2-1.9 2.2-10.9-.1v3.9l3.3.7-.2 2.4-1.1-.6-3.2 1v4.6l2.5 2.4.9 3.6-.1 2.8-2.2 17.4-5.1-.3-.7 1-4.6 1.2-6.2 4.3-.4 3-1.3 2.2.7 3.4-3.3 1.9.1 2.7-1.5 1.1 2.6 5.8 3.3 3.8-1 2.8 3.7.3 2.3 3.4 4.9.2 4.4-3.8.2 9.7 2.6.7 3-1.1 4.2.6 2.9-.2 1.1-1.9 4.8-2.6 2.8-2.3 7.3-1.1-.4 4.7.9 2.5-.3 4.3 6.4 5.7 6.3 1 2.4 2.4 3.8 1.2 2.5 1.9 3.5-.1 3.3 1.9.5 3.7 1.2 1.8.3 2.8-1.6.1 2.7 7.4 10.7.3-.6 3.6.8 2.6 3.2 1.7 1.6 4-.5 5-1.3 2.8.8 3.6-1.6 1.3 1.9 3.6.4 8.6 6 1.2 2.1-1.2 3.9 1.7 1.2 1.9 1 5.8.9 2.5 2 .3 2-1.1 2.1 1.2.3 3.5-.3 3.8-.7 3.6 2.6-1.2 3.1 3.7.5 5.1-4.2 3.5-3.3 2.6-5.3 6.2-5.9 8.6 3.4-.7 6.2 4.9 1.9-.2 6.2 4.1 4.8 3.5 3.8 4.3-1.9 3 2.1 3.7 2.9-3.7 1.5-6 3.2-3 3.9-5 4.5-11.2 3.4-3.5.8-3.1.3-6.4-1.3-3.5.3-4.8 4.1-6.3 6-5.1 6-1.8 3.6-2.9 8.5-2.4h5.9l1.1-3.8 4.2-2.8.6-6.5 5.1-8.3.5-8.5 1.6-2.6.3-4.1 1.1-9.9-1-11.9 1.4-4.7 1.4-.1 3.9-5.5 3.3-7.2 7.7-8.8 2.7-4.2 2-10.5-1-3.9-2-8.1-2.1-2-4.8-.2-4.3-1.9-7.3-7.1-8.4-5.3-8.4.3-10.9-3.4-6.5 2 .8-3.5-2.7-3.8-9.4-3.8-7.1-2.3-4.2 4.1-.3-6.3-9.9-1-1.7-2 4.2-5.2-.1-4.4-3-1-3-11.2-1.3-3.5-1.9.3-3.5 5.8-1.8 4.7-2.1 2.4-2.7.5-.8-1.8-1.2-.3-1.8 1.8-2.4-1.3-3.2-1.4-2.7.7-2.3-.6-.5 1.8.9 1.3-.5 1.3-3.1-.5z",
  "Canada": "M659 276.7l-.7-3-2.5 1.9.5 2.1 5.6 2.6 1.9-.4 3.3-2.5-4.7.1-3.4-.8zm14.4-15.9l.2-1.1-4.1-2.6-5.9-1.6-1.9.6 3.5 2.9 5.7 1.9 2.5-.1zm-305.3 3.7l.2-3.4-3.2-2.6-.4-2.9-.1-2.1-4.1-.7-2.4-.9-4.1-1.4-1.4 1.5-.6 3.3 4.3 1.1-.4 1.8 2.9 2.2v2.2l6.3 2.8 3-.9zM704.2 251l3.9-3.8 1.4-1.7-2.1-.3-4.9 2.2-4.2 3.5-8.1 9.8-5.3 3.7 1.6 1.7-3.8 2.2.2 1.9 9.6.1 5.4-.3 4.4 1.5-4.4 2.9 2.9.2 7.3-5.4 1.2.8-2.5 5.1 3 1.2 2.3-.2 3.5-5.5-.5-3.9.3-3.3-3.7 1.1 2.8-4.6-4.3-1.9-2.7 1.5-3.9-1.7 2.4-2.1-2.9-1.3-3.8 2 4.9-5.4zm-356.8-21.2l-1.9 2-1.4 2.6.9 1.9-.6 2.8.7 2.8h1.9l-.2-4.9 7.1-6.9-4.9.5-1.6-.8zm280.9-47l-.4-1.2-1.7-.1-2.8 1.7-.4.4.1 1.7 1.7.5 3.5-3zm-9.6-3.2l.8-1.1-6-.1-4.9 2.7v1.5l3 .2 7.1-3.2zm-3.1-16.6l-2.7-.5-5 5.2-3.6 4.4-5.7 2.8 6.3-.6-.8 3.4 8.2-3 6.2-3 .8 2.6 5.9 1.3 4.9-1.8-1.9-1.8-3.4.4 1.3-2.7-3.7-1.7-3.4-1.9-1.5-1.5-2.8.9.9-2.5zm44.6-8.2l3.7-1.7 1-.7 1.4-2.3-2.3-1.5-4.2.7-3.8 3.1-.7 2.6 4.9-.2zm-73.8-10.7l-.8-2-.3-1-1.6-1-3-1.5-4.9 2.3-5 1.7 3.5 2.4 3.8-.6 4.1 1.6 4.2-1.9zm22.4-2.1l-6.6-1 5.7-2.6-.4-6-1.9-2.3-4.5-.8-8.1 3.8-5.5 5.8 2.9 2.1 1.6 3.3-6.3 5.5-3.2-.2-6.2 4.4 4.2-5.2-4.8-1.8-4.5.9-2.4 3.4-5.9-.1-7.2.8-5.1-2.4-5 .4-1.5-2.9-2.1-1.3-3.8.5-5.2.3-4.4 1.8 2 2.3-7 2.8-1.4-3.3-4.4 1-11.8.6-6.4-1.2 8.5-2.6-2.8-2.8-4.4.4-4.7-1-7.5-1.9-3.8-2.3-4.5-.3-3.3 1.6-5.9.9 3.9-4.1-9.4 3.6-1.4-4.7-2.1-.6-3.8 2.5-4.5 1.2-.2-2.2-8.2 1.4-8.8 2.3-5.2-.6-7 1.6-6.2 2.3-3.7-.5-3.3-2.6-5.9-1.3-24.3 20.2-35.4 32.4 4.2.1 2.7 1.6.6 2.6.2 3.9 7.6-3.3 6.4-1.9-.5 3 .7 2.4 1.7 2.7-1.1 4.2-1.5 6.8 4.6 3.8-3.1 3.7-5.1 2.9-2.5 3.1 2.1 4.4-3.1 4.9 4.1 2.6-3.6 3.7-1.3 5.5 6.9 2.5 1.6 2.7 5.4 6.1h136.6l1.3-2.4h1.6l-.8 3.4 1 1 3.2.4 4.6 1 3.8 1.9 4.4-.8 5.3 1.6 3.2-2.4 3.2-1 1.8-1.5 1.5-.8 4 1.2 3.3.2.8.8.1 3.5 5.2 1-1.7 1.7 1.2 1.9-1.9 2.3 1.8.8-1.9 2.1 1.2.2 1.3-.9.5 1.4 3.4.7 3.8.1 3.8.6 4 1.2.8 2 1.4 4.7-2.4 2-3.8-.8-1-3.8-.9 3.9-3.8 3.4-.8 2.9-1.1 1.7-4.1 2-3.7 3.4-2 2.2 2.7.4 4.5-2 2.9-1.7 1.6-.3 2.6.6 1.7-.9 2.8-.8 4.7-.8.3-1.8-.3.1-1.7.3-1.8-.6 2.3-2.1 1.9-.7 3.9-.9 4.6-.9 1.8 1.2 1.9-1.4 1.9-.8.9.4.1.1 6.7-4.2 2.7-1.2h17l1-1.6 1.7-.3 2.5-.9 2.7-2.8 3.2-4.9 5.5-4.7 1.1 1.7 3.7-1.1 1.5 1.8-2.8 8.5 2.1 3.5 5.9-.8 8.1-.2-10.4 5.1-1.5 5.2 3.7.5 7.1-4.5 5.8-2.4 12.2-3.7 7.5-4.1-2.6-2.2 1-4.5-7.1 7-8.6.8-5.5-3.1-.1-4.6.6-6.8 6.1-4.1-3.3-3.1-7.6.6-12.1 5.2-10.9 8.2-4.6 1 7.8-5.7 10.1-8.3 7.2-2.7 5.7-4.4 5.2-.5 7.3.1 10 1.3 8.6-1 7.8-5.1 8.7-2.2 4.2-2.1 4.2-2.3 2-6.8-1.1-2.3-3.4-.8v-5.1l-2.3-1.9-6.9-1.6-2.8-3.4-4.8-3.4 3.4-3.7-2-7.1-2.6-7.5-1-5.2-4.3 2.7-7.4 6.5-8.1 3.2-1.6-3.4-3.7-1 2.2-7.3 2.6-4.9-7.7-.5-.1-2.2-3.6-3.3-3-2-4.5 1.5-4.2-.5-6.6-1.6-3.9 1.3-3.8 9-1 5.3-8.8 6.1 3.1 4.5.5 5-1.7 4-4.7 4.1-7.5 4.2-9 2.8 1.7 3.2-2.2 9.6-5.6 6.3-4.6 1.9-4.4-5.8-.1-6.8 1.7-6 3.6-5.2-4.8-.6-7.5-.4-3.6-2.5-4.8-1.6-1.7-2.9-3.3-2.2-7-2.6-7.1 1.2.7-4.5 1.5-5.5-6-1 4.9-6.8 4.9-4.6 9.4-6.5 8.6-4.6 5.6-.7 2.9-3.7 5.1-2.4 6.4-.4 7.7-3.8 2.9-2.4 7.4-4.7 3.2-2.8 3.2 1.7 6.5-.9L637 155l2.3-2.7-.8-2.9 5-2.9 1.7-2.7-3.5-2.6-5.4-.8-5.5-.4-4.6 5.9-6.5 4.6-7.2 4-1.3-3.7 4.2-4-2.2-3.5-8.7 4.2 4.3-5.5zm-75.5-18.9l-2.8-1-14.1 3.2-5.1 2-7.8 3.9 5.4 1.4 6.2-.1-11.5 2.1v1.9l5.6.1 9-.4 6.5 1.2-6.2 1-5.5-.3-7.1.9-3.3.6.6 4.2 4.2-.6 4.1 1.5-.3 2.5 7.8-.5 11.2-.8 9.4-1.8 5-.4 5.7 1.5 6.7.8 3.1-1.9-.7-2.1 7-.4 2.6-2.4-5-2.5-4.2-2.6 2.4-3.6 2.7-5.1-2.2-2-3-.9-4.2.8-2.8 5.3-4.3 2.1 2.2-5.1-1.7-1.7-7.3 2.7-2.6-2.6-10.4 1.5 4.7-2.4zm39.1-1.5l-1.7-1.1-5.4.2-2.1.7 2.2 3.6 7-3.4zm107.7 1.6l-4.4-2.8-8.4-.5-2.1.3-1.7 1.8 2 2.8.9.3 4.8-.7 4.1.1 4.1.1.7-1.4zm-39.4-.3l5.7-3.2-11.2 1.3-5.8 2.1-7.1 4.6-3.3 5.2 5.6.1-6.1 2.3 1.8 1.9 5.9.8 7.3 1.5 13.8 1.2 7.9-.6 3.2-1.6 2 1.8 3.3.3 2 3.3-3.5 1.4 7.1 1.8 4.6 2.6.5 1.9-.4 2.4-8.6 5.4-3.2 2.7.2 2-9.2.7-8 .1-5.4 4.2 2.4 1.9 13-.9.9-1.6 4.7 2.7 4.7 2.9-2.4 1.6 3.8 2.8 7.6 3.3 10.7 2.3.3-2-2.8-3.5-3.5-4.9 8.5 4.6 4.7 1.5 3.6-4.1v-5.6l-1-1.5-4.4-2.5-2.7-3.3 2.3-3.2 5.8-.7 3.8 5.4 4 2.4 10.7-6.5 3.3-3.9-6.4-.3-3.2-5.1-5.9-1.2-7.7-3.5 9-2.5-.8-5-2.2-2.1-8.3-2.1-1.9-3.3-8.2 1.2 1.1-2.3-3.6-2.5-6.8-2.6-5.2 2.1-9 1.5 3.3-3.4-2.3-5.3-11.6 2.1-7.1 4.1-.3-3.2zm-50-3.4l-7.1 2.4.9 3.4-7.4-.7-1.7 1.7 5.8 3.9.9 2 3.4.5 8.4-2 5.1-4.7-3.8-2.2 6-2.4.5-1.5-7.5.6-3.5-1zm22.3 5.4l5.6-1 10-4.5-6.1-1.2-7.8-.2-5.2 1.4-4.2 2.1-2.5 2.6-1.8 4.5 4.3.2 7.7-3.9zm-114.7 7.2l2.6-2.3 9.1-3.6 13.8-3.6 6.4-1.3-1.6-2.1-1.9-1.5-9.4-.2-4.1-1.1-14 .8-.3 3.1-7.6 3.3-7.4 3.8-4.3 2.2 5.9 2.7-.6 2.3 13.4-2.5zm124.1-18.3l.3-1.6-1.4-1.7-6.9 1.3-4.4 2.2 3.2 1.3 5.1.4 4.1-1.9zm-8.7-8.6l-1.1.7-4.8-.3-7.6 1.6-3.8-.1-4.3 3.8 6.6-.4-3.4 2.9 3.2.8 6.8-.5 5.8-3.7 2.8-2.5-.2-2.3zm-39.1 2.5l1.8-2.3-3.1-.5-5.7 1.7-.7 4.7-6.1-.4-2.8-2.9-8.2-1.6-5.4 1.4-11.6 4.8 4.1.8 17.8-.5-10.6 2.2-1.5 1.6 5.9-.1 12.2-2.2 13.8-.8 5.1-2.3 2.3-2.4-3.7-.2-4.3.8.7-1.8zm55.2-4.3l-7.1-.3-3.8 2 2.6 1.5 7 .6 1.4 2.1-2.2 2.4-1.5 2.8 8.5 1.6 5.5.6 8-.1 11.6-.8 4.3.6 6.7-1 3.5-1.4 1-2-2.3-1.9-5.8-.3-8 .4-7 1.1-5.1-.4-4.8-.3-1.2-1.1-3.1-1.1 2.8-1.9-1.4-1.6-7.3.1-2.3-1.6zm-75-2.6l-6 .7-5.5-.1-12.1 3.1-11.6 3.7 3.6 1 7-.7 9.8-2.1 3.8-.3 5.2-1.6 5.8-3.7zm80.5.6l1-.5-1.5-.9-7.2-.1-.6 1.3 6.4.3 1.9-.1zm-58.4-.8l3.2-1.4-4.1-.8-5.9.5-5.1 1.5 3.3 1.5 8.6-1.3zm7.8-4.2l-3.3-.9-1.6-.2-5.7 1.3-1 .7h6l5.6-.9zm46.4 2.5l3-1.7-2.3-1.6-1.7-.3-4.4-.1-2.1 1.8-.7 1.8 1.6 1.1 6.6-1zm-13.7-1.2l.1-2.2-7.4-1.7-6.1-.6-2.1 1.7 2.8 1.1-5.3 1.4 7.7.2 4 1.5 5.2.5 1.1-1.9zm53.7-6.1l.6-2.8-4.7-.8-4.7-.9-1.6-2.2-8.2.2.3.9-3.9.3-4.1 1.3-4.9 1.9-.3 1.9 2 1.5h6.5l-4.3 1.2-2.1 1.6 1.6 1.9 6.7.6 6.8-.4 10.5-3.4 6.4-1.3-2.6-1.5zm78.5-13.8l-7-.2-6.9-.3-10.2.6-1.4-.4-10.3.2-6.4.4-5.1.6-5 2-2.3-1-3.9-.2-6.7 1.4-7.4.6-4.1.1-6 .8-1.1 1.3 2.5 1.2.8 1.6 4.4 1.5 12.4-.3 7.2.5-7.2 1.5-2.2-.4-9.3-.2-1.1 2.2 3 1.7-2.8 1.6-7.5 1.1-4.9 1.7 4.8.9 1.7 3-7.5-2-2.5.3-2 3.4-8 1.1-2 2.3 6.7.3 4.9.6 11.7-.8 8.4 1.4 12.6-3 1-1.1-6.4.2.5-1.1 6.5-1.4 3.6-1.9 6.8-1.3 5-1.6-.8-2.2 3.3-.8-4.3-.6 11.1-.4 3.2-.9 7.9-.8 9.3-3.5 6.8-1.1 10.3-2.5h-7.4l3.9-.9 9-.8 9.7-1.6 1.1-1.1-5.2-1-6.7-.4-8.5-.3z",
  "China": "M1587.2 453.3l.6-3.6 2-2.8-1.6-2.5-3.2-.1-5.8 1.8-2.2 2.8 1 5.5 4.9 2 4.3-3.1zm13.2-196.5l-6.1-6.1-4.4-3.7-3.8-2.7-7.7-6.1-5.9-2.3-8.5-1.8-6.2.2-5.1 1.1-1.7 3 3.7 1.5 2.5 3.3-1.2 2 .1 6.5 1.9 2.7-4.4 3.9-7.3-2.3.6 4.6.3 6.2 2.7 2.6 2.4-.8 5.4 1 2.5-2.3 5.1 2 7.2 4.3.7 2.2-4.3-.7-6.8.8-2.4 1.8-1.4 4.1-6.3 2.4-3.1 3.3-5.9-1.3-3.2-.5-.4 4 2.9 2.3 1.9 2.1-2.5 2-1.9 3.3-4.9 2.2-7.5.2-7.2 2.2-4.4 3.3-3.2-2-6.2.1-9.3-3.8-5.5-.9-6.4.8-11.2-1.3-5.5.1-4.7-3.6-4.9-5.7-3.4-.7-7.9-3.8-7.2-.9-6.4-1-3-2.7-1.3-7.3-5.8-5-8.1-2.3-5.7-3.3-3.3-4.4-1.7.5-1.8 4.2-3.8.6 2.5 6.2-1.6 2.8-10.7-2 1 11.1-2 1.4-9 2.4 8.7 10.7-2.9 1.6 1.7 3.5-.2 1.4-6.8 3.4-1 2.4-6.4.8-.6 4-5.7-.9-3.2 1.2-4 3 1.1 1.5-1 1.5 3 5.9 1.6-.6 3.5 1.4.6 2.5 1.8 3.7 1.4 1.9 4.7 3 2.9 5 9.4 2.6 7.6 7.5.8 5.2 3 3.3.6 3.3-4.1-.9 3.2 7 6.2 4 8.5 4.4 1.9-1.5 4.7 2 6.4 4.1 3.2.9 2.5 3.1 4.5 1.2 5 2.8 6.4 1.5 6.5.6 3-1.4 1.5 5.1 2.6-4.8 2.6-1.6 4.2 1.5 2.9.1 2.7 1.8 4.2-.8 3.9-4.8 5.3-4 4.9 1.5 3.2-2.6 3.5 3.9-1.2 2.7 6.1.9 3-.4 2.7 3.7 2.7 1.5 1.3 4.9.8 5.3-4.1 5.3.7 7.5 5.6-1 2.3 5.8 3.7 1.3-.8 5.2 4.5 2.4 2.5 1.2 3.8-1.8.6 2.6.7 1.5 2.9.1-1.9-7.2 2.7-1 2.7-1.5h4.3l5.3-.7 4.1-3.4 3 2.4 5.2 1.1-.2 3.7 3 2.6 5.9 1.6 2.4-1 7.7 2-.9 2.5 2.2 4.6 3-.4.8-6.7 5.6-.9 7.2-3.2 2.5-3.2 2.3 2.1 2.8-2.9 6.1-.7 6.6-5.3 6.3-5.9 3.3-7.6 2.3-8.4 2.1-6.9 2.8-.5-.1-5.1-.8-5.1-3.8-2-2.5-3.4 2.8-1.7-1.6-4.7-5.4-4.9-5.4-5.8-4.6-6.3-7.1-3.5.9-4.6 3.8-3.2 1-3.5 6.7-1.8-2.4-3.4-3.4-.2-5.8-2.5-3.9 4.6-4.9-1.9-1.5-2.9-4.7-1-4.7-4.4 1.2-3 5-.3 1.2-4.1 3.6-4.4 3.4-2.2 4.4 3.3-1.9 4.2 2.3 2.5-1.4 3 4.8-1.8 2.4-2.9 6.3-1.9 2.1-4 3.8-3.4 1-4.4 3.6 2 4.6.2-2.7-3.3 6.3-2.6-.1-3.5 5.5 3.6-1.9-3.1 2.5-.1-3.8-7.3-4.7-5.3 2.9-2.2 6.8 1.1-.6-6-2.8-6.8.4-2.3-1.3-5.6-6.9 1.8-2.6 2.5h-7.5l-6-5.8-8.9-4.5-9.9-1.9z",
  "Germany": "M1043.6 232.3l-2.4-1.9-5.5-2.4-2.5 1.7-4.7 1.1-.1-2.1-4.9-1.4-.2-2.3-3 .9-3.6-.8.4 3.4 1.2 2.2-3 3-1-1.3-3.9.3-.9 1.3 1 2-1 5.6-1.1 2.3h-2.9l1.1 6.4-.4 4.2 1 1.4-.2 2.7 2.4 1.6 7.1 1.2-2.3 4.2-.5 4.5h4.2l1-1.4 5.4 1.9 1.5-.3 2.6 1.7.6-1.6 4.4.3 3.4-1.2 2.4.2 1.7 1.3.4-1.1-1-4 1.7-.8 1.5-2.9-2.9-2.6-2.6-1.5-.7-2.6-1-1.9 3.4-1.3 1.7-1.5 3.4-1.2 1.1-1.2 1.4.7 2.1-.6-2.3-3.9.1-2.1-1.4-3.3-2-2.2 1.2-1.6-1.4-3.1z",
  "Egypt": "M1129.7 374.8l-5.5-1.9-5.3-1.7-7.1.2-1.8 3 1.1 2.7-1.2 3.9 2 5.1 1.3 22.7 1 23.4h65.3l-1-1.3-6.8-5.7-.4-4.2 1-1.1-5.3-7-2-3.6-2.3-3.5-4.8-9.9-3.9-6.4-2.8-6.7.5-.6 4.6 9.1 2.7 2.9 2 2 1.2-1.1 1.2-3.3.7-4.8 1.3-2.5-.7-1.7-3.9-9.2-2.5 1.6-4.2-.4-4.4-1.5-1.1 2.1-1.7-3.2-3.9-.8-4.7.6-2.1 1.8-3.9 2-2.6-1z",
  "Spain": "M985 325.7v-.2h-.5l-.3-.4-.1.2-.1.2v.2h.5l.4.1.1-.1zm-.8-1.6h.3l.6-.7v-.3l-.3-.2-1.1.2-.2.3v.3l-.3.1-.1.4.1.2.8.1.2-.4zM967 296l-8.2-.2-4.2.3-5.4-1h-6.8l-6.2-1.1-7.4 4.5 2 2.6-.4 4.4 1.9-1.6 2.1-.9 1.2 3.1h3l.9-.8 3 .2 1.3 3.1-2.4 1.7-.2 4.9-.9.9-.3 3-2.2.5 2 3.8-1.6 4.3 1.8 1.9-.8 1.7-2 2.5.4 2.1 4.8 1 1.4 3.7 2 2.2 2.5.6 2.1-2.5 3.3-2.3 5 .1h6.7l3.8-5 3.9-1.3 1.2-4.2 3-2.9-2-3.7 2-5.1 3.1-3.5.5-2.1 6.6-1.3 4.8-4.2-.3-3.5-6 .8-5.7-2.8-1.9 1.3-9.4-2.8-2-2.4zm26 22.6l.1-.3.1-.2.1-.1-.2-.2v-.1l.2-.2-.2-.1-1.3.4-.7.4-2.1 1.5v.3l.1.2h.4l.2.4.4-.4.3-.1.3.1.3.2.1.6.1.2.6.1.9.4.4-.2.5-.3.2-.6.3-.5.3-.5.3-.4-.1-.4-.3-.1-.3-.1-.5.2-.5-.2zm6-.3l.1-.4v-.1l-.5-.7-.9-.3-1 .1-.1.1v.4l.1.1.6.1 1.6.7h.1z",
  "France": "M1025.7 303.8l-1.1-5.2-3.2 2.3-1 2.3 1.4 4.2 2.4 1.2 1.5-4.8zm-31.5-50.9l-2.4-2.4-2.2-.1-.7-2.2-4.3 1.2-1.4 5.1-11.3 4.8-4.6-2.6 1.4 7-8.2-1.6-6.4 1.3.4 4.6 7.5 2.4 3.6 3.1 5.1 6.5-1 12.3-2.7 3.7 2 2.4 9.4 2.8 1.9-1.3 5.7 2.8 6-.8.5-3.7 7.4-2 10 1.6 4.5-3.4.5-2.7-2.7-.8-1.5-4.8 1.7-1.8-1.6-2.4.2-1.7-1.8-2.7-2.4.9v-2.8l3.5-3.5-.2-1.6 2.3.6 1.3-1 .5-4.5 2.3-4.2-7.1-1.2-2.4-1.6-1.4.1-1.1-.5-4.4-2.8-2.5.4-3.4-2.9z",
  "United Kingdom": "M950 227.5l-4.9-3.7-3.9.3.8 3.2-1.1 3.2 2.9-.1 3.5 1.3 2.7-4.2zm13-24.3l-5.5.5-3.6-.4-3.7 4.8-1.9 6.1 2.2 3 .1 5.8 2.6-2.8 1.4 1.6-1.7 2.7 1 1.6 5.7 1.1h.1l3.1 3.8-.8 3.5-7.1-.6-1 4 2.6 3.3-5.1 1.9 1.3 2.4 7.5 1-4.3 1.3-7.3 6.5 2.5 1.2 3.5-2.3 4.5.7 3.3-2.9 2.2 1.2 8.3-1.7 6.5.1 4.3-3.3-1.9-3.1 2.4-1.8.5-3.9-5.8-1.2-1.3-2.3-2.9-6.9-3.2-1-4.1-7.1-.4-.6-4.8-.4 4.2-5.3 1.3-4.9h-5l-4.7.8 5-6.4z",
  "India": "M1414.1 380.1l-8.5-4.4-6.2-4-3.2-7 4.1.9-.6-3.3-3-3.3-.8-5.2-7.6-7.5-3.7 5.4-5.7 1-8.5-1.6-1.9 2.8 3.2 5.6 2.9 4.3 5 3.1-3.7 3.7 1 4.5-3.9 6.3-2.1 6.5-4.5 6.7-6.4-.5-4.9 6.6 4 2.9 1.3 4.9 3.5 3.2 1.8 5.5h-12l-3.2 4.2 7.1 5.4 1.9 2.5-2.4 2.3 8 7.7 4 .8 7.6-3.8 1.7 5.9.8 7.8 2.5 8.1 3.6 12.3 5.8 8.8 1.3 3.9 2 8 3.4 6.1 2.2 3 2.5 6.4 3.1 8.9 5.5 6 2.2-1.8 1.7-4.4 5-1.8-1.8-2.1 2.2-4.8 2.9-.3-.7-10.8 1.9-6.1-.7-5.3-1.9-8.2 1.2-4.9 2.5-.3 4.8-2.3 2.6-1.6-.3-2.9 5-4.2 3.7-4 5.3-7.5 7.4-4.2 2.4-3.8-.9-4.8 6.6-1.3 3.7.1.5-2.4-1.6-5.2-2.6-4.8.4-3.8-3.7-1.7.8-2.3 3.1-2.4-4.6-3.4 1.2-4.3 4.8 2.7 2.7.4 1.2 4.4 5.4.9 5-.1 3.4 1.1-1.6 5.3-2.4.4-1.1 3.6 3.5 3.3.2-4 1.5-.1 4.5 10.1 2.4-1.5-.9-2.7.9-2.1-.9-6.6 4.6 1.4 1.5-5.2-.3-3.1 2.1-5.4-.9-3.6 6.1-4.4 4.1 1.1-1.3-3.9 1.6-1.2-.9-2.4-6.1-.9 1.2-2.7-3.5-3.9-3.2 2.6-4.9-1.5-5.3 4-3.9 4.8-4.2.8 2.7 2 .4 3.9-4.4.2-4.7-.4-3.2 1-5.5-2.5-.3-1.2-1.5-5.1-3 1.4.1 2.7 1.5 4.1-.1 2.5-4.6.1-6.8-1.5-4.3-.6-3.8-3.2-7.6-.9-7.7-3.5-5.8-3.1-5.7-2.5.9-5.9 2.8-2.9z",
  "Italy": "M1057.8 328.6l-4 .5-5.2.7-6.2-.6-.6 3.4 7.5 3.3 2.7.7 4.2 2.4.9-3.3-.9-2 1.6-5.1zm-33.7-18.9l-2.5 1.9-2.8-.3 1.3 3.6.4 7.6 2.1 1.7 2-2.1 2.4.4.4-8.4-3.3-4.4zm14.3-34.3l-1.3-2.2-4.8 1.1-.5 1.2-3.1-.9-.3 2.5-2.1 1.1-3.8-.8-.9 2.5-2.4.2-.9-1-2.7 2.1-2.4.3-2.2-1.3-.2 1.7 1.6 2.4-1.7 1.8 1.5 4.8 2.7.8-.5 2.7 2.1-.5 2.8-2.8 2.3-.9 4.2 2.1 2.6.7 1.9 6 3.6 3.6 4.9 4 4.2 2.8 3.9.4 2.3 2.5 3.4 1.2 1.7 2.7 2.2.8 1.8 3.2 2.3 3.7-1.1 1.3-.8 3.5.1 2 2.1-.5 2.5-5.6 2.1-.4.4-3.3-3.9-2.3 1.9-4.1 4.5 1 3.1 3 .8-2.3-.6-1.2-4.7-3.2-3.9-1.9-4.8-2.3 1.4-1.2-1.4-1.4-4 .1-6-5-2.9-5.1-4.9-3.1-1.9-3.1.5-1.8-.4-3 3.9-2.2 4.1.9-1.4-2.7.3-3-7.2-1.6z",
  "Japan": "M1692.5 354.9l-4.5-1.3-1.1 2.7-3.3-.8-1.3 3.8 1.2 3 4.2 1.8-.1-3.7 2.1-1.5 3.1 2.1 1.3-3.9-1.6-2.2zm24.4-19.3l-3.6-6.7 1.3-6.4-2.8-5.2-8.1-8.7-4.8 1.2.2 3.9 5.1 7.1 1 7.9-1.7 2.5-4.5 6.5-5-3.1v11.5l-6.3-1.3-9.6 1.9-1.9 4.4-3.9 3.3-1.1 4-4.3 2 4 4.3 4.1 1.9.9 5.7 3.5 2.5 2.5-2.7-.8-10.8-7.3-4.7 6.1-.1 5-3 8.6-1.4 2.4 4.8 4.6 2.4 4.4-7.3 9.1-.4 5.4-3 .6-4.6-2.5-3.2-.6-5.2zm-11.8-44.2l-5.3-2.1-10.4-6.4 1.9 4.8 4.3 8.5-5.2.4.6 4.7 4.6 6.1h5.7l-1.6-6.8 10.8 4.2.4-6.1 6.4-1.7-6-6.9-1.7 2.6-4.5-1.3z",
  "Kenya": "M1211.7 547.2h-3.8l-2.3-2.1-5.1 2.6-1.6 2.7-3.8-.5-1.2-.7-1.3.1h-1.8l-7.2-5.4h-3.9l-2-2.1v-3.6l-2.9-1.1-3.8 4.2-3.4 3.8 2.7 4.4.7 3.2 2.6 7.3-2.1 4.7-2.7 4.2-1.6 2.6v.3l1.4 2.4-.4 4.7 20.2 13 .4 3.7 8 6.3 2.2-2.1 1.2-4.2 1.8-2.6.9-4.5 2.1-.4 1.4-2.7 4-2.5-3.3-5.3-.2-23.2 4.8-7.2z",
  "South Korea": "M1637.3 331.7l6.2 5.5-3.4 1.1 5.2 6.8 1.1 4.8 2.1 3.5 4.5-.5 3.2-2.7 4.2-1.2.5-3.6-3.4-7.5-3.3-4.2-8.2-7.6.1 1.6-2.1.4-3.5.3-.7 2.9-2.4-.2-.1.6z",
  "Mexico": "M444.4 407.8l-3.6-1.4-3.9-2-.8-3-.2-4.5-2.4-3.6-1-3.7-1.6-4.4-3.1-2.5-4.4.1-4.8 5-4-1.9-2.2-1.9-.4-3.5-.8-3.3-2.4-2.8-2.1-2-1.3-2.2h-9.3l-.8 2.6h-15l-10.7-4.4-7.1-3.1 1-1.3-7 .7-6.3.5.2 5.7.7 5.1.7 4.1.8 4 2.6 1.8 2.9 4.5-1 2.9-2.7 2.3-2.1-.3-.6.5 2.3 3.7 2.9 1.5 1 1.7.9-.9 3.1 2.9 2.1 2 .1 3.4-1.2 4.7 2.5 1.6 3.3 3.1 2.9 3.6.7 3.9h1l2.7-2.3.4-1.2-1.5-2.8-1.6-2.9-2.6-.2.4-3.4-.9-3-1-2.8-.5-5.9-2.6-3.2-.6-2.3-1.2-1.6v-4.1l-1 .1-.1-2.2-.7-.5-.4-1.4-2.7-4.4-1.1-2.6 1-4.8.1-3 1.8-2.6 2.4 1.7 1.9-.2 3.1 2.5-.9 2.4.4 4.9 1.5 4.7-.4 2 1.7 3.1 2.3 3.4 2.7.5.3 4.4 2.4 3.1 2.5 1.5-1.8 4 .7 1.5 4.1 2.6 1.9 4 4.5 4.9 3.8 6.4 1.3 3.2v2.5l1.4 2.9-.3 2.2-1.6 1.6.3 1.8-1.9.7.8 3.1 2.2 4 5.3 3.6 1.9 2.9 5.4 2 3 .4 1.2 1.7 4.2 3 5.9 3 4 .9 4.8 2.9 4 1.2 3.7 1.7 2.9-.7 4.8-2.4 3.1-.4 4.4 1.6 2.6 2.1 5.5 6.9.4-1.9.8-1.5-.7-1.2 3.3-5.2h7.1l.4-2.1-.8-.4-.5-1.4-1.9-1.5-1.8-2.1h2.6l.4-3.6h5.2l5.1.1.1-1 .7-.3.9.8 2.5-3.9h1l1.2-.1 1.2 1.6 2-5 1.2-2.7-.9-1.1 1.8-3.9 3.5-3.8.6-3.1-1.2-1.3-3.4.5-4.8-.2-6 1.5-4 1.7-1.2 1.8-1.2 5.4-1.8 3.7-3.9 2.6-3.6 1.1-4.3 1.1-4.3.6-5.1 1.8-1.9-2.6-5.6-1.7-1.8-3.2-.7-3.6-3-4.7-.4-5-1.2-3.1-.5-3.4 1.1-3.1 1.8-8.6 1.8-4.5 3.1-5.6-2.1.2z",
  "Peru": "M584.3 599.5l-2.9-3.4-1.7-.1 3.5-6.5-4.4-3-3.3.6-2.1-1.1-3 1.7-4.2-.8-3.4-6.7-2.7-1.7-1.8-3-3.7-3-1.5.6.8 4.9-1.7 4.1-6 6.7-6.7 2.5-3.3 5.5-.9 4.3-3.1 2.6-2.5-3.2-2.3-.7-2.3.5-.2-2.3 1.5-1.5-.7-2.7-4.4 4-1.6 4.5 3 6.1-1.7 2.8 4.1 2.6 4.5 4.1 2 4.7 2.4 2.9 6 12.7 6.2 11.7 5.4 8.4-.8 1.8 2.8 5.3 4.6 3.9 10.7 6.9 11.6 6.4.7 2.6 5.9 3.7 2.7-1.6 1.2-3.3 2.8-6.9-2.8-5.3 1.1-2.1-1.2-2.4 1.9-3.2-.3-5.4-.1-4.5 1.1-2.1-5.5-10.3-3 1.1-2.6-.7-.2-9.7-4.4 3.8-4.9-.2-2.3-3.4-3.7-.3 1-2.8-3.3-3.8-2.6-5.8 1.5-1.1-.1-2.7 3.3-1.9-.7-3.4 1.3-2.2.4-3 6.2-4.3 4.6-1.2.7-1 5.1.3z",
  "Thailand": "M1562.7 481.4l1.5-2.9-.5-5.4-5.2-5.5-1.3-6.3-4.9-5.2-4.3-.4-.8 2.2-3.2.2-1.8-1.2-5.3 3.8-1-5.7.4-6.7-3.8-.3-.9-3.8-2.6-1.9-3 1.4-2.8 2.8-3.9.3-1.5 6.9-2.2 1.1 3.5 5.6 4.1 4.6 2.9 4.2-1.4 5.6-1.7 1.1 1.7 3.2 4.2 5.1 1 3.5.2 3 2.8 5.8-2.6 5.9-2.2 6.6-1.3 6.1-.3 3.9 1.2 3.6.7-3.8 2.9 3.1 3.2 3.5 1.1 3.2 2.4 2.4.9-1.1 4.7 2.8.6 3.3 3.7-.8 1.7-2.6-3.1-3.3-3.4-.8-3.3-3.6-1.4-5.5-2.6-5.8-3.7-.2-.7-4.6 1.4-5.6 2.2-9.3-.2-7 4.9-.1-.3 5 4.7-.1 5.3 2.9-2.1-7.7 3-5.2 7.1-1.3 5.3 1z",
  "Turkey": "M1166.6 308.9l-9.7-4.4-8.5.2-5.7 1.7-5.6 4-9.9-.8-1.6 4.8-7.9.2-5.1 6.1 3.6 3-2 5 4.2 3.6 3.7 6.4 5.8-.1 5.4 3.5 3.6-.8.9-2.7 5.7.2 4.6 3.5 8-.7 3.1-3.7 4.6 1.5 3.2-.6-1.7 2.4 2.3 3 1.2-1.4 1.2-1.5-.1-3.6 1.9 1.3 5.5-1.8 3 1.2h4.3l5.7-2.5 2.8.2 5.9-1.1 2.1-1 6.2.9 2.1 1.6 2.3-1.1-3.7-5.2.7-2-2.9-7.3 3.3-1.8-2.4-1.9-4.2-1.5v-3.1l-1.3-2.2-5.6-3-5.4.3-5.5 3.2-4.5-.6-5.8 1-7.8-2.4zm-49.6 4l2-1.9 6.1-.4.7-1.5-4.7-2-.9-2.4-4.5-.8-5 2 2.7 1.6-1.2 3.9-1.1.7.1 1.3 1.9 2.9 3.9-3.4z",
  "South Africa": "M1148.2 713.7l-2.9-.6-1.9.8-2.6-1.1-2.2-.1-8 4.7-5.2 4.7-2 4.3-1.7 2.4-3 .5-1.2 3-.6 2-3.6 1.5-4.4-.3-2.5-1.8-2.3-.8-2.7 1.5-1.5 3.1-2.7 1.9-2.8 2.8-4 .7-1.1-2.3.7-3.8-3-6.1-1.4-1-1.1 23.6-5 3.2-2.9.5-3.3-1.2-2.4-.5-.8-2.7-2.1-1.8-2.7 3.2 3.5 8.2v.1l2.5 5.3 3.2 6-.2 4.8-1.7 1.2 1.4 4.2-.2 3.8.6 1.7.3-.9 2.1 2.9 1.8.1 2.1 2.3 2.4-.2 3.5-2.4 4.6-1 5.6-2.5 2.2.3 3.3-.8 5.7 1.2 2.7-1.2 3.2 1 .8-1.8 2.7-.3 5.8-2.5 4.3-2.9 4.1-3.8 6.7-6.5 3.4-4.6 1.8-3.2 2.5-3.3 1.2-.9 3.9-3.2 1.6-2.9 1.1-5.2 1.7-4.7h-4.1l-1.3 2.8-3.3.7-3-3.5.1-2.2 1.6-2.4.7-1.8 1.6-.5 2.7 1.2-.4-2.3 1.4-7.1-1.1-4.5-2.2-9zm-20.1 52.8l-2 .6-3.7-4.9 3.2-4 3.1-2.5 2.6-1.3 2.3 2 1.7 1.9-1.9 3.1-1.1 2.1-3.1 1-1.1 2z",
}

// ── QUESTION GENERATORS ───────────────────────────────────────────────────────

export interface GeoQuestion {
  prompt: string
  promptEmoji?: string
  correctAnswer: string
  options: string[]
  funFact?: string
  hint1?: string // shown after 5s
  hint2?: string // shown after 10s
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pickRandom<T>(arr: T[], count: number, exclude?: T[]): T[] {
  const filtered = exclude ? arr.filter(a => !exclude.includes(a)) : arr
  return shuffle(filtered).slice(0, count)
}

export function generateCapitalQuestion(countries: Country[]): GeoQuestion {
  const country = countries[Math.floor(Math.random() * countries.length)]
  const wrongCapitals = pickRandom(
    countries.map(c => c.capital),
    3,
    [country.capital]
  )
  return {
    prompt: `What is the capital of ${country.name}?`,
    promptEmoji: country.flag,
    correctAnswer: country.capital,
    options: shuffle([country.capital, ...wrongCapitals]),
    funFact: country.funFact,
    hint1: `It's in ${country.continent}`,
    hint2: `Starts with "${country.capital[0]}"`,
  }
}

export function generateFlagQuestion(countries: Country[]): GeoQuestion {
  const country = countries[Math.floor(Math.random() * countries.length)]
  const wrongNames = pickRandom(
    countries.map(c => c.name),
    3,
    [country.name]
  )
  return {
    prompt: `Which country has this flag?`,
    promptEmoji: country.flag,
    correctAnswer: country.name,
    options: shuffle([country.name, ...wrongNames]),
    funFact: country.funFact,
    hint1: `It's in ${country.continent}`,
    hint2: `Capital: ${country.capital}`,
  }
}

export function generateContinentQuestion(countries: Country[]): GeoQuestion {
  const country = countries[Math.floor(Math.random() * countries.length)]
  const allContinents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Central America', 'Oceania']
  const wrongContinents = pickRandom(allContinents, 3, [country.continent])
  return {
    prompt: `Which continent is ${country.name} in?`,
    promptEmoji: country.flag,
    correctAnswer: country.continent,
    options: shuffle([country.continent, ...wrongContinents]),
    funFact: country.funFact,
    hint1: `Capital: ${country.capital}`,
    hint2: `Starts with "${country.continent[0]}"`,
  }
}

export function generateStateQuestion(states: StateProvince[]): GeoQuestion {
  const state = states[Math.floor(Math.random() * states.length)]
  const sameCountryStates = states.filter(s => s.country === state.country)
  const wrongCapitals = pickRandom(
    sameCountryStates.map(s => s.capital),
    3,
    [state.capital]
  )
  // If not enough from same country, fill from all
  while (wrongCapitals.length < 3) {
    const extra = states[Math.floor(Math.random() * states.length)]
    if (extra.capital !== state.capital && !wrongCapitals.includes(extra.capital)) {
      wrongCapitals.push(extra.capital)
    }
  }
  return {
    prompt: `What is the capital of ${state.name}?`,
    promptEmoji: state.countryFlag,
    correctAnswer: state.capital,
    options: shuffle([state.capital, ...wrongCapitals.slice(0, 3)]),
    funFact: `${state.name} is in ${state.country}`,
    hint1: `It's in ${state.country} ${state.countryFlag}`,
    hint2: `Starts with "${state.capital[0]}"`,
  }
}

export function generateSilhouetteQuestion(countries: Country[]): GeoQuestion {
  // Only pick countries that have silhouette SVG paths
  const withSilhouettes = countries.filter(c => COUNTRY_SILHOUETTES[c.name])
  const pool = withSilhouettes.length > 0 ? withSilhouettes : countries
  const country = pool[Math.floor(Math.random() * pool.length)]
  const wrongNames = pickRandom(
    pool.map(c => c.name),
    3,
    [country.name]
  )
  while (wrongNames.length < 3) {
    const extra = countries[Math.floor(Math.random() * countries.length)]
    if (extra.name !== country.name && !wrongNames.includes(extra.name)) {
      wrongNames.push(extra.name)
    }
  }
  return {
    prompt: country.name, // The game page will use this to look up the SVG
    promptEmoji: '🗺️',
    correctAnswer: country.name,
    options: shuffle([country.name, ...wrongNames.slice(0, 3)]),
    funFact: country.funFact,
    hint1: `It's in ${country.continent}`,
    hint2: `Capital: ${country.capital}`,
  }
}

export function generateQuestions(mode: GameMode, count: number): GeoQuestion[] {
  const questions: GeoQuestion[] = []
  const usedPrompts = new Set<string>()

  for (let i = 0; i < count; i++) {
    let q: GeoQuestion
    let attempts = 0
    do {
      switch (mode) {
        case 'capitals': q = generateCapitalQuestion(COUNTRIES); break
        case 'flags': q = generateFlagQuestion(COUNTRIES); break
        case 'continents': q = generateContinentQuestion(COUNTRIES); break
        case 'states': q = generateStateQuestion(STATES); break
        case 'silhouettes': q = generateSilhouetteQuestion(COUNTRIES); break
      }
      attempts++
    } while (usedPrompts.has(q.prompt) && attempts < 30)
    usedPrompts.add(q.prompt)
    questions.push(q)
  }
  return questions
}
