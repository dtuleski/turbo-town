import { CHALLENGE_ROTATION } from '@memory-game/shared';
import { gameName, pushText } from '../../../src/notifications/texts';
import { challengeSectionHtml, escapeHtml, resultsUrl } from '../../../src/notifications/challenge-section';
const challenge = {
  day: '2026-11-26',
  gameId: 'sudoku',
  themeId: 'SUDOKU',
  difficulty: 2,
  settings: { blanks: 46 },
  content: { kind: 'sudoku' } as any,
  createdAt: '2026-11-25T00:00:00.000Z',
};
const score = (userId: string, username: string, bestScore: number) => ({
  day: '2026-11-26', userId, username, bestScore, achievedAt: '2026-11-26T15:00:00.000Z', rankKey: 'k',
});
describe('pushText', () => {
  it('has a name for every rotation game in every language', () => {
    for (const lang of ['en', 'es', 'pt'] as const) {
      for (const entry of CHALLENGE_ROTATION) expect(gameName(entry.gameId, lang)).not.toBe(entry.gameId);
    }
  });
  it('challenge push names today\'s game in the user\'s language', () => {
    expect(pushText('challenge', 'en', { gameId: 'hangman' }).title).toBe("Today's challenge: Hangman");
    expect(pushText('challenge', 'es', { gameId: 'hangman' }).title).toBe('Desafío de hoy: Ahorcado');
    expect(pushText('challenge', 'pt', { gameId: 'hangman' }).title).toBe('Desafio de hoje: Forca');
  });
  it('digest push carries yesterday\'s winner and the user\'s rank', () => {
    expect(pushText('digest', 'en', { gameId: 'sudoku', winner: 'alice', rank: 3 }).body).toBe(
      "Yesterday's Sudoku challenge: alice won. You finished #3."
    );
    expect(pushText('digest', 'es', { gameId: 'sudoku', winner: 'alice' }).body).toContain('¡Prueba el desafío de hoy!');
    expect(pushText('digest', 'pt', {}).body).toBe('Veja os melhores jogadores de ontem e o desafio de hoje.');
  });
});
describe('challengeSectionHtml', () => {
  const results = { day: '2026-11-26', challenge, top: [score('a', 'alice', 900), score('b', '<b>bob</b>', 800), score('c', 'carol', 700), score('d', 'dan', 600)] };
  it('is empty when there was no challenge', () => {
    expect(challengeSectionHtml(null, null, 'en')).toBe('');
    expect(challengeSectionHtml({ day: '2026-11-26', challenge: null, top: [] }, null, 'en')).toBe('');
  });
  it('shows the game, the winner, the top 3 (escaped) and the user\'s own score and rank', () => {
    const html = challengeSectionHtml(results, { bestScore: 650, rank: 5, achievedAt: 't' }, 'en');
    expect(html).toContain("Yesterday's challenge: Sudoku");
    expect(html).toContain('Winner: alice');
    expect(html).toContain('&lt;b&gt;bob&lt;/b&gt;');
    expect(html).not.toContain('<b>bob</b>');
    expect(html).toContain('carol');
    expect(html).not.toContain('dan');
    expect(html).toContain('Your best: 650 points, #5.');
    expect(html).toContain(resultsUrl('2026-11-26'));
  });
  it('invites a user who did not play; tells everyone when nobody played', () => {
    expect(challengeSectionHtml(results, null, 'es')).toContain('¡El desafío de hoy te espera!');
    const empty = challengeSectionHtml({ day: '2026-11-26', challenge, top: [] }, null, 'pt');
    expect(empty).toContain('Ninguém jogou ontem');
    expect(empty).not.toContain('<table');
  });
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
