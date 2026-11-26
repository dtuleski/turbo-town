import { addDays } from './day';
import { drawChallenge } from './draw';
import { CHALLENGE_ROTATION, eligibleRotation } from './rotation';
import type { RotationEntry } from './types';

const entry = (gameId: string): RotationEntry => ({
  gameId,
  themeId: gameId.toUpperCase(),
  difficulty: 2,
  settings: {},
  languageDependent: false,
});

function chain(start: string, days: number, eligible: RotationEntry[]): string[] {
  const out: string[] = [];
  let prev: string | undefined;
  let day = start;
  for (let i = 0; i < days; i++) {
    prev = drawChallenge(day, eligible, prev).gameId;
    out.push(prev);
    day = addDays(day, 1);
  }
  return out;
}

describe('drawChallenge (FR-DC-13)', () => {
  it('is deterministic for the same inputs', () => {
    const eligible = CHALLENGE_ROTATION.slice(0, 6);
    expect(chain('2026-11-26', 365, [...eligible])).toEqual(chain('2026-11-26', 365, [...eligible]));
    expect(drawChallenge('2026-11-26', eligible).gameId).toBe(drawChallenge('2026-11-26', eligible).gameId);
  });

  it.each([2, 3, 6, 16])('never repeats a game on consecutive days over 365 days (%i eligible)', (n) => {
    const games = chain('2026-11-26', 365, CHALLENGE_ROTATION.slice(0, n));
    for (let i = 1; i < games.length; i++) expect(games[i]).not.toBe(games[i - 1]);
    expect(new Set(games).size).toBe(n);
  });

  it('repeats the only eligible game', () => {
    const only = [entry('code-a-bot')];
    expect(chain('2026-11-26', 5, only)).toEqual(Array(5).fill('code-a-bot'));
  });

  it('ignores a previous game that is not eligible', () => {
    const eligible = [entry('a'), entry('b')];
    expect(['a', 'b']).toContain(drawChallenge('2026-11-26', eligible, 'zzz').gameId);
  });

  it('throws without eligible games', () => {
    expect(() => drawChallenge('2026-11-26', [])).toThrow('No eligible challenge games');
  });
});

describe('rotation (FR-DC-14, plan Q7)', () => {
  it('lists the 16 games once each, medium, word games language-dependent', () => {
    expect(CHALLENGE_ROTATION.map((e) => e.gameId)).toEqual([
      'memory-match',
      'math-challenge',
      'word-puzzle',
      'sudoku',
      'sequence-memory',
      'code-a-bot',
      'geo-quiz',
      'history-quiz',
      'civics-quiz',
      'hangman',
      'scratch-coding',
      'math-maze',
      'pattern-recall',
      'space-entry',
      'bond-and-burn',
      'mini-golf',
    ]);
    expect(CHALLENGE_ROTATION.every((e) => e.difficulty === 2)).toBe(true);
    expect(CHALLENGE_ROTATION.filter((e) => e.languageDependent).map((e) => e.gameId)).toEqual(['word-puzzle', 'hangman']);
  });

  it('only games with a generator are eligible (FR-DC-15)', () => {
    expect(eligibleRotation().map((e) => e.gameId)).toEqual(['code-a-bot']);
  });
});
