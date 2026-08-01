import { describe, it, expect } from 'vitest';
import {
  createCommand,
  getCommandsForDifficulty,
  conditionToText,
  textToCondition,
  programToText,
  textToProgram,
  evaluateCondition,
  executeProgramV2,
  DIFFICULTY_CONFIG,
  type Command,
  type Condition,
  type Level,
  type CharacterState,
  type VariableEnvironment,
  type CellType,
  type Direction,
} from '../scratchCodingUtils';

// ── Helper: create a simple level for testing ─────────────────────────────

function makeLevel(opts: {
  grid: CellType[][];
  start?: { row: number; col: number };
  startDir?: Direction;
  goal?: { row: number; col: number };
}): Level {
  const rows = opts.grid.length;
  const cols = opts.grid[0].length;
  return {
    grid: opts.grid,
    rows,
    cols,
    start: opts.start ?? { row: 0, col: 0 },
    startDir: opts.startDir ?? 'right',
    goal: opts.goal ?? { row: 0, col: cols - 1 },
    maxBlocks: 20,
    optimalBlocks: 5,
    levelNumber: 1,
    availableBlocks: [],
  };
}

function emptyGrid(rows: number, cols: number): CellType[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'empty' as CellType),
  );
}


// ============================================================
// 1. createCommand tests
// ============================================================

describe('createCommand', () => {
  it('createCommand("IF") returns command with correct defaults', () => {
    const cmd = createCommand('IF');
    expect(cmd.type).toBe('IF');
    expect(cmd.condition).toEqual({ type: 'sensor', sensor: 'obstacle-ahead' });
    expect(cmd.body).toEqual([]);
    expect(cmd.elseBody).toEqual([]);
    expect(cmd.id).toBeDefined();
  });

  it('createCommand("WHILE") returns command with correct defaults', () => {
    const cmd = createCommand('WHILE');
    expect(cmd.type).toBe('WHILE');
    expect(cmd.condition).toEqual({ type: 'sensor', sensor: 'not-at-goal' });
    expect(cmd.body).toEqual([]);
    expect(cmd.elseBody).toBeUndefined();
    expect(cmd.id).toBeDefined();
  });

  it('createCommand("VAR_NUM_DECL") returns command with varValue 0', () => {
    const cmd = createCommand('VAR_NUM_DECL');
    expect(cmd.type).toBe('VAR_NUM_DECL');
    expect(cmd.varValue).toBe(0);
  });

  it('createCommand("VAR_CHAR_DECL") returns command with varValue "a"', () => {
    const cmd = createCommand('VAR_CHAR_DECL');
    expect(cmd.type).toBe('VAR_CHAR_DECL');
    expect(cmd.varValue).toBe('a');
  });

  it('createCommand("VAR_NUM_INC") returns command with type VAR_NUM_INC', () => {
    const cmd = createCommand('VAR_NUM_INC');
    expect(cmd.type).toBe('VAR_NUM_INC');
  });

  it('createCommand("VAR_NUM_DEC") returns command with type VAR_NUM_DEC', () => {
    const cmd = createCommand('VAR_NUM_DEC');
    expect(cmd.type).toBe('VAR_NUM_DEC');
  });
});


// ============================================================
// 2. getCommandsForDifficulty / DIFFICULTY_CONFIG tests
// ============================================================

describe('getCommandsForDifficulty / DIFFICULTY_CONFIG', () => {
  it('hard difficulty includes IF, WHILE, VAR_NUM_DECL, VAR_CHAR_DECL, VAR_NUM_INC, VAR_NUM_DEC', () => {
    const hardCommands = getCommandsForDifficulty('hard');
    const types = hardCommands.map((c) => c.type);
    expect(types).toContain('IF');
    expect(types).toContain('WHILE');
    expect(types).toContain('VAR_NUM_DECL');
    expect(types).toContain('VAR_CHAR_DECL');
    expect(types).toContain('VAR_NUM_INC');
    expect(types).toContain('VAR_NUM_DEC');
  });

  it('hard difficulty does NOT include IF_OBSTACLE or WHILE_NOT_GOAL', () => {
    const hardCommands = getCommandsForDifficulty('hard');
    const types = hardCommands.map((c) => c.type);
    expect(types).not.toContain('IF_OBSTACLE');
    expect(types).not.toContain('WHILE_NOT_GOAL');
  });

  it('DIFFICULTY_CONFIG.hard.availableCommands includes all new types', () => {
    const available = DIFFICULTY_CONFIG.hard.availableCommands;
    expect(available).toContain('IF');
    expect(available).toContain('WHILE');
    expect(available).toContain('VAR_NUM_DECL');
    expect(available).toContain('VAR_CHAR_DECL');
    expect(available).toContain('VAR_NUM_INC');
    expect(available).toContain('VAR_NUM_DEC');
    expect(available).not.toContain('IF_OBSTACLE');
    expect(available).not.toContain('WHILE_NOT_GOAL');
  });
});


