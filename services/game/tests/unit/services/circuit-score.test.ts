/**
 * E3 - Circuit Builder scoring.
 *
 * The headline property is FR-CB-25: an elegant fault-free circuit must out-score a faster
 * careless one. The rest of the suite bounds the formula so it can never return NaN, a
 * negative score, or a clipped one.
 */

import { getLevel, MAX_FAULT_COUNT_PER_LEVEL } from '@memory-game/shared';
import type { LevelDefinition } from '@memory-game/shared';
import { ScoreCalculatorService } from '../../../src/services/score-calculator.service';
import {
  reevaluateCircuitSubmission,
  type VerifiedCircuitMetrics,
} from '../../../src/services/circuit-reevaluation.service';
import { validateCircuitSubmission } from '../../../src/utils/circuit-validation';
import {
  CB_BASE_SCORE,
  CB_MAX_COMPLETION_TIME,
  CB_SCORE_CAP,
  CB_SPEED_BONUS_MAX,
  CB_SPEED_BONUS_MIN,
} from '../../../src/utils/circuit-builder';
import {
  asWirePayload,
  headlightLayout,
  submissionPayload,
  unprotectedHeadlightLayout,
} from '../circuit-fixtures';

const calculator = new ScoreCalculatorService();
const LEVEL = getLevel('cb-01-closed-circuit') as LevelDefinition;

/** cb-01-closed-circuit allows battery 1, wire 4, led 1, resistor 1. */
const LEVEL_BUDGET = 7;

function metrics(
  componentCount: number,
  faultCount: number,
  completionTime: number,
  unresolvedFaultCount = 0
): VerifiedCircuitMetrics {
  return { componentCount, faultCount, completionTime, unresolvedFaultCount };
}

function scoreOf(
  componentCount: number,
  faultCount: number,
  completionTime: number,
  difficulty = 1,
  level: LevelDefinition = LEVEL
): number {
  return calculator.calculateCircuitBuilderBreakdown(
    metrics(componentCount, faultCount, completionTime),
    level,
    difficulty
  ).finalScore;
}

/**
 * Score a layout through the production path: E1, then E2's engine re-evaluation, then E3.
 * The fault counts therefore come from the engine rather than from a hand-written metrics
 * object, which is the whole point of the cases that use it.
 */
function scoreSubmittedLayout(
  layout: ReturnType<typeof unprotectedHeadlightLayout> | undefined,
  completionTime: number,
  faultCount = 0
): { finalScore: number; componentCount: number; unresolvedFaultCount: number } {
  const payload =
    layout === undefined
      ? submissionPayload({ faultCount })
      : submissionPayload({ layout: asWirePayload(layout), faultCount });
  const validated = validateCircuitSubmission(payload, completionTime);
  if (!validated.ok) {
    throw new Error('fixture failed E1 validation');
  }
  const outcome = reevaluateCircuitSubmission(validated.value, 1);
  if (!outcome.ok) {
    throw new Error(`fixture failed E2 re-evaluation: ${outcome.reason}`);
  }
  return {
    finalScore: calculator.calculateCircuitBuilderBreakdown(
      outcome.verifiedMetrics,
      outcome.level,
      1
    ).finalScore,
    componentCount: outcome.verifiedMetrics.componentCount,
    unresolvedFaultCount: outcome.verifiedMetrics.unresolvedFaultCount,
  };
}

