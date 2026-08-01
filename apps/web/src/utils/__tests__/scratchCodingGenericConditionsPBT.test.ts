import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  programToText,
  textToProgram,
  countAllLines,
  insertCommand,
  evaluateCondition,
  executeProgramV2,
  inBounds,
  DIR_DELTA,
  type Command,
  type CommandType,
  type Condition,
  type SensorType,
  type ComparisonOperator,
  type InsertionCursor,
  type CharacterState,
  type Level,
  type CellType,
  type Direction,
  type Position,
  type VariableEnvironment,
} from '../scratchCodingUtils';

// ── Random Condition Generator ─────────────────────────────────────────────

const sensorTypes: SensorType[] = ['obstacle-ahead', 'at-goal', 'not-at-goal', 'edge-ahead'];
const comparisonOperators: ComparisonOperator[] = ['<', '>', '='];

const sensorConditionArb: fc.Arbitrary<Condition> = fc.constantFrom(...sensorTypes).map(
  (sensor) => ({ type: 'sensor', sensor }) as Condition,
);

const numComparisonConditionArb: fc.Arbitrary<Condition> = fc.record({
  operator: fc.constantFrom(...comparisonOperators),
  value: fc.integer({ min: -99, max: 99 }),
}).map(({ operator, value }) => ({
  type: 'comparison',
  variable: 'var-num',
  operator,
  value,
}) as Condition);

const charComparisonConditionArb: fc.Arbitrary<Condition> = fc.record({
  operator: fc.constantFrom(...comparisonOperators),
  value: fc.integer({ min: 97, max: 122 }), // a-z char codes
}).map(({ operator, value }) => ({
  type: 'comparison',
  variable: 'var-char',
  operator,
  value: String.fromCharCode(value),
}) as Condition);

const conditionArb: fc.Arbitrary<Condition> = fc.oneof(
  { weight: 2, arbitrary: sensorConditionArb },
  { weight: 1, arbitrary: numComparisonConditionArb },
  { weight: 1, arbitrary: charComparisonConditionArb },
);

// ── Random Command Tree Generator ─────────────────────────────────────────

let idCounter = 0;
function nextId(): string {
  return `pbt-cmd-${++idCounter}`;
}

const SIMPLE_TYPES: CommandType[] = [
  'FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'JUMP',
  'VAR_NUM_INC', 'VAR_NUM_DEC',
];

/**
 * Creates a fast-check arbitrary that generates a random Command[] tree.
 * - maxDepth: maximum nesting depth remaining (0 = flat commands only)
 * - maxWidth: maximum number of commands at each level
 */
function commandTreeArb(maxDepth: number, maxWidth: number): fc.Arbitrary<Command[]> {
  return fc.integer({ min: 0, max: maxWidth }).chain((width) => {
    if (width === 0) return fc.constant([] as Command[]);
    const cmdArbs: fc.Arbitrary<Command>[] = [];
    for (let i = 0; i < width; i++) {
      cmdArbs.push(commandArb(maxDepth));
    }
    return fc.tuple(...(cmdArbs as [fc.Arbitrary<Command>, ...fc.Arbitrary<Command>[]])).map(
      (cmds) => cmds as Command[],
    );
  });
}

function commandArb(maxDepth: number): fc.Arbitrary<Command> {
  if (maxDepth <= 0) {
    return flatCommandArb();
  }
  // Mix: ~50% flat, ~15% loop, ~15% if, ~10% while, ~10% var decl
  return fc.oneof(
    { weight: 5, arbitrary: flatCommandArb() },
    { weight: 2, arbitrary: loopCommandArb(maxDepth) },
    { weight: 2, arbitrary: ifCommandArb(maxDepth) },
    { weight: 1, arbitrary: whileCommandArb(maxDepth) },
    { weight: 1, arbitrary: varDeclCommandArb() },
  );
}

function flatCommandArb(): fc.Arbitrary<Command> {
  return fc.constantFrom(...SIMPLE_TYPES).map((type) => {
    const cmd: Command = { id: nextId(), type };
    return cmd;
  });
}

function loopCommandArb(maxDepth: number): fc.Arbitrary<Command> {
  return fc.tuple(
    fc.integer({ min: 1, max: 10 }),
    commandTreeArb(maxDepth - 1, 3),
  ).map(([param, body]) => ({
    id: nextId(),
    type: 'LOOP' as CommandType,
    parameter: param,
    body,
  }));
}

function ifCommandArb(maxDepth: number): fc.Arbitrary<Command> {
  return fc.tuple(
    conditionArb,
    commandTreeArb(maxDepth - 1, 3),
    commandTreeArb(maxDepth - 1, 3),
  ).map(([condition, body, elseBody]) => ({
    id: nextId(),
    type: 'IF' as CommandType,
    condition,
    body,
    elseBody,
  }));
}

function whileCommandArb(maxDepth: number): fc.Arbitrary<Command> {
  return fc.tuple(
    conditionArb,
    commandTreeArb(maxDepth - 1, 3),
  ).map(([condition, body]) => ({
    id: nextId(),
    type: 'WHILE' as CommandType,
    condition,
    body,
  }));
}

