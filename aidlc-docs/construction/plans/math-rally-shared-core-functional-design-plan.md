# MR2 Shared Race Core - Functional Design Plan

**Unit**: MR2 Shared Race Core (`packages/shared/src/math-rally/`), depth Standard
**Basis**: `inception/application-design/math-rally-unit-of-work.md` (MR2), `math-rally-component-methods.md` Section 1, `inception/requirements/math-rally-requirements.md` Section 4.0 and FR-MK-8, 12 to 18, 30, 55
**Settles** (from the execution plan): operand ranges per question kind, distractor rules per kind, track distances, acceleration and speeds that meet the layout contracts, and `timingToleranceMs` from the property test.

## Plan

- [ ] 1. Answer the questions below (owner)
- [ ] 2. Resolve any ambiguous answer with a follow-up question
- [ ] 3. Write `construction/math-rally-shared-core/functional-design/domain-entities.md` (types, option forms, protocol spec, track layout)
- [ ] 4. Write `construction/math-rally-shared-core/functional-design/business-rules.md` (operand rules and weights per kind, distractor table per kind, fallback rule, position balance, free-tier gate)
- [ ] 5. Write `construction/math-rally-shared-core/functional-design/business-logic-model.md` (race build flow, track layout maths with every contract checked against the chosen numbers, motion and expected-time model, tolerance method)
- [ ] 6. Check every layout contract of the methods file Section 1 against the chosen numbers, by hand, in the business logic model
- [ ] 7. Present for approval

`timingToleranceMs` is not asked: the methods file fixes the method (smallest multiple of 10 ms for which the AC-30.2 property test passes, plus 50 ms, at most 250 ms). The FD records a placeholder of 100 ms; Code Generation runs the test and writes the measured value back into the FD and `v1/track.ts`.

## Proposed numbers used in the questions

World units are arbitrary; one road segment is 200 units. With the recommended answers:

| Constant | Value | Why |
|---|---|---|
| `segmentLength` | 200 | Usual pseudo-3D segment size |
| `cruiseSpeed` | 3000 u/s | 15 segments a second |
| `maxSpeed` (boost) | 3750 u/s | 1.25 x cruise (Q2) |
| `accel` | 1500 u/s^2 | Cruise reached 2 s after "Go" |
| `slowFactor` | 0.6 | Fixed by the design |
| `boostSeconds` / `slowSeconds` | 1 / 1.5 | Owner-approved Q3 and Q4 |
| `branchLength` + `gapLength` | 4000 + 2000 | 6000 / 3750 = 1.6 s >= 1.5 s contract |
| Approach (question to decision line) | `readSeconds x maxSpeed`, rounded up to whole segments (Q1) | Meets FR-MK-8 exactly at top speed |
| `finishLength` | 9000 | About 3 s at cruise after the last merge |

Estimated all-correct race times: Easy about 2 min (10 forks), Medium about 2 min 10 s, Hard about 2 min 20 s, Super Hard about 2 min. The reading windows set most of this: an Easy race can never be shorter than 10 x 8 s.

## Questions

## Question 1
Should the distance from a question appearing to its decision line depend on the difficulty's reading window?

A) Yes: approach = reading window x top speed for that difficulty (8, 7, 6, 5 s). Harder levels get shorter approaches, so the reading window is exactly the minimum at top speed. (Recommended)
B) No: one approach length for every difficulty, sized for the longest window (8 s). Harder levels get more reading time than their minimum and longer races.
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2
How much faster than cruise is the boost after a right answer? A bigger boost feels more rewarding but makes every approach longer (the reading window is measured at top speed), so races get longer.

A) 1.25 x cruise: noticeable, Easy race about 2 min (Recommended)
B) 1.2 x cruise: milder, Easy race about 1 min 55 s
C) 1.5 x cruise: strong, Easy race about 2 min 20 s (branch plus gap must then grow to 6800 units to keep the 1.5 s contract)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3
Easy (difficulty 1): addition and subtraction within 20, no negative results. Which operand rules?

A) Addition a + b with a, b from 1 to 19 and a sum of at most 20; subtraction a - b with a from 2 to 20 and b from 1 to a - 1 (answer at least 1, never 0). Half addition, half subtraction. (Recommended)
B) Same as A, but 0 is allowed as an operand and as an answer
C) Same as A, but only facts up to 10 + 10 and 20 - 10 (all single-digit operands)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 4
Medium (difficulty 2): times tables 2 to 10, exact division, addition and subtraction within 100. Which operand rules and mix?

