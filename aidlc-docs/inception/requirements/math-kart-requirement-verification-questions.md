# Math Rally - Requirement Verification Questions

**Feature**: Math Rally (final name, owner answer to Q22 of 2026-11-25), a kart-racing math game where Benji, the in-game driver, picks the road fork whose sign shows the right answer
**File names**: this inception run keeps the `math-kart-` file prefix so the review and report steps find the files; the first Construction step renames them to `math-rally-` (see `../plans/math-kart-execution-plan.md`). Requirement, story and persona ids keep their `MK` labels.
**Created**: 2026-11-25
**Basis**: owner request of 2026-11-25 (logged verbatim in `aidlc-docs/audit.md`), the "Option A" context agreed in conversation, and code read at `c6ccf0f` (see `../reverse-engineering/math-kart-delta-notes.md`).

## How to read the answers

Every `[Answer]:` is filled with one of these labels:

- **Owner answer (2026-11-25)**: given by the owner; binding.
- **Owner context (agreed earlier)**: agreed in the conversation before this stage; binding.
- **Recommended (pending owner approval)**: the analyst's recommendation with a one-line rationale. The owner delegated these; change the letter to override, then revisit the linked requirements (traceability table in `math-kart-requirements.md` Section 12).
- **OPEN**: the owner has not decided. A recommendation is given, and the question stays open until the owner answers. No question is OPEN any more: the owner answered Q7, Q20, Q21 and Q22 on 2026-11-25 (relayed by the orchestrator).

**Iteration 2 (after the design review of 2026-11-25)**: Q16, Q17, Q27, Q29 and Q31 were revised (marked "Revised in iteration 2" in their answers), analyst notes were added to the owner answers Q10 and Q11 without changing the owner's choice, and Q39 and Q40 were added. All revised and new answers are Recommended (pending owner approval).

**Iteration 4 (after the third design review)**: Q26 gained an analyst note on Android Back when the game does not answer; no letter changed and no question was added.

## Map from the brief's open decisions

| Brief decision | Questions | Status |
|---|---|---|
| 1 Road rendering | Q1 | Owner answer |
| 2 Wrong and right answer, race end | Q2, Q3, Q4, Q5 | Q2 owner; Q3 to Q5 recommended |
| 3 Fork mechanics | Q6, Q7, Q8, Q9, Q39 | Q6, Q7 owner; Q8, Q9, Q39 recommended |
| 4 Math content and distractors | Q10, Q11 | Owner answer |
| 5 Controls and accessibility | Q12, Q13, Q14 | Owner answer |
| 6 Anti-cheat and scoring | Q16, Q17, Q18, Q40 | Recommended |
| 7 Tier and name | Q19, Q20, Q21, Q22 | Owner answer |
| 8 Flutter embedding | Q23, Q24, Q25, Q26 | Recommended |
| 9 Performance budget | Q27, Q28, Q29 | Recommended |
| Found during analysis | Q15, Q30 to Q38 (Q39 and Q40 came from the design review and are listed above) | Q30 owner context; others recommended |

---

## A. Look and race rules

## Question 1
How is the road rendered?

A) Pseudo-3D road seen from behind the kart (OutRun-style segment projection with scaled sprites), drawn by Phaser 4
B) Top-down or isometric track drawn by Phaser 4
C) Real 3D (three.js, or Phaser plus a 3D library)
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): follow the recommendation. Comparison behind it: **Look**: A gives the behind-the-kart "Mario-Kart style" view and a dramatic fork; B reads like a board game; C looks best. **Phone performance**: A draws flat polygons and sprites only; C needs models, lighting and depth, the heaviest load on GPU and battery. **Effort**: A is medium (the fork is the custom part; branching roads are a known pseudo-3D technique, OutRun used them); B is low; C is high and needs 3D art. **Bundle**: A and B add Phaser only; C adds a 3D library on top. **Phaser fit**: A and B use Phaser's 2D renderer; C replaces Phaser as the renderer, which contradicts Option A. **Blocker check**: nothing in the repository blocks A. Whether Phaser 4 draws the forked road at the target frame rate on phones is unverified (no device test was possible here), so the first construction unit is a vertical slice with a performance gate (Q29).

