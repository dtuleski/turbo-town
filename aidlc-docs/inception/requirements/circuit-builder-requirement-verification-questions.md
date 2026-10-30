# Circuit Builder - Requirement Verification Questions

**Status:** Answered by Kiro on 2026-10-29 at the user's request ("can you answer based on your recommendations?"). Every answer below is a recommendation with its rationale. The user asked for these to be filled in; they remain subject to review and override before the requirements document is generated.

**Note on file naming:** A `requirement-verification-questions.md` already exists in this directory from the original Memory Game inception. This Circuit Builder file is kept separate so the earlier artifact and its audit trail are preserved.

**Context for these questions:** Reverse engineering (HEAD `a328c74`) confirmed that adding a game to DashDen touches roughly 15 integration points across the web app, Game Service, Leaderboard, DynamoDB catalog/theme rows, locales, and several display registries. It also found that the two most recent games each missed registries (`GAME_FILTER_MAP` and `PREMIUM_GAMES`), that the Leaderboard service currently fails type-check and tests, and that game outcomes are currently client-authoritative.

---

## ⚠️ Decisions the user should confirm before these are treated as settled

These four are judgment or business calls rather than engineering conclusions. My answers are defensible defaults, not the only reasonable choice:

| Question | My answer | Why you may want to override |
|---|---|---|
| Q5 — Free vs. paid | B (paid, any tier) | This is a pricing and acquisition decision. An educational physics game is a strong free funnel, and option C (free first levels) converts better, but it needs per-level gating the codebase does not have today. |
| Q1 — Security subset | B | Bounded and coherent. Option C or D buys more real security but expands into backend logging and auth-service rework. |
| Q2 — Leaderboard participation | A | A time-ranked leaderboard sits awkwardly with an exploratory learning game. Option B keeps the build fix but omits the leaderboard. |
| Q26 — Deadline | A (no deadline) | I have no way to know your actual constraints. |

---

## Section 1: Scope of Prerequisite Work (Option B)

You selected Option B, which treats the Leaderboard build failure and a chosen subset of the 13 pre-existing non-compliant security rules as in-scope prerequisite work that must land before Circuit Builder code.

## Question 1
Which security rules should be treated as in-scope prerequisite work for this feature? (Full list and evidence is in `aidlc-docs/inception/reverse-engineering/code-quality-assessment.md`.)

A) Only rules that Circuit Builder directly touches: SECURITY-05 (bounded input validation on the new operations) and SECURITY-11 (a trustworthy score/result contract for a browser-simulated circuit)
B) The above plus the browser-facing hardening that affects every page: SECURITY-04 (CSP/HSTS and other headers) and SECURITY-09/SECURITY-15 (stop rendering client stack traces, fail closed)
C) The above plus logging hygiene: SECURITY-03 (remove full-event and token-prefix logging, standardize redacted structured logs)
D) The above plus the authentication and authorization gaps: SECURITY-08 and SECURITY-12 (cryptographic token validation on the public Auth route, role-based admin authorization instead of hard-coded email lists)
E) All 13 non-compliant rules before any Circuit Builder code lands
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* B is a coherent, bounded package. SECURITY-05 and SECURITY-11 are unavoidable because Circuit Builder adds new inputs and a spoofable simulation result. SECURITY-04, 09, and 15 are browser-facing, cheap relative to their value, and a new browser game benefits directly from them. Stopping stack-trace rendering is a few lines. I excluded SECURITY-08 and SECURITY-12 because cryptographic token validation on the public Auth route and replacing hard-coded admin email lists with role claims is a separate project touching the Auth service, and bundling it would put a production auth rewrite on a game's critical path. Those remain recorded as accepted debt.

## Question 2
The Leaderboard service currently fails type-check and tests because its `Difficulty` is typed as a string while scoring code treats it as numeric. How should this be handled?