describe('calculateCircuitBuilderBreakdown - worked cases', () => {
  it('scores an elegant, fault-free, slower circuit (3 components, 0 faults, 120 s)', () => {
    const breakdown = calculator.calculateCircuitBuilderBreakdown(metrics(3, 0, 120), LEVEL, 1);

    expect(breakdown.baseScore).toBe(CB_BASE_SCORE);
    expect(breakdown.difficultyMultiplier).toBe(1.0);
    expect(breakdown.speedBonus).toBeCloseTo(0.95, 6);
    expect(breakdown.accuracyBonus).toBeCloseTo(1.3, 6);
    expect(breakdown.accuracy).toBeCloseTo(0.8, 6);
    expect(breakdown.completionTime).toBe(120);
    expect(breakdown.difficulty).toBe('Easy');
    expect(breakdown.finalScore).toBe(2100);
  });

  it('scores a careless, faster circuit (6 components, 3 faults, 45 s)', () => {
    const breakdown = calculator.calculateCircuitBuilderBreakdown(metrics(6, 3, 45), LEVEL, 1);

    expect(breakdown.speedBonus).toBeCloseTo(1.075, 6);
    expect(breakdown.accuracyBonus).toBeCloseTo(0.55, 6);
    expect(breakdown.finalScore).toBe(1005);
  });

  it('scores a careless, fastest-legal circuit (5 components, 1 fault, 30 s)', () => {
    const breakdown = calculator.calculateCircuitBuilderBreakdown(metrics(5, 1, 30), LEVEL, 1);

    expect(breakdown.speedBonus).toBeCloseTo(1.1, 6);
    expect(breakdown.accuracyBonus).toBeCloseTo(0.85, 6);
    expect(breakdown.finalScore).toBe(1590);
  });

  // FR-CB-25: this is the requirement the whole weighting exists to satisfy.
  it('ranks the elegant fault-free circuit above both faster careless ones', () => {
    const elegant = scoreOf(3, 0, 120);

    expect(elegant).toBeGreaterThan(scoreOf(6, 3, 45));
    expect(elegant).toBeGreaterThan(scoreOf(5, 1, 30));
  });
});

/**
 * FR-CB-2 and CB-3.6: the resistor exists so that an LED can be protected, so the score must
 * not reward leaving it out. Both rows run the production path, so the fault counts are the
 * engine's own.
 */
describe('calculateCircuitBuilderBreakdown - the protective resistor must pay', () => {
  it('scores the canonical protected solve above the unprotected two-element solve', () => {
    const protectedSolve = scoreSubmittedLayout(undefined, 90);
    const unprotected = scoreSubmittedLayout(unprotectedHeadlightLayout(), 90);

    // Protected: 3 components, efficiency 0.80, no fault -> quality 0.80.
    expect(protectedSolve.componentCount).toBe(3);
    expect(protectedSolve.unresolvedFaultCount).toBe(0);
    expect(protectedSolve.finalScore).toBe(2210);

    // Unprotected: 2 components, efficiency 1.00, one OVERCURRENT -> quality 0.70.
    expect(unprotected.componentCount).toBe(2);
    expect(unprotected.unresolvedFaultCount).toBe(1);
    expect(unprotected.finalScore).toBe(2040);

    expect(protectedSolve.finalScore).toBeGreaterThan(unprotected.finalScore);
  });

  it('would have let the unprotected solve win on efficiency alone', () => {
    // The same two layouts with the fault penalty removed - what the score was before the
    // engine's faults reached the scorer. 2550 against 2210 is the defect, kept as a test so
    // it cannot come back unnoticed.
    expect(scoreOf(2, 0, 90)).toBe(2550);
    expect(scoreOf(3, 0, 90)).toBe(2210);
  });

  // The ranking has to hold at EVERY historical count, not only at 0. While the two penalties
  // were combined by `max`, the verified one merely replaced the historical one, so these two
  // layouts inverted from a reported count of 3 upward - the experimenting player the game is
  // built for. Exact integers at the boundary of every regime: below both caps, at the
  // historical cap, and at the clamp ceiling.
  it('keeps the protected solve ahead at every historical fault count', () => {
    // [historical faultCount, protected solve score, unprotected solve score]
    const expected: ReadonlyArray<readonly [number, number, number]> = [
      [0, 2210, 2040],
      [1, 2125, 2040],
      [2, 2040, 1955],
      [3, 1955, 1870],
      [6, 1700, 1615],
      [7, 1700, 1530],
      [12, 1700, 1530],
      [MAX_FAULT_COUNT_PER_LEVEL, 1700, 1530],
    ];

    for (const [faultCount, protectedScore, unprotectedScore] of expected) {
      const protectedSolve = calculator.calculateCircuitBuilderBreakdown(
        metrics(3, faultCount, 90, 0),
        LEVEL,
        1
      );
      const unprotected = calculator.calculateCircuitBuilderBreakdown(
        metrics(2, faultCount, 90, 1),
        LEVEL,
        1
      );

      expect(protectedSolve.finalScore).toBe(protectedScore);
      expect(unprotected.finalScore).toBe(unprotectedScore);
      expect(protectedSolve.finalScore).toBeGreaterThan(unprotected.finalScore);
    }
  });
});

