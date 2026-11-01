# Domain Entities - QM1 Shared Quest Core

**Stage**: CONSTRUCTION - Functional Design, unit QM1 (`packages/shared/src/quest/`)
**Basis**: `quest-map-component-methods.md` section 1 (signatures win), `quest-map-requirements.md`, plan `quest-map-shared-core-functional-design-plan.md`
**Scope**: technology-agnostic definitions. Nothing here reads a clock, a database or the network.

---

## 1. Entities (as approved in the application design, with clarifications)

| Entity | Fields | Notes settled in this stage |
|---|---|---|
| `QuestLeg` | `themeId`, `catalogGameId`, `difficulty (1-4)`, `params?: { levelId?, pageTheme? }` | `themeId` for Memory Match is the card theme (for example `ANIMALS`). `pageTheme` is the value the game page needs in `?theme=` (Pattern Recall requires it). `levelId` only for `CIRCUIT_BUILDER` |
| `QuestNode` | `id`, `kind (GAME / BOSS / BONUS)`, `legs`, `thresholds [one, two, three]`, `map {x, y}` | `legs.length` is 1, except BOSS (2 or 3). `thresholds` are scores of one leg, or the **sum** of the legs for a BOSS |
| `QuestWorld` | `id`, `order`, `accessTier`, `nodes` (path order, last is the BOSS), `bonus`, `bonusStarThreshold` | "Path nodes" = `nodes` (7 regular + the boss = 8). The bonus is not in `nodes` and not in any total |
| `NodeProgress` | `stars`, `bestScore`, `firstClearedAt`, `lastPlayedAt`, `lastGameId?` | `firstClearedAt` is `''` until the first result of 1 star or more. `lastGameId` is the last game applied to the node, set whether or not it improved the result |
| `GauntletAttempt` | `nodeId`, `legs [{gameId, score}]`, `startedAt`, `lastActivityAt` | `legs` has one entry per completed leg, in order. `startedAt` and `lastActivityAt` are both set to the time leg 0 was recorded; each later leg moves only `lastActivityAt` |
| `WorldProgress` | `worldId`, `nodes`, `totalStars`, `badges`, `activeGauntlet?`, `version`, `updatedAt` | `totalStars` is stored but **recomputed** by the evaluator on every read and write; the stored value is never trusted. `version` is owned by the repository (QM2); the evaluator copies it through unchanged |
| `QuestContext` | `worldId`, `nodeId`, `legIndex` | Shape only. Existence is checked by `QuestService` (QM2) |
| `EvalContext` | `unavailableNodeIds: ReadonlySet<string>` | Built by the caller from the catalog (FR-QM-18). A node is unavailable when any of its legs' game is not ACTIVE |

Enumerations: `QuestAccessTier = FREE | PAID`, `QuestNodeKind = GAME | BOSS | BONUS`, `Stars = 0|1|2|3`, `NodeStatus = LOCKED | AVAILABLE | UNAVAILABLE` (a node with `stars > 0` is always reported `AVAILABLE`), `BadgeId = WORLD_CLEARED | WORLD_MASTERED`, `GauntletStatus = IN_PROGRESS | COMPLETE | EXPIRED`.

### Signature additions to the approved design (additive, optional)
- `applyNodeResult(..., result: { nodeId; score; nowIso; gameId? }, ...)`: `gameId` is optional and is stored as `NodeProgress.lastGameId` (plan Q5).
- No other signature differs from `quest-map-component-methods.md`.

### Relationships

```text
QuestWorld 1 --- 7..7 QuestNode (GAME)  +  1 QuestNode (BOSS)   = path nodes (8)
QuestWorld 1 --- 1 QuestNode (BONUS)    (outside the path)
QuestNode  1 --- 1..3 QuestLeg          (1 for GAME/BONUS, 2..3 for BOSS)
WorldProgress 1 --- 0..n NodeProgress   (keyed by node id)
WorldProgress 1 --- 0..1 GauntletAttempt
```

---

