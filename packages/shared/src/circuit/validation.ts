/**
 * Structural validation of a submitted layout (component A1).
 *
 * Structural well-formedness is deliberately distinct from electrical validity: a layout can
 * be perfectly well-formed and still be an open circuit or a short.
 *
 * Every input is treated as `unknown`-shaped at this boundary even though the signature is
 * typed, because a JavaScript caller or a deserialized network payload can carry anything.
 * The function therefore never throws - a malformed payload yields `MALFORMED_PAYLOAD`
 * rather than a `TypeError` (SECURITY-05 bounded validation, SECURITY-15 fail closed).
 *
 * Satisfies FR-CB-26 and NFR-CB-19.
 */

import {
  ELEMENT_SPECS,
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
} from './constants';
import type {
  CircuitLayout,
  ElementId,
  ElementKind,
  Environment,
  GridSize,
  NodeId,
  StructuralIssue,
  StructuralValidation,
  SwitchStates,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUsableId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isKnownKind(value: unknown): value is ElementKind {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(ELEMENT_SPECS, value)
  );
}

function compareIssues(a: StructuralIssue, b: StructuralIssue): number {
  const keyA = `${a.code}|${a.elementId ?? ''}|${a.connectionId ?? ''}|${a.detail ?? ''}`;
  const keyB = `${b.code}|${b.elementId ?? ''}|${b.connectionId ?? ''}|${b.detail ?? ''}`;
  return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
}

interface ElementSurvey {
  /** Terminal id to the element that owns it. Terminal ids are globally unique. */
  readonly terminalOwners: ReadonlyMap<NodeId, ElementId>;
  readonly switchIds: ReadonlySet<ElementId>;
}

function validateGridSize(raw: unknown, issues: StructuralIssue[]): GridSize | undefined {
  if (!isRecord(raw)) {
    issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'gridSize must be an object' });
    return undefined;
  }
  const { cols, rows } = raw;
  if (typeof cols !== 'number' || typeof rows !== 'number') {
    issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'gridSize cols and rows must be numbers' });
    return undefined;
  }
  const inBounds =
    Number.isInteger(cols) &&
    Number.isInteger(rows) &&
    cols >= MIN_GRID_COLS &&
    cols <= MAX_GRID_COLS &&
    rows >= MIN_GRID_ROWS &&
    rows <= MAX_GRID_ROWS;
  if (!inBounds) {
    issues.push({
      code: 'GRID_SIZE_OUT_OF_BOUNDS',
      detail: `gridSize must be integer cols in [${MIN_GRID_COLS}, ${MAX_GRID_COLS}] and rows in [${MIN_GRID_ROWS}, ${MAX_GRID_ROWS}]`,
    });
    return undefined;
  }
  return { cols, rows };
}

function isInsideGrid(col: number, row: number, gridSize: GridSize | undefined): boolean {
  const limitCols = gridSize?.cols ?? MAX_GRID_COLS;
  const limitRows = gridSize?.rows ?? MAX_GRID_ROWS;
  return (
    Number.isInteger(col) &&
    Number.isInteger(row) &&
    col >= 0 &&
    row >= 0 &&
    col < limitCols &&
    row < limitRows
  );
}

function validatePosition(
  raw: unknown,
  elementId: ElementId,
  gridSize: GridSize | undefined,
  issues: StructuralIssue[]
): void {
  if (!isRecord(raw)) {
    issues.push({ code: 'MALFORMED_PAYLOAD', elementId, detail: 'position must be an object' });
    return;
  }
  const { col, row, rotation } = raw;
  if (!VALID_ROTATIONS.includes(rotation as number)) {
    issues.push({
      code: 'INVALID_ROTATION',
      elementId,
      detail: 'rotation must be 0, 90, 180, 270',
    });
  }
  if (typeof col !== 'number' || typeof row !== 'number') {
    issues.push({
      code: 'MALFORMED_PAYLOAD',
      elementId,
      detail: 'position col and row must be numbers',
    });
    return;
  }
  if (!isInsideGrid(col, row, gridSize)) {
    issues.push({
      code: 'POSITION_OUT_OF_BOUNDS',
      elementId,
      detail: 'position must sit inside the grid',
    });
  }
}

function validateParams(
  raw: unknown,
  elementId: ElementId,
  kind: ElementKind | undefined,
  issues: StructuralIssue[]
): void {
  if (raw === undefined) {
    return;
  }
  if (!isRecord(raw)) {
    issues.push({ code: 'MALFORMED_PAYLOAD', elementId, detail: 'params must be an object' });
    return;
  }
  for (const key of Object.keys(raw).sort()) {
    const value = raw[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push({ code: 'NON_FINITE_PARAM', elementId, detail: `params.${key} must be a finite number` });
    }
  }
  if (kind === 'resistor') {
    checkRange(raw.resistance, 'resistance', MIN_RESISTANCE, MAX_RESISTANCE, elementId, issues);
  }
  if (kind !== undefined && ELEMENT_SPECS[kind].isSource) {
    checkRange(raw.internalResistance, 'internalResistance', 0, MAX_RESISTANCE, elementId, issues);
  }
}