## Question 2
What feedback does the player get for a right or a wrong answer, and does it affect the score?

A) Wrong: clear feedback (red X, error sound) and a lower final score. Right: positive feedback (green check, chime)
B) Feedback only, no score effect
C) Score effect only, feedback at the end of the race
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): "let's the user know (X in red, etc) and affects final scoring". Added by the analyst within that answer: after a wrong pick the correct answer is shown briefly (as Math Challenge does with `setup.mathChallenge.wrong`), and feedback never relies on colour alone (icon plus text plus sound).

## Question 3
Besides the score, what happens in the race after a wrong answer?

A) Short slowdown: the wrong branch is bumpy and the kart drops to about 60% speed for about 1.5 s. No spin-out, no lives
B) Spin-out: the kart spins and stops for 2 to 3 s
C) Lives: three wrong answers end the race
D) Time penalty only: seconds are added to the clock, no visible effect
E) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). A visible, short consequence teaches without frustrating an 8-year-old. B costs too much time and conflicts with reduced motion; C ends races early, so weaker players see fewer questions and the question count varies; D is invisible.

## Question 4
What does a right answer give, besides the positive feedback?

A) A coin and a short speed boost (about 1 s); the coin counter in the HUD equals the number of correct answers
B) A coin only
C) A boost only
D) Item boxes with power-ups
E) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Coin plus boost is the arcade reward kids expect, and tying coins to correct answers keeps the score server-verifiable. D echoes Mario Kart trade dress and creates score paths the server cannot check.

## Question 5
When does a race end?

A) After a fixed number of forks, at a finish line: 10, 12, 15 and 15 forks for difficulty 1 to 4
B) After 3 laps of a looped track, with forks wherever they fall
C) After a time limit (for example 2 minutes), with as many forks as the player reaches
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). A fixed question count gives a fixed `totalQuestions`, a simple server check and comparable leaderboard scores. Estimated race length is 1.5 to 2 minutes (computed from Q8 windows plus about 2 s per merge, not measured); Math Challenge uses 10/15/20 questions in 120 to 240 s.

## Question 6
How many paths does each fork have?

A) Easy 2, Medium 3, Hard 4
B) Always 2
C) Always 3
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): "easy has two paths, medium 3 and hard 4". Consequence: 4 signs must stay legible on a 320 to 375 px wide phone (NFR-MK-6). Super Hard is Q7.

## Question 7
What does Super Hard (difficulty 4) look like?

A) 4 paths, a shorter reading window (5 s instead of 6 s) and Super Hard content (Q10)
B) Same as Hard (4 paths, 6 s) with harder content only
C) 5 paths
D) No Super Hard for Math Rally (difficulties 1 to 3 only)
E) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25, relayed by the orchestrator): A accepted, 4 paths, a 5 s reading window and Super Hard content, paid-only like every difficulty 4 today. Basis kept from the recommendation: 5 signs do not fit a 320 px screen (C) and every other game offers 4 levels; FREE users cannot start difficulty 4 on any game (`services/game/src/services/game.service.ts`), and no exception is made for Math Rally.

## Question 8
How long is the question visible before the player must be in a lane?

A) The question appears as soon as the previous fork rejoins the road, and stays at least 8, 7, 6 and 5 s (difficulty 1 to 4) before the decision line, measured at the kart's maximum speed
B) A fixed 5 s for all difficulties
C) The kart waits at the fork until the player picks
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Measuring at maximum speed means a boost can never cut reading time below the floor. C removes the racing feel; B is too short for an 8-year-old reading "13 - 7".

## Question 9
How does steering pick a path, and what if the player does not steer?

A) Discrete lanes, one per path. Each left or right input moves one lane. The lane the kart is in when it crosses the decision line is the chosen path. The kart keeps its lane between forks, so not steering is also a choice
B) Free analog steering; the chosen path is wherever the kart is at the split
C) As A, but if the player never steers during the window the fork counts as "no answer" (wrong)
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). One input equals one lane, which is predictable on keyboard and joystick and testable as pure logic. There is no special "no answer" state. C punishes slower motor skills; B makes the choice ambiguous near lane edges.

