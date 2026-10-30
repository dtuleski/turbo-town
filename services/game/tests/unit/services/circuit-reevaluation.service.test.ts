/**
 * E2 - authoritative re-evaluation.
 *
 * Every submission here is first put through E1, so these tests exercise the same validated
 * shape the production path produces rather than a hand-built one that could drift from it.
 */

import { MAX_FAULT_COUNT_PER_LEVEL, evaluate, isEvaluationError } from '@memory-game/shared';
import { reevaluateCircuitSubmission } from '../../../src/services/circuit-reevaluation.service';
import {
  validateCircuitSubmission,
  type ValidatedCircuitSubmission,
} from '../../../src/utils/circuit-validation';
import {
  CB_ENV,
  CB_LEVEL_ID,
  SANDBOX_LEVEL_ID,
  asWirePayload,
  openCircuitLayout,
  outsideLevelGridLayout,
  overBudgetLayout,
  shortedHeadlightLayout,
  submissionPayload,
  ungrantedKindLayout,
  unprotectedHeadlightLayout,
} from '../circuit-fixtures';

const VALID_TIME = 60;

function validate(payload: Record<string, unknown>): ValidatedCircuitSubmission {
  const result = validateCircuitSubmission(payload, VALID_TIME);
  if (!result.ok) {
    throw new Error('fixture failed E1 validation');
  }
  return result.value;
}

describe('reevaluateCircuitSubmission - acceptance', () => {
  it('accepts a circuit that lights the rover headlight and verifies its metrics', () => {
    const outcome = reevaluateCircuitSubmission(validate(submissionPayload()), 1);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error('expected acceptance');
    }
    expect(outcome.level.id).toBe(CB_LEVEL_ID);
    expect(outcome.verifiedMetrics.componentCount).toBe(3);
    expect(outcome.verifiedMetrics.completionTime).toBe(VALID_TIME);
    expect(outcome.verifiedMetrics.faultCount).toBe(0);
    expect(outcome.verifiedMetrics.unresolvedFaultCount).toBe(0);
  });

  it('is deterministic: the same submission yields the same verified metrics', () => {
    const first = reevaluateCircuitSubmission(validate(submissionPayload()), 1);
    const second = reevaluateCircuitSubmission(validate(submissionPayload()), 1);

    expect(first).toEqual(second);
  });
});

describe('reevaluateCircuitSubmission - level resolution', () => {
  it('rejects an unknown level id', () => {
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ levelId: 'cb-99-nonexistent' })),
      1
    );

    expect(outcome).toEqual({ ok: false, reason: 'UNKNOWN_LEVEL' });
  });

  it('rejects a level whose difficulty does not match the paid-for session', () => {
    const outcome = reevaluateCircuitSubmission(validate(submissionPayload()), 4);

    expect(outcome).toEqual({ ok: false, reason: 'DIFFICULTY_MISMATCH' });
  });

  it('never satisfies the sandbox, which has no objective (FR-CB-31)', () => {
    // The sandbox is difficulty 4, so it clears the difficulty gate and is refused by the
    // success predicate instead - no special case needed in this module.
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ levelId: SANDBOX_LEVEL_ID })),
      4
    );

    expect(outcome).toEqual({ ok: false, reason: 'OBJECTIVE_UNMET' });
  });
});

describe('reevaluateCircuitSubmission - objective enforcement', () => {
  it('rejects an open circuit that does not light the headlight', () => {
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ layout: asWirePayload(openCircuitLayout()) })),
      1
    );

    expect(outcome).toEqual({ ok: false, reason: 'OBJECTIVE_UNMET' });
  });

  it('rejects a shorted circuit even though the headlight would otherwise be lit', () => {
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ layout: asWirePayload(shortedHeadlightLayout()) })),
      1
    );

    expect(outcome).toEqual({ ok: false, reason: 'OBJECTIVE_UNMET' });
  });
});

describe('reevaluateCircuitSubmission - level constraint enforcement (FR-CB-27)', () => {
  it('rejects more of a kind than the level grants', () => {
    // cb-01-closed-circuit grants one battery; this layout carries two.
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ layout: asWirePayload(overBudgetLayout()) })),
      1
    );

    expect(outcome).toEqual({ ok: false, reason: 'LEVEL_BUDGET_EXCEEDED' });
  });

  it('rejects a kind the level does not grant at all', () => {
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ layout: asWirePayload(ungrantedKindLayout()) })),
      1
    );

    expect(outcome).toEqual({ ok: false, reason: 'LEVEL_BUDGET_EXCEEDED' });
  });

  it('rejects a coordinate outside the level grid even when E1 accepted it', () => {
    // Column 10 is legal on the submitted 24 x 16 canvas and outside cb-01's 8 x 6 one.
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ layout: asWirePayload(outsideLevelGridLayout()) })),
      1
    );

    expect(outcome).toEqual({ ok: false, reason: 'OUTSIDE_LEVEL_GRID' });
  });

  it('still accepts a layout that sits exactly inside the level budget and grid', () => {
    const outcome = reevaluateCircuitSubmission(validate(submissionPayload()), 1);

    expect(outcome.ok).toBe(true);
  });
});

