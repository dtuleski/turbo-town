/**
 * E2 - Circuit Builder re-evaluation orchestrator.
 *
 * The browser's claimed result is never trusted. The server resolves the level, re-runs the
 * shared `evaluate` on the validated layout, applies the shared success predicate for that
 * level, and derives its metrics from the engine's own result (FR-CB-21, FR-CB-22,
 * SECURITY-11).
 *
 * Pure exported functions rather than a class: nothing to wire into a constructor, so the
 * existing `GameService` dependency list and its test fixtures are untouched.
 *
 * Engine imports sit at module level on purpose. `evaluate` is pure and stateless - no
 * module-level mutable state, no clock, no randomness - so a warm Lambda container can reuse
 * the parsed modules across invocations without one player's circuit leaking into another's.
 */

import {
  clampFaultCount,
  evaluate,
  evaluateSuccess,
  getLevel,
  isEvaluationError,
} from '@memory-game/shared';
import type {
  CircuitElement,
  CircuitLayout,
  ElementKind,
  EvaluationErrorCode,
  LevelDefinition,
} from '@memory-game/shared';
import type { ValidatedCircuitSubmission } from '../utils/circuit-validation';

/** Internal discriminator, for server-side logging only. It is never returned to a client. */
export type CircuitRejectionReason =
  | 'UNKNOWN_LEVEL'
  | 'DIFFICULTY_MISMATCH'
  | 'LEVEL_BUDGET_EXCEEDED'
  | 'OUTSIDE_LEVEL_GRID'
  | 'EVALUATION_FAILED'
  | 'OBJECTIVE_UNMET'
  | 'MALFORMED_FAULT_COUNT';

/** Metrics the scorer is allowed to consume. Every field is server-derived. */
export interface VerifiedCircuitMetrics {
  /** Read off the engine result, not off the submitted array. */
  componentCount: number;
  completionTime: number;
  /**
   * HISTORICAL fault count, as reported by the client and clamped per level. Faults that
   * occurred and were cleared during play cannot be reconstructed from a final layout, so
   * this signal stays residual trust. See the residual-trust analysis in
   * functional-design.md.
   */
  faultCount: number;
  /**
   * Faults the ENGINE still finds in the submitted final layout, counted off
   * `CircuitResult.faults`. Fully server-verified, and the signal a client cannot suppress by
   * reporting `faultCount: 0`.
   *
   * On an accepted submission this can only be `OVERCURRENT` or `REVERSED_POLARITY`: the
   * `noBlockingFault` success clause has already refused anything carrying `SHORT_CIRCUIT` or
   * `SINGULAR_SYSTEM`. Counting every code rather than filtering keeps that coupling out of
   * this module - if the engine's blocking set ever changes, the count follows it.
   */
  unresolvedFaultCount: number;
}

export type CircuitReevaluationOutcome =
  | { ok: true; level: LevelDefinition; verifiedMetrics: VerifiedCircuitMetrics }
  | { ok: false; reason: CircuitRejectionReason; errorCode?: EvaluationErrorCode };

/**
 * Re-evaluate a validated submission against the level it claims.
 *
 * `difficulty` is the server-stored difficulty of the session, never a client value.
 * Requiring `level.difficulty === difficulty` closes a multiplier exploit: without it a
 * player could start a Super Hard session (x2.5) and submit the trivial difficulty-1 level.
 *
 * Nothing from `EvaluationError.issues` is ever copied into the returned value - at most the
 * `errorCode` enum travels, and only for logging.
 */
export function reevaluateCircuitSubmission(
  submission: ValidatedCircuitSubmission,
  difficulty: number
): CircuitReevaluationOutcome {
  const level = getLevel(submission.levelId);
  if (level === undefined) {
    return { ok: false, reason: 'UNKNOWN_LEVEL' };
  }

  if (level.difficulty !== difficulty) {
    return { ok: false, reason: 'DIFFICULTY_MISMATCH' };
  }

  // The rest of the level definition, checked before the solver runs: a layout must stay
  // inside the component budget and the canvas the level actually grants.
  const violation = levelConstraintViolation(submission.layout, level);
  if (violation !== undefined) {
    return { ok: false, reason: violation };
  }

  // `evaluate` is documented never to throw, returning an INTERNAL_ERROR outcome instead.
  // Wrapped anyway: a failure here must fail closed, not escape as an unexpected exception.
  let outcome;
  try {
    outcome = evaluate(submission.layout, submission.switches, submission.environment);
  } catch {
    return { ok: false, reason: 'EVALUATION_FAILED', errorCode: 'INTERNAL_ERROR' };
  }

  if (isEvaluationError(outcome)) {
    return { ok: false, reason: 'EVALUATION_FAILED', errorCode: outcome.errorCode };
  }

  // The shared success predicate for the claimed level. A layout that does not satisfy the
  // objective earns no score. The sandbox's success condition can never be satisfied, so a
  // sandbox submission is always rejected here with no special case (FR-CB-31).
  const success = evaluateSuccess(level, outcome);
  if (!success.satisfied) {
    return { ok: false, reason: 'OBJECTIVE_UNMET' };
  }

  const clamp = clampFaultCount(submission.faultCount, level);
  if (clamp.wasMalformed) {
    // Unreachable after E1, which already requires a non-negative safe integer. Kept as the
    // second half of a belt-and-braces pair rather than assumed away.
    return { ok: false, reason: 'MALFORMED_FAULT_COUNT' };
  }

  return {
    ok: true,
    level,
    verifiedMetrics: {
      componentCount: outcome.elements.length,
      completionTime: submission.completionTime,
      faultCount: clamp.value,
      unresolvedFaultCount: outcome.faults.length,
    },
  };
}

/** How many elements of each kind a layout holds. */
function countByKind(elements: readonly CircuitElement[]): Map<ElementKind, number> {
  const counts = new Map<ElementKind, number>();
  for (const element of elements) {
    counts.set(element.kind, (counts.get(element.kind) ?? 0) + 1);
  }
  return counts;
}

/**
 * The level constraints E2 can check from the level definition alone, or `undefined` when the
 * layout respects all of them.
 *
 * The budget data is read from `level.availableComponents`, never restated here, so a level
 * authored in `packages/shared` is the single source of truth. A kind the level does not list
 * has an allowance of 0, which is what rejects a component the tray never offered.
 *
 * `level.prePlaced` is added to the allowance because a pre-placed element is given by the
 * level rather than drawn from the player's tray budget, and it arrives back in the submitted
 * layout. Both authored levels pre-place nothing today; this keeps a future level from being
 * rejected for the components it supplied itself.
 *
 * Coordinates are bounded against the LEVEL's grid, which E1 cannot do because it has no view
 * of the level. Bounding the coordinates rather than demanding `layout.gridSize` equal
 * `level.gridSize` leaves a client free to render a smaller canvas, while still making the
 * level's grid the real ceiling on where a component may sit.
 */
function levelConstraintViolation(
  layout: CircuitLayout,
  level: LevelDefinition
): CircuitRejectionReason | undefined {
  const prePlaced = countByKind(level.prePlaced);
  for (const [kind, count] of countByKind(layout.elements)) {
    const allowance = (level.availableComponents[kind] ?? 0) + (prePlaced.get(kind) ?? 0);
    if (count > allowance) {
      return 'LEVEL_BUDGET_EXCEEDED';
    }
  }

  for (const element of layout.elements) {
    if (
      element.position.col >= level.gridSize.cols ||
      element.position.row >= level.gridSize.rows
    ) {
      return 'OUTSIDE_LEVEL_GRID';
    }
  }

  return undefined;
}