---

## B. Learning content

## Question 10
What math is asked at each difficulty (ages 8 to 16)?

A) Easy (about 8-9): addition and subtraction within 20, no negatives. Medium (about 9-11): times tables 2 to 10, exact division, addition and subtraction within 100. Hard (about 11-13): two-step expressions with order of operations (3 + 4 x 2), fraction of a quantity (3/4 of 20), percentages of round numbers (10, 25, 50%), squares up to 12. Super Hard (about 13-16): negative numbers in all four operations, adding simple fractions (1/2 + 1/4), percentages (15% of 80), powers and square roots, one-step equations (x + 7 = 15)
B) Reuse Math Challenge's operation sets unchanged (`apps/web/src/utils/mathUtils.ts`)
C) One mixed pool for all difficulties
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): "varies by level", accepting the per-difficulty recommendation. Answer forms are whole numbers or simple fractions written `a/b`, at most 4 characters, and never decimals (es and pt write decimals with a comma, which would need locale-aware signs). Analyst note (iteration 2, owner choice unchanged): the exact forms are integers from -999 to 999 with no leading zero and no "-0", and fractions of one- or two-digit parts, the correct one in lowest terms (FR-MK-14). Super Hard powers are therefore kept at or below 999 (no 2^10 = 1024).

## Question 11
How are the wrong answers on the other signs (distractors) chosen?

A) From common mistakes: off by 1 or 2, off by 10 (place value), the neighbouring times-table product, the wrong operation (a + b for a x b), swapped digits (42 for 24), a sign error (Super Hard), adding tops and bottoms of fractions (1/2 + 1/4 = 2/6). All signs distinct, never equal to the correct answer, in range for the level (no negatives below Super Hard), at most 4 characters. The correct sign's position is uniformly random per fork, with at most 3 forks in a row in the same position
B) Random numbers near the correct answer
C) Random numbers in the level's range
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): accepted as part of the content recommendation. Mistake-based distractors make the fork a real math decision instead of "pick the odd number out"; the position rule stops "always go left" from paying off. Analyst note (iteration 2, owner choice unchanged): "distinct" means distinct in value, so `2/4` and `1/2` count as the same sign and never appear together; the swapped-digits rule skips results with a leading zero (FR-MK-15).

---

## C. Controls and accessibility

## Question 12
What are the controls?

A) Keyboard: Left/Right arrows and A/D move one lane; the kart accelerates by itself (no throttle); P or Escape pauses. Touch: a horizontal virtual joystick at the bottom centre, usable with one thumb; pushing past a threshold moves one lane and holding repeats after a short delay; a large pause button at the top
B) Touch: two large left and right buttons in the bottom corners (two thumbs)
C) Touch: swipe anywhere
D) Touch: tilt the phone
E) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): "ok" (accepts the recommendation). A matches the owner's "sort of joystick on the bottom" and works one-handed with either thumb. Auto-acceleration leaves one decision per fork, the math.

## Question 13
Is gamepad input supported in v1?

A) No; deferred to the backlog
B) Yes, D-pad and left stick through the browser Gamepad API
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): accepted with the controls recommendation. The brief marks gamepad optional; deferring it removes a device from the test matrix. Lane logic takes abstract "left/right" actions, so adding a gamepad later is an input mapping only.

## Question 14
Which accessibility features are in v1?

A) Reduced motion (no shake, spin, flashing or speed lines; static celebration), colour-independent feedback (icon plus text plus sound), large question text and signs, pause at any time (button, key, and automatically when the tab or app goes to the background), a sound toggle that honours the stored preference, full keyboard play, setup and results screens usable with a screen reader. Known gap: the race itself cannot be played with a screen reader; on web the current question is mirrored to a live region
B) A minus the live region
C) A plus an "extra reading time" option
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): accepted with the controls recommendation. C is a good follow-up but adds a setting and a second timing table for the server to check.