// ============================================================
// 3. conditionToText tests
// ============================================================

describe('conditionToText', () => {
  it('sensor: obstacle-ahead → "obstacle-ahead()"', () => {
    expect(conditionToText({ type: 'sensor', sensor: 'obstacle-ahead' })).toBe('obstacle-ahead()');
  });

  it('sensor: at-goal → "at-goal()"', () => {
    expect(conditionToText({ type: 'sensor', sensor: 'at-goal' })).toBe('at-goal()');
  });

  it('sensor: not-at-goal → "not-at-goal()"', () => {
    expect(conditionToText({ type: 'sensor', sensor: 'not-at-goal' })).toBe('not-at-goal()');
  });

  it('sensor: edge-ahead → "edge-ahead()"', () => {
    expect(conditionToText({ type: 'sensor', sensor: 'edge-ahead' })).toBe('edge-ahead()');
  });

  it('comparison: var-num < 10 → "var-num < 10"', () => {
    const cond: Condition = { type: 'comparison', variable: 'var-num', operator: '<', value: 10 };
    expect(conditionToText(cond)).toBe('var-num < 10');
  });

  it('comparison: var-num > -5 → "var-num > -5"', () => {
    const cond: Condition = { type: 'comparison', variable: 'var-num', operator: '>', value: -5 };
    expect(conditionToText(cond)).toBe('var-num > -5');
  });

  it('comparison: var-num = 0 → "var-num = 0"', () => {
    const cond: Condition = { type: 'comparison', variable: 'var-num', operator: '=', value: 0 };
    expect(conditionToText(cond)).toBe('var-num = 0');
  });

  it('comparison: var-char < z → "var-char < z"', () => {
    const cond: Condition = { type: 'comparison', variable: 'var-char', operator: '<', value: 'z' };
    expect(conditionToText(cond)).toBe('var-char < z');
  });

  it('comparison: var-char = a → "var-char = a"', () => {
    const cond: Condition = { type: 'comparison', variable: 'var-char', operator: '=', value: 'a' };
    expect(conditionToText(cond)).toBe('var-char = a');
  });
});


// ============================================================
// 4. textToCondition tests
// ============================================================

describe('textToCondition', () => {
  it('parses "obstacle-ahead()" → sensor condition', () => {
    expect(textToCondition('obstacle-ahead()')).toEqual({ type: 'sensor', sensor: 'obstacle-ahead' });
  });

  it('parses "at-goal()" → sensor condition', () => {
    expect(textToCondition('at-goal()')).toEqual({ type: 'sensor', sensor: 'at-goal' });
  });

  it('parses "not-at-goal()" → sensor condition', () => {
    expect(textToCondition('not-at-goal()')).toEqual({ type: 'sensor', sensor: 'not-at-goal' });
  });

  it('parses "edge-ahead()" → sensor condition', () => {
    expect(textToCondition('edge-ahead()')).toEqual({ type: 'sensor', sensor: 'edge-ahead' });
  });

  it('parses "var-num < 10" → comparison condition with value 10', () => {
    expect(textToCondition('var-num < 10')).toEqual({
      type: 'comparison', variable: 'var-num', operator: '<', value: 10,
    });
  });

  it('parses "var-num > -5" → comparison condition with value -5', () => {
    expect(textToCondition('var-num > -5')).toEqual({
      type: 'comparison', variable: 'var-num', operator: '>', value: -5,
    });
  });

  it('parses "var-char = z" → comparison condition with value "z"', () => {
    expect(textToCondition('var-char = z')).toEqual({
      type: 'comparison', variable: 'var-char', operator: '=', value: 'z',
    });
  });

  it('returns null for "invalid-text"', () => {
    expect(textToCondition('invalid-text')).toBeNull();
  });
});


// ============================================================
// 5. programToText specific outputs
// ============================================================

