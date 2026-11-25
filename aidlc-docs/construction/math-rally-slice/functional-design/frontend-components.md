# MR1 Vertical Slice - Frontend Components

All under `apps/web/src/`; dev and gate builds only.

## 1. Component tree

```text
App.tsx (dev-only lazy route /dev/math-rally-slice)
  MathRallySlicePage            pages/dev/MathRallySlicePage.tsx
    SliceControls               race picker (easy, hard), touch toggle, start button
    GameMount                   div that hosts the Phaser canvas
      MathRallyEngine (G1)      games/math-rally/MathRallyEngine.ts
        BootScene               assets, built-in texture check, ready
        RaceScene (G3)          road, fork, kart, signs, lane chips
        HudScene (G9)           banner, fork k/N, coins, time, pause button, joystick
    FrameOverlay (G17)          frame stats, device label, CSV export, Fault trigger
    SliceResultPanel            correct count, time, frame summary
    SliceErrorPanel             error message and "Back" button
```

## 2. Page state

| State | Shown | Next |
|---|---|---|
| `idle` | Controls | `starting` on start |
| `starting` | Mount, "Loading..." | `running` on `ready`; `error` on an error or after 20 s |
| `running` | Race, HUD, overlay | `paused`, `finished`, `error` |
| `paused` | Opaque pause screen (hides question, signs and chips) | `running` |
| `finished` | Result panel | `idle` |
| `error` | Error panel with the message for the phase (`business-rules.md` Section 4) | `idle` on "Back" |

`?mount=0` stays in `idle` without mounting (CSP baseline).

## 3. Input

- Keyboard: Left or A, Right or D move one lane; P or Escape pause.
- Joystick: horizontal, bottom of the screen, visible when `touchUi` is true or after the first touch (`joystickVisible`), configuration in `business-logic-model.md` Section 6.
- Fault trigger: F8 on desktop, an overlay button on a phone; throws inside a tween callback. Dev and gate builds only.

## 4. Test ids

| Element | `data-testid` |
|---|---|
| Race picker | `mr-slice-race-select` |
| Touch toggle | `mr-slice-touch-toggle` |
| Start button | `mr-slice-start-button` |
| Game mount | `mr-slice-game-mount` |
| Pause button (HUD, DOM overlay) | `mr-slice-pause-button` |
| CSV export | `mr-slice-export-csv-button` |
| Fault trigger | `mr-slice-fault-button` |
| Result panel | `mr-slice-result-panel` |
| Error panel and its button | `mr-slice-error-panel`, `mr-slice-error-back-button` |

The HUD inside the canvas has no DOM; its screen-reader live region (FR-MK accessibility) is a DOM element with `data-testid="mr-slice-live-region"`.

## 5. API integration

None. The slice host never calls the Game Service; the race comes from the fixtures.