## Question 15
Are there other karts on the track?

A) No; the player races the clock and their own best score
B) Cosmetic computer-driven karts that do not affect the score
C) Real opponents (multiplayer)
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Found during analysis: "Mario-Kart style" can imply rivals. B costs art, frame time on phones and fork logic for each rival; C needs real-time infrastructure. A keeps v1 on the core loop; B is the first backlog candidate once the performance gate passes.

---

## D. Scoring and fairness

## Question 16
The browser (or WebView) runs the race. What does the server verify?

A) Nothing new: the client reports `correctAnswers`, `totalQuestions` and `completionTime`, like Math Challenge
B) The server builds the race at `startGame` (seeded generator in `packages/shared`, rules frozen per protocol version), stores the answer key on the game record and returns the questions. At `completeGame` the client sends only the lane chosen at each fork and the time it crossed each decision line. The server counts correct answers from its own key, rejects times faster than the kart can drive for those answers (expected times from the shared kinematics, minus a tolerance) and computes the score from the correct count
C) The server holds the answers secret and the game asks the server for a verdict at every fork
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Recommended (pending owner approval). Revised in iteration 2: the timing check now compares each time with what the kart needs for the given right and wrong answers (the kart has no throttle, so honest times follow from the answers), instead of a top-speed floor no honest race reaches. It follows the Circuit Builder pattern (server decides, client cannot send a score), without a network call mid-race. Stated limit: the game needs each fork's correct answer locally to show instant feedback, so a script could always pick right; because the score uses only the correct count (Q17), such a script equals a perfect human race and never exceeds one. The server still stops invented answers, answers to questions it never issued, impossible speed, and replays. C adds a round trip at every fork, which breaks on a weak phone connection mid-race.

## Question 17
How is the score computed?

A) A dedicated Math Rally breakdown in `services/game/src/services/score-calculator.service.ts` (as `calculateCircuitBuilderBreakdown` is), returning the existing `ScoreBreakdown` shape: base x difficulty multiplier (1.0, 1.5, 2.0, 2.5) x an accuracy factor (0.5 + accuracy), with no time term (`speedBonus` always 1.0). An all-correct race scores exactly 3000, 4500, 6000 and 8000 for difficulty 1 to 4, the same ceilings a perfect fast free game reaches on the generic formula. Existing caps apply (6000 for a free game at difficulty 1 to 3, 8000 at difficulty 4 or for a paid game)
B) As A, plus a modest time term computed from the server's own expected finish time for the given answers (never from client time)
C) As A, plus a modest time term from the client-reported race time
D) Reuse the generic `calculateScoreBreakdown` with server-verified counts
E) A fixed number of points per correct answer, no multipliers
F) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Revised in iteration 2 after the design review: the kart has no throttle, so race time follows from the answers and a time term rewards nothing the player controls. Accuracy is the only factor, as the owner asked (wrong answers lower the score). B only repeats accuracy in a more complex form. C lets a script that reports the fastest accepted times beat a perfect human by up to the time term's range, and costs players on slow phones points for a hardware reason. D's speed factor goes up to 2.0 on a 600 s window and uses client time. E breaks comparability with other games on the leaderboard and Quest Map thresholds. Consequences of A: only N + 1 scores exist per difficulty, perfect races tie at the ceiling (the leaderboard ranks by score only), and the result screen shows a speed bonus of x1.0; see Q40 for the leaderboard's pattern checks.

## Question 18
How does Math Rally join the leaderboard?

A) A new `GameType` `MATH_RALLY` with its own validation entry whose bounds mirror what the Game Service can emit (time from the fastest race the Game Service accepts to 3600 s, score 0 to 8000)
B) A new `GameType` that reuses the Math Challenge window (10 to 600 s, score up to 10000)
C) No leaderboard
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Same reasoning as Circuit Builder U7a: a window that does not match the Game Service silently drops legitimate events (`services/leaderboard/src/services/scoring.service.ts`).

---