## 2. Constants

| Constant | Value | Source |
|---|---|---|
| `GAUNTLET_TTL_MS` | `1_800_000` (30 minutes) | FR-QM-10 |
| `PAID_GAME_THEME_IDS` | `SPACE_ENTRY`, `SCRATCH_CODING`, `BOND_AND_BURN`, `TRAFFIC_LAB`, `MINI_GOLF`, `LANGUAGE_PRONUNCIATION`, `CIRCUIT_BUILDER` | The local `PAID_GAMES` array in `services/game/src/services/game.service.ts` (line 57), whose last element is `CIRCUIT_BUILDER_THEME_ID` = `'CIRCUIT_BUILDER'` from `services/game/src/utils/circuit-builder.ts` |
| `QUEST_CARD_THEME_IDS` | `ANIMALS`, `FRUITS`, `VEHICLES`, `SPACE`, `OCEAN`, `FORMULA1` | `GAME_THEMES` in `apps/web/src/config/constants.ts` (lines 71-78) |
| `QUEST_GAME_THEME_IDS` | `MATH_CHALLENGE`, `WORD_PUZZLE`, `SEQUENCE_MEMORY`, `PATTERN_RECALL`, `GEO_QUIZ`, `MATH_MAZE`, `BUBBLE_POP`, `BOND_AND_BURN`, `SPACE_ENTRY`, `TRAFFIC_LAB`, `MINI_GOLF`, `SCRATCH_CODING`, `CIRCUIT_BUILDER` (12) | themeId strings used by the server: the per-game branches in `completeGame` and the `preAccuracy` list in `services/game/src/services/game.service.ts` (lines 160 and 182), `CIRCUIT_BUILDER_THEME_ID` in `utils/circuit-builder.ts`, and the `startGame({ themeId })` calls in `apps/web/src/pages/*/` |
| `QUEST_KNOWN_THEME_IDS` | union of the two arrays above (19 ids) | Q7 |

Note on `SPACE`: it is both a Memory Match card theme and part of `SPACE_ENTRY`'s name. They are different ids (`SPACE` vs `SPACE_ENTRY`) and do not collide.

`LANGUAGE_PRONUNCIATION` is in the paid list but is not in `QUEST_GAME_THEME_IDS`: language games are out of v1 (requirements section 2).

---

## 3. Launch configuration (`QUEST_WORLDS`)

Star thresholds are in `thresholds.md` (the single source for those numbers; the config copies them). All thresholds are **seed values, to be calibrated against real percentiles before launch (pre-launch check PL3)**.

### World 1 - `brain-peaks` ("Brain Peaks"), order 1, `FREE`, `bonusStarThreshold` 14

| # | Node id | Kind | Leg(s): themeId, difficulty, params | `catalogGameId` |
|---|---|---|---|---|
| 1 | `bp-01-memory` | GAME | `ANIMALS` d1 | `memory-match` |
| 2 | `bp-02-math` | GAME | `MATH_CHALLENGE` d1 | `math-challenge` |
| 3 | `bp-03-words` | GAME | `WORD_PUZZLE` d1 | `word-puzzle` |
| 4 | `bp-04-sequence` | GAME | `SEQUENCE_MEMORY` d2 | `sequence-memory` |
| 5 | `bp-05-geo` | GAME | `GEO_QUIZ` d2 | `geo-quiz` |
| 6 | `bp-06-maze` | GAME | `MATH_MAZE` d2 | `math-maze` |
| 7 | `bp-07-memory-hard` | GAME | `OCEAN` d3 | `memory-match` |
| 8 | `bp-boss` | BOSS | leg 0 `MATH_CHALLENGE` d2; leg 1 `BUBBLE_POP` d2 | `math-challenge`, `bubble-pop` |
| bonus | `bp-bonus-sequence` | BONUS | `SEQUENCE_MEMORY` d3 | `sequence-memory` |

### World 2 - `science-island` ("Science Island"), order 2, `PAID`, `bonusStarThreshold` 16

