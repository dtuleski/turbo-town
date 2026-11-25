# Math Rally - Requirements

**Feature**: Math Rally (final name, owner answer to Q22), a kart-racing math game for dashden.app and the DashDen Flutter app. Benji is the in-game driver, not part of the title.
**File names**: the files of this inception run keep the `math-kart-` prefix; the first Construction step renames them to `math-rally-`. Ids keep their `MK` labels (FR-MK, NFR-MK, MK-n, MKP).
**Created**: 2026-11-25
**Depth**: Comprehensive (new rendering engine, a second host platform, a new server-scored game type)
**Source decisions**: `math-kart-requirement-verification-questions.md` (40 questions). Owner answers of 2026-11-25 are binding for Q1, Q2, Q6, Q7, Q10 to Q14 and Q19 to Q22 (Q7 and Q20 to Q22 relayed by the orchestrator later that day); the rest are **Recommended, pending owner approval**. No question is open. Q39 and Q40 were added in iteration 2.
**Revision**: iteration 2, after the design review of 2026-11-25 (`.agents/tasks/math-kart-inception/review.md`). Responses to its findings are in Section 13.
**Reverse engineering basis**: `../reverse-engineering/math-kart-delta-notes.md` (code read at `c6ccf0f`), on top of the stale baseline at `a328c74`.
**Not written here**: design, components, units. Those follow in Application Design and Units Generation.

---

## 1. Intent Analysis

| Dimension | Assessment |
|---|---|
| Request type | New Feature (new game) |
| Clarity | Clear core loop (question at the top, one answer per road branch, steer to the right one). Open items (feel, rules, scoring authority, embedding, budgets) resolved in the question file |
| Scope | Cross-system: web app (new engine, first lazy route), Game Service, Leaderboard service, shared package, DynamoDB seed data, locales, Flutter app (first WebView-hosted game) |
| Complexity | Complex. No precedent in the repository for a game engine, pseudo-3D rendering, lazy loading, or a WebView-hosted game |
| Primary risks | Phone performance of the forked road in a WebView; Phaser 4 facts unverified in this session; IP look-alike risk; registry drift across 15+ places |

### Original request (owner, 2026-11-25, verbatim in `aidlc-docs/audit.md`)
Benji drives a go-kart toward a fork. A math question shows at the top; each path carries an answer; the player steers onto the path with the right answer. It must feel "Mario-Kart style" with a cool scene, and be easy to control on a keyboard or on a phone with a joystick at the bottom.

### Agreed context ("Option A")
Build the game once with Phaser 4 (pattern: the official React plus Vite template, `phaserjs/template-react`) inside `apps/web` as a lazy-loaded route, and run the same game inside the Flutter app in a WebView with its files bundled in the app. A native Flame port is a fallback only. The game uses the existing `startGame`/`completeGame` flow, a server-computed score, the leaderboard, the hub tile and catalog, and must be launchable from Quest Map later. Audience 8 to 16; languages en, es, pt. "Mario-Kart style" is inspiration only.

### Personas (detail in `../user-stories/math-kart-personas.md`)
- **MKP1 Benji, the young racer** (8 to 10, phone in the app, one thumb, Easy and Medium, FREE tier).
- **MKP2 Sofia, the older student** (12 to 16, laptop keyboard and phone, Hard and Super Hard, chases the leaderboard).
- **MKP3 Ana, the parent** (decides whether the child plays and whether to pay; cares about safety and learning).
- **MKP4 The owner-operator** (registers, deploys, switches the tier, checks performance).

---

## 2. Decision Status

| Topic | Decision | Status |
|---|---|---|
| Rendering | Pseudo-3D road behind the kart, Phaser 4 (Q1) | Owner answer; feasibility gated by the slice (Q29) |
| Answer feedback | Red X plus sound and lower score when wrong; positive feedback when right (Q2) | Owner answer |
| Paths per fork | Easy 2, Medium 3, Hard 4 (Q6) | Owner answer |
| Super Hard | 4 paths, 5 s window, Super Hard content; paid-only by the existing rule (Q7) | Owner answer |
| Math content and distractors | Per-level table and mistake-based distractors (Q10, Q11) | Owner answer |
| Controls and accessibility | Lane steering, auto-accelerate, bottom joystick, pause, reduced motion; no gamepad in v1 (Q12 to Q14) | Owner answer |
| Tier at launch | Free (Q19) | Owner answer |
| Paid switch | Manual planned change with a written checklist that includes the per-difficulty gate (Q20) | Owner answer |
| FREE users after the switch | Easy (difficulty 1) stays free permanently; Medium, Hard and Super Hard become paid; server-side per-difficulty gate; plays count against the normal shared FREE allowance of 3 per 24 h (Q21) | Owner answer; allowance reading is the analyst's interpretation of "(3 plays per day)" |
| Name | "Math Rally"; ids `MATH_RALLY`, `math-rally`, `/math-rally/...`, namespace `mathRally` (Q22) | Owner answer |
| Art sources and IP limits; Security Baseline | CC0 or original art; baseline enforced (Q30, Q37) | Owner context (agreed earlier) |
| Scoring (revised in iteration 2) | Score from the server's count of correct answers only; client time checked for plausibility, never scored (Q16, Q17) | Recommended, pending approval |
| Pause (added in iteration 2) | The pause screen hides the question and the signs (Q39) | Recommended, pending approval |
| Leaderboard pattern flags (added in iteration 2) | Accept and document; no leaderboard anomaly change (Q40) | Recommended, pending approval |
| Everything else | Q3 to Q5, Q8, Q9, Q15, Q18, Q23 to Q29, Q31 to Q36, Q38 | Recommended, pending approval |

---

## 3. Scope

**In v1**
- One race mode, one track theme (Q32), four difficulties, solo against the clock (Q15).
- Web: setup page and a lazy-loaded game route on dashden.app; result through the existing result modal.
- App: native setup and result screens, race in a WebView running the bundled build of the same game.
- Server-built races and server re-scoring (Q16), dedicated score breakdown (Q17), leaderboard participation (Q18).
- Registration in every hub, leaderboard, display and review registry, with a consistency test and seed and verify scripts.
- Quest Map launch readiness without a node (Q35).
- The per-difficulty free gate on the server and the matching partly-free presentation on web and in the app, inert while the game is free (FR-MK-55, FR-MK-56, Q21).
- en, es, pt; accessibility set from Q14.

**Out of v1**
- Native Flame port (fallback only, by owner decision after the gate, Q29).
- Other karts on track, multiplayer, items and power-ups (Q4, Q15).
- Gamepad (Q13), extra reading-time option (Q14 C), more track themes (Q32), kart customisation, unlockables.
- A Quest Map node (Q35); executing the paid switch (its checklist and the per-difficulty gate ship in v1, the switch itself is a later owner decision, Q20).
- A separate daily play counter for Math Rally (Q21: the normal shared FREE allowance applies).
- Ads or any monetisation inside the game.
- Decimal answers (Q10).
- Playing the race with a screen reader (documented gap, NFR-MK-7).
- Custom commissioned art (later; v1 uses CC0 and original art, Q30).
- Daily email listing (same exclusion as Circuit Builder, delta notes Section 2).
- Remediation of pre-existing security debt, including enforcing the CSP (recorded in `aidlc-state.md`).
- Device, browser and viewport automated test tooling (does not exist; manual checks are specified instead).
- Self-hosting the site's Poppins font (backlog; it would remove the Google Fonts request every dashden.app page makes today, NFR-MK-19).
- A leaderboard tie-break for equal scores, and any change to the leaderboard's anomaly checks (Q40, R17).

---

## 4. Functional Requirements and Acceptance Criteria

Acceptance criteria are numbered `AC-<FR>.<n>`. The tag after each criterion says how it is verified: **[U]** unit or property test, **[I]** backend or integration test, **[M]** manual check with written steps in Construction.

### 4.0 Race parameters (frozen per protocol version)

All values live in one shared constants module in `packages/shared` so the game and the server read the same numbers. Super Hard values are the owner's answer to Q7.

**Protocol versions.** The paths, forks and reading windows in this table, the track constants (distances and speeds), the question kinds and their operand rules (the generator), and the shapes of the race payload and the submission together form Math Rally protocol version 1. They may be tuned freely until launch. After launch they are frozen: any change ships as protocol version N+1, and the Game Service keeps building and checking races for every version that a supported web or app build still sends (FR-MK-26, NFR-MK-23). Each game record stores the version its race was built with, and completion is checked with that version's constants. The score row and the two tier rows are not part of the protocol: scores are computed only on the server, and tier rules follow FR-MK-53 to FR-MK-56.

| Parameter | Difficulty 1 Easy | 2 Medium | 3 Hard | 4 Super Hard |
|---|---|---|---|---|
| Paths per fork | 2 | 3 | 4 | 4 |
| Forks per race | 10 | 12 | 15 | 15 |
| Minimum reading window at top speed | 8 s | 7 s | 6 s | 5 s |
| Score of an all-correct race (exact, FR-MK-32) | 3000 | 4500 | 6000 | 8000 |
| Who can play at launch (game free) | Everyone | Everyone | Everyone | Paid tiers only (existing rule) |
| Who can play after a paid switch (Q21) | Everyone | Paid tiers only | Paid tiers only | Paid tiers only |

### 4.1 Scene and race

