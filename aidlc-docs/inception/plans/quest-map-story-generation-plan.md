# Quest Map v1 - Story Generation Plan

**Created**: 2026-11-01
**Stage**: INCEPTION - User Stories (Part 1 Planning, Part 2 Generation), MINIMAL depth
**Basis**: `aidlc-docs/inception/requirements/quest-map-requirements.md` (approved 2026-10-30), `quest-map-requirement-verification-questions.md`
**File naming**: prefixed `quest-map-` so earlier features' plans stay intact.
**Answers**: The owner delegated all answers. Each `[Answer]:` below holds my recommendation with a rationale. Change any letter to override.

---

## Section A: Need Assessment (rule: user-stories.md Step 1)

| Item | Assessment |
|---|---|
| User impact | Direct. New screen, new way to launch 13 existing games, new rewards |
| Complexity | Medium. No new game logic, but 3 personas and a paywall boundary |
| Criteria met | New user-facing feature; multiple personas; paid/free behavior; acceptance criteria needed |
| Decision | **Execute User Stories at MINIMAL depth** |
| Why minimal | The requirements already carry 19 FR with acceptance criteria. Stories only re-frame them per persona and add traceability. Target is about a third of the Circuit Builder volume (39 stories) |

---

## Section B: Planning Questions

## Question 1
Which story breakdown approach?

A) User journey-based (map, launch, play, result, return)
B) Feature-based (one story per FR)
C) Epic hierarchy over journeys
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended. The feature is one journey loop, so a flat journey list reads naturally. Four labelled groups (Discover, Play, Progress, Access) give structure without nested epics, which would be overhead at this size.

## Question 2
What granularity?

A) Fine, one story per interaction (30+)
B) Medium, one story per player-visible outcome (10-15)
C) Coarse, one story per group (4)
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended. Matches "minimal depth" and still gives each FR at least one testable story.

## Question 3
Acceptance criteria format?

A) Given-When-Then for all
B) Checklist for all
C) Hybrid: Given-When-Then for behavior, checklist for config and verification
D) Other (please describe after [Answer]: tag below)

[Answer]: C - Recommended. Same convention as the Circuit Builder stories. Most Quest Map stories are behavior; two (config validation, normal play unchanged) are checklists.

## Question 4
Persona detail?

A) Basic: name, role, goal
B) Standard: plus pain points and what the persona demands of the product
C) Rich narrative
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended, with one line of "demands of the product" each. Three personas are already defined in the requirements (Section 1). Standard detail would repeat them.

## Question 5
Are admin and developer personas included?

A) No. Only the three player-side personas from the requirements
B) Add an administrator persona for reporting and config changes
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended. v1 has no admin surface (no CMS, no registry entries, FR-QM-16). Metrics for the owner are covered by a checklist story (QM-15), not a persona.

---

## Section C: Ambiguity Analysis (rule Step 9)

All five answers are single letters with no combined or hedged options. No contradictions found (Q2=B and Q4=A are both "light"). No follow-up questions needed.

---

## Section D: Execution Checklist

### Part 1 - Planning
- [x] Assess need for stories (Section A)
- [x] Offer breakdown options and trade-offs (Question 1 to 3)
- [x] Fill and analyse answers (Section C)
- [x] Plan approved: owner delegated all answers and approved the requirements on 2026-10-30; recommendations recorded in `audit.md`

### Part 2 - Generation
- [x] Create `quest-map-personas.md` (3 personas, persona-to-group coverage table)
- [x] Create `quest-map-stories.md` (15 stories in 4 groups, INVEST, acceptance criteria, FR traceability)
- [x] Check INVEST: every story has an independent player-visible outcome; the three non-player stories (QM-12, QM-14, QM-15) are labelled as verification stories
- [x] Check traceability: each of FR-QM-1 to FR-QM-19 appears in at least one story (matrix at end of stories file)
- [x] Map every persona to at least one story
- [x] Update `aidlc-state.md` (Quest Map v1 section)
- [x] Log in `audit.md`

## Output
- `aidlc-docs/inception/user-stories/quest-map-personas.md`
- `aidlc-docs/inception/user-stories/quest-map-stories.md`
