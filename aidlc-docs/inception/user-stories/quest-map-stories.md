# Quest Map v1 - User Stories

**Created**: 2026-11-01
**Stage**: INCEPTION - User Stories (minimal depth)
**Approach**: User journey list in four groups (plan Q1=A), medium granularity (Q2=B), hybrid criteria (Q3=C)
**Basis**: `quest-map-requirements.md`, `quest-map-personas.md`

## Conventions
- **Story id**: `QM-<n>`. **Priority**: `P0` must have for launch, `P1` should have.
- **Verification story** (V): not a player outcome; a check the build must pass.
- **MANUAL** marks criteria with no automated coverage (U8, NFR-QM-3), written as steps.
- **Personas**: QP1 Nico (free kid), QP2 Marco (paid player), QP3 Carolina (parent/buyer).
- Criteria quote FR ids from the requirements; the requirement's own acceptance criteria (AC1 to AC19) are not repeated here.

---

# A. Discover

## QM-1 - Open the Quest Map from the hub
**P0 · QP1, QP2, QP3**

As a signed-in player, I want a Quest Map card above the game grid so I can start a journey.

- **Given** I am signed in **When** I open the hub **Then** I see a Quest Map card above the game grid
- **When** I select it **Then** I land on the map route
- **Given** I am signed out **When** I open the map URL **Then** I am sent to login like any protected route
- **And** the card needs no catalog row (it is not a catalog game)

*Requirements: FR-QM-3, FR-QM-16*

## QM-2 - See my place on the map
**P0 · QP1, QP2**

As a player, I want to see every world, node and my stars so I know what to do next.

- **Given** I open the map **Then** I see both worlds as a winding path with one node per step, a boss, and a bonus node
- **And** each node shows its state: locked, available, 1, 2 or 3 stars, unavailable; boss and bonus look different
- **And** the state is readable without colour (icon plus text such as "2 of 3 stars") and is part of the node's accessible name
- **And** all text appears in English, Spanish or Portuguese per my language
- MANUAL: at 320 px width the path scrolls vertically and every node is at least 44 px; Tab follows path order; Enter or Space opens a node

*Requirements: FR-QM-3, FR-QM-4, NFR-QM-2, NFR-QM-3, NFR-QM-4*

# B. Play

## QM-3 - Start a node with its goal
**P0 · QP1, QP2**

As a player, I want to see a node's game, difficulty and star goals, then start it without another setup screen.

