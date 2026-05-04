import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  countAllBlocks,
  insertBlockAtPath,
  removeBlockAtPath,
  updateParameterAtPath,
  getNestingDepth,
  computeBlockEfficiency,
  type Block,
  type BlockType,
  type BlockPath,
} from '../scratchCodingUtils';

// ── Random Program Tree Generator ──────────────────────────────────────────

const FLAT_TYPES: BlockType[] = ['MOVE_FORWARD', 'TURN_LEFT', 'TURN_RIGHT'];
const CONTAINER_TYPES: BlockType[] = ['REPEAT', 'IF_WALL_AHEAD', 'IF_ON_GOAL'];

let idCounter = 0;
function nextId(): string {
  return `test-block-${++idCounter}`;
}

/**
 * Creates a fast-check arbitrary that generates a random Block[] tree.
 * - maxDepth: maximum nesting depth remaining (0 = flat blocks only)
 * - maxWidth: maximum number of blocks at each level (0-4)
 */
function blockTreeArb(maxDepth: number, maxWidth: number): fc.Arbitrary<Block[]> {
  return fc.integer({ min: 0, max: maxWidth }).chain((width) => {
    if (width === 0) return fc.constant([] as Block[]);
    const blockArbs: fc.Arbitrary<Block>[] = [];
    for (let i = 0; i < width; i++) {
      blockArbs.push(blockArb(maxDepth));
    }
    return fc.tuple(...(blockArbs as [fc.Arbitrary<Block>, ...fc.Arbitrary<Block>[]]));
  }).map((result) => {
    if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && 'id' in (result[0] as object)) {
      return result as Block[];
    }
    return result as Block[];
  });
}

function blockArb(maxDepth: number): fc.Arbitrary<Block> {
  if (maxDepth <= 0) {
    return flatBlockArb();
  }
  // Mix flat and container blocks: ~60% flat, ~40% container
  return fc.oneof(
    { weight: 3, arbitrary: flatBlockArb() },
    { weight: 2, arbitrary: containerBlockArb(maxDepth) },
  );
}

function flatBlockArb(): fc.Arbitrary<Block> {
  return fc.record({
    type: fc.constantFrom(...FLAT_TYPES),
    parameter: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
  }).map(({ type, parameter }) => {
    const block: Block = { id: nextId(), type };
    if (type === 'MOVE_FORWARD') {
      block.parameter = parameter ?? 1;
    }
    return block;
  });
}

function containerBlockArb(maxDepth: number): fc.Arbitrary<Block> {
  return fc.constantFrom(...CONTAINER_TYPES).chain((type) => {
    const bodyArb = blockTreeArb(maxDepth - 1, 4);
    if (type === 'IF_WALL_AHEAD') {
      return fc.tuple(bodyArb, blockTreeArb(maxDepth - 1, 4)).map(([body, elseBody]) => {
        const block: Block = { id: nextId(), type, body, elseBody };
        return block;
      });
    }
    if (type === 'REPEAT') {
      return fc.tuple(bodyArb, fc.integer({ min: 1, max: 10 })).map(([body, param]) => {
        const block: Block = { id: nextId(), type, parameter: param, body };
        return block;
      });
    }
    // IF_ON_GOAL
    return bodyArb.map((body) => {
      const block: Block = { id: nextId(), type, body };
      return block;
    });
  });
}

/** Standard tree generator: depth 0-3, width 0-4 */
const programTreeArb = blockTreeArb(3, 4);

/** Tree with at least one block */
const nonEmptyTreeArb = programTreeArb.filter((tree) => countAllBlocks(tree) > 0);

// ── Helper Functions ───────────────────────────────────────────────────────

/** Collect all valid paths to existing blocks in a tree */
function collectBlockPaths(blocks: Block[], prefix: BlockPath = []): BlockPath[] {
  const paths: BlockPath[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const path = [...prefix, i];
    paths.push(path);
    const block = blocks[i];
    if (block.body && block.body.length > 0) {
      paths.push(...collectBlockPaths(block.body, [...path, 0]));
    }
    if (block.elseBody && block.elseBody.length > 0) {
      paths.push(...collectBlockPaths(block.elseBody, [...path, 1]));
    }
  }
  return paths;
}

