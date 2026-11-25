# MR2 Shared Race Core - Business Rules

Owner answers: all recommended options of `construction/plans/math-rally-shared-core-functional-design-plan.md`.

## 1. General rules (every kind)

- R-1 The answer is never a decimal and always fits a canonical option (at most 4 characters, integer -999..999 or a fraction). A question whose answer does not fit is redrawn.
- R-2 Below difficulty 4 no operand, answer or option is negative.
- R-3 A race never repeats a prompt (kind plus operands).
- R-4 Redraws are bounded: at most 64 operand draws per question and 64 question draws per fork. Each limit is a programming guard: the property tests show that the operand spaces below never need it. If a limit is ever reached, `buildRace` throws an `Error` with the seed, difficulty and kind, which the tests catch.
- R-5 All randomness comes from the race `Rng` (mulberry32, seeded). No `Math.random`, `Date` or I/O.

## 2. Operand rules per kind (owner answers Q3 to Q6)

| Difficulty | Kind | Prompt | Operands | Answer |
|---|---|---|---|---|
| 1 | `add` | `a + b` | a, b in 1..19, a + b <= 20 | 2..20 |
| 1 | `sub` | `a - b` | a in 2..20, b in 1..a-1 | 1..19 |
| 2 | `mul` | `a x b` | a, b in 2..10 | 4..100 |
| 2 | `div` | `p / a` | a (divisor) in 2..10, quotient q in 2..10, p = a x q | 2..10 |
| 2 | `add` | `a + b` | a, b in 10..89, a + b <= 100 | 20..100 |
| 2 | `sub` | `a - b` | a in 20..100, b in 10..a-1 | 1..90 |
| 3 | `twoStep` | one of `a + b x c`, `a x b - c`, `(a + b) x c`, `a - b x c` (equal chance) | b, c in 2..9; a in 2..50 | 1..999; redraw otherwise |
| 3 | `fractionOf` | `n/d of q` | d in {2, 3, 4, 5, 10}; n in 1..d-1; q a multiple of d in d..100 | n x q / d, whole |
| 3 | `percentOf` | `p% of q` | p in {10, 25, 50}; q in 10..200 and a multiple of 10 (p 10), 4 (p 25) or 2 (p 50) | whole, 1..100 |
| 3 | `square` | `n^2` | n in 2..12 | 4..144 |
| 4 | `negArith` | `a op b`, op in +, -, x, / (equal chance) | a, b in -20..20, not 0, at least one negative; for / the dividend is b x q with quotient q in -20..20, not 0 | -400..400 |
| 4 | `fracAdd` | `a/b + c/d` | b, d in 2..10; a in 1..b-1; c in 1..d-1 (proper fractions) | lowest terms; integer when whole; redraw if longer than 4 characters |
| 4 | `percentOfAny` | `p% of q` | p in 5..95, step 5; q a multiple of 20 in 20..400 | whole, 1..380 |
| 4 | `power` | `b^e` | b in 2..9 with e in {2, 3}, or b = 2 with e in 4..9 | 4..729 |
| 4 | `sqrt` | `root of s` | s = n^2, n in 2..31 | 2..31 |
| 4 | `equation` | `x + a = b`, `x - a = b` or `a x = b` (equal chance) | a in 2..12; solution x in -20..20, not 0; b computed | x |

Operands are stored in the order they appear in the prompt; for `twoStep` and `equation` a form index is stored as the first operand, and for `negArith` an operator index. The meaning of each operand slot is fixed in `v1/questions.ts` and frozen with protocol v1.

## 3. Distractor rules per kind (owner answer Q7)

Each rule produces candidate values. Rules are tried in the order listed; within a rule the candidates are shuffled with the race `Rng`. One candidate is taken per rule, cycling through the rules until `paths - 1` distractors are found.

| Kind | Rules in order |
|---|---|
| `add`, `sub` | wrong operation (a - b for a + b and the reverse), off by 10, off by 1 or 2, swapped digits |
| `mul` | neighbouring product (a x (b +/- 1), (a +/- 1) x b), wrong operation (a + b), swapped digits, off by 1 or 2 |
| `div` | neighbouring quotient (+/- 1), wrong operation (dividend - divisor), off by 10 |
| `twoStep` | left-to-right evaluation, off by 10, off by 1 or 2 |
| `fractionOf` | forgot the numerator (q / d), divided by the numerator (q / n), off by 1 or 2 |
| `percentOf` | another of the three percentages of q, off by 10, swapped digits |
| `square` | doubled instead of squared (2n), neighbouring square ((n +/- 1)^2), off by 1 or 2 |
| `negArith` | sign error (-answer), wrong operation, off by 1 or 2 |
| `fracAdd` | added numerators and denominators ((a + c)/(b + d), may be unreduced), numerator off by 1 (in the answer's denominator), the larger addend alone |
| `percentOfAny` | off by 10, 10% of q instead of p%, swapped digits |
| `power` | base times exponent (b x e), neighbouring power (b^(e +/- 1), (b +/- 1)^e), off by 1 or 2 |
| `sqrt` | half of the square (s / 2, if whole), neighbouring root (+/- 1) |
| `equation` | wrong inverse (b + a for x + a = b, b - a for x - a = b, a x b for a x = b), sign error (-x), off by 1 or 2 |

Every candidate passes this filter, in order, or is dropped:

1. Its string form is canonical (integer or fraction, at most 4 characters). The "added numerators and denominators" rule may keep an unreduced string such as `2/6`; every other rule writes the value in lowest terms.
2. Its value differs from the answer and from every option already chosen (compared as reduced fractions).
3. Below difficulty 4 it is not negative.
4. The swapped-digits rule skips results with a leading zero.

**Fallback (near values).** When the rules run out, the remaining options are near values: for an integer answer, answer + k for k = 1, -1, 2, -2, 3, -3, ... with the starting sign chosen by the `Rng`; for a fraction answer, numerator + k over the same denominator, in lowest terms. Each near value goes through the same filter. Near values never run out within the ranges above.

AC-15.1 holds because every kind has at least one rule that produces a value passing the filter for every operand set in Section 2 (checked by the property test).

## 4. Options and positions

- The correct option is `formatExact(answer)`.
- The correct position is drawn uniformly from 0..paths-1; if it would make a fourth fork in a row with the same position, it is redrawn uniformly from the other positions (FR-MK-16).
- The distractors fill the other positions in the order they were found.

## 5. Question selection per fork

1. Draw a kind by weight (`domain-entities.md` Section 3.2).
2. Draw operands for that kind (Section 2), redrawing until the answer is canonical.
3. If the prompt was already used in this race, draw again from step 1.
4. Build the options (Sections 3 and 4).

## 6. Free-tier gate

`isBlockedForFreeTier` returns true only for a theme in the paid list whose difficulty is not in the exceptions. Tests cover the launch lists (every theme unchanged) and an injected paid list containing `MATH_RALLY` (difficulty 1 allowed, 2 to 4 blocked).
