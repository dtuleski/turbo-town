/**
 * Sequence Memory Game Utilities
 * A memory game where cards are revealed one at a time in sequence.
 * The player must recall all previously shown cards plus the new one each round.
 */

export type SeqDifficulty = 'easy' | 'medium' | 'hard'
export type SeqTheme = 'f1-2025' | 'f1-2026'

export interface DriverCard {
  id: string
  name: string
  team: string
  teamColor: string // tailwind bg class
  number: number
}

export const DIFFICULTY_CONFIG: Record<SeqDifficulty, { cards: number; viewTime: number; label: string }> = {
  easy: { cards: 5, viewTime: 5, label: 'Easy' },
  medium: { cards: 10, viewTime: 3, label: 'Medium' },
  hard: { cards: 15, viewTime: 2, label: 'Hard' },
}

const F1_2025_DRIVERS: DriverCard[] = [
  { id: 'ver25', name: 'Verstappen', team: 'Red Bull Racing', teamColor: 'bg-blue-700', number: 1 },
  { id: 'had25', name: 'Hadjar', team: 'Red Bull Racing', teamColor: 'bg-blue-700', number: 20 },
  { id: 'lec25', name: 'Leclerc', team: 'Ferrari', teamColor: 'bg-red-600', number: 16 },
  { id: 'ham25', name: 'Hamilton', team: 'Ferrari', teamColor: 'bg-red-600', number: 44 },
  { id: 'nor25', name: 'Norris', team: 'McLaren', teamColor: 'bg-orange-500', number: 4 },
  { id: 'pia25', name: 'Piastri', team: 'McLaren', teamColor: 'bg-orange-500', number: 81 },
  { id: 'rus25', name: 'Russell', team: 'Mercedes', teamColor: 'bg-teal-500', number: 63 },
  { id: 'ant25', name: 'Antonelli', team: 'Mercedes', teamColor: 'bg-teal-500', number: 12 },
  { id: 'alo25', name: 'Alonso', team: 'Aston Martin', teamColor: 'bg-green-700', number: 14 },
  { id: 'str25', name: 'Stroll', team: 'Aston Martin', teamColor: 'bg-green-700', number: 18 },
  { id: 'gas25', name: 'Gasly', team: 'Alpine', teamColor: 'bg-sky-500', number: 10 },
  { id: 'doo25', name: 'Doohan', team: 'Alpine', teamColor: 'bg-sky-500', number: 7 },
  { id: 'alb25', name: 'Albon', team: 'Williams', teamColor: 'bg-blue-500', number: 23 },
  { id: 'sai25', name: 'Sainz', team: 'Williams', teamColor: 'bg-blue-500', number: 55 },
  { id: 'law25', name: 'Lawson', team: 'Racing Bulls', teamColor: 'bg-indigo-500', number: 30 },
  { id: 'lin25', name: 'Lindblad', team: 'Racing Bulls', teamColor: 'bg-indigo-500', number: 36 },
  { id: 'hul25', name: 'Hülkenberg', team: 'Sauber', teamColor: 'bg-emerald-600', number: 27 },
  { id: 'bor25', name: 'Bortoleto', team: 'Sauber', teamColor: 'bg-emerald-600', number: 5 },
  { id: 'oco25', name: 'Ocon', team: 'Haas', teamColor: 'bg-gray-600', number: 31 },
  { id: 'bea25', name: 'Bearman', team: 'Haas', teamColor: 'bg-gray-600', number: 87 },
]

const F1_2026_DRIVERS: DriverCard[] = [
  { id: 'ver26', name: 'Verstappen', team: 'Aston Martin', teamColor: 'bg-green-700', number: 1 },
  { id: 'alo26', name: 'Alonso', team: 'Aston Martin', teamColor: 'bg-green-700', number: 14 },
  { id: 'lec26', name: 'Leclerc', team: 'Ferrari', teamColor: 'bg-red-600', number: 16 },
  { id: 'ham26', name: 'Hamilton', team: 'Ferrari', teamColor: 'bg-red-600', number: 44 },
  { id: 'nor26', name: 'Norris', team: 'McLaren', teamColor: 'bg-orange-500', number: 4 },
  { id: 'pia26', name: 'Piastri', team: 'McLaren', teamColor: 'bg-orange-500', number: 81 },
  { id: 'rus26', name: 'Russell', team: 'Mercedes', teamColor: 'bg-teal-500', number: 63 },
  { id: 'ant26', name: 'Antonelli', team: 'Mercedes', teamColor: 'bg-teal-500', number: 12 },
  { id: 'had26', name: 'Hadjar', team: 'Red Bull Racing', teamColor: 'bg-blue-700', number: 20 },
  { id: 'law26', name: 'Lawson', team: 'Red Bull Racing', teamColor: 'bg-blue-700', number: 30 },
  { id: 'gas26', name: 'Gasly', team: 'Alpine', teamColor: 'bg-sky-500', number: 10 },
  { id: 'doo26', name: 'Doohan', team: 'Alpine', teamColor: 'bg-sky-500', number: 7 },
  { id: 'alb26', name: 'Albon', team: 'Williams', teamColor: 'bg-blue-500', number: 23 },
  { id: 'sai26', name: 'Sainz', team: 'Williams', teamColor: 'bg-blue-500', number: 55 },
  { id: 'str26', name: 'Stroll', team: 'Cadillac', teamColor: 'bg-yellow-600', number: 18 },
  { id: 'ber26', name: 'Bearman', team: 'Cadillac', teamColor: 'bg-yellow-600', number: 87 },
  { id: 'hul26', name: 'Hülkenberg', team: 'Sauber', teamColor: 'bg-emerald-600', number: 27 },
  { id: 'bor26', name: 'Bortoleto', team: 'Sauber', teamColor: 'bg-emerald-600', number: 5 },
  { id: 'oco26', name: 'Ocon', team: 'Haas', teamColor: 'bg-gray-600', number: 31 },
  { id: 'lin26', name: 'Lindblad', team: 'Racing Bulls', teamColor: 'bg-indigo-500', number: 36 },
]

export const THEMES: Record<SeqTheme, { name: string; drivers: DriverCard[] }> = {
  'f1-2025': { name: 'Formula 1 — 2025', drivers: F1_2025_DRIVERS },
  'f1-2026': { name: 'Formula 1 — 2026', drivers: F1_2026_DRIVERS },
}

export const MAX_LIVES = 3

/** Shuffle an array (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick N random drivers from the theme for the challenge sequence */
export function pickChallengeCards(theme: SeqTheme, count: number): DriverCard[] {
  const all = [...THEMES[theme].drivers]
  return shuffle(all).slice(0, count)
}
