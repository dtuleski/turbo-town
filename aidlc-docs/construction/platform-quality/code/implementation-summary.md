# Platform Quality — Implementation Summary

**Unit**: U5 "Platform Quality" · **Package**: `apps/web` · **HEAD**: `a328c74`, nothing committed

---

## 1. What was built

| Area | Delivered |
|---|---|
| **Three inherited defects** | The stale `faultSignature` effect key replaced by a monotonic `faultEpoch` plus a position-bearing `selectFaultEffectKey`; the unreachable `SANDBOX_FALLBACK` deleted and the component split into a guard plus a body; the per-render particle pool fixed by extracting `lazyRefValue`. |
| **D1 audio service** | `services/audioService.ts` — a React-free factory with a five-state lifecycle, an injectable `AudioAdapter` and `SoundLoader`, five in-context synthesized cues, and a `useGameAudio` hook that disposes on unmount. The surface unlocks it from **activating input only** — the tray, key events, and the `down` and `up` pointer phases — never from a hover. |
| **D3 presentation preferences** | `services/presentationPreferences.ts` — `prefers-reduced-motion` read and subscribed behind an injectable seam supporting both the modern and the legacy listener API, plus a tolerant `localStorage` sound preference, and a `usePresentationPreferences` hook. |
| **Keyboard completion** | `Shift+Enter` completes a connection on **terminal 1**, closing the one gap that let the keyboard build only a strict subset of the pointer's circuits. `CONSUMED_KEYS` exported from the interaction module; a genuinely visible focus ring; `aria-keyshortcuts`. |
| **Mobile layout** | A `lg:hidden` full-screen toggle and a `fixed inset-0 h-dvh flex-col-reverse` CSS overlay, with 44 px minimums on the fuse-reset, tray, mute and full-screen controls. Desktop markup is unchanged. |
| **Localization** | `es.json` and `pt.json` each gained the complete `circuitBuilder` block — 55 leaf keys, identical to en in both directions — including four educational fault tooltips. `en.json` gained 9 keys and one corrected `canvasHint`. |

---

## 2. File inventory

### New

| File | Lines |
|---|---|
| `apps/web/src/utils/lazyRef.ts` | 20 |
| `apps/web/src/utils/__tests__/lazyRef.test.ts` | 63 |
| `apps/web/src/services/audioService.ts` | 418 |
| `apps/web/src/services/presentationPreferences.ts` | 206 |
| `apps/web/src/services/__tests__/audioService.test.ts` | 649 |
| `apps/web/src/services/__tests__/presentationPreferences.test.ts` | 262 |
| `apps/web/src/hooks/useGameAudio.ts` | 57 |
| `apps/web/src/hooks/usePresentationPreferences.ts` | 40 |
| `apps/web/src/locales/__tests__/localeCompleteness.test.ts` | 113 |
| **Total new** | **1 828** |

`apps/web/src/services/` did not exist before this unit.

### Modified

| File | Lines now | U3 left it at | What changed |
|---|---|---|---|
| `apps/web/src/utils/circuitBuilderState.ts` | 548 | 516 | `faultEpoch` field, `resetFuse` increments it, `selectFaultEffectKey` exported |
| `apps/web/src/utils/circuitBuilderInteraction.ts` | 545 | 449 | `activateAtCursor` takes `shift`; `CONSUMED_KEYS` moved here and exported; `isActivatingPhase` exported (section 12) |
| `apps/web/src/utils/__tests__/circuitBuilderState.test.ts` | 788 | 727 | 3 fuse-reset regression cases |
| `apps/web/src/utils/__tests__/circuitEngine.test.ts` | 278 | 263 | 1 level-registry case proving the removed fallback was dead |
| `apps/web/src/utils/__tests__/circuitBuilderEffects.test.ts` | 202 | 141 | 5 information-preservation cases |
| `apps/web/src/utils/__tests__/circuitBuilderInteraction.test.ts` | 696 | 466 | 7 cases: `Shift+Enter` equivalence, `CONSUMED_KEYS`, a full Easy level by keyboard |
| `apps/web/src/pages/circuit-builder/CircuitBuilderSurface.tsx` | 502 | 341 | guard/body split, `faultEffectKey`, audio and preferences wiring (unlock on activating phases only), mute toggle, fault help line, full-screen mode |
| `apps/web/src/pages/circuit-builder/GridCanvas.tsx` | 204 | 201 | imports `CONSUMED_KEYS`, forwarded `canvasRef`, `aria-keyshortcuts`, real focus ring |
| `apps/web/src/pages/circuit-builder/EffectsCanvas.tsx` | 135 | 126 | `lazyRefValue` accessor replacing `useRef(new CircuitEffects())` |
| `apps/web/src/pages/circuit-builder/ComponentTray.tsx` | 97 | 91 | `min-h-[44px]` on buttons, optional `className` |
| `apps/web/src/config/constants.ts` | 93 | — | one additive line, `SOUND_ENABLED: 'sound_enabled'` |
| `apps/web/src/locales/en.json` | — | — | 9 new keys, 1 corrected value, all inside the existing contiguous block |
| `apps/web/src/locales/es.json` | — | — | one contiguous 67-line insert, **67 insertions and 0 deletions** |
| `apps/web/src/locales/pt.json` | — | — | one contiguous 67-line insert, **67 insertions and 0 deletions** |