**FR-MK-1 Pseudo-3D scene.** The race is drawn as a road seen from behind and above the kart: road segments projected toward a horizon, roadside objects drawn as sprites that grow as they approach, and a layered sky and hills background. One bright countryside theme (Q32). Background music is optional in v1 and ships only if it fits the asset budget (NFR-MK-3); it follows the same sound toggle as the effects.
- AC-1.1 At 320 x 568 and 1280 x 720 the road narrows toward a horizon, the kart sits at the bottom centre, and roadside objects scale up as they approach. [M]
- AC-1.2 The scene uses only assets listed in the credits manifest (NFR-MK-20). [U: manifest check]

**FR-MK-2 Benji and his kart.** The player's kart is driven by Benji, an original cartoon character, seen from behind. The kart leans when changing lanes and shows a flame or dust effect during a boost.
- AC-2.1 No Nintendo character, kart, item or logo appears (NFR-MK-20). [M]

**FR-MK-3 Countdown and auto-acceleration.** After the race data arrives the race starts with a 3-2-1-Go countdown. The kart then accelerates to cruise speed by itself; there is no throttle or brake input (Q12).
- AC-3.1 No steering input is accepted during the countdown; after "Go" the kart reaches cruise speed without input. [M]

**FR-MK-4 Fixed race length.** A race consists of exactly N forks (Section 4.0), then a finish line (Q5).
- AC-4.1 Every race records exactly N decisions, whatever the answers. [U]
- AC-4.2 The HUD shows fork progress as "k / N". [M]

**FR-MK-5 Race clock.** The game measures race time from "Go" to the finish line, excluding paused time, and the time each decision line is crossed. These times are shown to the player and checked by the server for plausibility (FR-MK-30); they do not change the score (FR-MK-32).
- AC-5.1 Pausing for 60 s adds 0 s to the reported race time (within 0.1 s). [U: clock logic with an injected time source]

### 4.2 Questions and forks

**FR-MK-6 Question banner.** Each question appears in a banner at the top of the screen as soon as the previous fork's branches rejoin the road, and stays until the kart crosses that fork's decision line.
- AC-6.1 Exactly one question is visible at a time; the banner never covers the signs. [M]

**FR-MK-7 Forks and signs.** Each fork splits the road into as many branches as the difficulty's path count. Each branch has a sign with one answer; exactly one answer is correct.
- AC-7.1 Fork k shows the options of question k in the order the server sent them; exactly one equals the correct answer. [U]

**FR-MK-8 Reading window.** The time from the question appearing to the decision line is at least the minimum reading window (Section 4.0), even if the kart drives at its maximum (boosted) speed the whole way (Q8). Only running, unpaused time counts; while the race is paused the question is hidden (FR-MK-22, Q39).
- AC-8.1 For every difficulty, the shared track constants satisfy: distance from question start to decision line divided by maximum speed is at least the window. [U]

**FR-MK-9 Lane steering and selection.** Before each fork the road has one lane per branch. Each left or right action moves the kart one lane; actions beyond the outer lanes do nothing. The lane occupied when the kart crosses the decision line is the chosen branch. The kart keeps its lane between forks (Q9).
- AC-9.1 Lane logic returns the occupied lane index at the decision line as the choice; a left action in lane 0 leaves it in lane 0. [U]
- AC-9.2 When the next fork has a different lane count, the kart is placed in the nearest valid lane before the question appears. [U]

**FR-MK-10 Right-answer feedback.** On the correct branch the game shows a green check icon, plays a chime (if sound is on), adds one coin to the HUD counter and gives a boost of about 1 s (Q2, Q4).
- AC-10.1 The coin counter always equals the number of correct answers so far. [U]

**FR-MK-11 Wrong-answer feedback.** On a wrong branch the game shows a red X icon, plays an error sound (if sound is on), shows the correct answer for at least 1.5 s (for example "7 x 8 = 56"), and the kart rides a bumpy branch at about 60% speed for about 1.5 s. No spin-out, no lives; the race continues (Q2, Q3).
- AC-11.1 After a wrong pick the correct answer is on screen for at least 1.5 s. [M]
- AC-11.2 Feedback is distinguishable without colour (icon shape plus text). [M]

**FR-MK-12 Rejoin.** After each fork the branches merge back into one road before the next question appears.
- AC-12.1 In the shared track layout, every merge point lies before the next question's start point. [U]

### 4.3 Math content

**FR-MK-13 Content per difficulty.** Questions follow the owner-approved table (Q10):

| Difficulty | Content |
|---|---|
| 1 Easy | Addition and subtraction within 20; no negative results |
| 2 Medium | Times tables 2 to 10; exact division; addition and subtraction within 100 |
| 3 Hard | Two-step expressions with order of operations; fraction of a quantity; percentages of round numbers (10, 25, 50%); squares up to 12 |
| 4 Super Hard | Negative numbers in all four operations; adding simple fractions; percentages; powers and square roots (results at most 999, FR-MK-14); one-step equations |

- AC-13.1 For 1000 generated races per difficulty, every question is of a kind listed for that difficulty and every correct answer is in range (for example no negative answer below difficulty 4). [U, property]

**FR-MK-14 Answer format.** Every option (correct or not) is a canonical string of at most 4 characters and never a decimal. Two forms exist:
- an integer from -999 to 999 matching `^-?(0|[1-9][0-9]{0,2})$`, never "-0" and never with a leading zero;
- a fraction matching `^-?[1-9][0-9]?/[1-9][0-9]?$` (for example `3/4`, `-1/2`, `10/3`).

The correct option is written in lowest terms, and a correct answer whose value is a whole number is written as an integer (never `4/2`). Questions whose answer does not fit these forms are not generated (for example Super Hard powers stay at or below 999).
- AC-14.1 For 1000 generated races per difficulty, every option matches one of the two forms and has at most 4 characters, every correct fraction is in lowest terms, and every whole-number answer is written as an integer. [U, property]

**FR-MK-15 Distractors.** Wrong options come from common mistakes (Q11): off by 1 or 2, off by 10, neighbouring times-table product, wrong operation, swapped digits, sign error (difficulty 4), adding numerators and denominators. Options are compared by exact value, not by text: each option is read as a reduced fraction, the options of one fork differ pairwise in value, and exactly one is value-equal to the correct answer. A distractor may be written in non-lowest terms (the "1/2 + 1/4 = 2/6" mistake) only when its value differs from the answer and from every other option. The swapped-digits rule skips any result with a leading zero (50 never becomes "05").
- AC-15.1 For every generated fork, at least one distractor comes from a mistake rule when a rule applies to the question kind. [U, property]
- AC-15.2 For 1000 seeds per difficulty, the number of distinct values among each fork's options equals the path count, and exactly one value equals the correct answer (a fork showing `2/4` beside a correct `1/2` fails). [U, property]

**FR-MK-16 Position balance.** The correct option's position is uniformly random per fork, with no more than 3 forks in a row in the same position.
- AC-16.1 Over 10 000 generated forks per path count, each position's share is within 2 percentage points of 1/paths, and no run exceeds 3. [U, property]

**FR-MK-17 No repeats.** A race never asks the same question twice.
- AC-17.1 Within any generated race, no two prompts are identical. [U, property]

**FR-MK-18 Seeded generator.** Question generation is a pure, deterministic function of (seed, difficulty, protocol version) in `packages/shared`, with no clock, network or `Math.random`. A protocol version fixes the generator's kinds and operand rules (Section 4.0).
- AC-18.1 The same inputs produce an identical race; different seeds produce different races in at least 99% of 1000 trials. [U]

**FR-MK-19 Language-neutral prompts.** A question is data (a kind plus operands), not text. The game renders it with a localised template (for example "3/4 of 20", "3/4 de 20"); operator symbols are the same in all languages.
- AC-19.1 Every prompt kind has a template in en, es and pt (locale completeness test). [U]

### 4.4 Controls

**FR-MK-20 Keyboard.** Left arrow or A moves one lane left; Right arrow or D moves one lane right; P or Escape pauses and resumes; Enter or Space activates the focused menu button. During the race the arrow keys do not scroll the page.
- AC-20.1 Each mapped key produces exactly one lane action per press. [U: input mapping]
- AC-20.2 With the race running, pressing arrow keys does not scroll the page. [M]

**FR-MK-21 Touch joystick.** A horizontal virtual joystick sits at the bottom centre, sized for one thumb. Moving the knob past a threshold sends one lane action; holding past it repeats after a short delay; releasing re-centres. A pause button sits in the top area, away from the joystick. **Visibility:** the joystick is shown from the first frame of the race when the device reports touch (`matchMedia('(any-pointer: coarse)')` matches or `navigator.maxTouchPoints > 0`), and always in the app build, where the host says so at start-up because the Start tap happens on the native screen. On other devices it is hidden until the first touch pointer event on the page, then stays for the session. Keyboard steering works in every case.
- AC-21.1 Joystick logic emits one action per threshold crossing and repeats at a fixed interval while held. [U]
- AC-21.2 On a 320 px wide phone the joystick and pause button are at least 44 x 44 px and usable with one thumb in portrait. [M]
- AC-21.3 Touching the game area does not scroll, zoom or select text. [M]
- AC-21.4 On a touch phone in landscape, and in the app after Start on the native setup screen, the joystick is visible at the countdown without any earlier touch on the game. [M]

**FR-MK-22 Pause.** Pause is available at any time via the button or key, and starts automatically when the browser tab is hidden or the app goes to the background. While paused the race and its clock stop. The pause screen is opaque over the road and the HUD: the question banner, the signs and the lane labels are hidden, and the web live region (NFR-MK-7) is cleared. On resume they reappear and the remaining reading window continues from where it stopped (Q39). The pause menu offers Resume, Sound on/off and Quit (with confirmation). **Stated limit:** a player who memorises a question can still think about it while paused; hiding the question removes the free look the reading window depends on, which is enough for a game whose scores carry no money value.
- AC-22.1 Hiding the tab or backgrounding the app pauses the race. [M]
- AC-22.2 Quit abandons the race: no `completeGame` call, no score; the play stays consumed (Q36). [M]
- AC-22.3 While paused, the question and the options are not visible on screen and are not in the live region; after resume they are shown again. [M]

