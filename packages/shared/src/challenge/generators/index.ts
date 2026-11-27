/**
 * Daily Challenge - generator registry (C6) and completion check totals (C7).
 * A game joins the draw only when it has a generator here (FR-DC-15).
 */
import { mulberry32, seedFrom } from '../rng';
import type { ChallengeContent, ChallengeDay, ChallengeLanguage, ChallengeTotals, RotationEntry } from '../types';
import { codeABotTotals, generateCodeABot } from './code-a-bot';
import { generateHangman, hangmanTotals } from './hangman';
import { generateMathChallenge, mathChallengeTotals } from './math-challenge';
import { generateMathMaze, mathMazeTotals } from './math-maze';
import { generateSudoku, sudokuTotals } from './sudoku';
import { generateWordPuzzle, wordPuzzleTotals } from './word-puzzle';

type Generator = (entry: RotationEntry, rng: () => number) => ChallengeContent;

const GENERATORS: Readonly<Record<string, Generator>> = Object.freeze({
  'code-a-bot': (entry: RotationEntry) => generateCodeABot(entry),
  sudoku: generateSudoku,
  'math-challenge': generateMathChallenge,
  'math-maze': generateMathMaze,
  'word-puzzle': generateWordPuzzle,
  hangman: generateHangman,
});

export function hasGenerator(gameId: string): boolean {
  return Object.prototype.hasOwnProperty.call(GENERATORS, gameId);
}

/** Content for a day, from the seed `${day}:${gameId}`. Throws for a game without a generator. */
export function generateContent(entry: RotationEntry, day: ChallengeDay): ChallengeContent {
  if (!hasGenerator(entry.gameId)) throw new Error(`No challenge generator for ${entry.gameId}`);
  const generate = GENERATORS[entry.gameId] as Generator;
  return generate(entry, mulberry32(seedFrom(`${day}:${entry.gameId}`)));
}

/**
 * The totals a completion must report for the content. Language-dependent games have the same totals
 * in every language, so `language` only picks the variant (default en).
 */
export function expectedTotals(content: ChallengeContent, language?: ChallengeLanguage): ChallengeTotals {
  switch (content.kind) {
    case 'code-a-bot':
      return codeABotTotals(content);
    case 'sudoku':
      return sudokuTotals(content);
    case 'math-challenge':
      return mathChallengeTotals(content);
    case 'math-maze':
      return mathMazeTotals(content);
    case 'word-puzzle':
      return wordPuzzleTotals(content, language);
    case 'hangman':
      return hangmanTotals(content, language);
    default: {
      const unknown: never = content;
      throw new Error(`No challenge totals for ${String((unknown as { kind?: unknown }).kind)}`);
    }
  }
}
