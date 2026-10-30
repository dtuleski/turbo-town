/**
 * E1 - Circuit Builder layout validator.
 *
 * Bounded validation of a submitted `circuitSubmission` payload **before** any processing:
 * before the engine runs, before the repository is touched, before an event is published
 * (SECURITY-05).
 *
 * Every numeric bound is imported from the engine's exported constants. None is restated
 * here, so there is a single source of truth that the browser and the server share.
 *
 * `evaluate` already runs its own structural validation, so this layer is deliberately not a
 * second copy of it. It exists for the four things the engine cannot cover:
 *
 *   1. SECURITY-05 wants rejection before any processing - a huge element array must never
 *      reach the solver.
 *   2. `levelId`, `completionTime`, `faultCount`, and total payload size are invisible to the
 *      engine.
 *   3. `EvaluationError.issues[].detail` is developer-facing text that must never reach a
 *      player, so this layer returns a result with no detail at all.
 *   4. Deep structural semantics - duplicate ids, unresolved terminal references,
 *      self-connections - stay in the engine, where they already live.
 *
 * This module never throws: it returns a discriminated result. `safeParse` is used
 * throughout, never `parse`.
 */

import { z } from 'zod';
import {
  ELEMENT_KINDS,
  MAX_CONNECTION_COUNT,
  MAX_ELEMENT_COUNT,
  MAX_GRID_COLS,
  MAX_GRID_ROWS,
  MAX_ID_LENGTH,
  MAX_LIGHT_LEVEL,
  MAX_RESISTANCE,
  MAX_SOURCE_VOLTAGE,
  MIN_GRID_COLS,
  MIN_GRID_ROWS,
  MIN_LIGHT_LEVEL,
  MIN_RESISTANCE,
  MIN_SOURCE_VOLTAGE,
  VALID_ROTATIONS,
  ELEMENT_SPECS,
} from '@memory-game/shared';
import type { CircuitLayout, ElementKind, Environment, SwitchStates } from '@memory-game/shared';
import { CB_MAX_COMPLETION_TIME, MAX_CIRCUIT_SUBMISSION_CHARS } from './circuit-builder';

/** A submission that has passed every bound in this module. */
export interface ValidatedCircuitSubmission {
  levelId: string;
  layout: CircuitLayout;
  switches: SwitchStates;
  environment: Environment;
  /** Client-reported historical fault count. Non-negative safe integer; clamped later by E2. */
  faultCount: number;
  /** Server-validated completion time in seconds. */
  completionTime: number;
}

/**
 * Deliberately carries no reason. Every caller renders the same generic message, so there is
 * nothing here for a probing client to learn (SECURITY-09, SECURITY-15).
 */
export type CircuitValidationResult =
  | { ok: true; value: ValidatedCircuitSubmission }
  | { ok: false };

const REJECTED: CircuitValidationResult = { ok: false };

/** Switch state count ceiling, derived: a layout can hold at most this many switches. */
const MAX_SWITCH_ENTRIES = MAX_ELEMENT_COUNT;

const idSchema = z.string().min(1).max(MAX_ID_LENGTH);

const elementKindSchema = z.custom<ElementKind>(
  (value) => typeof value === 'string' && (ELEMENT_KINDS as readonly string[]).includes(value)
);

const rotationSchema = z.number().refine((value) => VALID_ROTATIONS.includes(value));

const positionSchema = z
  .object({
    col: z
      .number()
      .int()
      .nonnegative()
      .max(MAX_GRID_COLS - 1),
    row: z
      .number()
      .int()
      .nonnegative()
      .max(MAX_GRID_ROWS - 1),
    rotation: rotationSchema,
  })
  .strict();

/** Every param must be a finite number; kind-specific ranges are checked below. */
const paramsSchema = z.record(idSchema, z.number().finite());

const elementSchema = z
  .object({
    id: idSchema,
    kind: elementKindSchema,
    terminals: z.tuple([idSchema, idSchema]),
    position: positionSchema,
    params: paramsSchema.optional(),
  })
  .strict()
  .superRefine((element, ctx) => {
    const params = element.params;
    if (params === undefined) {
      return;
    }
    if (element.kind === 'resistor') {
      const resistance = params.resistance;
      if (
        resistance !== undefined &&
        (resistance < MIN_RESISTANCE || resistance > MAX_RESISTANCE)
      ) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'out of range' });
      }
    }
    if (ELEMENT_SPECS[element.kind].isSource) {
      const internal = params.internalResistance;
      if (internal !== undefined && (internal < 0 || internal > MAX_RESISTANCE)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'out of range' });
      }
    }
  });