- **Given** a node is available **When** I select it **Then** I see the game name (from the locale key for the leg's game id, in my language), difficulty and the 1, 2 and 3 star score goals
- **When** I press Play **Then** the game starts at that difficulty (and Circuit Builder at that level) with no setup page
- **And** a banner reads "Playing from Quest Map" with the node name and goal, plus a way back to the map
- **Given** I start a game from the hub **Then** no banner appears and nothing else changes
- **When** the server refuses the start (for example the node was locked in another tab) **Then** I land back on the map with a short message instead of an unscored game; any other start error (for example a network failure) shows the same short message, accepted for v1, and I can tap the node again

*Requirements: FR-QM-7, FR-QM-8, FR-QM-14*

## QM-4 - Earn stars from my score
**P0 · QP1, QP2**

As a player, I want my finished game to turn into 0 to 3 stars based on the goals I saw.

- **Given** I finish a node's game **Then** the result screen shows my score, the stars earned and the goal I hit
- **And** the stars are computed by the server from the score it calculated, not sent by the browser
- **And** my leaderboard entry, history and score are recorded exactly as for any play

*Requirements: FR-QM-9, FR-QM-19*

## QM-5 - Unlock and go to the next node
**P0 · QP1, QP2**

As a player, I want a 1-star result to open the next node and take me back to the map.

- **Given** I earn at least 1 star on node n **Then** node n+1 becomes available
- **Given** I earn 0 stars **Then** n+1 stays locked
- **When** I choose "Back to map" **Then** I see the new node unlock; with reduced motion the animation is replaced by a static "new" marker
- **And** if a next node is unlocked I can choose "Next node"

*Requirements: FR-QM-5, FR-QM-15, NFR-QM-3*

## QM-6 - Replay without losing progress
**P0 · QP2**

As a player, I want to replay any unlocked node to chase 3 stars without risking what I have.

- **Given** I have 2 stars and a best score **When** I replay and score lower **Then** stars and best score are unchanged
- **When** I replay and score higher **Then** both update
- **And** two browser tabs finishing at the same time never lower or lose a result
- **And** each replay costs one play from my daily allowance

*Requirements: FR-QM-11, FR-QM-17*

## QM-7 - Beat the boss gauntlet
**P0 · QP2, QP1**

As a player, I want the boss to be a short sequence of games scored together.

- **Given** I start a boss **Then** I play its 2 or 3 legs in order and the result shows the combined score and stars
- **When** I leave and return within 30 minutes **Then** I continue at the next leg
- **When** 30 minutes or more pass after my last finished leg and I try to start the next leg **Then** the attempt has expired and I restart at leg 1; a leg I already started in time still counts when I finish it
- **And** leg k+1 cannot be started until leg k of the same attempt is done, even with a crafted request
- **And** finishing the same leg twice (double click or a client retry) never clears the attempt or changes the result
- **And** every leg uses one daily play

*Requirements: FR-QM-10, FR-QM-17*

## QM-8 - Unlock the bonus node
**P1 · QP2**

As a player, I want enough stars to open a bonus challenge.

- **Given** my path stars are below the world's threshold **Then** the bonus node is locked and shows how many stars remain
- **Given** they reach the threshold **Then** it becomes available and is starred like other nodes
- **And** World 1's bonus uses only free games
- **And** the bonus node is not counted in the world's star total, so it cannot unlock itself

*Requirements: FR-QM-12*

# C. Progress and rewards

## QM-9 - Earn and see badges
**P1 · QP2, QP1**

As a player, I want badges for finishing and mastering a world.

- **Given** I get 1 or more stars on a world's boss **Then** I earn "World Cleared" once
- **Given** all path nodes of a world are at 3 stars **Then** I earn "World Mastered" once
- **And** badges show on the map and on the Achievements page; the backend achievement list is not changed

*Requirements: FR-QM-13*

## QM-10 - Know how many plays I have left
**P0 · QP1**

As a free player, I want to see my remaining plays so a stop does not feel like a bug.

- **Given** I open the map **Then** I see my daily limit, plays used and when it resets
- **And** the number matches what the server enforces when I start a game
- **When** I have none left **Then** starting a node sends me to the existing rate-limit page (for every one of the 13 games, including those whose own page would otherwise send any start error to a setup page), and no play is consumed
- **Given** I have exactly one play left **Then** starting a node plays normally (including on Bond and Burn, Traffic Lab, Mini Golf and Circuit Builder, whose pages would otherwise treat the last play as a refusal) and the next start goes to the rate-limit page

*Requirements: FR-QM-17*

# D. Access and fairness

## QM-11 - See what World 2 offers
**P0 · QP3, QP1**

As a free player or a parent, I want World 2 visible but locked, with a way to upgrade.

- **Given** I am on the FREE tier **Then** World 2 appears locked with a short explanation and a link to the subscription page
- **Given** my subscription lapses **Then** my stored World 2 progress is kept but I cannot start its nodes
- **Given** I am on a paid tier **Then** World 2 is playable

*Requirements: FR-QM-6*

## QM-12 - The server enforces the rules (verification story)
**P0 · QP3 · Security**

As the platform owner, I want every rule enforced by the server so a crafted request gains nothing.

- A FREE user sending a World 2 context to `startGame` is rejected
- A locked node, a wrong leg order, an unknown world or node id, or a theme or difficulty that does not match the leg is rejected
- Every rejection returns one generic message and consumes no daily play
- A `startGame` without `questContext` behaves exactly as today
- The user id always comes from the verified token; no input can write stars or progress

*Requirements: FR-QM-6, FR-QM-8, NFR-QM-5, NFR-QM-6, NFR-QM-7, NFR-QM-8 · Security: SECURITY-05, -08, -11, -15*

## QM-13 - A removed game never blocks me
**P1 · QP1, QP2**

As a player, I want the map to keep working if a game is turned off.

- **Given** a node's game is not active in the catalog **Then** the node shows as unavailable
- **And** it counts as passed for unlocking and is left out of star totals, so I can still reach the boss
- **And** no stored progress is lost

*Requirements: FR-QM-18*

## QM-14 - Config cannot ship broken (verification story)
**P0 · QP2**

- [ ] A new node needs only a config entry and locale keys
- [ ] A test fails on: unknown theme, duplicate ids, thresholds not strictly ascending
- [ ] A test fails on: a World 1 leg that is a paid game or above difficulty 3
- [ ] A test fails on: a Circuit Builder leg whose difficulty differs from its level's
- [ ] A test fails on: a leg whose page cannot encode its difficulty or required params (design addition, see application design)
- [ ] Locale keys for worlds, nodes, banner, badges and errors exist in en, es and pt (a locale completeness test covers the quest keys)

*Requirements: FR-QM-1, FR-QM-2, NFR-QM-4, NFR-QM-13*

## QM-15 - Normal play and metrics are unchanged (verification story)
**P0 · QP1, QP2**

- [ ] Existing Game Service and Leaderboard tests pass unchanged
- [ ] A game started without quest context completes, scores and records leaderboard events as before
- [ ] Web and backend can deploy in either order without breaking non-quest play
- [ ] Node started, node cleared, world cleared and paywall-hit metrics are emitted with no personal data
- [ ] Owner note for approval: "paywall hit" is counted when a FREE user who has cleared World 1 loads the map (an impression of the lock, not unique users), because the web blocks World 2 before any server rejection; this is a metric emitted by the read operation `getQuestProgress`

*Requirements: FR-QM-19, NFR-QM-11, NFR-QM-14*

---

## Traceability Matrix

| FR | Stories | FR | Stories |
|---|---|---|---|
| FR-QM-1 | QM-14 | FR-QM-11 | QM-6 |
| FR-QM-2 | QM-14 | FR-QM-12 | QM-8 |
| FR-QM-3 | QM-1, QM-2 | FR-QM-13 | QM-9 |
| FR-QM-4 | QM-2 | FR-QM-14 | QM-3 |
| FR-QM-5 | QM-5 | FR-QM-15 | QM-5 |
| FR-QM-6 | QM-11, QM-12 | FR-QM-16 | QM-1 |
| FR-QM-7 | QM-3 | FR-QM-17 | QM-6, QM-7, QM-10 |
| FR-QM-8 | QM-3, QM-12 | FR-QM-18 | QM-13 |
| FR-QM-9 | QM-4 | FR-QM-19 | QM-4, QM-15 |
| FR-QM-10 | QM-7 | | |

All 19 FR are covered. Persona coverage: QP1 in QM-1 to 7, 9 to 11, 13, 15; QP2 in QM-1 to 9, 13, 14, 15; QP3 in QM-1, 11, 12.