### 4.5 HUD, finish and results

**FR-MK-23 HUD.** The HUD shows the question banner, fork progress, coin count and race time, plus the pause button.
- AC-23.1 HUD text uses the player's language and meets NFR-MK-6. [M]

**FR-MK-24 Finish.** Crossing the finish line plays a short celebration (static with reduced motion), then the host shows the result: the server score breakdown, correct answers out of N, and race time. Web reuses `components/game/ScoreBreakdownModal.tsx`; the app reuses `lib/game/framework/game_result_screen.dart`.
- AC-24.1 The score shown is the one returned by `completeGame`; the client never shows a locally computed score as final. [M]

### 4.6 Session, scoring and fairness (Game Service)

**FR-MK-25 Start only when ready.** The host calls `startGame` only after the game engine and first-race assets have loaded and the game has reported `ready`, so a device that cannot run the game never consumes a daily play.
- AC-25.1 With asset loading forced to fail, no `startGame` request is sent. [M]
- AC-25.2 If `ready` has not arrived 20 s after the host starts loading the game, the host shows its generic load-failure message (FR-MK-44) and sends no `startGame`. [M]

**FR-MK-26 Server-built race.** For `themeId` `MATH_RALLY`, the `startGame` input carries `mathRallyProtocol`, the protocol version the game reported in `ready` (FR-MK-49). The Game Service checks it against the versions it supports before the rate limiter runs. A missing or unsupported value is refused with one generic message ("Please update the app to play.") and uses no play. Otherwise the service draws a seed from a cryptographic random source, builds the race with that version's generator and parameters (FR-MK-18, Section 4.0), stores the seed, protocol version, path count and answer key on the game record, and returns the race payload (Section 6). Other games' `startGame` requests and responses do not change.
- AC-26.1 The response holds N questions with the path count's number of options each; the stored key has N entries in range. [I]
- AC-26.2 A `startGame` response for any other theme has exactly the fields it has today. [I]
- AC-26.3 `startGame` for `MATH_RALLY` with a missing or unsupported `mathRallyProtocol` is refused with the generic update message before the rate limiter runs: no game record is written and no usage is counted. [I]

**FR-MK-27 Client sends choices, never a score.** `completeGame` for a Math Rally game reads only `gameId`, `completionTime`, `attempts` and a `mathRallySubmission` holding the chosen option per fork and the time each decision line was crossed. Client values for `correctAnswers`, `totalQuestions`, `score` or accuracy are ignored for this game.
- AC-27.1 A submission that adds `correctAnswers: 15` to a race with 3 correct choices scores as 3 correct. [I]

**FR-MK-28 Bounded validation.** The submission is validated against a strict schema before use (SECURITY-05): exactly N choices, each an integer from 0 to paths - 1; exactly N fork times, integers in milliseconds, strictly increasing, the last not after `completionTime`; `completionTime` within 1 to 3600 s; unknown keys rejected.
- AC-28.1 Each of these cases is rejected: N - 1 choices, a choice of 4 at 3 paths, a string choice, equal consecutive fork times, an extra key. [I]

**FR-MK-29 Re-scoring.** The server counts correct answers by comparing the choices with the stored key; that count is the only accuracy input.
- AC-29.1 Choices matching the key on 7 of 10 forks give accuracy 0.7 in the breakdown. [I]

**FR-MK-30 Timing plausibility.** The server rejects a race faster than the kart can drive it. The kart has no throttle (FR-MK-3), so its honest times are fixed by the track and by which forks were answered right (boost) or wrong (slowdown). A pure shared function computes the expected time of every fork and of the finish from (protocol version, difficulty, right or wrong per fork), running the same kinematics as the game from "Go" with no pauses. A fork time or race time more than a fixed tolerance below its expected value is rejected. The tolerance is set from a property test of the game's frame-by-frame motion so that honest play never falls below it. Slower times are accepted up to 3600 s (low frame rates make races slower, never faster).
- AC-30.1 A fork time 1 ms below (expected minus tolerance) is rejected, and a fork time exactly at (expected minus tolerance) is accepted; the same holds for the race time. [I]
- AC-30.2 For random right/wrong sequences and random frame times from 1 to 50 ms, the game's frame-by-frame race never produces a fork time or race time below (expected minus tolerance). [U, property]

**FR-MK-31 Rejection behaviour.** Any validation, key or timing failure returns one generic message, writes nothing, publishes no event, leaves the game `IN_PROGRESS`, logs a warning with the stage name only, and emits a rejection metric (Circuit Builder precedent).
- AC-31.1 After a rejected submission the game record is unchanged and a corrected submission for the same game can still complete it. [I]

**FR-MK-32 Score breakdown.** A dedicated Math Rally breakdown returns the existing `ScoreBreakdown` shape: base x difficulty multiplier (1.0, 1.5, 2.0, 2.5) x accuracy factor (0.5 + accuracy) (Q17). The client-reported time does not enter the score. Race time already follows from the answers (FR-MK-30), so a time term would only repeat accuracy, and the client could still shave its reported time down to the tolerance. `speedBonus` is always 1.0 so the shape stays the same, and `completionTime` is still returned for display. The base values are chosen so an all-correct race scores exactly the Section 4.0 figure (Application Design fixes them).
- AC-32.1 One more correct answer always raises the score. [U]
- AC-32.2 Two submissions with the same choices and different valid times get the same score. [U]
- AC-32.3 A race with 0 correct answers scores one third of an all-correct race at the same difficulty (0.5 / 1.5). [U]
- AC-32.4 An all-correct race scores exactly 3000, 4500, 6000 and 8000 at difficulty 1, 2, 3 and 4. [U]
- AC-32.5 The final score never exceeds 6000 at difficulty 1 to 3 while the game is free, nor 8000 otherwise; the cap is chosen from `PAID_GAME_THEME_IDS` membership, so the paid switch needs no score code change. [U]

**FR-MK-33 Same side effects as other games.** A completed Math Rally game updates the game record, tracks achievements (non-blocking), publishes metrics, publishes a GameCompleted event with `gameType` `MATH_RALLY` and server-derived `correctAnswers` and `totalQuestions`, invalidates the statistics cache, and runs the Quest Map hook (`finalizeQuest`).
- AC-33.1 A completed game produces exactly one event whose accuracy equals the server's count divided by N. [I]
- AC-33.2 A game started with a valid `questContext` returns a `quest` result on completion. Test seam: no v1 quest node uses `MATH_RALLY`, so the real configuration rejects any Math Rally context with `LEG_MISMATCH` (`services/game/src/services/quest.service.ts`); the test passes a stub `QuestService` to `GameService` through its existing optional `questService` constructor parameter, and the stub accepts one `MATH_RALLY` leg in `validateStart` and returns a quest result from `applyCompletion`. [I]

**FR-MK-34 Existing gates unchanged.** One race is one play against the daily allowance; FREE users are refused at difficulty 4; a replayed `completeGame` for a completed game is refused (existing status check). The only change to the start gates is the additive per-difficulty exception of FR-MK-55, which affects no game other than those listed in it.
- AC-34.1 Existing Game Service tests pass unchanged. [I]

### 4.7 Registration and reporting

**FR-MK-35 Identifiers.** Theme id `MATH_RALLY`; catalog id `math-rally`; web routes `/math-rally/setup` and `/math-rally/game`; app routes `/math-rally/setup` and `/math-rally/play` (registry convention); hub category `Science & Math`; catalog `ageRange` `8-16`; display name "Math Rally"; locale namespace `mathRally` plus `games.math-rally.*` (Q22, owner answer).
- AC-35.1 The consistency test (FR-MK-37) asserts each form. [U]

**FR-MK-36 Registries.** Every registry in `math-kart-delta-notes.md` Section 2 holds Math Rally, plus the app's `kGameRegistry` and `kGameTypeMeta` (`apps/mobile/lib/stats/game_meta.dart`). Not added: `PREMIUM_GAMES` and the paid lists while free; `daily-email.ts`. Added at launch although inert while the game is free: the Easy-only exception for `MATH_RALLY` in the shared, web and app free-difficulty lists (FR-MK-55, FR-MK-56).
- AC-36.1 The hub shows the tile on web and in the app under "Science & Math", and the leaderboard filter, History, Achievements, Statistics, Recent Improvements and Admin views name the game. [M]

**FR-MK-37 Consistency test.** A test in the style of `apps/web/src/__tests__/circuitBuilderRegistry.test.ts` fails when any web or backend registry lacks Math Rally, including a mutation suite. It also fails when `MATH_RALLY` is in `PAID_GAME_THEME_IDS` but missing from web `PREMIUM_GAMES` or the app's paid copy, or the reverse, and when the free-difficulty exception (FR-MK-55) differs between the shared constant, the web copy and the app copy.
- AC-37.1 Removing any single registry entry makes the test fail and name that registry. [U]