describe('programToText', () => {
  it('IF with sensor condition: if(obstacle-ahead()) + body + else + elseBody + end-if', () => {
    const program: Command[] = [{
      id: '1', type: 'IF',
      condition: { type: 'sensor', sensor: 'obstacle-ahead' },
      body: [{ id: '2', type: 'FORWARD' }],
      elseBody: [{ id: '3', type: 'TURN_LEFT' }],
    }];
    expect(programToText(program)).toEqual([
      'if(obstacle-ahead())',
      '  forward()',
      'else',
      '  turn-left()',
      'end-if',
    ]);
  });

  it('IF with comparison condition: if(var-num < 10)', () => {
    const program: Command[] = [{
      id: '1', type: 'IF',
      condition: { type: 'comparison', variable: 'var-num', operator: '<', value: 10 },
      body: [{ id: '2', type: 'FORWARD' }],
      elseBody: [],
    }];
    expect(programToText(program)).toEqual([
      'if(var-num < 10)',
      '  forward()',
      'else',
      'end-if',
    ]);
  });

  it('WHILE with sensor condition: while(not-at-goal())', () => {
    const program: Command[] = [{
      id: '1', type: 'WHILE',
      condition: { type: 'sensor', sensor: 'not-at-goal' },
      body: [{ id: '2', type: 'FORWARD' }],
    }];
    expect(programToText(program)).toEqual([
      'while(not-at-goal())',
      '  forward()',
      'end-while',
    ]);
  });

  it('WHILE with comparison condition: while(var-num < 5) with var-num++', () => {
    const program: Command[] = [{
      id: '1', type: 'WHILE',
      condition: { type: 'comparison', variable: 'var-num', operator: '<', value: 5 },
      body: [
        { id: '2', type: 'FORWARD' },
        { id: '3', type: 'VAR_NUM_INC' },
      ],
    }];
    expect(programToText(program)).toEqual([
      'while(var-num < 5)',
      '  forward()',
      '  var-num++',
      'end-while',
    ]);
  });

  it('VAR_NUM_DECL renders as "var-num = 0"', () => {
    const program: Command[] = [{ id: '1', type: 'VAR_NUM_DECL', varValue: 0 }];
    expect(programToText(program)).toEqual(['var-num = 0']);
  });

  it('VAR_NUM_DECL renders as "var-num = -5"', () => {
    const program: Command[] = [{ id: '1', type: 'VAR_NUM_DECL', varValue: -5 }];
    expect(programToText(program)).toEqual(['var-num = -5']);
  });

  it("VAR_CHAR_DECL renders as \"var-char = 'a'\"", () => {
    const program: Command[] = [{ id: '1', type: 'VAR_CHAR_DECL', varValue: 'a' }];
    expect(programToText(program)).toEqual(["var-char = 'a'"]);
  });

  it('VAR_NUM_INC renders as "var-num++"', () => {
    const program: Command[] = [{ id: '1', type: 'VAR_NUM_INC' }];
    expect(programToText(program)).toEqual(['var-num++']);
  });

  it('VAR_NUM_DEC renders as "var-num--"', () => {
    const program: Command[] = [{ id: '1', type: 'VAR_NUM_DEC' }];
    expect(programToText(program)).toEqual(['var-num--']);
  });
});


// ============================================================
// 6. textToProgram parsing
// ============================================================

