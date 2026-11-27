/**
 * Daily Challenge - generator registry (C6) and completion check totals (C7).
 * A game joins the draw only when it has a generator here (FR-DC-15).
 */
import { mulberry32, seedFrom } from '../rng';
import type { ChallengeContent, ChallengeDay, ChallengeLanguage, ChallengeTotals, RotationEntry } from '../types';
import { codeABotTotals, generateCodeABot } from './code-a-bot';

type Generator = (entry: RotationEntry, rng: () => number) => ChallengeContent;

const GENERATORS: Readonly<Record<string, Generator>> = Object.freeze({
  'code-a-bot': (entry: RotationEntry) => generateCodeABot(entry),
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
 * in every language, so `language` only picks the variant.
 */
export function expectedTotals(content: ChallengeContent, _language?: ChallengeLanguage): ChallengeTotals {
  switch (content.kind) {
    case 'code-a-bot':
      return codeABotTotals(content);
    default: {
      const unknown: never = content.kind;
      throw new Error(`No challenge totals for ${String(unknown)}`);
    }
  }
}
