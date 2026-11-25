# MR1 Vertical Slice - Domain Entities

## 1. Fixture races

Two files in `apps/web/src/games/math-rally/__fixtures__/`: `slice-easy.json` (difficulty 1, 2 paths, 10 forks) and `slice-hard.json` (difficulty 3, 4 paths, 15 forks). Each is a `MathRallyRacePayload` (MR2 shape) with `protocolVersion: 1`, written by hand with canonical options and a `correctIndex` per fork. A unit test checks each fixture against the payload rules (options canonical and distinct by value, one correct option at `correctIndex`).

## 2. Quality profile

`QualityProfile = 'high' | 'low'` with the settings table of `business-logic-model.md` Section 5. Stored choice: `localStorage['mathRally.quality']` = `'low'` or absent.

## 3. Frame sample and CSV export (G17)

One row per running frame:

| Column | Type | Meaning |
|---|---|---|
| `frame` | integer | Frame index from "Go" |
| `clockMs` | integer | Race clock reading |
| `dtMs` | integer | Clock difference to the previous running frame (before the 50 ms clamp) |
| `profile` | `high` / `low` | Active profile |
| `fork` | integer | Current fork (0-based), or -1 after the finish |
| `event` | string | `decision`, `merge`, `finish`, `profileLow` or empty |

Summary at the end of the CSV: device label (typed into the overlay), composition mode (Android), run number, median fps, 1% low fps, frame count, guard reports.

## 4. Violation record (G17)

| Field | Meaning |
|---|---|
| `directive` | CSP directive violated |
| `blockedScheme` | Scheme of the blocked URL (`data`, `blob`, `https`, ...) |
| `blockedOrigin` | Origin of the blocked URL |
| `sourceFile` | Path of the file that made the request |
| `phase` | `baseline` (`?mount=0`) or `race` |

## 5. Gate report

`aidlc-docs/construction/math-rally-slice/gate-report.md`, with the fields listed in the unit's completion criteria: per-device median fps, 1% low, input latency, Android composition mode per run and the chosen one, chunk size, loader statuses, CSP violations and `data:` URLs (host shell's expected ones listed apart), the missing `sys/white.png` result, the confirmed Phaser literals, every guard report, and the findings for U1, U3 to U7, U16, U18 to U21.
