/**
 * Daily Challenge - Code-a-Bot generator. The content is the fixed list of medium levels in order
 * (`apps/web/src/utils/codeABotUtils.ts` MEDIUM_LEVELS, 5 levels); no randomness is needed.
 */
import type { ChallengeTotals, CodeABotContent, RotationEntry } from '../types';

const DEFAULT_LEVELS = 5;

export function generateCodeABot(entry: RotationEntry): CodeABotContent {
  const levels = typeof entry.settings.levels === 'number' ? entry.settings.levels : DEFAULT_LEVELS;
  return {
    kind: 'code-a-bot',
    difficulty: 'medium',
    levelNumbers: Array.from({ length: levels }, (_, i) => i + 1),
  };
}

/** The web and the app report one question per level. */
export function codeABotTotals(content: CodeABotContent): ChallengeTotals {
  return { totalQuestions: content.levelNumbers.length };
}