## E. Tier and name

## Question 19
Is Math Rally free or paid at launch?

A) Free for every signed-in user (difficulty 4 stays paid by the existing cross-game rule)
B) Paid (any tier)
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25): "Free for now. Maybe free until 12/31."

## Question 20
If Math Rally becomes paid after 2026-12-31, how does the switch happen?

A) Manually: a planned change on or after the date adds `MATH_RALLY` to `PAID_GAME_THEME_IDS` (`packages/shared/src/constants/paid-games.ts`), web `PREMIUM_GAMES` (`apps/web/src/components/hub/GameTile.tsx`) and the mobile copy (`apps/mobile/lib/config/paid_games.dart`), then deploys, following a written checklist
B) Automatically: a date-based gate in code makes the game paid from a fixed instant
C) A flag in DynamoDB (catalog or config row) that `startGame` reads
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner answer (2026-11-25, relayed by the orchestrator): A accepted, a manual, planned change that follows a written checklist. Because of the Q21 answer the checklist also covers the per-difficulty gate: it confirms that the free-difficulty exception for `MATH_RALLY` (Easy only) is present and tested in the shared constant, the web copy and the app copy before `MATH_RALLY` is added to the three paid lists (FR-MK-54, FR-MK-55, FR-MK-56). The gate itself ships in v1, inert while the game is free, so the switch day changes lists only. Why A over B and C (unchanged): the owner said "maybe", so a deliberate decision point fits better than a timer; B needs clock injection and the same date logic in three clients; C adds a database read to every `startGame` and a new admin path. Caveat: the app's presentation changes only with an app release; the server gate does not wait for it.

## Question 21
After a switch to paid, what do FREE users see?

A) The existing paid-game behaviour: paid badge on the web tile, `startGame` refused with the existing upgrade message and link on web, the neutral "unavailable" state in the app (`kPaidGamePresentation`); past scores and leaderboard entries stay
B) Easy stays free as a taster; the other levels become paid
C) The game is hidden from FREE users
D) Other (please describe after [Answer]: tag below)

[Answer]: B - Owner answer (2026-11-25, relayed by the orchestrator): a B-like rule. **Easy (difficulty 1) stays available to FREE users permanently**; Medium, Hard and Super Hard become paid. Consequences recorded in the requirements: (1) a new per-game, per-difficulty gate in `startGame` on the server, which is the only enforcement that counts (no reliance on client checks), FR-MK-55; (2) matching presentation: the web tile opens setup for FREE users and shows the paid badge, the web setup page and the app setup screen show Easy as playable and the other levels locked with the paid badge (upgrade link on web; the app keeps its neutral "not on your plan" state with no purchase UI, `kPaidGamePresentation`), FR-MK-56; (3) past scores and leaderboard entries stay. **Interpretation of the owner's note "(3 plays per day)"**: the normal FREE allowance, 3 plays per 24 hours shared across all games and counted by the existing rate limiter (`services/game/src/services/rate-limiter.service.ts`); Easy Math Rally races count against it like any other play. Alternative **not chosen** unless the owner says otherwise: a separate 3-per-day counter just for Math Rally. Original recommendation was A; the owner overrode it.

## Question 22
What is the game called?

A) Benji's Math Rally
B) Benji Math Dash (echoes DashDen)
C) Benji's Number Racer
D) Benji-Kart (the owner's example)
E) Other (please describe after [Answer]: tag below)

[Answer]: E - Owner answer (2026-11-25, relayed by the orchestrator): **"Math Rally"**, with no "Benji" in the title; Benji stays the in-game driver character. Identifiers: display name "Math Rally", theme id and leaderboard game type `MATH_RALLY`, catalog id `math-rally`, routes under `/math-rally/` (web `/math-rally/setup` and `/math-rally/game`, app `/math-rally/setup` and `/math-rally/play`), locale namespace `mathRally`. The files of this inception run keep the `math-kart-` prefix so later workflow steps find them; Construction renames them first. Constraints kept: nothing that imitates "Mario Kart" (no `<Name> Kart` title, no Nintendo marks, characters or trade dress); "kart" stays a generic word for the vehicle. Risk R6 is reduced: "Benji" is now a character name only, not part of the title; "Math Rally" is a descriptive phrase and gets a quick trademark search before launch.

