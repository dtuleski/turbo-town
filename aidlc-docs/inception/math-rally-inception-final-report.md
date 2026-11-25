# Math Rally INCEPTION: Final Report for the Orchestrator

**Date**: 2026-11-25
**Branch**: `feat/math-kart`, worktree `.worktrees/math-kart`, HEAD `53d6ac3`, pushed (`origin/feat/math-kart` = `53d6ac3`)
**Review**: iteration 4 (final), `review.md` and `review.json` in this folder

## Verdict: APPROVED

HIGH 0, MEDIUM 0, NIT 2. All six iteration 3 findings are closed. The two NITs can be fixed at the start of Construction:
1. An `INIT_INVALID` from the game gets "Could not start the race." in services 5.1 but "The race stopped unexpectedly." in the methods mapping and R-D9. One rule should be picked.
2. On web the fatal-error guard also ends a race for errors from scripts that browser extensions inject. A same-origin filter is proposed, plus a false-positive check in MR4.

The package still needs the owner's approval. It is marked pending in `aidlc-state.md`.

## Files (all under `aidlc-docs/` in the worktree)

- `inception/reverse-engineering/math-rally-delta-notes.md`
- `inception/requirements/math-rally-requirement-verification-questions.md`
- `inception/requirements/math-rally-requirements.md`
- `inception/user-stories/math-rally-personas.md`
- `inception/user-stories/math-rally-stories.md`
- `inception/plans/math-rally-execution-plan.md`
- `inception/plans/math-rally-application-design-plan.md`
- `inception/application-design/math-rally-components.md`
- `inception/application-design/math-rally-component-methods.md`
- `inception/application-design/math-rally-services.md`
- `inception/application-design/math-rally-component-dependency.md`
- `inception/application-design/math-rally-concept.md`
- `inception/application-design/math-rally-unit-of-work.md`
- `inception/application-design/math-rally-unit-of-work-dependency.md`
- `inception/application-design/math-rally-unit-of-work-story-map.md`
- `aidlc-state.md` (Math Rally section)

The `math-kart-` prefix is intentional. Construction renames the files first.

## Counts

| Item | Count |
|---|---|
| Questions | 40 (all answered) |
| Functional requirements | 56 (FR-MK-1 to 56) |
| Non-functional requirements | 26 (NFR-MK-1 to 26) |
| Acceptance criteria | 92 |
| User stories | 28 (MK-1 to MK-28) |
| Personas | `math-rally-personas.md` |
| Units of work | 5 (MR1 to MR5) plus 8 pre-launch checks (PL1 to PL8) |
| Risks | R1 to R19 |
| Unverified assumptions | U1 to U21 |

## Owner Decisions (binding)

- Q1 Road: pseudo-3D road seen from behind the kart, drawn with Phaser 4.
- Q2 Feedback: a wrong answer shows a red X with an error sound and lowers the final score; a right answer shows a green check and plays a chime.
- Q6 Paths: Easy 2, Medium 3, Hard 4.
- Q7 Super Hard: 4 paths, a 5 s reading window and harder content; paid-only, like difficulty 4 in every game.
- Q10 Math: varies by level. Easy: + and - within 20. Medium: times tables, exact division, +/- within 100. Hard: order of operations, fraction of a quantity, simple percentages, squares. Super Hard: negatives, adding fractions, percentages, powers and roots, one-step equations.
- Q11 Distractors: wrong answers are built from common mistakes (accepted with the content recommendation).
- Q12 Controls: arrows or A/D, one lane per input, automatic acceleration, P or Escape pauses; a horizontal joystick at the bottom on touch.
- Q13 Gamepad: not in v1.
- Q14 Accessibility: reduced motion, feedback that does not rely on colour, a large question, a screen-reader live region.
- Q19 Price: free for every signed-in user at launch (difficulty 4 stays paid under the existing cross-game rule).
- Q20 Paid switch: a manual, planned change on or after 2026-12-31, following a written checklist.
- Q21 After the switch: Easy (difficulty 1) stays free permanently through a server per-difficulty gate; Medium, Hard and Super Hard become paid.
- Q22 Name: "Math Rally" (`MATH_RALLY`, `math-rally`, `/math-rally`); Benji is the driver character only.
- Q30 (owner context): "Mario-Kart style" is inspiration only; art is CC0 or original, recorded in a credits manifest.
- Q37 (owner context): Security Baseline enforced as blocking.

