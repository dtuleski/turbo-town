# Backend Integration - NFR Requirements

**Unit**: U6 Backend Integration (Circuit Builder)
**Package**: `services/game`
**Stage**: CONSTRUCTION - NFR Requirements

This unit adds one CPU-bound computation to a Lambda whose existing cost is dominated by
network round trips. The three questions worth answering are therefore: how large a payload is
accepted, what the computation costs at the accepted ceiling, and what the engine import adds
to a cold start.

---

## 1. Payload size limit

| Requirement | Value |
|---|---|
| `MAX_CIRCUIT_SUBMISSION_CHARS` | **65536** characters of `JSON.stringify(circuitSubmission)` |
| Where measured | inside E1, on the parsed `circuitSubmission` object |
| Behaviour on breach | generic rejection; nothing is evaluated, persisted, or published |

### Derivation

Not picked. Computed from the engine ceilings, with maximum-length (64 character) ids
throughout, which is the worst payload a caller can legally submit:

| Part | Calculation | Characters |
|---|---|---|
| elements | 64 at about 300 chars each - id, kind, two terminals, position, params, punctuation | about 19 200 |
| connections | 128 at about 220 chars each - id, from, to, punctuation | about 28 160 |
| switch states | 64 entries at about 80 chars each | about 5 000 |
| `levelId`, `gridSize`, `environment`, `faultCount`, wrapper | - | about 400 |
| **total worst legal payload** | | **about 52 760** |

65536 gives roughly 24% headroom over that figure. It also sits three orders of magnitude
below the API Gateway and Lambda request size limits, which is the point: this ceiling binds
first, so the rejection is ours and is uniform.

### Why the ceiling is not applied to the raw request body

Measuring `event.body` in `src/index.ts` would be a global change affecting every operation on
a Lambda that deploys straight to production. Measuring the submission object is scoped to
Circuit Builder and risks nothing else.

**Residual, accepted and documented:** a caller can still post a multi-megabyte body that the
Lambda parses before E1 runs. That is pre-existing behaviour for all 23 existing games and is
out of this unit's scope. It is recorded here rather than silently left out.

### Supporting count ceilings

The size limit is a backstop. The binding constraints on work are the O(1) array-length gates,
checked before anything walks the arrays:

| Gate | Value | Source |
|---|---|---|
| element count | 1 to 64 | `MAX_ELEMENT_COUNT` (engine); lower bound U6's |
| connection count | 0 to 128 | `MAX_CONNECTION_COUNT` (engine) |
| switch-state key count | at most 64 | derived from `MAX_ELEMENT_COUNT` |

---

## 2. Evaluation cost at the element ceiling, in Lambda

Figures taken from
`aidlc-docs/construction/circuit-engine/nfr-requirements/nfr-requirements.md`, section 1,
"Evaluation cost at the ceiling". They are U2's measurements, not re-derived here.

| Pass | Complexity | At the ceiling | Operations |
|---|---|---|---|
| Gaussian elimination (A3) | `O(n^3 / 3)`, `n` = matrix dimension | `n` = 256 | about 5.6 million |
| Short-circuit search (A4) | `O(s * m^2)`, `s` sources, `m` conduction nodes | `s` = 64, `m` = 128 | about 1.05 million |
| Solved external-resistance test (A4) | `O(s)` | `s` = 64 | negligible |
| Validation, union-find, stamping, per-element results | `O(e + c + n^2)` | `e` = 64, `c` = 128 | negligible |
| **Total** | | | **about 6.7 million** |

| Case | Matrix `n` | Operations | Expected time |
|---|---|---|---|
| Adversarial ceiling, 64 elements | 256 | about 6.7 million | single-digit milliseconds |
| Realistic guided level, about 20 elements | about 20 | about 5 000 | microseconds |

### Per-submission budget

One submission performs **exactly one** `evaluate` call plus one `evaluateSuccess` call. The
latter is `O(roles x elements)` - four roles against at most 64 elements - which is negligible.

Peak memory is a 256 x 256 `Float64Array`, that is 512 KB, transient within the invocation.

### Conclusion

A `completeGame` request already performs several DynamoDB round trips, a CloudWatch
`PutMetricData`, an EventBridge `PutEvents`, and a Lambda `Invoke`: tens of milliseconds of
network latency. Single-digit milliseconds of arithmetic at the adversarial ceiling is not the
latency driver.

