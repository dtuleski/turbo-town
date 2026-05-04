# Requirements Document

## Introduction

The Space Coder game in DashDen currently renders blocks as a flat list, making REPEAT and IF container blocks unusable since players cannot nest blocks inside them. This feature reworks the block editor to support nesting blocks inside REPEAT and IF containers, redesigns levels to require these control structures for optimal solutions, and updates block counting and scoring to account for nested program trees. The execution engine already supports nested block execution via `block.body[]` and `block.elseBody[]` — this work bridges the UI gap so the full block language is playable.

## Glossary

- **Block_Editor**: The drag-and-drop workspace where players assemble Code_Blocks into a program tree
- **Block_Palette**: The categorized panel from which players select Code_Blocks to drag into the Block_Editor
- **Container_Block**: A Code_Block that has a body (and optionally an else body) where other blocks can be nested inside it (REPEAT, IF_WALL_AHEAD, IF_ON_GOAL)
- **Body_Drop_Zone**: A droppable region inside a Container_Block where child blocks are placed
- **Else_Drop_Zone**: A second droppable region inside IF_WALL_AHEAD for the else branch
- **C_Shape_Renderer**: The visual rendering of a Container_Block as a C-shaped bracket that wraps its child blocks, following the Scratch visual programming convention
- **Nested_Block**: A Code_Block placed inside a Container_Block's Body_Drop_Zone or Else_Drop_Zone
- **Deep_Block_Count**: The total count of all blocks in a program tree, including blocks nested at any depth inside Container_Blocks
- **Block_Efficiency_Score**: A ratio comparing the optimal block count for a level to the player's actual Deep_Block_Count, used as a scoring factor
- **Flat_Block**: A Code_Block that has no body and cannot contain other blocks (MOVE_FORWARD, TURN_LEFT, TURN_RIGHT, ON_START)
- **Nesting_Depth**: The number of Container_Block ancestors a given block has in the program tree
- **Execution_Engine**: The existing recursive AST interpreter that walks the block tree and produces execution steps for animation
- **Game_Service**: The existing DashDen backend Lambda that handles game session tracking, scoring, and rate limiting
- **Score_Calculator**: The existing DashDen service that computes scores

## Requirements

### Requirement 1: C-Shaped Container Block Rendering

**User Story:** As a player, I want REPEAT and IF blocks to visually wrap around their child blocks like Scratch's C-shaped blocks, so that I can see which blocks are inside a loop or conditional.

#### Acceptance Criteria

1. WHEN a REPEAT block is in the program, THE C_Shape_Renderer SHALL render the REPEAT block as a C-shaped bracket with an open Body_Drop_Zone between its top bar and bottom bar.
2. WHEN an IF_WALL_AHEAD block is in the program, THE C_Shape_Renderer SHALL render the block with two sections: a Body_Drop_Zone labeled with the localized "if" label and an Else_Drop_Zone labeled with the localized "else" label.
3. WHEN an IF_ON_GOAL block is in the program, THE C_Shape_Renderer SHALL render the block as a C-shaped bracket with a single Body_Drop_Zone.
4. WHEN one or more Nested_Blocks are inside a Container_Block's body, THE C_Shape_Renderer SHALL render those Nested_Blocks vertically stacked inside the C-shape, visually indented from the container.
5. WHEN a Container_Block's body is empty, THE C_Shape_Renderer SHALL render a placeholder area inside the C-shape with a localized hint text indicating blocks can be dropped there.
6. THE C_Shape_Renderer SHALL support rendering Container_Blocks nested inside other Container_Blocks up to a Nesting_Depth of 3.

### Requirement 2: Nested Drag-and-Drop Interactions

**User Story:** As a player, I want to drag blocks into REPEAT and IF containers, so that I can build programs with loops and conditionals.

#### Acceptance Criteria

