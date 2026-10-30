# Circuit Builder - Story Generation Plan

**Created**: 2026-10-29
**Stage**: INCEPTION - User Stories, Part 1 (Planning)
**Basis**: `aidlc-docs/inception/requirements/circuit-builder-requirements.md` and `circuit-builder-user-stories-assessment.md`

**Note on file naming**: A `story-generation-plan.md` already exists in this directory from the original Memory Game inception. This Circuit Builder file is kept separate so the earlier artifact is preserved.

**Answers pre-filled**: You previously asked me to answer based on my recommendations, so I have pre-filled all 12 planning questions below with a rationale for each. Change any `[Answer]:` value you disagree with. If you approve as-is, say so and I will generate the stories.

---

## Section A: Story Breakdown Approach Options

Per the methodology, here are the available approaches and their trade-offs for this specific feature.

| Approach | Fit for Circuit Builder | Trade-off |
|---|---|---|
| **User journey-based** | Strong. Maps the real path: discover tile, hit paywall or enter, pick difficulty, build, fault, succeed, see score. | Can obscure the engine rules that are not themselves a journey step. |
| **Feature-based** | Moderate. Groups by tray, canvas, engine, faults, scoring. | Loses the learner's perspective, which is the point of this game. |
| **Persona-based** | Weak as a primary axis. Only two active personas play; the rest observe or decide. | Would fragment the same mechanic across personas. |
| **Domain-based** | Weak. One domain. | No useful separation. |
| **Epic-based hierarchy** | Strong as a structuring layer over journeys. | Adds nesting overhead if used alone. |

**Recommended**: a hybrid of epic-based hierarchy over user journeys, with a dedicated epic for the educational concepts that are not journey steps. This is Question 4 below.

---

## Section B: Planning Questions

## Question 1
Which story breakdown approach should be used?

A) User journey-based only
B) Feature-based only
C) Epic-based hierarchy over user journeys, with a separate epic for educational concepts and one for prerequisite work
D) Persona-based grouping
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* The feature has three genuinely different kinds of work that do not belong on one axis. Player-facing flows are journeys. Educational rules such as "series is dimmer than parallel" are concepts a learner acquires, not steps they walk through. Prerequisite work (the Leaderboard build repair and scoped security remediation) has no player journey at all but still needs tracked, verifiable outcomes. Epics over journeys accommodates all three without forcing the engine rules into an artificial workflow.

## Question 2
What story granularity should be used?

A) Fine-grained — every component and interaction is its own story
B) Mixed — epics for complex areas such as the simulation engine, detailed stories for discrete interactions
C) Coarse — one story per major capability
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* Matches the convention already used in this project's earlier inception, and matches the actual shape of the work. The engine is one coherent capability best framed as an epic with sub-stories per electrical rule, while something like "toggle a switch" is a single testable interaction. Fine-grained throughout would produce a story per tray component with near-identical criteria, which is noise.

## Question 3
What acceptance criteria format should be used?

A) Given-When-Then for all stories
B) Checklist for all stories
C) Hybrid — Given-When-Then for behavioral and multi-scenario stories, checklist for simple or configuration stories
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* Consistent with the earlier inception in this project. Circuit behavior is inherently conditional and benefits from Given-When-Then, for example "Given two bulbs in series, When one is removed, Then both go dark." By contrast, registry and catalog work is a verification list, and forcing it into Given-When-Then adds words without clarity.

## Question 4
Which epics should the stories be organized under?

A) Four epics: Discovery and Access, Building and Simulation, Learning Concepts, Completion and Scoring
B) The above plus a fifth: Prerequisite Enablement, covering the Leaderboard repair and scoped security remediation
C) The above plus a sixth: Platform Quality, covering accessibility, localization, audio, and responsive behavior
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* Six epics map cleanly onto the requirements without inventing structure. Accessibility, localization, audio, and responsive behavior deserve their own epic rather than being scattered, because NFR-CB-26 makes them the manually verified surface, so they need visible acceptance criteria rather than being buried inside gameplay stories. Prerequisite Enablement is separate because it corresponds exactly to delivery Stage 1 and must be reviewable on its own.

## Question 5
What level of persona detail is needed?

A) Basic — name, role, goals
B) Standard — name, role, goals, pain points, technical comfort
C) Rich — full narrative profiles with context, motivations, and scenarios
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* Basic is too thin to resolve the real open question, which is how progressive numeric disclosure should feel across an 8 to 16 range. Knowing a young player's technical comfort and frustration points is what tells the implementer whether Easy should show any numbers at all. Rich narrative profiles would be disproportionate for a single mini-game.

## Question 6
Which personas should be defined?

A) Two players only: a younger learner and an older learner
B) The above plus the paying parent or educator who decides on purchase
C) The above plus an administrator who consumes reporting surfaces
D) The above plus a free-tier user who encounters the paywall
X) Other (please describe after [Answer]: tag below)

