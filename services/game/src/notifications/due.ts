import { CHALLENGE_TIME_ZONE, isValidTimeZone, localParts } from '@memory-game/shared';
import type { ChallengeLanguage } from '@memory-game/shared';
import { isChallengeLanguage } from '../services/email-prefs.service';
/**
 * Due planner (N2). Pure: given a user's zone, their claims and the run time, which sends are due.
 * Digest email and digest push are due from 08:00 to 08:59 local, the challenge push from 12:00 to
 * 12:59 local, each only while its claim for that local date is free. The one-hour window lets the
 * next 15-minute runs catch a missed run (NFR-DC-3).
 */
export const DIGEST_HOUR = 8;
export const CHALLENGE_HOUR = 12;
/** Used until a time zone is known (FR-DC-7). */
export const DEFAULT_TIME_ZONE = CHALLENGE_TIME_ZONE;
export interface Claims {
  lastDigestEmailOn?: string;
  lastDigestPushOn?: string;
  lastChallengePushOn?: string;
}
export interface DueSends {
  digestEmail: boolean;
  digestPush: boolean;
  challengePush: boolean;
  /** The user's local date (YYYY-MM-DD), the value claims are taken for. */
  localDate: string;
  timeZone: string;
}
interface Located {
  timeZone?: string;
  language?: string;
  updatedAt?: string;
}
/** The most recently updated device first. */
function latestFirst<T extends Located>(devices: readonly T[]): T[] {
  return [...devices].sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
}
/** Saved zone if valid, else the most recent device zone, else America/New_York. */
export function resolveTimeZone(saved: unknown, devices: readonly Located[] = []): string {
  if (isValidTimeZone(saved)) return saved;
  const fromDevice = latestFirst(devices).find((d) => isValidTimeZone(d.timeZone));
  return fromDevice?.timeZone ?? DEFAULT_TIME_ZONE;
}
/** Saved language if supported, else the most recent device language, else English (FR-DC-6). */
export function resolveLanguage(saved: unknown, devices: readonly Located[] = []): ChallengeLanguage {
  if (isChallengeLanguage(saved)) return saved;
  const fromDevice = latestFirst(devices).find((d) => isChallengeLanguage(d.language));
  return (fromDevice?.language as ChallengeLanguage | undefined) ?? 'en';
}
export function dueSends(user: { timeZone?: string; claims: Claims }, now: Date): DueSends {
  const timeZone = isValidTimeZone(user.timeZone) ? user.timeZone : DEFAULT_TIME_ZONE;
  const { date, hour } = localParts(now, timeZone);
  const free = (claimed: string | undefined) => claimed !== date;
  const digestHour = hour === DIGEST_HOUR;
  return {
    digestEmail: digestHour && free(user.claims.lastDigestEmailOn),
    digestPush: digestHour && free(user.claims.lastDigestPushOn),
    challengePush: hour === CHALLENGE_HOUR && free(user.claims.lastChallengePushOn),
    localDate: date,
    timeZone,
  };
}