**FR-MK-38 Leaderboard.** `services/leaderboard` gains `GameType.MATH_RALLY` with a dedicated validation entry whose bounds mirror what the Game Service can emit (Q18). The leaderboard's existing pattern checks (`services/leaderboard/src/services/anomaly.service.ts`: the new score appearing 3 or more times among the player's earlier entries of the same game, up to 20 read, or those entries' completion times varying by less than 5%) will often flag honest Math Rally races, because the score depends only on the number of correct answers and the time only on which forks were right. A flagged entry is stored and ranked like any other today (the `suspicious` flag hides nothing in `leaderboard.service.ts`), and no alarm reads the `AnomalyDetected` metric. v1 accepts this and changes no anomaly code (Q40).
- AC-38.1 The fastest race the Game Service accepts at difficulty 4 (all correct, at the timing floor of FR-MK-30) and a 3600 s race both pass leaderboard validation. [U]
- AC-38.2 A Math Rally entry flagged by the pattern check is still returned by the leaderboard query, so a later change that hides flagged entries fails this test first. [U]

**FR-MK-39 Seed and verify scripts.** `scripts/seed-math-rally.sh` and `scripts/verify-math-rally-seed.sh` follow the Circuit Builder scripts: DEV default, exact `--prod` flag with profile `dashden-new`, typed confirmation, idempotent writes of one theme row and one catalog row, read-only verify with distinct exit codes, and the production order warning (Leaderboard, Game Service, web and app live, seed last).
- AC-39.1 An unknown argument exits 2; `--prod` without the typed confirmation writes nothing. [M: dry run with the AWS CLI absent or stubbed]

### 4.8 Web host

**FR-MK-40 Setup page.** `/math-rally/setup` offers the four difficulties (for FREE users, Super Hard is shown locked with the existing upgrade path at launch; after a paid switch Medium and Hard are locked too, FR-MK-56), a "How to play" panel showing keyboard and joystick controls, and Start, which opens the game route. The game route `/math-rally/game?difficulty=easy|medium|hard|superhard` starts without the setup page; a future Quest Map launch row points to this route (Quest Map launches use `easy`, `medium` or `hard` only, delta notes Section 5).
- AC-40.1 A FREE user sees Super Hard locked and cannot start it. [M]

**FR-MK-41 Lazy routes.** Both Math Rally routes (setup and game) are loaded with `React.lazy`; Phaser and all game code live only in the game route's chunk and its assets.
- AC-41.1 In a production build, the entry chunk contains no Phaser module (bundle report). [M: build report]
- AC-41.2 Opening the hub and every non-Math-Rally page requests no Math Rally chunk or asset. [M: network panel]

**FR-MK-42 Game core independent of hosts.** The game core (scenes, renderer, input, rules) has no React, Flutter or network dependency. It talks to its host only through the message contract in FR-MK-49, so the same build runs in the React page and in the app.
- AC-42.1 The game core's import graph contains no `react`, no `@apollo/client` and no `fetch` or XHR call outside asset loading. [U: import check]

**FR-MK-43 React host.** The page creates exactly one game instance, also under `React.StrictMode` double mounting, destroys it on unmount, and does the API calls through `apps/web/src/api/game.ts` (so the Quest Map `quest` parameter keeps working).
- AC-43.1 Mounting, unmounting and remounting the page in development leaves one live game instance and no running audio. [M]

**FR-MK-44 Engine failure.** If the engine cannot start (for example no WebGL) or fails mid-race (context lost, asset error), the host shows a short generic message with a way back to the hub; no stack trace or engine detail is shown.
- AC-44.1 With WebGL disabled in the browser, the page shows the message and no `startGame` is sent. [M]

### 4.9 App host (Flutter WebView)

**FR-MK-45 App screens.** The app adds a native setup screen (difficulty picker in the existing style), a play screen hosting the WebView, and uses the existing result screen. Math Rally appears in the hub through `kGameRegistry`.
- AC-45.1 The app hub lists Math Rally once the catalog row is active; older app versions do not list it. [M]

**FR-MK-46 Bundled files, app-internal origin.** The game build ships inside the app's assets and is served to the WebView from an app-internal origin (Q23). The page makes no request outside that origin, and every request to it is answered from the bundled files with a response the engine's loader accepts as a success (U19; Application Design fixes how, for example an HTTP 200 response with content type and length). Navigation away from that origin is blocked; pop-ups are blocked.
- AC-46.1 With the device in airplane mode, a race already started loads and plays with no missing assets. [M]
- AC-46.2 An attempt by the page to navigate to an external URL is refused. [M]
- AC-46.3 On iOS and on Android, one image, one atlas JSON file and one audio file load through the engine's loader over the app-internal origin with no load error. [M: mobile spike]

**FR-MK-47 Flutter owns the API.** The play screen calls `startGame` and `completeGame` through the existing `GameSessionController` and `GameApi` (with `mathRallySubmission` added to `completeExtraKeys`), and passes the race payload into the WebView. The WebView never receives a token (Q24).
- AC-47.1 No message sent to the WebView contains a token or the user's email or username. [U: Dart bridge test]

**FR-MK-48 Lifecycle and settings.** The race pauses when the app goes to the background and on Android Back (pause menu, then quit). The game receives the app's sound and reduced-motion settings at `init`. Leaving the screen disposes the WebView.
- AC-48.1 Backgrounding and returning shows the race paused. [M]

**FR-MK-49 Message contract.** Host and game exchange versioned JSON messages (Q25). Game to host: `ready` (with protocol version and build information), `raceFinished` (submission), `pauseChanged`, `exitRequested`, `error` (code only). Host to game: `init` (race payload, difficulty, language, sound, reduced motion, and whether to show the joystick from the start), `pause`, `resume`, `setSound`. Each receiver validates type, size (at most 16 KB per message) and schema, and ignores anything else. Both hosts send `ready.protocolVersion` to `startGame` as `mathRallyProtocol`; the Game Service decides whether it is supported (FR-MK-26). The app also keeps its own list of versions, because the bundle and the Dart code ship together; that local check only catches a broken app build.
- AC-49.1 Dart and TypeScript validators reject an unknown type, an oversize message and a wrong-typed field. [U]
- AC-49.2 When `ready` reports a protocol version the app itself does not list, the app shows a generic "update the app" message and does not call `startGame` (the server check is AC-26.3). [U]

**FR-MK-50 Offline race in the app.** When `startGame` fails for a reason other than rate limit, paywall or quest, the app runs an unscored race with questions from the bundled generator, as its other games do (Q34). Web keeps the rule other web games follow: rate limit goes to the rate-limit page, a quest failure to the map (existing `api/game.ts`), anything else back to the hub with a short message.
- AC-50.1 In airplane mode from the setup screen, the app starts an unscored race and the result screen says it was not saved. [M]

**FR-MK-51 Build linkage.** The app's bundled game is produced from the same source by a documented build command. Its build information records a `sourceHash`: SHA-256 over the contents of the game source, the shared Math Rally module, the game assets, the embed build configuration and the web lockfile, taken in a fixed (sorted) file order. A check command recomputes the hash from the working tree and fails when it differs, so a stale committed bundle is caught before an app release (app releases cannot be rolled back). A commit id is not used, because the bundle is committed after it is built and would always name the parent commit.
- AC-51.1 On the release commit, the `sourceHash` in the bundle's build information equals the hash the check command computes from that commit's source tree. [M: check command]
- AC-51.2 Changing any one input file without rebuilding makes the check fail, and the hash does not depend on the order in which the file system lists files. [U]

### 4.10 Quest Map readiness and tier

**FR-MK-52 Quest Map launch contract.** The web game route accepts the `difficulty` launch kind (`?difficulty=easy|medium|hard&quest=<world>:<node>:<leg>`); the app play screen accepts a `QuestContext`; the completion branch runs the Quest Map hook. No node is added in v1 (Q35).
- AC-52.1 A test game started with a valid `questContext` and completed returns a `quest` result (covered by AC-33.2, with the same stub `QuestService` holding one `MATH_RALLY` leg). [I]

**FR-MK-53 Free at launch.** `MATH_RALLY` is absent from `PAID_GAME_THEME_IDS`, web `PREMIUM_GAMES` and the app's paid copy; difficulty 4 stays paid by the existing rule (Q7, Q19).
- AC-53.1 A FREE user can start difficulty 1 to 3 and is refused at difficulty 4. [I]

**FR-MK-54 Paid switch readiness.** The switch to paid (if the owner decides it, Q20) is a written checklist: (1) confirm the Easy-only exception for `MATH_RALLY` is present in the shared, web and app free-difficulty lists and that the FR-MK-55 and FR-MK-56 tests pass; (2) add `MATH_RALLY` to the three paid lists; (3) deploy the Game Service; (4) deploy web; (5) release the app. FR-MK-37, AC-32.5, FR-MK-55 and FR-MK-56 then hold without other code changes.
- AC-54.1 The checklist exists in the construction docs before launch and names the per-difficulty gate check as its first step. [M]

**FR-MK-55 Per-difficulty free gate (server).** `startGame` lets a FREE user start a paid game at a difficulty listed for that game in a shared free-difficulty exception (`MATH_RALLY`: difficulty 1 only, Q21), and refuses every other difficulty of a paid game with the existing paid-game message. The gate is a pure function in `packages/shared` called by the Game Service; client checks are presentation only. It ships in v1 and changes nothing while `MATH_RALLY` is free. An allowed Easy race counts against the normal FREE allowance (3 plays per 24 hours shared across all games, existing rate limiter); there is no separate Math Rally counter (analyst's interpretation of the owner's "(3 plays per day)").
- AC-55.1 With `MATH_RALLY` in the paid list (test input), a FREE user can start difficulty 1 and is refused at 2, 3 and 4; a paid user can start 1 to 4. [U, I]
- AC-55.2 With the real lists at launch, a FREE user can start 1 to 3 and is refused at 4 (same outcome as AC-53.1). [I]
- AC-55.3 Every paid game without an exception still refuses FREE users at every difficulty; existing paid-gate tests pass unchanged. [I]
- AC-55.4 An allowed FREE Easy start increments the same rate-limit record as any other game; no new counter or table exists. [I]

