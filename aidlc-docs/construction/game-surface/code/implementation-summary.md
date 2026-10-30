# Game Surface — Implementation Summary

**Unit**: U3 "Game Surface" · **Package**: `apps/web` · **HEAD**: `a328c74`, nothing committed

---

## 1. What was built

| Component | Delivered |
|---|---|
| **C1** renderer | `drawScene` paints the grid, connections, element glyphs, selection affordances, and the fuse badge. Energized items are separated from de-energized ones by four non-colour channels. Load brightness is read from the engine's `intensity` through one documented mapping, `loadGlow`. No text is drawn on the canvas, so nothing on it needs translating. |
| **C2** controller | Hit-testing with a fixed priority order, pointer drag, touch drag, tap-then-tap, snap-to-grid, overlap refusal, and a keyboard model. Pointer and keyboard share **one** `SelectionState` and emit from **one** `InteractionIntent` union through **one** mapper. |
| **C3** effects | `CircuitEffects` on a second canvas: a 240-particle pre-allocated pool, spark bursts, fuse pop, celebration, and a reduced-motion flag that substitutes a static mark rather than dropping the effect. Clock-free and DOM-free, so it is unit-testable. |
| **C4** tray | Eight component kinds from `selectTrayItems`, with per-kind allowance and remaining count, HTML5 drag, touch drag, and click or Enter arming. Every string is a locale key. |
| **C5** state | A twelve-action reducer with per-action validation producing stable rejection codes, plus `selectSubmissionPayload`, `selectTrayItems`, `selectRemainingBudget`, and `selectElementAt`. No React import. |
| **D2** wrapper | The only module naming `packages/shared`. Re-exports the engine surface this unit uses and adds `hashCircuitState`, `evaluateMemoized` with a 32-entry insertion-ordered cache, `clearEngineMemo`, and `engineMemoSize`. |

---

## 2. File inventory

| File | Lines | Component |
|---|---|---|
| `apps/web/src/utils/circuitEngine.ts` | 242 | D2 |
| `apps/web/src/utils/circuitBuilderGeometry.ts` | 248 | C1 and C2 shared |
| `apps/web/src/utils/circuitBuilderState.ts` | 516 | C5 |
| `apps/web/src/utils/circuitBuilderInteraction.ts` | 449 | C2 |
| `apps/web/src/utils/circuitBuilderRenderer.ts` | 518 | C1 |
| `apps/web/src/utils/circuitBuilderEffects.ts` | 267 | C3 |
| `apps/web/src/utils/__tests__/circuitEngine.test.ts` | 263 | tests |
| `apps/web/src/utils/__tests__/circuitBuilderGeometry.test.ts` | 190 | tests |
| `apps/web/src/utils/__tests__/circuitBuilderState.test.ts` | 727 | tests |
| `apps/web/src/utils/__tests__/circuitBuilderInteraction.test.ts` | 466 | tests |
| `apps/web/src/utils/__tests__/circuitBuilderEffects.test.ts` | 141 | tests |
| `apps/web/src/pages/circuit-builder/GridCanvas.tsx` | 201 | C1 host |
| `apps/web/src/pages/circuit-builder/EffectsCanvas.tsx` | 126 | C3 host |
| `apps/web/src/pages/circuit-builder/ComponentTray.tsx` | 91 | C4 |
| `apps/web/src/pages/circuit-builder/CircuitBuilderSurface.tsx` | 341 | composition |
| `apps/web/src/pages/circuit-builder/index.ts` | 2 | barrel |
| **Total new** | **4 788** | |

**Modified**: `apps/web/src/locales/en.json`, one additive `circuitBuilder` block, **52 insertions
and 0 deletions**. No existing key was touched.

