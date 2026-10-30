# Levels and Learning - NFR Requirements

**Unit**: U4 "Levels and Learning" - **Packages**: `apps/web`, `packages/shared`

Numbers come from commands run in this unit. Browser behaviour was not observed and is marked unverified.

---

## 1. Bundle impact

Measured with `npm run build` in `apps/web` (tsc then vite build), run in this step.

| Metric | Before (U3 baseline, from the unit brief) | After (this unit) | Delta |
|---|---|---|---|
| Modules transformed | 1504 | 1547 | +43 |
| Main JS chunk, gzip | 448.89 kB | 493.77 kB | +44.88 kB (+10.0%) |
| Main JS chunk, raw | not recorded in the brief | 1,707.09 kB | - |
| CSS, gzip | not recorded | 14.48 kB (96.19 kB raw) | - |

Cause: the shared circuit engine and the three pages are now reachable through the registered routes, and the
pages are not code-split (same as the Mini Golf precedent). The build succeeds; the only warning is the
pre-existing "chunks are larger than 500 kB" notice. **N1**: the delta is accepted for this unit; lazy-loading the
three pages is the remedy if the budget is revisited (not done here).

The "before" figures are the U3 numbers carried in the task context; this step did not rebuild the pre-U4 tree.

---

## 2. Session timing and failure behaviour

| ID | Requirement | Value | Enforced by |
|---|---|---|---|
| N2 | Settle window before submitting a solved circuit | 750 ms default (`DEFAULT_SETTLE_MS`) | session tests with a manual scheduler, no real timers |
| N3 | Completion time sent | integer seconds in `[difficulty * 2, 3600]` | `clampCompletionSeconds` tests |
| N4 | `completeGame` calls per settled solve | at most 1 | flapping and 50-frame tests |
| N5 | `startGame` calls per page mount, including StrictMode | exactly 1 | idempotence test (service level only) |
| N6 | Failed submit | circuit and celebration remain; Retry resubmits the same snapshot | submitFailed tests |
| N7 | Rejected circuit | player returns to editing; no auto-resubmit of the identical circuit | rejected tests |
| N8 | Every start failure | routed to a page (subscription, rate limit or setup), never a dead screen | `routeForStartOutcome` tests |

The server also enforces `completionTime <= 3600`; there is no client-side countdown that ends an attempt.

---

## 3. Cleanup

| ID | Requirement |
|---|---|
| N9 | Every timer is cancelled on `detach()` and on a new snapshot; the schedule seam returns a cancel function |
| N10 | The session listener list is cleared on `detach()`; the React hook subscribes with `useSyncExternalStore`, which unsubscribes on unmount, so no state update is pushed to an unmounted component (React-side ordering is not covered by an automated test) |
| N11 | A response arriving after `detach()` updates state without throwing and schedules nothing |
| N12 | `start()` after `detach()` (StrictMode remount) re-attaches without a second `startGame` |
| N13 | The Game page mounts the guided body keyed by level id, so Next level builds a fresh session |

---

## 4. Security baseline mapping

Extension: `extensions/security/baseline/security-baseline.md`. The unit is a browser feature plus additive
shared data; most infrastructure rules do not apply.

| Rule | Status | Rationale |
|---|---|---|
| SECURITY-01 Encryption at rest and in transit | N/A | No data store created; transport is the existing Apollo client |
| SECURITY-02 Access logging | N/A | No network intermediary added |
| SECURITY-03 Application logging | Compliant by omission | No `console.*` with circuit data; a test asserts the session source has none |
| SECURITY-04 HTTP security headers | N/A | `apps/web/vercel.json` and `SECURITY-HEADERS.md` untouched (owned by another unit) |
| SECURITY-05 Input validation | Compliant | URL query parsed by `parseGameSearch`, which rejects non-integers, out-of-range, unknown, sandbox and tier-mismatched levels and never throws; the server's strict schema is the authority |
| SECURITY-06 Least privilege | N/A | No IAM change |
| SECURITY-07 Network configuration | N/A | No infrastructure change |
| SECURITY-08 Application-level access control | Compliant | Free tier gate on the setup page is advisory; the server `PAID_GAMES` check is authoritative; server Free-tier errors route to the subscription page |
| SECURITY-09 Hardening | N/A | No deployed component added |
| SECURITY-10 Supply chain | Compliant | No dependency added |
| SECURITY-11 Secure design | Compliant | Scoring is the server's; the client has no score field and no local score computation |
| SECURITY-12 Authentication | N/A | The routes sit inside the existing `ProtectedRoute` |
| SECURITY-13 Data integrity | Compliant | Submission payload rebuilt by whitelist; server re-evaluates the circuit |
| SECURITY-14 Alerting | N/A | No monitoring component |
| SECURITY-15 Exception handling and fail-safe defaults | Compliant | `classifyStartFailure` never throws; unknown input fails to `failed`; null result or blown fuse deactivates every rover role (fail closed); generic localized errors, no stack or server text displayed; no unhandled rejection from `start()` |

N/A determinations are not blocking findings.

---

## 5. Accessibility

| ID | Requirement | Evidence |
|---|---|---|
| N14 | State is never conveyed by colour alone | Rover: spoke angle, chevrons, beams versus dashed outline, sound arcs, solar rays, glyphs and a text row for each role. Readout: glyph plus word |
| N15 | Interactive targets at least 44 px | `min-h-[44px]` on setup buttons, fuse reset and fault card buttons (class presence; pixels unverified without a browser) |
| N16 | Reduced motion | Wheels spin only when `reducedMotion` is false; the fault card has no transition or animation classes under reduced motion |
| N17 | One live region for faults | The fault card is `role="tooltip"` with no `aria-live`; the existing status span is `sr-only` so assistive tech hears it once |
| N18 | Escape dismisses the fault card; a new fault event re-shows it | keyed to the fault effect key |
| N19 | No digits or unit tokens in tier-none copy | `circuitLevelCopy.test.ts` |
| N20 | Locale parity | 175 leaf keys under `circuitBuilder` in en, es and pt (counted in this step), 120 added per file; `{{...}}` placeholder sets equal across the three |

Full WCAG validation needs manual testing with assistive technologies and expert review; none was done here.

---

## 6. Performance

| ID | Requirement | Note |
|---|---|---|
| N21 | No per-frame work added | The session observes frames keyed on layout, switches, environment, result and fuse state, not the 1 s tick |
| N22 | Presentation is a pure function of the engine result | Recomputed only when the frame changes |
| N23 | Rover is inline SVG primitives, no image assets | no network fetch |
| N24 | Bundle growth | section 1; accepted, not optimized |
