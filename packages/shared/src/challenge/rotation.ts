/**
 * Daily Challenge - rotation (C2). The 16 games of FR-DC-14, medium (difficulty 2) for all (plan Q7).
 * An entry is eligible for the draw only when it has a generator (FR-DC-15).
 */
import { hasGenerator } from './generators';
import type { RotationEntry } from './types';

const MEDIUM = { difficulty: 'medium' };

export const CHALLENGE_ROTATION: readonly RotationEntry[] = Object.freeze([
  { gameId: 'memory-match', themeId: 'ANIMALS', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  { gameId: 'math-challenge', themeId: 'MATH_CHALLENGE', difficulty: 2, settings: { questions: 15 }, languageDependent: false },
  { gameId: 'word-puzzle', themeId: 'WORD_PUZZLE', difficulty: 2, settings: { gridSize: 12, words: 8 }, languageDependent: true },
  { gameId: 'sudoku', themeId: 'SUDOKU', difficulty: 2, settings: { blanks: 46 }, languageDependent: false },
  { gameId: 'sequence-memory', themeId: 'SEQUENCE_MEMORY', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  { gameId: 'code-a-bot', themeId: 'CODE_A_BOT', difficulty: 2, settings: { levels: 5 }, languageDependent: false },
  { gameId: 'geo-quiz', themeId: 'GEO_QUIZ', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  { gameId: 'history-quiz', themeId: 'HISTORY_QUIZ', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  { gameId: 'civics-quiz', themeId: 'CIVICS_QUIZ', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  { gameId: 'hangman', themeId: 'HANGMAN', difficulty: 2, settings: { words: 5 }, languageDependent: true },
  { gameId: 'scratch-coding', themeId: 'SCRATCH_CODING', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  {
    gameId: 'math-maze',
    themeId: 'MATH_MAZE',
    difficulty: 2,
    settings: { size: 10, gatesMin: 5, gatesMax: 8, collectiblesMin: 4, collectiblesMax: 6 },
    languageDependent: false,
  },
  { gameId: 'pattern-recall', themeId: 'PATTERN_RECALL', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  { gameId: 'space-entry', themeId: 'SPACE_ENTRY', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  { gameId: 'bond-and-burn', themeId: 'BOND_AND_BURN', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
  { gameId: 'mini-golf', themeId: 'MINI_GOLF', difficulty: 2, settings: { ...MEDIUM }, languageDependent: false },
] as RotationEntry[]);

/** Rotation entries that can be drawn today (those with a generator). */
export function eligibleRotation(): RotationEntry[] {
  return CHALLENGE_ROTATION.filter((e) => hasGenerator(e.gameId));
}
