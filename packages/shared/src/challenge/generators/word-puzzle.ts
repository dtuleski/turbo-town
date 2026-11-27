/**
 * Daily Challenge - Word Puzzle generator. Port of `apps/web/src/utils/wordPuzzleUtils.ts`
 * `generateWordPuzzle('medium', lang)` with `Math.random` and `sort(() => Math.random() - 0.5)`
 * replaced by the seeded rng. One variant per language, each from its own rng derived from the day's
 * rng in `CHALLENGE_LANGUAGES` order. Difference from the web: a word that does not fit is replaced by
 * the next word of the shuffled list, so every listed word is in the grid and every language has the
 * same word count.
 */
import { mulberry32, randInt, shuffle } from '../rng';
import { CHALLENGE_LANGUAGES } from '../types';
import type {
  ChallengeLanguage,
  ChallengeTotals,
  RotationEntry,
  WordPuzzleContent,
  WordPuzzleVariant,
} from '../types';
import { WORD_PUZZLE_MEDIUM_WORDS } from './data/word-puzzle-words';

type Rng = () => number;
type Direction = 'horizontal' | 'vertical' | 'diagonal';

const DIRECTIONS: readonly Direction[] = ['horizontal', 'vertical', 'diagonal'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ATTEMPTS_PER_DIRECTION = 50;
const DEFAULT_GRID_SIZE = 12;
const DEFAULT_WORDS = 8;

function cellAt(grid: string[][], row: number, col: number): string {
  return (grid[row] as string[])[col] as string;
}

function step(direction: Direction): [number, number] {
  return direction === 'horizontal' ? [0, 1] : direction === 'vertical' ? [1, 0] : [1, 1];
}

function tryPlace(grid: string[][], word: string, size: number, direction: Direction, rng: Rng): boolean {
  const [dr, dc] = step(direction);
  const startRow = dr === 0 ? randInt(rng, 0, size - 1) : randInt(rng, 0, size - word.length);
  const startCol = dc === 0 ? randInt(rng, 0, size - 1) : randInt(rng, 0, size - word.length);
  for (let i = 0; i < word.length; i++) {
    const existing = cellAt(grid, startRow + i * dr, startCol + i * dc);
    if (existing !== '' && existing !== word[i]) return false;
  }
  for (let i = 0; i < word.length; i++) {
    (grid[startRow + i * dr] as string[])[startCol + i * dc] = word[i] as string;
  }
  return true;
}

function placeWord(grid: string[][], word: string, size: number, rng: Rng): boolean {
  if (word.length > size) return false;
  for (const direction of shuffle(rng, DIRECTIONS)) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_DIRECTION; attempt++) {
      if (tryPlace(grid, word, size, direction, rng)) return true;
    }
  }
  return false;
}

export function generateWordPuzzleVariant(
  wordList: readonly string[],
  gridSize: number,
  wordCount: number,
  rng: Rng
): WordPuzzleVariant {
  const grid: string[][] = Array.from({ length: gridSize }, () => Array<string>(gridSize).fill(''));
  const words: string[] = [];
  for (const word of shuffle(rng, [...new Set(wordList)])) {
    if (words.length >= wordCount) break;
    if (placeWord(grid, word, gridSize, rng)) words.push(word);
  }
  for (const row of grid) {
    for (let col = 0; col < gridSize; col++) {
      if (row[col] === '') row[col] = LETTERS[randInt(rng, 0, LETTERS.length - 1)] as string;
    }
  }
  return { grid, words, gridSize };
}

export function generateWordPuzzle(entry: RotationEntry, rng: Rng): WordPuzzleContent {
  const gridSize = typeof entry.settings.gridSize === 'number' ? entry.settings.gridSize : DEFAULT_GRID_SIZE;
  const wordCount = typeof entry.settings.words === 'number' ? entry.settings.words : DEFAULT_WORDS;
  const byLanguage = {} as Record<ChallengeLanguage, WordPuzzleVariant>;
  for (const lang of CHALLENGE_LANGUAGES) {
    const sub = mulberry32(Math.floor(rng() * 4294967296));
    byLanguage[lang] = generateWordPuzzleVariant(WORD_PUZZLE_MEDIUM_WORDS[lang], gridSize, wordCount, sub);
  }
  return { kind: 'word-puzzle', byLanguage };
}

/** The web page reports `totalWords = words.length`; the count is the same in every language. */
export function wordPuzzleTotals(content: WordPuzzleContent, language: ChallengeLanguage = 'en'): ChallengeTotals {
  return { totalWords: content.byLanguage[language].words.length };
}