function checkRange(
  value: unknown,
  name: string,
  low: number,
  high: number,
  elementId: ElementId,
  issues: StructuralIssue[]
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return;
  }
  if (value < low || value > high) {
    issues.push({
      code: 'PARAM_OUT_OF_RANGE',
      elementId,
      detail: `params.${name} must lie in [${low}, ${high}]`,
    });
  }
}

function validateTerminals(
  raw: unknown,
  elementId: ElementId,
  terminalOwners: Map<NodeId, ElementId>,
  issues: StructuralIssue[]
): void {
  if (!Array.isArray(raw) || raw.length !== 2) {
    issues.push({ code: 'MALFORMED_PAYLOAD', elementId, detail: 'terminals must be a pair' });
    return;
  }
  const seen: NodeId[] = [];
  for (const terminal of raw) {
    if (!isUsableId(terminal)) {
      issues.push({ code: 'MALFORMED_PAYLOAD', elementId, detail: 'terminal ids must be non-empty strings' });
      continue;
    }
    if (terminal.length > MAX_ID_LENGTH) {
      issues.push({ code: 'ID_TOO_LONG', elementId, detail: `terminal id exceeds ${MAX_ID_LENGTH} characters` });
      continue;
    }
    if (seen.includes(terminal) || terminalOwners.has(terminal)) {
      issues.push({
        code: 'DUPLICATE_TERMINAL',
        elementId,
        detail: 'terminal ids must be unique across the whole layout',
      });
      continue;
    }
    seen.push(terminal);
    terminalOwners.set(terminal, elementId);
  }
}

function surveyElements(
  elements: readonly unknown[],
  gridSize: GridSize | undefined,
  issues: StructuralIssue[]
): ElementSurvey {
  const terminalOwners = new Map<NodeId, ElementId>();
  const switchIds = new Set<ElementId>();
  const seenIds = new Set<ElementId>();

  for (const raw of elements) {
    if (!isRecord(raw)) {
      issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'every element must be an object' });
      continue;
    }
    const id = raw.id;
    if (!isUsableId(id)) {
      issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'element id must be a non-empty string' });
      continue;
    }
    if (id.length > MAX_ID_LENGTH) {
      issues.push({ code: 'ID_TOO_LONG', elementId: id, detail: `element id exceeds ${MAX_ID_LENGTH} characters` });
      continue;
    }
    if (seenIds.has(id)) {
      issues.push({ code: 'DUPLICATE_ELEMENT_ID', elementId: id });
      continue;
    }
    seenIds.add(id);

    const kind = isKnownKind(raw.kind) ? raw.kind : undefined;
    if (kind === undefined) {
      issues.push({ code: 'UNKNOWN_ELEMENT_KIND', elementId: id, detail: 'kind is not a supported element' });
    } else if (kind === 'switch') {
      switchIds.add(id);
    }

    validateTerminals(raw.terminals, id, terminalOwners, issues);
    validatePosition(raw.position, id, gridSize, issues);
    validateParams(raw.params, id, kind, issues);
  }

  return { terminalOwners, switchIds };
}

function validateEndpoints(
  connectionId: string,
  from: unknown,
  to: unknown,
  terminalOwners: ReadonlyMap<NodeId, ElementId>,
  issues: StructuralIssue[]
): void {
  if (!isUsableId(from) || !isUsableId(to)) {
    issues.push({
      code: 'MALFORMED_PAYLOAD',
      connectionId,
      detail: 'from and to must be non-empty strings',
    });
    return;
  }
  if (from === to) {
    issues.push({
      code: 'SELF_CONNECTION',
      connectionId,
      detail: 'a connection cannot join a terminal to itself',
    });
    return;
  }
  if (!terminalOwners.has(from)) {
    issues.push({
      code: 'UNRESOLVED_TERMINAL_REF',
      connectionId,
      detail: 'from does not name a declared terminal',
    });
  }
  if (!terminalOwners.has(to)) {
    issues.push({
      code: 'UNRESOLVED_TERMINAL_REF',
      connectionId,
      detail: 'to does not name a declared terminal',
    });
  }
}