/** Generate all valid insertion paths for a tree (positions where a block can be inserted) */
function collectInsertionPaths(blocks: Block[], prefix: BlockPath = []): BlockPath[] {
  const paths: BlockPath[] = [];
  // Can insert at any index 0..blocks.length at this level
  for (let i = 0; i <= blocks.length; i++) {
    paths.push([...prefix, i]);
  }
  // Can also insert into body/elseBody of container blocks
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.body) {
      paths.push(...collectInsertionPaths(block.body, [...prefix, i, 0]));
    }
    if (block.elseBody) {
      paths.push(...collectInsertionPaths(block.elseBody, [...prefix, i, 1]));
    }
  }
  return paths;
}

/** Get the block at a given path in the tree */
function getBlockAtPath(blocks: Block[], path: BlockPath): Block | null {
  if (path.length === 0) return null;
  if (path.length === 1) {
    const idx = path[0];
    if (idx < 0 || idx >= blocks.length) return null;
    return blocks[idx];
  }
  const containerIndex = path[0];
  const branchSelector = path[1];
  const rest = path.slice(2);
  if (containerIndex < 0 || containerIndex >= blocks.length) return null;
  const container = blocks[containerIndex];
  const branch = branchSelector === 0 ? container.body : container.elseBody;
  if (!branch) return null;
  return getBlockAtPath(branch, rest);
}

/** Count the subtree size of a block (1 for flat, 1 + deep count for containers) */
function subtreeSize(block: Block): number {
  let count = 1;
  if (block.body) count += countAllBlocks(block.body);
  if (block.elseBody) count += countAllBlocks(block.elseBody);
  return count;
}

/** Collect all blocks from a tree (flat list) */
function collectAllBlocks(blocks: Block[]): Block[] {
  const result: Block[] = [];
  for (const block of blocks) {
    result.push(block);
    if (block.body) result.push(...collectAllBlocks(block.body));
    if (block.elseBody) result.push(...collectAllBlocks(block.elseBody));
  }
  return result;
}

/** Collect paths to blocks that have parameters */
function collectParameterizedPaths(blocks: Block[], prefix: BlockPath = []): BlockPath[] {
  const paths: BlockPath[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const path = [...prefix, i];
    if (block.parameter !== undefined) {
      paths.push(path);
    }
    if (block.body && block.body.length > 0) {
      paths.push(...collectParameterizedPaths(block.body, [...path, 0]));
    }
    if (block.elseBody && block.elseBody.length > 0) {
      paths.push(...collectParameterizedPaths(block.elseBody, [...path, 1]));
    }
  }
  return paths;
}

/** Deep clone a block tree for comparison */
function deepCloneTree(blocks: Block[]): Block[] {
  return blocks.map((b) => {
    const clone: Block = { id: b.id, type: b.type };
    if (b.parameter !== undefined) clone.parameter = b.parameter;
    if (b.body) clone.body = deepCloneTree(b.body);
    if (b.elseBody) clone.elseBody = deepCloneTree(b.elseBody);
    return clone;
  });
}

// ── Property Tests ─────────────────────────────────────────────────────────

