/**
 * Success condition predicates (component B2).
 *
 * The browser and the Game Service call this identical function, which is why it lives in
 * `packages/shared`: there is no second implementation that could diverge and let a layout
 * pass locally but fail server-side, or the reverse.
 *
 * Satisfies FR-CB-22 and FR-CB-30.
 */

import { evaluateRoleActivation, getMachine } from './machines';
import type {
  CircuitResult,
  LevelDefinition,
  SuccessClause,
  SuccessOutcome,
  SuccessPredicate,
  TargetMachine,
} from './types';

/**
 * Conjunction of several clauses. An empty list yields a predicate that returns `true`: the
 * conjunction of no conditions is vacuously satisfied. Callers that need "no objective" must
 * say so explicitly - the sandbox does, through {@link SUCCESS_CONDITIONS}.
 */
export function composePredicates(predicates: readonly SuccessPredicate[]): SuccessPredicate {
  return (result, machine) => predicates.every((predicate) => predicate(result, machine));
}

function roleActive(roleId: string): SuccessPredicate {
  return (result, machine) => evaluateRoleActivation(machine, result)[roleId] === true;
}

/**
 * A short circuit or an unsolvable circuit blocks success regardless of what else is lit.
 *
 * FR-CB-19 keeps the attempt alive after a short, so this clause fails the objective without
 * failing the level: the player resets the fuse, fixes the wiring, and carries on.
 */
const noBlockingFault: SuccessClause = {
  clauseId: 'noBlockingFault',
  predicate: (result) =>
    !result.faults.some(
      (fault) => fault.code === 'SHORT_CIRCUIT' || fault.code === 'SINGULAR_SYSTEM'
    ),
};

export const SUCCESS_CONDITIONS: Readonly<Record<string, readonly SuccessClause[]>> = Object.freeze({
  'rover-headlight-on': Object.freeze([
    noBlockingFault,
    { clauseId: 'headlightOn', predicate: roleActive('headlight') },
  ]),
  'rover-fully-powered': Object.freeze([
    noBlockingFault,
    { clauseId: 'driveMotorTurning', predicate: roleActive('driveMotor') },
    { clauseId: 'headlightOn', predicate: roleActive('headlight') },
    { clauseId: 'buzzerSounding', predicate: roleActive('buzzerAlert') },
  ]),
  none: Object.freeze([{ clauseId: 'sandboxHasNoObjective', predicate: (): boolean => false }]),
});

function clausesFor(successConditionId: string): readonly SuccessClause[] | undefined {
  return Object.prototype.hasOwnProperty.call(SUCCESS_CONDITIONS, successConditionId)
    ? SUCCESS_CONDITIONS[successConditionId]
    : undefined;
}

/**
 * Whether a circuit result satisfies a level's objective, naming every clause it failed.
 *
 * An unknown machine or an unknown condition id fails closed with a single diagnostic clause
 * rather than passing or throwing, so a content error can never award a score.
 */
export function evaluateSuccess(level: LevelDefinition, result: CircuitResult): SuccessOutcome {
  const machine: TargetMachine | undefined = getMachine(level.targetMachineId);
  if (machine === undefined) {
    return { satisfied: false, unmetClauses: Object.freeze(['unknownTargetMachine']) };
  }
  const clauses = clausesFor(level.successConditionId);
  if (clauses === undefined) {
    return { satisfied: false, unmetClauses: Object.freeze(['unknownSuccessCondition']) };
  }

  const unmetClauses: string[] = [];
  for (const clause of clauses) {
    if (!clause.predicate(result, machine)) {
      unmetClauses.push(clause.clauseId);
    }
  }
  return { satisfied: unmetClauses.length === 0, unmetClauses: Object.freeze(unmetClauses) };
}

/** Convenience re-expression of a condition as a single predicate. */
export function predicateFor(successConditionId: string): SuccessPredicate {
  const clauses = clausesFor(successConditionId);
  if (clauses === undefined) {
    return () => false;
  }
  return composePredicates(clauses.map((clause) => clause.predicate));
}
