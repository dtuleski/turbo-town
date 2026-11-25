# MR1 Vertical Slice - Business Logic Model

Owner answers: Q2 to Q8 recommended options (A) in `construction/plans/math-rally-slice-functional-design-plan.md`; Q1 (reference Android phone) is open and only blocks the gate (MR1 step 9).

## 1. Build order (owner answer Q3)

MR2's track constants, layout and motion maths are written first in `packages/shared/src/math-rally/`. The slice imports them through a funnel module (`apps/web/src/games/math-rally/core/shared.ts`, re-exporting from `packages/shared/src/math-rally`, the same pattern as `apps/web/src/utils/questShared.ts`). There is no `core/motion.ts` copy to move later. The slice's questions still come from two static fixture races, so MR1 does not depend on the MR2 generator.

## 2. Slice race flow

```text
mount (route /dev/math-rally-slice?race=easy|hard[&mount=0][&touch=1])
  -> violation recorder registered (G17), then fatal-error guard installed (G1)
  -> BootScene: load assets, check built-in textures -> ready
  -> slice host sends init (fixture race, touchUi from ?touch=1 or first touch)
  -> countdown 3-2-1-Go (race clock starts at Go)
  -> per fork: question banner + signs + lane chips -> decision line -> outcome feedback -> merge
  -> finish line -> slice result panel (correct count, time, frame summary)
```

The slice host is a small React page that plays the host's part: it sends `init`, answers `pauseChanged`, and shows the result or the error message. It never calls the API.

## 3. Track and speed constants

The slice uses protocol v1 from MR2 unchanged (`domain-entities.md` of MR2, Section 3.3): cruise 3000 units/s, boost 3750, slowdown 1800, acceleration 1500, approach per difficulty (Easy 30 000, Hard 22 600), branch 4000, merge 2000, finish 9000.

## 4. Fork geometry (real branches, inception Q5 A)

- Before the decision line the road has `paths` lanes. It widens from one lane's width to `paths x laneWidth` over the first 1000 units after `questionStart`, then stays at that width until the decision line.
- The dashed decision line is drawn across the full width.
- At the decision line the road splits into `paths` branches. `branchOffset(d, i, paths) = (i - (paths - 1) / 2) x branchSpacing x sin(pi x d / (branchLength + gapLength))`, where d is the distance past the decision line, so the offset is 0 at the split and at the merge. `branchSpacing = 1.6 x laneWidth`, which leaves a strip of grass between branches at the widest point.
- One answer sign per branch stands 400 units past the decision line. After the decision, the correct branch's sign shows a check mark until the merge (keeps the correct answer visible at least 1.5 s after a wrong pick).
- The kart follows its branch's offset; the camera follows the kart.

## 5. Quality profile rule (owner answer Q4, within the design's two profiles)

The design defines two profiles, `high` and `low` (`chooseProfile` in the methods file), so the recommended "step down" rule becomes one step:

- A race starts on `high`, or on `low` if this device chose `low` before (stored under the key `mathRally.quality` in `localStorage`; ignored if storage is unavailable).
- From "Go", frame times are collected. When there are at least 120 samples (about 2 s at 60 fps) and their median is above 20 ms, the profile switches to `low` for the rest of the race and is stored.
- It never switches back to `high` during a race.

| Setting | `high` | `low` |
|---|---|---|
| Draw distance | 300 segments | 150 segments |
| Render scale | 1.0 | 0.75 |
| Roadside sprites | every segment | every second segment |
| Hills parallax layers | 3 | 1 |
| Boost and bump particles | on | off |

## 6. Joystick (G8)

`thresholdRatio 0.35`, `repeatDelayMs 400`, `repeatIntervalMs 250` (the values the design gave as examples). One push past the threshold moves one lane; holding repeats after the delay.

## 7. Fatal-error guard and messages (owner answers Q6, Q7)

- Messages follow `business-rules.md` Section 4: before `ready` "The race could not load."; `INIT_INVALID` "Could not start the race."; from the countdown on "The race stopped unexpectedly." This is the single rule for every host; the methods mapping and R-D9 now carry the `INIT_INVALID` exception.
- Web filter: the guard reacts to an `error` event only when its source file is on the page's own origin, and to an `unhandledrejection` only when the game core is mounted. Other errors are recorded by the dev violation recorder and ignored. On the app page every source is the app-internal origin, so nothing is filtered there. MR4 adds a false-positive check with an error thrown from a script on another origin.
