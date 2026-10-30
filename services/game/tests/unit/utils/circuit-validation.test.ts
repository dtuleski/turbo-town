/**
 * E1 - bounded layout validation.
 *
 * Assertions are only ever on `ok`. There is deliberately no reason code to assert on: every
 * rejection carries the identical generic message by design, so a probing client gets no
 * oracle (SECURITY-09).
 */

import {
  MAX_CONNECTION_COUNT,
  MAX_ELEMENT_COUNT,
  MAX_ID_LENGTH,
  MAX_LIGHT_LEVEL,
  MAX_RESISTANCE,
  MAX_SOURCE_VOLTAGE,
  MIN_LIGHT_LEVEL,
  MIN_RESISTANCE,
  MIN_SOURCE_VOLTAGE,
} from '@memory-game/shared';
import { validateCircuitSubmission } from '../../../src/utils/circuit-validation';
import { CB_MAX_COMPLETION_TIME } from '../../../src/utils/circuit-builder';
import { asWirePayload, headlightLayout, submissionPayload } from '../circuit-fixtures';

const VALID_TIME = 60;

function accepts(payload: unknown, completionTime: unknown = VALID_TIME): boolean {
  return validateCircuitSubmission(payload, completionTime).ok;
}

describe('validateCircuitSubmission - acceptance', () => {
  it('accepts a well-formed submission and returns the validated values', () => {
    const result = validateCircuitSubmission(submissionPayload(), VALID_TIME);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected acceptance');
    }
    expect(result.value.levelId).toBe('cb-01-closed-circuit');
    expect(result.value.layout.elements).toHaveLength(3);
    expect(result.value.completionTime).toBe(VALID_TIME);
    expect(result.value.faultCount).toBe(0);
  });

  it('accepts the engine bound values exactly at their edges', () => {
    expect(
      accepts(
        submissionPayload({
          environment: { sourceVoltage: MIN_SOURCE_VOLTAGE, lightLevel: MIN_LIGHT_LEVEL },
        })
      )
    ).toBe(true);
    expect(
      accepts(
        submissionPayload({
          environment: { sourceVoltage: MAX_SOURCE_VOLTAGE, lightLevel: MAX_LIGHT_LEVEL },
        })
      )
    ).toBe(true);
    expect(accepts(submissionPayload(), 1)).toBe(true);
    expect(accepts(submissionPayload(), CB_MAX_COMPLETION_TIME)).toBe(true);
  });
});

describe('validateCircuitSubmission - payload shape', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an array', []],
    ['a string', 'circuit'],
    ['a number', 7],
  ])('rejects %s', (_label, payload) => {
    expect(accepts(payload)).toBe(false);
  });

  it('rejects an unknown top-level key', () => {
    expect(accepts(submissionPayload({ score: 8000 }))).toBe(false);
  });

  it('rejects a client-supplied score or breakdown rather than honouring it', () => {
    expect(accepts(submissionPayload({ scoreBreakdown: { finalScore: 8000 } }))).toBe(false);
  });

  it('rejects a missing layout', () => {
    const payload = submissionPayload();
    delete payload.layout;
    expect(accepts(payload)).toBe(false);
  });
});

describe('validateCircuitSubmission - count ceilings', () => {
  it(`rejects more than ${MAX_ELEMENT_COUNT} elements`, () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements = Array.from({ length: MAX_ELEMENT_COUNT + 1 }, (_unused, index) => ({
      id: `e${index}`,
      kind: 'wire',
      terminals: [`e${index}:0`, `e${index}:1`],
      position: { col: 0, row: 0, rotation: 0 },
    }));
    layout.connections = [];
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it(`rejects more than ${MAX_CONNECTION_COUNT} connections`, () => {
    const layout = asWirePayload(headlightLayout());
    layout.connections = Array.from({ length: MAX_CONNECTION_COUNT + 1 }, (_unused, index) => ({
      id: `c${index}`,
      from: 'bat:0',
      to: 'r:0',
    }));
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects an empty element array', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements = [];
    layout.connections = [];
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects more than one switch state per possible element', () => {
    const switches: Record<string, string> = {};
    for (let index = 0; index <= MAX_ELEMENT_COUNT; index += 1) {
      switches[`sw${index}`] = 'closed';
    }
    expect(accepts(submissionPayload({ switches }))).toBe(false);
  });
});

describe('validateCircuitSubmission - grid and position', () => {
  it('rejects a coordinate outside the submitted grid', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].position.col = layout.gridSize.cols;
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects a row outside the submitted grid', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].position.row = layout.gridSize.rows;
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects a negative coordinate', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].position.col = -1;
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects a grid size outside the engine bounds', () => {
    const tooWide = asWirePayload(headlightLayout());
    tooWide.gridSize = { cols: 25, rows: 6 };
    expect(accepts(submissionPayload({ layout: tooWide }))).toBe(false);

    const tooSmall = asWirePayload(headlightLayout());
    tooSmall.gridSize = { cols: 1, rows: 6 };
    expect(accepts(submissionPayload({ layout: tooSmall }))).toBe(false);
  });

  it('rejects a non-integer grid size', () => {
    const layout = asWirePayload(headlightLayout());
    layout.gridSize = { cols: 8.5, rows: 6 };
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects an invalid rotation', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].position.rotation = 45;
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });
});