function validateConnections(
  connections: readonly unknown[],
  terminalOwners: ReadonlyMap<NodeId, ElementId>,
  issues: StructuralIssue[]
): void {
  const seenIds = new Set<string>();
  for (const raw of connections) {
    if (!isRecord(raw)) {
      issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'every connection must be an object' });
      continue;
    }
    const id = raw.id;
    if (!isUsableId(id)) {
      issues.push({
        code: 'MALFORMED_PAYLOAD',
        detail: 'connection id must be a non-empty string',
      });
      continue;
    }
    if (id.length > MAX_ID_LENGTH) {
      issues.push({
        code: 'ID_TOO_LONG',
        connectionId: id,
        detail: `connection id exceeds ${MAX_ID_LENGTH} characters`,
      });
      continue;
    }
    if (seenIds.has(id)) {
      issues.push({ code: 'DUPLICATE_CONNECTION_ID', connectionId: id });
      continue;
    }
    seenIds.add(id);
    validateEndpoints(id, raw.from, raw.to, terminalOwners, issues);
  }
}

function validateSwitchStates(
  switches: SwitchStates,
  switchIds: ReadonlySet<ElementId>,
  issues: StructuralIssue[]
): void {
  const raw = switches as unknown;
  if (raw === undefined || raw === null) {
    issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'switchStates must be an object' });
    return;
  }
  if (!isRecord(raw)) {
    issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'switchStates must be an object' });
    return;
  }
  for (const elementId of Object.keys(raw).sort()) {
    const state = raw[elementId];
    if (state !== 'open' && state !== 'closed') {
      issues.push({ code: 'INVALID_SWITCH_STATE', elementId, detail: 'state must be open or closed' });
    }
    if (!switchIds.has(elementId)) {
      issues.push({ code: 'UNKNOWN_SWITCH_ELEMENT', elementId, detail: 'no switch element carries this id' });
    }
  }
}

function validateEnvironment(env: Environment, issues: StructuralIssue[]): void {
  const raw = env as unknown;
  if (!isRecord(raw)) {
    issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'environment must be an object' });
    return;
  }
  const { sourceVoltage, lightLevel } = raw;
  if (
    typeof sourceVoltage !== 'number' ||
    !Number.isFinite(sourceVoltage) ||
    sourceVoltage < MIN_SOURCE_VOLTAGE ||
    sourceVoltage > MAX_SOURCE_VOLTAGE
  ) {
    issues.push({
      code: 'VOLTAGE_OUT_OF_RANGE',
      detail: `sourceVoltage must lie in [${MIN_SOURCE_VOLTAGE}, ${MAX_SOURCE_VOLTAGE}]`,
    });
  }
  if (
    typeof lightLevel !== 'number' ||
    !Number.isFinite(lightLevel) ||
    lightLevel < MIN_LIGHT_LEVEL ||
    lightLevel > MAX_LIGHT_LEVEL
  ) {
    issues.push({
      code: 'LIGHT_LEVEL_OUT_OF_RANGE',
      detail: `lightLevel must lie in [${MIN_LIGHT_LEVEL}, ${MAX_LIGHT_LEVEL}]`,
    });
  }
}

/**
 * Check a layout, its switch states, and its environment for structural well-formedness.
 *
 * Returns every issue found rather than the first, so a caller can report all of them at
 * once. When a count ceiling is exceeded the per-item loops are skipped: the payload is
 * already rejected, and inspecting an oversized array would let a caller dictate how much
 * work this function performs.
 */
export function validateStructure(
  layout: CircuitLayout,
  switches: SwitchStates,
  env: Environment
): StructuralValidation {
  const issues: StructuralIssue[] = [];
  const raw = layout as unknown;

  if (!isRecord(raw)) {
    issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'layout must be an object' });
    return { valid: false, issues: Object.freeze(issues) };
  }

  const gridSize = validateGridSize(raw.gridSize, issues);
  const elements = raw.elements;
  const connections = raw.connections;

  if (!Array.isArray(elements)) {
    issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'elements must be an array' });
  }
  if (!Array.isArray(connections)) {
    issues.push({ code: 'MALFORMED_PAYLOAD', detail: 'connections must be an array' });
  }
  if (!Array.isArray(elements) || !Array.isArray(connections)) {
    validateEnvironment(env, issues);
    issues.sort(compareIssues);
    return { valid: false, issues: Object.freeze(issues) };
  }

  const elementsOverLimit = elements.length > MAX_ELEMENT_COUNT;
  const connectionsOverLimit = connections.length > MAX_CONNECTION_COUNT;
  if (elementsOverLimit) {
    issues.push({ code: 'ELEMENT_COUNT_EXCEEDED', detail: `at most ${MAX_ELEMENT_COUNT} elements` });
  }
  if (connectionsOverLimit) {
    issues.push({ code: 'CONNECTION_COUNT_EXCEEDED', detail: `at most ${MAX_CONNECTION_COUNT} connections` });
  }

  if (!elementsOverLimit && !connectionsOverLimit) {
    const survey = surveyElements(elements, gridSize, issues);
    validateConnections(connections, survey.terminalOwners, issues);
    validateSwitchStates(switches, survey.switchIds, issues);
  }

  validateEnvironment(env, issues);
  issues.sort(compareIssues);
  return { valid: issues.length === 0, issues: Object.freeze(issues) };
}