A) Fix the Leaderboard type/scoring mismatch as prerequisite work, then have Circuit Builder submit scores to the leaderboard like other games
B) Fix the Leaderboard type/scoring mismatch as prerequisite work, but keep Circuit Builder off the leaderboard for the MVP
C) Do not fix the Leaderboard now; keep Circuit Builder off the leaderboard entirely so the broken service is not touched
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* The fix is mandatory under either A or B, because you cannot safely add a `GameType` to a service that does not compile, and leaving a broken build in place blocks all future backend work. I chose participation over omission so Circuit Builder is not a second-class tile in a hub where leaderboards are part of the paid value. The honest counterargument is in the table above: ranking an exploratory learning game by time can push speed over understanding. My Q15 answer mitigates this by scoring efficiency and penalizing short circuits rather than rewarding raw speed alone.

## Question 3
Reverse engineering found that the existing duplicated game registries drift, and that the last two games shipped with missing entries. How should Circuit Builder handle this?

A) Follow the existing pattern, but add every registry entry correctly and add a test or check that asserts all registries agree for Circuit Builder
B) Follow the existing pattern and add entries correctly, with no new automated consistency check
C) Introduce a single shared game-registry source of truth as prerequisite refactoring, and migrate existing games onto it
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* C is the correct long-term architecture, but migrating every existing game onto a new registry is a large refactor across a live production app, with real regression risk to games that currently work. A fixes the actual observed defect (entries getting missed) and adds a guard that fails loudly if Circuit Builder drifts, at a fraction of the cost. If the consistency test is written generically it becomes the foundation for C later without committing to it now.

---

## Section 2: Security Extension Applicability

## Question 4
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* This is a live production application with real authenticated users, Stripe payments, and children as the primary audience. Disabling the baseline would be inappropriate. Note the distinction from Q1: the baseline stays enforced for all new Circuit Builder code, while Q1 only scopes how much pre-existing debt this feature is responsible for remediating.

---

## Section 3: Access, Audience, and Placement

## Question 5
What access tier should Circuit Builder require? (The authoritative gate is `PAID_GAMES` in `GameService.startGame`; the browser badge/redirect uses `PREMIUM_GAMES` in `GameTile.tsx`.)

A) Free for all signed-in users, subject to the standard Free daily game limit
B) Paid — any paid tier (Light, Standard, or Premium), matching how existing paid games gate
C) Free with limited content (for example the first level or two), with remaining levels requiring a paid tier
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* Every recently added game (Space Entry, Scratch Coding, Bond & Burn, Traffic Lab, Mini Golf, Language Pronunciation) is backend-paid, so B matches the established product pattern and needs no new gating mechanism. C is arguably the better growth play for a game this demonstrable, but the current architecture gates whole games through `PAID_GAMES`, not individual levels, so C means designing and building per-level entitlement. Flagged above as a business decision. If you choose B, Circuit Builder must be added to both `PAID_GAMES` and `PREMIUM_GAMES` — the Mini Golf bug was adding only the former, which hides the paid badge while still blocking play.

## Question 6
What is the target age range for the catalog `ageRange` field and the difficulty of the educational content?

A) 6-8 years — very simple, mostly visual, minimal numbers
B) 8-12 years — series/parallel reasoning with light numeric feedback
C) 12-16 years — includes resistance values, voltage, and current calculations
D) Broad 8-16 years — difficulty levels span simple visual puzzles up to numeric circuit analysis
X) Other (please describe after [Answer]: tag below)

[Answer]: D

*Rationale:* D maps cleanly onto the four-level difficulty convention the app already uses: Easy becomes a purely visual boolean puzzle, Super Hard exposes real numeric analysis. It also widens the addressable audience for a paid game, and it pairs with Q9's progressive numeric disclosure so a single engine serves the whole range.

## Question 7
Which hub category should Circuit Builder appear under in `GAME_FILTER_MAP`?

A) Science
B) Technology or Engineering
C) Math
D) Logic or Puzzle
X) Other (please describe after [Answer]: tag below)

[Answer]: X — `'Science & Math'` (the exact existing category string)

