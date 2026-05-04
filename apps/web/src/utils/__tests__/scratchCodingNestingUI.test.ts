import { describe, it, expect } from 'vitest';
import {
  BLOCK_DEFINITIONS,
  type BlockDefinition,
  type BlockType,
  createBlock,
  computeBlockEfficiency,
  getLevel,
} from '../scratchCodingUtils';

// ════════════════════════════════════════════════════════════════════════════
// Helper to look up a block definition by type
// ════════════════════════════════════════════════════════════════════════════

function getDef(type: BlockType): BlockDefinition {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
  if (!def) throw new Error(`No definition for ${type}`);
  return def;
}

// ════════════════════════════════════════════════════════════════════════════
// 10.1 — Flat block definitions: label, color, parameter, hasBody
// ════════════════════════════════════════════════════════════════════════════

describe('10.1 — Flat block definitions', () => {
  it('MOVE_FORWARD has correct label, color, parameter config, and no body', () => {
    const def = getDef('MOVE_FORWARD');
    expect(def.label).toBe('scratchCoding.blocks.moveForward');
    expect(def.color).toBe('bg-blue-400');
    expect(def.hasParameter).toBe(true);
    expect(def.parameterDefault).toBe(1);
    expect(def.parameterMin).toBe(1);
    expect(def.parameterMax).toBe(10);
    expect(def.hasBody).toBe(false);
    expect(def.hasElseBody).toBe(false);
  });

  it('TURN_LEFT has correct label, color, no parameter, and no body', () => {
    const def = getDef('TURN_LEFT');
    expect(def.label).toBe('scratchCoding.blocks.turnLeft');
    expect(def.color).toBe('bg-blue-400');
    expect(def.hasParameter).toBe(false);
    expect(def.hasBody).toBe(false);
    expect(def.hasElseBody).toBe(false);
  });

  it('TURN_RIGHT has correct label, color, no parameter, and no body', () => {
    const def = getDef('TURN_RIGHT');
    expect(def.label).toBe('scratchCoding.blocks.turnRight');
    expect(def.color).toBe('bg-blue-400');
    expect(def.hasParameter).toBe(false);
    expect(def.hasBody).toBe(false);
    expect(def.hasElseBody).toBe(false);
  });

  it('ON_START has correct label, color, no parameter, and no body', () => {
    const def = getDef('ON_START');
    expect(def.label).toBe('scratchCoding.blocks.onStart');
    expect(def.color).toBe('bg-yellow-400');
    expect(def.hasParameter).toBe(false);
    expect(def.hasBody).toBe(false);
    expect(def.hasElseBody).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10.2 — Container block definitions: C-shape structure
// ════════════════════════════════════════════════════════════════════════════

describe('10.2 — Container block definitions (C-shape structure)', () => {
  it('REPEAT has body but no elseBody, and has a parameter', () => {
    const def = getDef('REPEAT');
    expect(def.hasBody).toBe(true);
    expect(def.hasElseBody).toBe(false);
    expect(def.hasParameter).toBe(true);
    expect(def.parameterDefault).toBe(2);
    expect(def.parameterMin).toBe(1);
    expect(def.parameterMax).toBe(10);
    expect(def.color).toBe('bg-orange-400');
  });

  it('IF_WALL_AHEAD has body and elseBody (for else zone), no parameter', () => {
    const def = getDef('IF_WALL_AHEAD');
    expect(def.hasBody).toBe(true);
    expect(def.hasElseBody).toBe(true);
    expect(def.hasParameter).toBe(false);
    expect(def.color).toBe('bg-orange-400');
  });

  it('IF_ON_GOAL has body but no elseBody, no parameter', () => {
    const def = getDef('IF_ON_GOAL');
    expect(def.hasBody).toBe(true);
    expect(def.hasElseBody).toBe(false);
    expect(def.hasParameter).toBe(false);
    expect(def.color).toBe('bg-orange-400');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10.3 — Empty container body zones (createBlock produces empty arrays)
// ════════════════════════════════════════════════════════════════════════════

describe('10.3 — Empty container body zones', () => {
  it('createBlock for REPEAT creates block with empty body and no elseBody', () => {
    const block = createBlock('REPEAT');
    expect(block.type).toBe('REPEAT');
    expect(block.body).toEqual([]);
    expect(block.elseBody).toBeUndefined();
    expect(block.parameter).toBe(2); // default
  });

  it('createBlock for IF_WALL_AHEAD creates block with empty body and empty elseBody', () => {
    const block = createBlock('IF_WALL_AHEAD');
    expect(block.type).toBe('IF_WALL_AHEAD');
    expect(block.body).toEqual([]);
    expect(block.elseBody).toEqual([]);
  });

  it('createBlock for IF_ON_GOAL creates block with empty body and no elseBody', () => {
    const block = createBlock('IF_ON_GOAL');
    expect(block.type).toBe('IF_ON_GOAL');
    expect(block.body).toEqual([]);
    expect(block.elseBody).toBeUndefined();
  });

  it('createBlock for flat blocks does not create body or elseBody', () => {
    const block = createBlock('MOVE_FORWARD');
    expect(block.type).toBe('MOVE_FORWARD');
    expect(block.body).toBeUndefined();
    expect(block.elseBody).toBeUndefined();
    expect(block.parameter).toBe(1); // default
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10.4 — Parameter input stopPropagation (structural verification)
//
// Without a DOM renderer we cannot test actual event propagation.
// We verify that parameterized block types are correctly flagged so the
// component knows to render an input with stopPropagation handlers.
// The actual stopPropagation behavior is implemented in BlockRenderer.tsx
// (FlatBlock and ContainerBlockWrapper) and verified via manual testing.
// ════════════════════════════════════════════════════════════════════════════

describe('10.4 — Parameter input configuration (stopPropagation structural check)', () => {
  it('MOVE_FORWARD is flagged as hasParameter so input renders with stopPropagation', () => {
    const def = getDef('MOVE_FORWARD');
    expect(def.hasParameter).toBe(true);
    expect(def.parameterMin).toBeGreaterThanOrEqual(1);
    expect(def.parameterMax).toBeGreaterThanOrEqual(def.parameterMin);
  });

  it('REPEAT is flagged as hasParameter so input renders with stopPropagation', () => {
    const def = getDef('REPEAT');
    expect(def.hasParameter).toBe(true);
    expect(def.parameterMin).toBeGreaterThanOrEqual(1);
    expect(def.parameterMax).toBeGreaterThanOrEqual(def.parameterMin);
  });

  it('TURN_LEFT is not parameterized — no input to conflict with removal', () => {
    const def = getDef('TURN_LEFT');
    expect(def.hasParameter).toBe(false);
  });

  it('IF_WALL_AHEAD is not parameterized — no input to conflict with removal', () => {
    const def = getDef('IF_WALL_AHEAD');
    expect(def.hasParameter).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10.5 — Efficiency indicators via computeBlockEfficiency
// ════════════════════════════════════════════════════════════════════════════

describe('10.5 — Efficiency indicators', () => {
  it('returns 1.0 when actual equals optimal (Perfect Efficiency)', () => {
    const result = computeBlockEfficiency([
      { optimalBlocks: 5, actualBlocks: 5 },
    ]);
    expect(result).toBe(1.0);
  });

  it('returns 1.0 when actual equals optimal across multiple levels', () => {
    const result = computeBlockEfficiency([
      { optimalBlocks: 5, actualBlocks: 5 },
      { optimalBlocks: 8, actualBlocks: 8 },
      { optimalBlocks: 3, actualBlocks: 3 },
    ]);
    expect(result).toBe(1.0);
  });

  it('returns correct ratio when within 2 blocks (Good Efficiency)', () => {
    // optimal=5, actual=7 → 5/7 ≈ 0.714
    const result = computeBlockEfficiency([
      { optimalBlocks: 5, actualBlocks: 7 },
    ]);
    expect(result).toBeCloseTo(5 / 7);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1.0);
  });

  it('returns correct ratio when actual exceeds optimal by 1 block', () => {
    // optimal=5, actual=6 → 5/6 ≈ 0.833
    const result = computeBlockEfficiency([
      { optimalBlocks: 5, actualBlocks: 6 },
    ]);
    expect(result).toBeCloseTo(5 / 6);
  });

  it('returns lower ratio when actual far exceeds optimal', () => {
    // optimal=5, actual=15 → 5/15 ≈ 0.333
    const result = computeBlockEfficiency([
      { optimalBlocks: 5, actualBlocks: 15 },
    ]);
    expect(result).toBeCloseTo(5 / 15);
    expect(result).toBeLessThan(0.5);
  });

  it('caps at 1.0 even if actual is less than optimal (edge case)', () => {
    // This shouldn't normally happen, but the formula caps at 1.0
    const result = computeBlockEfficiency([
      { optimalBlocks: 10, actualBlocks: 5 },
    ]);
    expect(result).toBe(1.0);
  });

  it('returns 1.0 for empty results array', () => {
    // sum of actual is 0 → returns 1.0
    const result = computeBlockEfficiency([]);
    expect(result).toBe(1.0);
  });

  it('aggregates across multiple levels correctly', () => {
    // sumOptimal = 5+8 = 13, sumActual = 7+10 = 17 → 13/17 ≈ 0.765
    const result = computeBlockEfficiency([
      { optimalBlocks: 5, actualBlocks: 7 },
      { optimalBlocks: 8, actualBlocks: 10 },
    ]);
    expect(result).toBeCloseTo(13 / 17);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10.6 — Level definitions: medium 7×7 with REPEAT, hard 8×8 with IF_WALL_AHEAD
// ════════════════════════════════════════════════════════════════════════════

describe('10.6 — Level definitions for nesting', () => {
  it('all medium levels are 8×8 with REPEAT in availableBlocks', () => {
    for (let i = 1; i <= 5; i++) {
      const level = getLevel('medium', i);
      expect(level.rows).toBe(8);
      expect(level.cols).toBe(8);
      expect(level.grid.length).toBe(8);
      for (const row of level.grid) {
        expect(row.length).toBe(8);
      }
      expect(level.availableBlocks).toContain('REPEAT');
    }
  });

  it('all hard levels are 12×12 with IF_WALL_AHEAD in availableBlocks', () => {
    for (let i = 1; i <= 5; i++) {
      const level = getLevel('hard', i);
      expect(level.rows).toBe(12);
      expect(level.cols).toBe(12);
      expect(level.grid.length).toBe(12);
      for (const row of level.grid) {
        expect(row.length).toBe(12);
      }
      expect(level.availableBlocks).toContain('IF_WALL_AHEAD');
    }
  });

  it('medium levels have optimalBlocks <= maxBlocks', () => {
    for (let i = 1; i <= 5; i++) {
      const level = getLevel('medium', i);
      expect(level.optimalBlocks).toBeLessThanOrEqual(level.maxBlocks);
    }
  });

  it('hard levels have optimalBlocks <= maxBlocks', () => {
    for (let i = 1; i <= 5; i++) {
      const level = getLevel('hard', i);
      expect(level.optimalBlocks).toBeLessThanOrEqual(level.maxBlocks);
    }
  });
});