`git diff --numstat -- apps/web` confirms the locale inserts are insertion-only and that
`constants.ts` is `1 0`.

### Not touched by this unit

`packages/shared/**`, `services/**`, `infrastructure/**`, `.github/**`,
`aidlc-docs/aidlc-state.md`, `aidlc-docs/audit.md`, `apps/web/package.json`,
`apps/web/package-lock.json`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`,
`apps/web/vercel.json`, `apps/web/src/main.tsx`, `apps/web/SECURITY-HEADERS.md`,
`apps/web/src/App.tsx`, `apps/web/src/components/layout/AppLayout.tsx`. The
`BLOCKING DEPLOYMENT RISK` comment block at the top of `apps/web/src/utils/circuitEngine.ts` is
intact and byte-identical; that file was never opened for writing.

---

## 3. Test results, measured in this step

Baseline before this unit: **17 test files, 336 tests**, which is exactly the figure U3 recorded, so
the tree started in U3's reviewed state.

```text
$ cd apps/web; npx vitest run
 RUN  v4.1.4 C:/Users/diego.tuleski/Documents/kiro/turbo-town/apps/web
 Test Files  21 passed (21)
      Tests  411 passed (411)
   Duration  3.38s
exit=0
```

```text
$ cd apps/web; npx tsc --noEmit
exit=0
```

Both commands were run during this documentation feature, and the figures above are their actual
output, not a number carried over from the plan.

**21 files, 411 tests, 0 failures: +4 files and +75 tests over the 336 baseline, with all 336
pre-existing tests still passing.** The last 4 were added in the review-fix iteration (section 12).
Where the 75 came from — every figure below is the runner's own count for that file, which corrected
two numbers the per-feature notes had carried (`presentationPreferences` is 22, not 23;
`audioService` was 17 before the fix iteration, not 16):

| Suite | Cases added | What they cover |
|---|---|---|
| `src/utils/__tests__/circuitBuilderState.test.ts` | +3 (49 → 52) | a real engine short; re-blow on a repeated report with the fault count going to 2; `selectFaultEffectKey` differing across a reset; position sensitivity; a no-op reset not bumping the epoch |
| `src/utils/__tests__/lazyRef.test.ts` | 3 (new file) | 100 calls, one construction, same instance; a pre-filled cell never calls the factory; a falsy-but-valid value is still cached once |
| `src/utils/__tests__/circuitEngine.test.ts` | +1 (12 → 13) | `getLevel('sandbox')` and `getLevel('cb-01-closed-circuit')` are defined, `listLevels()` contains both, an unknown id is `undefined` |
| `src/services/__tests__/presentationPreferences.test.ts` | 22 (new file) | absent / true / change / unsubscribe / throwing `matchMedia`; legacy `addListener` attach and teardown; storage absent, `"false"`, `false`, garbage, empty, throwing getter; and the propagation case driving a real `CircuitEffects` |
| `src/services/__tests__/audioService.test.ts` | 21 (new file; 17 + 4 in the fix iteration) | muted creates zero sources; `createContext` null and throwing; a per-cue loader rejection; play before unlock creates no context; a rejecting `resume()` and a rejecting `close()` with `unhandledRejection` probes; dispose releases and silences; `play` never throws in all five states; the preference re-read; every buffer at or under one second. The 4 added later are the hover-unlock guard: `isActivatingPhase` classifies the four phases; the full hover sequence `move,move,move,cancel` creates **no** context at all; the one unlock survives any amount of hovering and still arrives on the first press, reaching `ready` and playing; and on a gesture-strict context whose `resume()` rejects without activation the filtered wiring reaches `ready` while the **counterfactual** unfiltered unlock latches `unsupported` and cannot recover |
| `src/utils/__tests__/circuitBuilderEffects.test.ts` | +5 (11 → 16) | the spark mark carries the fault's own `cell`; fuse and celebration marks at their positions; mark expiry; enabling reduced motion mid-flight retires live particles |
| `src/utils/__tests__/circuitBuilderInteraction.test.ts` | +7 (24 → 31) | `Shift+Enter` ≡ a pointer release on terminal 1 down to the identical `connect` action; both terminals from one pending selection; `Shift+Enter` with nothing pending is never a half-formed action; `CONSUMED_KEYS` agrees with the resolver and excludes `Tab`; a full `cb-01-closed-circuit` level completed by keyboard alone |
| `src/locales/__tests__/localeCompleteness.test.ts` | 13 (new file) | en's block non-empty; per locale: nothing missing, nothing extra, equal leaf count, non-empty values, no byte-identical copy outside an 11-key allow-list; `{{count}}` in all three; every `faultHelp.*` has a `fault.*` sibling |
| | **75** | |

Per-feature progression, each figure measured when that feature closed: 336 → 343 (defects) → 387
(audio and preferences) → 394 (keyboard, wiring, mobile) → 407 (locales) → 411 (review fixes).

### Lint

Per-file only, as U3 did. `npm run lint` package-wide **already fails** with 89 errors and 25
warnings in files this unit does not touch — a pre-existing condition recorded in
`../../game-surface/code/implementation-summary.md` section 6 gate 4.

```text
$ npx eslint <this unit's new and changed paths> --ext ts,tsx \
    --report-unused-disable-directives --max-warnings 0