**FR-MK-56 Partly-free presentation (web and app).** When a paid game has a free-difficulty exception, FREE users are not sent away from it. Web: the hub tile shows the paid badge plus a short "Easy is free" note and opens setup instead of redirecting to the subscription page; the setup page shows the free difficulty as playable and the others locked with the paid badge and the existing upgrade link. App: the hub tile stays playable with the paid badge; the setup screen shows the free difficulty as playable and the others locked in the app's neutral "not on your plan" state, with no price or purchase UI (`kPaidGamePresentation`). One pure lock rule per host decides a level's state: locked when difficulty is 4 for a FREE user, or when the game is paid and the difficulty is not in its exception.
- AC-56.1 Web, with `math-rally` in `PREMIUM_GAMES` (test input): for a FREE user the lock rule returns playable for Easy and locked for Medium, Hard and Super Hard, and the hub does not redirect to the subscription page. [U]
- AC-56.2 App, with `MATH_RALLY` in the paid copy (test input): the hub tile is playable with the paid badge, and the setup screen locks Medium, Hard and Super Hard without purchase UI. [U: Dart widget or logic test]
- AC-56.3 At launch (game free), both hosts lock only Super Hard for FREE users. [U]
- AC-56.4 If a host shows a level as playable but the server refuses it (for example an app released before the switch), the player sees the existing paid-required message, and the refused start consumes no play (the gate runs before the rate limiter). [I]

---

## 5. Non-Functional Requirements

### Performance and size
- **NFR-MK-1 Frame rate.** Target 60 fps on the reference devices (Q28). Gate on the reference Android phone inside the WebView over a full race: median at least 50 fps and slowest 1% of frames at least 30 fps (Q29). On Android the gate is measured in each platform-view composition mode the WebView plugin offers, and the mode that ships is recorded (U18). Failing the gate after optimisation stops work and goes to the owner; before that, the levers tried are fewer effects, lower resolution, another renderer mode and the other Android composition mode. Measured with a development-only frame-time overlay; not present in production builds.
- **NFR-MK-2 Input response.** A lane action shows visible kart movement within 100 ms (checked with slow-motion video on the reference devices).
- **NFR-MK-3 Download budget (targets, unmeasured).** Game code chunk (Phaser plus game) at most 450 KB gzip; first-race art and sound at most 1.5 MB; the site's entry chunk grows by at most 2 KB gzip of code, with both Math Rally routes lazy (FR-MK-41); the app grows by at most 4 MB (Q27). The 2 KB excludes the `mathRally` host strings in the three main locale files, which `apps/web/src/i18n.ts` imports into the entry chunk, and the registry and display-map entries; the bundle report lists both separately.
- **NFR-MK-4 Load time (target).** From opening the game route to "ready" at most 4 s on a mid-range phone over a typical 4G connection on first visit, and at most 2 s on later visits (cached).
- **NFR-MK-5 Cleanup.** Leaving the game destroys the engine instance and releases its WebGL context, listeners, timers and audio; five races in a row show no steady memory growth (manual check in browser devtools).

### Usability and accessibility
- **NFR-MK-6 Legibility.** On a 320 px wide screen with 4 paths: question text at least 28 CSS px, sign text at least 20 CSS px bold, contrast at least 4.5:1 against its background, sign labels at most 4 characters (FR-MK-14). Signs for the current fork are also shown as lane labels near the kart when the scene's signs would be smaller than that size.
- **NFR-MK-7 Accessibility.** Reduced motion (from the OS setting on web through `services/presentationPreferences.ts`, from the app on mobile) removes shake, spin, flashing and speed lines and makes the celebration static. Feedback never relies on colour alone. Full keyboard play. Setup and result screens work with a screen reader. Documented gap: the race cannot be played with a screen reader; on web the current question and options are mirrored to an ARIA live region (Q14), which is cleared while the race is paused (FR-MK-22). Full WCAG conformance needs a manual assistive-technology review and is not asserted here.
- **NFR-MK-8 Photosensitivity.** Nothing flashes more than 3 times per second.
- **NFR-MK-9 Localisation.** All text exists in en, es and pt, each string in exactly one place (Q33, refined in Application Design): host-page strings (hub tile, setup, how to play, host errors, result extras) under the `mathRally` namespace of `apps/web/src/locales/*.json`, from which the app's ARB files are regenerated with `apps/mobile/tools/convert_locales.mjs`; in-race strings (prompt templates, HUD, feedback, pause menu, countdown) in `apps/web/src/games/math-rally/locales/{en,es,pt}.json`, imported only by the game code, so they stay out of the site's entry chunk (NFR-MK-3) and ship inside both game builds (in-canvas text needs no network; the host only passes the language code). A Math Rally locale completeness test (same pattern as `src/locales/__tests__/questLocaleCompleteness.test.ts`) covers both sets; `localeCompleteness.test.ts` keeps passing. The race uses the host's language reduced to its base code (the browser detector can return `pt-BR` or `es-MX`, which map to `pt` and `es`); any language other than en, es or pt falls back to `en`, as `i18n.ts` does (`fallbackLng: 'en'`).
- **NFR-MK-10 Fonts offline.** The game uses a bundled font with an open licence (for example SIL OFL) or system fonts; it does not load Google Fonts.

