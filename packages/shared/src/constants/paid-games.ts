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
