# Circuit Engine - NFR Requirements

**Unit**: U2 Circuit Engine
**Package**: `packages/shared/src/circuit/`
**Stage**: CONSTRUCTION - NFR Requirements

`NFR-CB-4` requires smooth rendering "at the maximum supported component count" but never
defines that count. This document defines it, together with every other numeric bound the
engine enforces, and derives the resulting solver cost.

**These values are the single source of truth.** E1 (backend layout validation, unit U6) and D2
(browser memo sizing, unit U3) must import them from
`packages/shared/src/circuit/constants.ts` rather than redefining them. A second copy of a
bound is a second thing to get wrong, and the whole point of putting the engine in
`packages/shared` is that the browser and the server agree.

---

## 1. Numeric bounds - decision (a)

Exported individually and as the frozen `CIRCUIT_LIMITS` object.

| Constant | Value | Rationale |
|---|---|---|
| `MAX_ELEMENT_COUNT` | 64 | Eight kinds at eight each is a generous sandbox. Guided levels use 12 or fewer. This value caps the solver matrix, so it is not arbitrary. |
| `MAX_CONNECTION_COUNT` | 128 | 64 elements carry 128 terminals. Pairing every terminal exactly once needs only 64 connections, so 128 leaves headroom for star joins where one terminal feeds several others. |
| `MAX_GRID_COLS` / `MAX_GRID_ROWS` | 24 / 16 | 384 cells, six times the element ceiling, so placement is never cramped. The 3:2 ratio suits both the desktop shell and the full-screen mobile canvas (NFR-CB-10). |
| `MIN_GRID_COLS` / `MIN_GRID_ROWS` | 2 / 2 | A circuit needs at least two cells. |
| `MAX_ID_LENGTH` | 64 | SECURITY-05 string length bound. A UUID plus a prefix fits. |
| `MIN_SOURCE_VOLTAGE` / `MAX_SOURCE_VOLTAGE` | 1.5 / 12 | AA cell to car battery: recognisable, all low-voltage, and never teaching a child mains values. Satisfies the "defined safe range" of FR-CB-7. |
| `SOURCE_VOLTAGE_STEP` | 0.5 | Granularity of the variable battery control. |
| `MIN_LIGHT_LEVEL` / `MAX_LIGHT_LEVEL` | 0 / 1 | Normalised fraction; solar output is a function of it. |
| `MIN_RESISTANCE` / `MAX_RESISTANCE` | 1 / 10000 | The lower bound sits **at** the short-circuit threshold, so a legal resistor can never register as a short under the strict comparison. The upper bound keeps the conductance ratio at 1e4, far inside double precision. |
| `MAX_MATRIX_DIMENSION` | 256 | Derived, see below. |

### `MAX_MATRIX_DIMENSION` derivation

Not guessed. Every element declares two terminals, and in the worst case none of them merge:

```
terminal nodes          = 2 * MAX_ELEMENT_COUNT  = 2 * 64 = 128
internal source nodes  <=     MAX_ELEMENT_COUNT  =      64     (one per source, if every element is a source)
source branch unknowns <=     MAX_ELEMENT_COUNT  =      64
                                                   ---------
total unknowns                                   =     256
```

Grounding one node per connected component only ever **removes** unknowns, so 256 is a true
ceiling. `buildConductanceMatrix` throws a `RangeError` above it, which `evaluate` converts into
an `INTERNAL_ERROR` outcome rather than letting it escape - defence in depth behind the
validation that already bounds the element count.

### Evaluation cost at the ceiling

One `evaluate` call has two costly passes, not one. The solve dominates, but the fault pass is
the same order of magnitude at the ceiling and belongs in the budget.

| Pass | Complexity | At the ceiling | Operations |
|---|---|---|---|
| Gaussian elimination (A3) | `O(n^3 / 3)`, `n` = matrix dimension | `n` = 256 | about 5.6 million |
| Short-circuit search (A4) | `O(s * m^2)`, `s` = sources, `m` = conduction-graph nodes | `s` = 64, `m` = 128 | about 1.05 million |
| Solved external-resistance test (A4) | `O(s)` | `s` = 64 | negligible |
| Everything else - validation, union-find, stamping, per-element results | `O(e + c + n^2)` | `e` = 64, `c` = 128 | negligible against the above |
| **Total** | | | **about 6.7 million** |

| Case | Matrix `n` | Total operations | Expected time |
|---|---|---|---|
| Absolute ceiling | 256 | about 6.7 million | single-digit milliseconds |
| Realistic guided level | about 20 | about 5 000 | microseconds |

#### Fault-pass derivation

