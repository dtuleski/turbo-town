/**
 * Theme ids blocked for FREE users.
 *
 * Mirrors the local `PAID_GAMES` array in `services/game/src/services/game.service.ts`
 * (its last element is `CIRCUIT_BUILDER_THEME_ID` from `services/game/src/utils/circuit-builder.ts`).
 * The Game Service switches to this constant in QM2.
 */
export const PAID_GAME_THEME_IDS: readonly string[] = Object.freeze([
  'SPACE_ENTRY',
  'SCRATCH_CODING',
  'BOND_AND_BURN',
  'TRAFFIC_LAB',
  'MINI_GOLF',
  'LANGUAGE_PRONUNCIATION',
  'CIRCUIT_BUILDER',
]);

/**
 * Difficulties that stay free for FREE users in an otherwise paid game (Math Rally, owner answer Q21).
 * Math Rally is free at launch (not in PAID_GAME_THEME_IDS); after a paid switch Easy (1) stays free.
 * The difficulty-4 rule for FREE users is a separate check in startGame, so an exception here can
 * never open Super Hard.
 */
export const FREE_DIFFICULTIES_IN_PAID_GAMES: Readonly<Record<string, readonly number[]>> = Object.freeze({
  MATH_RALLY: Object.freeze([1]),
});

/** True when the theme is paid and the difficulty is not one of its free exceptions. */
export function isBlockedForFreeTier(
  themeId: string,
  difficulty: number,
  paidThemeIds: readonly string[] = PAID_GAME_THEME_IDS,
  exceptions: Readonly<Record<string, readonly number[]>> = FREE_DIFFICULTIES_IN_PAID_GAMES
): boolean {
  if (!paidThemeIds.includes(themeId)) return false;
  return !(exceptions[themeId] ?? []).includes(difficulty);
}