**No Lambda timeout change and no memory change is required.** E1's element ceiling is what
keeps this bounded: a caller cannot inflate the CPU cost, because an oversized element array
is rejected by an O(1) length check before the solver is reached.

---

## 3. Cold-start considerations for importing the engine

| Fact | Value | How established |
|---|---|---|
| Compiled size of `packages/shared/dist` | 114.5 KB of JavaScript | measured, recorded in the U6 plan |
| Of which `dist/circuit` | 88 KB | measured, recorded in the U6 plan |
| Already present in the Lambda package before U6 | yes | the deploy workflow copies all of `packages/shared/dist` regardless of what imports it |
| U6's marginal cold-start cost | the `require` of those modules on first invocation - low single-digit milliseconds | the files were already shipped; only the module evaluation is new |

The Lambda package already loads the AWS SDK v3 clients, `stripe`, and `graphql`. Adding the
parse and evaluation of 88 KB of pure arithmetic modules is a small fraction of that.

### Import placement requirement

Engine imports must sit at **module level**, never lazily inside a request path, so a warm
container parses them once and reuses them across invocations. This is safe because `evaluate`
is pure and stateless: no module-level mutable state, no clock, no random source. The design
rationale is in `nfr-design.md`, section 3.

### No new dependency

`zod` 3.22.4 is already a direct dependency of `services/game`, and `@memory-game/shared` is
already a dependency. **No package was added**, so neither the install time nor the package
size changes.

---

## 4. Security Baseline compliance

Per-rule assessment. A rule that this unit's artifacts cannot affect is marked N/A with the
reason, which is not a finding.

| Rule | Status | Rationale |
|---|---|---|
| **SECURITY-05** bounded input validation | **Compliant** | Every field of the submission is bounded before any processing. Counts and sizes are checked O(1) first; all numeric bounds are imported from the engine; every object schema is `.strict()`, so unknown keys are rejected rather than ignored. `safeParse` is used throughout, so the validator cannot throw. |
| **SECURITY-08** authorization on every request | **Compliant** | The Circuit Builder branch sits after the existing ownership check and in-progress check, both unchanged. Entitlement is enforced server-side in `startGame` via `PAID_GAMES`, before the theme is looked up, so a direct route call by a Free-tier user is refused. |
| **SECURITY-09** no internal detail in error responses | **Compliant** | One error class, `ValidationError`, and one constant message for every cause. `EvaluationError.issues[].detail` is never returned and never logged. At most the `errorCode` enum reaches CloudWatch. A test asserts that all eleven distinct rejection causes produce the identical message string. |
| **SECURITY-11** server-side authority over client claims | **Compliant** | The score is computed from `outcome.elements.length` and the shared success predicate, never from a client claim. A payload carrying a `score` or `scoreBreakdown` key is rejected outright by `.strict()`. A layout that does not satisfy the level objective earns no score. |
| **SECURITY-15** fail closed | **Compliant** | Every rejection path throws before `gameRepository.update`, so there is no partial score, no default score, no metric, and no leaderboard event. `evaluate` is additionally wrapped in explicit error handling that returns a generic rejection. The game stays `IN_PROGRESS`. |
| **SECURITY-03** no secrets or PII in logs | **Compliant** | Logging is a whitelist: `userId`, `gameId`, `levelId`, `stage`, `reason`, `errorCode`, `elementCount`, `faultCount`, `componentCount`, `score`. The layout is never logged, wholesale or in part. No token, email, or username is logged by the new code. |
| **SECURITY-01 / 02** authentication and session handling | **N/A** | This unit adds no authentication path. `userId` arrives from the existing Cognito-authorized context and is used unchanged. |
| **SECURITY-04** transport security | **N/A** | No new network endpoint, client, or transport is introduced. The submission rides the existing authenticated mutation. |
| **SECURITY-06 / 07** injection and output encoding | **N/A** | No SQL, no shell, no template rendering, no HTML output. The only persistence is a parameterized DynamoDB update through the existing repository. |
| **SECURITY-10** rate limiting | **N/A** | Rate limiting is enforced in `startGame` by the existing `RateLimiterService`, which this unit does not modify. No new unauthenticated or unmetered entry point is added. |
| **SECURITY-12 / 13** encryption at rest and key management | **N/A** | No new data store, no new key, no new encrypted field. The score and completion time are written to the existing Games table through the existing repository. |
| **SECURITY-14** dependency management | **Compliant, trivially** | No dependency was added. `zod` and `@memory-game/shared` were already direct dependencies. |