## Recommended Answers (pending owner approval)

- Q3 Wrong-answer effect: the branch turns bumpy and the kart runs at about 60% speed for about 1.5 s; no spin-out, no lives.
- Q4 Right-answer reward: a coin and a boost of about 1 s; the coin count equals the correct answers.
- Q5 Race length: 10, 12, 15 and 15 forks for difficulty 1 to 4, ending at a finish line.
- Q8 Reading time: the question shows from the previous merge, for at least 8, 7, 6 and 5 s at maximum speed.
- Q9 Steering: discrete lanes; the lane at the decision line is the answer.
- Q15 Rivals: none; the player races the clock.
- Q16 Server checks: the server builds the race at `startGame`, keeps the answer key and checks times against the kinematics.
- Q17 Score: a dedicated breakdown based only on the server's correct count.
- Q18 Leaderboard: new `GameType` `MATH_RALLY` with bounds matching what the Game Service can emit.
- Q23 App loading: the game ships inside the app's assets and is served from an app-internal origin.
- Q24 App API calls: Flutter calls the API; no token enters the WebView.
- Q25 Messages: versioned, validated JSON messages between the game and its host.
- Q26 App behaviour: portrait first with landscape laid out, WebView hardening, pause on background and on Android Back (with the iteration 4 fallback after 1 s).
- Q27 Budgets: game chunk at most 450 KB gzip, first-race assets at most 1.5 MB, entry chunk growth at most 2 KB, app growth at most 4 MB.
- Q28 Devices: the owner's iPhone, one mid-range Android phone 3 to 4 years old (model still to be named), desktop Chrome and Safari.
- Q29 Gate: in the WebView, median at least 50 fps, slowest 1% at least 30 fps, steering visible within 100 ms; if it fails, the owner decides (including the Flame fallback).
- Q31 Privacy: Benji is a fictional cartoon; no detail of the real child; the game handles no new personal data.
- Q32 Tracks: one bright countryside track in v1.
- Q33 Text: `mathRally` namespace in the existing en, es and pt locale files.
- Q34 `startGame` failure: each host keeps its current rules.
- Q35 Quest Map: no node in v1; the launch contract is supported.
- Q36 Quitting mid-race: confirm, abandon, no score, the play stays used.
- Q38 Build order: a vertical slice first, measured on devices.
- Q39 Pause: an opaque screen that hides the question, the signs and the chips.
- Q40 Repeated-score leaderboard flag: accepted and documented for v1.

Analyst interpretation to confirm: the owner's "(3 plays per day)" is read as the normal shared FREE allowance of 3 plays per 24 h, with no separate Math Rally counter.

## Units of Work