**Not touched by this unit**: `packages/shared/**`, `services/**`, `infrastructure/**`,
`.github/**`, `aidlc-docs/aidlc-state.md`, `aidlc-docs/audit.md`, `apps/web/package.json`,
`apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/vercel.json`,
`apps/web/src/main.tsx`, `apps/web/SECURITY-HEADERS.md`, `apps/web/src/locales/es.json`,
`apps/web/src/locales/pt.json`, `.gitignore`. `apps/web/src/App.tsx` is byte-identical to `HEAD` —
see section 6 for the temporary route used to prove the bundle, and the proof it was reverted.

---

## 3. Test coverage

116 new cases across five files, all DOM-free and React-free, which is what "the reducer unit-tested
without rendering React" and "no browser test tooling" require.

| Suite | Cases | Covers |
|---|---|---|
| `circuitBuilderState.test.ts` | 49 | all twelve actions, every one of the thirteen rejection codes, overlap refusal, over-budget refusal, the element and connection ceilings, reference stability, order-stable payloads, and four end-to-end checks against the real engine |
| `circuitBuilderInteraction.test.ts` | 24 | pointer-keyboard equivalence for three scenarios, tap-then-tap, the drag-versus-tap threshold, connection start, completion, and abandonment, cursor clamping, and fail-closed mapping |
| `circuitBuilderGeometry.test.ts` | 20 | viewport squareness and centring at both grid extremes, cell round-trip for all 48 cells of an 8 by 6 grid, off-grid rejection on all four edges, CSS-scale inversion, terminal anchors for all four rotations, segment distance, and hit priority |
| `circuitEngine.test.ts` | 12 | order independence, per-field hash sensitivity, negative zero, separator forging, reference identity on a hit, eviction at capacity, refresh-on-hit, error caching, and code-unit ordering |
| `circuitBuilderEffects.test.ts` | 11 | pool bounds over 40 bursts, retirement, reduced-motion substitution, mark expiry, and `loadGlow` monotonicity and range |

### Story and requirement mapping

| Story or requirement | Covered by |
|---|---|
| CB-2.1 snap to cell, no overlap | `place` cases; `CELL_OCCUPIED`; hit-priority tests; the drag and tap-then-tap interaction cases. Browser drag itself is manual. |
| CB-2.2 connect two terminals, refuse an invalid target | connection cases; `SELF_CONNECTION`; `DUPLICATE_CONNECTION`; the abandoned-gesture case |
| CB-2.3 remove a component or a connection | the `remove` and `disconnect` cases, including cascade and the components-remain assertion |
| CB-2.4 toggle a switch during simulation | `toggleSwitch` cases plus the end-to-end "opening a switch de-energizes the whole series chain" |
| CB-2.5 adjust voltage within a safe range | the snap, clamp, and non-finite cases |
| CB-2.6 energized paths glow, distinguishable without colour | `loadGlow` range and monotonicity. The visual channels themselves are manual. |
| FR-CB-13 brightness proportional to current | the end-to-end case asserting `intensity > 0` from the engine, plus `loadGlow` |
| FR-CB-17 spark at the fault position | the end-to-end short case asserting `fault.atPosition` is populated |
| NFR-CB-5 keyboard equivalence | the three equivalence cases |
| NFR-CB-7 reduced motion substitutes | the static-mark cases |

---

## 4. The three decisions this unit owned

### (a) Memo policy

**32 entries, keyed on the full canonical state string, insertion-ordered with refresh-on-hit.**

The key is not a numeric digest. A digest collision would return a different circuit's result —
a plausible-looking wrong answer with no error signal and no detection path. Realistic keys are 2 to
4 kB, so 32 entries is roughly 128 kB. 32 covers the oscillation real play produces: toggle a switch
and back, drag an element and return, nudge the voltage up and down. A `Map` already preserves
insertion order, so least-recently-used behaviour costs no second data structure.

### (b) Energized-trace treatment

**Four non-colour channels plus colour:** stroke width 1.6 times wider, marching dashes against
solid, a 14-pixel glow, and a filled halo against a hollow ring on loads. One redundant channel
would meet CB-2.6's letter; four means the distinction survives monochrome, low contrast, and any
colour-vision deficiency. Under reduced motion the dashes freeze and static chevrons carry the
direction information instead, so the channel is substituted rather than dropped.

