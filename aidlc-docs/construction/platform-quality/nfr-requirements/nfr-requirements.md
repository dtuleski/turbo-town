# Platform Quality — NFR Requirements

**Unit**: U5 "Platform Quality" · **Package**: `apps/web`

Every number below is either a constant read out of the code, a figure measured by a command run
during this unit, or arithmetic shown in full. Nothing is estimated silently, and where a stated
budget does not follow from its own stated ceiling that is said plainly rather than smoothed over.

---

## 1. Audio buffer budget

**Shape**: mono, one channel, Float32 samples written directly into a buffer from
`context.createBuffer`. **Per-cue ceiling**: at most one second. **Five cues.**

### Nothing is fetched, and why

`apps/web/public` contains `traffic-sim.html` and `vite.svg` and nothing else. There is **no audio
asset anywhere in the repository**. Three consequences followed, and they are the reason buffers are
synthesized in-context rather than loaded (D4):

1. Adding binary audio files is outside what this unit should grow, and their licensing, size and
   pipeline would all be new questions.
2. A fetch introduces a network path, a 404 branch, and a loading state — all of which would be
   unverifiable here, because there is no browser and no jsdom in the test environment.
3. Synthesis makes the buffer a pure function of the cue name and the sample rate, which **is**
   testable in the node environment.

The `SoundLoader` seam remains, so a later unit can swap in fetched files without touching the
lifecycle. "Preload" therefore means buffer synthesis, and it happens **after** gesture unlock.

### Measured size

Durations are the five entries of `CUE_DURATION_MS` in `apps/web/src/services/audioService.ts`.
Frames are `round(ms / 1000 * 48000)`; bytes are `frames * 4`, Float32 mono.

| Cue | Duration | Frames at 48 kHz | Bytes |
|---|---|---|---|
| `celebration` | 900 ms | 43 200 | 172 800 |
| `fusePop` | 180 ms | 8 640 | 34 560 |
| `spark` | 90 ms | 4 320 | 17 280 |
| `place` | 60 ms | 2 880 | 11 520 |
| `connect` | 110 ms | 5 280 | 21 120 |
| **Total** | **1 340 ms** | **64 320** | **257 280 bytes ≈ 257 kB** |

Every cue is comfortably under the one-second ceiling, and a test asserts that for every preloaded
buffer rather than trusting the table.

### One honest correction to the stated budget

The design brief carried the figure "five cues at or under roughly 430 KB at a 48 kHz sample rate".
That figure is the **budget**, and the measured 257 kB sits well inside it. But the budget does not
follow from the one-second-per-cue ceiling: five cues each running the full second at Float32 mono
and 48 kHz would be `5 * 48000 * 4 = 960 000` bytes, about 960 kB, which is more than twice 430 kB.

So the thing that actually keeps the total under 430 kB is the **measured durations**, not the
per-cue ceiling. Both constraints are therefore kept as separate requirements:

- **A1** No cue may exceed 1 s. *Enforced by a test over every preloaded buffer.*
- **A2** The five cues together must stay at or under ~430 kB of decoded Float32 at 48 kHz.
  *Currently 257 kB. A future cue lengthening must be re-checked against this table, because A1 alone
  does not imply A2.*

---

## 2. Touch targets