describe('textToProgram', () => {
  it('parses if(obstacle-ahead())...else...end-if structure', () => {
    const lines = [
      'if(obstacle-ahead())',
      '  forward()',
      'else',
      '  turn-left()',
      'end-if',
    ];
    const program = textToProgram(lines);
    expect(program.length).toBe(1);
    expect(program[0].type).toBe('IF');
    expect(program[0].condition).toEqual({ type: 'sensor', sensor: 'obstacle-ahead' });
    expect(program[0].body!.length).toBe(1);
    expect(program[0].body![0].type).toBe('FORWARD');
    expect(program[0].elseBody!.length).toBe(1);
    expect(program[0].elseBody![0].type).toBe('TURN_LEFT');
  });

  it('parses while(not-at-goal())...end-while structure', () => {
    const lines = [
      'while(not-at-goal())',
      '  forward()',
      'end-while',
    ];
    const program = textToProgram(lines);
    expect(program.length).toBe(1);
    expect(program[0].type).toBe('WHILE');
    expect(program[0].condition).toEqual({ type: 'sensor', sensor: 'not-at-goal' });
    expect(program[0].body!.length).toBe(1);
    expect(program[0].body![0].type).toBe('FORWARD');
  });

  it('parses if(var-num < 10)...else...end-if', () => {
    const lines = [
      'if(var-num < 10)',
      '  forward()',
      'else',
      'end-if',
    ];
    const program = textToProgram(lines);
    expect(program.length).toBe(1);
    expect(program[0].type).toBe('IF');
    expect(program[0].condition).toEqual({
      type: 'comparison', variable: 'var-num', operator: '<', value: 10,
    });
    expect(program[0].body!.length).toBe(1);
    expect(program[0].elseBody!.length).toBe(0);
  });

  it('parses while(var-char < z)...end-while', () => {
    const lines = [
      'while(var-char < z)',
      '  forward()',
      'end-while',
    ];
    const program = textToProgram(lines);
    expect(program.length).toBe(1);
    expect(program[0].type).toBe('WHILE');
    expect(program[0].condition).toEqual({
      type: 'comparison', variable: 'var-char', operator: '<', value: 'z',
    });
  });

  it('parses "var-num = 5"', () => {
    const program = textToProgram(['var-num = 5']);
    expect(program.length).toBe(1);
    expect(program[0].type).toBe('VAR_NUM_DECL');
    expect(program[0].varValue).toBe(5);
  });

  it("parses \"var-char = 'c'\"", () => {
    const program = textToProgram(["var-char = 'c'"]);
    expect(program.length).toBe(1);
    expect(program[0].type).toBe('VAR_CHAR_DECL');
    expect(program[0].varValue).toBe('c');
  });

  it('parses "var-num++"', () => {
    const program = textToProgram(['var-num++']);
    expect(program.length).toBe(1);
    expect(program[0].type).toBe('VAR_NUM_INC');
  });

  it('parses "var-num--"', () => {
    const program = textToProgram(['var-num--']);
    expect(program.length).toBe(1);
    expect(program[0].type).toBe('VAR_NUM_DEC');
  });
});


// ============================================================
// 7. evaluateCondition specific examples
// ============================================================