### (c) Brightness mapping

**`coreAlpha = 0.35 + 0.65i`, `glowAlpha = 0.25 + 0.75i`, `glowRadiusRatio = 0.18 + 0.42i`**, from
the engine's own `ElementResult.intensity`, and **only for `led`, `motor`, and `buzzer`**.

Those are the three kinds that declare a `ratedCurrent`; the engine deliberately reports
`intensity: 0` for every other kind. Ramping an unrated kind from zero would render every resistor
permanently dark, and faking a ramp would be exactly the hard-coding the brief forbids. Each of the
three expresses the same scalar differently — halo radius, rotor speed, ring count — so the
series-versus-parallel difference is perceivable on any of them.

---

## 5. Deviations from the approved design

Full reasoning in `../functional-design/functional-design.md` section 9. In brief: a twelfth
reducer action `faultsEvaluated`, because nothing in the approved eleven could set `fuseBlown`;
`level` held in state, because the reducer is pure and `reset` needs it; `selectSubmissionPayload`
returning the full submission draft rather than a bare layout, because the brief asks for what the
backend will actually receive; `HitTarget` carrying the cell and element kind, so the pointer
resolver can stay pure; two added intents for drag and selection; no rotate action; and one added
`setGridSize` method on `CircuitEffects`.

---

## 6. Verification evidence

Every figure below was produced by a command actually run. Full output is in
`.agents/tasks/u3/verification.md`.

### Gate 1 — type-check

```text
$ npm run type-check
> tsc --noEmit
exit=0
```

### Gate 2 — build

```text
$ npm run build
> tsc && vite build
✓ 1504 modules transformed.
dist/index.html                     0.91 kB │ gzip:   0.48 kB
dist/assets/index-DhZsQfES.css     93.13 kB │ gzip:  14.03 kB
dist/assets/index-DudEcAGt.js   1,580.51 kB │ gzip: 448.89 kB
✓ built in 7.09s
exit=0
```

The chunk-size and browserslist warnings are pre-existing and unchanged.

**Stated plainly: this build does not contain the new code.** Nothing imports
`pages/circuit-builder`, because no route exists, so vite tree-shakes all sixteen new modules out of
the graph. The module count is identical to the pre-U3 figure. `tsc` does type-check them, since
`tsconfig.json` includes all of `src`, but a passing `vite build` on its own proves only that the new
files did not break the existing bundle.

To close that gap, the route from section 7 was added to `App.tsx` **temporarily**, the build was run
again, and `App.tsx` was then reverted:

```text
$ npm run build          # with the temporary /circuit-builder-dev route
✓ 1529 modules transformed.
✓ built in 7.08s
exit=0

$ git diff --stat -- apps/web/src/App.tsx
(no output)
$ git status --short -- apps/web/src/App.tsx
(no output)
```

1529 against 1504 is 25 added modules: the six utility modules, the four components, the barrel, and
the engine source files the relative import pulls in. This is the evidence that the relative engine
import of decision D1 resolves and bundles in a **production** build, not merely under `tsc` and
Vitest. `App.tsx` is byte-identical to `HEAD` afterwards; only its filesystem timestamp changed,
which git does not track.

### Gate 3 — tests

```text
baseline, before any U3 file existed:
$ npx vitest run src/utils
 Test Files  12 passed (12)
      Tests  220 passed (220)

after U3:
$ npx vitest run src/utils
 Test Files  17 passed (17)
      Tests  336 passed (336)
   Duration  1.86s
exit=0
```

336 minus 220 is the 116 new cases. All 220 pre-existing cases still pass.

### Gate 4 — lint, new files only

