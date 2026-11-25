import { FREE_DIFFICULTIES_IN_PAID_GAMES, PAID_GAME_THEME_IDS, isBlockedForFreeTier } from './paid-games';

describe('isBlockedForFreeTier', () => {
  it('keeps the launch behaviour: every paid theme blocked at every difficulty', () => {
    for (const theme of PAID_GAME_THEME_IDS) {
      for (const d of [1, 2, 3, 4]) expect(isBlockedForFreeTier(theme, d)).toBe(true);
    }
  });

  it('free themes, Math Rally included at launch, are never blocked', () => {
    for (const theme of ['MATH_RALLY', 'MEMORY_MATCH', 'MATH_CHALLENGE']) {
      for (const d of [1, 2, 3, 4]) expect(isBlockedForFreeTier(theme, d)).toBe(false);
    }
  });

  it('after a paid switch, Math Rally Easy stays free and 2 to 4 are blocked (AC-55.1)', () => {
    const paid = [...PAID_GAME_THEME_IDS, 'MATH_RALLY'];
    expect(isBlockedForFreeTier('MATH_RALLY', 1, paid)).toBe(false);
    for (const d of [2, 3, 4]) expect(isBlockedForFreeTier('MATH_RALLY', d, paid)).toBe(true);
  });

  it('the exception list is frozen and only names Math Rally Easy', () => {
    expect(FREE_DIFFICULTIES_IN_PAID_GAMES).toEqual({ MATH_RALLY: [1] });
    expect(Object.isFrozen(FREE_DIFFICULTIES_IN_PAID_GAMES)).toBe(true);
    expect(Object.isFrozen(FREE_DIFFICULTIES_IN_PAID_GAMES.MATH_RALLY)).toBe(true);
    expect(PAID_GAME_THEME_IDS).not.toContain('MATH_RALLY');
  });
});