---

## F. Flutter embedding

## Question 23
How does the app's WebView load the bundled game?

A) The built game ships inside the app's Flutter assets and is served to the WebView from an app-internal origin (Android `WebViewAssetLoader`, iOS custom URL scheme handler) through a WebView plugin that supports both (candidate: `flutter_inappwebview`, to confirm in a spike)
B) `file://` URLs from the app bundle
C) A small HTTP server on `localhost` inside the app
D) Load the game from `https://dashden.app`
E) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). B: module scripts and asset requests from `file://` are blocked or need file-access flags that weaken the WebView (SECURITY-09). C opens a local port other apps on the device can read. D is excluded by Option A (needs network, and the app could run a newer or older game than it was tested with). The plugin features named in A are unverified here (no web access in this session).

## Question 24
Who talks to the DashDen API when the game runs in the app?

A) Flutter does: the screen calls `startGame` and `completeGame` through the existing `GameSessionController` and passes only the race data into the WebView. The WebView never receives a token and makes no network requests
B) Flutter hands the Cognito ID token to the WebView and the game calls the GraphQL API itself
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). No token enters page JavaScript, no CORS change is needed (the API allows only dashden.app origins, `infrastructure/lib/stacks/api-stack.ts`), and offline rounds, retry-on-failure and Quest results come from the existing framework. The React page uses the same split, so the game code is identical in both hosts.

## Question 25
How do the game and its host exchange messages?

A) Versioned JSON messages. Game to host: `ready`, `raceFinished` (choices and fork times), `pauseChanged`, `exitRequested`, `error`. Host to game: `init` (race data, difficulty, language, sound and reduced-motion settings), `pause`, `resume`, `setSound`. Each side validates every message (known type, size limit, schema) and checks the protocol version at `ready`
B) Navigation to custom URLs (for example `dashden://result?...`)
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). One small, testable contract for both hosts; validation at the boundary is required by SECURITY-05. B leaks data into URLs and has length limits.

## Question 26
How are orientation, touch, audio and app lifecycle handled in the app?

A) Portrait first on phones (joystick at the bottom, one hand), landscape also laid out. Page zoom, scrolling, text selection, the long-press menu and overscroll are disabled in the WebView. Sound starts only after the first touch and follows the app's sound setting. The race pauses when the app goes to the background and on Android Back (pause menu, then quit)
B) Force landscape during the race
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Matches "joystick on the bottom" and one-handed play, and the app already allows both orientations (`ios/Runner/Info.plist`). How WebView audio reacts to the iOS silent switch is unverified and goes into the mobile spike. Analyst note added in iteration 4 (letter unchanged): Android Back must not depend on the game answering, so if the game has not confirmed the pause 1 s after Back, or Back is pressed again, the app opens its leave confirmation directly; on a game error the app shows a "race stopped" message with a way back (FR-MK-48).

---

## G. Performance

## Question 27
What are the performance and download budgets?

A) 60 fps target on the reference phones (Q28); gate in Q29. Game code chunk (Phaser plus game) at most 450 KB gzip; first-race art and sound at most 1.5 MB; the site's entry chunk grows by at most 2 KB gzip of code (both Math Rally routes lazy; the host strings in the main locale files and the registry entries are excluded and reported separately); the mobile app grows by at most 4 MB
B) Tighter: game code at most 250 KB gzip through a custom Phaser build
C) No budget; measure later
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Keeps dashden.app light for everyone who never opens the game. All numbers are targets, not measurements; Phaser 4's size is unverified, so the slice measures it first and B becomes a fallback if A is missed. Revised in iteration 2: the entry-chunk figure first assumed only a lazy game-route stub, but `apps/web/src/i18n.ts` imports the main locale files into the entry chunk, so the strings cannot count against a code budget.