```text
$ npx eslint src/utils/circuitEngine.ts src/utils/circuitBuilderGeometry.ts \
    src/utils/circuitBuilderState.ts src/utils/circuitBuilderInteraction.ts \
    src/utils/circuitBuilderRenderer.ts src/utils/circuitBuilderEffects.ts \
    src/utils/__tests__/circuitEngine.test.ts src/utils/__tests__/circuitBuilderGeometry.test.ts \
    src/utils/__tests__/circuitBuilderState.test.ts src/utils/__tests__/circuitBuilderInteraction.test.ts \
    src/utils/__tests__/circuitBuilderEffects.test.ts src/pages/circuit-builder \
    --ext ts,tsx --report-unused-disable-directives --max-warnings 0
exit=0
```

Zero output, zero warnings, with unused-disable reporting on. The package-wide `npm run lint` still
fails with the 89 errors and 25 warnings that pre-exist in untouched files; those were not touched
and are not this unit's to fix. Exactly one `eslint-disable-next-line
react-hooks/exhaustive-deps` was added, on the spark-emission effect whose dependency array is
intentionally the fault signature; `--report-unused-disable-directives` proves it is necessary.

### Gate 5 — scope

New entries introduced by this unit, and nothing else:

```text
 M apps/web/src/locales/en.json
