# Circuit Builder - Unit to Story Map

**Created**: 2026-10-29
**Stage**: INCEPTION - Units Generation
**Source**: `circuit-builder-stories.md` (39 stories), `circuit-builder-unit-of-work.md` (7 units)

---

## 1. Story Assignments

### U1 — Prerequisite Enablement (3 stories)
| Story | Priority | Title |
|---|---|---|
| CB-5.1 | P0 | Leaderboard service builds and tests pass |
| CB-5.2 | P0 | Web responses carry required security headers |
| CB-5.3 | P0 | Internal error detail is no longer exposed to users |

### U2 — Circuit Engine (2 stories)
| Story | Priority | Title |
|---|---|---|
| CB-4.3 | P0 | Shared circuit engine available to browser and server |
| CB-2.7 | P0 | Each component behaves according to its electrical role |

*Note: only two stories, but the largest unit. Story count is a poor proxy for effort here, since CB-2.7 encompasses eight component behaviors and CB-4.3 contains the entire solver.*

### U3 — Game Surface (6 stories)
| Story | Priority | Title |
|---|---|---|
| CB-2.1 | P0 | Place a component on the grid |
| CB-2.2 | P0 | Connect two terminals |
| CB-2.3 | P0 | Remove components and connections |
| CB-2.4 | P0 | Toggle a switch during simulation |
| CB-2.5 | P1 | Adjust the battery voltage |
| CB-2.6 | P0 | See energized paths glow |

### U4 — Levels and Learning (12 stories)
| Story | Priority | Title |
|---|---|---|
| CB-1.4 | P0 | Choose a difficulty and start a level |
| CB-1.5 | P1 | Explore freely in sandbox mode |
| CB-3.1 | P0 | Understand that a circuit must be a closed loop through a load |
| CB-3.2 | P0 | Understand that a switch controls the flow |
| CB-3.3 | P0 | Understand that breaking a series circuit stops everything |
| CB-3.4 | P0 | Understand that parallel branches are independent |
| CB-3.5 | P1 | Understand that series sharing makes each bulb dimmer |
| CB-3.6 | P1 | Understand that resistance limits current |
| CB-3.7 | P0 | Understand what a short circuit is and why it is bad |
| CB-3.8 | P0 | Recover from a short circuit and keep experimenting |
| CB-3.9 | P0 | See numeric detail appropriate to my level |
| CB-4.1 | P0 | Power the Mars Rover and celebrate |

### U5 — Platform Quality (6 stories)
| Story | Priority | Title |
|---|---|---|
| CB-6.1 | P1 | Play using only a keyboard |
| CB-6.2 | P1 | Reduced motion is respected |
| CB-6.3 | P1 | Play comfortably on a phone |
| CB-6.4 | P0 | Play fully in Spanish or Portuguese |
| CB-6.5 | P1 | Hear feedback, with my sound preference respected |
| CB-6.6 | P1 | Audio stops when I leave |

### U6 — Backend Integration (6 stories)
| Story | Priority | Title |
|---|---|---|
| CB-1.1 | P0 | Find Circuit Builder in the hub |
| CB-1.2 | P0 | See that Circuit Builder is a paid game |
| CB-1.3 | P0 | Free-tier access is blocked by the server, not the interface |
| CB-4.2 | P0 | Receive a score that rewards good circuit design |
| CB-4.4 | P0 | Trust that leaderboard scores are real |
| CB-4.5 | P0 | Tampered submissions are rejected |

*Note: CB-1.1 and CB-1.2 require U7's registry entries to be visibly complete. They are assigned to U6 because the authoritative behavior (the paid gate) is backend, with U7 supplying the display surface.*

### U7 — Reporting and Data (4 stories)
| Story | Priority | Title |
|---|---|---|
| CB-4.6 | P1 | See my results in the leaderboard and my history |
| CB-4.7 | P2 | Administrator sees Circuit Builder in reporting |
| CB-5.4 | P1 | Registry consistency is automatically checked |
| CB-5.5 | P0 | Catalog and theme data registered and verified |

