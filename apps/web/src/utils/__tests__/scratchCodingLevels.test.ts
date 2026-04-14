import { describe, it, expect } from 'vitest';
import {
  getLevel,
  getTotalLevels,
  inBounds,
  DIR_DELTA,
  TURN_LEFT_MAP,
  TURN_RIGHT_MAP,
  type Level,
  type Direction,
  type Position,
  type Difficulty,
} from '../scratchCodingUtils';

// Simple path tracer to verify levels are solvable
function tracePath(
  level: Level,
  instructions: Array<{ type: 'move'; steps: number } | { type: 'turnLeft' } | { type: 'turnRight' }>
): { finalPos: Position; finalDir: Direction; hitWall: boolean; outOfBounds: boolean } {
  let pos = { ...level.start };
  let dir = level.startDir;

  for (const inst of instructions) {
    if (inst.type === 'turnLeft') {
      dir = TURN_LEFT_MAP[dir];
    } else if (inst.type === 'turnRight') {
      dir = TURN_RIGHT_MAP[dir];
    } else if (inst.type === 'move') {
      for (let i = 0; i < inst.steps; i++) {
        const delta = DIR_DELTA[dir];
        const next = { row: pos.row + delta.row, col: pos.col + delta.col };
        if (!inBounds(next, level)) {
          return { finalPos: pos, finalDir: dir, hitWall: false, outOfBounds: true };
        }
        if (level.grid[next.row][next.col] === 'wall') {
          return { finalPos: pos, finalDir: dir, hitWall: true, outOfBounds: false };
        }
        pos = next;
      }
    }
  }

  return { finalPos: pos, finalDir: dir, hitWall: false, outOfBounds: false };
}

describe('Level data structures', () => {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  it('should have 5 levels per difficulty', () => {
    for (const d of difficulties) {
      expect(getTotalLevels(d)).toBe(5);
    }
  });

  it('should have correct grid dimensions per difficulty', () => {
    const expectedSize: Record<Difficulty, number> = { easy: 6, medium: 7, hard: 8 };
    for (const d of difficulties) {
      for (let i = 1; i <= 5; i++) {
        const level = getLevel(d, i);
        expect(level.rows).toBe(expectedSize[d]);
        expect(level.cols).toBe(expectedSize[d]);
        expect(level.grid.length).toBe(expectedSize[d]);
        for (const row of level.grid) {
          expect(row.length).toBe(expectedSize[d]);
        }
      }
    }
  });

  it('should have start position on an empty cell', () => {
    for (const d of difficulties) {
      for (let i = 1; i <= 5; i++) {
        const level = getLevel(d, i);
        const startCell = level.grid[level.start.row][level.start.col];
        expect(startCell).toBe('empty');
      }
    }
  });

  it('should have goal position on a goal cell', () => {
    for (const d of difficulties) {
      for (let i = 1; i <= 5; i++) {
        const level = getLevel(d, i);
        const goalCell = level.grid[level.goal.row][level.goal.col];
        expect(goalCell).toBe('goal');
      }
    }
  });

  it('should have exactly one goal cell in each grid', () => {
    for (const d of difficulties) {
      for (let i = 1; i <= 5; i++) {
        const level = getLevel(d, i);
        let goalCount = 0;
        for (const row of level.grid) {
          for (const cell of row) {
            if (cell === 'goal') goalCount++;
          }
        }
        expect(goalCount).toBe(1);
      }
    }
  });

  it('should have optimalBlocks <= maxBlocks', () => {
    for (const d of difficulties) {
      for (let i = 1; i <= 5; i++) {
        const level = getLevel(d, i);
        expect(level.optimalBlocks).toBeLessThanOrEqual(level.maxBlocks);
      }
    }
  });

  it('should have correct levelNumber', () => {
    for (const d of difficulties) {
      for (let i = 1; i <= 5; i++) {
        const level = getLevel(d, i);
        expect(level.levelNumber).toBe(i);
      }
    }
  });

  it('should throw for invalid level numbers', () => {
    expect(() => getLevel('easy', 0)).toThrow();
    expect(() => getLevel('easy', 6)).toThrow();
    expect(() => getLevel('medium', -1)).toThrow();
  });
});