## Question 28
Which devices decide whether performance is acceptable?

A) The owner's iPhone, one mid-range Android phone about 3 to 4 years old (the owner names the model), and desktop Chrome and Safari
B) Emulators and simulators only
C) A cloud device farm
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Found during analysis: emulators do not reflect real GPU and thermal behaviour, and a device farm adds cost. iOS checks run on the owner's Mac.

## Question 29
What happens if the slice is too slow on the reference Android phone?

A) Gate: inside the WebView, median frame rate at least 50 fps and the slowest 1% of frames at least 30 fps over a full race, steering visible within 100 ms, measured on Android in each platform-view composition mode the WebView plugin offers. If the gate fails after optimisation, stop and present options to the owner (fewer effects, lower resolution, another renderer mode, the other Android composition mode, or the native Flame fallback)
B) Switch to a native Flame port automatically
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Found during analysis: the Flame fallback is the owner's call per the agreed context, so the requirements define a measurable trigger and an escalation, not an automatic switch. Revised in iteration 2: the Android composition mode affects WebView and WebGL frame rate and is a cheap lever, so it is measured before any escalation (U18 in the requirements).

---

## H. Content, safety and scope (found during analysis)

## Question 30
Where do art and sound come from, and what must they avoid?

A) Free CC0 packs (for example Kenney.nl) and simple original art; a credits manifest records source, licence and URL for every file; no Nintendo characters, names, items, sounds, music, track names or trade dress; Benji is an original character; custom art later
B) Commission custom art now
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner context (agreed earlier): "Mario-Kart style" is inspiration only; initial art is CC0 or original. The credits manifest is the analyst's addition so the licence of every file can be checked.

## Question 31
How is Benji shown, and what data does the game handle about players?

A) Benji is a fictional cartoon driver; no photo, likeness, voice, surname, age or location of the real child appears in assets, text or metadata. The game collects no new personal data: per-fork choices are scored and then discarded (only counts and the score are stored), and it shows no ads. The game core and the app bundle make no request outside their own origin (web: dashden.app; app: the app-internal origin) and load no third-party SDK. On web the host page keeps today's site-wide requests (Google Fonts from `apps/web/index.html`; Vercel Analytics and Speed Insights from `apps/web/src/main.tsx`); Math Rally adds none
B) Benji is a stylised avatar drawn from a photo of the child
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). The audience includes children under 13 and Benji is the owner's son's nickname; A keeps the real child out of the product and the game inside today's data footprint. Revised in iteration 2: the earlier wording ("no third-party or remote requests") was untrue for web, where every page already loads Google Fonts and the Vercel scripts; self-hosting the font is a backlog item.

## Question 32
How many track themes ship in v1?

A) One bright countryside track (hills, trees, sky, finish arch), with the fork as the centrepiece
B) Two or three themes, one per difficulty
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Art budget goes into making one scene "cool" on a phone; more themes are content work for later.

## Question 33
Where does game text live?

A) In `apps/web/src/locales/{en,es,pt}.json` under one `mathRally` namespace, the single source for the web host, the game canvas and the app (whose ARB files are generated from these JSON files); the host passes the language to the game
B) A separate strings file inside the game
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval), refined in Application Design: host-page strings live in the `mathRally` namespace of the main locale files (and reach the app through `tools/convert_locales.mjs`); in-race strings live in `apps/web/src/games/math-rally/locales/{en,es,pt}.json`, which only the game code imports. Reason: `apps/web/src/i18n.ts` imports the three main locale files into the entry bundle, so in-race text there would grow every page's download (NFR-MK-3). Each string still has one source, and a Math Rally locale completeness test (pattern of `questLocaleCompleteness.test.ts`) covers both sets.

## Question 34
What happens if `startGame` fails?

A) Each host keeps its current rule: on web, rate limit goes to the rate-limit page, a quest failure to the map (existing `api/game.ts`), anything else back to the hub with a short message; in the app, the existing framework blocks for rate limit, paywall or quest and otherwise starts an unscored offline race with locally generated questions
B) No offline race anywhere; always show an error
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Consistent with every other game in each host. The game bundle already contains the shared generator (needed by the vertical slice), so the offline race costs nothing extra.

