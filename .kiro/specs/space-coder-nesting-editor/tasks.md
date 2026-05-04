# Tasks: Space Coder Nesting Editor

## Task 1: Tree Manipulation Utilities
- [x] 1.1 Add `BlockPath` type alias and `countAllBlocks` function to `scratchCodingUtils.ts` that recursively counts all blocks in a program tree including nested body and elseBody arrays
- [x] 1.2 Add `insertBlockAtPath` function that inserts a block at a given path in the tree, returning a new tree or null if maxBlocks would be exceeded or nesting depth > 3
- [x] 1.3 Add `removeBlockAtPath` function that removes the block at a given path, returning a new tree (or original if path is invalid)
- [x] 1.4 Add `updateParameterAtPath` function that updates a block's parameter at a given path, returning a new tree
- [x] 1.5 Add `getNestingDepth` helper that computes nesting depth from a BlockPath
- [x] 1.6 Add `computeBlockEfficiency` function that computes min(1.0, sumOptimal / sumActual) from an array of level results
- [x] 1.7 Export all new functions and the BlockPath type from scratchCodingUtils.ts

## Task 2: Property-Based Tests for Tree Utilities
- [x] 2.1 Install fast-check as a dev dependency in apps/web
- [x] 2.2 Create a random program tree generator using fast-check arbitraries that produces Block[] trees with depth 0-3 and width 0-4, mixing flat and container blocks
- [x] 2.3 [PBT] Write property test: Insert-remove round-trip — for any valid tree and path, insert then remove returns original tree (Property 1, min 100 iterations)
- [x] 2.4 [PBT] Write property test: Insertion places block at correct path — for any tree and valid path, the inserted block appears at the expected location (Property 2, min 100 iterations)
- [x] 2.5 [PBT] Write property test: countAllBlocks recursive invariant — for any tree, count equals top-level length plus sum of recursive counts of body/elseBody (Property 3, min 100 iterations)
- [x] 2.6 [PBT] Write property test: Count decreases by subtree size on removal — for any tree and valid path, count after removal equals original count minus removed subtree count (Property 4, min 100 iterations)
- [x] 2.7 [PBT] Write property test: Insertion rejected at max capacity — for any tree at max capacity, insertBlockAtPath returns null (Property 5, min 100 iterations)
- [x] 2.8 [PBT] Write property test: updateParameterAtPath changes only target — for any tree with parameterized blocks, only the target block's parameter changes (Property 6, min 100 iterations)
- [x] 2.9 [PBT] Write property test: Block efficiency score — for any array of (optimal, actual) pairs, efficiency equals min(1.0, sumOptimal/sumActual) and is in (0, 1.0] (Property 7, min 100 iterations)

## Task 3: BlockRenderer and ContainerBlockWrapper Components
- [x] 3.1 Create `BlockRenderer` component that renders a single block with its path, highlight state, remove handler, and parameter change handler — for flat blocks, render the existing colored pill with parameter input and remove button
- [x] 3.2 Create `ContainerBlockWrapper` component that renders the C-shaped visual: top bar (label + parameter + remove), body droppable zone with vertically stacked children, optional else droppable zone (IF_WALL_AHEAD only), and bottom bar
- [x] 3.3 Wire `BlockRenderer` to recursively render container block children via `ContainerBlockWrapper`, passing incremented paths to each child
- [x] 3.4 Add empty-state placeholder with localized "Drop blocks here" hint text inside empty body/elseBody zones
- [x] 3.5 Add visual indentation that increases with nesting depth (left padding/margin per depth level)
- [x] 3.6 Ensure parameter inputs on nested blocks call `e.stopPropagation()` to prevent triggering block removal on click

## Task 4: Rework BlockEditor with Nested DnD
- [x] 4.1 Refactor `BlockEditor` to render blocks using `BlockRenderer` instead of the inline `renderBlock` function
- [x] 4.2 Replace `program.length` with `countAllBlocks(program)` for the block count display and max-blocks check
- [x] 4.3 Update the droppable zone setup: keep `"block-editor"` as the top-level drop zone, add nested droppable zones inside `ContainerBlockWrapper` with encoded IDs (`drop:body:path:index` and `drop:else:path:index`)
- [x] 4.4 Rework `handleDragEnd` to parse droppable zone IDs, compute the target BlockPath, check nesting depth ≤ 3, and call `insertBlockAtPath`
- [x] 4.5 Add visual feedback when a container block drop would exceed max nesting depth (show localized "max depth reached" message briefly)
- [x] 4.6 Update block removal: clicking a flat block calls `removeBlockAtPath` with its path; clicking a container's top bar removes the entire container and its children
- [x] 4.7 Update `handleParameterChange` to use `updateParameterAtPath` with the block's path instead of flat array map
- [x] 4.8 Update the "Clear All" button to reset program to `[]` (unchanged behavior, but verify it works with nested trees)