describe('reevaluateCircuitSubmission - engine-observed faults (FR-CB-24, SECURITY-11)', () => {
  it('counts the faults the engine finds in the submitted final layout', () => {
    // The unprotected LED is overdrawn, so the engine raises one OVERCURRENT fault.
    const outcome = reevaluateCircuitSubmission(
      validate(
        submissionPayload({ layout: asWirePayload(unprotectedHeadlightLayout()), faultCount: 0 })
      ),
      1
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error('expected acceptance');
    }
    expect(outcome.verifiedMetrics.componentCount).toBe(2);
    // The client claimed none; the engine says otherwise and the engine is authoritative.
    expect(outcome.verifiedMetrics.faultCount).toBe(0);
    expect(outcome.verifiedMetrics.unresolvedFaultCount).toBe(1);
  });

  it('raises exactly one OVERCURRENT on the unprotected LED, the fault the count stands for', () => {
    // The count alone would stay 1 if the engine reclassified the fault or merged two codes
    // into one entry, leaving the design documents claiming something no longer true. The
    // identity is asserted straight off the engine, which is where E2 reads the count.
    const result = evaluate(unprotectedHeadlightLayout(), {}, CB_ENV);
    if (isEvaluationError(result)) {
      throw new Error('fixture failed engine evaluation');
    }

    expect(result.faults.map((fault) => fault.code)).toEqual(['OVERCURRENT']);
    expect(result.faults[0].elementIds).toContain('led');
  });

  it('accepts the unprotected solve rather than failing it, so a fault still teaches (CB-3.8)', () => {
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ layout: asWirePayload(unprotectedHeadlightLayout()) })),
      1
    );

    expect(outcome.ok).toBe(true);
  });

  it('reports no unresolved fault for the canonical protected solve', () => {
    const outcome = reevaluateCircuitSubmission(validate(submissionPayload()), 1);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error('expected acceptance');
    }
    expect(outcome.verifiedMetrics.unresolvedFaultCount).toBe(0);
  });
});

describe('reevaluateCircuitSubmission - engine errors', () => {
  it('rejects a structurally invalid submission without leaking engine detail', () => {
    // A switch state naming no switch element is structurally invalid to the engine but
    // passes E1, which has no view of which elements exist.
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ switches: { 'no-such-switch': 'closed' } })),
      1
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      throw new Error('expected rejection');
    }
    expect(outcome.reason).toBe('EVALUATION_FAILED');
    expect(outcome.errorCode).toBe('STRUCTURAL_INVALID');
    // The internal shape carries nothing beyond the reason and the error code enum.
    expect(Object.keys(outcome).sort()).toEqual(['errorCode', 'ok', 'reason']);
  });
});

describe('reevaluateCircuitSubmission - fault count clamping', () => {
  it(`clamps an over-reported fault count to ${MAX_FAULT_COUNT_PER_LEVEL}`, () => {
    const outcome = reevaluateCircuitSubmission(
      validate(submissionPayload({ faultCount: 500 })),
      1
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error('expected acceptance');
    }
    expect(outcome.verifiedMetrics.faultCount).toBe(MAX_FAULT_COUNT_PER_LEVEL);
    // The clamp bounds the historical signal only; the verified one is reported as found.
    expect(outcome.verifiedMetrics.unresolvedFaultCount).toBe(0);
  });

  it('passes a plausible fault count through unchanged', () => {
    const outcome = reevaluateCircuitSubmission(validate(submissionPayload({ faultCount: 7 })), 1);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error('expected acceptance');
    }
    expect(outcome.verifiedMetrics.faultCount).toBe(7);
  });

  it('rejects a malformed fault count that bypassed E1', () => {
    const bypassed = {
      ...validate(submissionPayload()),
      faultCount: -3,
    };

    expect(reevaluateCircuitSubmission(bypassed, 1)).toEqual({
      ok: false,
      reason: 'MALFORMED_FAULT_COUNT',
    });
  });
});