?? apps/web/src/pages/circuit-builder/          (5 files)
?? apps/web/src/utils/circuitEngine.ts
?? apps/web/src/utils/circuitBuilderGeometry.ts
?? apps/web/src/utils/circuitBuilderState.ts
?? apps/web/src/utils/circuitBuilderInteraction.ts
?? apps/web/src/utils/circuitBuilderRenderer.ts
?? apps/web/src/utils/circuitBuilderEffects.ts
?? apps/web/src/utils/__tests__/circuit*.test.ts (5 files)
?? .agents/tasks/u3/                             (plan.md, verification.md)
?? aidlc-docs/construction/game-surface/         (4 files)
```

No snapshot entry disappeared. **`services/game/**` entries appeared in `git status` during this
unit's execution and are not ours** — a concurrent unit is writing to the repository. Nothing under
`services/` was read for writing or modified by U3; see `.agents/tasks/u3/verification.md`
section 5 for the attribution evidence.

### Gate 6 — nothing committed, nothing out of bounds

```text
$ git rev-parse HEAD
a328c74d99acdb561961ea36fcaa11426840a530

$ git stash list
(empty)

$ git diff --stat -- packages/shared apps/web/vercel.json apps/web/src/main.tsx \
    apps/web/SECURITY-HEADERS.md apps/web/package.json apps/web/vite.config.ts \
    apps/web/tsconfig.json apps/web/src/App.tsx apps/web/src/locales/es.json \
    apps/web/src/locales/pt.json
 apps/web/src/main.tsx             | 24 ++++++++++++++----------
 apps/web/vercel.json              | 27 +++++++++++++++++++++++++++
 packages/shared/package-lock.json | 24 ++++++++++++++++++++++++
 packages/shared/package.json      |  1 +
 packages/shared/src/index.ts      |  3 +++
 5 files changed, 69 insertions(+), 10 deletions(-)
```

Those five are U1's and U2's pre-existing work, unchanged by this unit and identical to the pre-U3
snapshot. The other five paths show nothing. No commit, push, merge, tag, or deploy. No `npm
install`, no new dependency, no AWS, Vercel, or Stripe call.

---

## 7. Manual verification checklist — RECORDED, NOT EXECUTED

**None of the steps below has been run.** The surface is unreachable in the running application
because `App.tsx` owns the routes and this unit must leave it unmodified. The checklist is written to
be executable the moment a route exists, and it is the only evidence that will ever cover browser
drag, touch, and the visual channels, since none of those can be asserted without a browser.

To run it, temporarily add these two lines to `apps/web/src/App.tsx`:

```tsx
import CircuitBuilderSurface from './pages/circuit-builder'
// ...and inside <Routes>:
<Route path="/circuit-builder-dev" element={<CircuitBuilderSurface />} />
```

then `npm run dev`, visit `/circuit-builder-dev`, and **revert `App.tsx`** afterwards.

| Story | Step | Expected |
|---|---|---|
| CB-2.1 | With a mouse, drag each of the eight tray kinds onto the canvas | each snaps to the cell centre under the pointer |
| CB-2.1 | Drag one kind onto a cell that already holds an element | refused, nothing placed, and the "something is already there" line appears |
| CB-2.1 | On a touch device, drag one kind with one finger | placed on the cell under the finger at touch-end; a release outside the canvas places nothing |
| CB-2.1 | Tap a tray kind, then tap an empty cell | placed, and the tray kind stays armed for a second tap |
| CB-2.1 | Tap a tray kind, then press Escape | the tray button's pressed state clears and the next cell tap places nothing |
| CB-2.2 | Drag from a terminal on one element to a terminal on another, with a mouse and then with touch | a visible connection appears and the circuit re-evaluates immediately |
| CB-2.2 | Press on a terminal and release on empty space | no connection is created and the attempt gives visible feedback |
| CB-2.2 | Press on a terminal and release on that same terminal | no connection is created |
| CB-2.6 | Build battery, resistor, LED in series and wire it closed | the energized path renders as a high-contrast glowing trace with marching dashes, and the LED shows a filled halo |
| CB-2.6 | Open a switch in the chain | the trace de-energizes: thinner, solid, unglowed, and the load shows a hollow ring |
| CB-2.6 | View the same screen in greyscale, via an OS filter or a desaturated screenshot | energized and de-energized remain distinguishable by **width, dash pattern, glow, and load shape** — not colour |
| CB-2.6 | Pass `reducedMotion` and repeat | dashes are frozen, static chevrons appear along live traces, and a short shows a static burst mark instead of particles |
| supporting | Tab to the canvas, then use arrows, Enter, `c`, and Delete | a component can be placed, connected, toggled, and removed with no pointer, and the cursor box follows the keys |
| supporting | Wire a battery straight to itself through a wire | sparks fire, the fuse badge appears, the canvas goes dark, and the reset-fuse button restores it |

---

## 8. Stubbed for later units

| # | Stub | Owner | What is already in place |
|---|---|---|---|
| S1 | **No route.** The surface is unreachable in the running app. | U4 | `pages/circuit-builder/index.ts` exports one symbol; the exact two-line patch is in section 7, and the build evidence in section 6 proves it bundles |
| S2 | **Keyboard model is structural only** — arrows, Enter or space, `c`, Delete, Escape. No focus-ring conventions, no terminal traversal beyond terminals 0 and 1, no screen-reader narration. | U5 | `resolveKeyIntent` is the single extension point and already shares the selection and the intent union with the pointer path, so an addition cannot fork |
| S3 | **`setReducedMotion` is a flag nobody sets.** Defaults to false. | U5, the preferences adapter | the flag is implemented and honoured end to end; `CircuitBuilderSurface` takes it as a prop |
| S4 | **No audio.** | U5, the audio service | `playCelebration` and `playFusePop` exist as visual-only hooks and are safe to call from an audio-aware caller |
| S5 | **English keys only.** `es.json` and `pt.json` carry no `circuitBuilder` block, so those locales fall back to English rather than showing a raw key. | U5 | the complete key list is in `en.json`; no literal string exists in any component |
| S6 | **No level content.** The surface defaults to `getLevel('sandbox')`. No guided levels, no Mars Rover, no success evaluation in the UI. | U4 | `evaluateSuccess` and `getMachine` are re-exported from `circuitEngine.ts` and unused, ready to wire |
| S7 | **No backend call and no submission.** | U4 wiring, U6 server | `selectSubmissionPayload` is implemented and tested, and `onSubmissionReady` fires on every circuit change with the payload minus `gameId` |
| S8 | **No rotate action.** Everything is placed at rotation 0. | a later unit | `terminalAnchor` already handles all four rotations, so adding it is a reducer change with no renderer change |
| S9 | **No mobile full-screen canvas mode**, which NFR-CB-10 permits. | U5 | the canvas already scales responsively inside its container |
| S10 | **No educational fault tooltips.** Only short fault titles exist as keys. | U4 | `Fault.code` is stable and `Fault.atPosition` is populated, so a tooltip keyed by code has everything it needs |

---

## 9. What could not be verified without a browser

Stated plainly, because the test counts above could otherwise be read as covering more than they do.

| Not verified | Why | Consequence |
|---|---|---|
| **Any drawn pixel** | No browser test tooling, by brief constraint. There is no jsdom, no canvas mock, and no snapshot. | The renderer's 518 lines have **no automated coverage** beyond `loadGlow`. A geometry or draw-order mistake would not fail a test. |
| **Mouse drag, touch drag, HTML5 drag-and-drop** | Needs real pointer and touch events against a laid-out element. | The *resolvers* are fully tested as pure functions; the *plumbing* from a browser event to those resolvers is not. |
| **The four non-colour channels actually being distinguishable** | A perceptual property. It needs a human with a greyscale filter. | CB-2.6's manual criterion is unmet until the checklist is run. |
| **Keyboard interaction in a browser** | Needs focus and real key events. | `resolveKeyIntent` is tested; `onKeyDown` wiring, `preventDefault` behaviour, and focus order are not. |
| **Frame timing against the 16.7 ms budget** | Needs a browser profiler. | The budget in `../nfr-requirements/nfr-requirements.md` is an argued allocation, not a measurement. |
| **Animation loop and cleanup behaviour at runtime** | Needs `requestAnimationFrame` and a real mount and unmount. | The cleanup code is written and reviewed; it has not been observed releasing a frame. |
| **The responsive layout on a phone** | Needs a device or an emulator. | NFR-CB-10 is partially met by construction only. |
| **Anything in section 7** | No route exists. | The checklist is recorded, not executed. |

---

## 10. Residual risk

| # | Risk |
|---|---|
| R1 | 🚨 **BLOCKING DEPLOYMENT RISK — DO NOT DEPLOY THE FRONTEND UNTIL RESOLVED.** *(Corrected by the orchestrator. The original R1 understated this and cited the local production bundle as evidence of deployability; it is not.)* The relative engine import reaches **outside** `apps/web` and resolves locally only because a dev machine holds the whole monorepo. Production probably does not: the deploy procedure runs `vercel --prod` **from `apps/web/`**, uploading only that directory; there is no root `vercel.json`, `.vercelignore`, `turbo.json`, or npm `workspaces` field; and `vercel.json` sets `buildCommand`, so Vercel builds from source. `packages/shared` is therefore very likely **absent from the Vercel build context**, meaning this import fails there while passing every local gate. The section 6 bundle test proves only that the path resolves *when the monorepo is present* — it does **not** prove deployability. The real risk is not "a future config change"; it is that the current deployment model cannot see the package at all. Resolution is an **infrastructure decision for the owner**, not a code change: configure Vercel as a monorepo build with root directory `apps/web`; publish `packages/shared` to a registry; or add a build-time staging step. **Adding `"file:../../packages/shared"` to `package.json` does NOT fix this** — the directory is still missing from the build context and `npm install` would fail. Vendoring a copy is rejected: browser and server must run identical code (FR-CB-16) or they can disagree about whether a circuit is valid. Containment holds: `circuitEngine.ts` is the single switch point, so the fix is a one-file edit. |
| R1b | **Compiler-option divergence** (the original R1's secondary point, which stands): `apps/web` now type-checks `packages/shared/src/circuit/*.ts` under its own looser options, so the engine is validated twice under different settings. |
| R2 | **Drag, touch, and all drawing have no automated coverage, by design.** Section 9 lists this in full. The manual checklist is the only evidence and it cannot be executed until S1 is done. |
| R3 | **A wire's energization is a component-level property, not a per-wire current.** Two parallel wires both read energized even though the current split between them is undetermined. This is correct under the engine's model and is why no current reading is ever drawn on a wire. |
| R4 | **No `devicePixelRatio` scaling**, following the existing canvas games. Glow and fine strokes will look slightly soft on HiDPI screens. Fixing it touches every coordinate path and is better done once for all the canvas games. |
| R5 | **`en.json` is a shared file.** U5 also edits the locale files. The edit here is strictly additive and in one contiguous block, so a merge is trivial, but it is not conflict-free by construction. |
| R6 | **A reversed LED reports a non-zero negative current with `energized: false`.** Every visual is gated on `energized` and `intensity`, never on `current`, so a backwards LED renders dark. A future renderer change that read `current` would silently reintroduce this. |
| R7 | **`onSubmissionReady` fires on every circuit change**, not on an explicit submit. Nothing consumes it yet. U4 should debounce or switch to an explicit trigger rather than treating each call as a submission. |
| R8 | **The grid canvas redraws in full.** Section 2 of the NFR design argues why, and the ~576-primitive worst case fits the 8 ms budget on paper. If a very low-end device misses the budget, the first lever is the glow radius, not the redraw strategy. |

### Suspected engine issue — reported, not fixed

`packages/shared` is off limits to this unit, so this is recorded only.

U2's review raised a candidate: a short-circuit path through a **second** source costs only that
source's internal resistance, which for a battery is 0.5 Ω and below the 1.0 Ω threshold, so two
batteries on common rails might both report `SHORT_CIRCUIT`.

**This unit found the engine already guards against it.** `faults.ts` excludes *every* source from
the short-circuit path search, not just the source under test, with that exact rationale in a
comment, and backs it with a second solved-circuit test. The end-to-end reducer tests in
`circuitBuilderState.test.ts` surfaced no unexpected engine behaviour: a battery, resistor, and LED
in series reports a closed path, a positive LED intensity, and zero faults; a battery shorted by a
wire reports `SHORT_CIRCUIT` with a populated `atPosition`; and opening a switch de-energizes every
element in the chain. **No engine defect is being reported, and `packages/shared` was not modified.**

---

## 11. Security baseline compliance

| Rule | Status | Evidence |
|---|---|---|
| SECURITY-09 | **Compliant** | Rejections and faults are stable codes resolved through locale keys. No engine `detail` string, no `errorCode`, no issue list, and no stack trace is ever rendered; an evaluation error shows one generic localized line. The grep in the verification record confirms no `console.*` call exists in any new file, so nothing is logged either. |
| SECURITY-15 | **Compliant** | `evaluateMemoized` wraps its body and returns a typed `INTERNAL_ERROR` carrying no message. `pointToCell` returns `null` off-grid rather than clamping; `clientToCanvasPoint` returns an off-grid point for an unmeasured element rather than dividing by zero. Both canvas hosts return quietly on a null element or null 2D context and leave no loop running. `intentToAction` returns `null` rather than a stale action. Both loops cancel their frames and the particle pool is cleared on unmount. No promise is created anywhere in the unit, verified by grep, so no rejection can go unhandled. |
| SECURITY-05 | **Partially applicable, compliant** | No API endpoint exists in a browser surface, but every action is bounds-checked against the engine's published ceilings — element count, connection count, grid bounds, voltage range, light range — before anything can reach the engine. |
| SECURITY-11 | **Partially applicable, compliant** | Separation of concerns is structural: the renderer, the controller, and the state machine are in separate framework-free modules and cannot reach one another. Rate limiting does not apply to a local canvas. |
| SECURITY-03 | **N/A** | No logging framework and no log sink in this unit; it emits no log line, so no sensitive value can reach one. |
| SECURITY-10 | **N/A** | No dependency added, no lock file changed, no `npm install` run. |
| SECURITY-01, 02, 04, 06, 07, 08, 12, 13, 14 | **N/A** | No data store, network intermediary, response header, IAM policy, network configuration, endpoint authorization, authentication, deserialization of untrusted input, or alarm configuration is created or changed by this unit. |

No blocking security finding.
