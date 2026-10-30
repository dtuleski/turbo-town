import { connectTerminals, createElement, createLayout, seriesChain, terminalOf } from './builders';
import { evaluate } from './evaluate';
import { getLevel } from './levels';
import { MARS_ROVER } from './machines';
import {
  SUCCESS_CONDITIONS,
  composePredicates,
  evaluateSuccess,
  predicateFor,
} from './success';
import type {
  CircuitLayout,
  CircuitResult,
  Environment,
  GridSize,
  LevelDefinition,
} from './types';
import { isCircuitResult } from './types';

const GRID: GridSize = { cols: 8, rows: 6 };
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

const LEVEL = getLevel('cb-01-closed-circuit') as LevelDefinition;

function resultOf(layout: CircuitLayout): CircuitResult {
  const outcome = evaluate(layout, {}, ENV);
  if (!isCircuitResult(outcome)) {
    throw new Error(`expected a result, got ${outcome.errorCode}`);
  }
  return outcome;
}

/** Battery, protective resistor, and the rover headlight in one loop. */
function headlightLayout(): CircuitLayout {
  const battery = createElement('battery', { id: 'bat', position: { col: 0, row: 0, rotation: 0 } });
  const resistor = createElement('resistor', {
    id: 'r',
    position: { col: 1, row: 0, rotation: 0 },
    params: { resistance: 470 },
  });
  const led = createElement('led', { id: 'led', position: { col: 2, row: 0, rotation: 0 } });
  return createLayout(
    [battery, resistor, led],
    [
      ...seriesChain([resistor, led]),
      connectTerminals(terminalOf(battery, 0), terminalOf(resistor, 0)),
      connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

/** The headlight circuit with a bare wire added straight across the battery. */
function shortedHeadlightLayout(): CircuitLayout {
  const base = headlightLayout();
  const wire = createElement('wire', { id: 'w', position: { col: 3, row: 1, rotation: 0 } });
  return createLayout(
    [...base.elements, wire],
    [
      ...base.connections,
      connectTerminals('bat:0', terminalOf(wire, 0)),
      connectTerminals(terminalOf(wire, 1), 'bat:1'),
    ],
    GRID
  );
}

describe('composePredicates', () => {
  it('requires every clause to hold', () => {
    const always = composePredicates([() => true, () => true]);
    const never = composePredicates([() => true, () => false]);
    const result = resultOf(headlightLayout());

    expect(always(result, MARS_ROVER)).toBe(true);
    expect(never(result, MARS_ROVER)).toBe(false);
  });

  it('is vacuously true for no clauses at all', () => {
    expect(composePredicates([])(resultOf(headlightLayout()), MARS_ROVER)).toBe(true);
  });
});

describe('evaluateSuccess', () => {
  it('accepts a circuit that lights the rover headlight', () => {
    expect(evaluateSuccess(LEVEL, resultOf(headlightLayout()))).toEqual({
      satisfied: true,
      unmetClauses: [],
    });
  });

  it('names the unmet clause when the headlight is dark', () => {
    const battery = createElement('battery', {
      id: 'bat',
      position: { col: 0, row: 0, rotation: 0 },
    });
    const led = createElement('led', { id: 'led', position: { col: 2, row: 0, rotation: 0 } });
    const disconnected = createLayout([battery, led], [], GRID);

    expect(evaluateSuccess(LEVEL, resultOf(disconnected))).toEqual({
      satisfied: false,
      unmetClauses: ['headlightOn'],
    });
  });

  it('fails a shorted circuit on the blocking-fault clause even though it is otherwise right', () => {
    const outcome = evaluateSuccess(LEVEL, resultOf(shortedHeadlightLayout()));

    expect(outcome.satisfied).toBe(false);
    expect(outcome.unmetClauses).toContain('noBlockingFault');
  });

  it('fails closed for an unknown target machine', () => {
    const broken: LevelDefinition = { ...LEVEL, targetMachineId: 'nope' };
    expect(evaluateSuccess(broken, resultOf(headlightLayout()))).toEqual({
      satisfied: false,
      unmetClauses: ['unknownTargetMachine'],
    });
  });

  it('fails closed for an unknown success condition', () => {
    const broken: LevelDefinition = { ...LEVEL, successConditionId: 'nope' };
    expect(evaluateSuccess(broken, resultOf(headlightLayout()))).toEqual({
      satisfied: false,
      unmetClauses: ['unknownSuccessCondition'],
    });
  });

  it('never satisfies the sandbox, which has no objective', () => {
    const sandbox = getLevel('sandbox') as LevelDefinition;
    expect(evaluateSuccess(sandbox, resultOf(headlightLayout()))).toEqual({
      satisfied: false,
      unmetClauses: ['sandboxHasNoObjective'],
    });
  });

  it('requires motor, headlight, and buzzer together for the fully powered rover', () => {
    const level: LevelDefinition = { ...LEVEL, successConditionId: 'rover-fully-powered' };
    const outcome = evaluateSuccess(level, resultOf(headlightLayout()));

    expect(outcome.satisfied).toBe(false);
    expect(outcome.unmetClauses).toEqual(['driveMotorTurning', 'buzzerSounding']);
  });

  it('returns the identical outcome for the identical result, in browser or server', () => {
    const result = resultOf(headlightLayout());
    expect(evaluateSuccess(LEVEL, result)).toEqual(evaluateSuccess(LEVEL, result));
  });
});

describe('SUCCESS_CONDITIONS', () => {
  it('guards every real objective with the blocking-fault clause', () => {
    for (const [id, clauses] of Object.entries(SUCCESS_CONDITIONS)) {
      if (id === 'none') {
        continue;
      }
      expect(clauses.map((clause) => clause.clauseId)).toContain('noBlockingFault');
    }
  });
});

describe('predicateFor', () => {
  it('collapses a condition into one predicate', () => {
    const result = resultOf(headlightLayout());
    expect(predicateFor('rover-headlight-on')(result, MARS_ROVER)).toBe(true);
    expect(predicateFor('rover-fully-powered')(result, MARS_ROVER)).toBe(false);
  });

  it('returns a predicate that always fails for an unknown condition', () => {
    expect(predicateFor('nope')(resultOf(headlightLayout()), MARS_ROVER)).toBe(false);
  });
});