describe('calculateCircuitBuilderBreakdown - fault signal combination (SECURITY-11)', () => {
  it('penalizes a fault present in the final layout even when the client reports none', () => {
    const clean = calculator.calculateCircuitBuilderBreakdown(metrics(2, 0, 90, 0), LEVEL, 1);
    const faulted = calculator.calculateCircuitBuilderBreakdown(metrics(2, 0, 90, 1), LEVEL, 1);

    expect(clean.finalScore).toBe(2550);
    expect(faulted.accuracy).toBeCloseTo(0.7, 6);
    expect(faulted.finalScore).toBe(2040);
    expect(faulted.finalScore).toBeLessThan(clean.finalScore);
  });

  it('still charges the client-reported count when the final layout is clean', () => {
    expect(scoreOf(2, 1, 90)).toBe(2465);
    expect(scoreOf(2, 1, 90)).toBeLessThan(scoreOf(2, 0, 90));
  });

  it('nets the verified faults out of the historical count, charging no fault twice', () => {
    // The same layout with the same single engine-visible fault, reported honestly by one
    // client and hidden by another. Honesty must cost nothing, or the scoring would pay for
    // under-reporting.
    const honest = calculator.calculateCircuitBuilderBreakdown(metrics(2, 1, 90, 1), LEVEL, 1);
    const silent = calculator.calculateCircuitBuilderBreakdown(metrics(2, 0, 90, 1), LEVEL, 1);

    expect(honest.finalScore).toBe(2040);
    expect(honest.finalScore).toBe(silent.finalScore);

    // Six reported with one of them still present: five cleared at 0.05 plus one verified at
    // 0.30 is 0.55. Pricing all six as cleared would have charged 0.60 and scored 1530.
    const mixed = calculator.calculateCircuitBuilderBreakdown(metrics(2, 6, 90, 1), LEVEL, 1);

    expect(mixed.accuracy).toBeCloseTo(0.45, 6);
    expect(mixed.finalScore).toBe(1615);
  });

  it('caps the historical half on its own, so the verified penalty survives the ceiling', () => {
    // Historical penalty saturated at its own 0.30 cap by an over-reported count. Under a
    // single shared 0.60 ceiling the engine-visible fault would have been free here.
    const clean = calculator.calculateCircuitBuilderBreakdown(metrics(2, 20, 90, 0), LEVEL, 1);
    const faulted = calculator.calculateCircuitBuilderBreakdown(metrics(2, 20, 90, 1), LEVEL, 1);

    expect(clean.accuracy).toBeCloseTo(0.7, 6);
    expect(clean.finalScore).toBe(2040);
    expect(faulted.accuracy).toBeCloseTo(0.4, 6);
    expect(faulted.finalScore).toBe(1530);
    expect(clean.finalScore - faulted.finalScore).toBe(510);
  });

  it('caps the combined penalty, so neither signal can drive the score negative', () => {
    const breakdown = calculator.calculateCircuitBuilderBreakdown(metrics(2, 20, 90, 2), LEVEL, 1);

    expect(breakdown.accuracy).toBeCloseTo(0.4, 6);
    expect(breakdown.finalScore).toBe(1530);
    expect(breakdown.finalScore).toBeGreaterThan(0);
  });

  it('lowers the score with each additional unresolved fault up to the cap', () => {
    const scores = [0, 1, 2].map(
      (unresolved) =>
        calculator.calculateCircuitBuilderBreakdown(metrics(2, 0, 90, unresolved), LEVEL, 1)
          .finalScore
    );

    expect(scores[1]).toBeLessThan(scores[0]);
    expect(scores[2]).toBeLessThan(scores[1]);
  });
});