| # | Node id | Kind | Leg(s): themeId, difficulty, params | `catalogGameId` |
|---|---|---|---|---|
| 1 | `si-01-bond-burn` | GAME | `BOND_AND_BURN` d1 | `bond-and-burn` |
| 2 | `si-02-space-entry` | GAME | `SPACE_ENTRY` d1 | `space-entry` |
| 3 | `si-03-circuit-series` | GAME | `CIRCUIT_BUILDER` d2, `levelId: cb-03-series-loop` | `circuit-builder` |
| 4 | `si-04-traffic-lab` | GAME | `TRAFFIC_LAB` d2 | `traffic-lab` |
| 5 | `si-05-scratch` | GAME | `SCRATCH_CODING` d1 | `scratch-coding` |
| 6 | `si-06-mini-golf` | GAME | `MINI_GOLF` d2 | `mini-golf` |
| 7 | `si-07-circuit-parallel` | GAME | `CIRCUIT_BUILDER` d3, `levelId: cb-05-series-vs-parallel` | `circuit-builder` |
| 8 | `si-boss` | BOSS | leg 0 `BOND_AND_BURN` d3; leg 1 `SPACE_ENTRY` d2; leg 2 `TRAFFIC_LAB` d2 | `bond-and-burn`, `space-entry`, `traffic-lab` |
| bonus | `si-bonus` | BONUS | `CIRCUIT_BUILDER` d4, `levelId: cb-07-resistance-limits-current` | `circuit-builder` |

Verified against code: Circuit Builder levels and difficulties (`packages/shared/src/circuit/guided-levels.ts`): `cb-03-series-loop` d2, `cb-05-series-vs-parallel` d3, `cb-07-resistance-limits-current` d4, so the FR-QM-2 rule "leg difficulty equals level difficulty" holds. Page difficulty strings: Space Entry accepts `easy`, `medium`, anything else maps to 3 (`SpaceEntryGamePage.tsx` line 41). This closes the open point in `quest-map-components.md` U1.

`catalogGameId` for all 13 games is the kebab-case id seen in `GameHubPage.tsx` (`GAME_FILTER_MAP`) and `GameTile.tsx`; `mini-golf` comes from `scripts/seed-mini-golf.sh` (as noted in the components doc). Whether each row is ACTIVE in prod is pre-launch check PL2.

---

## 4. Map coordinates

`map {x, y}` are percent of the map box (0 to 100), y grows downward. The path climbs: node 1 at the bottom, the boss at the top. World 2 is World 1 mirrored on x. The bonus node sits beside the boss, off the path line.

| Node | World 1 `(x, y)` | World 2 `(x, y)` |
|---|---|---|
| 1 | (20, 92) | (80, 92) |
| 2 | (60, 84) | (40, 84) |
| 3 | (80, 70) | (20, 70) |
| 4 | (45, 62) | (55, 62) |
| 5 | (18, 50) | (82, 50) |
| 6 | (42, 38) | (58, 38) |
| 7 | (72, 28) | (28, 28) |
| boss | (50, 10) | (50, 10) |
| bonus | (84, 10) | (16, 10) |

Design constraint for QM3: consecutive path nodes differ in y by at least 8 (smallest gap is 8: nodes 1-2 and 3-4). With a map box at least 640 px tall, 8% is 51 px, which is above the 44 px touch target (NFR-QM-2). The validator enforces range and spacing only (rules V13 and V14 in `business-rules.md`); the box height is a QM3 concern.

```text
World 1 (Brain Peaks), top = boss              World 2 mirrored on x
 y=10            [boss]-----[bonus]
 y=28                          [7]
 y=38                   [6]
 y=50      [5]
 y=62                [4]
 y=70                          [3]
 y=84                      [2]
 y=92      [1]
```

Text alternative: the path starts at the bottom left (node 1), zigzags up through nodes 2 to 7 and ends at the boss at the top centre; the bonus node is to the right of the boss. World 2 is the same shape flipped left to right.
