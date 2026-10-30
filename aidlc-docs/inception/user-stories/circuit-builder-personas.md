# Circuit Builder - Personas

**Created**: 2026-10-29
**Stage**: INCEPTION - User Stories, Part 2 (Generation), Phase 1
**Detail level**: Standard — name, role, goals, pain points, technical comfort (Q5=B)
**Basis**: `aidlc-docs/inception/requirements/circuit-builder-requirements.md`

**Note on file naming**: A `personas.md` already exists in this directory from the original Memory Game inception. This Circuit Builder file is kept separate so the earlier artifact is preserved.

---

## P1 — Mateo, the Younger Learner

- **Age range**: 8 to 11
- **Role**: Player. Uses a parent's or school account.
- **Technical comfort**: Confident with touch devices and games. Reads short sentences comfortably but skips long instructions. Has not met algebra and does not know what a volt is.

**Goals**
- Make something visibly happen, especially making the rover move or light up
- Succeed without reading a manual
- Try things freely and see what breaks, without fear of being punished

**Pain points**
- Numbers and units read as noise and cause him to disengage
- Failure states that end his attempt make him stop experimenting
- Small drag targets on a phone are frustrating
- Text he cannot read in his own language stops him completely

**What this persona demands of the product**
- Easy difficulty must be purely visual with no numeric display (FR-CB-34)
- Short circuits must not end the attempt (FR-CB-19)
- Tooltips must be short, plain, and translated (NFR-CB-17)
- Touch targets and the mobile full-screen canvas must be usable on a phone (NFR-CB-10)

---

## P2 — Sofía, the Older Learner

- **Age range**: 12 to 16
- **Role**: Player. May be studying basic physics at school.
- **Technical comfort**: High. Comfortable with numbers, formulas, and cause-and-effect reasoning. Uses a laptop as often as a phone. Will notice and distrust a simulation that behaves inconsistently.

**Goals**
- Understand *why* a circuit behaves as it does, not just that it works
- See real values for voltage, current, and resistance and reason about them
- Build the most efficient circuit, not merely a working one
- Compare her results against other players

**Pain points**
- A simulation that is "magic" rather than physically consistent feels fake
- Being unable to see the numbers behind the behavior
- A leaderboard she suspects can be cheated is worthless to her
- Scoring that only rewards speed penalizes careful, elegant work

**What this persona demands of the product**
- Hard and Super Hard must expose real numeric analysis (FR-CB-34)
- Engine results must be physically consistent and derived, not hard-coded (FR-CB-9, FR-CB-13)
- Scores must be server-verified so the leaderboard is trustworthy (FR-CB-21)
- Scoring must reward component efficiency, not just time (FR-CB-23, FR-CB-25)

---

## P3 — Carolina, the Paying Parent or Educator

- **Role**: Purchase decision maker. Holds the subscription. May be a parent or a teacher using it with a small group.
- **Technical comfort**: Moderate. Comfortable with web apps and subscriptions. Not a physics specialist and cannot easily judge whether a simulation is technically correct.

**Goals**
- Confirm the game actually teaches real electrical concepts rather than being a toy
- See that her child is learning and progressing
- Get value from the subscription she is already paying for
- Use it with children of different ages

**Pain points**
- Educational products that claim to teach but only entertain
- Content that is untranslated or inaccessible for the children she supports
- Not knowing whether progress is real
- Paying for a game only one of her children is the right age for

**What this persona demands of the product**
- Educational value must be legible, since the game is paid at any tier (FR-CB-35)
- The broad 8 to 16 range must genuinely work across ages (FR-CB-34, FR-CB-39)
- Full Spanish and Portuguese support including tooltips (NFR-CB-17)
- Progress must be visible in History and Achievements (FR-CB-43)
- Keyboard operability matters in a classroom setting (NFR-CB-5)

---

## P4 — Diego, the Administrator

- **Role**: Platform operator. Monitors engagement and content performance across games.
- **Technical comfort**: High. Works directly with the admin dashboard and reporting surfaces.

**Goals**
- See Circuit Builder in reporting alongside every other game
- Track engagement, ratings, and completion
- Identify whether a new game is performing

**Pain points**
- A game that ships but is missing from reporting surfaces, which has happened before in this codebase
- Registries that disagree, so a game appears in one place and not another
- Review statistics that silently omit recent games

**What this persona demands of the product**
- Circuit Builder present in leaderboard, History, Achievements, Recent Improvements, and Admin Dashboard (FR-CB-43)
- Inclusion in the review aggregation registry so ratings appear (FR-CB-44)
- An automated consistency check so registries cannot silently drift (FR-CB-45)

---

## P5 — Tomás, the Free-Tier User

- **Role**: Signed-in user without a paid subscription. A prospective subscriber.
- **Technical comfort**: Varies. Treated as capable of navigating directly to a URL.

**Goals**
- See what the paid tiers offer before committing
- Understand what he is missing and why

**Pain points**
- Being blocked with no explanation of what the game is or why it is paid
- Discovering a feature is paid only after investing time in it

**What this persona demands of the product**
- A visible paid badge on the hub tile so the gate is known before clicking (FR-CB-37)
- A clear redirect to subscription rather than a dead end (FR-CB-35)
- The backend gate must hold even on direct route navigation, not rely on UI hiding (FR-CB-36)

---

## Persona-to-Epic Coverage

| Persona | E1 Discovery and Access | E2 Building and Simulation | E3 Learning Concepts | E4 Completion and Scoring | E5 Prerequisite Enablement | E6 Platform Quality |
|---|---|---|---|---|---|---|
| P1 Mateo, younger learner | Yes | Yes | Yes | Yes | No | Yes |
| P2 Sofía, older learner | Yes | Yes | Yes | Yes | No | Yes |
| P3 Carolina, parent or educator | Yes | No | Yes | Yes | No | Yes |
| P4 Diego, administrator | No | No | No | Yes | Yes | No |
| P5 Tomás, free-tier user | Yes | No | No | No | No | No |

**Text note:** The two learner personas drive nearly every epic. The parent or educator cares about access, learning outcomes, visible progress, and platform quality, but not the building mechanics directly. The administrator appears only in scoring and reporting plus prerequisite enablement. The free-tier user appears only in discovery and access, where the paywall behavior is defined.

---

## Design Tension Between P1 and P2

Mateo and Sofía want opposite things from the same screen. He is repelled by numbers; she distrusts their absence. This is the specific reason the requirements chose a numerically correct engine with progressive disclosure (Q9=D) rather than either a boolean model or a permanently numeric one. The difficulty level is the control that resolves the tension:

| Difficulty | Numeric exposure | Primary persona |
|---|---|---|
| 1 Easy | None. Purely visual: lit, dim, dark, spark | P1 Mateo |
| 2 Medium | Qualitative only: relative brightness, no units | P1 moving toward P2 |
| 3 Hard | Voltage and resistance values shown | P2 Sofía |
| 4 Super Hard | Full analysis: current per branch, voltage drop, total resistance | P2 Sofía |

A single engine computes all of it; only presentation changes. If this table is violated during implementation, one of the two personas is being failed.