## Task 5: Execution Highlighting for Nested Blocks
- [x] 5.1 Verify that the existing `highlightedBlockId` prop flows through `BlockRenderer` recursion so nested blocks get highlighted during execution
- [x] 5.2 Ensure the highlight ring CSS class (`ring-2 ring-yellow-400`) is applied in `BlockRenderer` when `highlightedBlockId === block.id` at any nesting depth
- [x] 5.3 Verify that parent containers remain visible (no collapse mechanism) when a child block is highlighted

## Task 6: Medium Level Redesign
- [x] 6.1 Replace the 5 medium-difficulty level definitions in `scratchCodingUtils.ts` with new 7×7 grid levels that have repeating corridor patterns (staircases, zigzags, spirals)
- [x] 6.2 Set `maxBlocks` for each medium level so that a flat solution (without REPEAT) exceeds the limit, forcing players to use at least one REPEAT block
- [x] 6.3 Set `optimalBlocks` for each medium level to the block count of the optimal solution using REPEAT
- [x] 6.4 Verify each medium level is solvable by manually tracing the optimal solution through `executeProgram`

## Task 7: Hard Level Redesign
- [x] 7.1 Replace the 5 hard-difficulty level definitions in `scratchCodingUtils.ts` with new 8×8 grid levels that have wall patterns requiring IF_WALL_AHEAD
- [x] 7.2 Set `maxBlocks` for each hard level so that a solution without IF_WALL_AHEAD exceeds the limit
- [x] 7.3 Ensure at least 2 hard levels require both REPEAT and IF_WALL_AHEAD in the optimal solution
- [x] 7.4 Ensure at least 1 hard level requires the IF_WALL_AHEAD else branch for the optimal solution
- [x] 7.5 Set `optimalBlocks` for each hard level and verify solvability by tracing through `executeProgram`

## Task 8: Block Efficiency Scoring Integration
- [x] 8.1 Track per-level `optimalBlocks` and actual `countAllBlocks` in game state as levels are completed
- [x] 8.2 Compute `Block_Efficiency_Score` using `computeBlockEfficiency` when the game ends
- [x] 8.3 Pass the efficiency score to `completeGame` by adjusting `correctAnswers` proportionally (e.g., 5 levels at 80% efficiency → correctAnswers = 4)
- [x] 8.4 Update the level-complete overlay to show Deep_Block_Count vs optimal block count
- [x] 8.5 Display "Perfect Efficiency" indicator when Deep_Block_Count equals optimalBlocks, and "Good Efficiency" when within 2 blocks

## Task 9: Internationalization
- [x] 9.1 Add nesting-related i18n keys to `en.json`: `scratchCoding.nesting.ifLabel`, `elseLabel`, `dropHere`, `maxDepthReached`, `perfectEfficiency`, `goodEfficiency`
- [x] 9.2 Add the same nesting-related i18n keys to `es.json` with Spanish translations
- [x] 9.3 Add the same nesting-related i18n keys to `pt.json` with Portuguese translations
- [x] 9.4 Replace all hardcoded nesting-related strings in components with `t()` calls using the new keys

## Task 10: Unit Tests for UI Components
- [x] 10.1 Write unit tests for `BlockRenderer` verifying flat blocks render with correct label, color, parameter input, and remove button
- [x] 10.2 Write unit tests for `ContainerBlockWrapper` verifying C-shape structure: top bar, body zone, bottom bar for REPEAT; top bar, body zone, else zone, bottom bar for IF_WALL_AHEAD
- [x] 10.3 Write unit tests verifying empty container body zones show the placeholder hint text
- [x] 10.4 Write unit tests verifying parameter input click does not trigger block removal (stopPropagation)
- [x] 10.5 Write unit tests verifying efficiency indicators: "Perfect Efficiency" at optimal count, "Good Efficiency" within 2 blocks
- [x] 10.6 Write unit tests verifying level definitions: all medium levels are 7×7 with REPEAT in availableBlocks, all hard levels are 8×8 with IF_WALL_AHEAD in availableBlocks