1. WHEN the player drags a Flat_Block over a Container_Block's Body_Drop_Zone, THE Block_Editor SHALL display a visual drop indicator inside the container showing where the block will be inserted.
2. WHEN the player drops a Flat_Block into a Container_Block's Body_Drop_Zone, THE Block_Editor SHALL add the block to that container's body array at the indicated position.
3. WHEN the player drops a Flat_Block into an IF_WALL_AHEAD block's Else_Drop_Zone, THE Block_Editor SHALL add the block to that container's elseBody array at the indicated position.
4. WHEN the player drags a Container_Block over another Container_Block's Body_Drop_Zone, THE Block_Editor SHALL allow nesting up to a Nesting_Depth of 3.
5. IF the player attempts to nest a Container_Block beyond a Nesting_Depth of 3, THEN THE Block_Editor SHALL reject the drop and display a brief visual feedback indicating the maximum nesting depth is reached.
6. WHEN the player clicks a Nested_Block inside a Container_Block, THE Block_Editor SHALL remove only that block from the container's body or elseBody, leaving sibling blocks and the container intact.
7. WHEN the player clicks a Container_Block's top bar, THE Block_Editor SHALL remove the entire Container_Block including all its Nested_Blocks from the program.
8. THE Block_Editor SHALL support both mouse drag-and-drop and touch drag-and-drop for all nesting interactions.

### Requirement 3: Deep Block Counting

**User Story:** As a player, I want the block count to include all blocks in my program including nested ones, so that the block limit accurately reflects program complexity.

#### Acceptance Criteria

1. THE Block_Editor SHALL compute the Deep_Block_Count by recursively counting every block in the program tree, including blocks nested inside Container_Block body and elseBody arrays at any depth.
2. WHEN displaying the block count, THE Block_Editor SHALL show the Deep_Block_Count against the level's maximum block limit.
3. IF the player attempts to add a block that would cause the Deep_Block_Count to exceed the level's maximum block limit, THEN THE Block_Editor SHALL reject the addition and display a visual indicator that no more blocks can be added.
4. WHEN the player removes a Container_Block, THE Block_Editor SHALL subtract the Container_Block and all its Nested_Blocks from the Deep_Block_Count.
5. FOR ALL valid program trees, the Deep_Block_Count SHALL equal the sum of 1 for each block plus the Deep_Block_Count of each block's body and elseBody arrays.

### Requirement 4: Nested Block Parameter Editing

**User Story:** As a player, I want to edit parameters on blocks whether they are at the top level or nested inside containers, so that I can configure my program fully.

#### Acceptance Criteria

1. WHEN a REPEAT block is in the program at any Nesting_Depth, THE Block_Editor SHALL display an editable numeric input for the repeat count with a default value of 2, minimum of 1, and maximum of 10.
2. WHEN a MOVE_FORWARD block is nested inside a Container_Block, THE Block_Editor SHALL display an editable numeric input for the step count with a default value of 1, minimum of 1, and maximum of 10.
3. WHEN the player changes a parameter value on a Nested_Block, THE Block_Editor SHALL update only that block's parameter without affecting sibling or parent blocks.
4. WHEN the player clicks a parameter input field on a Nested_Block, THE Block_Editor SHALL handle the click on the input without triggering the block removal action.

### Requirement 5: Medium Level Redesign Requiring REPEAT

**User Story:** As a player on medium difficulty, I want levels that require me to use REPEAT blocks for optimal solutions, so that I learn the value of loops.

#### Acceptance Criteria

1. THE Scratch_Game SHALL provide a minimum of 5 medium-difficulty levels where the optimal solution requires at least one REPEAT block.
2. FOR ALL medium-difficulty levels, the maximum block limit SHALL be set so that a flat solution (without REPEAT) exceeds the maximum, forcing the player to use at least one REPEAT block to solve the level.
3. WHEN the player completes a medium-difficulty level using the optimal number of blocks, THE Scratch_Game SHALL display an optimal solution indicator.
4. THE medium-difficulty levels SHALL use a 7×7 grid with corridors and walls that create repeating movement patterns (e.g., staircases, zigzags, spirals).

### Requirement 6: Hard Level Redesign Requiring IF Conditionals

**User Story:** As a player on hard difficulty, I want levels that require me to use IF_WALL_AHEAD and REPEAT together, so that I learn conditional logic combined with loops.

#### Acceptance Criteria