*Rationale:* My original options were imprecise, so I verified the real values in `apps/web/src/pages/hub/GameHubPage.tsx`. The only categories that exist are `'Science & Math'`, `'History & Civics'`, `'Geography & Language'`, and `'Puzzles & Logic'`, surfaced through `FILTER_CHIPS`. Circuit Builder is physics, and the closest precedents (`bond-and-burn` for chemistry, `space-entry`) are both filed under `'Science & Math'`. Inventing a new category would also require a new filter chip and three locale keys for no real benefit.

## Question 8
Which platforms are in scope for this request?

A) Responsive web only (`apps/web`) — the Flutter mobile app is explicitly out of scope
B) Responsive web now, with the design documenting a future Flutter port
C) Web and Flutter mobile together in this effort
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* Your request specified a web mini-game with responsive scaling, so web is the mandate. C would roughly double the work and the Flutter app currently has only the Memory Match MVP. B costs essentially nothing beyond A: keeping the circuit engine as a pure, framework-free module (per Q17) means a future Dart port reimplements only rendering, not physics.

---

## Section 4: Simulation Depth and Educational Model

## Question 9
How deep should the circuit physics go for the MVP?

A) Boolean only — a load is either energized or not; no numeric voltage, current, or resistance
B) Boolean plus qualitative feedback — bulbs glow dimmer or brighter in series versus parallel, with no numbers shown
C) Real numeric calculation — Ohm's law with actual voltage, resistance, and current values computed and displayable
D) Numeric calculation internally, with numbers revealed only at higher difficulty levels
X) Other (please describe after [Answer]: tag below)

[Answer]: D

*Rationale:* Option A cannot satisfy your own stated learning objectives, since resistance and a Variable Voltage Battery are meaningless without numeric computation, and series dimming cannot be derived from a boolean model. D builds one physically correct engine and lets the UI control how much is exposed, which is what makes the broad age range in Q6 workable. It also avoids the trap in A and B where a later "add real physics" request forces an engine rewrite.

## Question 10
Which components must be in the MVP tray? (Your request listed Solar panel, Variable Voltage Battery, Wires, Switches, LED Bulbs, Electric Motors, and Buzzers.)

A) All listed components in the MVP
B) A reduced MVP set — battery, wires, switch, LED bulb — with solar panel, motor, and buzzer added later
C) A moderate MVP set — battery, wires, switch, LED bulb, motor, buzzer — with the solar panel added later
D) All listed components plus a resistor, since resistance is a stated learning objective
X) Other (please describe after [Answer]: tag below)

[Answer]: D

*Rationale:* This flags a gap in the original request: resistance is listed as a learning objective, but no resistor appears in the component list. With Q9 set to D, a resistor is the natural teaching instrument for resistance and current limiting, and it is cheap to add since it is electrically the simplest load. Once the engine models resistance, each additional component is largely a sprite plus a parameter set, so A offers little savings over D. Note that an LED without a current-limiting resistor is itself a good teaching moment.

## Question 11
Your request mentions a target machine such as a Mars Rover or Theme Park ride. What should the MVP ship with?

A) One target machine for all MVP levels (please state which in the Other field if you have a preference)
B) Two target machines, each with its own small level set
C) One target machine per difficulty level
D) No themed target machine for the MVP — just abstract circuit goals, with machines added later
X) Other (please describe after [Answer]: tag below)

[Answer]: A — Mars Rover

*Rationale:* One machine keeps MVP art and narrative scope contained while still delivering the motivating goal your request describes. I chose the Mars Rover over the theme park ride because it gives each component an obvious in-world job (motors drive wheels, the solar panel charges, buzzers alert, LEDs are headlights), it is strongly appealing to the 8-16 audience, and it fits the existing space theme already present in the app. The machine should be data-driven so adding the theme park ride later is content work, not code work.

## Question 12
How many levels or challenges should the MVP contain?

