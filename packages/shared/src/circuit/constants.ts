/**
 * Circuit Builder engine - numeric bounds, element specifications, and tolerances.
 *
 * These are the three cross-cutting decisions unit U2 owns, exported as named constants so
 * E1 (backend layout validation) and D2 (browser memo sizing) consume them rather than
 * re-inventing them:
 *
 *   (a) numeric bounds: element and connection ceilings, voltage range, light level range
 *   (b) {@link SHORT_CIRCUIT_RESISTANCE_THRESHOLD}
 *   (c) {@link MAX_FAULT_COUNT_PER_LEVEL}, the recommended per-level clamp for the
 *       client-reported historical fault count
 *
 * Rationale for every value is recorded in
 * `aidlc-docs/construction/circuit-engine/nfr-requirements/nfr-requirements.md`.
 */

import type { ElementKind, ElementSpec } from './types';

// ---------------------------------------------------------------------------
// (a) Numeric bounds - NFR-CB-4, NFR-CB-19, FR-CB-26, SECURITY-05
// ---------------------------------------------------------------------------

/** Eight kinds at eight each. Guided levels use 12 or fewer; this is the sandbox ceiling. */
export const MAX_ELEMENT_COUNT = 64;

/**
 * 64 elements carry 128 terminals. Pairing every terminal exactly once needs only 64
 * connections, so 128 leaves headroom for star joins where one terminal feeds several others.
 */
export const MAX_CONNECTION_COUNT = 128;

/** 24 x 16 = 384 cells, six times the element ceiling, in a 3:2 ratio that suits both canvases. */
export const MAX_GRID_COLS = 24;
export const MAX_GRID_ROWS = 16;

/** A circuit needs at least two cells. */
export const MIN_GRID_COLS = 2;
export const MIN_GRID_ROWS = 2;

/** SECURITY-05 string length bound. A UUID plus a prefix fits. */
export const MAX_ID_LENGTH = 64;

/** AA cell to car battery: recognisable, all low-voltage, never teaching mains values (FR-CB-7). */
export const MIN_SOURCE_VOLTAGE = 1.5;
export const MAX_SOURCE_VOLTAGE = 12;

/** Granularity of the variable battery control. */
export const SOURCE_VOLTAGE_STEP = 0.5;

/** Normalised illumination fraction; solar output is a function of it. */
export const MIN_LIGHT_LEVEL = 0;
export const MAX_LIGHT_LEVEL = 1;

/**
 * The lower bound sits at the short-circuit threshold so a legal resistor can never register
 * as a short under the strict comparison in {@link SHORT_CIRCUIT_RESISTANCE_THRESHOLD}. The
 * upper bound keeps the conductance ratio at 1e4, far inside double precision.
 */
export const MIN_RESISTANCE = 1;
export const MAX_RESISTANCE = 10000;

/**
 * Derived, not guessed: at most `2 * MAX_ELEMENT_COUNT` distinct terminal nodes, plus one
 * internal node per source, plus one branch-current unknown per source:
 * `2 * 64 + 64 + 64 = 256`.
 */
export const MAX_MATRIX_DIMENSION = 256;

export const CIRCUIT_LIMITS = Object.freeze({
  maxElementCount: MAX_ELEMENT_COUNT,
  maxConnectionCount: MAX_CONNECTION_COUNT,
  maxGridCols: MAX_GRID_COLS,
  maxGridRows: MAX_GRID_ROWS,
  minGridCols: MIN_GRID_COLS,
  minGridRows: MIN_GRID_ROWS,
  maxIdLength: MAX_ID_LENGTH,
  minSourceVoltage: MIN_SOURCE_VOLTAGE,
  maxSourceVoltage: MAX_SOURCE_VOLTAGE,
  sourceVoltageStep: SOURCE_VOLTAGE_STEP,
  minLightLevel: MIN_LIGHT_LEVEL,
  maxLightLevel: MAX_LIGHT_LEVEL,
  minResistance: MIN_RESISTANCE,
  maxResistance: MAX_RESISTANCE,
  maxMatrixDimension: MAX_MATRIX_DIMENSION,
});

// ---------------------------------------------------------------------------
// (b) Short-circuit threshold - FR-CB-14
// ---------------------------------------------------------------------------

/**
 * Ohms. Compared with a strict `<` against the minimum-resistance source-to-source path,
 * excluding the source's own internal resistance so the threshold judges what the player
 * built rather than the model's internals.
 *
 * A wire or closed-switch-only path is 0 ohms and trips. The smallest legitimate load is the
 * LED at 30 ohms, thirty times above the threshold. The smallest legal resistor is
 * {@link MIN_RESISTANCE} = 1 ohm, which does not trip under the strict comparison. No value a
 * player can legally build lands strictly between 0 and 1, so there is no ambiguous zone.
 */
