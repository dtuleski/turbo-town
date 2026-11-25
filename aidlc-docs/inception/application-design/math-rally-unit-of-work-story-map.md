# Math Rally - Unit of Work to Story Map

**Created**: 2026-11-25
**Stage**: INCEPTION - Units Generation
**Basis**: `../user-stories/math-rally-stories.md` (MK-1 to MK-28), `math-rally-unit-of-work.md` (MR1 to MR5)
**Revision**: iteration 2: contributing units updated for MK-3 (app ready timeout), MK-13 (protocol versions) and MK-19 (shared motion); no primary unit changed. Iteration 4: contributing units updated for MK-3 (fatal-error guard, race-stopped overlay) and MK-14 (MR1 spike check); no primary unit changed.

Each story has exactly one **primary** unit, which owns its acceptance criteria. Contributing units deliver parts the story needs.

| Story | Title | Priority | Primary unit | Contributing units |
|---|---|---|---|---|
| MK-1 | Find Math Rally in the hub | P0 | MR4 | MR3 (seed), MR5 (app hub) |
| MK-2 | Choose a difficulty and learn the controls | P0 | MR4 | MR5 (app setup) |
| MK-3 | Start a race | P0 | MR4 | MR1 (scene, fatal-error guard, Fault trigger), MR3 (server start), MR5 (app ready timeout, race-stopped overlay) |
| MK-4 | Read the question and the answers on the fork | P0 | MR4 | MR1 (fork rendering), MR2 (reading-window constants) |
| MK-5 | Steer with the keyboard | P0 | MR1 | MR4 (final HUD) |
| MK-6 | Steer with one thumb on the phone | P0 | MR1 | MR5 (WebView touch settings) |
| MK-7 | Get rewarded for a right answer | P0 | MR4 | MR1 (boost) |
| MK-8 | Learn from a wrong answer | P0 | MR4 | MR1 (slowdown), MR3 (score effect) |
| MK-9 | Pause, resume or quit | P0 | MR4 | MR1 (clock), MR5 (app lifecycle) |
| MK-10 | Finish and see my real score | P0 | MR4 | MR3 (re-scoring) |
| MK-11 | Questions match my level | P0 | MR2 | MR4 (prompt text) |
| MK-12 | Wrong signs look like real mistakes | P0 | MR2 | none |
| MK-13 | Play Math Rally inside the DashDen app | P0 | MR5 | MR2 (protocol registry), MR3 (protocol check at start), MR4 (game core) |
| MK-14 | The app behaves when I leave or go back | P0 | MR5 | MR1 (page guard and the race-stopped check in the WebView spike, AC-48.2) |
| MK-15 | Race without a connection (unscored) | P1 | MR5 | MR2 (bundled generator) |
| MK-16 | Calm mode with reduced motion | P0 | MR4 | MR5 (OS flag) |
| MK-17 | Four readable signs on a small phone | P0 | MR4 | MR1 (first check) |
| MK-18 | Sound control and feedback without colour | P0 | MR4 | MR5 (app sound setting) |
| MK-19 | The server decides the score | P0 | MR3 | MR2 (generator, motion and expected times) |
| MK-20 | Safe for kids, free of borrowed IP | P0 | MR4 | MR1 (first manifest), MR3 (no choices stored) |
| MK-21 | The app's web view is locked down | P0 | MR5 | MR1 (spike findings) |
| MK-22 | Math Rally on the leaderboard and in my history | P0 | MR3 | MR4 (web display maps), MR5 (app meta) |
| MK-23 | Every registry knows Math Rally | P0 | MR4 | MR3 (backend registries, scripts), MR5 (app registry) |
| MK-24 | The rest of dashden.app stays light | P0 | MR4 | MR1 (first measurement) |
| MK-25 | Performance gate on real phones | P0 | MR1 | MR4 (desktop re-run), MR5 (WebView re-run) |
| MK-26 | Ready for Quest Map | P1 | MR4 | MR3 (quest hook), MR5 (app quest context) |
| MK-27 | Free now, paid later if the owner decides | P0 and P1 | MR4 | MR3 (cap from paid list), Build and Test (checklist) |
| MK-28 | Easy stays free after a paid switch | P0 | MR3 | MR2 (gate function), MR4 (web presentation), MR5 (app presentation) |

**Counts by primary unit**: MR1 3 (MK-5, MK-6, MK-25); MR2 2 (MK-11, MK-12); MR3 3 (MK-19, MK-22, MK-28); MR4 16 (MK-1 to MK-4, MK-7 to MK-10, MK-16 to MK-18, MK-20, MK-23, MK-24, MK-26, MK-27); MR5 4 (MK-13 to MK-15, MK-21). Total 28: no story is unassigned and none has two primary units. The contributing-unit column matches the story lists in `math-rally-unit-of-work.md`.

**Units with few primary stories**: MR2 carries most of FR-MK-13 to 18 through two stories; MR1 is measured by the gate story; both are deliberate (risk and contract units).