describe('calculateCircuitBuilderBreakdown - level budget composition', () => {
  it('counts pre-placed elements in the budget, as E2 counts them in the allowance', () => {
    // A hypothetical level granting 2 tray components and supplying 2 of its own. E2 grants
    // a pre-placed element allowance, so a 4-element layout is admissible there and E3 has
    // to measure efficiency against a budget of 4. Summing availableComponents alone would
    // make the budget 2 and clamp every submission to zero efficiency, the ideal one too.
    const withPrePlaced: LevelDefinition = {
      ...LEVEL,
      availableComponents: { wire: 2 },
      prePlaced: headlightLayout().elements.slice(0, 2),
    };

    const breakdown = calculator.calculateCircuitBuilderBreakdown(
      metrics(3, 0, 90),
      withPrePlaced,
      1
    );

    // Budget 4, denominator 2, so a 3-element layout sits at (4 - 3) / 2 = 0.50.
    expect(breakdown.accuracy).toBeCloseTo(0.5, 6);
    expect(breakdown.finalScore).toBe(1700);
  });
});

describe('calculateCircuitBuilderBreakdown - monotonicity', () => {
  it('raises the score as component count falls, at equal time and faults', () => {
    const scores = [2, 3, 4, 5, 6, 7].map((count) => scoreOf(count, 0, 90));

    for (let index = 1; index < scores.length; index += 1) {
      expect(scores[index]).toBeLessThan(scores[index - 1]);
    }
  });

  it('lowers the score with each additional fault below the penalty cap', () => {
    const scores = [0, 1, 2, 3, 4, 5].map((faults) => scoreOf(2, faults, 90));

    for (let index = 1; index < scores.length; index += 1) {
      expect(scores[index]).toBeLessThan(scores[index - 1]);
    }
  });

  it('raises the score as completion time falls, at equal components and faults', () => {
    const scores = [30, 60, 90, 120, 150].map((time) => scoreOf(3, 0, time));

    for (let index = 1; index < scores.length; index += 1) {
      expect(scores[index]).toBeLessThan(scores[index - 1]);
    }
  });
});

describe('calculateCircuitBuilderBreakdown - fault penalty ceiling', () => {
  it('scores an absurd fault count identically to one at the clamp', () => {
    expect(scoreOf(2, 500, 90)).toBe(scoreOf(2, 20, 90));
  });

  it('never returns a negative score when the penalty exceeds the efficiency', () => {
    const breakdown = calculator.calculateCircuitBuilderBreakdown(
      metrics(LEVEL_BUDGET, 20, CB_MAX_COMPLETION_TIME),
      LEVEL,
      1
    );

    expect(breakdown.finalScore).toBeGreaterThan(0);
    expect(breakdown.accuracy).toBe(0);
  });
});