export const SHORT_CIRCUIT_RESISTANCE_THRESHOLD = 1.0;

// ---------------------------------------------------------------------------
// (c) Historical fault count clamp - FR-CB-24, E2 residual trust
// ---------------------------------------------------------------------------

/**
 * Default per-level ceiling for the client-reported fault count. Each short carries a score
 * penalty (FR-CB-24); beyond roughly twenty the penalty already floors the score, so a higher
 * ceiling changes nothing, while an absurd value could drive a score negative.
 *
 * A clamp bounds over-reporting only. Under-reporting remains unprovable in either direction
 * because faults are historical events that a final layout cannot reconstruct.
 */
export const MAX_FAULT_COUNT_PER_LEVEL = 20;

// ---------------------------------------------------------------------------
// Numeric tolerances
// ---------------------------------------------------------------------------

/** Below this magnitude a current is treated as zero. */
export const CURRENT_EPSILON = 1e-9;

/** Below this magnitude a voltage difference is treated as zero. */
export const VOLTAGE_EPSILON = 1e-9;

/** Scaled by the matrix infinity norm to decide near-singularity. See nfr-design.md. */
export const PIVOT_EPSILON = 1e-12;

// ---------------------------------------------------------------------------
// Intensity normalization curve - FR-CB-13
// ---------------------------------------------------------------------------

/** Perceptual exponent. Current is raised to `1 / INTENSITY_GAMMA`. */
export const INTENSITY_GAMMA = 2.2;

/** Floor so a barely-lit load is still visibly distinct from a dark one. */
export const MIN_VISIBLE_INTENSITY = 0.08;

/** Fraction of rated current below which a load reads as unpowered. */
export const ENERGIZE_THRESHOLD_RATIO = 0.05;

// ---------------------------------------------------------------------------
// Source behaviour
// ---------------------------------------------------------------------------

/** Open-circuit voltage of the solar panel at full illumination. */
export const SOLAR_MAX_VOLTAGE = 6;

/** Default resistance of a resistor placed without an explicit `params.resistance`. */
export const DEFAULT_RESISTOR_RESISTANCE = 470;

// ---------------------------------------------------------------------------
// Element electrical specifications
// ---------------------------------------------------------------------------

/**
 * Load resistances and rated currents are chosen so that, across the whole legal voltage
 * range, a single non-LED load alone on a battery never overloads:
 * `MAX_SOURCE_VOLTAGE / (resistance + batteryInternalResistance) < ratedCurrent`.
 * The LED deliberately violates that inequality - needing a series resistor is the lesson.
 */
export const ELEMENT_SPECS: Readonly<Record<ElementKind, ElementSpec>> = Object.freeze({
  battery: Object.freeze({
    internalResistance: 0.5,
    polarized: false,
    isSource: true,
    isLoad: false,
    isConductor: false,
  }),
  solar: Object.freeze({
    internalResistance: 2.0,
    polarized: false,
    isSource: true,
    isLoad: false,
    isConductor: false,
  }),
  wire: Object.freeze({
    resistance: 0,
    polarized: false,
    isSource: false,
    isLoad: false,
    isConductor: true,
  }),
  switch: Object.freeze({
    resistance: 0,
    polarized: false,
    isSource: false,
    isLoad: false,
    isConductor: true,
  }),
  resistor: Object.freeze({
    polarized: false,
    isSource: false,
    isLoad: true,
    isConductor: false,
  }),
  led: Object.freeze({
    resistance: 30,
    ratedCurrent: 0.02,
    polarized: true,
    isSource: false,
    isLoad: true,
    isConductor: false,
  }),
  motor: Object.freeze({
    resistance: 60,
    ratedCurrent: 0.22,
    polarized: false,
    isSource: false,
    isLoad: true,
    isConductor: false,
  }),
  buzzer: Object.freeze({
    resistance: 180,
    ratedCurrent: 0.08,
    polarized: false,
    isSource: false,
    isLoad: true,
    isConductor: false,
  }),
});

export const ELEMENT_KINDS: readonly ElementKind[] = Object.freeze([
  'battery',
  'buzzer',
  'led',
  'motor',
  'resistor',
  'solar',
  'switch',
  'wire',
] as const);

export const VALID_ROTATIONS: readonly number[] = Object.freeze([0, 90, 180, 270]);

/** Prefix of the internal node a source with non-zero internal resistance introduces. */
export const INTERNAL_NODE_PREFIX = '__src:';