function varDeclCommandArb(): fc.Arbitrary<Command> {
  return fc.oneof(
    fc.integer({ min: -99, max: 99 }).map((val) => ({
      id: nextId(),
      type: 'VAR_NUM_DECL' as CommandType,
      varValue: val,
    })),
    fc.integer({ min: 97, max: 122 }).map((charCode) => ({
      id: nextId(),
      type: 'VAR_CHAR_DECL' as CommandType,
      varValue: String.fromCharCode(charCode),
    })),
  );
}

/** Standard tree generator: depth 0-3, width 0-4 */
const programTreeArb = commandTreeArb(3, 4);

// ── Helper: Structural Equality (ignoring IDs) ────────────────────────────

/**
 * Compare two Command[] trees for structural equivalence, ignoring `id` fields.
 * Checks type, parameter, condition, varValue, body, and elseBody recursively.
 */
function structurallyEqual(a: Command[], b: Command[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ca = a[i];
    const cb = b[i];
    if (ca.type !== cb.type) return false;
    if (ca.parameter !== cb.parameter) return false;

    // Compare conditions
    if (ca.condition && cb.condition) {
      if (ca.condition.type !== cb.condition.type) return false;
      if (ca.condition.type === 'sensor' && cb.condition.type === 'sensor') {
        if (ca.condition.sensor !== cb.condition.sensor) return false;
      } else if (ca.condition.type === 'comparison' && cb.condition.type === 'comparison') {
        if (ca.condition.variable !== cb.condition.variable) return false;
        if (ca.condition.operator !== cb.condition.operator) return false;
        if (ca.condition.value !== cb.condition.value) return false;
      }
    } else if (ca.condition || cb.condition) {
      return false;
    }

    // Compare varValue
    if (ca.varValue !== cb.varValue) return false;

    // Compare body
    const bodyA = ca.body ?? [];
    const bodyB = cb.body ?? [];
    if (!structurallyEqual(bodyA, bodyB)) return false;

    // Compare elseBody
    const elseA = ca.elseBody ?? [];
    const elseB = cb.elseBody ?? [];
    if (!structurallyEqual(elseA, elseB)) return false;
  }
  return true;
}

// ── Helper: Collect valid insertion cursors from a program ─────────────────

/**
 * Collects all valid insertion cursor positions from a program tree.
 * These include top-level positions and positions inside any control structure body/elseBody.
 */
function collectValidCursors(program: Command[]): InsertionCursor[] {
  const cursors: InsertionCursor[] = [];

  // Top-level positions (index 0 to program.length)
  for (let i = 0; i <= program.length; i++) {
    cursors.push({ parentId: null, branch: 'body', index: i });
  }

  // Recursively collect cursors from nested structures
  function collectFromCommands(commands: Command[]): void {
    for (const cmd of commands) {
      if (cmd.type === 'LOOP' || cmd.type === 'WHILE') {
        const body = cmd.body ?? [];
        for (let i = 0; i <= body.length; i++) {
          cursors.push({ parentId: cmd.id, branch: 'body', index: i });
        }
        collectFromCommands(body);
      } else if (cmd.type === 'IF') {
        const body = cmd.body ?? [];
        const elseBody = cmd.elseBody ?? [];
        for (let i = 0; i <= body.length; i++) {
          cursors.push({ parentId: cmd.id, branch: 'body', index: i });
        }
        for (let i = 0; i <= elseBody.length; i++) {
          cursors.push({ parentId: cmd.id, branch: 'elseBody', index: i });
        }
        collectFromCommands(body);
        collectFromCommands(elseBody);
      }
    }
  }

  collectFromCommands(program);
  return cursors;
}

// ── Property Tests ─────────────────────────────────────────────────────────