describe('evaluateCondition', () => {
  // 3x3 grid with wall at (0,2) for obstacle tests
  const gridWithWall: CellType[][] = [
    ['empty', 'empty', 'wall'],
    ['empty', 'empty', 'empty'],
    ['empty', 'empty', 'goal'],
  ];
  const levelWithWall = makeLevel({
    grid: gridWithWall,
    start: { row: 0, col: 0 },
    startDir: 'right',
    goal: { row: 2, col: 2 },
  });

  describe('obstacle-ahead sensor', () => {
    it('returns true when wall is ahead', () => {
      const state: CharacterState = { pos: { row: 0, col: 1 }, dir: 'right', alive: true };
      const cond: Condition = { type: 'sensor', sensor: 'obstacle-ahead' };
      expect(evaluateCondition(cond, state, levelWithWall, {}).result).toBe(true);
    });

    it('returns false when empty is ahead', () => {
      const state: CharacterState = { pos: { row: 0, col: 0 }, dir: 'down', alive: true };
      const cond: Condition = { type: 'sensor', sensor: 'obstacle-ahead' };
      expect(evaluateCondition(cond, state, levelWithWall, {}).result).toBe(false);
    });
  });

  describe('at-goal sensor', () => {
    it('returns true when on goal', () => {
      const state: CharacterState = { pos: { row: 2, col: 2 }, dir: 'right', alive: true };
      const cond: Condition = { type: 'sensor', sensor: 'at-goal' };
      expect(evaluateCondition(cond, state, levelWithWall, {}).result).toBe(true);
    });

    it('returns false when not on goal', () => {
      const state: CharacterState = { pos: { row: 0, col: 0 }, dir: 'right', alive: true };
      const cond: Condition = { type: 'sensor', sensor: 'at-goal' };
      expect(evaluateCondition(cond, state, levelWithWall, {}).result).toBe(false);
    });
  });

  describe('not-at-goal sensor', () => {
    it('returns false when on goal', () => {
      const state: CharacterState = { pos: { row: 2, col: 2 }, dir: 'right', alive: true };
      const cond: Condition = { type: 'sensor', sensor: 'not-at-goal' };
      expect(evaluateCondition(cond, state, levelWithWall, {}).result).toBe(false);
    });

    it('returns true when not on goal', () => {
      const state: CharacterState = { pos: { row: 0, col: 0 }, dir: 'right', alive: true };
      const cond: Condition = { type: 'sensor', sensor: 'not-at-goal' };
      expect(evaluateCondition(cond, state, levelWithWall, {}).result).toBe(true);
    });
  });

  describe('edge-ahead sensor', () => {
    it('returns true when at grid edge facing out', () => {
      // At row 0, col 0, facing up → next row is -1, out of bounds
      const state: CharacterState = { pos: { row: 0, col: 0 }, dir: 'up', alive: true };
      const cond: Condition = { type: 'sensor', sensor: 'edge-ahead' };
      expect(evaluateCondition(cond, state, levelWithWall, {}).result).toBe(true);
    });

    it('returns false when in middle facing inward', () => {
      const state: CharacterState = { pos: { row: 1, col: 1 }, dir: 'right', alive: true };
      const cond: Condition = { type: 'sensor', sensor: 'edge-ahead' };
      expect(evaluateCondition(cond, state, levelWithWall, {}).result).toBe(false);
    });
  });

  describe('var-num comparison', () => {
    const dummyState: CharacterState = { pos: { row: 0, col: 0 }, dir: 'right', alive: true };
    const dummyLevel = makeLevel({ grid: [['empty']], goal: { row: 0, col: 0 } });

    it('var-num < 10 with var-num=5 → true', () => {
      const cond: Condition = { type: 'comparison', variable: 'var-num', operator: '<', value: 10 };
      const env: VariableEnvironment = { 'var-num': 5 };
      expect(evaluateCondition(cond, dummyState, dummyLevel, env).result).toBe(true);
    });

    it('var-num < 10 with var-num=10 → false', () => {
      const cond: Condition = { type: 'comparison', variable: 'var-num', operator: '<', value: 10 };
      const env: VariableEnvironment = { 'var-num': 10 };
      expect(evaluateCondition(cond, dummyState, dummyLevel, env).result).toBe(false);
    });
  });

  describe('var-char comparison', () => {
    const dummyState: CharacterState = { pos: { row: 0, col: 0 }, dir: 'right', alive: true };
    const dummyLevel = makeLevel({ grid: [['empty']], goal: { row: 0, col: 0 } });

    it('var-char = z with var-char="z" → true', () => {
      const cond: Condition = { type: 'comparison', variable: 'var-char', operator: '=', value: 'z' };
      const env: VariableEnvironment = { 'var-char': 'z' };
      expect(evaluateCondition(cond, dummyState, dummyLevel, env).result).toBe(true);
    });

    it('var-char = z with var-char="a" → false', () => {
      const cond: Condition = { type: 'comparison', variable: 'var-char', operator: '=', value: 'z' };
      const env: VariableEnvironment = { 'var-char': 'a' };
      expect(evaluateCondition(cond, dummyState, dummyLevel, env).result).toBe(false);
    });
  });
});


// ============================================================
// 8. Execution tests
// ============================================================