**Requirement**: every interactive control on the circuit surface is at least **44 px** in its
smallest dimension — the WCAG 2.5.5 / platform-guideline figure, and the one CB-6.3 ("play
comfortably on a phone") depends on.

### What was under it before this unit

| Control | Before | After |
|---|---|---|
| Fuse-reset button | `px-2 py-0.5` — roughly 20 px tall with the inherited text size, far under any touch minimum | `min-h-[44px] px-3 py-2` |
| Tray component buttons | padding-only sizing, under 44 px at the small text size | `min-h-[44px]` |
| Voltage and light-level range inputs | browser-default track height, around 16 px | `h-6` (24 px) — **still under 44 px**, see below |
| Full-screen toggle | did not exist | `min-h-[44px] min-w-[44px]` |
| Mute toggle | did not exist | `min-h-[44px]` |

### The range inputs are a known partial

`h-6` is 24 px, not 44 px. Enlarging the *track* does not enlarge the *thumb*, which is the real hit
target, and moving the thumb to 44 px requires either an appearance reset plus a hand-built thumb in
each engine's pseudo-element, or replacing the slider with a stepper. Both are UI redesigns rather
than a sizing fix, and this unit is not authorized to make a product decision about a control U3
shipped. It is therefore recorded as **partially met** in section 4 and carried as a residual risk in
the implementation summary, not claimed as met.

---

## 3. Mobile breakpoint

**Mobile is `< lg`, i.e. below 1024 px.** That is Tailwind's default `lg` and it is the breakpoint
the component already used — the tray stacks at `lg` and the full-screen toggle is `lg:hidden`.

**No new breakpoint was invented.** Introducing, say, a `md` or a custom `640px` cut would have
produced two different ideas of "mobile" inside one component, and the first layout bug would have
been in the gap between them. Using the existing `lg` means the toggle appears on exactly the
viewports where the tray is already stacked, so the full-screen layout and the stacked layout turn on
together.

Related presentation requirement, inherited unchanged from U3: the canvas is one fixed 960 × 640
logical surface that CSS scales. The breakpoint changes the **shell**, never the drawing geometry, so
there is nothing viewport-dependent in any coordinate path.

---

## 4. NFR coverage

Three statuses are used, and they mean different things. **Met** — proved by an automated test or by
a compiler constraint. **Met, manually verified only** — implemented and reviewed, with no automated
proof possible in a node environment, so the only evidence is a manual checklist step that
**has not been run** (see the implementation summary section 8). **Partially met** — part of the
requirement is deliberately not delivered, with the gap named.

| NFR | Status | Evidence |
|---|---|---|
| NFR-CB-5 — core actions keyboard operable: select, place, toggle, connect | **Met** | All four are reachable from the keyboard and now include terminal 1 via `Shift+Enter`. `circuitBuilderInteraction.test.ts` carries 31 cases including three new equivalence cases, and one case that completes the whole `cb-01-closed-circuit` level using **only** `resolveTrayIntent`, `resolveKeyIntent` and `intentToAction` folded through the reducer, then asserts zero faults and the LED above `MIN_VISIBLE_INTENSITY` from the real engine. |
| NFR-CB-6 — the accessibility gap is documented, not silently omitted | **Met** | Functional design section 5 names the gaps: freeform wire routing, full screen-reader narration of an arbitrary circuit graph, and keyboard removal of a *connection* (`removeConnection` and `moveElementTo` stay pointer-only). It also records why a keyboard player is not stuck — `Delete` on an element cascades its connections. |
| NFR-CB-7 — `prefers-reduced-motion` honored; sparks and celebration reduced or replaced with a static indication | **Met** | `presentationPreferences.ts` reads and subscribes to the query behind an injectable seam; 23 cases cover absent, true, change, unsubscribe, throwing, and legacy-`addListener` environments. One case wires the subscription to a real `CircuitEffects`, fires the query, and asserts `activeParticleCount === 0` **and** `staticMarks.length === 1` — a substitution, not silence. Five further cases in `circuitBuilderEffects.test.ts` assert the mark carries the fault's own `cell`, that fuse and celebration marks appear at their positions, that marks expire, and that enabling reduced motion mid-flight retires live particles. |
| NFR-CB-10 — standard `AppLayout` shell on desktop; full-screen canvas permitted on mobile | **Met, manually verified only** | Every full-screen class is conditional on `fullScreen`, and the toggle is `lg:hidden`, so the desktop class string is unchanged by construction. That the overlay actually escapes `AppLayout`'s `container mx-auto px-4 py-8`, that `h-dvh` beats mobile browser chrome, and that `flex-col-reverse` puts the tray below rather than over the grid are all **browser-only** facts. Manual steps M5 and M6. The mode gives the surface the whole viewport but the **grid stays width-bound** — the canvas keeps `max-w-[min(94vw,960px)]` and `aspect-[3/2]` in both layouts — so the freed height goes to the tray and status row, not to the grid; recorded as risk R10 rather than changed, because scaling the canvas to the host height is a visible layout decision for the owner. |
| NFR-CB-11 — responsive across desktop, tablet and mobile | **Met, manually verified only** | One fixed logical canvas, CSS-scaled, plus the `lg` stack and the mobile overlay. No layout assertion is possible without a browser; a Tailwind class-string assertion would be grep dressed as a test, and none was written. Manual steps M5 to M7. |
| NFR-CB-12 — a small reusable audio service, not page-local audio | **Met** | `apps/web/src/services/audioService.ts`, 418 lines, no React import, one factory `createCircuitAudio` plus an injectable `AudioAdapter` and `SoundLoader`. `useGameAudio` is a 57-line wrapper. 21 cases. |
| NFR-CB-13 — the browser user-gesture requirement is honored | **Met for the service, manually verified for the page** | A test asserts that `play` before `unlock` creates **no context at all**, and the factory itself constructs nothing. The surface calls `unlock()` only from **activating** input — the tray, key events, and the `down` and `up` pointer phases — so a hover (`move`) over the grid cannot spend the one-shot unlock outside a gesture. That a real page load produces no autoplay console error is manual step M8. |
| NFR-CB-14 — the stored sound preference is honored and a mute control exists | **Met** | `isSoundEnabled()` is re-read on **every** `play`; a test flips a getter from true to false between two calls and asserts exactly one source was created. A muted service creates zero sources. The mute toggle is a real `aria-pressed` button, visible on every viewport. |
| NFR-CB-15 — audio is cleaned up on navigation and does not continue after unmount | **Met** | `useGameAudio` disposes in its unmount cleanup. A test asserts `close()` was called exactly once, a live source's `stop()` exactly once, and that a later `play` creates no new source. Observing the silence in a browser is manual step M10. |
| NFR-CB-16 — missing or unsupported audio degrades silently without breaking gameplay | **Met** | Four separate cases: `createContext` returning `null`, `createContext` throwing, a loader that rejects for `celebration` only while `fusePop` still plays, and a hostile context whose `createBufferSource` and `createGain` both throw. `play` is asserted not to throw in all five lifecycle states. |
| NFR-CB-17 — complete en, es and pt translations including educational tooltips | **Met for key completeness; the quality of the wording is unverified** | All three locales now carry **55** identical leaf keys under `circuitBuilder`, asserted in **both** directions — nothing missing and nothing extra — by 13 cases in `localeCompleteness.test.ts`, plus non-empty values, `{{count}}` survival in `tray.remaining`, and a `faultHelp.*`/`fault.*` sibling check. The four educational tooltips are two sentences each in all three languages. **No test can prove a translation is good**; a native-speaker read is manual step M11. |
| NFR-CB-18 — catalog title, description and category keys in all three locales | **Not met — out of scope, U4** | Catalog and theme registration is CB-5.5, owned by U4 along with route registration. This unit added no catalog key, because there is no catalog entry to key. Recorded here so the requirement is not lost rather than claimed. |

---

## 5. Verification requirements and their limits

| Requirement | How it is verified | Limit |
|---|---|---|
| Fault epoch, re-blow after reset, key position sensitivity | reducer cases driven by the **real** engine, no hand-written fault fixtures | the *wired component* re-blowing is not provable without a browser; manual step M1 |
| Single construction of the particle pool | a counting factory through `lazyRefValue`, 100 calls, one construction | the absence of a per-pointer-move allocation spike in a real drag is manual step M2 |
| Audio lifecycle, mute, degradation, disposal | a fake `AudioContextLike` recording every created source and every `start`/`stop`/`disconnect`/`resume`/`close` | no sound is ever actually produced in a test; audibility is manual steps M9 and M10 |
| No unhandled rejection | a `process.on('unhandledRejection')` probe asserted to record nothing, for a rejecting `resume()` and a rejecting `close()` | — |
| Reduced-motion propagation and substitution | the real adapter subscription driving a real `CircuitEffects` | that the substituted mark is *drawn* is a pixel, and no pixel is asserted anywhere in this unit |
| Keyboard model, pointer equivalence, no focus trap | 31 pure cases, including an end-to-end Easy level by keyboard alone | real focus, real key events, `preventDefault` behaviour and focus-ring visibility are browser-only; manual step M4 |
| Locale completeness | both-direction key-set equality against en, driven by en's key set | translation **quality** is unprovable; manual step M11 |
| Touch targets, mobile overlay, desktop unchanged | none — no automated coverage exists or was written | manual steps M5 to M7, plus **M12**, the pre-launch finger test on the two sliders, which is an open item with an owner action |
| Frame timing | not measured | needs a browser profiler, as it did for U3 |

---

## 6. Security baseline applicability for this stage

| Rule | Status |
|---|---|
| SECURITY-15 | **Compliant** — every browser capability call is guarded, `play` never throws, no promise chain lacks a terminal `.catch`, every media-query listener is detached with the API it was attached with, and the audio context is closed on unmount. Evidence in the nfr-design and the implementation summary. |
| SECURITY-09 | **Compliant** — faults and rejections remain stable codes resolved through locale keys in all three locales; the unavailable-level line carries no id, code or stack; nothing new is logged. |
| SECURITY-10 | **N/A** — no dependency added, no lock file changed, no `npm install` run. |
| SECURITY-05 | **Partially applicable, compliant** — no endpoint exists in a browser surface, but the stored sound preference is read tolerantly and every malformed value falls back to a documented default rather than propagating. |
| SECURITY-03 | **N/A** — no logging framework and no log sink in this unit; it emits no log line, so no sensitive value can reach one. |
| SECURITY-01, 02, 04, 06, 07, 08, 11, 12, 13, 14 | **N/A** — no data store, network intermediary, response header, IAM policy, network configuration, endpoint authorization, rate limit, authentication, deserialization of untrusted input, or alarm is created or changed. |