describe('Space Coder Generic Conditions — Property-Based Tests', () => {

  // ── Property 1: Serialization round-trip ─────────────────────────────────
  // **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10**
  describe('Property 1: Serialization round-trip', () => {
    it('textToProgram(programToText(program)) produces structurally equivalent tree (ignoring IDs)', () => {
      fc.assert(
        fc.property(programTreeArb, (program) => {
          const text = programToText(program);
          const parsed = textToProgram(text);
          expect(structurallyEqual(program, parsed)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 2: Line count invariant ─────────────────────────────────────
  // **Validates: Requirements 11.5, 11.6, 11.7**
  describe('Property 2: Line count invariant', () => {
    it('countAllLines(program) === programToText(program).length', () => {
      fc.assert(
        fc.property(programTreeArb, (program) => {
          const lineCount = countAllLines(program);
          const textLines = programToText(program);
          expect(lineCount).toBe(textLines.length);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 11: Simple command insertion increases line count by 1 ──────
  // **Validates: Requirements 12.1**
  describe('Property 11: Simple command insertion increases line count by 1', () => {
    const simpleVarCommands: CommandType[] = ['VAR_NUM_DECL', 'VAR_CHAR_DECL', 'VAR_NUM_INC', 'VAR_NUM_DEC'];

    it('inserting VAR_NUM_DECL/VAR_CHAR_DECL/VAR_NUM_INC/VAR_NUM_DEC at a valid cursor increases countAllLines by exactly 1', () => {
      fc.assert(
        fc.property(
          programTreeArb,
          fc.constantFrom(...simpleVarCommands),
          fc.nat(),
          (program, commandType, seed) => {
            const cursors = collectValidCursors(program);
            const cursor = cursors[seed % cursors.length];

            const linesBefore = countAllLines(program);
            const result = insertCommand(program, commandType, cursor);
            const linesAfter = countAllLines(result.program);

            expect(linesAfter - linesBefore).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 12: IF insertion increases line count by 3 ──────────────────
  // **Validates: Requirements 12.2**
  describe('Property 12: IF insertion increases line count by 3', () => {
    it('inserting IF at a valid cursor increases countAllLines by exactly 3 and cursor parentId equals new command ID with branch body', () => {
      fc.assert(
        fc.property(
          programTreeArb,
          fc.nat(),
          (program, seed) => {
            const cursors = collectValidCursors(program);
            const cursor = cursors[seed % cursors.length];

            const linesBefore = countAllLines(program);
            const result = insertCommand(program, 'IF', cursor);
            const linesAfter = countAllLines(result.program);

            // Line count delta must be 3 (if + else + end-if)
            expect(linesAfter - linesBefore).toBe(3);

            // The returned cursor should point inside the new IF's body
            expect(result.cursor.branch).toBe('body');
            // The parentId of the cursor should match the newly inserted IF command
            expect(result.cursor.parentId).not.toBeNull();
            // Verify the parentId references a command of type IF in the new program
            const findCmd = (cmds: Command[], id: string): Command | null => {
              for (const c of cmds) {
                if (c.id === id) return c;
                if (c.body) {
                  const found = findCmd(c.body, id);
                  if (found) return found;
                }
                if (c.elseBody) {
                  const found = findCmd(c.elseBody, id);
                  if (found) return found;
                }
              }
              return null;
            };
            const parentCmd = findCmd(result.program, result.cursor.parentId!);
            expect(parentCmd).not.toBeNull();
            expect(parentCmd!.type).toBe('IF');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 13: WHILE insertion increases line count by 2 ───────────────
  // **Validates: Requirements 12.3**
  describe('Property 13: WHILE insertion increases line count by 2', () => {
    it('inserting WHILE at a valid cursor increases countAllLines by exactly 2 and cursor parentId equals new command ID with branch body', () => {
      fc.assert(
        fc.property(
          programTreeArb,
          fc.nat(),
          (program, seed) => {
            const cursors = collectValidCursors(program);
            const cursor = cursors[seed % cursors.length];

            const linesBefore = countAllLines(program);
            const result = insertCommand(program, 'WHILE', cursor);
            const linesAfter = countAllLines(result.program);

            // Line count delta must be 2 (while + end-while)
            expect(linesAfter - linesBefore).toBe(2);

            // The returned cursor should point inside the new WHILE's body
            expect(result.cursor.branch).toBe('body');
            // The parentId of the cursor should match the newly inserted WHILE command
            expect(result.cursor.parentId).not.toBeNull();
            // Verify the parentId references a command of type WHILE in the new program
            const findCmd = (cmds: Command[], id: string): Command | null => {
              for (const c of cmds) {
                if (c.id === id) return c;
                if (c.body) {
                  const found = findCmd(c.body, id);
                  if (found) return found;
                }
                if (c.elseBody) {
                  const found = findCmd(c.elseBody, id);
                  if (found) return found;
                }
              }
              return null;
            };
            const parentCmd = findCmd(result.program, result.cursor.parentId!);
            expect(parentCmd).not.toBeNull();
            expect(parentCmd!.type).toBe('WHILE');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 3: Sensor condition evaluation correctness ──────────────────
  // **Validates: Requirements 3.1, 3.2, 3.3**
  describe('Property 3: Sensor condition evaluation correctness', () => {
    // Generator for a random grid (small: 3-6 rows/cols)
    const cellTypeArb: fc.Arbitrary<CellType> = fc.constantFrom('empty', 'wall', 'obstacle', 'goal');
    const directionArb: fc.Arbitrary<Direction> = fc.constantFrom('up', 'right', 'down', 'left');

    // Generate a random level with a grid of given size
    const levelArb: fc.Arbitrary<Level> = fc.integer({ min: 3, max: 6 }).chain((size) => {
      const gridArb = fc.array(fc.array(cellTypeArb, { minLength: size, maxLength: size }), { minLength: size, maxLength: size });
      const posArb = fc.record({
        row: fc.integer({ min: 0, max: size - 1 }),
        col: fc.integer({ min: 0, max: size - 1 }),
      });
      return fc.tuple(gridArb, posArb, posArb, directionArb).map(([grid, start, goal, startDir]) => ({
        grid,
        rows: size,
        cols: size,
        start,
        startDir,
        goal,
        maxBlocks: 20,
        optimalBlocks: 10,
        levelNumber: 1,
        availableBlocks: [],
      } as Level));
    });

    // Generate a random character state within a given level's bounds (unused helper kept for reference)

    it('evaluateCondition with sensor conditions matches direct game-state checks', () => {
      fc.assert(
        fc.property(
          levelArb,
          fc.constantFrom(...sensorTypes),
          fc.nat(),
          (level, sensorType, seed) => {
            // Generate a character state within the level bounds
            const row = seed % level.rows;
            const col = Math.floor(seed / level.rows) % level.cols;
            const directions: Direction[] = ['up', 'right', 'down', 'left'];
            const dir = directions[seed % 4];
            const state: CharacterState = { pos: { row, col }, dir, alive: true };

            const condition: Condition = { type: 'sensor', sensor: sensorType };
            const env: VariableEnvironment = {};

            const actual = evaluateCondition(condition, state, level, env);

            // Compute expected result using direct game-state logic
            let expected: boolean;
            const delta = DIR_DELTA[state.dir];
            const ahead: Position = {
              row: state.pos.row + delta.row,
              col: state.pos.col + delta.col,
            };

            switch (sensorType) {
              case 'obstacle-ahead': {
                // Returns false if out of bounds (edge is not obstacle)
                if (!inBounds(ahead, level)) {
                  expected = false;
                } else {
                  expected = level.grid[ahead.row][ahead.col] === 'wall' || level.grid[ahead.row][ahead.col] === 'obstacle';
                }
                break;
              }
              case 'at-goal':
                expected = state.pos.row === level.goal.row && state.pos.col === level.goal.col;
                break;
              case 'not-at-goal':
                expected = !(state.pos.row === level.goal.row && state.pos.col === level.goal.col);
                break;
              case 'edge-ahead':
                expected = !inBounds(ahead, level);
                break;
            }

            expect(actual.result).toBe(expected);
            expect(actual.error).toBeUndefined();
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  // ── Property 4: Comparison condition evaluation correctness ──────────────
  // **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**
  describe('Property 4: Comparison condition evaluation correctness', () => {
    // A dummy level and state (not used for comparison conditions but required by the API)
    const dummyLevel: Level = {
      grid: [['empty']],
      rows: 1,
      cols: 1,
      start: { row: 0, col: 0 },
      startDir: 'right',
      goal: { row: 0, col: 0 },
      maxBlocks: 10,
      optimalBlocks: 5,
      levelNumber: 1,
      availableBlocks: [],
    };
    const dummyState: CharacterState = { pos: { row: 0, col: 0 }, dir: 'right', alive: true };

    it('evaluateCondition with var-num comparison matches native JS comparison', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -99, max: 99 }),          // current value
          fc.constantFrom('<' as ComparisonOperator, '>' as ComparisonOperator, '=' as ComparisonOperator),
          fc.integer({ min: -99, max: 99 }),          // target value
          (currentValue, operator, targetValue) => {
            const condition: Condition = {
              type: 'comparison',
              variable: 'var-num',
              operator,
              value: targetValue,
            };
            const env: VariableEnvironment = { 'var-num': currentValue };

            const actual = evaluateCondition(condition, dummyState, dummyLevel, env);

            // Compute expected using native JS comparison
            let expected: boolean;
            switch (operator) {
              case '<': expected = currentValue < targetValue; break;
              case '>': expected = currentValue > targetValue; break;
              case '=': expected = currentValue === targetValue; break;
            }

            expect(actual.result).toBe(expected);
            expect(actual.error).toBeUndefined();
          },
        ),
        { numRuns: 200 },
      );
    });

    it('evaluateCondition with var-char comparison matches native JS charCode comparison', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 97, max: 122 }),          // current char code (a-z)
          fc.constantFrom('<' as ComparisonOperator, '>' as ComparisonOperator, '=' as ComparisonOperator),
          fc.integer({ min: 97, max: 122 }),          // target char code (a-z)
          (currentCode, operator, targetCode) => {
            const currentChar = String.fromCharCode(currentCode);
            const targetChar = String.fromCharCode(targetCode);

            const condition: Condition = {
              type: 'comparison',
              variable: 'var-char',
              operator,
              value: targetChar,
            };
            const env: VariableEnvironment = { 'var-char': currentChar };

            const actual = evaluateCondition(condition, dummyState, dummyLevel, env);

            // Compute expected using charCode comparison
            let expected: boolean;
            switch (operator) {
              case '<': expected = currentCode < targetCode; break;
              case '>': expected = currentCode > targetCode; break;
              case '=': expected = currentCode === targetCode; break;
            }

            expect(actual.result).toBe(expected);
            expect(actual.error).toBeUndefined();
          },
        ),
        { numRuns: 200 },
      );
    });

    it('evaluateCondition returns error when variable is undefined', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('var-num' as const, 'var-char' as const),
          fc.constantFrom('<' as ComparisonOperator, '>' as ComparisonOperator, '=' as ComparisonOperator),
          (variable, operator) => {
            const value = variable === 'var-num' ? 5 : 'c';
            const condition: Condition = {
              type: 'comparison',
              variable,
              operator,
              value,
            };
            // Empty environment — variable is undefined
            const env: VariableEnvironment = {};

            const actual = evaluateCondition(condition, dummyState, dummyLevel, env);

            expect(actual.result).toBe(false);
            expect(actual.error).toBe(`undefined-variable:${variable}`);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 5: Sensor-based IF matches old IF_OBSTACLE behavior ─────────
  // **Validates: Requirements 8.3**
  describe('Property 5: Sensor-based IF matches old IF_OBSTACLE behavior', () => {
    /**
     * Generate a level where the character faces either an obstacle/wall or an empty cell.
     * We create controlled small grids (3-6) with known configurations so assertions are clear.
     *
     * The old IF_OBSTACLE logic:
     * - Checked if the cell directly ahead was a wall, obstacle, or out of bounds
     * - If true: executed the body (then-branch)
     * - If false: executed the else-branch
     *
     * The new generic IF with `obstacle-ahead` sensor should produce identical branch selection.
     */

    const directionArb: fc.Arbitrary<Direction> = fc.constantFrom('up' as Direction, 'right' as Direction, 'down' as Direction, 'left' as Direction);

    // Generator that produces a level + character start position where we know whether obstacle is ahead
    const levelWithObstacleKnowledgeArb: fc.Arbitrary<{
      level: Level;
      hasObstacleAhead: boolean;
    }> = fc.tuple(
      fc.integer({ min: 3, max: 6 }),   // grid size
      directionArb,                       // facing direction
      fc.boolean(),                       // whether to place obstacle ahead
    ).chain(([size, dir, placeObstacle]) => {
      // Place character in the middle of the grid
      const charRow = Math.floor(size / 2);
      const charCol = Math.floor(size / 2);

      // Determine cell ahead
      const delta = DIR_DELTA[dir];
      const aheadRow = charRow + delta.row;
      const aheadCol = charCol + delta.col;

      // Build a grid of empty cells
      const grid: CellType[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 'empty' as CellType),
      );

      // Determine if ahead is in bounds
      const aheadInBounds = aheadRow >= 0 && aheadRow < size && aheadCol >= 0 && aheadCol < size;

      let hasObstacleAhead: boolean;

      if (!aheadInBounds) {
        // Out of bounds — obstacle-ahead returns FALSE (edge is not obstacle, there's a separate edge-ahead sensor)
        hasObstacleAhead = false;
      } else if (placeObstacle) {
        // Place a wall or obstacle in the cell ahead
        return fc.constantFrom('wall' as CellType, 'obstacle' as CellType).map((blockType) => {
          grid[aheadRow][aheadCol] = blockType;
          // Place goal somewhere not blocking
          const goalRow = aheadRow === 0 ? size - 1 : 0;
          const goalCol = aheadCol === 0 ? size - 1 : 0;
          grid[goalRow][goalCol] = 'goal';

          const level: Level = {
            grid,
            rows: size,
            cols: size,
            start: { row: charRow, col: charCol },
            startDir: dir,
            goal: { row: goalRow, col: goalCol },
            maxBlocks: 20,
            optimalBlocks: 10,
            levelNumber: 1,
            availableBlocks: [],
          };
          return { level, hasObstacleAhead: true as boolean };
        });
      } else {
        // Cell ahead is empty — no obstacle
        hasObstacleAhead = false;
      }

      // Place goal away from character
      const goalRow = charRow === 0 ? size - 1 : 0;
      const goalCol = charCol === 0 ? size - 1 : 0;
      grid[goalRow][goalCol] = 'goal';

      const level: Level = {
        grid,
        rows: size,
        cols: size,
        start: { row: charRow, col: charCol },
        startDir: dir,
        goal: { row: goalRow, col: goalCol },
        maxBlocks: 20,
        optimalBlocks: 10,
        levelNumber: 1,
        availableBlocks: [],
      };
      return fc.constant({ level, hasObstacleAhead });
    });

    it('executing IF(obstacle-ahead, body=[TURN_LEFT], elseBody=[TURN_RIGHT]) selects correct branch based on obstacle presence', () => {
      fc.assert(
        fc.property(
          levelWithObstacleKnowledgeArb,
          ({ level, hasObstacleAhead }) => {
            // Build program: IF(obstacle-ahead) { TURN_LEFT } else { TURN_RIGHT }
            // TURN_LEFT and TURN_RIGHT are safe actions that won't cause collisions
            const program: Command[] = [
              {
                id: 'if-1',
                type: 'IF',
                condition: { type: 'sensor', sensor: 'obstacle-ahead' },
                body: [{ id: 'then-1', type: 'TURN_LEFT' }],
                elseBody: [{ id: 'else-1', type: 'TURN_RIGHT' }],
              },
            ];

            const steps = executeProgramV2(level, program);

            // Execution should produce exactly 1 step (either TURN_LEFT or TURN_RIGHT)
            expect(steps.length).toBe(1);
            expect(steps[0].alive).toBe(true);

            if (hasObstacleAhead) {
              // Old IF_OBSTACLE would execute body (then-branch) → TURN_LEFT
              expect(steps[0].blockId).toBe('then-1');
              // Verify direction changed left
              const expectedDir = { up: 'left', right: 'up', down: 'right', left: 'down' } as const;
              expect(steps[0].dir).toBe(expectedDir[level.startDir]);
            } else {
              // Old IF_OBSTACLE would execute else-branch → TURN_RIGHT
              expect(steps[0].blockId).toBe('else-1');
              // Verify direction changed right
              const expectedDir = { up: 'right', right: 'down', down: 'left', left: 'up' } as const;
              expect(steps[0].dir).toBe(expectedDir[level.startDir]);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 7: Counting loop produces correct iteration count ────────────
  // **Validates: Requirements 2.3, 7.3, 5.4**
  describe('Property 7: Counting loop produces correct iteration count', () => {
    it('var-num = start; while(var-num < target) { forward(); var-num++ } produces exactly (target - start) forward steps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 15 }),   // start value
          fc.integer({ min: 1, max: 10 }),   // delta (target = start + delta)
          (start, delta) => {
            const target = start + delta;

            // Create a straight horizontal corridor level long enough
            const corridorLength = delta + 3; // extra padding
            const grid: CellType[][] = Array.from({ length: 3 }, () =>
              Array.from({ length: corridorLength }, () => 'empty' as CellType),
            );
            // Place goal at the far end of the corridor (row 1)
            grid[1][corridorLength - 1] = 'goal';

            const level: Level = {
              grid,
              rows: 3,
              cols: corridorLength,
              start: { row: 1, col: 0 },
              startDir: 'right' as Direction,
              goal: { row: 1, col: corridorLength - 1 },
              maxBlocks: 20,
              optimalBlocks: delta,
              levelNumber: 1,
              availableBlocks: [],
            };

            // Build program: var-num = start; while(var-num < target) { forward(); var-num++ }
            const program: Command[] = [
              { id: 'decl-1', type: 'VAR_NUM_DECL', varValue: start },
              {
                id: 'while-1',
                type: 'WHILE',
                condition: { type: 'comparison', variable: 'var-num', operator: '<', value: target },
                body: [
                  { id: 'fwd-1', type: 'FORWARD' },
                  { id: 'inc-1', type: 'VAR_NUM_INC' },
                ],
              },
            ];

            const steps = executeProgramV2(level, program);

            // Count forward steps (steps produced by the FORWARD command)
            const forwardSteps = steps.filter((s) => s.blockId === 'fwd-1');
            expect(forwardSteps.length).toBe(delta);

            // All steps should be alive (no errors)
            for (const step of steps) {
              expect(step.alive).toBe(true);
              expect(step.errorType).toBeUndefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 8: Undefined variable produces error ────────────────────────
  // **Validates: Requirements 1.5, 2.6, 7.5, 13.1, 13.2, 13.3**
  describe('Property 8: Undefined variable produces error', () => {
    // A simple level for execution (1x2 corridor — no moves needed for error tests)
    const errorLevel: Level = {
      grid: [['empty', 'goal']],
      rows: 1,
      cols: 2,
      start: { row: 0, col: 0 },
      startDir: 'right' as Direction,
      goal: { row: 0, col: 1 },
      maxBlocks: 10,
      optimalBlocks: 1,
      levelNumber: 1,
      availableBlocks: [],
    };

    it('VAR_NUM_INC without prior VAR_NUM_DECL produces undefined-variable error', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // no randomness needed but maintain PBT structure
          () => {
            const program: Command[] = [
              { id: 'inc-1', type: 'VAR_NUM_INC' },
            ];

            const steps = executeProgramV2(errorLevel, program);
            expect(steps.length).toBeGreaterThanOrEqual(1);
            const errorStep = steps.find((s) => s.errorType === 'undefined-variable');
            expect(errorStep).toBeDefined();
            expect(errorStep!.alive).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('VAR_NUM_DEC without prior VAR_NUM_DECL produces undefined-variable error', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const program: Command[] = [
              { id: 'dec-1', type: 'VAR_NUM_DEC' },
            ];

            const steps = executeProgramV2(errorLevel, program);
            expect(steps.length).toBeGreaterThanOrEqual(1);
            const errorStep = steps.find((s) => s.errorType === 'undefined-variable');
            expect(errorStep).toBeDefined();
            expect(errorStep!.alive).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('WHILE with comparison condition on undeclared var-num produces undefined-variable error', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -99, max: 99 }),  // random target value
          fc.constantFrom('<' as ComparisonOperator, '>' as ComparisonOperator, '=' as ComparisonOperator),
          (targetValue, operator) => {
            const program: Command[] = [
              {
                id: 'while-1',
                type: 'WHILE',
                condition: { type: 'comparison', variable: 'var-num', operator, value: targetValue },
                body: [{ id: 'fwd-1', type: 'FORWARD' }],
              },
            ];

            const steps = executeProgramV2(errorLevel, program);
            expect(steps.length).toBeGreaterThanOrEqual(1);
            const errorStep = steps.find((s) => s.errorType === 'undefined-variable');
            expect(errorStep).toBeDefined();
            expect(errorStep!.alive).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('IF with comparison condition on undeclared var-char produces undefined-variable error', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 97, max: 122 }).map((c) => String.fromCharCode(c)),  // random char target
          fc.constantFrom('<' as ComparisonOperator, '>' as ComparisonOperator, '=' as ComparisonOperator),
          (targetChar, operator) => {
            const program: Command[] = [
              {
                id: 'if-1',
                type: 'IF',
                condition: { type: 'comparison', variable: 'var-char', operator, value: targetChar },
                body: [{ id: 'fwd-1', type: 'FORWARD' }],
                elseBody: [{ id: 'turn-1', type: 'TURN_LEFT' }],
              },
            ];

            const steps = executeProgramV2(errorLevel, program);
            expect(steps.length).toBeGreaterThanOrEqual(1);
            const errorStep = steps.find((s) => s.errorType === 'undefined-variable');
            expect(errorStep).toBeDefined();
            expect(errorStep!.alive).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 9: Increment and decrement arithmetic ───────────────────────
  // **Validates: Requirements 7.3, 7.4, 5.4**
  describe('Property 9: Increment and decrement arithmetic', () => {
    it('var-num = n followed by k increments and j decrements yields final value n + k - j', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -20, max: 20 }),   // initial value n
          fc.integer({ min: 0, max: 10 }),     // k increments
          fc.integer({ min: 0, max: 10 }),     // j decrements
          (n, k, j) => {
            const expectedValue = n + k - j;

            // Build program: VAR_NUM_DECL(n), k increments, j decrements, then IF(var-num = expectedValue) { FORWARD } else { TURN_LEFT }
            const program: Command[] = [
              { id: 'decl-1', type: 'VAR_NUM_DECL', varValue: n },
              ...Array.from({ length: k }, (_, i) => ({
                id: `inc-${i}`, type: 'VAR_NUM_INC' as CommandType,
              })),
              ...Array.from({ length: j }, (_, i) => ({
                id: `dec-${i}`, type: 'VAR_NUM_DEC' as CommandType,
              })),
              {
                id: 'if-verify',
                type: 'IF' as CommandType,
                condition: { type: 'comparison' as const, variable: 'var-num' as const, operator: '=' as ComparisonOperator, value: expectedValue },
                body: [{ id: 'fwd-verify', type: 'FORWARD' as CommandType }],
                elseBody: [{ id: 'turn-verify', type: 'TURN_LEFT' as CommandType }],
              },
            ];

            // Simple corridor level: start at (0,0) facing right, goal at (0,1)
            const level: Level = {
              grid: [['empty', 'goal']],
              rows: 1,
              cols: 2,
              start: { row: 0, col: 0 },
              startDir: 'right' as Direction,
              goal: { row: 0, col: 1 },
              maxBlocks: 50,
              optimalBlocks: 1,
              levelNumber: 1,
              availableBlocks: [],
            };

            const steps = executeProgramV2(level, program);

            // The IF should have taken the FORWARD branch (condition true)
            // meaning the arithmetic is correct
            const forwardStep = steps.find((s) => s.blockId === 'fwd-verify');
            const turnStep = steps.find((s) => s.blockId === 'turn-verify');

            expect(forwardStep).toBeDefined();
            expect(turnStep).toBeUndefined();

            // No errors should have occurred
            for (const step of steps) {
              expect(step.errorType).toBeUndefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 10: Last declaration wins ───────────────────────────────────
  // **Validates: Requirements 5.5, 6.5**
  describe('Property 10: Last declaration wins', () => {
    it('multiple VAR_NUM_DECL commands — final value matches last declaration', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 2, maxLength: 5 }),  // 2-5 declarations
          (values) => {
            const lastValue = values[values.length - 1];

            // Build program: multiple declarations, then IF(var-num = lastValue) { FORWARD } else { TURN_LEFT }
            const program: Command[] = [
              ...values.map((val, i) => ({
                id: `decl-${i}`,
                type: 'VAR_NUM_DECL' as CommandType,
                varValue: val,
              })),
              {
                id: 'if-verify',
                type: 'IF' as CommandType,
                condition: { type: 'comparison' as const, variable: 'var-num' as const, operator: '=' as ComparisonOperator, value: lastValue },
                body: [{ id: 'fwd-verify', type: 'FORWARD' as CommandType }],
                elseBody: [{ id: 'turn-verify', type: 'TURN_LEFT' as CommandType }],
              },
            ];

            // Simple corridor level
            const level: Level = {
              grid: [['empty', 'goal']],
              rows: 1,
              cols: 2,
              start: { row: 0, col: 0 },
              startDir: 'right' as Direction,
              goal: { row: 0, col: 1 },
              maxBlocks: 50,
              optimalBlocks: 1,
              levelNumber: 1,
              availableBlocks: [],
            };

            const steps = executeProgramV2(level, program);

            // The IF should have taken the FORWARD branch
            const forwardStep = steps.find((s) => s.blockId === 'fwd-verify');
            const turnStep = steps.find((s) => s.blockId === 'turn-verify');

            expect(forwardStep).toBeDefined();
            expect(turnStep).toBeUndefined();

            // No errors
            for (const step of steps) {
              expect(step.errorType).toBeUndefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('multiple VAR_CHAR_DECL commands — final value matches last declaration', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 97, max: 122 }).map((c) => String.fromCharCode(c)),
            { minLength: 2, maxLength: 5 },
          ),  // 2-5 char declarations
          (values) => {
            const lastValue = values[values.length - 1];

            // Build program: multiple char declarations, then IF(var-char = lastValue) { FORWARD } else { TURN_LEFT }
            const program: Command[] = [
              ...values.map((val, i) => ({
                id: `decl-${i}`,
                type: 'VAR_CHAR_DECL' as CommandType,
                varValue: val,
              })),
              {
                id: 'if-verify',
                type: 'IF' as CommandType,
                condition: { type: 'comparison' as const, variable: 'var-char' as const, operator: '=' as ComparisonOperator, value: lastValue },
                body: [{ id: 'fwd-verify', type: 'FORWARD' as CommandType }],
                elseBody: [{ id: 'turn-verify', type: 'TURN_LEFT' as CommandType }],
              },
            ];

            // Simple corridor level
            const level: Level = {
              grid: [['empty', 'goal']],
              rows: 1,
              cols: 2,
              start: { row: 0, col: 0 },
              startDir: 'right' as Direction,
              goal: { row: 0, col: 1 },
              maxBlocks: 50,
              optimalBlocks: 1,
              levelNumber: 1,
              availableBlocks: [],
            };

            const steps = executeProgramV2(level, program);

            // The IF should have taken the FORWARD branch
            const forwardStep = steps.find((s) => s.blockId === 'fwd-verify');
            const turnStep = steps.find((s) => s.blockId === 'turn-verify');

            expect(forwardStep).toBeDefined();
            expect(turnStep).toBeUndefined();

            // No errors
            for (const step of steps) {
              expect(step.errorType).toBeUndefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 6: Sensor-based WHILE matches old WHILE_NOT_GOAL behavior ──
  // **Validates: Requirements 8.3**
  describe('Property 6: Sensor-based WHILE matches old WHILE_NOT_GOAL behavior', () => {
    /**
     * Generate a straight-line level where the goal is N cells ahead (N = 1 to 5).
     * Execute: WHILE(not-at-goal) { FORWARD }
     * Verify: no error, astronaut reaches goal, step count equals N.
     *
     * The old WHILE_NOT_GOAL looped while position != goal.
     * The new WHILE with `not-at-goal` sensor should produce identical step sequences.
     */

    // Generator: straight-line level with goal N cells ahead
    const straightLineLevelArb: fc.Arbitrary<{ level: Level; distance: number }> = fc.tuple(
      fc.integer({ min: 1, max: 5 }),   // distance to goal
      fc.constantFrom('right' as Direction, 'down' as Direction),  // direction (right or down for easy grid construction)
    ).map(([distance, dir]) => {
      // Create a grid large enough to hold the straight line
      const size = distance + 2; // extra padding

      const grid: CellType[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 'empty' as CellType),
      );

      let start: Position;
      let goal: Position;

      if (dir === 'right') {
        start = { row: 1, col: 0 };
        goal = { row: 1, col: distance };
      } else {
        // down
        start = { row: 0, col: 1 };
        goal = { row: distance, col: 1 };
      }

      grid[goal.row][goal.col] = 'goal';

      const level: Level = {
        grid,
        rows: size,
        cols: size,
        start,
        startDir: dir,
        goal,
        maxBlocks: 20,
        optimalBlocks: distance,
        levelNumber: 1,
        availableBlocks: [],
      };

      return { level, distance };
    });

    it('executing WHILE(not-at-goal) { FORWARD } on a straight-line level reaches goal in exactly N steps', () => {
      fc.assert(
        fc.property(
          straightLineLevelArb,
          ({ level, distance }) => {
            // Build program: WHILE(not-at-goal) { FORWARD }
            const program: Command[] = [
              {
                id: 'while-1',
                type: 'WHILE',
                condition: { type: 'sensor', sensor: 'not-at-goal' },
                body: [{ id: 'fwd-1', type: 'FORWARD' }],
              },
            ];

            const steps = executeProgramV2(level, program);

            // Should produce exactly `distance` forward steps
            expect(steps.length).toBe(distance);

            // All steps should be alive (no errors)
            for (const step of steps) {
              expect(step.alive).toBe(true);
              expect(step.errorType).toBeUndefined();
            }

            // All steps should be from the FORWARD command
            for (const step of steps) {
              expect(step.blockId).toBe('fwd-1');
            }

            // Final step should be at goal position
            const lastStep = steps[steps.length - 1];
            expect(lastStep.pos.row).toBe(level.goal.row);
            expect(lastStep.pos.col).toBe(level.goal.col);
            expect(lastStep.reachedGoal).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