| Unit | Scope (one line) | Deploy implications |
|---|---|---|
| MR1 Vertical Slice and Performance Gate (Large) | Phaser 4 pinned; one full race on a dev-only route; fatal-error guard and Fault trigger; WebView spike on Android and iPhone; CSP and loader checks; frame-rate gate on the reference devices | `apps/web` merge only. The dev route is excluded from production builds and Phaser is not in production code. The mobile spike stays on `spike/math-rally-webview` and is not merged. No Lambda path is touched |
| MR2 Shared Race Core (Medium, can run in parallel with MR1) | `packages/shared`: protocol registry, seeded generator and distractors, canonical options, motion and expected-time maths, golden fixtures, free-difficulty constant | `packages/shared/**` triggers `deploy-lambdas.yml`: Game, Leaderboard and Email Sender Lambdas redeploy with no behaviour change |
| MR3 Backend (Large) | Game Service start and complete branches (protocol check, race build, key, timing check, score), paid-gate wiring, rejection metric, leaderboard `MATH_RALLY`, seed and verify scripts | Merge to `main` deploys `MemoryGame-GameService-prod` and `MemoryGame-LeaderboardService-prod` through CI. Any manual deploy uses `./scripts/deploy-game-lambda.sh` only. The game is unreachable until the seed, which runs last with `--profile dashden-new` and owner approval |
| MR4 Web Game and Host (Large) | Full game core and final art and sound; React setup and game pages; host state machine; `api/game.ts` start document; hub tile with the "Easy is free" copy | Frontend only: `npx vercel link --project web-prod --yes && npx vercel --prod --yes` from `apps/web/`, then re-link to `web` and restore `.env.local`. Deploy only after MR3 is live |
| MR5 App Host (Large) | Flutter setup and play screens, WebView bridge, asset loader and iOS custom scheme, Back rule, offline race, embed build (T1) and app page (G16) final | App store releases (Android built on Windows, iOS on the owner's Mac); cannot be rolled back. `--check-only` runs on the release commit first (PL7) |

Release order: Leaderboard and Game Service, then web, then app, with the seed last.

## Top 5 Risks

1. **R1 Phone performance**: a forked pseudo-3D road may be too slow inside a WebView on a mid-range Android phone. MR1 runs first and ends at a measured gate, and the owner decides on any fallback.
2. **R2 Phaser 4 maturity**: version, size and several APIs are unverified (U1 to U5, U19 to U21). The version is pinned at the start of MR1 and each capability is checked.
3. **R3 WebView quirks**: iOS audio and the silent switch, the Android composition mode, custom-scheme loader responses, and boot under the app page's enforced CSP. The MR1 spike covers each case on both platforms before MR5.
4. **Production deploy on merge**: MR2 and MR3 redeploy production Lambdas on merge with no automated rollback, and app releases cannot be undone. Changes are additive, the game stays unreachable until the seed, and the release order is fixed.
5. **R7 and R6 IP and name**: kart visuals could drift toward Mario Kart trade dress, and "Math Rally" needs a trademark search. Mitigations are the credits manifest, an asset review against NFR-MK-20 (PL2) and the trademark search (PL3).

## Open Items for Construction

- Owner approval of the inception package (recommended answers and the "3 plays per day" interpretation included).
- Rename the files from `math-kart-` to `math-rally-` as the first Construction step.
- The owner names the reference Android phone model (Q28).
- Fix the two review NITs (the `INIT_INVALID` message rule; the same-origin filter and the MR4 false-positive check).
- Resolve U1 to U21 in MR1, MR4 and MR5 as assigned (Phaser 4 version, size, APIs and literals; WebView plugin features and composition mode; iOS loader status; CSP behaviour; U13 Flutter on this Windows machine; U14 prod tables).
- Find out whether Vercel builds production on a merge to `main` (open item O2 from Quest Map).
- Stated limit: a game page that hangs without an error is not detected; on iPhone the player must close the app (R19 residual, owner-visible in MK-14).
- Pre-existing debt left unchanged: the CSP is Report-Only on web, and the handler's error log line carries `username` (SECURITY-03).
- Pre-launch checks PL1 to PL8: gate on the full game, credits and IP review, trademark search, owner playtest with a child, paid-switch checklist, prod table verify script, embed `--check-only`, protocol v1 frozen.
- Backlog: a Quest Map node, which needs the quest validator to honour the Easy-only exception after a paid switch; gamepad; more tracks.

## What the Game Will Look and Feel Like (from `math-rally-concept.md`)

1. Benji's cartoon kart, seen from behind, drives by itself down a bright countryside road under a blue sky, past rounded green hills, trees and fences.
2. A large banner at the top asks a question such as "What is 7 x 8 ?".
3. Ahead, the road splits into 2, 3 or 4 real branches with grass between them, and each branch has a white sign with one answer.
4. The player steers into a lane with the arrow keys, A/D or a wide joystick at the bottom of the phone screen; one push moves one lane.
5. The lane the kart is in when it crosses a dashed decision line is the answer. Chips near the kart repeat the answers in large text and mark the current lane.
6. A right answer gives a check mark, "Great!", a chime, a coin and a short boost with flame puffs.
7. A wrong answer gives a red cross, "Almost!" with the correct result, a soft buzz and a short bumpy slowdown. There is no spin-out and no lives, and the final score drops.
8. A top bar shows the pause button, the fork count (for example 3/12), coins and race time. The pause screen is opaque and hides the question.
9. After 10 to 15 forks the kart passes a striped finish arch with a confetti burst, then the result screen shows the score breakdown.
10. The art is flat, toy-like and original, with no Nintendo look-alikes. Reduced motion removes shake and flashing, and feedback never relies on colour alone.
