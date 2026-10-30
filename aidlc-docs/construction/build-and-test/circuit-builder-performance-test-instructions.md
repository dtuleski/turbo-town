# Circuit Builder - Performance Test Instructions

**Created**: 2026-10-30
**Stage**: CONSTRUCTION - Build and Test

**Note on file naming**: `performance-test-instructions.md` already exists from the original project; this file is kept separate.

## Applicability

- **Load and stress testing of the backend: not applicable.** Circuit Builder adds no new endpoint, table, or Lambda. It reuses the existing authenticated `/game/graphql` route, and evaluation is a pure computation measured in milliseconds.
- **Engine evaluation cost: applicable and measured below.**
- **Browser rendering performance: applicable but NOT measured.** It needs a real browser and a real phone.

## Requirement

`NFR-CB-4`: rendering stays smooth on mid-range mobile hardware at the maximum supported component count. The ceiling is `MAX_ELEMENT_COUNT = 64`, `MAX_CONNECTION_COUNT = 128`, derived `MAX_MATRIX_DIMENSION = 256`.

## Measured: engine evaluation cost

Method: the real built engine (`packages/shared/dist`) timed with `process.hrtime` in node after a 30-call warm-up, 300 timed iterations per case, on the developer laptop. Case: a single battery plus a series loop of resistors, which gives the widest node count reachable with realistic parts.

| Case | Elements | Median | p95 | Max |
|---|---|---|---|---|
| Small series loop | 5 | **0.039 ms** | 0.175 ms | 33.3 ms |
| Ceiling series loop | 64 | **0.628 ms** | 2.093 ms | 16.3 ms |

Both returned a full result (5 and 64 element results), so these timings are for solved circuits, not early exits.

### How to read this honestly
- At a 16.7 ms frame budget (60 fps), the median ceiling-size evaluation uses about 4 percent of a frame on this machine. The browser memoizes by circuit state, so an unchanged circuit never re-solves.
- The `max` values are one-off spikes (likely garbage collection or the first cold call), not steady cost. They are reported, not hidden.
- **This is a laptop under node, not a mid-range phone and not the Lambda.** A phone may be several times slower. The result supports the design; it does not prove `NFR-CB-4` on a phone.
- A 64-element series loop is not the theoretical worst case. The analytical worst case (64 sources, matrix dimension 256, about 6.7 million operations, estimated single-digit milliseconds) was **not benchmarked**, and it is reachable only in the sandbox with an unrealistic circuit.

## Not measured: required before launch

| Item | How to test | Target |
|---|---|---|
| Frame time with 64 components placed, on a real mid-range phone | Browser Performance panel, remote debugging a phone, drag a component across a full grid | Sustained frames under 16.7 ms; no dropped frames while dragging |
| Spark particle effect during a short circuit on a phone | Same, trigger a short | No visible stutter |
| Grid redraw cost | NFR design argues about 576 draw primitives fit an 8 ms budget on paper | Confirm on the phone; the first lever if it misses is glow radius |
| `completeGame` Lambda cold start with the engine imported | Invoke after a deploy, read CloudWatch `Init Duration` | No material regression against the existing Game Lambda |
| Web bundle size | `npm run build` | Main bundle grew about 45 kB gzip when the game was first routed; accept or code-split |

## Pass criteria
Backend: no regression in existing Game Lambda duration. Browser: the measured items above, on a phone, recorded in the summary. Until then the performance status is **"supported by measurement on a laptop, unverified on target hardware."**
