/**
 * Daily Challenge - daily draw (C5). Pure: the same day, eligible list and previous game always give
 * the same entry (FR-DC-13).
 */
import { mulberry32, pick, seedFrom } from './rng';
import type { ChallengeDay, RotationEntry } from './types';

export function drawChallenge(
  day: ChallengeDay,
  eligible: readonly RotationEntry[],
  previousGameId?: string
): RotationEntry {
  if (eligible.length === 0) throw new Error('No eligible challenge games');
  // With 2 or more games, never the same game two days running; with 1 it repeats.
  const others = eligible.filter((e) => e.gameId !== previousGameId);
  const candidates = eligible.length >= 2 && others.length > 0 ? others : eligible;
  return pick(mulberry32(seedFrom(`draw:${day}`)), candidates);
}
