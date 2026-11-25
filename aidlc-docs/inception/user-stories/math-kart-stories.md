# Math Rally - User Stories

**Created**: 2026-11-25
**Stage**: INCEPTION - User Stories (standard depth)
**Basis**: `../requirements/math-kart-requirements.md` (FR-MK-1 to FR-MK-56, NFR-MK-1 to NFR-MK-26), `math-kart-personas.md`. Game name "Math Rally" (owner answer Q22); file names keep the `math-kart-` prefix for this inception run.

## Assessment and approach

- **Execute User Stories: Yes.** High-priority criteria from `inception/user-stories.md` apply: a new user-facing game, two platforms, four personas (child, teen, parent, operator), and business rules with several scenarios (scoring, tiers, offline play). Expected benefit: testable criteria for a game whose "feel" is otherwise judged by impression.
- **Approach** (pre-decided under the owner's standing approval, same as Quest Map): user-journey groups A to G, medium granularity (one story per player-visible behaviour), Given/When/Then criteria, plus **verification stories** (V) for checks that are not a player outcome. Story ids `MK-<n>`. Separate story-plan and assessment files were not created; this section records both so the file set stays as listed in the brief.
- **Priority**: `P0` must have for launch, `P1` should have.
- **MANUAL** marks criteria with no automated coverage (NFR-MK-22); Construction writes the steps.
- Criteria quote FR and NFR ids; the requirement's own acceptance criteria (`AC-<FR>.<n>`) are not repeated.
- **INVEST check**: each story is independent of the others' implementation order except where noted, small enough for one unit, and testable through its criteria.

---

# A. Discover and set up

## MK-1 - Find Math Rally in the hub
**P0 · MKP1, MKP2, MKP3**

As a player, I want a Math Rally tile in the hub on the website and in the app so I can find the game.

- **Given** I am signed in **When** I open the hub on web or in the app **Then** I see the Math Rally tile with its icon, title and description in my language
- **When** I choose the "Science & Math" filter **Then** the tile is still shown
- **When** I select the tile **Then** I land on the Math Rally setup screen
- **Given** I use an older app version that does not know Math Rally **Then** no tile appears and nothing breaks

*Requirements: FR-MK-35, FR-MK-36, FR-MK-45*

## MK-2 - Choose a difficulty and learn the controls
**P0 · MKP1, MKP2**

As a player, I want to pick Easy, Medium, Hard or Super Hard and see how to steer before I race.

- **Given** I am on setup **Then** I see four difficulties, each with its number of paths (2, 3, 4, 4)
- **And** a "How to play" panel shows the keys (arrows or A/D, P to pause) and the bottom joystick
- **Given** I am on the FREE tier **Then** Super Hard is shown locked with the existing upgrade path, and I cannot start it (after a paid switch Medium and Hard are locked too, MK-28)
- **Given** I open the game from a Quest Map style link with `?difficulty=medium` **Then** setup is skipped and Medium starts

*Requirements: FR-MK-40, FR-MK-45, FR-MK-53, Section 4.0*

# B. Race

## MK-3 - Start a race
**P0 · MKP1, MKP2**

As a player, I want the race to load, count down and go without wasting a play.

- **Given** I press Start **Then** the scene loads first (road, hills, Benji's kart from behind) and only then is my game started on the server
- **When** the race data arrives **Then** I see 3-2-1-Go and the kart drives off by itself
- **Given** my browser cannot run the game (for example WebGL is off) **Then** I see a short message and a way back, and no play was used
- **And** nothing in the scene looks like a Nintendo character, kart, item or track

*Requirements: FR-MK-1, FR-MK-2, FR-MK-3, FR-MK-25, FR-MK-26, FR-MK-44*

## MK-4 - Read the question and the answers on the fork
**P0 · MKP1, MKP2**

As a player, I want to see the question at the top and one answer on each road so I know where to go.

- **Given** a fork is coming **Then** the question is shown in a banner at the top in my language, and each branch has a sign with one answer
- **And** the question stays visible for at least the reading window of my difficulty (8, 7, 6 or 5 s) even when I am boosting
- **And** exactly one sign is correct
- **And** the HUD shows fork progress ("3 / 10"), my coins and the race time
- **When** I pass the fork **Then** the branches rejoin before the next question appears

*Requirements: FR-MK-6, FR-MK-7, FR-MK-8, FR-MK-12, FR-MK-19, FR-MK-23*

## MK-5 - Steer with the keyboard
**P0 · MKP2**

As a keyboard player, I want each key press to move me exactly one lane.

- **When** I press Left or A **Then** the kart moves one lane left; Right or D moves one lane right
- **Given** I am in the leftmost lane **When** I press Left **Then** nothing happens
- **And** the lane I am in when I cross the decision line is my answer; if I do not steer, my current lane counts
- **And** arrow keys never scroll the page during the race

*Requirements: FR-MK-9, FR-MK-20*

## MK-6 - Steer with one thumb on the phone
**P0 · MKP1**

As a phone player, I want a joystick at the bottom that I can use with one thumb.

- **Given** I hold the phone in portrait **Then** a horizontal joystick sits at the bottom centre, and the pause button is at the top
- **When** I push the knob past the middle **Then** the kart moves one lane; holding it moves again after a short delay; letting go re-centres it
- **And** touching the game never scrolls, zooms or selects text
- MANUAL: on a 320 px wide phone, the joystick and pause button are each at least 44 x 44 px and reachable with either thumb

*Requirements: FR-MK-9, FR-MK-21*

## MK-7 - Get rewarded for a right answer
**P0 · MKP1, MKP2**

As a player, I want a clear reward when I pick the right road.

- **When** I take the correct branch **Then** I see a green check, hear a chime (if sound is on), get one coin and a short boost
- **And** my coin count always equals my correct answers

*Requirements: FR-MK-10*

## MK-8 - Learn from a wrong answer
**P0 · MKP1, MKP2, MKP3**

As a player, I want to know I was wrong and what the right answer was, without the race ending.

- **When** I take a wrong branch **Then** I see a red X, hear an error sound (if sound is on), and the correct answer is shown for at least 1.5 s (for example "7 x 8 = 56")
- **And** the branch is bumpy and the kart slows for about 1.5 s; there is no spin-out and no lives, and the race goes on
- **And** the X and the check differ in shape and text, not only in colour
- **And** each wrong answer lowers my final score compared with getting it right

*Requirements: FR-MK-11, FR-MK-32*

## MK-9 - Pause, resume or quit
**P0 · MKP1, MKP2**

As a player, I want to stop the race at any time without losing time.

- **When** I press the pause button, P or Escape **Then** the race and its clock freeze and a menu offers Resume, Sound on/off and Quit
- **When** I switch tabs or the app goes to the background **Then** the race pauses by itself
- **When** I resume after 60 s **Then** my race time has not grown by those 60 s
- **When** I choose Quit and confirm **Then** the race ends with no score and the play stays used, as in other games

*Requirements: FR-MK-5, FR-MK-22, FR-MK-48*

## MK-10 - Finish and see my real score
**P0 · MKP2, MKP1**

As a player, I want the finish line to celebrate and then show the score the server gave me.

- **Given** I pass the last fork **Then** I cross a finish line with a short celebration
- **Then** the result screen shows my server-computed score breakdown, correct answers out of the total, and my time
- **And** the score is the one `completeGame` returned, never a number my device made up
- **And** with time equal, one more correct answer always gives a higher score
- **Given** I launched from a Quest Map node (later) **Then** the result also shows my stars

*Requirements: FR-MK-4, FR-MK-24, FR-MK-27, FR-MK-29, FR-MK-32, FR-MK-33*

# C. Learning content

## MK-11 - Questions match my level
**P0 · MKP1, MKP2, MKP3**

As a player (or parent), I want each difficulty to ask the math that fits the age.

- **Given** Easy **Then** I only see addition and subtraction within 20 with no negative answers
- **Given** Medium **Then** I see times tables 2 to 10, exact division, and addition or subtraction within 100
- **Given** Hard **Then** I see two-step expressions, fractions of a number, simple percentages and squares
- **Given** Super Hard **Then** I see negatives, adding fractions, percentages, powers and roots, and one-step equations
- **And** answers are whole numbers or fractions like 3/4, never decimals, and never longer than 4 characters
- **And** no question repeats within a race
- MANUAL: the owner plays each difficulty with a child in the target age and records whether it felt right (risk R14)

*Requirements: FR-MK-13, FR-MK-14, FR-MK-17*

## MK-12 - Wrong signs look like real mistakes (verification story)
**P0 · MKP3, MKP4**

- [ ] Distractors come from the mistake rules (off by 1 or 2, off by 10, neighbouring times-table product, wrong operation, swapped digits, sign error, fraction mistake) where the rule fits the question
- [ ] All signs in a fork are different and exactly one is correct
- [ ] The correct sign's position is spread evenly and never the same more than 3 forks in a row
- [ ] The same seed and difficulty always build the same race; the generator uses no clock, network or `Math.random`

*Requirements: FR-MK-15, FR-MK-16, FR-MK-18*

# D. In the app

## MK-13 - Play Math Rally inside the DashDen app
**P0 · MKP1, MKP4**

As an app player, I want Math Rally to work in the app just like on the website.

- **Given** I open Math Rally in the app **Then** I pick a difficulty on a native setup screen, race in the same game as on the website, and see the app's usual result screen
- **And** the game's files come from inside the app, not from the internet
- **And** the app, not the game page, talks to the DashDen server; the game page never receives my login token, email or username
- **Given** the game build in the app reports a protocol version the app does not support **Then** I see a short "update the app" message and no play is used
- **And** the game build carries an identifier that ties it to the source commit it was built from

*Requirements: FR-MK-42, FR-MK-45, FR-MK-46, FR-MK-47, FR-MK-49, FR-MK-51*

## MK-14 - The app behaves when I leave or go back
**P0 · MKP1**

- **When** I switch to another app or lock the phone **Then** the race is paused when I come back
- **When** I press Android Back during a race **Then** the pause menu opens; a second confirmation quits
- **When** I leave the Math Rally screen **Then** the game page is closed and no sound keeps playing
- **And** the game uses the app's sound and reduced-motion settings
- MANUAL: on iPhone, check what happens to game sound with the silent switch on, and record it (risk R3)

*Requirements: FR-MK-22, FR-MK-48*

## MK-15 - Race without a connection (unscored)
**P1 · MKP1**

As an app player, I want to race even when the server cannot be reached, knowing the result will not be saved.

- **Given** the app cannot reach the server (not a rate limit, paywall or quest refusal) **When** I start **Then** an unscored race starts with questions made on the phone
- **And** the result screen says the race was not saved
- **Given** I am out of plays or the game is not allowed for my tier **Then** I see the usual block screen instead

*Requirements: FR-MK-50*

# E. Accessibility and comfort

## MK-16 - Calm mode with reduced motion
**P0 · MKP3, MKP1**

- **Given** my device asks for reduced motion (or the app setting is on) **Then** there is no screen shake, spin, flashing or speed lines, and the finish celebration is static
- **And** nothing in the game flashes more than 3 times per second, in any mode
- **And** (P1, web) a screen reader hears the current question and options through a live region; the race itself is not playable by screen reader, and this is stated in the "How to play" text

*Requirements: NFR-MK-7, NFR-MK-8*

## MK-17 - Four readable signs on a small phone
**P0 · MKP1**

- **Given** Hard on a 320 px wide phone **Then** the question text is at least 28 px and each of the 4 signs at least 20 px bold, with contrast of at least 4.5:1
- **And** when the signs in the scene would be smaller than that, the same answers appear as lane labels near the kart
- MANUAL: check on the reference phones at 320 and 375 px widths, portrait and landscape

*Requirements: NFR-MK-6, FR-MK-14*

## MK-18 - Sound control and feedback without colour
**P0 · MKP1, MKP3**

- **When** I turn sound off in the pause menu **Then** all game sound stops and stays off next time (stored preference on web, app setting in the app)
- **And** right and wrong feedback works with sound off and without colour vision (icon shape and text)
- **And** sound only starts after my first touch or key press

*Requirements: FR-MK-10, FR-MK-11, FR-MK-22, NFR-MK-7*

# F. Fairness, safety and trust

## MK-19 - The server decides the score (verification story)
**P0 · MKP2, MKP4 · Security**

- [ ] `startGame` for Math Rally builds the race on the server and stores the answer key with the game
- [ ] `completeGame` reads only the chosen lane per fork and the fork times; a sent `correctAnswers` or score is ignored
- [ ] Wrong lengths, out-of-range choices, non-integers, non-increasing times and extra keys are rejected
- [ ] A race faster than the kart's top speed allows is rejected
- [ ] Every rejection returns one generic message, writes nothing, publishes nothing, leaves the game open for a corrected submission, and emits a rejection metric
- [ ] Completing an already completed game is refused; a FREE user cannot start Super Hard; one race uses one play
- [ ] Owner note: a script that reads the questions can still play perfectly; it then scores exactly what a perfect human would, never more (NFR-MK-13)

*Requirements: FR-MK-26, FR-MK-27, FR-MK-28, FR-MK-29, FR-MK-30, FR-MK-31, FR-MK-34, NFR-MK-11, NFR-MK-12, NFR-MK-13, NFR-MK-14, NFR-MK-15 · Security: SECURITY-03, -05, -08, -11, -15*

## MK-20 - Safe for kids, free of borrowed IP (verification story)
**P0 · MKP3, MKP4**

- [ ] Benji is an original cartoon; no photo, likeness, voice, surname, age or location of the real child appears anywhere
- [ ] The game collects no new personal data; per-fork choices are not stored; logs carry counts and ids only
- [ ] The game makes no third-party or remote request and shows no ads
- [ ] A credits manifest lists source, licence and URL for every art, sound and font file, and a test fails if a file in the game's assets has no entry
- [ ] No Nintendo characters, names, items, item boxes, sounds, music, track names or trade dress
- [ ] Wrong-answer text is friendly ("Almost! 7 x 8 = 56"), never "you lose"
- [ ] The final name has had a trademark check before launch (risk R6)

*Requirements: FR-MK-1, FR-MK-2, NFR-MK-19, NFR-MK-20, NFR-MK-21*

## MK-21 - The app's web view is locked down (verification story)
**P0 · MKP4 · Security**

- [ ] Release builds have web-content debugging off and file access off
- [ ] Only the app-internal origin loads; external navigation and pop-ups are refused
- [ ] The bundled page has its own CSP that allows only its own app-internal origin (`'self'` for every source, including `connect-src`), so no request leaves the device
- [ ] The bridge exposes only the message channel, and both sides reject unknown, oversize or malformed messages
- [ ] On web, the game works under the current CSP without `unsafe-eval` or inline scripts; any added source is narrow and documented

*Requirements: FR-MK-46, FR-MK-47, FR-MK-49, NFR-MK-17, NFR-MK-18 · Security: SECURITY-04, -05, -09, -13*

# G. Platform and operations

## MK-22 - Math Rally on the leaderboard and in my history
**P0 · MKP2**

- **Given** I finish a race **Then** it appears on the leaderboard under Math Rally, and in History, Statistics and Achievements, on web and in the app
- **And** the leaderboard accepts every score and time the Game Service can produce (no silent drops)
- Owner note: adding Math Rally raises the Achievements page's "play every game" total by one, as Circuit Builder did

*Requirements: FR-MK-33, FR-MK-36, FR-MK-38*

## MK-23 - Every registry knows Math Rally (verification story)
**P0 · MKP4**

- [ ] Theme id `MATH_RALLY`, catalog id `math-rally`, routes and category are used consistently
- [ ] A consistency test fails, naming the registry, when any web or backend registry lacks Math Rally (with a mutation suite)
- [ ] The same test fails if `MATH_RALLY` is in the shared paid list but not in web `PREMIUM_GAMES` or the app's paid copy, or the reverse
- [ ] Seed and verify scripts follow the Circuit Builder safety rules, and the production order (Leaderboard, Game Service, web and app live, seed last) is printed by the seed script

*Requirements: FR-MK-35, FR-MK-36, FR-MK-37, FR-MK-39*

## MK-24 - The rest of dashden.app stays light (verification story)
**P0 · MKP4, MKP3**

- [ ] Phaser and the game code load only on the Math Rally game route; the entry chunk grows by at most 2 KB gzip
- [ ] The hub and every other page request no Math Rally file
- [ ] The game core has no React, network or Flutter dependency, and one game instance exists even under React StrictMode
- [ ] Leaving the game frees the engine, its WebGL context and audio; five races in a row show no steady memory growth
- [ ] Game code is at most 450 KB gzip and first-race assets at most 1.5 MB, or the miss is reported to the owner with options

*Requirements: FR-MK-41, FR-MK-42, FR-MK-43, NFR-MK-3, NFR-MK-4, NFR-MK-5*

## MK-25 - Performance gate on real phones (verification story)
**P0 · MKP4**

- [ ] The vertical slice is measured over a full race on the reference Android phone inside the app WebView, the owner's iPhone, and desktop Chrome and Safari
- [ ] Pass: median at least 50 fps, slowest 1% of frames at least 30 fps, lane change visible within 100 ms
- [ ] Fail after optimisation: work stops and the owner chooses between fewer effects, lower resolution, another renderer mode, or the Flame fallback
- [ ] The frame-time overlay used for measuring is absent from production builds

*Requirements: NFR-MK-1, NFR-MK-2*

## MK-26 - Ready for Quest Map (verification story)
**P1 · MKP4**

- [ ] The web game route accepts `?difficulty=easy|medium|hard&quest=<world>:<node>:<leg>` and starts through `api/game.ts`, so the quest context reaches the server
- [ ] The app play screen accepts a quest context
- [ ] A game started with a valid quest context returns a `quest` result on completion
- [ ] No Quest Map node is added; adding one later is config and launch-table rows only (not in World 1 while the paid switch is undecided)

*Requirements: FR-MK-52*

## MK-27 - Free now, paid later if the owner decides
**P0 (free at launch) and P1 (switch checklist) · MKP4, MKP3**

As the owner-operator, I want Math Rally free at launch and a small, safe path to make it paid later.

- **Given** launch **Then** a FREE user can start Easy, Medium and Hard; Super Hard needs a paid tier, as in every game (Q7)
- **And** `MATH_RALLY` is in none of the paid lists
- **Given** the owner decides to make it paid **Then** a written checklist first confirms the Easy-only exception and its tests (MK-28), then covers the three paid lists, the Game Service and web deploys and the app release, and no score code changes (the cap follows the shared paid list)
- **And** past scores and leaderboard entries stay

*Requirements: FR-MK-32, FR-MK-37, FR-MK-53, FR-MK-54*

## MK-28 - Easy stays free after a paid switch
**P0 (gate ships in v1, inert while the game is free) · MKP1, MKP3, MKP4 · Security**

As a FREE player (or a parent), I want Easy Math Rally to stay playable even if the game becomes paid, so a child who loves it is not shut out.

- **Given** Math Rally has been switched to paid and I am on the FREE tier **When** I open the hub **Then** the tile shows the paid badge and "Easy is free", and selecting it opens setup (no redirect to the subscription page on web; the tile is playable in the app)
- **And** on setup, Easy is playable; Medium, Hard and Super Hard show the paid badge, with the existing upgrade link on web and the app's neutral "not on your plan" state (no price, no purchase button)
- **When** I start Easy **Then** the server accepts it and it uses one of my normal 3 FREE plays for the day, shared with every other game (no separate counter)
- **Given** a hand-crafted request or an older app asks for Medium as a FREE user **Then** the server refuses it with the existing paid-required message and no play is used
- **And** every other paid game still refuses FREE users at every difficulty
- **And** before the switch (launch state) only Super Hard is locked for FREE users, on both hosts

*Requirements: FR-MK-55, FR-MK-56, FR-MK-40, FR-MK-54 · Security: SECURITY-08, -11*

---

## Traceability Matrix

| FR | Stories | FR | Stories | FR | Stories |
|---|---|---|---|---|---|
| FR-MK-1 | MK-3, MK-20 | FR-MK-19 | MK-4 | FR-MK-37 | MK-23, MK-27 |
| FR-MK-2 | MK-3, MK-20 | FR-MK-20 | MK-5 | FR-MK-38 | MK-22 |
| FR-MK-3 | MK-3 | FR-MK-21 | MK-6 | FR-MK-39 | MK-23 |
| FR-MK-4 | MK-10 | FR-MK-22 | MK-9, MK-14, MK-18 | FR-MK-40 | MK-2, MK-28 |
| FR-MK-5 | MK-9 | FR-MK-23 | MK-4 | FR-MK-41 | MK-24 |
| FR-MK-6 | MK-4 | FR-MK-24 | MK-10 | FR-MK-42 | MK-13, MK-24 |
| FR-MK-7 | MK-4 | FR-MK-25 | MK-3 | FR-MK-43 | MK-24 |
| FR-MK-8 | MK-4 | FR-MK-26 | MK-3, MK-19 | FR-MK-44 | MK-3 |
| FR-MK-9 | MK-5, MK-6 | FR-MK-27 | MK-10, MK-19 | FR-MK-45 | MK-1, MK-2, MK-13 |
| FR-MK-10 | MK-7, MK-18 | FR-MK-28 | MK-19 | FR-MK-46 | MK-13, MK-21 |
| FR-MK-11 | MK-8, MK-18 | FR-MK-29 | MK-10, MK-19 | FR-MK-47 | MK-13, MK-21 |
| FR-MK-12 | MK-4 | FR-MK-30 | MK-19 | FR-MK-48 | MK-9, MK-14 |
| FR-MK-13 | MK-11 | FR-MK-31 | MK-19 | FR-MK-49 | MK-13, MK-21 |
| FR-MK-14 | MK-11, MK-17 | FR-MK-32 | MK-8, MK-10, MK-27 | FR-MK-50 | MK-15 |
| FR-MK-15 | MK-12 | FR-MK-33 | MK-10, MK-22 | FR-MK-51 | MK-13 |
| FR-MK-16 | MK-12 | FR-MK-34 | MK-19 | FR-MK-52 | MK-26 |
| FR-MK-17 | MK-11 | FR-MK-35 | MK-1, MK-23 | FR-MK-53 | MK-2, MK-27 |
| FR-MK-18 | MK-12 | FR-MK-36 | MK-1, MK-22, MK-23 | FR-MK-54 | MK-27, MK-28 |
| FR-MK-55 | MK-28 | FR-MK-56 | MK-28 | | |

All 56 FRs are covered. NFR coverage: NFR-MK-1 and 2 in MK-25; 3 to 5 in MK-24; 6 in MK-17; 7 in MK-16 and MK-18; 8 in MK-16; 11 to 15 in MK-19; 17 and 18 in MK-21; 19 to 21 in MK-20. NFR-MK-9 (localisation), 10 (offline fonts), 16 (supply chain), 22 (testability), 23 (compatibility), 24 (platforms), 25 (stack) and 26 (metrics) are cross-cutting and verified in Build and Test rather than through a single story.

**Persona coverage**: MKP1 in MK-1 to MK-4, MK-6 to MK-11, MK-13 to MK-18, MK-28; MKP2 in MK-1 to MK-5, MK-7 to MK-11, MK-19, MK-22; MKP3 in MK-1, MK-8, MK-11, MK-12, MK-16, MK-18, MK-20, MK-24, MK-27, MK-28; MKP4 in MK-12, MK-13, MK-19 to MK-21, MK-23 to MK-28.