`detectShortCircuits` runs one Dijkstra per source over the **conduction** graph, which is
indexed by raw terminal ids rather than by matrix unknowns, so `m <= 2 * MAX_ELEMENT_COUNT = 128`
- there are no internal source nodes and no branch unknowns in that view. `selectNearest` scans
every node to pick the next one to settle, giving `O(m^2)` per source, and both ceilings are
reachable at once: 64 batteries carry exactly 128 terminals.

```
64 sources * 128^2 = 64 * 16 384 = 1 048 576
```

Edge relaxation adds `O(c + e) = O(192)` per source, which is three orders of magnitude smaller
and rounds away. A linear scan rather than a binary heap is deliberate: at `m = 128` the scan
wins on constant factor, and it is what makes the tie-breaking rule in `nfr-design.md` section 4
exact, which the fault's element list and the spark coordinate depend on.

A realistic level is three orders of magnitude cheaper than the ceiling. D2's memoization means
a 60 fps render loop never pays even the realistic cost twice for the same circuit state, so
`NFR-CB-4` holds on mid-range mobile hardware with a wide margin. The ceiling cost is only
reachable in the sandbox, with all 64 components placed, none of them merging, and every one of
them a source.

---

## 2. Short-circuit threshold - decision (b)

`SHORT_CIRCUIT_RESISTANCE_THRESHOLD = 1.0` ohm, compared with a **strict** `<`. One threshold,
two measurements, because no single one covers every reachable layout:

1. the minimum-resistance **passive path** between a source's terminals, with **every source
   excluded** so neither the model's internal resistance nor another battery counts as
   something the player built
2. the **solved external resistance** a source is driving, `|terminal voltage| / |current|`,
   evaluated only when the system solved

| Player-buildable case | Passive path | Solved external R | Trips? |
|---|---|---|---|
| wire, or closed switch | 0 ohm | 0 ohm | yes |
| smallest legal resistor | 1 ohm | 1.0 ohm | no, strict comparison |
| LED, the smallest fixed load | 30 ohm | 30 ohm | no |
| two batteries on common rails feeding a motor | no path | about 120 ohm each | no |
| two batteries in series, loop closed by wire | no path | 0 ohm each | yes |

Because `MIN_RESISTANCE` equals the threshold and the comparison is strict, no single resistance
a player can legally build lands in an ambiguous zone. Parallel combination can drop below
1 ohm - two 1 ohm resistors give 0.5 ohm - and the solved test reports that as a short, which is
correct: 9 V across 1.0 ohm total draws 9 A.

Both measurements are needed. The passive test alone reports a false short on parallel
batteries, because a route through a second battery costs only its 0.5 ohm internal resistance.
Excluding every source fixes that but would then miss two batteries in series shorted by a wire,
where no passive route exists yet 18 A flows. Rationale and worked numbers are in
`functional-design.md` section 6.

---

## 3. Numeric tolerances

| Constant | Value | Applies to |
|---|---|---|
| `CURRENT_EPSILON` | 1e-9 | current magnitude treated as zero |
| `VOLTAGE_EPSILON` | 1e-9 | voltage difference treated as zero |
| `PIVOT_EPSILON` | 1e-12 | scaled by the matrix infinity norm to decide near-singularity |
| `ENERGIZE_THRESHOLD_RATIO` | 0.05 | fraction of rated current below which a load reads as unpowered |
| `MIN_VISIBLE_INTENSITY` | 0.08 | brightness floor so a dim load is still visible |
| `INTENSITY_GAMMA` | 2.2 | perceptual exponent of the brightness curve |

Rationale for the scaled pivot tolerance is in `nfr-design.md` section 2.

---

## 4. Historical fault count - decision (c)

`faultCount` counts events over time. A final layout cannot reconstruct it, because faults are
history and the layout is a snapshot. E2's design note asks this unit to decide how to constrain
it.

**Mechanism** (`MAX_FAULT_COUNT_PER_LEVEL = 20`, `clampFaultCount(reported, level)`):

| Reported value | Result |
|---|---|
| Not a non-negative integer | `{ value: 0, wasClamped: true, wasMalformed: true }` |
| Above `level.maxFaultCount ?? 20` | clamped down, `wasClamped: true` |
| In range | passed through unchanged |

**Recommended use by U6:**

1. **Reject** the submission when `wasMalformed` is true, rather than silently coercing it
   (SECURITY-05). Silent coercion turns a malformed payload into a scored game.
2. Accept the clamped value when only `wasClamped` is true.
3. **Floor the total fault penalty in E3** so a score can never go negative, which is the
   failure mode an absurd value such as 1e9 would otherwise cause.

**Why 20:** each short carries a score penalty (FR-CB-24), and beyond roughly twenty the penalty
already floors the score. A higher ceiling therefore changes no outcome, while an unbounded
value could drive a score negative or distort the breakdown.