A) 3-5 levels
B) 6-10 levels
C) 11-20 levels
D) A free-play sandbox only, with no discrete levels
E) A sandbox mode plus a small set of guided levels
X) Other (please describe after [Answer]: tag below)

[Answer]: E — sandbox plus approximately 6-8 guided levels

*Rationale:* Your stated objective is teaching "through active experimentation," which is literally a sandbox, while "when the target machine is fully powered" implies goal-directed levels. E serves both and is cheaper than it sounds: once the engine and canvas exist, the sandbox is the same scene with no win condition. Six to eight levels is enough to sequence the concepts properly (closed circuit, switch, series, parallel, short-circuit fault, resistance, variable voltage) without becoming a content project.

## Question 13
Existing games use a numeric difficulty of 1-4 (Easy, Medium, Hard, Super Hard) sent to `startGame`. How should Circuit Builder map onto this?

A) Use all four difficulties, matching the existing convention
B) Use three difficulties (Easy, Medium, Hard) and never send Super Hard
C) Use level progression instead of difficulty, always sending a single fixed difficulty value
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* Four difficulties are the natural vehicle for Q9's progressive numeric disclosure and Q6's broad age range, and matching the convention avoids special-casing Circuit Builder in score calculation and history. One caveat worth noting: `GameService.startGame` independently blocks difficulty 4 for Free users, which is harmless given Q5 makes the whole game paid, but would need thought if you switch Q5 to A or C.

---

## Section 5: Scoring and Result Integrity

## Question 14
Reverse engineering found that game outcomes are currently client-authoritative: the browser reports elapsed time and accuracy, and the backend does not reconstruct the result. What scoring contract should Circuit Builder use?

A) Match the existing pattern — the browser reports the result and the backend accepts it with bounded validation only
B) Bounded and cross-checked — the browser reports the result, and the backend validates it against strict per-level bounds (for example a minimum solve time and a maximum component count) and rejects impossible submissions
C) Server-authoritative — the browser submits the final circuit layout, and the Game Service re-evaluates it to compute the score
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* This is the single most consequential technical answer, and C is unusually practical here because both the web app and the Game Service are TypeScript. Placing the pure circuit engine in `packages/shared` lets the browser and the Lambda run the identical evaluator, so there is no risk of two implementations disagreeing, and `@memory-game/shared` is already bundled into the Game Lambda by the existing deploy script. C is also the only answer consistent with my other recommendations: a competitive leaderboard (Q2=A) fed by a browser-reported circuit result would be trivially spoofable, and C is what actually resolves SECURITY-11 for this game rather than deferring it. If you want a lighter MVP, B is the fallback, but it only narrows the cheating window instead of closing it.

## Question 15
What should determine a player's score?

A) Completion time only, matching the simplest existing games
B) Completion time plus component efficiency (fewer components scores higher)
C) Completion time, component efficiency, and a penalty for short circuits or blown fuses
D) Correctness only — a fixed score per level completed, with no time pressure
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* C is the only option whose incentives match the learning goals: rewarding fewer components teaches elegant circuit design, and penalizing short circuits teaches the fault concept has real cost. It also softens the Q2 concern that a time-ranked leaderboard would reward frantic speed, because an efficient, fault-free circuit can outscore a fast sloppy one. Time should be weighted modestly for this reason.

## Question 16
Should a short circuit end the attempt?

A) No — the fuse pops, the player is shown the educational tooltip, and they may reset and continue the same attempt
B) Yes — a short circuit fails the level and the player must restart it
C) The player gets a limited number of short circuits per level before the attempt fails
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* Your request explicitly calls for a "playful" spark effect and a "helpful educational tooltip," which is pedagogy, not punishment. In a game built on experimentation, a hard fail teaches children to avoid experimenting. A keeps the consequence instructive while Q15's scoring penalty supplies enough real cost that shorts are not free.

---

## Section 6: Interaction, Accessibility, and Presentation

## Question 17
Reverse engineering found that `dnd-kit` is installed but its only consumer is an orphaned file, so there is no proven drag-and-drop pattern in the app. Which approach should the design use?