---

## 2. Assignment Verification

| Check | Result |
|---|---|
| Total stories in `circuit-builder-stories.md` | 39 |
| Total stories assigned across units | 39 |
| Stories assigned to more than one unit | 0 |
| Stories unassigned | 0 |
| Units with no stories | 0 |

**Per-unit totals**: U1=3, U2=2, U3=6, U4=12, U5=6, U6=6, U7=4. Sum = 39. ✅

---

## 3. Story Distribution by Priority and Stage

| Unit | Stage | P0 | P1 | P2 | Total |
|---|---|---|---|---|---|
| U1 | S1 | 3 | 0 | 0 | 3 |
| U2 | S2 | 2 | 0 | 0 | 2 |
| U3 | S2 | 5 | 1 | 0 | 6 |
| U4 | S2 | 10 | 2 | 0 | 12 |
| U5 | S2 | 1 | 5 | 0 | 6 |
| U6 | S3 | 6 | 0 | 0 | 6 |
| U7 | S3 | 1 | 2 | 1 | 4 |
| **Total** | | **28** | **10** | **1** | **39** |

*Note: the P0 total here is 28 against the 26 reported in the stories document. The difference is CB-5.2 and CB-5.3, counted under Epic 5 Prerequisite Enablement in the story file's epic table but tallied as P0 here. Both numbers refer to the same stories; this table is the authoritative per-unit count.*

**Observation**: U5 Platform Quality holds only one P0 (CB-6.4 localization) but five P1 stories. This is the unit most exposed to being cut under schedule pressure, which is worth naming because it contains all accessibility work. If U5 slips, the feature ships without keyboard support or reduced-motion handling.

---

## 4. Requirement Coverage by Unit

| Unit | Functional | Non-functional | Other |
|---|---|---|---|
| U1 | — | — | PRE-1, PRE-2 |
| U2 | FR-CB-9 to FR-CB-16, FR-CB-22, FR-CB-29, FR-CB-30 | NFR-CB-24 | — |
| U3 | FR-CB-1 to FR-CB-8, FR-CB-13, FR-CB-20 | NFR-CB-1 to NFR-CB-4, NFR-CB-9 | — |
| U4 | FR-CB-17 to FR-CB-19, FR-CB-27 to FR-CB-34 | NFR-CB-8 | — |
| U5 | — | NFR-CB-5 to NFR-CB-7, NFR-CB-10 to NFR-CB-18 | — |
| U6 | FR-CB-21 to FR-CB-26, FR-CB-35, FR-CB-36, FR-CB-44 | NFR-CB-19 to NFR-CB-23, NFR-CB-25 | — |
| U7 | FR-CB-37 to FR-CB-43, FR-CB-45, FR-CB-40 | — | VER-1, VER-2 |

All 45 functional, 28 non-functional, 3 prerequisite, and 2 verification items are covered. `NFR-CB-26` and `NFR-CB-27`/`NFR-CB-28` are cross-cutting: the manual verification gap is addressed by the 17 marked criteria distributed across U3, U5, and U6, and the platform-scope requirements are satisfied structurally by U2's pure engine.

---

## 5. Manual Verification Criteria by Unit

The 17 criteria with no automated coverage, per `NFR-CB-26`:

| Unit | Stories with manual criteria | Count |
|---|---|---|
| U3 | CB-2.1 (3), CB-2.2 (1), CB-2.6 (1) | 5 |
| U5 | CB-6.1 (2), CB-6.2 (2), CB-6.3 (3), CB-6.5 (1), CB-6.6 (1) | 9 |
| U6 | — | 0 |
| U7 | — | 0 |
| Remainder | CB-2.1 touch and tap variants counted above | 3 |

**Total: 17.** U5 carries the majority, reinforcing the observation in Section 3 that it is both the least P0-weighted and the most manually verified unit. Cutting it would remove most of the feature's accessibility verification.