describe('calculateCircuitBuilderBreakdown - bounds', () => {
  it('keeps the speed bonus inside its band across the whole legal time range', () => {
    for (const time of [1, 10, 60, 90, 180, 600, 1800, CB_MAX_COMPLETION_TIME]) {
      for (const difficulty of [1, 2, 3, 4]) {
        const breakdown = calculator.calculateCircuitBuilderBreakdown(
          metrics(3, 0, time),
          LEVEL,
          difficulty
        );
        expect(breakdown.speedBonus).toBeGreaterThanOrEqual(CB_SPEED_BONUS_MIN);
        expect(breakdown.speedBonus).toBeLessThanOrEqual(CB_SPEED_BONUS_MAX);
      }
    }
  });

  it('keeps the accuracy bonus in [0.5, 1.5] and accuracy in [0, 1]', () => {
    for (const componentCount of [1, 2, 4, 7, 20]) {
      for (const faultCount of [0, 1, 10, 20]) {
        const breakdown = calculator.calculateCircuitBuilderBreakdown(
          metrics(componentCount, faultCount, 90),
          LEVEL,
          1
        );
        expect(breakdown.accuracyBonus).toBeGreaterThanOrEqual(0.5);
        expect(breakdown.accuracyBonus).toBeLessThanOrEqual(1.5);
        expect(breakdown.accuracy).toBeGreaterThanOrEqual(0);
        expect(breakdown.accuracy).toBeLessThanOrEqual(1);
      }
    }
  });

  it('always returns an integer score inside [0, the cap]', () => {
    for (const componentCount of [1, 2, 5, 7, 64]) {
      for (const faultCount of [0, 3, 20]) {
        for (const time of [1, 90, CB_MAX_COMPLETION_TIME]) {
          for (const difficulty of [1, 2, 3, 4]) {
            const score = scoreOf(componentCount, faultCount, time, difficulty);
            expect(Number.isInteger(score)).toBe(true);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(CB_SCORE_CAP);
          }
        }
      }
    }
  });

  it('leaves the best legal submission below the cap, so the formula is never clipped', () => {
    expect(scoreOf(2, 0, 8, 4)).toBeLessThan(CB_SCORE_CAP);
  });

  it('scores the worst successful submission above zero', () => {
    expect(scoreOf(LEVEL_BUDGET, 20, CB_MAX_COMPLETION_TIME, 1)).toBe(765);
  });
});

describe('calculateCircuitBuilderBreakdown - degenerate level data', () => {
  it('produces a finite, non-negative score for a level with no component budget', () => {
    const emptyBudget: LevelDefinition = { ...LEVEL, availableComponents: {} };
    const breakdown = calculator.calculateCircuitBuilderBreakdown(
      metrics(3, 0, 90),
      emptyBudget,
      1
    );

    expect(Number.isNaN(breakdown.finalScore)).toBe(false);
    expect(Number.isFinite(breakdown.finalScore)).toBe(true);
    expect(breakdown.finalScore).toBeGreaterThanOrEqual(0);
    expect(breakdown.accuracy).toBe(0);
  });

  it('falls back to a default target time for an out-of-table difficulty', () => {
    const breakdown = calculator.calculateCircuitBuilderBreakdown(metrics(3, 0, 120), LEVEL, 9);

    expect(breakdown.speedBonus).toBeCloseTo(1.0, 6);
    expect(Number.isFinite(breakdown.finalScore)).toBe(true);
  });
});

describe('calculateCircuitBuilderBreakdown - contract', () => {
  it('returns exactly the existing ScoreBreakdown keys and no more', () => {
    const breakdown = calculator.calculateCircuitBuilderBreakdown(metrics(3, 0, 90), LEVEL, 1);

    expect(Object.keys(breakdown).sort()).toEqual(
      [
        'accuracy',
        'accuracyBonus',
        'baseScore',
        'completionTime',
        'difficultyMultiplier',
        'difficulty',
        'finalScore',
        'speedBonus',
      ].sort()
    );
  });

  it('leaves the generic score path untouched', () => {
    // Same inputs, the pre-existing method: proof the new method did not alter it.
    const generic = calculator.calculateScoreBreakdown(1, 60, 6, undefined, 'MEMORY_MATCH');

    expect(generic.baseScore).toBe(1000);
    expect(generic.difficulty).toBe('Easy');
    expect(generic.finalScore).toBeGreaterThan(0);
  });
});
