import type { Exact } from './types';

/** -999..999, no leading zero, no "-0". */
export const INTEGER_OPTION = /^(0|-?[1-9][0-9]{0,2})$/;
/** One- or two-digit numerator and denominator, optional minus. */
export const FRACTION_OPTION = /^-?[1-9][0-9]?\/[1-9][0-9]?$/;

const MAX_OPTION_LENGTH = 4;

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** Reduces num/den to lowest terms with a positive denominator. Throws for den 0. */
export function reduce(num: number, den: number): Exact {
  if (den === 0 || !Number.isInteger(num) || !Number.isInteger(den)) {
    throw new RangeError(`invalid fraction ${num}/${den}`);
  }
  if (num === 0) return { num: 0, den: 1 };
  const sign = den < 0 ? -1 : 1;
  const g = gcd(num, den);
  return { num: (sign * num) / g, den: (sign * den) / g };
}

export function exactInt(n: number): Exact {
  return reduce(n, 1);
}

export function isCanonicalOption(s: string): boolean {
  return s.length <= MAX_OPTION_LENGTH && (INTEGER_OPTION.test(s) || FRACTION_OPTION.test(s));
}

/** Reads a canonical option as a reduced value ("2/4" -> 1/2); null when not canonical. */
export function parseOption(s: string): Exact | null {
  if (!isCanonicalOption(s)) return null;
  const slash = s.indexOf('/');
  if (slash < 0) return exactInt(Number(s));
  return reduce(Number(s.slice(0, slash)), Number(s.slice(slash + 1)));
}

export function sameValue(a: Exact, b: Exact): boolean {
  return a.num === b.num && a.den === b.den;
}

/** Lowest terms; whole values as integers ("56", "-7", "3/4"). */
export function formatExact(v: Exact): string {
  const r = reduce(v.num, v.den);
  return r.den === 1 ? String(r.num) : `${r.num}/${r.den}`;
}

export function isWhole(v: Exact): boolean {
  return v.den === 1;
}

export function addExact(a: Exact, b: Exact): Exact {
  return reduce(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function negateExact(a: Exact): Exact {
  return reduce(-a.num, a.den);
}