### Security (Security Baseline enabled, Q37)
- **NFR-MK-11 Input validation (SECURITY-05).** `mathRallySubmission` and every bridge message are validated with a strict schema and size limits (FR-MK-28, FR-MK-49). Prompt and option strings from the server are rendered as canvas text, never as HTML.
- **NFR-MK-12 Access control (SECURITY-08).** `userId` comes from the verified JWT only; the existing ownership and status checks apply; the tier gate, including the per-difficulty exception, stays server-side (FR-MK-55); the WebView never holds a token (FR-MK-47).
- **NFR-MK-13 Secure design (SECURITY-11).** Misuse cases handled: invented answers (server key), answers to unissued questions (key per game), impossible speed (FR-MK-30), replayed completion (status check), probing for which check failed (one generic message), tampered bridge messages (validation), a forged or outdated protocol version (FR-MK-26), FREE user at difficulty 4 (server gate). **Stated limit:** the game knows each correct answer for instant feedback, so a script can play perfectly. The score depends only on the server's count of correct answers (FR-MK-32), and times below the kinematic floor are rejected (FR-MK-30), so a script can equal a perfect human race and never exceed one. Acceptable because scores carry no money value.
- **NFR-MK-14 Fail closed and safe errors (SECURITY-09, SECURITY-15).** All new external calls have explicit error handling; errors shown to players are generic; game records are only written after validation passes; the existing global error boundary catches render errors.
- **NFR-MK-15 Logging (SECURITY-03).** New server logs carry ids, difficulty, counts, score and rejection stage only; never choices, the answer key, tokens, emails or usernames. App and game logs never include tokens.
- **NFR-MK-16 Supply chain (SECURITY-10, SECURITY-13).** Phaser is pinned to an exact version with the lockfile committed; the WebView plugin is pinned through `pubspec.lock`; `npm audit` and `flutter pub outdated` are run and recorded at construction; licences of Phaser, the plugin, any copied template code and every asset are recorded. No script, font or asset loads from a CDN.
- **NFR-MK-17 Headers and CSP (SECURITY-04).** The game works under the current CSP without `unsafe-eval` and without inline scripts. If the engine needs an extra source (for example `blob:` for images or audio), it is added narrowly to `apps/web/vercel.json` and documented. The app's bundled page carries its own restrictive CSP: every source limited to its own app-internal origin (`'self'`), so nothing leaves the device. `connect-src` is `'self'` rather than `'none'` because the engine loads its own atlases and sounds with XHR from that origin (corrected in Application Design). The app page's CSP is enforced (unlike the site's Report-Only header), so the `blob:` rule above applies to it the same way: first configure the engine's loader so it does not create `blob:` URLs (for example load images as image elements); only if that is not possible add `blob:` to `img-src`, and to `media-src` if audio needs it, and document it (U5).
- **NFR-MK-18 WebView hardening (SECURITY-09).** In release builds web-content debugging is off, file access is off, only the app-internal origin loads, pop-ups and external navigation are blocked, and the JavaScript bridge exposes only the message channel.

### Privacy, IP and content
- **NFR-MK-19 Child privacy.** No new personal data is collected or stored; per-fork choices are scored and discarded (only counts and score are kept); no ads; Benji is fictional with no likeness or details of the real child (Q31). **Requests:** the game core and the app bundle make no request outside their own origin (web: dashden.app; app: the app-internal origin) and load no third-party SDK. On web the host page keeps the site-wide requests that every dashden.app page makes today (Google Fonts from `apps/web/index.html`; Vercel Analytics and Speed Insights from `apps/web/src/main.tsx`); Math Rally adds none. Self-hosting the font is a backlog item (Section 3).
- **NFR-MK-20 IP safety.** No Nintendo characters, names, items, sounds, music, track names or trade dress; no item boxes. A credits manifest lists source, licence and URL for every art, sound and font file (Q30). The final name "Math Rally" gets a quick trademark search before launch, and no title may follow the "<Name> Kart" pattern (R6).
- **NFR-MK-21 Age-appropriate content.** All text is friendly and non-competitive in tone toward wrong answers (no "you lose"); difficulty labels match the existing games.

### Quality
- **NFR-MK-22 Testability.** Pure modules (generator, distractors, timing bounds, scoring, lane and joystick logic, race clock, message validators) have unit and property tests (`fast-check` is already used in `packages/shared` and `apps/web`). Backend tests cover the start payload, validation, re-scoring, timing, rejection and side effects. Dart tests cover the bridge and play-screen state without a real WebView. Rendering, feel, devices, audio and WebView behaviour are checked manually against written steps.
- **NFR-MK-23 Compatibility.** API changes are additive; non-Math-Rally games are unaffected; deploy order follows FR-MK-39. App versions released before Math Rally do not list it. Web and app builds that include Math Rally keep working after a server change because race parameters, track constants, question kinds and payload shapes are frozen per protocol version (Section 4.0): a change ships as a new version, the Game Service is deployed first and keeps serving every version still in use, and a build whose version the server no longer supports gets the "Please update the app to play." refusal without losing a play (FR-MK-26). Dropping support for a version is an owner decision.
- **NFR-MK-24 Supported platforms (targets).** Current and previous major versions of Chrome, Safari, Firefox and Edge on desktop; Safari on iOS and Chrome on Android of the reference devices; the app on the iOS and Android versions the app already supports. A browser without WebGL gets FR-MK-44's message (whether Phaser 4 offers a Canvas fallback is unverified, U4).
- **NFR-MK-25 Technology stack (locked once approved).** Phaser 4 (exact version pinned at the start of construction), TypeScript, Vite, React 18 host in `apps/web`; Flutter with one WebView plugin chosen in the mobile spike; Node Lambda Game Service and Leaderboard unchanged in stack. Not used: three.js, Flame (fallback only, owner decision), any analytics or ads SDK in the game.
- **NFR-MK-26 Metrics.** Existing `metricsPublisher` metrics cover started and completed games; a new metric counts rejected Math Rally submissions by stage. No personal data in metrics.

---

## 6. Data and Score Contract Sketch

Field names are indicative; Application Design fixes them.

```text
startGame(input: { themeId: "MATH_RALLY", difficulty: 1-4, questContext?,
  mathRallyProtocol: int           (required for MATH_RALLY, from ready;
                                    unsupported -> refused before the
                                    rate limiter, no play used) })
  returns the existing fields plus
  mathRally: {
    protocolVersion: 1             (the version the race was built with)
    forks: N                         (Section 4.0)
    paths: 2 | 3 | 4
    readSeconds: number              (minimum reading window)
    questions: [                     (N entries)
      { kind: "add" | "times" | "fractionOf" | ..., operands: [...],
        options: [string] (paths entries, each at most 4 chars),
        correctIndex: 0..paths-1 }
    ]
  }

Game record (existing table memory-game-games-{env}), new optional attribute:
  mathRally: { seed, protocolVersion, paths, forks, key: [int] (N entries) }

completeGame(input: { gameId, completionTime (s), attempts: N,
  mathRallySubmission: {
    choices: [int 0..paths-1]        (N entries)
    forkTimesMs: [int, strictly increasing] (N entries)
  } })
  returns the existing CompleteGameResponse (ScoreBreakdown shape unchanged,
  speedBonus always 1.0, quest?)

Score (FR-MK-32): base[d] x multiplier[d] x (0.5 + correct / N)
  all correct: 3000 / 4500 / 6000 / 8000 for d = 1 / 2 / 3 / 4
Timing check (FR-MK-30): every forkTimesMs[k] and completionTime must be
  at least expected(protocolVersion, d, right/wrong per fork) - tolerance
```

```mermaid
sequenceDiagram
    participant P as Player
    participant H as Host page or app screen
    participant G as Game core
    participant S as Game Service
    H->>G: Load engine and assets
    G-->>H: ready with protocol version
    P->>H: Pick difficulty and start
    H->>S: startGame MATH_RALLY with protocol version
    S->>S: Check protocol, seed, build race, store answer key
    S-->>H: game id and race payload
    H->>G: init with race payload
    P->>G: Steer into a lane at each fork
    G-->>H: raceFinished with choices and fork times
    H->>S: completeGame with mathRallySubmission
    S->>S: Validate, count correct from key, check times against expected, score
    S-->>H: Score breakdown and optional quest result
    H->>P: Result screen
```

**Text alternative:** The host (the React page on web or the Flutter screen in the app) first loads the game core and its assets; the game reports ready with its protocol version. When the player starts, the host calls `startGame` with that version; the server refuses an unsupported version before counting a play, otherwise picks a seed, builds the race with that version's rules, stores the answer key on the game record, and returns the questions. The host passes them to the game with `init`. The player steers into a lane at each fork. At the finish the game sends the chosen lanes and fork times to the host, which calls `completeGame`. The server validates the submission, counts correct answers from its own key, checks each time against the time the kart needs for those answers, computes the score from the correct count and returns the breakdown (plus a Quest Map result when launched from a node). The host shows the result screen.

---

## 7. Integration Points (read in code at `c6ccf0f`)

| Area | Files | Change |
|---|---|---|
| Shared | `packages/shared/src/index.ts`; new `packages/shared/src/math-rally/` | Generator, race constants, submission schema, timing bounds; export like `circuit` and `quest` |
| Shared paid list | `packages/shared/src/constants/paid-games.ts` | `PAID_GAME_THEME_IDS` not changed at launch (free); changed only by the paid switch. New at launch: the free-difficulty exception (`MATH_RALLY`: Easy) and the pure gate function (FR-MK-55) |
| Quest allowlist | `packages/shared/src/quest/themes.ts` | Not changed in v1 (no node) |
| Game Service | `services/game/src/services/game.service.ts` | `startGame` race build for `MATH_RALLY`; the paid gate calls the shared per-difficulty gate (FR-MK-55); a third completion exit (before generic logic, like `completeCircuitBuilderGame`) that calls `finalizeQuest` |
| Game Service | `services/game/src/services/score-calculator.service.ts` | Dedicated Math Rally breakdown |
| Game Service | `services/game/src/utils/validation.ts`, `src/types/index.ts`, `src/handlers/game.handler.ts`, `src/repositories/game.repository.ts` | `mathRallyProtocol` declared in `startGameInputSchema` and `mathRallySubmission` in `completeGameInputSchema` (zod strips undeclared keys), the submission passed as `unknown` then validated; start response mapping; persist the `mathRally` attribute with its protocol version |
| Game Service | `services/game/src/services/review.service.ts` | Add `MATH_RALLY` |
| Game Service docs | `services/game/schema.graphql` | Documentation only (handler routes by regex) |
| Leaderboard | `services/leaderboard/src/types/index.ts`, `src/services/scoring.service.ts` | `GameType.MATH_RALLY`, dedicated validation entry; `src/services/anomaly.service.ts` is not changed (Q40), only covered by AC-38.2 |
| Web | `apps/web/package.json`, lockfile | Add Phaser, exact pin |
| Web | `apps/web/src/App.tsx`, `src/config/constants.ts` | Lazy route, `ROUTES.MATH_RALLY_SETUP` and `MATH_RALLY_GAME` |
| Web | new `apps/web/src/pages/math-rally/`, new game core folder | Setup page, React host, game core |
| Web | `apps/web/src/api/game.ts` | `START_GAME` selection set and types for `mathRally`; `CompleteGameInput.mathRallySubmission` |
| Web | `src/components/hub/GameTile.tsx`, `src/pages/hub/GameHubPage.tsx` | Free-difficulty copy, "Easy is free" note and no subscription redirect for partly free games (FR-MK-56) |
| Web | `src/pages/hub/GameHubPage.tsx`, `src/api/leaderboard.ts`, `components/leaderboard/GameTypeFilter.tsx`, `components/dashboard/RecentImprovements.tsx`, `pages/admin/AdminDashboard.tsx`, `pages/dashboard/{History,Achievements,Statistics}Page.tsx` | Registry entries |
| Web | `src/locales/{en,es,pt}.json` | `games.math-rally.*` and `mathRally.*` |
| Web | new `src/__tests__/mathRallyRegistry.test.ts` | Consistency test |
| Web | `apps/web/vercel.json` | Only if the engine needs an extra CSP source (NFR-MK-17) |
| App | `apps/mobile/pubspec.yaml`, `pubspec.lock` | WebView plugin; game assets declared |
| App | `lib/config/paid_games.dart`, `lib/game/hub_logic.dart` | Free-difficulty copy and partly-free tile (FR-MK-56); the existing paid-list parity test also compares the exception |
| App | `lib/game/game_registry.dart`, `lib/stats/game_meta.dart`, `lib/ui/router.dart`, `lib/api/game_api.dart`, `lib/api/game_models.dart` | Registry, display meta, routes, start payload, `completeExtraKeys` |
| App | new `lib/game/math_rally/`, new screens under `lib/ui/screens/games/` | Bridge, play screen, setup screen |
| App | `android/app/src/main/AndroidManifest.xml`, `ios/Runner/Info.plist` | Only if the WebView plugin requires entries |
| Data | new `scripts/seed-math-rally.sh`, `scripts/verify-math-rally-seed.sh` | Theme and catalog rows |
| Not touched | `services/game/src/daily-email.ts`, Quest Map config, Cognito, API Gateway CORS, infrastructure stacks | |

---

## 8. Conflicts and Gaps Found in the Codebase

1. **Free game, paid Super Hard; no per-difficulty paid gate exists.** FREE users are refused at difficulty 4 on every game (`game.service.ts`), so "free" means difficulty 1 to 3 for FREE users (Q7, Q19). The paid gate today is all-or-nothing per theme, and the web hub redirects FREE users away from any `PREMIUM_GAMES` tile (`GameHubPage.tsx`) while the app marks such tiles unavailable (`hub_logic.dart`). The Q21 answer (Easy stays free after a switch) therefore needs a new server gate and matching host changes (FR-MK-55, FR-MK-56).
2. **Two cap layers and duplicated premium lists.** `PREMIUM_GAME_THEMES` appears twice and differs from `PAID_GAME_THEME_IDS`. Math Rally's own completion exit avoids them, and AC-32.5 ties its cap to the shared paid list.
3. **No lazy loading anywhere.** All routes are eager imports in `App.tsx`; Math Rally sets the first precedent (FR-MK-41).
4. **StrictMode double mount** in development (`main.tsx`); the React host must guard against two engine instances (FR-MK-43).
5. **CSP Report-Only, no `blob:` in `img-src`.** Possible engine needs are unverified (U5); handled by NFR-MK-17.
6. **Site-wide third-party requests.** `index.html` loads Google Fonts and `main.tsx` mounts Vercel Analytics and Speed Insights on every page. The fonts are not usable by an offline app bundle (NFR-MK-10), and the Math Rally web routes inherit all three requests (NFR-MK-19 is scoped accordingly).
7. **CORS allows only dashden.app origins.** One reason the app host, not the WebView, calls the API (Q24).
8. **App games are native Dart ports.** Math Rally is the first WebView-hosted game; the app has no WebView dependency yet.
9. **Super Hard shows as HARD on the leaderboard** (U7a finding; existing behaviour, unchanged).
10. **Existing math generators are unseeded** (`mathUtils.ts`, `mazeEquations.ts`); Math Rally needs a new seeded generator (FR-MK-18).
11. **Quest World 1 forbids paid games**, so after a paid switch a Math Rally World 1 node would need the quest config validator to honour the Easy-only exception first (Q35, backlog).
12. **No browser, viewport or device test tooling** (as for Circuit Builder NFR-CB-26); feel and performance are manual (NFR-MK-22).
13. **Leaderboard pattern checks expect varied scores and times.** `anomaly.service.ts` flags a score repeated 3 or more times among a player's earlier entries of the same game (up to 20 read) and completion times varying by less than 5% across them (delta notes Section 4). Math Rally has only N + 1 possible scores per difficulty and near-fixed times, so honest players will be flagged; the flag hides nothing today (FR-MK-38, Q40). The leaderboard also ranks by score only, so perfect races at one difficulty tie (R17).
14. **The start input strips unknown keys.** `startGameInputSchema` in `utils/validation.ts` is a plain zod object, so `mathRallyProtocol` must be declared or it never reaches `startGame` (FR-MK-26).

---

## 9. Risks

| Id | Risk | Mitigation |
|---|---|---|
| R1 | The forked pseudo-3D road is harder to draw well, or too slow on phones in a WebView | Vertical slice first with the NFR-MK-1 gate; owner decides on fallback (Q29, Q38) |
| R2 | Phaser 4 maturity: API gaps, fewer examples than Phaser 3, unknown size | Pin version early; spike verifies size and features; any change of engine version is escalated to the owner, not made silently |
| R3 | WebView quirks: iOS audio and silent switch, Android WebView version spread, Android platform-view composition mode (U18), iOS custom-scheme responses the engine's loader may reject (U19), touch and zoom behaviour | Mobile spike on both platforms before full integration, including loading an image, an atlas and a sound over the app-internal origin (AC-46.3) and measuring both Android composition modes (NFR-MK-1, NFR-MK-18, FR-MK-46 to 48) |
| R4 | iOS builds only on the owner's Mac, so iOS feedback is slow | Schedule iOS checks as explicit owner tasks with written steps |
| R5 | Bundle budget missed | Measure in the slice; custom Phaser build or lighter assets (Q27 B) |
| R6 | Name and trademark (reduced by Q22): the title "Math Rally" has no "Benji" and no "Kart"; "Benji" remains as the driver character's name (Benji film franchise exists) | Quick trademark search on "Math Rally" before launch; character shown as an original cartoon with no franchise look; no "<Name> Kart" title |
| R7 | Look-alike IP: kart racing visuals drifting toward Mario Kart trade dress | NFR-MK-20 manifest and review of every asset; no item boxes, no Nintendo-like tracks or sounds |
| R8 | Four signs unreadable on 320 px phones | NFR-MK-6 sizes and lane labels; verify on the reference phone |
| R9 | Motion sickness or photosensitivity from fast scrolling roads | Reduced motion mode and NFR-MK-8 |
| R10 | Perfect-play scripts (accepted limit, NFR-MK-13) | The score uses only the server's correct count, never client time, so a script can equal a perfect human race and never exceed one; times below the kinematic floor are rejected (FR-MK-30, FR-MK-32) |
| R11 | Wrong production deploy order silently drops leaderboard events or shows a dead tile | FR-MK-39 order and warnings |
| R12 | After a paid switch the app's badge and level locks lag until an app release (older apps show Medium and Hard as playable) | Server gate is authoritative; a refused start costs no play and shows the existing paid-required message (AC-56.4); documented in the switch checklist (FR-MK-54) |
| R13 | Scope creep (rivals, items, tracks, customisation) | Out-of-scope list; backlog |
| R14 | Content too hard or too easy for the stated ages | Owner playtest with Benji at each difficulty before launch; constants are tunable before launch, and after launch only through a protocol version bump (Section 4.0) |
| R15 | App store review of a WebView game | Files are bundled, not downloaded, which avoids the "downloaded code" concern (*unverified against current store guidelines*, U11) |
| R16 | The free-difficulty exception drifts between server, web and app | One shared constant; web and app copies checked by the consistency test and the app's parity test (FR-MK-37) |
| R17 | Discrete scores and near-fixed times: perfect races tie at the ceiling with no tie-break, and the leaderboard's pattern checks flag honest players (warning logs with ids and a noisy `AnomalyDetected` metric) | Accepted for v1 (Q40); flagged entries still rank (AC-38.2); a tie-break or an anomaly exemption is backlog |
| R18 | A post-launch server change breaks installed apps whose bundle carries older race rules | Protocol versions frozen per release; server deployed first and keeps old versions; unsupported versions refused before a play is used (Section 4.0, FR-MK-26, NFR-MK-23) |

---

## 10. Unverified Assumptions

No web access was available in this session, so external facts below were not checked.

- **U1** Phaser 4 has a stable release usable from npm; its exact version is not known here.
- **U2** `phaserjs/template-react` targets Phaser 4 and a React version compatible with the app's React 18.2; if not, only its pattern (a React component that owns the game instance and an event bridge) is reused.
- **U3** Phaser 4's gzip size fits NFR-MK-3.
- **U4** Phaser 4 offers a Canvas renderer fallback when WebGL is missing.
- **U5** Phaser 4 loads images or audio through `blob:` URLs (would need a CSP addition).
- **U6** A Flutter WebView plugin (candidate `flutter_inappwebview`) supports Android `WebViewAssetLoader` and an iOS custom scheme handler, and a JavaScript message channel, on the app's minimum OS versions.
- **U7** WebGL in the Android System WebView and in WKWebView reaches the frame-rate gate on the reference devices.
- **U8** Kenney.nl packs used are CC0 (checked per pack at download time and recorded in the manifest).
- **U9** The Vercel build resolves relative imports into `packages/shared` (inferred from the Quest Map production deploy of 2026-11-03).
- **U10** The owner has, or can get, a mid-range Android phone for the gate (Q28).
- **U11** Current App Store and Play policies accept a bundled HTML5 game in a WebView.
- **U12** Race length estimates (1.5 to 2 minutes) and load-time targets; nothing was measured.
- **U13** Flutter and the Android SDK are installed on this Windows machine (not checked); iOS needs the owner's Mac.
- **U14** Production theme and catalog tables accept the new rows as for Circuit Builder; production data was not queried and no AWS call was made.
- **U15 to U17** are recorded in `../application-design/math-kart-components.md` Section 8 (Vite JSON chunking, CSP `'self'` on a custom scheme, Vercel static files before the SPA rewrite).
- **U18** Which Android platform-view composition mode `flutter_inappwebview` 6.x uses by default for its WebView, which other mode it offers, and how much the mode changes WebGL frame rate on the reference Android phone (NFR-MK-1).
- **U19** Whether Phaser 4's loader accepts the XHR response that an iOS custom-scheme handler produces. Phaser 3 treats any status other than 200 as a failure unless the URL's scheme is listed in its `loader.localScheme` setting, and a scheme-handler response can reach page script as status 0; Phaser 4's behaviour is unknown here (FR-MK-46, AC-46.3).

---

## 11. Security Baseline Compliance (requirements stage)

| Rule | Status | Basis |
|---|---|---|
| SECURITY-01 Encryption | N/A for new code | No new store; one new attribute on the existing games table |
| SECURITY-02 Access logging | N/A | No new network intermediary; existing API Gateway logging covers the operations |
| SECURITY-03 App logging | Compliant (as specified) | NFR-MK-15 |
| SECURITY-04 HTTP headers | Compliant for new code; pre-existing CSP Report-Only remains | NFR-MK-17; enforced app page CSP, with `blob:` only as a documented fallback |
| SECURITY-05 Input validation | Compliant (as specified) | FR-MK-28, FR-MK-49, NFR-MK-11 |
| SECURITY-06 Least privilege | N/A | No new IAM role or policy |
| SECURITY-07 Network | N/A | No VPC or network change |
| SECURITY-08 Access control | Compliant (as specified) | NFR-MK-12, FR-MK-47, FR-MK-55 (server-side per-difficulty gate; host locks are presentation only) |
| SECURITY-09 Hardening | Compliant (as specified) | NFR-MK-14, NFR-MK-18, FR-MK-44 |
| SECURITY-10 Supply chain | Compliant (as specified); SBOM is pre-existing debt | NFR-MK-16 |
| SECURITY-11 Secure design | Compliant, with stated limit (a script can equal a perfect human race, never exceed one) | FR-MK-26 to FR-MK-32, NFR-MK-13 |
| SECURITY-12 Authentication | N/A | Cognito flows unchanged; no token in the WebView |
| SECURITY-13 Integrity | Compliant (as specified) | No CDN loads; bridge messages schema-validated; bundle ships inside the signed app |
| SECURITY-14 Alerting | N/A for new code; pre-existing gaps remain | NFR-MK-26 adds a rejection metric only |
| SECURITY-15 Exception handling | Compliant (as specified) | FR-MK-31, FR-MK-44, NFR-MK-14 |

No blocking security finding at this stage. Statuses describe requirements as written and are re-checked in design and construction.

---

## 12. Decision Traceability

| Question | Decision | Requirements |
|---|---|---|
| Q1 | Pseudo-3D in Phaser 4 | FR-MK-1, FR-MK-2, NFR-MK-25 |
| Q2 | Feedback plus score effect | FR-MK-10, FR-MK-11, FR-MK-32 |
| Q3 | Slowdown, no lives | FR-MK-11 |
| Q4 | Coin plus boost | FR-MK-10 |
| Q5 | Fixed forks | FR-MK-4, Section 4.0 |
| Q6 | 2, 3, 4 paths | FR-MK-7, Section 4.0, NFR-MK-6 |
| Q7 | Super Hard 4 paths, 5 s, paid-only | Section 4.0, FR-MK-40, FR-MK-53 |
| Q8 | Reading window at top speed | FR-MK-6, FR-MK-8 |
| Q9 | Lane selection | FR-MK-9 |
| Q10 | Content table, no decimals | FR-MK-13, FR-MK-14 |
| Q11 | Mistake-based distractors | FR-MK-15, FR-MK-16 |
| Q12 | Keyboard and joystick | FR-MK-3, FR-MK-20, FR-MK-21 |
| Q13 | No gamepad | Section 3 |
| Q14 | Accessibility set | FR-MK-22, NFR-MK-6 to NFR-MK-8 |
| Q15 | No rivals | Section 3 |
| Q16 | Server-built race and re-scoring; times checked against the kinematics of the given answers | FR-MK-25 to FR-MK-31, NFR-MK-13 |
| Q17 | Dedicated breakdown from the correct count only; no client time | FR-MK-32, FR-MK-5, Section 4.0 |
| Q18 | Leaderboard entry | FR-MK-38 |
| Q19 | Free at launch | FR-MK-53 |
| Q20 | Manual paid switch with checklist | FR-MK-54, AC-32.5, FR-MK-37 |
| Q21 | Easy stays free after a switch; shared FREE allowance | FR-MK-55, FR-MK-56, FR-MK-54, FR-MK-40 |
| Q22 | "Math Rally" | FR-MK-35, NFR-MK-20, R6 |
| Q23 | Bundled files, app origin | FR-MK-46 |
| Q24 | Flutter owns the API | FR-MK-47 |
| Q25 | Message contract | FR-MK-49 |
| Q26 | Orientation, audio, lifecycle | FR-MK-21, FR-MK-48 |
| Q27 | Budgets | NFR-MK-3 |
| Q28 | Reference devices | NFR-MK-1 |
| Q29 | Performance gate | NFR-MK-1 |
| Q30 | CC0 and original art, manifest | FR-MK-1, NFR-MK-20 |
| Q31 | Benji fictional, no new data | NFR-MK-19 |
| Q32 | One track theme | FR-MK-1 |
| Q33 | One locale source | FR-MK-19, NFR-MK-9 |
| Q34 | Start failure per host | FR-MK-50 |
| Q35 | Quest-ready, no node | FR-MK-52 |
| Q36 | Quit abandons | FR-MK-22 |
| Q37 | Security Baseline on | Section 11 |
| Q38 | Vertical slice first | NFR-MK-1, R1 (unit order is set in Units Generation) |
| Q39 | Pause hides the question | FR-MK-22, FR-MK-8, NFR-MK-7 |
| Q40 | Accept leaderboard pattern flags | FR-MK-38, R17 |

**Counts**: 56 functional requirements (FR-MK-1 to FR-MK-56; FR-MK-55 and FR-MK-56 added for the Q21 owner answer), 26 non-functional requirements (NFR-MK-1 to NFR-MK-26).

---

## 13. Responses to the Design Review (iteration 1)

Review: `.agents/tasks/math-kart-inception/review.md`, verdict CHANGES_REQUESTED. This table covers the findings that touch the requirements-side files (this file, the question file, the personas, the stories and the delta notes). Findings 9, 10, 14 to 18 and the `aidlc-state.md` part of 19 are design-side; where a design finding also needed a requirement, the requirement is listed.

| Finding | Response | Where |
|---|---|---|
| 1 HIGH, time factor rewards nothing the player controls | Addressed. The score no longer uses client time (`speedBonus` 1.0); an all-correct race scores exactly 3000/4500/6000/8000. Timing is checked against expected times computed from the kinematics for the given right/wrong sequence, minus a tolerance set by a property test. The stated limit now reads "a script can equal a perfect human, never exceed one", which holds | Section 4.0, FR-MK-5, FR-MK-30 (AC-30.1, AC-30.2), FR-MK-32 (AC-32.1 to AC-32.4), FR-MK-38 AC-38.1, NFR-MK-13, R10, Section 6, Section 11, Q16, Q17, MK-10, MK-19 |
| 2 MEDIUM, installed bundles break when parameters change | Addressed. Parameters, track constants, kinds, operand rules and payload shapes are frozen per protocol version; `startGame` requires `mathRallyProtocol`, refuses an unsupported value before the rate limiter (no play used) and stores the version on the record | Section 4.0, FR-MK-18, FR-MK-26 (AC-26.3), FR-MK-49, NFR-MK-23, R14, R18, Section 6, gap 14, MK-13, MK-19 |
| 3 MEDIUM, equal-value signs and no canonical form | Addressed. Integers -999 to 999 without leading zeros or "-0" (the 3-digit variant, so 1024 is not generated); fractions `^-?[1-9][0-9]?/[1-9][0-9]?$`; correct option in lowest terms; options compared by value; value-based property test | FR-MK-13, FR-MK-14 (AC-14.1), FR-MK-15 (AC-15.1, AC-15.2), Q10 and Q11 notes, MK-11, MK-12 |
| 4 MEDIUM, pause shows the question | Addressed with new Q39 (recommended A): opaque pause screen hides banner, signs and lane labels, clears the live region; the remaining window continues on resume. Residual limit (memorising) stated | FR-MK-8, FR-MK-22 (AC-22.3), NFR-MK-7, Q39, MK-9 |
| 5 MEDIUM, joystick can be hidden on a touch phone | Addressed. Visibility rule in FR-MK-21; always shown in the app; `init` carries the flag | FR-MK-21 (AC-21.4), FR-MK-49, MK-6 |
| 6 MEDIUM, spike misses known WebView risks | Addressed on the requirements side: U18 and U19 added; Android composition mode measured and added to the levers; loader-accepted responses and a load test for image, atlas and audio; the `blob:` rule applies to the enforced app CSP. The MR1 step list is design-side | NFR-MK-1, FR-MK-46 (AC-46.3), NFR-MK-17, R3, Section 10, Q29, MK-21, MK-25 |
| 7 MEDIUM, "no third-party or remote request" is wrong for web | Addressed. Claim scoped to the game core and the app bundle; the existing site-wide requests are named; Math Rally adds none; self-hosting Poppins added to the backlog | NFR-MK-19, gap 6, Section 3, Q31, MK-20, MKP3 |
| 8 MEDIUM, `--check-only` cannot detect a stale bundle | Addressed. `sourceHash` over source, shared module, assets, embed config and lockfile; the check recomputes it; AC-51.1 restated; commit ids dropped with the reason | FR-MK-51 (AC-51.1, AC-51.2), MK-13 |
| 11 NIT, `?difficulty=` on the wrong page | Addressed. The game route skips setup | FR-MK-40, MK-2 |
| 12 NIT, quest ACs need a test seam | Addressed. Stub `QuestService` through `GameService`'s optional constructor parameter | AC-33.2, AC-52.1, MK-26 |
| 13 NIT, entry-chunk budget | Addressed. Both routes lazy; 2 KB counts code only and excludes locale strings and registry entries, which are reported separately | FR-MK-41, NFR-MK-3, Q27, MK-24 |
| 14 NIT, regional language codes | Design-side fix; the rule is also stated as a requirement | NFR-MK-9 |
| 15 NIT, no `ready` timeout | Design-side fix; requirement added | AC-25.2, MK-3 |
| 19 NIT, R16 out of order | Addressed. R16 moved after R15 (the `aidlc-state.md` newline is design-side) | Section 9 |
| Found while revising | The leaderboard's pattern checks will flag honest Math Rally players, and perfect races tie. New Q40 (recommended: accept and document, guard with a test) | FR-MK-38 (AC-38.2), gap 13, R17, Section 3, Q40, MK-22 |
