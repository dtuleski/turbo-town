/**
 * Daily Challenge - challenge clock (C3). DST-safe through `Intl.DateTimeFormat` with `timeZone`.
 */
import { CHALLENGE_TIME_ZONE } from './types';
import type { ChallengeDay } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_ZONE_LENGTH = 64;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClock(at: Date, timeZone: string): WallClock {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(at)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    // Some engines print midnight as 24 even with h23.
    hour: (values.hour ?? 0) % 24,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function formatDate(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Date and time of `at` in `timeZone`. */
export function localParts(at: Date, timeZone: string): { date: string; hour: number; minute: number } {
  const w = wallClock(at, timeZone);
  return { date: formatDate(w.year, w.month, w.day), hour: w.hour, minute: w.minute };
}

/** The US Eastern challenge day of an instant. */
export function challengeDayOf(at: Date): ChallengeDay {
  return localParts(at, CHALLENGE_TIME_ZONE).date;
}

/** `YYYY-MM-DD` that is a real calendar date. */
export function isChallengeDay(value: unknown): value is ChallengeDay {
  if (typeof value !== 'string') return false;
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

function parseDay(day: ChallengeDay): { y: number; m: number; d: number } {
  if (!isChallengeDay(day)) throw new RangeError(`Invalid challenge day: ${String(day).slice(0, 20)}`);
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return { y, m, d };
}

/** Calendar arithmetic on a day. */
export function addDays(day: ChallengeDay, n: number): ChallengeDay {
  const { y, m, d } = parseDay(day);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Wall-clock time of `t` in the zone read as UTC, minus `t`. */
function zoneOffsetMs(t: number, timeZone: string): number {
  const w = wallClock(new Date(t), timeZone);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - t;
}

function easternMidnight(day: ChallengeDay): Date {
  const { y, m, d } = parseDay(day);
  const guess = Date.UTC(y, m - 1, d);
  // Two passes settle the offset across a DST change; Eastern midnight is never in a DST gap.
  const first = guess - zoneOffsetMs(guess, CHALLENGE_TIME_ZONE);
  return new Date(guess - zoneOffsetMs(first, CHALLENGE_TIME_ZONE));
}

/** Eastern midnight that starts the day and the next one (end exclusive). */
export function challengeDayBounds(day: ChallengeDay): { start: Date; end: Date } {
  return { start: easternMidnight(day), end: easternMidnight(addDays(day, 1)) };
}

/** An IANA zone accepted by `Intl` (length 1 to 64). */
export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ZONE_LENGTH) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}
