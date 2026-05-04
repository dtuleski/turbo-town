import { describe, it, expect } from 'vitest';
import {
  getLevel,
  executeProgram,
  type Block,
} from '../scratchCodingUtils';

/**
 * Helper to create a block with a unique ID.
 * For testing purposes, we use simple sequential IDs.
 */
let blockId = 0;
function b(type: Block['type'], parameter?: number, body?: Block[], elseBody?: Block[]): Block {
  const block: Block = { id: `test-${++blockId}`, type };
  if (parameter !== undefined) block.parameter = parameter;
  if (body !== undefined) block.body = body;
  if (elseBody !== undefined) block.elseBody = elseBody;
  return block;
}

function resetIds() {
  blockId = 0;
}

describe('Medium level solvability via executeProgram', () => {
  // M1 (8×8): REPEAT(3){ MF(2), TR, MF(2), TL } → (0,0)→(6,6)
  it('Medium 1: optimal solution reaches goal', () => {
    resetIds();
    const level = getLevel('medium', 1);
    const program: Block[] = [
      b('REPEAT', 3, [
        b('MOVE_FORWARD', 2),
        b('TURN_RIGHT'),
        b('MOVE_FORWARD', 2),
        b('TURN_LEFT'),
      ]),
    ];
    const steps = executeProgram(level, program);
    const last = steps[steps.length - 1];
    expect(last.reachedGoal).toBe(true);
    expect(last.alive).toBe(true);
    expect(last.pos).toEqual(level.goal);
  });

  // M2 (8×8): right 7, TR, down 1, TR, left 7, TL, down 1, TL, right 7 → (2,7)
  it('Medium 2: optimal solution reaches goal', () => {
    resetIds();
    const level = getLevel('medium', 2);
    const program: Block[] = [
      b('MOVE_FORWARD', 7),
      b('TURN_RIGHT'),
      b('MOVE_FORWARD', 1),
      b('TURN_RIGHT'),
      b('MOVE_FORWARD', 7),
      b('TURN_LEFT'),
      b('MOVE_FORWARD', 1),
      b('TURN_LEFT'),
      b('MOVE_FORWARD', 7),
    ];
    const steps = executeProgram(level, program);
    const last = steps[steps.length - 1];
    expect(last.reachedGoal).toBe(true);
    expect(last.alive).toBe(true);
    expect(last.pos).toEqual(level.goal);
  });

  // M3 (8×8 spiral): The inner area is fully walled off — this level is designed
  // for the terminal command engine. Verify structure only.
  it('Medium 3: level has valid structure', () => {
    resetIds();
    const level = getLevel('medium', 3);
    expect(level.rows).toBe(8);
    expect(level.cols).toBe(8);
    expect(level.start).toEqual({ row: 0, col: 0 });
    expect(level.goal).toEqual({ row: 5, col: 2 });
    expect(level.grid[level.goal.row][level.goal.col]).toBe('goal');
  });

  // M4 (8×8 with walls): MF(3), TR, MF(3), TL, MF(3), TR, MF(3) → (6,6)
  it('Medium 4: optimal solution reaches goal', () => {
    resetIds();
    const level = getLevel('medium', 4);
    const program: Block[] = [
      b('MOVE_FORWARD', 3),
      b('TURN_RIGHT'),
      b('MOVE_FORWARD', 3),
      b('TURN_LEFT'),
      b('MOVE_FORWARD', 3),
      b('TURN_RIGHT'),
      b('MOVE_FORWARD', 3),
    ];
    const steps = executeProgram(level, program);
    const last = steps[steps.length - 1];
    expect(last.reachedGoal).toBe(true);
    expect(last.alive).toBe(true);
    expect(last.pos).toEqual(level.goal);
  });

  // M5 (8×8 diagonal staircase with walls): REPEAT(6){ MF(1), TR, MF(1), TL } → (6,6)
  it('Medium 5: optimal solution reaches goal', () => {
    resetIds();
    const level = getLevel('medium', 5);
    const program: Block[] = [
      b('REPEAT', 6, [
        b('MOVE_FORWARD', 1),
        b('TURN_RIGHT'),
        b('MOVE_FORWARD', 1),
        b('TURN_LEFT'),
      ]),
    ];
    const steps = executeProgram(level, program);
    const last = steps[steps.length - 1];
    expect(last.reachedGoal).toBe(true);
    expect(last.alive).toBe(true);
    expect(last.pos).toEqual(level.goal);
  });
});

describe('Hard level structure validation', () => {
  // Hard levels now use 12×12 grids with generateObstacles: true.
  // Obstacles are placed randomly at runtime, so deterministic Block programs
  // cannot reliably solve them. We verify structural properties instead.
  for (let i = 1; i <= 5; i++) {
    it(`Hard ${i}: has valid structure for dynamic obstacle levels`, () => {
      resetIds();
      const level = getLevel('hard', i);
      // 12×12 grid
      expect(level.rows).toBe(12);
      expect(level.cols).toBe(12);
      // generateObstacles flag is set
      expect(level.generateObstacles).toBe(true);
      expect(level.obstacleCount).toBeGreaterThan(0);
      // Start is on an empty cell
      expect(level.grid[level.start.row][level.start.col]).toBe('empty');
      // Goal is on a goal cell
      expect(level.grid[level.goal.row][level.goal.col]).toBe('goal');
      // Available commands include hard-level commands
      expect(level.availableCommands).toBeDefined();
      expect(level.availableCommands).toContain('JUMP');
      expect(level.availableCommands).toContain('IF');
      expect(level.availableCommands).toContain('WHILE');
    });
  }
});
