/**
 * Daily Challenge - shared types (C1). Pure data shapes; no zod, no Node-only APIs (the web imports
 * these files by relative path).
 */

/** A US Eastern calendar day, `YYYY-MM-DD`. */
export type ChallengeDay = string;

export type ChallengeLanguage = 'en' | 'es' | 'pt';

export const CHALLENGE_LANGUAGES: readonly ChallengeLanguage[] = Object.freeze(['en', 'es', 'pt']);

/** The challenge day runs midnight to midnight in this zone (FR-DC-12). */
export const CHALLENGE_TIME_ZONE = 'America/New_York';

export type ChallengeSettings = Record<string, number | string>;

export interface RotationEntry {
  /** Catalog id, e.g. 'sudoku'. Also the content `kind`. */
  gameId: string;
  /** Server theme id, e.g. 'SUDOKU'. */
  themeId: string;
  /** 2 (medium) for every entry (plan Q7). */
  difficulty: 1 | 2 | 3;
  settings: ChallengeSettings;
  /** Content has one variant per language (word-puzzle, hangman). */
  languageDependent: boolean;
}

/** Code-a-Bot: the fixed medium levels, in order. */
export interface CodeABotContent {
  kind: 'code-a-bot';
  difficulty: 'medium';
  levelNumbers: number[];
}

/** Sudoku: one 9x9 puzzle (`null` = blank) and its unique solution. */
export interface SudokuContent {
  kind: 'sudoku';
  puzzle: (number | null)[][];
  solution: number[][];
}

/** Operations of the medium Math Challenge (same names as the web's `MathOperation`). */
export type MathChallengeOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface MathChallengeQuestion {
  /** Display text, e.g. `12 × 4 = ?` (same format as the web generator). */
  question: string;
  answer: number;
  operation: MathChallengeOperation;
}

/** Math Challenge: the fixed question list, played in order. */
export interface MathChallengeContent {
  kind: 'math-challenge';
  questions: MathChallengeQuestion[];
}

/** Same cell names as the web's `CellType` in `mazeGenerator.ts`. */
export type MazeCell = 'wall' | 'path' | 'gate' | 'collectible' | 'start' | 'exit';

export interface MazePosition {
  row: number;
  col: number;
}

export interface MazeGate {
  position: MazePosition;
  equation: { display: string; answer: number; operation: MathChallengeOperation };
}

/** Same shape as the web's `MazeData`, so the page plays it without conversion. */
export interface MazeContent {
  grid: MazeCell[][];
  start: MazePosition;
  exit: MazePosition;
  gates: MazeGate[];
  collectibles: MazePosition[];
  rows: number;
  cols: number;
}

/** Math Maze: one maze with its gate equations. */
export interface MathMazeContent {
  kind: 'math-maze';
  maze: MazeContent;
}

export interface WordPuzzleVariant {
  grid: string[][];
  /** Every word is placed in the grid; the same count in every language. */
  words: string[];
  gridSize: number;
}

/** Word Puzzle: one grid and word list per language. */
export interface WordPuzzleContent {
  kind: 'word-puzzle';
  byLanguage: Record<ChallengeLanguage, WordPuzzleVariant>;
}

export interface HangmanWordContent {
  word: string;
  hint: string;
  category: string;
}

/** Hangman: the rounds' words per language, the same count in every language. */
export interface HangmanContent {
  kind: 'hangman';
  byLanguage: Record<ChallengeLanguage, HangmanWordContent[]>;
}

/** Union of every game's content (`kind` equals the rotation `gameId`). */
export type ChallengeContent =
  | CodeABotContent
  | SudokuContent
  | MathChallengeContent
  | MathMazeContent
  | WordPuzzleContent
  | HangmanContent;

export type ChallengeContentKind = ChallengeContent['kind'];

/** The metric totals a completion must report for a content (FR-DC-19). */
export interface ChallengeTotals {
  totalQuestions?: number;
  totalWords?: number;
}

/** The drawn challenge of a day. */
export interface DailyChallenge {
  day: ChallengeDay;
  gameId: string;
  themeId: string;
  difficulty: number;
  settings: ChallengeSettings;
  content: ChallengeContent;
}
