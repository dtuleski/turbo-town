# Quest Map v1 - Unit to Story Map

**Created**: 2026-11-01
**Stage**: INCEPTION - Units Generation
**Source**: `quest-map-stories.md` (15 stories), `quest-map-unit-of-work.md` (4 units)

`P` = primary unit (where the story is verified end to end). `C` = contributes.

| Story | Title | QM1 | QM2 | QM3 | QM4 |
|---|---|---|---|---|---|
| QM-1 | Open the Quest Map from the hub | | | P | |
| QM-2 | See my place on the map | | C | P | |
| QM-3 | Start a node with its goal | C | C | P | |
| QM-4 | Earn stars from my score | C | P | C | |
| QM-5 | Unlock and go to the next node | C | C | P | C |
| QM-6 | Replay without losing progress | C | P | | |
| QM-7 | Beat the boss gauntlet | C | P | C | |
| QM-8 | Unlock the bonus node | P | C | C | |
| QM-9 | Earn and see badges | C | C | C | P |
| QM-10 | Know how many plays I have left | | P | C | |
| QM-11 | See what World 2 offers | | C | P | |
| QM-12 | The server enforces the rules (V) | C | P | | |
| QM-13 | A removed game never blocks me | C | P | C | |
| QM-14 | Config cannot ship broken (V) | P | | C | |
| QM-15 | Normal play and metrics are unchanged (V) | | P | C | |

## Primary Assignment Summary

| Unit | Primary stories | Count |
|---|---|---|
| QM1 | QM-8, QM-14 | 2 |
| QM2 | QM-4, QM-6, QM-7, QM-10, QM-12, QM-13, QM-15 | 7 |
| QM3 | QM-1, QM-2, QM-3, QM-5, QM-11 | 5 |
| QM4 | QM-9 | 1 |

All 15 stories are assigned. Story count is a poor proxy for effort: QM1 has two primary stories but carries every rule used by the others.

## Persona Coverage by Unit
QP1 and QP2 are served mainly by QM2 and QM3. QP3 is served by QM3 (QM-11) and QM2 (QM-12).