/**
 * `.strict()` is what satisfies "reject unknown connection kinds" (FR-CB-26, CB-4.5). The
 * engine's `Connection` type has no `kind` field, so there is no connection-kind enum to
 * validate against; a connection carrying any extra discriminator is rejected as an
 * unrecognized key instead. Recorded as an interpretation in functional-design.md.
 */
const connectionSchema = z
  .object({
    id: idSchema,
    from: idSchema,
    to: idSchema,
  })
  .strict();

const gridSizeSchema = z
  .object({
    cols: z.number().int().min(MIN_GRID_COLS).max(MAX_GRID_COLS),
    rows: z.number().int().min(MIN_GRID_ROWS).max(MAX_GRID_ROWS),
  })
  .strict();

const layoutSchema = z
  .object({
    /** A layout with no element cannot satisfy any objective, hence the lower bound of 1. */
    elements: z.array(elementSchema).min(1).max(MAX_ELEMENT_COUNT),
    connections: z.array(connectionSchema).max(MAX_CONNECTION_COUNT),
    gridSize: gridSizeSchema,
  })
  .strict()
  .superRefine((layout, ctx) => {
    // Coordinates are bounded against the SUBMITTED grid, not only against the engine maxima,
    // which is the same rule the engine's `isInsideGrid` applies.
    for (const element of layout.elements) {
      if (
        element.position.col >= layout.gridSize.cols ||
        element.position.row >= layout.gridSize.rows
      ) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'outside grid' });
        return;
      }
    }
  });

const switchesSchema = z
  .record(idSchema, z.enum(['open', 'closed']))
  .refine((states) => Object.keys(states).length <= MAX_SWITCH_ENTRIES);

const environmentSchema = z
  .object({
    sourceVoltage: z.number().finite().min(MIN_SOURCE_VOLTAGE).max(MAX_SOURCE_VOLTAGE),
    lightLevel: z.number().finite().min(MIN_LIGHT_LEVEL).max(MAX_LIGHT_LEVEL),
  })
  .strict();

const submissionSchema = z
  .object({
    levelId: idSchema,
    layout: layoutSchema,
    switches: switchesSchema,
    environment: environmentSchema,
    /**
     * `.safe()` keeps the value inside the safe-integer range, so an absurd magnitude is
     * rejected rather than silently coerced. U2's recommendation: reject a malformed count
     * instead of coercing it; clamp only a merely large one (done by E2).
     */
    faultCount: z.number().int().nonnegative().safe(),
  })
  .strict();

const completionTimeSchema = z.number().int().min(1).max(CB_MAX_COMPLETION_TIME);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** O(1) array-length gate, run before anything walks the arrays. */
function withinArrayCeilings(raw: Record<string, unknown>): boolean {
  const layout = raw.layout;
  if (!isPlainObject(layout)) {
    return false;
  }
  const { elements, connections } = layout;
  if (!Array.isArray(elements) || !Array.isArray(connections)) {
    return false;
  }
  return (
    elements.length >= 1 &&
    elements.length <= MAX_ELEMENT_COUNT &&
    connections.length <= MAX_CONNECTION_COUNT
  );
}

/** A circular or otherwise unserializable payload is rejected rather than allowed to throw. */
function withinSizeCeiling(raw: unknown): boolean {
  try {
    const serialized = JSON.stringify(raw);
    return typeof serialized === 'string' && serialized.length <= MAX_CIRCUIT_SUBMISSION_CHARS;
  } catch {
    return false;
  }
}

/**
 * Validate a `circuitSubmission` payload and the completion time that accompanies it.
 *
 * Checks run cheapest first, so a caller cannot dictate how much work the server does:
 * object shape, then the O(1) array-length ceilings, then the serialized size, and only then
 * the full strict parse.
 */
export function validateCircuitSubmission(
  raw: unknown,
  completionTime: unknown
): CircuitValidationResult {
  if (!isPlainObject(raw)) {
    return REJECTED;
  }
  if (!withinArrayCeilings(raw)) {
    return REJECTED;
  }
  if (!withinSizeCeiling(raw)) {
    return REJECTED;
  }

  const time = completionTimeSchema.safeParse(completionTime);
  if (!time.success) {
    return REJECTED;
  }

  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) {
    return REJECTED;
  }

  return {
    ok: true,
    value: {
      levelId: parsed.data.levelId,
      layout: parsed.data.layout as CircuitLayout,
      switches: parsed.data.switches as SwitchStates,
      environment: parsed.data.environment,
      faultCount: parsed.data.faultCount,
      completionTime: time.data,
    },
  };
}