exit=0
```

Two `eslint-disable-next-line react-hooks/exhaustive-deps` directives exist in
`src/pages/circuit-builder` — U3's one on the spark effect, plus one added on `EffectsCanvas`'
unmount cleanup. `--report-unused-disable-directives` reports both as **used**, so neither is
decorative. The reasoning for the second is in `../functional-design/functional-design.md` section 9.

---

## 4. The three defect fixes and how each was verified

| Defect | Fix | Verified by | Not verified |
|---|---|---|---|
| **1. A reset fuse never re-blows on a still-shorted circuit.** `faultSignature = faultCodes.join(',')` was the sole dependency of the `faultsEvaluated` dispatch effect, and `resetFuse` changed nothing the engine or that key could see. | `faultEpoch` in reducer state, incremented only by a `resetFuse` that actually clears a blown fuse, plus `selectFaultEffectKey(faultEpoch, faults)` producing `epoch\|CODE@col,row;...` as the sole dependency of **both** post-evaluation effects. | 3 reducer cases built from a **real** engine short, no hand-written fault fixtures: a repeated identical report returns the identical state reference (rising edge only); `resetFuse` clears the fuse and bumps the epoch; the key before the reset differs from the key after; a third report re-blows with `faultCount: 2`; the same codes at a different position produce a different key; a no-op reset bumps nothing. | That the **wired component** re-blows. No jsdom and no `@testing-library` means no component in this unit can be rendered. Manual step **M1**. |
| **2. `SANDBOX_FALLBACK` was unreachable code duplicating `LEVELS.sandbox`.** | The constant deleted; the default export is now a hook-free guard resolving `level ?? getLevel('sandbox')` and rendering one localized line when that is `undefined`; the former body is a non-exported `CircuitSurfaceBody` with a **required** `level: LevelDefinition`. | A level-registry case asserting `getLevel('sandbox')` is always defined, which is what made the removed branch dead. `npx tsc --noEmit` with `noUnusedLocals` on would fail on any leftover reference, and it exits 0. A repo-wide grep for `SANDBOX_FALLBACK` returns 0 hits, and `CircuitBuilderSurface.tsx` now contains no `LevelDefinition` object literal. | That the guard's one-line message renders. Covered implicitly by M4 only in the sense that the level resolves; the failure branch itself is unreachable in practice, which is the point. |
| **3. The 240-particle pool was rebuilt every render**, because `useRef(new CircuitEffects())` evaluates its argument before the call. | `utils/lazyRef.ts` exports `lazyRefValue(cell, create)` using `??=`; `EffectsCanvas` holds `useRef<CircuitEffects \| null>(null)` and reaches the pool through a stable `useCallback` accessor at all eight former call sites. | 3 cases: a counting factory through `lazyRefValue` 100 times constructs **once** and returns the same instance; a pre-filled cell never calls the factory; `0` and `''` are cached once, proving `??=` and not `\|\|=`. This is a genuine automated proof of the property, where a comment in a React file would have been an assertion with nothing behind it. | The absence of a per-pointer-move allocation spike in a real browser drag. Manual step **M2**. |

---

## 5. What could **not** be verified without a browser

Stated plainly, because the 411 tests above could otherwise be read as covering more than they do.
There is no `vitest.config.*`, no jsdom, no happy-dom and no `@testing-library/*` in `apps/web`, so
**no component in this unit can be rendered in a test**, and `window`, `document`, `localStorage`,
`matchMedia` and `AudioContext` are all `undefined` inside the suite. No Tailwind class-string
assertion was written, deliberately: that would be grep dressed as verification.

| Not verified | Why | Consequence |
|---|---|---|
| **The full-screen layout** | `fixed inset-0 z-40 flex h-dvh w-screen flex-col-reverse overflow-hidden bg-slate-950` is a rendered outcome. | That the overlay actually escapes `AppLayout`'s `container mx-auto px-4 py-8`, that `h-dvh` beats mobile browser chrome where `100vh` would overflow, and that `flex-col-reverse` puts the tray **below** the grid rather than over it are all unproven. What the mode does **not** do is known by construction: the grid canvas keeps the same width and aspect caps in both layouts, so the overlay removes chrome without enlarging the grid — risk **R10**. Manual **M5**. |
| **Every touch target size** | A computed box, not a value. | The 44 px minimums on the tray buttons, the fuse-reset button, the full-screen toggle and the mute toggle are unmeasured. The two range inputs are at `h-6` = 24 px, which is **below** the minimum — see risk R4. Manual **M5**, **M7**. |
| **Focus visibility** | A rendered outline. | The new `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400` ring replacing `outline-none` + `focus-visible:border-cyan-400` has not been seen. Manual **M4**. |
| **Any drawn pixel** | No canvas mock, no snapshot, by brief constraint — unchanged from U3. | The reduced-motion static marks, the frozen dashes and the static chevrons are tested as **data** in `CircuitEffects` and as **branches** in `drawScene`, never as output. Manual **M3**. |
| **Real drag and key events** | Needs focus and real pointer, touch and keyboard events against a laid-out element. | The resolvers are fully tested as pure functions; the plumbing from a browser event into them is not. `preventDefault` behaviour and whether `Tab` actually escapes the canvas are unproven — the test proves only that the resolver and `CONSUMED_KEYS` ignore `Tab`, which is the necessary condition, not the rendered outcome. Manual **M4**, **M7**. |
| **The absence of an autoplay console error** | A console observation on a real page load. | Two necessary conditions **are** proved: the factory and a pre-unlock `play` create **no context at all**, and the surface's unlock rule — `isActivatingPhase`, so a hover never unlocks — creates no context across a full `move,move,move,cancel` hover sequence. Neither can prove no browser emitted a warning. Manual **M8**. |
| **That any sound is audible** | The test fake records calls; it produces no audio. | Mute, degradation and disposal are proved as call sequences. Whether the celebration jingle actually plays, and whether navigating away actually silences it, are manual **M9** and **M10**. |
| **That `aria-keyshortcuts` is announced** | Needs a screen reader. | The attribute is present; its usefulness is unverified. |
| **That the es and pt wording is *good*** | Translation quality is not a testable property. | 13 cases prove the key sets, non-emptiness, placeholder survival and non-identity. Whether the four fault tooltips teach a child in Spanish and Brazilian Portuguese needs a native speaker. Manual **M11**. |
| **That desktop renders unchanged** | `lg:hidden` at ≥ 1024 px is a rendered outcome. | True by construction — every full-screen class is conditional and the toggle is `lg:hidden` — but unobserved. Manual **M6**. |
| **Frame timing** | Needs a browser profiler. | Unchanged from U3: the frame budget is an argued allocation, not a measurement. |
| **Everything in section 8** | No route exists. | The checklist is recorded, not executed. |

---

## 6. Suspected issues in `packages/shared`

**None found, and `packages/shared` was not modified.** It was never opened for writing in any of
this unit's five features. Every test in this unit that needed a circuit built its fixtures from the
**real** engine — `levelOrThrow('sandbox')`, `getLevel('cb-01-closed-circuit')`, and
`evaluateMemoized` — rather than from hand-written literals, which is the construction most likely to
surface an engine disagreement, and none surfaced. Specifically:

- The real engine produced a `SHORT_CIRCUIT` fault with a populated `atPosition` for a battery wired
  to itself through a placed wire, exactly as the defect-1 regression test needs.
- The full `cb-01-closed-circuit` level, built by keyboard only, evaluated to a result with
  `faults === []`, `closedPathExists === true`, the LED `energized`, and
  `intensity > MIN_VISIBLE_INTENSITY`.
- `LEVELS` registers both `sandbox` and `cb-01-closed-circuit`, and `getLevel` returns `undefined`
  for an unknown id — the behaviour the new level-registry case now pins down.

U3's earlier report that the engine already guards short-circuit path search against **every**
source, not just the source under test, still stands and was not re-litigated here.

---

## 7. Stubbed for U4

| # | Stub | What is already in place |
|---|---|---|
| S1 | **No route, and `App.tsx` is unchanged.** The surface is still unreachable in the running app. | `pages/circuit-builder/index.ts` exports one symbol; the exact two-line temporary patch is in section 8. |
| S2 | **No level content, no Mars Rover, and no success evaluation in the UI.** Consequently `playCelebration` and the `celebration` audio cue are reachable and tested but are **never triggered by an actual win**. | `evaluateSuccess` and `getMachine` remain re-exported from `circuitEngine.ts` and unused; the celebration cue is synthesized and preloaded like the other four. |
| S3 | **No backend call and no submission.** | `selectSubmissionPayload` is implemented and tested, and `onSubmissionReady` still fires on every circuit change with the payload minus `gameId`. |
| S4 | **No floating, fault-positioned canvas tooltip.** This unit added the educational **copy** and renders it as a single line in the existing `aria-live="polite"` status row only. | `circuitBuilder.faultHelp.<CODE>` exists in all three locales for the four fault codes; `Fault.code` is stable and `Fault.atPosition` is populated, so a positioned overlay has everything it needs. |
| S5 | **The eight `component.*.abbr` keys are translated in all three locales but read nowhere.** The tray renders names only. | They are translated so the three key sets stay identical in both directions and a future consumer does not discover a hole. They have no coverage beyond the completeness assertions, because there is no renderer to test. |
| S6 | **Keyboard removal of a *connection* is not supported** — `removeConnection` and `moveElementTo` remain pointer-only. This is a **documented known gap under NFR-CB-6**, alongside freeform wire routing and full screen-reader narration of an arbitrary circuit graph. | A keyboard player is never stuck: `Delete` on an element already cascades its connections, so any connection can be removed by removing one of its endpoints. |
| S7 | **No catalog title, description or category keys** (NFR-CB-18). | Catalog and theme registration is CB-5.5, U4's. There is no catalog entry to key yet. |
| S8 | **No rotate action.** Everything is still placed at rotation 0. | `terminalAnchor` handles all four rotations, so adding it is a reducer change with no renderer change. |

---

## 8. Manual verification checklist — RECORDED, NOT EXECUTED

**None of the twelve steps below has been run.** M12 is a **pre-launch item with an owner action
attached**, decided in the review-fix iteration (section 12) and still **open**, not solved. The
reason none has been run is S1: the surface has no route, because
`App.tsx` owns the routes and this unit is forbidden to modify it, so there is nothing to open in a
browser. Every step is written to be executable the moment a route exists, and without reading any
other document.

To run the checklist, temporarily add these two lines to `apps/web/src/App.tsx`:

```tsx
import CircuitBuilderSurface from './pages/circuit-builder'
// ...and inside <Routes>:
<Route path="/circuit-builder-dev" element={<CircuitBuilderSurface />} />
```

then `npm run dev`, visit `/circuit-builder-dev`, and **revert `App.tsx` afterwards** — confirm with
`git diff -- apps/web/src/App.tsx`, which must print nothing.

| # | Covers | Action | Expected result |
|---|---|---|---|
| **M1** | defect 1, CB-3.8 | Place a battery, then wire its terminal 0 to its terminal 1 through a placed wire. Watch the fuse blow. Press "Reset the fuse" and **change nothing else about the circuit**. | Sparks fire **again** and the fuse blows **again**, immediately, without touching the layout. Before the fix the fuse stayed intact and the circuit stayed drawn with short-circuit currents. |
| **M2** | defect 3 | Open the browser profiler's allocation timeline. Drag a component slowly across the whole canvas, generating many pointer-move events. | No repeating allocation spike of ~240 objects per pointer move. One `CircuitEffects` construction for the lifetime of the mount. |
| **M3** | CB-6.2, NFR-CB-7 | Turn on "reduce motion" at the **operating system** level, reload, and cause a short circuit. Then complete a level. | A **static** burst mark appears **at the fault's own cell** instead of flying particles, and a static success mark appears on completion. Marching dashes on energized traces are frozen and static chevrons show current direction. Nothing is merely missing. |
| **M4** | CB-6.1, NFR-CB-5 | Without touching the pointer at all, complete `cb-01-closed-circuit` end to end: `Tab` to the tray, `Enter` to arm, `Tab` to the canvas, arrows to move the cursor, `Enter` to place, `c` and `Shift+C` to start connections, `Enter` and **`Shift+Enter`** to finish them — including at least one connection completed on **terminal 1** via `Shift+Enter`. | The level completes with no pointer input. The focus indicator is **visible at every step**, including on the canvas. `Tab` always moves focus out of the canvas rather than being swallowed. |
| **M5** | CB-6.3, NFR-CB-10 | On a real phone in **portrait**, open the surface and tap the full-screen toggle. | The overlay covers the whole viewport: no page chrome, no header or footer, and no `AppLayout` padding around the surface. **The grid does not get any bigger than it is in the normal layout — full-screen mode does not enlarge it, and nobody should expect it to.** It is width-bound by design: it keeps `max-w-[min(94vw,960px)]` and its 3:2 aspect in both layouts, so on a portrait phone it is roughly 94 % of the width and two thirds of that in height, **not** the full height, and the vertical space the overlay frees goes to the tray and the status row. See risk **R10**. The tray sits **at the bottom**, is reachable by thumb, and does **not** cover the grid. Every control is comfortably hittable. The visible exit button returns to the normal layout. |
| **M6** | CB-6.3, NFR-CB-10 | On a desktop browser at 1280 px wide or more, open the surface. | It renders inside the standard `AppLayout` shell — header, footer, centred container — and there is **no full-screen button**. The mute toggle **is** present, which is intentional. |
| **M7** | CB-6.3 | On a phone, complete the Easy level using **touch only**: drag components from the tray with one finger, drag terminal to terminal, toggle a switch, move the voltage slider. | Every action succeeds. No tap misses its target. A drag released outside the canvas places nothing rather than placing at the edge. |
| **M8** | CB-6.5, NFR-CB-13 | Load the page **fresh** with the console open and the dev-tools "Media" or memory panel available. Do not interact at all. | **No autoplay error or warning** in the console, and **no `AudioContext` exists** yet. Then click once anywhere on the surface and confirm a context now exists. |
| **M9** | CB-6.5, NFR-CB-14 | Press the mute toggle to off, then cause a short circuit and complete a level. Reload, confirm the preference persisted, then unmute and repeat. | Muted: complete silence, with gameplay and visuals unaffected. The preference survives the reload. Unmuted: the fuse-pop and the success jingle are audible. |
| **M10** | CB-6.6, NFR-CB-15 | Trigger the celebration cue and, **while it is still playing**, navigate away from the page. | Sound stops **immediately**, not at the end of the cue. In the dev tools the `AudioContext` state is `closed`. |
| **M11** | CB-6.4, NFR-CB-17 | Switch the app language to Spanish, then to Portuguese, and exercise the whole surface: tray, status row, every rejection message, all four fault help lines, the full-screen labels and the mute labels. Have a native speaker read the four fault tooltips in each language. | **No English string appears anywhere**, fault help lines included, and no raw locale key is ever shown. The remaining-count line still shows a number. The tooltips read as natural school-level physics to a native speaker — this is the only check on translation **quality**, which no test can perform. |
| **M12** — **PRE-LAUNCH, OPEN ITEM WITH AN OWNER ACTION** | CB-6.3, NFR-CB-10, risk **R4** | On a real phone, set the battery voltage and the light level using the two sliders **with a finger**. Try it several times, including near both ends of each track. | The thumb can be hit and dragged reliably on the first try. **If it cannot**, add 44 px minus and plus step buttons beside each slider — **additive, keeping the native slider** — before launch. The sliders are `h-6` (24 px), below the 44 px minimum this unit set for itself, and that is recorded as risk R4 and as "partially met" in `../nfr-requirements/nfr-requirements.md` section 2. The owner decision in the review-fix iteration was to leave the native inputs untouched rather than redesign a shipped control that nobody can see in a browser, which makes this an **open pre-launch item, not a solved one**. No claim is made here about the effective touch area of a native range thumb: it is unmeasured. |

---

## 9. Residual risk

| # | Risk |
|---|---|
| **R1** | 🚨 **BLOCKING DEPLOYMENT RISK — DO NOT DEPLOY THE FRONTEND UNTIL RESOLVED.** Carried forward from U3 unchanged in substance. **This unit neither resolved it nor weakened it.** The relative engine import in `apps/web/src/utils/circuitEngine.ts` reaches **outside** `apps/web` and resolves locally only because a dev machine holds the whole monorepo. Production probably does not: the deploy procedure runs `vercel --prod` **from `apps/web/`**, uploading only that directory; there is no root `vercel.json`, `.vercelignore`, `turbo.json` or npm `workspaces` field; and `vercel.json` sets `buildCommand`, so Vercel builds from source. `packages/shared` is therefore very likely **absent from the Vercel build context**, meaning this import fails there while passing every local gate. A local production bundle proves only that the path resolves *when the monorepo is present* — it does **not** prove deployability. Resolution is an **infrastructure decision for the owner**, not a code change: configure Vercel as a monorepo build with root directory `apps/web`; publish `packages/shared` to a registry; or add a build-time staging step. Adding `"file:../../packages/shared"` to `package.json` does **not** fix it — the directory is still missing from the build context. Vendoring a copy is rejected: browser and server must run identical code (FR-CB-16) or they can disagree about whether a circuit is valid. Containment holds: `circuitEngine.ts` is the single switch point, so the fix is a one-file edit. This unit added no second path to `packages/shared`, and that file was never opened for writing — its `BLOCKING DEPLOYMENT RISK` comment block is byte-identical. |
| **R1b** | **Compiler-option divergence**, carried forward from U3: `apps/web` type-checks `packages/shared/src/circuit/*.ts` under its own options, so the engine is validated twice under different settings. |
| **R2** | **Nothing rendered by this unit has automated coverage, by construction.** Section 5 lists it in full. The manual checklist in section 8 is the only evidence, and it cannot be executed until S1 is done. |
| **R3** | **One type cast exists** — `new Constructor() as AudioContextLike`, at the single boundary where a real `AudioContext` is produced. The real DOM types are a superset of the narrow structural types used throughout, and `AudioBufferSourceNode.onended`'s signature cannot be assigned to a zero-argument handler type without it. Every other line is honestly typed and the node fake satisfies the interfaces exactly, but a real browser disagreeing with the structural types would not be caught by `tsc`. |
| **R4** | **The two range inputs are 24 px (`h-6`), below the 44 px touch minimum.** Enlarging the track does not enlarge the thumb, which is the real hit target; doing it properly requires an appearance reset with a hand-built thumb per engine, or replacing the slider with a stepper. Both are UI redesigns of a control U3 shipped, and this unit is not authorized to make that product decision. Recorded rather than quietly claimed as met. |
| **R5** | **A cue requested in the same tick as the very first `unlock()` is dropped.** `ready` arrives a microtask turn after `unlock`, and S5 step 3 specifies dropping rather than queueing. In practice the first gesture precedes any fault or success by many frames, but a synthetic test harness or an unusually fast first action would lose that one sound. |
| **R6** | **The build-time flag `env.features.enableSoundEffects` remains unwired**, deliberately (D5). If a future unit decides the flag should gate audio, it must also decide what an unset `VITE_ENABLE_SOUND_EFFECTS` means, because today the flag is `false` in every environment that has not opted in. |
| **R7** | **`en.json` is a shared file and U4 will edit it.** This unit's edits are additive and confined to the one contiguous `circuitBuilder` block, and `localeCompleteness.test.ts` is driven by en's key set, so any key U4 adds to en **fails that test until es and pt follow**. That is the intended ratchet, but it means U4 inherits a test that will go red the moment it adds an English key. |
| **R8** | **`unsupported` is terminal with no retry.** A browser that refused a context once is never asked again for the rest of the session. This is the deliberate fail-closed choice over a retry on every gesture, but a transient refusal would cost the whole session's audio. |
| **R9** | **Carried forward from U3, unchanged**: a wire's energization is a component-level property rather than a per-wire current (R3 in U3's summary); no `devicePixelRatio` scaling, so glow and fine strokes look slightly soft on HiDPI screens (U3 R4); a reversed LED reports a non-zero negative current with `energized: false`, and every visual is gated on `energized` and `intensity`, never on `current` (U3 R6); `onSubmissionReady` fires on every circuit change rather than on an explicit submit (U3 R7); and the grid canvas redraws in full (U3 R8). None was addressed by this unit and none was made worse. |
| **R10** | **Full-screen mode removes chrome; it does NOT currently enlarge the grid, and no document here should be read as saying it does.** `GridCanvas` wraps its canvas in `max-w-[min(94vw,960px)]` with `aspect-[3/2]` in **both** layouts, so the overlay frees vertical space that nothing inside it claims: on a 390 x 844 portrait viewport the grid stays roughly 366 x 244 while about 600 px of height becomes available. The canvas host is `min-h-0 flex-1` and could grow, but no height-driven scaling exists. Making the canvas scale to the host's available height in full-screen is a **visible layout change to a control U3 shipped**, so it is recorded here and M5 is stated to match the code rather than changed silently. The fix, when an owner wants it, is confined to `GridCanvas`'s wrapper classes: a `fullScreen`-conditional `max-h` plus `h-full w-auto` on the canvas, which keeps the 960x640 logical surface and the fixed aspect intact. |

---

## 10. Security baseline compliance

| Rule | Status | Evidence |
|---|---|---|
| **SECURITY-15** fail closed, explicit error handling on every external call, no unhandled promise rejection, all listeners and the audio context released on unmount | **Compliant** | Every browser capability call is guarded: `matchMedia`, `localStorage.getItem` and `setItem`, `createContext`, `resume`, `close`, `createBuffer`, `createBufferSource`, `createGain`, `start`, `stop`, `disconnect`. `play` is wrapped whole and is **asserted not to throw in all five lifecycle states** and against a hostile context whose `createBufferSource` and `createGain` both throw. Every internal promise chain ends in a terminal `.catch`; two cases register a `process.on('unhandledRejection')` probe and assert it recorded nothing — one for a rejecting `resume()`, one for a rejecting `close()`. `subscribeReducedMotion` returns a real unsubscribe in **every** branch, including the unsupported ones, detaches with the API it attached with, and a test proves a later change is not delivered after unsubscribe. `useGameAudio` disposes in its unmount cleanup; a test asserts `close()` once, a live source's `stop()` once, and no new source afterwards. `lazyRefValue` leaves nothing constructed if the component never used it, and the unmount cleanup no-ops on a `null` cell. A missing level renders one localized line instead of crashing. |
| **SECURITY-09** no internal detail, error code or stack trace reaches the user; no sensitive data in logs | **Compliant** | Faults and rejections remain stable codes resolved through locale keys — never messages — in all three locales. The new `circuitBuilder.error.levelUnavailable` line carries no level id, no code and no stack. The four `faultHelp` tooltips in en, es and pt contain no engine internal, no `RejectionCode` string, no identifier and no stack trace. **Nothing new is logged anywhere in this unit**, so no error object, code or message can reach a log sink; no error object crosses a module boundary. |
| **SECURITY-10** dependency hygiene | **Compliant — N/A in effect** | No dependency added. `apps/web/package.json` and `apps/web/package-lock.json` both have an empty `git diff --stat`. `npm install` was never run and no registry was contacted. |
| **SECURITY-05** input validation at the boundary | **Partially applicable, compliant** | No API endpoint exists in a browser surface. The one untrusted input this unit reads is the stored sound preference: it is parsed tolerantly, and `false`, `"false"`, `true`, garbage, empty, absent and a throwing getter are each covered by a test, every malformed case falling back to the documented default rather than propagating. `sampleRate` from a context is validated finite and positive before it can size a buffer. |
| **SECURITY-11** separation of concerns | **Partially applicable, compliant** | Structural and unchanged: the renderer, the controller, the state machine, the audio service and the preferences adapter are separate framework-free modules. The two new services import no React, and the two new hooks are the only React-aware code added. Rate limiting does not apply to a local canvas. |
| **SECURITY-03** no sensitive data in logs | **N/A** | No logging framework and no log sink in this unit; it emits no log line at all, so no sensitive value can reach one. |
| **SECURITY-01** data at rest, **SECURITY-02** data in transit | **N/A** | The only persisted value is a boolean sound preference in `localStorage`. It is not sensitive, is not a credential, and identifies nobody. No network call is made by this unit. |
| **SECURITY-04, 06, 07, 08, 12, 13, 14** | **N/A** | No response header, IAM policy, network configuration, endpoint authorization, authentication path, deserialization of untrusted input, or alarm configuration is created or changed. A browser game surface has none of these surfaces: it talks to no backend in this unit (S3), stores no token, and parses no untrusted payload — the locale files and the synthesized buffers are both build-time artifacts of this repository, not external input. |

**No blocking security finding.**

---

## 11. Scope proof

```text
$ git rev-parse --short HEAD
a328c74

$ git diff --stat -- aidlc-docs/aidlc-state.md aidlc-docs/audit.md
 aidlc-docs/aidlc-state.md | 139 +++++++++++++-
 aidlc-docs/audit.md       | 475 ++++++++++++++++++++++++++++++++++++++++++++++
```

Those two diffs are **not this unit's**. They were already present when U5 started and belong to the
orchestrator's workflow bookkeeping; U5 is forbidden to edit either file and never opened either for
writing. Their SHA256 sums were recorded before this documentation feature wrote anything and
re-checked afterwards, unchanged.

`git status --short` shows this unit's entries as `M apps/web/src/config/constants.ts`,
`M apps/web/src/locales/{en,es,pt}.json`, and untracked `apps/web/src/services/`,
`apps/web/src/hooks/useGameAudio.ts`, `apps/web/src/hooks/usePresentationPreferences.ts`,
`apps/web/src/locales/__tests__/`, `apps/web/src/utils/lazyRef.ts`,
`apps/web/src/utils/__tests__/lazyRef.test.ts`, `.agents/` and
`aidlc-docs/construction/platform-quality/` — the last of which is this document and its three
siblings. Every other entry in that listing, including everything under `services/`,
`packages/shared/`, `apps/web/src/main.tsx` and `apps/web/vercel.json`, was already dirty or
untracked from other units before this unit started and is byte-identical to that starting state.

**Nothing was committed, pushed, stashed, merged, tagged or deployed.** `git log -1` is the same
commit the unit started from. No AWS, Vercel or Stripe call was made, and no `npm install` was run.

---

## 12. Review-fix iteration

Four findings came back from review. One was blocking, three were not, and two of the three were
settled by the owner rather than by code.

| # | Finding | What was done |
|---|---|---|
| 1 | **Blocking — audio unlocked on hover.** `unlockAudio()` led `handlePointerEvent` with no phase filter, and `GridCanvas` wires `onMouseMove` to that handler, so a plain hover created the `AudioContext` with no user activation. Because `unlock()` is one-shot by lifecycle state, the first call was very likely a hover, and a browser that rejects `resume()` outside a gesture would latch the terminal `unsupported` state for the whole session while Chrome logged the autoplay warning CB-6.5 forbids. | **Fixed in code, with a regression test.** `isActivatingPhase(phase)` is exported from `circuitBuilderInteraction.ts` and is the only gate on the unlock: `down` and `up` unlock, `move` and `cancel` do not. `handleKeyEvent` and `handleArm` are activating by nature and are unchanged. Four cases in `audioService.test.ts` prove it, including the counterfactual — see section 3. The rule lives in the interaction module precisely so a test can reach it; the component cannot be rendered here. |
| 2 | **Non-blocking — full-screen does not enlarge the grid.** | **Documented, not changed**, on the owner's decision: scaling the canvas is a layout change nobody on this project can see in a browser. M5, the section 5 full-screen row, `nfr-requirements.md` NFR-CB-10 and risk R10 now all say plainly that the grid does not enlarge in full-screen, with the measurement and the one-file fix a future owner can apply. |
| 3 | **Non-blocking — `nfr-design.md` overstated a failure path**, claiming a failed preload reaches `unsupported`. | **Corrected.** Section 1 now names a rejecting or throwing `resume()` as the only further failure transition, and states the real preload behaviour: `loadCue` resolves on every failure, so a total preload failure leaves the service `ready` with an empty buffer map and every `play` dropped silently. The state diagram gained the two matching transitions. |
| 4 | **Non-blocking — the two range inputs stay below the touch minimum.** | **Left exactly as they are, by owner decision**, with the disclosure kept verbatim: risk R4 and the "partially met" row in `nfr-requirements.md` section 2 are unchanged. The replacement would be a visible redesign of how players set voltage, and it would be unverifiable by the same standard this unit holds everything else to. It is now also manual step **M12**, a **pre-launch item with an owner action** — if a finger cannot hit the thumb reliably on a real phone, add 44 px minus/plus step buttons beside each slider, additively, before launch. **Open, not solved.** No claim is made about a native thumb's effective touch area. |

Gates after the fix iteration: `npx tsc --noEmit` exit 0; `npx vitest run` **21 files, 411 tests,
0 failures**; per-file `npx eslint` over every new and changed path exit 0 with no new disable
directive. `git log -1` is still `a328c74`, `git stash list` is empty, and the only paths the
iteration touched are `apps/web/src/pages/circuit-builder/CircuitBuilderSurface.tsx`,
`apps/web/src/utils/circuitBuilderInteraction.ts`,
`apps/web/src/services/__tests__/audioService.test.ts` and the four documents under
`aidlc-docs/construction/platform-quality/`.