[Answer]: D

*Rationale:* All four appear in the requirements and each drives distinct acceptance criteria. The younger and older learners drive FR-CB-34 progressive disclosure. The purchaser matters because FR-CB-35 makes this paid, so the value has to be legible to whoever pays. The administrator appears in FR-CB-43 reporting surfaces. The free-tier user is explicitly named in success criterion 2 and must be blocked correctly by the backend gate rather than only hidden in the UI.

## Question 7
What prioritization scheme should be applied?

A) P0 through P3 priority levels
B) MoSCoW: Must, Should, Could, Won't
C) Mapped to the three delivery stages already defined in the requirements
D) Priority levels plus delivery stage mapping
X) Other (please describe after [Answer]: tag below)

[Answer]: D

*Rationale:* The requirements already fix a three-stage delivery sequence, so stories must carry that mapping or the plan and the stories will disagree. Priority alone would lose the hard ordering constraint that prerequisites block feature work. Stage alone would lose the distinction between must-have and nice-to-have within a stage, for example a motor and a buzzer are both Stage 2 but are not equally essential.

## Question 8
How should the educational concepts be expressed as stories?

A) As system behaviors, for example "the system dims series bulbs proportionally to current"
B) As learner outcomes, for example "as a learner I understand that adding bulbs in series makes each dimmer"
C) Both — a learner outcome story with the system behavior in its acceptance criteria
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* This is the single most important choice for preserving the point of the feature. Stated only as system behavior, the implementation can be electrically correct yet teach nothing, because nothing requires the effect to be perceivable. Stated only as a learner outcome, it is not testable. Pairing them means the story says what the child should learn while the criteria say what must be observable for that learning to occur, which is also what makes the manual verification protocol meaningful.

## Question 9
How should the manually verified surface from NFR-CB-26 be handled?

A) Normal acceptance criteria, with no distinction from automated coverage
B) Explicitly marked as manual verification, with step-by-step criteria usable as a test script
C) Excluded from stories and tracked separately as a test plan
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* The requirements concede that drag, wiring, mobile layout, and reduced motion have no automated coverage. If those criteria read like any other story, there is nothing ensuring a human actually exercises them, and that is precisely where regressions will hide. Marking them explicitly and writing them as executable steps turns the admitted gap into a repeatable protocol. Separating them entirely (option C) would detach them from the stories they validate.

## Question 10
How should the negative and abuse cases be represented?

A) Embedded in the acceptance criteria of their related stories
B) As separate dedicated stories
C) Embedded for simple cases, separate stories for security-relevant cases such as layout tampering and paywall bypass
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* Routine negatives such as removing a wire mid-circuit belong with their feature. But the two integrity cases, a tampered layout submitted to `completeGame` and a free user attempting to bypass the paywall, are the whole justification for FR-CB-21 server-authoritative scoring and FR-CB-36. Giving them their own stories makes them individually reviewable and keeps them from being overlooked as a sub-bullet, which matters because the enabled Security Baseline requires them.

## Question 11
How should story dependencies be documented?

A) Not documented
B) Simple blocking notes on affected stories
C) An explicit dependency map plus epic and sub-story hierarchy
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* There are real hard dependencies that will cause rework if left implicit: no leaderboard story can start before the Leaderboard build repair, and no server-side re-evaluation story can start before the engine is extracted into `packages/shared`. An explicit map makes the three-stage sequence enforceable rather than advisory.

## Question 12
Should stories include the shared engine extraction as a user-visible story?

A) Yes — express it as a player-value story about fair and tamper-resistant scores
B) No — treat it as a technical enabler story with no player narrative
C) Both — a technical enabler story linked to the fairness story it enables
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* Placing the circuit engine in `packages/shared` is a technical decision with no direct player narrative, so dressing it up as a player story (option A) would be dishonest about what it is. But it exists solely to make server-authoritative scoring possible, which does have player value in a competitive leaderboard. Linking an honest enabler to the fairness outcome keeps the traceability intact without inventing a fake user voice.

---

## Section C: Story Generation Execution Checklist

### Phase 1: Persona Development
- [x] 1.1 Define the younger learner persona, roughly ages 8 to 11, with goals, pain points, and technical comfort
- [x] 1.2 Define the older learner persona, roughly ages 12 to 16, including tolerance for numeric detail
- [x] 1.3 Define the paying parent or educator persona, including how they judge educational value
- [x] 1.4 Define the administrator persona, scoped to reporting surfaces from FR-CB-43
- [x] 1.5 Define the free-tier user persona, scoped to the paywall encounter in success criterion 2
- [x] 1.6 Write `aidlc-docs/inception/user-stories/circuit-builder-personas.md`

### Phase 2: Story Structure Setup
- [x] 2.1 Establish the six epics from Question 4
- [x] 2.2 Define the story ID scheme and the priority plus delivery-stage annotation format
- [x] 2.3 Define the convention marking manually verified criteria per Question 9