describe('Level solvability — path traces', () => {
  // E1: Straight line. (0,0)→right→(0,5). MOVE_FORWARD(5)
  it('Easy 1: straight line is solvable', () => {
    const level = getLevel('easy', 1);
    const result = tracePath(level, [{ type: 'move', steps: 5 }]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // E2: L-shape. right 3, turn right, down 3
  it('Easy 2: L-shape is solvable', () => {
    const level = getLevel('easy', 2);
    const result = tracePath(level, [
      { type: 'move', steps: 3 },
      { type: 'turnRight' },
      { type: 'move', steps: 3 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // E3: U-turn. right 4, turn right, down 2, turn right, left 4
  it('Easy 3: U-turn is solvable', () => {
    const level = getLevel('easy', 3);
    const result = tracePath(level, [
      { type: 'move', steps: 4 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 4 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // E4: Zigzag. right 3, down 4, right 1 → but let me verify
  it('Easy 4: zigzag is solvable', () => {
    const level = getLevel('easy', 4);
    // Path: right 3→(0,3), turn right, down 4→(4,3), turn right (now left), 
    // Actually let me trace more carefully. Start (0,0) facing right.
    // right 3 → (0,3). turn right → facing down. down 4 → (4,3). turn left → facing right. right 1 → (4,4)
    const result = tracePath(level, [
      { type: 'move', steps: 3 },
      { type: 'turnRight' },
      { type: 'move', steps: 4 },
      { type: 'turnLeft' },
      { type: 'move', steps: 1 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // E5: S-curve. right 4, down 2, left 4, down 2, right 5, down 1
  it('Easy 5: S-curve is solvable', () => {
    const level = getLevel('easy', 5);
    const result = tracePath(level, [
      { type: 'move', steps: 4 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 4 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 5 },
      { type: 'turnRight' },
      { type: 'move', steps: 1 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // M1: Repeat intro. right 6
  it('Medium 1: repeat intro is solvable', () => {
    const level = getLevel('medium', 1);
    const result = tracePath(level, [{ type: 'move', steps: 6 }]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // M2: Square walk. (3,0)→up. up 3→(0,0), turn right, right 3→(0,3)
  it('Medium 2: square walk is solvable', () => {
    const level = getLevel('medium', 2);
    const result = tracePath(level, [
      { type: 'move', steps: 3 },
      { type: 'turnRight' },
      { type: 'move', steps: 3 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // M3: Staircase corridor. right 2, down 2, right 2, down 2, right 2, down 2
  it('Medium 3: staircase corridor is solvable', () => {
    const level = getLevel('medium', 3);
    const result = tracePath(level, [
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // M4: Diagonal staircase. (6,0)→up. up 2, right 2, up 2, right 2, up 2, right 2
  it('Medium 4: diagonal staircase is solvable', () => {
    const level = getLevel('medium', 4);
    const result = tracePath(level, [
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // M5: Efficiency challenge. right 1, down 2, right 2, down 2, right 2, down 2, right 1
  it('Medium 5: efficiency challenge is solvable', () => {
    const level = getLevel('medium', 5);
    const result = tracePath(level, [
      { type: 'move', steps: 1 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 1 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // H1: Conditional intro. right 2, down 1, right 2, up 1, right 3
  it('Hard 1: conditional intro is solvable', () => {
    const level = getLevel('hard', 1);
    const result = tracePath(level, [
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 1 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 1 },
      { type: 'turnRight' },
      { type: 'move', steps: 3 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // H2: Wall follower. right 3, down 7, left 3
  it('Hard 2: wall follower is solvable', () => {
    const level = getLevel('hard', 2);
    const result = tracePath(level, [
      { type: 'move', steps: 3 },
      { type: 'turnRight' },
      { type: 'move', steps: 7 },
      { type: 'turnRight' },
      { type: 'move', steps: 3 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // H3: Branching maze. right 5, down 2, left 3, down 2, right 5, down 3
  it('Hard 3: branching maze is solvable', () => {
    const level = getLevel('hard', 3);
    const result = tracePath(level, [
      { type: 'move', steps: 5 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 3 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 5 },
      { type: 'turnRight' },
      { type: 'move', steps: 3 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // H4: S-curve. right 7, down 3, left 7, down 3, right 7, down 1
  it('Hard 4: repeat + conditional combo is solvable', () => {
    const level = getLevel('hard', 4);
    const result = tracePath(level, [
      { type: 'move', steps: 7 },
      { type: 'turnRight' },
      { type: 'move', steps: 3 },
      { type: 'turnRight' },
      { type: 'move', steps: 7 },
      { type: 'turnLeft' },
      { type: 'move', steps: 3 },
      { type: 'turnLeft' },
      { type: 'move', steps: 7 },
      { type: 'turnRight' },
      { type: 'move', steps: 1 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });

  // H5: Ultimate challenge. right 4, down 2, left 4, down 2, right 4, down 2, right 3, down 1
  it('Hard 5: ultimate challenge is solvable', () => {
    const level = getLevel('hard', 5);
    const result = tracePath(level, [
      { type: 'move', steps: 4 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnRight' },
      { type: 'move', steps: 4 },
      { type: 'turnLeft' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 4 },
      { type: 'turnRight' },
      { type: 'move', steps: 2 },
      { type: 'turnLeft' },
      { type: 'move', steps: 3 },
      { type: 'turnRight' },
      { type: 'move', steps: 1 },
    ]);
    expect(result.hitWall).toBe(false);
    expect(result.outOfBounds).toBe(false);
    expect(result.finalPos).toEqual(level.goal);
  });
});
