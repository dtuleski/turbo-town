/**
 * Daily Challenge - Hangman generator. Port of `apps/web/src/utils/hangmanData.ts`
 * `pickRandomWords('medium', count, lang)` with `sort(() => Math.random() - 0.5)` replaced by the
 * seeded shuffle. One word list per language, each from its own rng derived from the day's rng in
 * `CHALLENGE_LANGUAGES` order.
 */
import { mulberry32, shuffle } from '../rng';
import { CHALLENGE_LANGUAGES } from '../types';
import type { ChallengeLanguage, ChallengeTotals, HangmanContent, HangmanWordContent, RotationEntry } from '../types';
import { HANGMAN_MEDIUM_WORDS } from './data/hangman-words';

/** `ROUNDS_PER_GAME` in the web data file. */
const DEFAULT_WORDS = 5;

export function generateHangman(entry: RotationEntry, rng: () => number): HangmanContent {
  const count = typeof entry.settings.words === 'number' ? entry.settings.words : DEFAULT_WORDS;
  const byLanguage = {} as Record<ChallengeLanguage, HangmanWordContent[]>;
  for (const lang of CHALLENGE_LANGUAGES) {
    const sub = mulberry32(Math.floor(rng() * 4294967296));
    byLanguage[lang] = shuffle(sub, HANGMAN_MEDIUM_WORDS[lang])
      .slice(0, count)
      .map((w) => ({ ...w }));
  }
  return { kind: 'hangman', byLanguage };
}

/** The web page reports one question per round (word); the count is the same in every language. */
export function hangmanTotals(content: HangmanContent, language: ChallengeLanguage = 'en'): ChallengeTotals {
  return { totalQuestions: content.byLanguage[language].length };
}
