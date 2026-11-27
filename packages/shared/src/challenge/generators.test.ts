import { expectedTotals, generateContent, hasGenerator } from './generators';
import { CHALLENGE_ROTATION } from './rotation';
import type { RotationEntry } from './types';

const codeABot = CHALLENGE_ROTATION.find((e) => e.gameId === 'code-a-bot') as RotationEntry;

describe('generator registry', () => {
  it('knows the first batch only', () => {
    for (const id of ['code-a-bot', 'sudoku', 'math-challenge', 'math-maze', 'word-puzzle', 'hangman']) {
      expect(hasGenerator(id)).toBe(true);
    }
    expect(hasGenerator('memory-match')).toBe(false);
    expect(hasGenerator('toString')).toBe(false);
  });

  it('Code-a-Bot content is the 5 medium levels, the same every day', () => {
    const content = generateContent(codeABot, '2026-11-26');
    expect(content).toEqual({ kind: 'code-a-bot', difficulty: 'medium', levelNumbers: [1, 2, 3, 4, 5] });
    expect(generateContent(codeABot, '2026-11-27')).toEqual(content);
    expect(JSON.parse(JSON.stringify(content))).toEqual(content);
  });

  it('expects one question per Code-a-Bot level', () => {
    expect(expectedTotals(generateContent(codeABot, '2026-11-26'))).toEqual({ totalQuestions: 5 });
    expect(expectedTotals(generateContent(codeABot, '2026-11-26'), 'es')).toEqual({ totalQuestions: 5 });
  });

  it('throws for a game without a generator', () => {
    const memory = CHALLENGE_ROTATION.find((e) => e.gameId === 'memory-match') as RotationEntry;
    expect(() => generateContent(memory, '2026-11-26')).toThrow('No challenge generator for memory-match');
  });
});