1. THE Scratch_Game SHALL provide a minimum of 5 hard-difficulty levels where the optimal solution requires at least one IF_WALL_AHEAD block.
2. FOR ALL hard-difficulty levels, the maximum block limit SHALL be set so that a solution without IF_WALL_AHEAD exceeds the maximum, forcing the player to use conditionals.
3. THE hard-difficulty levels SHALL use an 8×8 grid with wall patterns that require the player to check for walls and branch execution accordingly.
4. AT LEAST 2 hard-difficulty levels SHALL require both REPEAT and IF_WALL_AHEAD in the optimal solution.
5. THE hard-difficulty levels SHALL include scenarios where the IF_WALL_AHEAD else branch is necessary for the optimal solution.

### Requirement 7: Block Efficiency Scoring

**User Story:** As a player, I want my score to reflect how efficiently I used blocks, so that I am rewarded for writing concise programs.

#### Acceptance Criteria

1. WHEN the player completes the game, THE Scratch_Game SHALL compute the Block_Efficiency_Score as the ratio of total optimal blocks across completed levels to the player's total Deep_Block_Count across completed levels, capped at 1.0.
2. WHEN calling the Game_Service completeGame mutation, THE Scratch_Game SHALL pass the Block_Efficiency_Score as a hints parameter so the backend can factor it into scoring.
3. WHEN displaying the level-complete overlay, THE Scratch_Game SHALL show the player's Deep_Block_Count compared to the level's optimal block count.
4. WHEN the player's Deep_Block_Count equals the level's optimal block count, THE Scratch_Game SHALL display a "Perfect Efficiency" indicator.
5. WHEN the player's Deep_Block_Count exceeds the optimal but is within 2 blocks, THE Scratch_Game SHALL display a "Good Efficiency" indicator.

### Requirement 8: Execution Highlighting for Nested Blocks

**User Story:** As a player, I want to see which block is currently executing even when it's nested inside a container, so that I can follow my program's execution.

#### Acceptance Criteria

1. WHILE the program is executing, THE Block_Editor SHALL visually highlight the currently executing block regardless of its Nesting_Depth.
2. WHILE a block nested inside a Container_Block is executing, THE Block_Editor SHALL keep the parent Container_Block visible and expanded so the highlighted child block is visible.
3. WHEN execution moves from one block to the next, THE Block_Editor SHALL remove the highlight from the previous block and apply it to the next block within 350 milliseconds.

### Requirement 9: Program Tree Manipulation Utilities

**User Story:** As a developer, I want utility functions for manipulating the nested program tree, so that the Block_Editor can reliably insert, remove, and count blocks at any depth.

#### Acceptance Criteria

1. THE scratchCodingUtils module SHALL export a countAllBlocks function that accepts a Block array and returns the Deep_Block_Count by recursively traversing body and elseBody arrays.
2. THE scratchCodingUtils module SHALL export an insertBlockAtPath function that accepts a program tree, a target path (array of indices describing the position in the tree), and a new block, and returns a new program tree with the block inserted at the specified path.
3. THE scratchCodingUtils module SHALL export a removeBlockAtPath function that accepts a program tree and a target path, and returns a new program tree with the block at that path removed.
4. FOR ALL valid program trees and valid paths, calling insertBlockAtPath followed by removeBlockAtPath at the same path SHALL return a program tree equivalent to the original (round-trip property).
5. FOR ALL valid program trees, countAllBlocks SHALL return a value greater than or equal to the length of the top-level array.

### Requirement 10: Internationalization for Nesting UI

**User Story:** As a player who speaks Spanish or Portuguese, I want all new nesting-related UI text translated, so that I can understand the container blocks in my language.

#### Acceptance Criteria

1. THE Scratch_Game SHALL provide localized labels for "if" and "else" sections within IF_WALL_AHEAD blocks in English, Spanish, and Portuguese.
2. THE Scratch_Game SHALL provide a localized placeholder hint for empty Body_Drop_Zones (e.g., "Drop blocks here") in English, Spanish, and Portuguese.
3. THE Scratch_Game SHALL provide a localized message for maximum nesting depth reached in English, Spanish, and Portuguese.
4. THE Scratch_Game SHALL provide a localized "Perfect Efficiency" and "Good Efficiency" label in English, Spanish, and Portuguese.
5. WHEN the player changes the application language, THE Scratch_Game SHALL immediately reflect the new language for all nesting-related text without requiring a page reload.