describe('Space Coder Nesting Editor — Property-Based Tests', () => {

  // ── Property 1: Insert-remove round-trip ─────────────────────────────────
  // Feature: space-coder-nesting-editor, Property 1: Insert-remove round-trip
  // **Validates: Requirements 9.4**
  describe('Property 1: Insert-remove round-trip', () => {
    it('for any valid tree and path, insert then remove returns original tree', () => {
      fc.assert(
        fc.property(nonEmptyTreeArb, fc.integer({ min: 0, max: 999 }), (tree, seed) => {
          // Collect valid insertion paths that won't exceed depth 3
          const insertionPaths = collectInsertionPaths(tree).filter(
            (p) => getNestingDepth(p) <= 3,
          );
          if (insertionPaths.length === 0) return; // skip if no valid paths

          const pathIndex = seed % insertionPaths.length;
          const insertPath = insertionPaths[pathIndex];

          const newBlock: Block = { id: nextId(), type: 'TURN_LEFT' };
          const maxBlocks = countAllBlocks(tree) + 1; // ensure room for one more

          const originalClone = deepCloneTree(tree);
          const afterInsert = insertBlockAtPath(tree, insertPath, newBlock, maxBlocks);
          if (afterInsert === null) return; // insertion rejected, skip

          // The inserted block is now at insertPath — remove it
          const afterRemove = removeBlockAtPath(afterInsert, insertPath);

          // Compare structurally (ignoring reference equality)
          expect(deepCloneTree(afterRemove)).toEqual(originalClone);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 2: Insertion places block at correct path ───────────────────
  // Feature: space-coder-nesting-editor, Property 2: Insertion places block at correct path
  // **Validates: Requirements 2.2, 2.3, 9.2**
  describe('Property 2: Insertion places block at correct path', () => {
    it('for any tree and valid path, the inserted block appears at the expected location', () => {
      fc.assert(
        fc.property(programTreeArb, fc.integer({ min: 0, max: 999 }), (tree, seed) => {
          const insertionPaths = collectInsertionPaths(tree).filter(
            (p) => getNestingDepth(p) <= 3,
          );
          if (insertionPaths.length === 0) return;

          const pathIndex = seed % insertionPaths.length;
          const insertPath = insertionPaths[pathIndex];

          const newBlock: Block = { id: nextId(), type: 'MOVE_FORWARD', parameter: 3 };
          const maxBlocks = countAllBlocks(tree) + 1;

          const result = insertBlockAtPath(tree, insertPath, newBlock, maxBlocks);
          if (result === null) return;

          const found = getBlockAtPath(result, insertPath);
          expect(found).not.toBeNull();
          expect(found!.id).toBe(newBlock.id);
          expect(found!.type).toBe(newBlock.type);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 3: countAllBlocks recursive invariant ───────────────────────
  // Feature: space-coder-nesting-editor, Property 3: countAllBlocks recursive invariant
  // **Validates: Requirements 3.1, 3.5, 9.1, 9.5**
  describe('Property 3: countAllBlocks recursive invariant', () => {
    it('count equals top-level length plus sum of recursive counts of body/elseBody', () => {
      fc.assert(
        fc.property(programTreeArb, (tree) => {
          const totalCount = countAllBlocks(tree);

          // Manually compute: top-level count + recursive body/elseBody counts
          let expectedCount = tree.length;
          for (const block of tree) {
            if (block.body) {
              expectedCount += countAllBlocks(block.body);
            }
            if (block.elseBody) {
              expectedCount += countAllBlocks(block.elseBody);
            }
          }

          expect(totalCount).toBe(expectedCount);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 4: Count decreases by subtree size on removal ───────────────
  // Feature: space-coder-nesting-editor, Property 4: Count decreases by subtree size on removal
  // **Validates: Requirements 3.4, 2.6, 2.7, 9.3**
  describe('Property 4: Count decreases by subtree size on removal', () => {
    it('count after removal equals original count minus removed subtree count', () => {
      fc.assert(
        fc.property(nonEmptyTreeArb, fc.integer({ min: 0, max: 999 }), (tree, seed) => {
          const blockPaths = collectBlockPaths(tree);
          if (blockPaths.length === 0) return;

          const pathIndex = seed % blockPaths.length;
          const removePath = blockPaths[pathIndex];

          const blockToRemove = getBlockAtPath(tree, removePath);
          if (!blockToRemove) return;

          const originalCount = countAllBlocks(tree);
          const removedSize = subtreeSize(blockToRemove);
          const afterRemove = removeBlockAtPath(tree, removePath);
          const newCount = countAllBlocks(afterRemove);

          expect(newCount).toBe(originalCount - removedSize);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 5: Insertion rejected at max capacity ───────────────────────
  // Feature: space-coder-nesting-editor, Property 5: Insertion rejected at max capacity
  // **Validates: Requirements 3.3**
  describe('Property 5: Insertion rejected at max capacity', () => {
    it('for any tree at max capacity, insertBlockAtPath returns null', () => {
      fc.assert(
        fc.property(nonEmptyTreeArb, fc.integer({ min: 0, max: 999 }), (tree, seed) => {
          const currentCount = countAllBlocks(tree);
          const maxBlocks = currentCount; // at capacity

          const insertionPaths = collectInsertionPaths(tree).filter(
            (p) => getNestingDepth(p) <= 3,
          );
          if (insertionPaths.length === 0) return;

          const pathIndex = seed % insertionPaths.length;
          const insertPath = insertionPaths[pathIndex];

          const newBlock: Block = { id: nextId(), type: 'TURN_RIGHT' };
          const result = insertBlockAtPath(tree, insertPath, newBlock, maxBlocks);

          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 6: updateParameterAtPath changes only target ────────────────
  // Feature: space-coder-nesting-editor, Property 6: updateParameterAtPath changes only target
  // **Validates: Requirements 4.3**
  describe('Property 6: updateParameterAtPath changes only target', () => {
    it('only the target block parameter changes, all other blocks remain identical', () => {
      // Generate trees that have at least one parameterized block
      const treeWithParamsArb = nonEmptyTreeArb.filter((tree) => {
        return collectParameterizedPaths(tree).length > 0;
      });

      fc.assert(
        fc.property(
          treeWithParamsArb,
          fc.integer({ min: 0, max: 999 }),
          fc.integer({ min: 1, max: 10 }),
          (tree, seed, newValue) => {
            const paramPaths = collectParameterizedPaths(tree);
            if (paramPaths.length === 0) return;

            const pathIndex = seed % paramPaths.length;
            const targetPath = paramPaths[pathIndex];

            const targetBlock = getBlockAtPath(tree, targetPath);
            if (!targetBlock || targetBlock.parameter === undefined) return;

            // Use a value different from the current one
            const actualNewValue = targetBlock.parameter === newValue
              ? (newValue % 10) + 1
              : newValue;

            const updatedTree = updateParameterAtPath(tree, targetPath, actualNewValue);

            // Verify the target block's parameter changed
            const updatedTarget = getBlockAtPath(updatedTree, targetPath);
            expect(updatedTarget).not.toBeNull();
            expect(updatedTarget!.parameter).toBe(actualNewValue);

            // Verify all other blocks remain identical
            const originalBlocks = collectAllBlocks(tree);
            const updatedBlocks = collectAllBlocks(updatedTree);

            expect(updatedBlocks.length).toBe(originalBlocks.length);

            for (let i = 0; i < originalBlocks.length; i++) {
              const orig = originalBlocks[i];
              const upd = updatedBlocks[i];
              expect(upd.id).toBe(orig.id);
              expect(upd.type).toBe(orig.type);
              if (orig.id === targetBlock.id) {
                // This is the target — parameter should be the new value
                expect(upd.parameter).toBe(actualNewValue);
              } else {
                // All other blocks should have unchanged parameters
                expect(upd.parameter).toBe(orig.parameter);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 7: Block efficiency score ───────────────────────────────────
  // Feature: space-coder-nesting-editor, Property 7: Block efficiency score
  // **Validates: Requirements 7.1**
  describe('Property 7: Block efficiency score', () => {
    it('efficiency equals min(1.0, sumOptimal/sumActual) and is in (0, 1.0]', () => {
      const levelResultArb = fc.record({
        optimalBlocks: fc.integer({ min: 1, max: 50 }),
        actualBlocks: fc.integer({ min: 1, max: 100 }),
      }).filter((r) => r.actualBlocks >= r.optimalBlocks && r.optimalBlocks > 0);

      const resultsArb = fc.array(levelResultArb, { minLength: 1, maxLength: 10 });

      fc.assert(
        fc.property(resultsArb, (results) => {
          const efficiency = computeBlockEfficiency(results);

          // Compute expected value
          const sumOptimal = results.reduce((s, r) => s + r.optimalBlocks, 0);
          const sumActual = results.reduce((s, r) => s + r.actualBlocks, 0);
          const expected = Math.min(1.0, sumOptimal / sumActual);

          expect(efficiency).toBeCloseTo(expected, 10);

          // Must be in range (0, 1.0]
          expect(efficiency).toBeGreaterThan(0);
          expect(efficiency).toBeLessThanOrEqual(1.0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