## Question 35
Is Math Rally placed on the Quest Map in v1?

A) No node in v1. The game supports the Quest Map launch contract (difficulty in the URL, `questContext` passed to `startGame`, the completion hook) so adding a node later is configuration only, except in World 1, which needs a small change first: the quest config validator rejects any World 1 leg whose theme is in `PAID_GAME_THEME_IDS`, and after a paid switch only Easy stays free (Q21), so a World 1 Easy leg would require the validator to honour the free-difficulty exception (backlog, not v1)
B) Add a World 1 node now
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). The brief says "launchable from Quest Map later". The quest config test rejects paid games in World 1 (`packages/shared/src/quest/config.test.ts`), so a World 1 node would break on the day the game turns paid unless the validator first learns the Easy-only exception (Q21).

## Question 36
What happens when the player quits mid-race?

A) Quit is in the pause menu, with a confirmation. The race is abandoned: no `completeGame`, no score, the game record stays in progress and the play counts against the daily allowance (same as leaving any other game)
B) Quit submits the race as finished with the remaining forks counted wrong
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Same as other games; B would publish low scores the player did not choose to submit.

## Question 37
Should the security extension rules be enforced for this feature?

A) Yes - enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No - skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Owner context (agreed earlier): Security Baseline is enabled for the project (`aidlc-docs/aidlc-state.md`, Extension Configuration) and applies to all new Math Rally code. Pre-existing gaps (for example CSP Report-Only) stay recorded as pre-existing.

## Question 38
In which order is Math Rally built?

A) A vertical slice first: one web race with local questions (road, fork, signs, controls, feedback, HUD), measured on the reference devices in the browser and inside a minimal app WebView, before backend, registry or mobile integration work
B) Backend and registries first, then the game
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). The two biggest unknowns are the forked road's feel and phone performance in a WebView; A tests both before anything is spent on integration, and the gate in Q29 decides whether to continue.

---

## I. Added in iteration 2 (design review)

## Question 39
While the race is paused, is the question still visible?

A) No. An opaque pause screen covers the road and the HUD; the question banner, the signs and the lane labels are hidden, and the web live region is cleared. On resume they come back and the remaining reading window continues
B) Yes. The scene is dimmed and the question stays readable; pause is an intended thinking aid and the reading window is only a guide
C) No, and resuming inside a reading window replaces the question with a spare one the server also issued
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Found in the design review: with B a player can pause at every fork and think without limit, which empties the reading windows (Q8) and makes scores at one difficulty hard to compare. A keeps pause for real interruptions (a sibling, a phone call). Residual limit: a player who memorises the question can still think while paused; A removes the free look but cannot stop that. C closes the gap but needs spare questions in the server key and more game logic, which is out of proportion for scores that carry no money value.

## Question 40
The leaderboard flags an entry when its score appears 3 or more times among the player's earlier entries of the same game (up to 20 read), or when those entries' completion times vary by less than 5% (`services/leaderboard/src/services/anomaly.service.ts`). A Math Rally score depends only on the number of correct answers, and the race time only on which forks were right, so honest regular players will be flagged. What should happen?

A) Accept and document for v1. A flagged entry is stored and ranked like any other today (the `suspicious` flag hides nothing in `leaderboard.service.ts`), and no alarm reads the `AnomalyDetected` metric. A test checks that a flagged Math Rally entry still appears, so a later change that hides flagged entries fails first
B) Skip the two pattern checks for `MATH_RALLY` in the leaderboard service and keep the outlier and velocity checks
C) Add a varying element to the score (for example a time term) so scores differ between races
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Found while revising after the design review. A changes no leaderboard code and has no effect players can see today; its cost is a noisier `AnomalyDetected` metric and warning logs that carry user and game ids only. B is a small change if the owner wants clean metrics, at the price of one more game-specific branch in the leaderboard. C brings back the time term that Q17 removes because it rewards nothing the player controls.
