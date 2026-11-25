import { exactInt, formatExact, isCanonicalOption, parseOption, reduce, sameValue } from '../exact';
import type { Rng } from '../rng';
import type { Exact, GeneratedQuestion, MathRallyDifficulty } from '../types';
import { evalNegArith } from './questions';

/**
 * Wrong options of protocol v1 (MR2 FD, business-rules Section 3).
 * Each rule yields candidates; one candidate is taken per rule, cycling through the
 * rules in order, until paths - 1 distractors pass the filter; near values fill the rest.
 */

interface Candidate {
  value: Exact;
  /** Set only by the "added numerators and denominators" rule, which may keep an unreduced form. */
  text?: string;
}

export interface Distractor {
  text: string;
  rule: string;
}

const int = (n: number): Candidate => ({ value: exactInt(n) });

function offBy(answer: number, ...steps: number[]): Candidate[] {
  return steps.flatMap((s) => [int(answer + s), int(answer - s)]);
}

/** Swapped digits of a whole number; results with a leading zero are skipped. */
function swappedDigits(n: number): Candidate[] {
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(n));
  if (digits.length < 2) return [];
  const out: Candidate[] = [];
  for (let i = 0; i < digits.length - 1; i++) {
    const chars = digits.split('');
    const t = chars[i] as string;
    chars[i] = chars[i + 1] as string;
    chars[i + 1] = t;
    if (chars[0] === '0') continue;
    out.push(int(Number(sign + chars.join(''))));
  }
  return out;
}

function intIfWhole(num: number, den: number): Candidate[] {
  return den !== 0 && num % den === 0 ? [int(num / den)] : [];
}

/** Rule groups for a question, in order of preference. */
export function ruleCandidates(q: GeneratedQuestion): { rule: string; candidates: Candidate[] }[] {
  const o = q.operands;
  const ans = q.answer;
  const a0 = o[0] as number;
  const a1 = o[1] as number;
  const a2 = o[2] as number;
  const a3 = o[3] as number;
  const whole = ans.den === 1 ? ans.num : 0;
  switch (q.kind) {
    case 'add':
      return [
        { rule: 'wrongOperation', candidates: [int(a0 - a1), int(a1 - a0)] },
        { rule: 'offBy10', candidates: offBy(whole, 10) },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
        { rule: 'swappedDigits', candidates: swappedDigits(whole) },
      ];
    case 'sub':
      return [
        { rule: 'wrongOperation', candidates: [int(a0 + a1)] },
        { rule: 'offBy10', candidates: offBy(whole, 10) },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
        { rule: 'swappedDigits', candidates: swappedDigits(whole) },
      ];
    case 'mul':
      return [
        { rule: 'neighbourProduct', candidates: [int(a0 * (a1 + 1)), int(a0 * (a1 - 1)), int((a0 + 1) * a1), int((a0 - 1) * a1)] },
        { rule: 'wrongOperation', candidates: [int(a0 + a1)] },
        { rule: 'swappedDigits', candidates: swappedDigits(whole) },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
      ];
    case 'div':
      return [
        { rule: 'neighbourQuotient', candidates: offBy(whole, 1) },
        { rule: 'wrongOperation', candidates: [int(a0 - a1)] },
        { rule: 'offBy10', candidates: offBy(whole, 10) },
      ];
    case 'twoStep': {
      const [form, a, b, c] = [a0, a1, a2, a3];
      // The order-of-operations mistake for each form.
      const mistake = form === 0 ? (a + b) * c : form === 1 ? a * (b - c) : form === 2 ? a + b * c : (a - b) * c;
      return [
        { rule: 'leftToRight', candidates: [int(mistake)] },
        { rule: 'offBy10', candidates: offBy(whole, 10) },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
      ];
    }
    case 'fractionOf': {
      const [n, d, qty] = [a0, a1, a2];
      return [
        { rule: 'forgotNumerator', candidates: intIfWhole(qty, d) },
        { rule: 'dividedByNumerator', candidates: intIfWhole(qty, n) },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
      ];
    }
    case 'percentOf': {
      const [p, qty] = [a0, a1];
      return [
        { rule: 'otherPercentage', candidates: [10, 25, 50].filter((x) => x !== p).flatMap((x) => intIfWhole(x * qty, 100)) },
        { rule: 'offBy10', candidates: offBy(whole, 10) },
        { rule: 'swappedDigits', candidates: swappedDigits(whole) },
      ];
    }
    case 'square': {
      const n = a0;
      return [
        { rule: 'doubled', candidates: [int(2 * n)] },
        { rule: 'neighbourSquare', candidates: [int((n + 1) ** 2), int((n - 1) ** 2)] },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
      ];
    }
    case 'negArith': {
      const [op, a, b] = [a0, a1, a2];
      const others = [0, 1, 2, 3].filter((x) => x !== op).map((x) => evalNegArith(x, a, b));
      return [
        { rule: 'signError', candidates: [int(-whole)] },
        { rule: 'wrongOperation', candidates: others.filter((v) => v.den === 1).map((v) => ({ value: v })) },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
      ];
    }
    case 'fracAdd': {
      const [a, b, c, d] = [a0, a1, a2, a3];
      const naiveNum = a + c;
      const naiveDen = b + d;
      const larger = a * d >= c * b ? reduce(a, b) : reduce(c, d);
      return [
        { rule: 'addedNumAndDen', candidates: [{ value: reduce(naiveNum, naiveDen), text: `${naiveNum}/${naiveDen}` }] },
        {
          rule: 'numeratorOffBy1',
          candidates: [ans.num + 1, ans.num - 1].filter((x) => x > 0).map((x) => ({ value: reduce(x, ans.den) })),
        },
        { rule: 'largerAddend', candidates: [{ value: larger }] },
      ];
    }
    case 'percentOfAny': {
      const [p, qty] = [a0, a1];
      return [
        { rule: 'offBy10', candidates: offBy(whole, 10) },
        { rule: 'tenPercent', candidates: p === 10 ? [] : intIfWhole(10 * qty, 100) },
        { rule: 'swappedDigits', candidates: swappedDigits(whole) },
      ];
    }
    case 'power': {
      const [b, e] = [a0, a1];
      return [
        { rule: 'baseTimesExponent', candidates: [int(b * e)] },
        { rule: 'neighbourPower', candidates: [int(b ** (e + 1)), int(b ** (e - 1)), int((b + 1) ** e), int((b - 1) ** e)] },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
      ];
    }
    case 'sqrt': {
      const s = a0;
      return [
        { rule: 'halfOfSquare', candidates: intIfWhole(s, 2) },
        { rule: 'neighbourRoot', candidates: offBy(whole, 1) },
      ];
    }
    case 'equation': {
      const [form, a, b] = [a0, a1, a2];
      const wrongInverse = form === 0 ? b + a : form === 1 ? b - a : a * b;
      return [
        { rule: 'wrongInverse', candidates: [int(wrongInverse)] },
        { rule: 'signError', candidates: [int(-whole)] },
        { rule: 'offBy1or2', candidates: offBy(whole, 1, 2) },
      ];
    }
  }
}

