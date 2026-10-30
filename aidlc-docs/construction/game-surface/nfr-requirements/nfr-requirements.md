# Game Surface — NFR Requirements

**Unit**: U3 "Game Surface" · **Package**: `apps/web`

Every number below is either a constant in `packages/shared/src/circuit/constants.ts`, a measured
figure from U2's artifacts, or arithmetic shown in this document. Nothing is estimated silently.

---

## 1. Frame budget

| Target | Budget per frame | Basis |
|---|---|---|
| 60 fps on desktop | 16.7 ms | NFR-CB-8 |
| 30 fps floor on mid-range mobile | 33.3 ms | NFR-CB-10 |

Allocation inside the 16.7 ms:

| Stage | Budget | Why it fits |
|---|---|---|
| Circuit canvas draw | 8 ms | at most ~576 primitives, section 3 |
| Effects canvas draw | 4 ms | at most 240 particles, section 6 |
| Headroom for React, compositing, input | 4.7 ms | the surface re-renders only on a state change |

Circuit evaluation is **not** in the frame budget. It cannot be — see section 4.

---

## 2. Ceilings inherited from the engine

Not re-decided here. These are U2's published constants and this unit enforces the same values
locally so the engine never receives a payload it would refuse.

| Constant | Value | Source |
|---|---|---|
| `MAX_ELEMENT_COUNT` | 64 | `constants.ts` |
| `MAX_CONNECTION_COUNT` | 128 | `constants.ts` |
| Grid range | 2 to 24 columns, 2 to 16 rows | `constants.ts` |
| `MAX_ID_LENGTH` | 64 | `constants.ts` |
| Source voltage | 1.5 V to 12 V, step 0.5 V | `constants.ts` |
| Light level | 0 to 1 | `constants.ts` |
| `SHORT_CIRCUIT_RESISTANCE_THRESHOLD` | 1.0 Ω | `constants.ts` |
| `MAX_FAULT_COUNT_PER_LEVEL` | 20, with a per-level override | `constants.ts`, `levels.ts` |
| `MAX_MATRIX_DIMENSION` | 256 | `constants.ts` |

The short-circuit threshold and the intensity curve are **not** re-implemented here. This unit reads
the engine's `SHORT_CIRCUIT` fault code and the engine's `intensity` value.

---

## 3. Draw cost at the ceiling

Worst case is the sandbox: a 24 by 16 grid at the element and connection ceilings.

| Item | Count | Arithmetic |
|---|---|---|
| Grid lines | 42 | 25 vertical plus 17 horizontal, drawn as **one** path with one stroke |
| Grid border | 1 | one `strokeRect` |
| Connections | 128 | one stroke each, plus chevrons only when reduced motion is on |
| Element bodies | 64 | one rounded rectangle, filled and stroked |
| Element glyphs | 64 | 1 to 6 sub-paths each, by kind |
| Terminals | 128 | two small arcs per element |
| Affordances | up to 4 | ghost, cursor box, selection ring, pending marker |
| Fuse badge | 0 or 1 | two arcs |
| **Total primitives** | **~576** | 128 + 64 + 64 + 128 + 42 + border + affordances |

`shadowBlur` is the one genuinely expensive operation, since it forces a blur pass per stroke. It is
therefore applied **only to energized items**. In the worst realistic case every one of the 128
connections and 64 elements is energized, which is 192 blurred strokes; the far more common case is
a handful. If the 8 ms budget were ever exceeded, the first lever is reducing the blur radius, not
restructuring the renderer.

Three structural choices keep the per-frame cost flat:

1. **Nothing is allocated per frame in the draw path** beyond one `Map` of results by element id,
   built once per `drawScene` call, bounded at 64 entries.
2. **The loop does not run when nothing moves.** `hasLiveAnimation` returns true only when motion is
   not reduced, the fuse is intact, the outcome is a result, and at least one element is energized.
   A settled or de-energized circuit costs zero frames.
3. **The backing store is never resized.** One 960 by 640 canvas serves every grid size.

---

## 4. Why the engine cannot run per frame

U2 measured the engine at roughly **5.6 million floating-point operations** at the 64-element
ceiling, which it describes as "single-digit milliseconds"
(`aidlc-docs/construction/circuit-engine/code/implementation-summary.md` section 4a). A realistic
level with about 20 elements is roughly 2 700 operations, in microseconds.

Single-digit milliseconds does not fit a 16.7 ms frame alongside an 8 ms draw. Two requirements
follow, and they are the quantitative basis for the memo:

- **Evaluate on state change, never per animation frame.** The result is derived once during render
  and the loop reads it from the scene.
- **A repeat evaluation must be free.** Real play oscillates — toggle a switch and back, drag an
  element and return, nudge the voltage up and down — and each of those returns to a circuit state
  already evaluated.

---

## 5. Memo size

The memo key is the **full canonical state string**, not a numeric digest. A digest collision would
show the player a different circuit's answer, silently and with no error signal, which is a
correctness bug with no detection path. The string is a few kilobytes, so the safety is free.

Key size at the ceiling:

| Part | Bound | Arithmetic |
|---|---|---|
| Grid record | ~12 bytes | one record |
| 64 element records | ~5 kB | `MAX_ID_LENGTH` 64, plus kind, position, and params, times 64 |
| 128 connection records | ~25 kB | three ids of up to 64 characters each, times 128 |
| Switch records | ~550 bytes | up to 8 switches at ~70 bytes |
| Environment record | ~16 bytes | one record |
| **Worst case per key** | **~31 kB** | all ids at the full 64-character limit |
| **Realistic per key** | **~2 to 4 kB** | generated ids are 2 to 4 characters, not 64 |

Capacity is **32 entries**: about 128 kB at realistic id lengths, under 1 MB even in the absurd
worst case where every id is 64 characters. 32 covers the oscillation patterns above without
unbounded growth. Eviction policy and its rationale are in `../nfr-design/nfr-design.md` section 5.

---

## 6. Particle pool

Fixed at **240 particles**, pre-allocated once in the constructor. A spark burst spawns 18 to 24,
so the pool holds roughly ten concurrent bursts, which is more than overlap in practice at a
400-to-600 ms particle life.

An emit beyond capacity **overwrites the oldest particle** rather than growing the array. So the
per-frame allocation count is zero and memory is bounded no matter how many shorts a player causes:
a hundred consecutive shorts costs exactly what one costs. This is asserted by a test that fires 40
consecutive bursts and checks the live count never passes the capacity.

Static reduced-motion marks are a separate, small list bounded by their 1 600 ms expiry.

---

## 7. NFR coverage

| NFR | Status | Note |
|---|---|---|
| NFR-CB-1 drag and drop without a drag library | **Met** | HTML5 drag, touch, and tap, on plain DOM buttons. `@dnd-kit` is in `package.json` for other games and is not imported here. |
| NFR-CB-2 pointer and touch parity | **Met in code, unverified in a browser** | One resolver serves both. Section 9. |
| NFR-CB-4 bounded input | **Met** | Section 2. |
| NFR-CB-5 keyboard equivalence | **Partially met — structure only** | One selection, one intent union, asserted equivalence. No focus-ring conventions, no terminal-to-terminal traversal beyond terminal 0 and 1, no screen-reader narration. Deferred to U5. |
| NFR-CB-7 reduced motion | **Partially met — flag only** | `setReducedMotion` is implemented and honoured, with a static substitute rather than a dropped effect. Nothing reads the operating system preference; that adapter is U5's. The flag defaults to false. |
| NFR-CB-8 60 fps desktop | **Met by design, unmeasured** | Sections 1 and 3. No frame timing was captured, because that needs a browser. |
| NFR-CB-9 energized paths distinguishable without colour | **Met** | Four non-colour channels, functional design section 6. |
| NFR-CB-10 responsive to mobile | **Partially met** | One fixed logical canvas, CSS-scaled, `touch-none`, tray scrolls horizontally on small screens and stacks at `lg`. No full-screen mobile mode, which NFR-CB-10 permits; deferred to U5. |
| NFR-CB-11 dark-mode styling | **Met** | Slate and cyan utilities matching the sibling games, raw hex inside the canvas. |
| NFR-CB-12 to 16 audio | **Not started** | No audio in this unit. `playCelebration` and `playFusePop` exist as visual-only hooks for U5's audio service. |
| NFR-CB-17 localization | **Met for English** | Every string in the DOM is a locale key; nothing on the canvas is text. `es.json` and `pt.json` are untouched, so those locales fall back to English rather than showing raw keys. U5 owns the translations. |

---

## 8. Verification requirements and their limits

| Requirement | How it is verified | Limit |
|---|---|---|
| Reducer correctness | 49 Vitest cases, no React | — |
| Coordinate conversion and hit geometry | 20 Vitest cases | — |
| Memo correctness and eviction | 12 Vitest cases | — |
| Interaction model and pointer-keyboard equivalence | 24 Vitest cases | — |
| Particle bounds and reduced motion | 11 Vitest cases | — |
| Drawing output | **not automatically verified** | Brief constraint: no browser test tooling. Pixels are unasserted by design. |
| Drag, touch, and keyboard in a real browser | **not automatically verified** | Same constraint. The manual checklist in `../code/implementation-summary.md` section 7 is the only evidence, and it cannot be executed until a route exists. |
| Frame timing | **not measured** | Needs a browser profiler. |

Section 9 of the implementation summary states plainly what could not be verified. Nothing in this
document should be read as a measured frame time.

---

## 9. Security baseline applicability for this stage

| Rule | Status |
|---|---|
| SECURITY-09, SECURITY-15 | **Compliant** — evidence in the functional design section 10 and the implementation summary section 10 |
| SECURITY-05 | **Partially applicable, compliant** — no endpoint, but every action is bounds-checked against the engine's ceilings |
| SECURITY-03 | **N/A** — no logging framework and no log sink in this unit; it emits no log line |
| SECURITY-10 | **N/A** — no dependency added, no lock file changed |
| SECURITY-01, 02, 04, 06, 07, 08, 11, 12, 13, 14 | **N/A** — no data store, network intermediary, response header, IAM policy, network configuration, endpoint authorization, rate limit, authentication, deserialization, or alarm is created or changed |