**Residual risk, stated plainly:** the clamp bounds **over**-reporting only. Under-reporting
remains unprovable in either direction, and no clamp changes that. A player who reports zero
faults after causing five is indistinguishable from one who caused none. This is bounded,
documented residual trust - not a closed hole. Closing it would require the client to stream
fault events to the server during play, which is out of scope for this feature.

---

## 5. Purity and determinism

| Requirement | Obligation on this unit |
|---|---|
| FR-CB-15 | No React, DOM, browser, or Node API anywhere in `src/circuit/`. Verified by grep in the implementation summary. |
| FR-CB-15 | Deterministic: identical input yields a deep-equal result, and per-element currents are bitwise identical. |
| FR-CB-16 | Compiles for the Lambda's ES2020 target, verified with `tsconfig.lambda.json`. No ES2022-only API. |
| FR-CB-21 | `evaluate` holds no state between calls, so the Lambda can reuse the module across invocations without leaking one player's circuit into another's. |
| NFR-CB-4 | Bounded work: every input dimension has a ceiling in section 1. |

No memoization lives in this package. Caching is D2's responsibility precisely so the engine
stays pure and safe to reuse in a Lambda.

---

## 6. Testability - NFR-CB-24

| Required coverage | Where |
|---|---|
| Connectivity | `topology.test.ts`, `evaluate.test.ts` |
| Open and closed switches | `topology.test.ts`, `solver.test.ts`, `evaluate.test.ts` |
| Series versus parallel | `solver.test.ts`, `evaluate.test.ts` |
| Resistance and current bounds | `solver.test.ts`, `evaluate.test.ts`, `evaluate.property.test.ts` |
| Short-circuit detection | `faults.test.ts`, `evaluate.test.ts` |
| Determinism | `evaluate.test.ts`, `evaluate.property.test.ts` |

Property tests run with a fixed seed so a counterexample is reproducible rather than a
once-seen flake.

---

## 7. Security compliance

Security Baseline is enabled for this feature (`aidlc-docs/aidlc-state.md`, Q4=A). The engine is
a pure computational module in a shared library: it opens no socket, touches no store, and
serves no HTTP. Rules below marked N/A are N/A for that reason, which is not a blocking finding.

| Rule | Status | Basis |
|---|---|---|
| SECURITY-01 Encryption | **N/A** | No data store. The engine persists nothing. |
| SECURITY-02 Access logging | **N/A** | No network intermediary. |
| SECURITY-03 App logging | **Compliant** | The engine emits no log output at all, so no token or PII can appear in it. Verified: no `console.*` in `src/circuit/`. |
| SECURITY-04 HTTP headers | **N/A** | Serves no HTTP response. Addressed by U1 (PRE-2). |
| SECURITY-05 Input validation | **Compliant** | `validateStructure` type-checks every field, bounds every string length, bounds every count and numeric range, and rejects unknown element kinds against an allowlist. Section 1 supplies the bounds. |
| SECURITY-06 Least privilege | **N/A** | No IAM policy. |
| SECURITY-07 Network config | **N/A** | No network layer. |
| SECURITY-08 Access control | **N/A** | No endpoint. Entitlement is U6's server-side gate. |
| SECURITY-09 Hardening | **Compliant** | Error outcomes carry a stable code and a structural issue list only. No exception message, no stack trace, and nothing from a caught value is copied into the result. |
| SECURITY-10 Supply chain | **Compliant** | One devDependency added, `fast-check@^3.23.2`, from the official npm registry, recorded in the lock file. It is a test-only dependency and ships in no bundle. The **3.x major line** is the one already in use server-side: `services/leaderboard` declares `^3.15.0` and resolves to 3.23.2 today, so this package pins the version that line actually installs rather than a looser range. `apps/web` is on 4.x, which is browser-only and not shared with this package. |
| SECURITY-11 Secure design | **Compliant** | The engine is the isolated module that server-side re-evaluation depends on, which is what makes FR-CB-21 enforceable. Misuse case addressed: a tampered layout submitted to `completeGame` is re-evaluated by this identical function, and `evaluateSuccess` fails closed on unknown ids. |
| SECURITY-12 Authentication | **N/A** | No credential handling. |
| SECURITY-13 Integrity | **Compliant** | No deserialization of untrusted input: `evaluate` accepts already-parsed values and validates them structurally before use. No external resource is loaded. |
| SECURITY-14 Alerting | **N/A** | No alarm or log group owned by this unit. |
| SECURITY-15 Exception handling | **Compliant** | `evaluate` never throws: the body is wrapped and returns `INTERNAL_ERROR` on any unexpected failure. Fail closed throughout - a missing switch entry reads as open, an unknown activation rule resolves to `false`, an unknown success condition fails the objective. No resource is held, so there is nothing to leak on an error path. |

**No blocking security finding for this unit.**