describe('validateCircuitSubmission - elements and connections', () => {
  it('rejects an unknown element kind', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].kind = 'plasma';
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects a missing element kind', () => {
    const layout = asWirePayload(headlightLayout());
    delete layout.elements[0].kind;
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  // FR-CB-26 / CB-4.5: the engine's Connection type has no `kind` field, so "unknown
  // connection kind" is enforced as an unrecognized key on a strict schema.
  it('rejects a connection carrying an unknown kind discriminator', () => {
    const layout = asWirePayload(headlightLayout());
    layout.connections[0].kind = 'teleport';
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects an unknown key on an element', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].invisible = true;
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it(`rejects an id longer than ${MAX_ID_LENGTH} characters`, () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].id = 'x'.repeat(MAX_ID_LENGTH + 1);
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects an empty id', () => {
    const layout = asWirePayload(headlightLayout());
    layout.connections[0].id = '';
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects terminals that are not a pair', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].terminals = ['bat:0'];
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects a non-numeric param', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[1].params = { resistance: 'lots' };
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects a resistor resistance outside the engine range', () => {
    const tooLow = asWirePayload(headlightLayout());
    tooLow.elements[1].params = { resistance: MIN_RESISTANCE - 0.5 };
    expect(accepts(submissionPayload({ layout: tooLow }))).toBe(false);

    const tooHigh = asWirePayload(headlightLayout());
    tooHigh.elements[1].params = { resistance: MAX_RESISTANCE + 1 };
    expect(accepts(submissionPayload({ layout: tooHigh }))).toBe(false);
  });

  it('rejects a negative source internal resistance', () => {
    const layout = asWirePayload(headlightLayout());
    layout.elements[0].params = { internalResistance: -1 };
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });
});

describe('validateCircuitSubmission - environment and switches', () => {
  it('rejects a source voltage below the engine minimum', () => {
    expect(accepts(submissionPayload({ environment: { sourceVoltage: 0, lightLevel: 1 } }))).toBe(
      false
    );
  });

  it('rejects a source voltage above the engine maximum', () => {
    expect(
      accepts(
        submissionPayload({
          environment: { sourceVoltage: MAX_SOURCE_VOLTAGE + 1, lightLevel: 1 },
        })
      )
    ).toBe(false);
  });

  it('rejects a light level outside [0, 1]', () => {
    expect(
      accepts(submissionPayload({ environment: { sourceVoltage: 9, lightLevel: -0.1 } }))
    ).toBe(false);
    expect(accepts(submissionPayload({ environment: { sourceVoltage: 9, lightLevel: 1.1 } }))).toBe(
      false
    );
  });

  it('rejects an unknown key on the environment', () => {
    expect(
      accepts(submissionPayload({ environment: { sourceVoltage: 9, lightLevel: 1, gravity: 0 } }))
    ).toBe(false);
  });

  it('rejects an invalid switch state', () => {
    expect(accepts(submissionPayload({ switches: { sw: 'melted' } }))).toBe(false);
  });
});

describe('validateCircuitSubmission - completion time', () => {
  it.each([
    ['negative', -1],
    ['zero', 0],
    ['non-integer', 42.5],
    ['above the ceiling', CB_MAX_COMPLETION_TIME + 1],
    ['not a number', '60'],
    ['missing', undefined],
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    // Called directly rather than through `accepts`, whose default parameter would otherwise
    // substitute a valid time for `undefined`.
  ])('rejects a %s completion time', (_label, time) => {
    expect(validateCircuitSubmission(submissionPayload(), time).ok).toBe(false);
  });
});

describe('validateCircuitSubmission - fault count', () => {
  it.each([
    ['negative', -1],
    ['non-integer', 1.5],
    ['beyond the safe integer range', Number.MAX_SAFE_INTEGER + 2],
    ['not a number', '3'],
    ['NaN', Number.NaN],
  ])('rejects a %s fault count', (_label, faultCount) => {
    expect(accepts(submissionPayload({ faultCount }))).toBe(false);
  });

  it('accepts a large but safe fault count, leaving the clamp to E2', () => {
    expect(accepts(submissionPayload({ faultCount: 500 }))).toBe(true);
  });
});

describe('validateCircuitSubmission - size ceiling', () => {
  it('rejects a payload over the serialized character ceiling', () => {
    const layout = asWirePayload(headlightLayout());
    const params: Record<string, number> = {};
    for (let index = 0; index < 1000; index += 1) {
      params[`p${index}`.padEnd(MAX_ID_LENGTH, 'x')] = index;
    }
    layout.elements[1].params = params;
    expect(accepts(submissionPayload({ layout }))).toBe(false);
  });

  it('rejects a circular payload rather than throwing', () => {
    const payload = submissionPayload();
    (payload.layout as Record<string, unknown>).loop = payload;

    expect(() => validateCircuitSubmission(payload, VALID_TIME)).not.toThrow();
    expect(accepts(payload)).toBe(false);
  });
});