A) Follow the `BondAndBurnGamePage` precedent — native pointer and touch handlers already working in production
B) Adopt `dnd-kit` properly, since it is already a dependency, and establish it as the app's drag pattern
C) Canvas-based hit-testing following the `MiniGolfGamePage` precedent, with pointer events on a logical coordinate system
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* The requested visuals decide this. Glowing energized trace lines and particle sparks along wire paths need a drawing surface regardless, so a canvas is required either way, and running components as DOM elements over a canvas for wires would mean maintaining two coordinate systems and two hit-test models. `dnd-kit` is built for sortable DOM lists, not for drawing wires between arbitrary terminals, and adopting it on the strength of one orphaned import would be choosing an unproven path. `MiniGolfGamePage` with `miniGolfPhysics.ts` already proves logical-coordinate conversion, pointer and touch handling, and animation-frame cleanup work in this codebase.

## Question 18
Current canvas and drag examples in the app provide no keyboard interaction model. What accessibility level is required?

A) Full keyboard operability — components can be placed and wired without a pointer, and the canvas state is screen-reader accessible
B) Keyboard operability for core actions, with a documented gap for fine wire routing
C) Pointer and touch only for the MVP, with accessibility recorded as explicit known debt
D) Pointer and touch only, plus a reduced-motion preference for the spark and celebration animations
X) Other (please describe after [Answer]: tag below)

[Answer]: B — and reduced-motion support from option D is required regardless

*Rationale:* An educational product aimed at children is very likely to reach classrooms, where accessibility is both an ethical and often a procurement requirement, so C is hard to defend. Full screen-reader narration of an arbitrary circuit graph (option A) is genuinely substantial work and risks becoming the largest part of the feature. B is the honest middle: because the grid is discrete, keyboard placement and terminal-to-terminal connection are tractable, and the remaining gap for freeform routing gets documented rather than hidden. I am explicitly folding D's reduced-motion requirement in, since sparks and celebration animations are exactly the content `prefers-reduced-motion` exists for, and treating it as a separate option was a flaw in how I wrote the question.

## Question 19
Your request specifies a success jingle, and reverse engineering found no reusable audio service in the app. How should audio be handled?

A) Build a small reusable audio service (respecting browser gesture requirements, a mute preference, and cleanup) and use it for Circuit Builder
B) Implement audio locally inside the Circuit Builder page only, with a mute toggle
C) Ship the MVP with no audio; visual celebration only
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* The hard parts of browser audio are the autoplay gesture requirement, honoring an existing sound preference, and cleaning up on unmount, and a page-local implementation (B) typically gets these wrong in ways that produce console errors or audio that survives navigation. The correct version is small, so A costs little more than B while giving the next game a working path. Reverse engineering specifically flagged the absence of this service as a gap, and the app already stores sound preferences that audio should respect.

## Question 20
Your request specifies particle spark effects, and no particle engine exists. What is acceptable?

A) A real canvas particle effect, implemented within the Circuit Builder game
B) A CSS and Framer Motion effect approximating sparks, reusing existing animation patterns
C) A reusable particle utility other games can later use
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* Q17 already puts a canvas and animation loop in place, so emitting particles there is incremental rather than new infrastructure, and it will look markedly better than DOM-based approximations for a spark at a specific wire coordinate. C is premature generalization for a single effect with no second consumer; if another game wants sparks later, extracting the utility then will be informed by an actual second use case.

## Question 21
The app ships English, Spanish, and Portuguese locale files, and some recent games were added without full translations. What is required here?

A) Full translations for all three languages (en, es, pt) including level text and educational tooltips
B) English complete, with Spanish and Portuguese for navigation and catalog text only
C) English only for the MVP, with translations tracked as follow-up work
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* For this game the educational text is the product, not decoration. The short-circuit tooltip explaining why the fuse blew is the actual teaching moment, so an untranslated tooltip makes the game pedagogically useless for Spanish and Portuguese players while still charging them. That is a different situation from a recent game shipping with partial UI translations, and your git history shows translation gaps becoming follow-up bug fixes, which argues for doing it once, correctly.

