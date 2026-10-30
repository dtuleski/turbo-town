# Circuit Engine - NFR Design

**Unit**: U2 Circuit Engine
**Package**: `packages/shared/src/circuit/`
**Stage**: CONSTRUCTION - NFR Design

How the engine meets the bounds and obligations in `nfr-requirements.md`. Numeric robustness
and determinism dominate, because a shared evaluator that disagrees with itself between the
browser and the Lambda would break server-authoritative scoring (FR-CB-21) in a way that is
very hard to diagnose from a rejected submission.

---

## 1. Partial pivoting

Gaussian elimination without pivoting fails on circuits that are perfectly ordinary. The
smallest case is a system whose first pivot is zero:

```
[ 0  1 ] [x]   [1]          Correct answer: x = 2, y = 1.
[ 1  0 ] [y] = [2]          Without a row swap the first division is by zero.
```

Zero diagonal entries arise naturally in Modified Nodal Analysis, because a source's branch
constraint row contributes only `+1` and `-1` incidence terms and no conductance, so its
diagonal entry is structurally zero. Pivoting is therefore not a refinement here; it is
required for the method to work at all. `matrix.test.ts` asserts this exact 2 by 2 case.

Per column, the implementation selects the row at or below the diagonal with the largest
absolute value, swaps it into place, and eliminates downward. Choosing the largest magnitude
also keeps the elimination multipliers at or below one in absolute value, which bounds the
growth of rounding error through the factorisation.

---

## 2. Scaled near-singularity tolerance

A column is declared singular when

```
|pivot| <= PIVOT_EPSILON * matrix.infinityNorm()
```

The infinity norm is the largest absolute row sum, computed once before elimination begins.

An **absolute** threshold would be wrong in both directions, because circuit conductances span
a wide range: `MIN_RESISTANCE` of 1 ohm gives a conductance of 1, `MAX_RESISTANCE` of 10 000
ohm gives 1e-4. A fixed 1e-12 cutoff would be far too lenient for a system built entirely from
1 ohm resistors and far too aggressive for one built from 10 kilo-ohm resistors. Scaling by the
norm makes the test relative to the magnitudes actually present, so a milliamp-scale and a
kiloamp-scale circuit are judged alike.

An all-zero matrix has a zero norm, so the test becomes `|0| <= 0`, which is true: an all-zero
system is correctly singular. `matrix.test.ts` asserts that case explicitly rather than leaving
it to inference.

Singularity is **returned, not thrown**: `solveGaussian` yields `{ singular: true, pivotRow }`.
An ideal source across a zero-ohm path genuinely has no solution, and that is a circuit
condition the player caused, not a program defect. A4 turns it into a `SINGULAR_SYSTEM` fault
and the player sees an explanation.

---

## 3. Floating-point comparison strategy

| Rule | Implementation |
|---|---|
| Never compare a computed float with `===` | Named epsilons per quantity: `CURRENT_EPSILON`, `VOLTAGE_EPSILON`, `PIVOT_EPSILON` |
| One epsilon per physical quantity, not one global tolerance | A current tolerance and a pivot tolerance answer different questions and differ by three orders of magnitude |
| No `Infinity` or `NaN` may escape | `totalResistance` is `0` when no current flows, never a division by zero. `clamp` returns its lower bound for a non-finite input. `clamp01` returns 0 for a non-finite input. |
| Guard at every boundary | `Number.isFinite` and `Number.isInteger` in `validateStructure` and in `clampFaultCount` |
| JSON-safe output | Asserted directly: `JSON.parse(JSON.stringify(result))` deep-equals the result |

The `=== 0` comparisons that do appear are on values that are **exactly** zero by construction -
a pivot already proven to be zero, or a structural literal - not on the result of a physical
calculation.

Test tolerances are tight on purpose. Reference currents are asserted to 12 decimal places, and
the unbalanced bridge is asserted against an independently computed Thevenin value to within
5e-13. A loose tolerance would hide exactly the drift these tests exist to catch.

---

## 4. Determinism

Four rules, all enforced by tests rather than by convention.

1. **Canonical node ordering uses a code-unit comparator.** `compareIds` is
   `a < b ? -1 : a > b ? 1 : 0`. **`localeCompare` is prohibited**: it is locale-dependent, so
   the canonical representative of a merged node set - and therefore the entire downstream
   float accumulation order - could differ between a browser in one locale and a Lambda in
   another. That failure would appear as a server rejection of a layout the player watched
   succeed, with nothing in the payload to explain it.
2. **Stamping order is sorted element id.** Floating-point addition is not associative, so the
   order contributions accumulate changes the last bits of the result. Sorting by element id
   makes that order depend on the circuit's contents, never on the order the input arrays
   happened to arrive in. `evaluate.property.test.ts` asserts **bitwise** equality with
   `Object.is` after shuffling both input arrays, which is the property this rule buys.
3. **No ambient non-determinism.** No `Math.random`, no `Date.now`, no `performance.now`, and
   no module-level mutable state anywhere in `src/circuit/`. Verified by grep.
4. **Switch states are read by explicit lookup.** `Object.keys` iteration order on
   `SwitchStates` is insertion-ordered and therefore input-dependent, so it never drives
   computation. `switchStateOf(switches, id)` does a guarded single lookup. Where validation
   does iterate keys, it sorts them first so the issue list is also order-independent.