A) Multiplication a x b with a and b from 2 to 10; division (a x b) / a with divisor and quotient from 2 to 10; addition with two-digit operands (10 to 89) and a sum of at most 100; subtraction with a from 20 to 100 and b from 10 to a - 1. Mix: 30% multiplication, 30% division, 20% addition, 20% subtraction. (Recommended)
B) Same operands as A, equal mix (25% each)
C) Same as A, but multiplication tables use 1 to 10 for the second factor (allows x 1)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 5
Hard (difficulty 3): two-step expressions, fraction of a quantity, percentages of round numbers, squares up to 12. Which forms?

A) (Recommended)
- Two-step: `a + b x c`, `a x b - c`, `(a + b) x c`, `a - b x c`, with b and c from 2 to 9, a from 2 to 50, results from 1 to 999 (redraw otherwise). Parentheses only in the third form.
- Fraction of a quantity: `n/d of q` with d in {2, 3, 4, 5, 10}, n from 1 to d - 1, q a multiple of d up to 100, so the answer is a whole number.
- Percentages: 10%, 25% or 50% of a number that gives a whole answer, up to 200.
- Squares: n^2 for n from 2 to 12.
- Mix: 25% each.
B) Same as A without parentheses (left-to-right precedence only through x before +/-)
C) Same as A, but fraction of a quantity uses unit fractions only (1/d)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 6
Super Hard (difficulty 4): negatives in all four operations, adding simple fractions, percentages, powers and roots, one-step equations. Which forms?

A) (Recommended)
- Negatives: `a op b` with a and b from -20 to 20, not 0, at least one negative; division exact with a quotient from -20 to 20.
- Fraction addition: `a/b + c/d` with denominators from 2 to 10; the answer written in lowest terms with parts of at most two digits, or as an integer when whole.
- Percentages: 5% to 95% in steps of 5 of a multiple of 20 up to 400, whole answers only.
- Powers: b^2 and b^3 for b from 2 to 9, and 2^4 to 2^9 (all at most 999).
- Square roots: the root of n^2 for n from 2 to 31 (961 is the largest).
- Equations: `x + a = b`, `x - a = b`, `a x = b` with a from 2 to 12 and the solution x a whole number from -20 to 20.
- Mix: negatives 25%, equations 20%, fractions 15%, percentages 15%, powers 15%, roots 10%.
B) Same as A with an equal mix across the six kinds
C) Same as A but equation solutions stay positive (1 to 20)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 7
Which mistake rules build the wrong options for each kind? Every result still passes the canonical and distinct-value filter; when rules run out, near values fill the remaining paths (the existing fallback rule).

A) (Recommended)
| Kind | Rules, in order of preference |
|---|---|
| add, sub | wrong operation (a - b for a + b and the reverse), off by 10, off by 1 or 2, swapped digits |
| mul | neighbouring product (a x (b +/- 1)), wrong operation (a + b), swapped digits, off by 1 or 2 |
| div | neighbouring quotient (+/- 1), wrong operation (dividend - divisor), off by 10 |
| twoStep | left-to-right evaluation (the order-of-operations mistake), off by 10, off by 1 or 2 |
| fractionOf | forgot the numerator (q / d), divided by the numerator (q / n), off by 1 or 2 |
| percentOf | another of the three percentages, off by 10, swapped digits |
| square | doubled instead of squared (2n), neighbouring square, off by 1 or 2 |
| negArith | sign error (-answer), wrong operation, off by 1 or 2 |
| fracAdd | added numerators and denominators ((a + c)/(b + d), may be unreduced), sign or numerator off by 1, the larger addend alone |
| percentOfAny | off by 10, the percentage of the wrong base (10% instead of the given p), swapped digits |
| power | base times exponent (b x e), neighbouring power, off by 1 or 2 |
| sqrt | half of the square (n^2 / 2, if whole), neighbouring root (+/- 1) |
| equation | wrong inverse (b + a for x + a = b, a x b for a x = b), sign error, off by 1 or 2 |
B) Same as A, but at most one "off by 1 or 2" option per fork (more varied wrong answers)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 8
Where should the first question of a race start? (The kart accelerates from 0 to cruise in the first 3000 units after "Go".)

A) 3 segments (600 units) after "Go", so the "Go" banner has cleared; the reading window still holds because the kart is slower than top speed while it accelerates (Recommended)
B) At "Go" (position 0), the question appears with the countdown's end
X) Other (please describe after [Answer]: tag below)

[Answer]: 