## Question 22
All protected routes are wrapped by `AppLayout`, which constrains page width. The canvas may want more room.

A) Keep Circuit Builder inside the standard `AppLayout` shell like every other game
B) Allow an edge-to-edge or full-bleed canvas for this game, adjusting the layout where needed
C) Keep the standard shell on desktop, but allow a full-screen canvas mode on mobile
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* On desktop the standard shell gives enough room for a grid plus a side tray, and staying inside it avoids destabilizing a layout shared by every other protected route. On a phone, a component tray plus a usable snap-to-grid canvas genuinely does not fit within the standard padding, which is where your responsive-scaling requirement actually bites. C confines the layout exception to the viewport that needs it rather than changing the shell for everyone.

---

## Section 7: Delivery and Verification

## Question 23
Catalog and theme rows are seeded manually by shell scripts outside CI/CD, which is why a deployed game can be invisible or fail theme validation. How should Circuit Builder's data registration be handled?

A) Follow the existing pattern — a `scripts/seed-circuit-builder.sh` script, run manually and committed to the repository
B) A seed script plus an idempotent verification command that confirms the catalog and theme rows exist and are valid
C) Move catalog and theme seeding into the GitHub Actions deployment path as prerequisite work
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* Plain A reproduces the exact failure mode reverse engineering documented, where a game can deploy successfully and still be invisible in the hub or fail theme validation at `startGame`. The verification command is small and converts a silent data problem into an explicit check you can run after seeding. C is the better end state but means building data migration into a deploy workflow that currently has no test, scan, or rollback stage, which is a CI/CD project rather than part of a game.

## Question 24
What automated test coverage is required before this is considered done?

A) Unit and property tests for the pure circuit engine (connectivity, open switches, series versus parallel, short detection, scoring determinism) plus backend tests for the new operations
B) The above plus component or browser tests for drag, drop, and wiring interactions, which requires new test tooling the repository does not currently have
C) The above plus a mobile viewport and reduced-motion regression check
D) Manual verification only, matching how recent games shipped
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* Correctness in this feature lives almost entirely in the circuit engine, and because Q17 keeps that engine pure and framework-free it is fully testable without rendering React. `fast-check` is already available, and connectivity, series versus parallel, and short detection are ideal property-test targets. B and C would require introducing browser and viewport test tooling to a repository that has none, which is a meaningful infrastructure effort that would likely exceed the game itself. The resulting gap is real and should be stated plainly: drag, wiring, and mobile layout will be verified manually.

## Question 25
Backend commits and deployments must go through GitHub Actions. How should this feature be delivered?

A) One pull request containing everything — prerequisite fixes and Circuit Builder together
B) Separate pull requests — prerequisite security and Leaderboard fixes merged and verified first, then Circuit Builder
C) Prerequisite fixes first, then frontend Circuit Builder, then backend Circuit Builder integration, as three stages
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* C follows directly from your Option B choice, which separates prerequisite work from feature work, and it keeps each pull request small enough to review properly. It also respects a specific deployment hazard: merging backend paths to `main` immediately deploys to production Lambdas with no test, smoke, or rollback stage in the workflow, so isolating the backend change into its own reviewable step limits blast radius. A would mix a production security fix, a broken-build repair, and a new game into one unreviewable change.

## Question 26
Is there a deadline or constraint I should design around?

A) No deadline — prioritize correctness and completeness
B) Prioritize a working, demonstrable frontend quickly, with backend integration following
C) There is a hard deadline (please state it after the [Answer]: tag)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* I have no visibility into your actual schedule, so I chose the answer that does not silently trade away quality. Worth noting that B is largely compatible with C in Q25: that staging already produces a demonstrable frontend before backend integration, so if you do have time pressure, say so and the plan barely changes in shape, only in what gets cut.