Dijkstra and the connected-component search are made deterministic the same way: nodes are
visited in sorted order, adjacency lists are built from an edge array sorted by element id, and
distance ties resolve to the smallest node id through strict comparison. So the *chosen* minimum
path - which becomes a fault's element list and the spark's coordinate - is stable, not merely
the path's length.

---

## 5. Purity

| Rule | How |
|---|---|
| No browser or Node API | No `window`, `document`, `localStorage`, `sessionStorage`, `process.*`, `fs`, or `require(`. Verified by grep in the implementation summary. |
| No logging | No `console.*`. A pure function has nothing to log, and anything it did log would be a SECURITY-03 surface. |
| No module-level mutable state | Every exported registry - `ELEMENT_SPECS`, `CIRCUIT_LIMITS`, `LEVELS`, `MACHINES`, `SUCCESS_CONDITIONS`, `ROLE_ACTIVATION_RULES` - is `Object.freeze`d |
| Immutable output | `evaluate` freezes the result, its element array and each element, its fault array and each fault, and the node-voltage map |
| No input mutation | `solveGaussian` clones the matrix and copies the right-hand side; `listLevels` and `listMachines` return fresh arrays |
| No caller-owned object inside the result | Every object the result holds is engine-owned, so freezing the result cannot reach the caller's layout. `locateFaultPosition` therefore copies the element's `GridPosition` instead of returning it: handing the layout's own object back would freeze it as a side effect of evaluation, and C3's next in-place drag update - `position.col = next` - would throw a `TypeError` under module strict mode. Asserted in `evaluate.test.ts` and `faults.test.ts`. |
| ES2020 compatible | Verified with `tsc -p tsconfig.lambda.json --noEmit`. No `Array.prototype.at`, no `Object.hasOwn`, no `structuredClone`. Property existence uses `Object.prototype.hasOwnProperty.call`. |

`Object.prototype.hasOwnProperty.call` is also the prototype-pollution guard: `getLevel('toString')`,
`getMachine('toString')`, and an activation rule named `toString` all resolve to `undefined`
rather than to an inherited function. Each has a test.

---

## 6. The `Matrix` abstraction

`tsconfig.json` sets `noUncheckedIndexedAccess: true`, which is correct for the package and
awkward for numeric code: both `number[]` and `Float64Array` indexing yield `number | undefined`.
Scattering non-null assertions across an elimination loop would defeat the flag precisely where
an off-by-one is most likely and hardest to spot.

`matrix.ts` is therefore the **single** place that reconciles the two. Every matrix and vector
read goes through `Matrix.get` / `Matrix.set` / `Matrix.add` / `readVector`, each of which
bounds-checks its index and throws a `RangeError` on violation. The rest of the engine indexes
nothing raw.

Those throws are programming-error guards on internal invariants, not input validation. They
are unreachable from a player payload, because `validateStructure` has already bounded every
count and range before any matrix exists. If one ever did fire, `evaluate`'s wrapper converts it
into an `INTERNAL_ERROR` outcome, so even a defect fails closed rather than propagating an
exception into a Lambda handler.

---

## 7. Fail-closed defaults

Every ambiguous case resolves to the less powerful outcome.

| Situation | Resolution |
|---|---|
| Switch with no entry in `SwitchStates` | reads as **open**, so an incomplete map de-energizes |
| Unknown activation rule string | `false`, the role stays unpowered |
| Unknown machine id | `unmetClauses: ['unknownTargetMachine']`, objective unmet |
| Unknown success condition id | `unmetClauses: ['unknownSuccessCondition']`, objective unmet |
| Malformed `faultCount` | `wasMalformed: true`, and U6 rejects |
| Unexpected internal failure | `INTERNAL_ERROR` with an empty issue list |
| Singular system | a fault with zeroed element values, never a plausible-looking number |

None of these throw, so a content error or a hostile payload degrades the outcome rather than
breaking the request.

---

## 8. Complexity budget

`.eslintrc.js` warns at cyclomatic complexity 10 and 50 lines per function. `src/circuit/`
reports **zero errors and zero warnings**.

Keeping inside the budget drove real decomposition rather than cosmetic splitting:

| Function | Extracted helpers |
|---|---|
| `solveGaussian` | `selectPivot`, `eliminateColumn`, `backSubstitute` |
| `minimumResistancePath` | `selectNearest`, `relaxFrom`, `reconstructPath` |
| `buildConductanceMatrix` | `internalNodesOf`, `assignNodeIndices`, `stampConductance`, `stampSource` |
| `deriveElementResults` | `inertResult`, `edgeResult`, `sourceCurrents`, `energizedNodes` |
| `resolveTopology` | `conductorRoleOf`, `graphEdgeFor`, `buildConductionGraph` |
| `detectFaults` | `detectShortCircuits`, `detectLoadFaults`, `sourceElementIds`, `shortCircuitPathElements`, `isOverdrawn`, `compareFaults` |
| `resolveNodeIdentity` | `canonicalMapFrom` |
| `validateStructure` | one validator per concern, plus `checkRange`, `isInsideGrid`, `validateEndpoints` |

Each helper is independently testable, which is why the Dijkstra tie-breaking rule and the
pivot selection rule have tests of their own rather than being verified only through
`evaluate`.