function accept(
  c: Candidate,
  answer: Exact,
  chosen: Exact[],
  difficulty: MathRallyDifficulty
): string | null {
  const text = c.text ?? formatExact(c.value);
  if (!isCanonicalOption(text)) return null;
  const value = parseOption(text) as Exact;
  if (sameValue(value, answer)) return null;
  if (chosen.some((v) => sameValue(v, value))) return null;
  if (difficulty < 4 && value.num < 0) return null;
  return text;
}

/** Near values: answer + k (k = 1, -1, 2, -2, ...), starting sign from the RNG. */
function* nearValues(answer: Exact, rng: Rng): Generator<Candidate> {
  const sign = rng.nextInt(0, 1) === 0 ? 1 : -1;
  for (let k = 1; k <= 2000; k++) {
    for (const s of [sign, -sign]) {
      yield { value: reduce(answer.num + s * k, answer.den) };
    }
  }
}

export function buildDistractors(
  rng: Rng,
  q: GeneratedQuestion,
  difficulty: MathRallyDifficulty,
  count: number
): Distractor[] {
  const out: Distractor[] = [];
  const chosen: Exact[] = [];
  const groups = ruleCandidates(q).map((g) => ({ rule: g.rule, queue: rng.shuffle(g.candidates) }));
  let progress = true;
  while (out.length < count && progress) {
    progress = false;
    for (const g of groups) {
      if (out.length >= count) break;
      while (g.queue.length > 0) {
        const c = g.queue.shift() as Candidate;
        const text = accept(c, q.answer, chosen, difficulty);
        if (text) {
          out.push({ text, rule: g.rule });
          chosen.push(parseOption(text) as Exact);
          progress = true;
          break;
        }
      }
    }
  }
  if (out.length < count) {
    for (const c of nearValues(q.answer, rng)) {
      if (out.length >= count) break;
      const text = accept(c, q.answer, chosen, difficulty);
      if (text) {
        out.push({ text, rule: 'near' });
        chosen.push(parseOption(text) as Exact);
      }
    }
  }
  if (out.length < count) {
    throw new Error(`Math Rally v1: not enough options for ${q.kind} ${q.operands.join(',')}`);
  }
  return out;
}

/** `paths` options with the correct one first. */
export function buildOptionsV1(rng: Rng, q: GeneratedQuestion, difficulty: MathRallyDifficulty, paths: number): string[] {
  return [formatExact(q.answer), ...buildDistractors(rng, q, difficulty, paths - 1).map((d) => d.text)];
}