describe('executeProgramV2 — execution tests', () => {
  describe('infinite loop safeguard', () => {
    it('while(var-num < 100) { var-num-- } with var-num starting at 99 triggers infinite-loop', () => {
      // Long corridor so forward() doesn't cause collisions — but we use var-num-- which
      // keeps var-num always < 100, so while never terminates
      const grid = emptyGrid(3, 3);
      grid[2][2] = 'goal';
      const level = makeLevel({ grid, start: { row: 1, col: 0 }, goal: { row: 2, col: 2 } });

      const program: Command[] = [
        { id: 'decl', type: 'VAR_NUM_DECL', varValue: 99 },
        {
          id: 'while-1', type: 'WHILE',
          condition: { type: 'comparison', variable: 'var-num', operator: '<', value: 100 },
          body: [{ id: 'dec-1', type: 'VAR_NUM_DEC' }],
        },
      ];

      const steps = executeProgramV2(level, program);
      const lastStep = steps[steps.length - 1];
      expect(lastStep.errorType).toBe('infinite-loop');
      expect(lastStep.alive).toBe(false);
    });
  });

  describe('undefined-variable errors', () => {
    const grid = emptyGrid(3, 3);
    grid[2][2] = 'goal';
    const level = makeLevel({ grid, start: { row: 0, col: 0 }, goal: { row: 2, col: 2 } });

    it('var-num++ without declaration → undefined-variable error', () => {
      const program: Command[] = [{ id: 'inc-1', type: 'VAR_NUM_INC' }];
      const steps = executeProgramV2(level, program);
      expect(steps.length).toBe(1);
      expect(steps[0].errorType).toBe('undefined-variable');
      expect(steps[0].alive).toBe(false);
    });

    it('while(var-num < 5) without declaration → undefined-variable error', () => {
      const program: Command[] = [{
        id: 'while-1', type: 'WHILE',
        condition: { type: 'comparison', variable: 'var-num', operator: '<', value: 5 },
        body: [{ id: 'fwd-1', type: 'FORWARD' }],
      }];
      const steps = executeProgramV2(level, program);
      expect(steps.length).toBe(1);
      expect(steps[0].errorType).toBe('undefined-variable');
      expect(steps[0].alive).toBe(false);
    });

    it('if(var-char = a) without declaration → undefined-variable error', () => {
      const program: Command[] = [{
        id: 'if-1', type: 'IF',
        condition: { type: 'comparison', variable: 'var-char', operator: '=', value: 'a' },
        body: [{ id: 'fwd-1', type: 'FORWARD' }],
        elseBody: [],
      }];
      const steps = executeProgramV2(level, program);
      expect(steps.length).toBe(1);
      expect(steps[0].errorType).toBe('undefined-variable');
      expect(steps[0].alive).toBe(false);
    });
  });

  describe('variable declarations work correctly', () => {
    it('VAR_NUM_DECL sets variable, then var-num++ works (no error)', () => {
      const grid = emptyGrid(1, 5);
      grid[0][4] = 'goal';
      const level = makeLevel({ grid, start: { row: 0, col: 0 }, goal: { row: 0, col: 4 } });

      const program: Command[] = [
        { id: 'decl', type: 'VAR_NUM_DECL', varValue: 5 },
        { id: 'inc-1', type: 'VAR_NUM_INC' },
        { id: 'fwd-1', type: 'FORWARD' },
      ];

      const steps = executeProgramV2(level, program);
      // VAR_NUM_DECL and VAR_NUM_INC produce no visible steps, only FORWARD does
      expect(steps.length).toBe(1);
      expect(steps[0].alive).toBe(true);
      expect(steps[0].errorType).toBeUndefined();
    });

    it('VAR_CHAR_DECL sets variable, then if(var-char = b) works', () => {
      const grid = emptyGrid(1, 5);
      grid[0][4] = 'goal';
      const level = makeLevel({ grid, start: { row: 0, col: 0 }, goal: { row: 0, col: 4 } });

      // var-char = 'b', then if(var-char = b) { forward() } else { turn-left() }
      const program: Command[] = [
        { id: 'decl', type: 'VAR_CHAR_DECL', varValue: 'b' },
        {
          id: 'if-1', type: 'IF',
          condition: { type: 'comparison', variable: 'var-char', operator: '=', value: 'b' },
          body: [{ id: 'fwd-1', type: 'FORWARD' }],
          elseBody: [{ id: 'turn-1', type: 'TURN_LEFT' }],
        },
      ];

      const steps = executeProgramV2(level, program);
      // Should execute the body (FORWARD) since var-char='b' == 'b'
      expect(steps.length).toBe(1);
      expect(steps[0].blockId).toBe('fwd-1');
      expect(steps[0].alive).toBe(true);
    });

    it('multiple VAR_NUM_DECL: last declaration wins', () => {
      const grid = emptyGrid(1, 10);
      grid[0][9] = 'goal';
      const level = makeLevel({ grid, start: { row: 0, col: 0 }, goal: { row: 0, col: 9 } });

      // var-num = 3, then var-num = 7, then while(var-num < 9) { forward(); var-num++ }
      // Should do 9-7=2 forward steps
      const program: Command[] = [
        { id: 'decl1', type: 'VAR_NUM_DECL', varValue: 3 },
        { id: 'decl2', type: 'VAR_NUM_DECL', varValue: 7 },
        {
          id: 'while-1', type: 'WHILE',
          condition: { type: 'comparison', variable: 'var-num', operator: '<', value: 9 },
          body: [
            { id: 'fwd-1', type: 'FORWARD' },
            { id: 'inc-1', type: 'VAR_NUM_INC' },
          ],
        },
      ];

      const steps = executeProgramV2(level, program);
      const forwardSteps = steps.filter((s) => s.blockId === 'fwd-1');
      expect(forwardSteps.length).toBe(2); // 9 - 7 = 2
    });
  });
});
