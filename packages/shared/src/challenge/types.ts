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

/** Union of every game's content. DC3 adds the other first-batch games. */
export type ChallengeContent = CodeABotContent;

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