### Phase 3: Epic 1 — Discovery and Access
- [x] 3.1 Story: paid player finds the Circuit Builder tile under the `Science & Math` filter with a paid badge
- [x] 3.2 Story: free user encounters the paywall and is correctly blocked by the backend gate
- [x] 3.3 Security story: free user cannot bypass the paywall by navigating directly to the game route
- [x] 3.4 Story: player selects a difficulty level and starts a session
- [x] 3.5 Story: player enters sandbox mode without consuming a daily allowance

### Phase 4: Epic 2 — Building and Simulation
- [x] 4.1 Story: player drags a component from the tray onto the snap-to-grid canvas
- [x] 4.2 Story: player connects two terminals to form a conductive path
- [x] 4.3 Story: player removes a component or deletes an individual connection
- [x] 4.4 Story: player toggles a switch and sees the circuit respond immediately
- [x] 4.5 Story: player adjusts the variable voltage battery and observes the effect
- [x] 4.6 Story: player sees energized paths render as glowing traces
- [x] 4.7 Sub-story set: each tray component behaves per its electrical role

### Phase 5: Epic 3 — Learning Concepts
- [x] 5.1 Learner outcome: a circuit must form a closed path through a load to work
- [x] 5.2 Learner outcome: a switch controls whether current flows
- [x] 5.3 Learner outcome: breaking a series circuit stops everything on that path
- [x] 5.4 Learner outcome: parallel branches keep working independently
- [x] 5.5 Learner outcome: series bulbs are dimmer than the same bulbs in parallel
- [x] 5.6 Learner outcome: resistance limits current, and an unprotected LED is at risk
- [x] 5.7 Learner outcome: connecting positive to negative without a load causes a short circuit
- [x] 5.8 Story: short circuit produces sparks, pops the fuse, and shows the educational tooltip without ending the attempt
- [x] 5.9 Story: numeric detail is progressively disclosed by difficulty level

### Phase 6: Epic 4 — Completion and Scoring
- [x] 6.1 Story: player fully powers the Mars Rover and sees the celebration
- [x] 6.2 Story: player receives a score reflecting time, component efficiency, and fault penalties
- [x] 6.3 Technical enabler: circuit engine extracted into `packages/shared` for shared evaluation
- [x] 6.4 Story: player trusts leaderboard scores because results are server-verified
- [x] 6.5 Security story: a tampered layout submitted to `completeGame` is rejected
- [x] 6.6 Story: player sees their score on the leaderboard and in History and Achievements
- [x] 6.7 Story: administrator sees Circuit Builder in reporting surfaces

### Phase 7: Epic 5 — Prerequisite Enablement
- [x] 7.1 Enabler: Leaderboard service type-check and tests restored to passing
- [x] 7.2 Enabler: required HTTP security headers added
- [x] 7.3 Enabler: client stack-trace exposure removed and error paths fail closed
- [x] 7.4 Enabler: registry consistency check per FR-CB-45
- [x] 7.5 Enabler: catalog and theme seeding plus the idempotent verification command

### Phase 8: Epic 6 — Platform Quality
- [x] 8.1 Story: player completes core actions using only a keyboard (manual verification)
- [x] 8.2 Story: player with reduced-motion enabled sees suppressed spark and celebration animations (manual verification)
- [x] 8.3 Story: player on a phone uses the full-screen canvas mode (manual verification)
- [x] 8.4 Story: player uses the game fully in Spanish or Portuguese, tooltips included
- [x] 8.5 Story: player hears the success sound, and the mute preference is honored
- [x] 8.6 Story: audio stops cleanly when the player navigates away

### Phase 9: Quality and Compliance
- [x] 9.1 Verify every story satisfies INVEST: Independent, Negotiable, Valuable, Estimable, Small, Testable
- [x] 9.2 Verify every story has acceptance criteria in the Question 3 hybrid format
- [x] 9.3 Map every persona to its relevant stories
- [x] 9.4 Build the dependency map per Question 11
- [x] 9.5 Trace every story to its requirement IDs
- [x] 9.6 Confirm all 45 functional and 28 non-functional requirements are covered by at least one story
- [x] 9.7 Confirm the two security stories cover the Security Baseline cases for this feature
- [x] 9.8 Write `aidlc-docs/inception/user-stories/circuit-builder-stories.md`

### Phase 10: Validation
- [x] 10.1 Validate all content per `common/content-validation.md` before writing files
- [x] 10.2 Ensure any diagram has a text alternative
- [x] 10.3 Update `aidlc-docs/aidlc-state.md`
- [x] 10.4 Log completion in `aidlc-docs/audit.md`

---

## Mandatory Artifacts

- [x] `circuit-builder-stories.md` with stories following INVEST criteria
- [x] `circuit-builder-personas.md` with user archetypes and characteristics
- [x] Acceptance criteria on every story
- [x] Persona-to-story mapping
- [x] Requirement traceability
