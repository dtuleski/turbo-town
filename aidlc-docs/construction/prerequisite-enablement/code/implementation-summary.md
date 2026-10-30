# U1 Prerequisite Enablement - Implementation Summary

**Unit**: U1 Prerequisite Enablement
**Stage**: CONSTRUCTION - Code Generation
**Requirements**: PRE-1.1, PRE-1.2, PRE-1.3, PRE-2 (SECURITY-04, SECURITY-09, SECURITY-15)
**Design**: `aidlc-docs/construction/prerequisite-enablement/functional-design/functional-design.md`
**Status**: Implemented, uncommitted. No Circuit Builder feature code. No new `GameType` (PRE-1.3 held).

---

## 1. Changes per file

| File | Change |
|---|---|
| `services/leaderboard/src/services/scoring.service.ts` | Added the module constant `MAX_SCORE_CAP = 8000` with a doc comment recording the root cause and why existing behaviour is preserved. Replaced 15 identical copies of the three-line block `// Cap by difficulty... / const maxScoreByDiff = difficulty <= 1 ? 5000 : difficulty <= 2 ? 6500 : 8000; / finalScore = Math.min(maxScoreByDiff, ...)` with the single line `finalScore = Math.min(MAX_SCORE_CAP, Math.max(0, Math.round(finalScore)));`. `Difficulty` stays a string enum. No formula, multiplier, bonus, or validation rule altered. |
| `services/leaderboard/src/services/leaderboard.service.ts` | **Comment only, no logic.** The stale doc comment on `calculateRanks` claimed "entries with the same score get the same rank", which has never matched the code. It now describes the completion-time tie-break the method actually implements and points at the open product question. |
| `services/leaderboard/tests/event.handler.test.ts` | Added the required `score: 1800` to the `createTestEvent` fixture, fixing a TS2322 that stopped the suite compiling. Re-pointed four assertions that expected `scoringService.calculateScore` to be called: one asserts it is **not** called, three assert the event score and metadata reach `createLeaderboardEntry`. Matches the handler's documented design that the Game Service score is the single source of truth. |
| `services/leaderboard/tests/leaderboard.service.test.ts` | Renamed `should handle tied scores with same rank` to `should break a score tie on completion time` and corrected the assertions to ranks 1, 2, 3, with a comment recording that this pins current behaviour rather than endorsing it. |
| `services/leaderboard/tests/leaderboard.service.property.test.ts` | The rank-consistency property now asserts that equal scores share a rank only when completion times also match, and that otherwise the faster entry ranks better. Also removes a seed-dependent flake. |
| `services/leaderboard/tests/scoring.service.test.ts` | The two Language Learning multiplier assertions changed from 1.5 and 2.0 to 1. Each carries a comment stating in capitals that it **pins a confirmed bug, not correct behaviour**, with the intended value and a pointer to this summary. |
| `apps/web/vercel.json` | Added a `headers` block for `source: "/(.*)"`. Four headers enforcing; the CSP staged as `Content-Security-Policy-Report-Only`. `buildCommand`, `outputDirectory`, `framework` and the existing `rewrites` entry unchanged. |
| `apps/web/SECURITY-HEADERS.md` | New. Documents the staged policy adjacent to `vercel.json`, since JSON has no comments and Vercel validates header entries against a `{ key, value }` schema. Contains the one-line flip instruction, the full policy, the browser verification checklist, and the known `/traffic-sim.html` breakage. |
| `apps/web/src/main.tsx` | `ErrorBoundary` no longer puts `error.message` or `error.stack` in state or in the DOM. State is now `{ hasError: boolean }`. The fallback shows a generic message with "Reload page" and "Go to Hub". `componentDidCatch` logs only `error.name`. |

Also created: this summary, the functional design, and `.agents/tasks/u1/verification.md` (workflow
scratch, holds full command output).

Nothing else was modified. `packages/shared`, `services/game`, `infrastructure/`, `.github/`,
`aidlc-docs/aidlc-state.md` and `aidlc-docs/audit.md` were not touched.

---

## 2. Root cause and fix, in brief

`Difficulty` is a string enum in the Leaderboard Service, and that is correct: `services/game`
converts its numeric difficulty to a label (`'EASY' | 'MEDIUM' | 'HARD'`) before publishing the
`GameCompleted` event, in `game.service.ts` `completeGame`. The defect was 15 copies of a numeric
comparison copied in from the Game Service, where difficulty really is a number.

Because `Number('EASY')` is `NaN` and every relational comparison with `NaN` is `false`, that
expression has always resolved to 8000 at runtime, for every label. The replacement constant keeps
that exact value, so no score changes. Applying the tiered caps the deleted comment described would
have lowered easy and medium maximum scores for every existing game - a product decision, not made
here.

---

## 3. Owner decisions applied

The brief's test criterion assumed the `Difficulty` mismatch was the only breakage. It was not. The
owner revised the completion criterion and ruled on each finding individually.

| # | Decision | Applied as |
|---|---|---|
| 0 | Revised criterion: type-check exits 0; previously uncompilable suites now run; pre-existing failures unrelated to the fix are documented, not fixed | Sections 4 and 5 below |
| 1 | Rank ties: behaviour-preserving. Correct the stale doc comment and the tests; record as a product question the owner may revisit | `leaderboard.service.ts` comment, two test suites; question recorded in section 6 |
| 2 | Language Learning multipliers: behaviour-preserving, but written up as a **confirmed bug**, with the tests phrased as pinning current behaviour pending a decision - not as if 1.0 were correct | Two assertions changed to 1 with explicit comments; bug, exact fix and exact consequence in section 6 |
| 3 | Auth tests: leave them, document only, and state positively that they are stale because the implementation became more secure | Section 5 group B |
| 4 | `/traffic-sim.html`: leave broken, do **not** delete, do **not** add a carve-out | No file change; documented in section 7 R1 and in `SECURITY-HEADERS.md` |
| 5 | Split headers by breakage risk: enforce the four safe ones now, ship the CSP report-only, document the flip adjacent to the config, and do not claim SECURITY-04 is met | `vercel.json`, `SECURITY-HEADERS.md`, section 8 |

---

## 4. Verification results

Full command output is in `.agents/tasks/u1/verification.md`.

### 4.1 `services/leaderboard` type-check - the headline

| | Result |
|---|---|
| Before (HEAD, unmodified) | `npx tsc --noEmit` exit **1**, 30 x TS2365 across 15 call sites in `scoring.service.ts` |
| After | `npx tsc --noEmit` exit **0** |

This was the real blocker for later units: U7 cannot add a Circuit Builder `GameType` to a service
that does not compile.

### 4.2 `services/leaderboard` tests

| Run | Test Suites | Tests |
|---|---|---|
| Before | 6 failed, 5 passed, 11 total | 8 failed, 99 passed, 107 total |
| After | 3 failed, **8 passed**, 11 total | **9 failed, 155 passed, 164 total** |

The total rises from 107 to 164 because three suites could not compile at HEAD and ran no tests at
all. 57 previously unrunnable tests now execute. Four suites moved to green:
`scoring.service.property.test.ts`, `event.handler.test.ts` (15/15), `leaderboard.service.test.ts`
and `leaderboard.service.property.test.ts`.

### 4.3 `apps/web`

| Command | Result |
|---|---|
| `npm run type-check` | exit **0** |
| `npm run build` | exit **0** - `dist/index.html` 0.91 kB, `dist/assets/index-*.css` 91.43 kB, `dist/assets/index-*.js` 1,578.77 kB |
| `npm run lint` | exit **1** - 114 problems (89 errors, 25 warnings), **all pre-existing** |

Lint was failing before this change. Proven without `git stash`, `git reset` or `git checkout`:
`vercel.json` and `SECURITY-HEADERS.md` are not linted (`eslint . --ext ts,tsx`);
`npx eslint src/main.tsx --ext ts,tsx --report-unused-disable-directives --max-warnings 0` exits 0
with no output; filtering the full lint run for `main.tsx` returns no line at all; the problem count
is identical before and after; and every one of the 89 errors is in a game or utility file this unit
never wrote to (`TicTacToeGamePage.tsx`, `TrafficLabGamePage.tsx`, `pronunciationScoring.ts`,
`scratchCodingUtils.ts` and others), all `no-explicit-any`, `no-unused-vars`, `prefer-const`,
`no-empty`, `no-control-regex` or `react-hooks/exhaustive-deps`.

### 4.4 Scope and artifacts

`git diff --name-only` and `git status --short` show changes only under `services/leaderboard/`,
`apps/web/`, and `aidlc-docs/construction/prerequisite-enablement/`, plus:

- `aidlc-docs/aidlc-state.md`, `aidlc-docs/audit.md` - modified by the orchestrator, not this unit.
- `packages/shared/package.json`, `packages/shared/package-lock.json`, `packages/shared/src/index.ts`
  and the untracked `packages/shared/src/circuit/` - the concurrent agent's U2 work. This unit neither
  read from nor wrote to that package. **`packages/shared` is untouched by U1.**
- `aidlc-docs/inception/...` untracked files from earlier stages.
- `.agents/` - untracked workflow scratch and **not gitignored**. Reported rather than committed or
  added to `.gitignore`.

`apps/web/dist/` is gitignored. `apps/web/tsconfig.tsbuildinfo` is tracked and not gitignored, but the
build left it byte-identical so it shows no change. `services/leaderboard` produced no artifact
outside scope. Nothing was committed, pushed, merged or deployed, and no AWS, Vercel or Stripe call
was made.

---

## 5. The 9 remaining test failures - pre-existing, left in place by decision

All nine failed at HEAD before any change in this unit. None is caused by the `Difficulty` fix.

### Group A - `scoring.service.test.ts`, 2 failures

Stale assertions that never ran at HEAD because the suite could not compile. Neither involves the
score cap that was changed, and the cap's runtime value is identical before and after.

| Test | Expected | Received | Root cause |
|---|---|---|---|
| `should apply zero speed bonus for slow Memory Match completion` (line 79) | `0` | `0.1` | The implementation floors the speed bonus at `Math.max(0.1, ...)` while the config's `formula` string still reads `max(0, ...)`. The test predates the floor. |
| `should reject score above maximum` (line 330) | `false` | `true` | The test passes 7000 with the comment "Above 6000 maximum"; `memoryMatch.validationRules.maxScore` is 10000, so 7000 is valid. |

Both are trivially pinnable to current behaviour if wanted - expect `0.1`, and use a score above
10000 - but they were left alone to honour the instruction not to fix pre-existing failures. Each also
hides a small documentation inconsistency worth resolving deliberately: the config formula string
versus the implemented floor, and whether the intended Memory Match ceiling is 6000 or 10000.

### Group B - `auth.util.test.ts`, 6 failures

All six raise `AuthenticationError: Failed to fetch JWKS keys` at `src/utils/auth.util.ts:44`.

**These tests are stale because the implementation got more secure, not because anything regressed.**
They build a token whose signature is the literal string `'mock-signature'` and expect
`validateToken` to return an auth context. The current implementation fetches
`https://cognito-idp.{region}.amazonaws.com/{poolId}/.well-known/jwks.json` and verifies the RSA
signature against the published key. The failure signals that a mock-signature shortcut was replaced
with real verification - progress in the code.

They must not be made to pass by relaxing the implementation: as written they assert that an unsigned
token is accepted, which must never become true. Recommended as separate follow-up work: generate an
RSA keypair in the test, publish it as a JWK fixture, mock `global.fetch`, and sign the fixture token.
That is a rewrite of six security-critical tests, unrelated to Circuit Builder, and doing it hastily
inside a unit scoped to a type fix is how you end up with tests that pass while verifying nothing.

### Group C - `leaderboard.repository.test.ts`, 1 failure

Line 108, `Expected length: 1, Received length: 0`. Present at HEAD at the same line. Unrelated to
this unit and to `Difficulty`.

---

## 6. Behavioural findings carried forward

| # | Finding | State | What the owner needs to decide |
|---|---|---|---|
| B1 | The per-difficulty score cap has never applied; every difficulty is capped at 8000, because a label was compared against a number | Preserved exactly | Whether the tiered caps (Easy 5000, Medium 6500, Hard 8000) were ever intended. Enforcing them lowers easy and medium maximum scores for every existing game. |
| B2 | **Confirmed bug.** `languageLearning.difficultyMultipliers` defines only `EASY`/`MEDIUM`/`HARD`, so a `LANGUAGE_LEARNING` game arriving as `BEGINNER`/`INTERMEDIATE`/`ADVANCED` silently falls back to a `1.0` multiplier | Left in place; two tests now pin the `1.0` fallback with comments marking it a bug | **Exact fix:** add `[Difficulty.BEGINNER]: 1.0`, `[Difficulty.INTERMEDIATE]: 1.5`, `[Difficulty.ADVANCED]: 2.0` to that config block in `loadConfiguration()`. **Exact consequence:** Language Learning scores rise by up to 2x for intermediate and advanced play once `calculateScore` becomes live. Today it is reached only from tests, so the change would be inert on merge and activate later without notice - which is why it needs a deliberate decision. This is the same registry and naming drift this codebase has a documented history of; worth checking any other game that adopts its own difficulty labels. |
| B3 | `calculateRanks` breaks score ties on completion time, which its doc comment denied | Comment and tests corrected; logic untouched | Whether completion time should break score ties at all. The current behaviour is defensible for a timed game, but it is a live product choice affecting every leaderboard, so it is recorded rather than assumed. |

B1 and B2 have no production impact today: `calculateScore` is never called outside tests. The event
handler forwards `detail.score` and calls only `validateScore`, which does not read `difficulty`.
B3 does affect production output.

---

## 7. CSP origin inventory discovered

Derived from the repository and from the built bundle, not assumed.

| Origin / scheme | Where it comes from | Directive |
|---|---|---|
| `https://fonts.googleapis.com` | `<link rel="stylesheet">` in `apps/web/index.html` **and** `@import url(...)` on line 1 of `src/styles/index.css`, which survives into the bundled CSS | `style-src` |
| `https://fonts.gstatic.com` | woff2 files referenced by the Google stylesheet; `<link rel="preconnect">` in `index.html` | `font-src` |
| `https://upload.wikimedia.org` | portrait `imageUrl` values in `src/utils/historyQuizData.ts` (History Quiz) | `img-src` |
| `data:` | `data:image/svg+xml` assets inlined into the bundle; `data:image/svg+xml;base64,` built in `src/utils/puzzleUtils.ts`; `canvas.toDataURL()` for jigsaw pieces; `data:` SVG fallback in `src/pages/admin/LanguageMaintenancePage.tsx` | `img-src` |
| `https://3ra5uzpv5g.execute-api.us-east-1.amazonaws.com` | `apps/web/.env.production` - auth, game and leaderboard GraphQL | `connect-src` (wildcard) |
| `https://7pwns5lkof.execute-api.us-east-1.amazonaws.com` | the env the `web` Vercel project actually builds with | `connect-src` (wildcard) |
| `https://l8ra6nktb6.execute-api.us-east-1.amazonaws.com` | hard-coded fallback in `src/context/AuthContext.tsx` and `src/pages/admin/AdminDashboard.tsx` | `connect-src` (wildcard) |
| `https://api.dashden.com` | hard-coded leaderboard fallback in `src/api/leaderboard.ts` | `connect-src` |
| `https://cognito-idp.us-east-1.amazonaws.com` | Amplify Auth user-pool API, from `src/config/amplify.ts` and `aws-amplify/auth` usage | `connect-src` |
| `https://memory-game-dev` / `memory-game-prod` / `dashden-prod` `.auth.us-east-1.amazoncognito.com` | hosted-UI OAuth domain; default in `src/config/amplify.ts`, `.env.production`, and the `web` project env respectively | `connect-src` (wildcard) |
| `https://ipapi.co` | `fetch('https://ipapi.co/json/')` in `src/api/language.ts` | `connect-src` |
| `/_vercel/insights/script.js`, `/_vercel/speed-insights/script.js`, `/_vercel/insights/event` | `@vercel/analytics` and `@vercel/speed-insights`; both resolve to these same-origin paths in a production build | covered by `'self'` |
| `https://cdn.tailwindcss.com` | `public/traffic-sim.html` only | **not allowed** - see R1 |

Three API Gateway host IDs and three Cognito hosted-UI prefixes are live across deployments, and the
`web-prod` project's values cannot be read from the repository, so `connect-src` uses
`https://*.execute-api.us-east-1.amazonaws.com` and `https://*.auth.us-east-1.amazoncognito.com`
rather than pinning a host that might be wrong. Pinning the wrong host would take the whole
application offline.

**Verified absent, so deliberately not permitted:**

| Checked for | Finding |
|---|---|
| Inline `<script>` in the built HTML | None. `dist/index.html` has one external module script and one external stylesheet. No module-preload polyfill was emitted. |
| `eval(` / `new Function(` in the bundle | None, so `script-src` needs no `'unsafe-eval'`. |
| `<iframe>` | None in `src/`, `public/`, `index.html`, or created by the bundle. `frame-src 'none'` and `X-Frame-Options: DENY` are safe. |
| Stripe.js | `@stripe/stripe-js` is a dependency but never imported. Stripe is entered by top-level `window.location.href` to the Checkout URL, which CSP does not govern. No `js.stripe.com` needed. |
| WebSockets | `env.apiWsUrl` is declared in `src/config/env.ts` and never read. No `WebSocketLink`, `GraphQLWsLink` or `new WebSocket`. No `wss:` needed. |
| `blob:` / `createObjectURL` | None. |
| Web Workers | None. |
| `<audio>` / `<video>` | None. `speechSynthesis` and `AudioContext` with a microphone stream are not governed by CSP. |
| Runtime `<style>` injection | **Present** - Framer Motion's `AnimatePresence` pop-layout path does `document.createElement("style")` then `sheet.insertRule(...)`. This is why `style-src` carries `'unsafe-inline'`; justification in section 2.5 of the functional design. |
| `data:` fonts | None in the built CSS, so `font-src` does not allow `data:`. |

Policy now shipping as `Content-Security-Policy-Report-Only`:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://upload.wikimedia.org;
connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com https://api.dashden.com
            https://cognito-idp.us-east-1.amazonaws.com https://*.auth.us-east-1.amazoncognito.com
            https://ipapi.co;
frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

`vercel.json` was re-parsed after the edit to confirm valid JSON, that the `rewrites` entry still
reads `/(.*)` to `/index.html`, and that all five header keys are present. `headers` and `rewrites`
are independent phases in Vercel's routing, so the header `source` pattern does not interfere with
the SPA rewrite.

---

## 8. SECURITY-04 is partially satisfied, deliberately

**Do not record this rule as met.** Four headers enforce; the CSP does not.

| Header | Mode |
|---|---|
| `Strict-Transport-Security: max-age=31536000; includeSubDomains` | enforcing |
| `X-Content-Type-Options: nosniff` | enforcing |
| `X-Frame-Options: DENY` | enforcing |
| `Referrer-Policy: strict-origin-when-cross-origin` | enforcing |
| `Content-Security-Policy-Report-Only` | **report-only - nothing is enforced** |

In report-only mode the browser applies no restriction and logs each would-be violation to the
console. There is no `report-uri` or `report-to` directive, so violations are console-only and nothing
is collected server-side. Framing is still protected today, because `X-Frame-Options: DENY` enforces
regardless of the report-only `frame-ancestors 'none'`.

**To complete SECURITY-04, in order:**

1. Deploy and load the app in a real browser with the console open.
2. Walk every page and flow in the checklist below on **both** deployments - `dev.dashden.app`
   (Vercel project `web`) and `dashden.app` (project `web-prod`) - because their API Gateway host and
   Cognito domain differ.
3. Confirm zero `[Report Only] Refused to ...` reports, apart from the expected ones on
   `/traffic-sim.html`.
4. Add any blocked host that turns out to be legitimate.
5. Rename the header key in `apps/web/vercel.json` from `Content-Security-Policy-Report-Only` to
   `Content-Security-Policy`, leaving the value unchanged. That is the whole change.

| # | Page or flow | Directive at risk |
|---|---|---|
| 1 | Email/password sign-in and sign-up, including the confirmation code step | `connect-src https://cognito-idp.us-east-1.amazonaws.com` |
| 2 | Google sign-in via the Cognito hosted UI, through to landing back on the app signed in | `connect-src https://*.auth.us-east-1.amazoncognito.com`, `frame-src 'none'` |
| 3 | Any GraphQL call: load the hub, start a game, complete a game | `connect-src https://*.execute-api.us-east-1.amazonaws.com` |
| 4 | Leaderboard page, History, Achievements, Recent Improvements | same as 3, plus the `https://api.dashden.com` fallback |
| 5 | Stripe upgrade: the redirect out to Checkout **and** the return to the success page | `form-action 'self'` (expected not to apply - the redirect is `window.location.href`) |
| 6 | Poppins actually renders rather than a system fallback | `style-src https://fonts.googleapis.com`, `font-src https://fonts.gstatic.com` |
| 7 | Vercel Analytics and Speed Insights still report | `script-src 'self'`, `connect-src 'self'` |
| 8 | Framer Motion animations, especially `AnimatePresence` exit transitions | `style-src 'unsafe-inline'` - the reason that keyword is present |
| 9 | Jigsaw Puzzle pieces render; Language Maintenance image fallback renders | `img-src data:` |
| 10 | History Quiz portrait images load | `img-src https://upload.wikimedia.org` |
| 11 | Admin dashboard and Subscriptions page load their data | `connect-src` as 3 |
| 12 | Language game country/locale lookup | `connect-src https://ipapi.co` |
| 13 | Confirm no page of the app is framed anywhere | `X-Frame-Options`, `frame-ancestors` |
| 14 | `/traffic-sim.html` - **expected to report violations** | `script-src 'self'` |

The same checklist is kept in `apps/web/SECURITY-HEADERS.md`, next to the config it applies to.

---

## 9. Residual risk

### The policy has not been tested in a browser

**A CSP cannot be validated without loading the application against the header, and no browser was
available in this environment.** Everything in section 7 is static analysis of source and build
output. No claim is made that the policy is correct in a browser. That is precisely why it ships
report-only; see section 8 for the completion path.

### Other residual risk

| # | Risk | Detail and suggested action |
|---|---|---|
| R1 | `/traffic-sim.html` will break once the CSP enforces | It needs `https://cdn.tailwindcss.com`, an inline `<script>`, and inline `onclick` handlers, all violating `script-src 'self'`. `git grep -i traffic-sim` finds no reference anywhere in the repository, so it is an orphan prototype of the React Traffic Lab game and no application flow depends on it. **Decision: leave it broken, do not delete it.** Deleting a file is destructive and does not belong as a side effect of adding security headers - the owner may know why it exists. A scoped carve-out was rejected as the worst option: it would permanently weaken a security control for a file nothing uses and set a precedent for further exceptions. Suggested action: delete it deliberately, as separate cleanup. |
| R2 | Endpoint hosts for `web-prod` are unconfirmed | Reading that project's env requires a Vercel API call, which was out of bounds. The two wildcards are wide enough to cover every endpoint observed. Once confirmed, replace both wildcards with exact hosts. |
| R3 | `'unsafe-inline'` in `style-src` | Accepted and justified: Framer Motion injects a stylesheet via CSSOM, and a nonce needs a request-time hook this static deployment does not have. Leaves CSS-based exfiltration and UI-redressing exposure. `script-src` is unaffected. Removing it later means adopting Vercel edge middleware for nonces or replacing Framer Motion's pop-layout usage. |
| R4 | Vercel preview toolbar | It loads from `https://vercel.live`, which the policy would block once enforcing, so previews would lose the toolbar. Production is unaffected. Fix if wanted by allowing `vercel.live` on preview deployments only. |
| R5 | Three behavioural findings left in place | B1 the never-applied difficulty cap, B2 the missing Language Learning multiplier keys (a confirmed bug), B3 completion-time tie-breaking. Each changes scores or ranks users see, so each needs a deliberate decision. Details and exact fixes in section 6. |
| R6 | 9 leaderboard tests still fail | All pre-existing, three root causes, itemised in section 5. The six `auth.util.test.ts` failures assert that a token with a fake signature is accepted; that must not be restored, and the tests need rewriting around a JWKS mock as separate work. |
| R7 | 89 pre-existing `apps/web` lint errors | Not caused by and not addressed by this unit. The lint gate therefore still fails for the package, so it cannot serve as a regression signal until the backlog is cleared. |
| R8 | Pre-existing error-detail exposure left in place | `src/api/client.ts` logs the first 50 characters of the Amplify token to the console; `AdminDashboard.tsx` and `LanguageMaintenancePage.tsx` render `err.message` into admin-only pages. Both belong to rules PRE-3 defers (SECURITY-03, SECURITY-08/09 on existing surfaces) and are outside PRE-2's named scope. |
| R9 | `.agents/` is untracked and not gitignored | Workflow scratch. It will appear in `git status` for whoever commits next. |

---

## 10. Security baseline compliance

| Rule | Status | Basis |
|---|---|---|
| SECURITY-01 Encryption | N/A | No data store created or configured. |
| SECURITY-02 Access logging | N/A | No network intermediary created or configured. |
| SECURITY-03 App logging | Compliant for changed code | The ErrorBoundary logs only `error.name`; no token, PII, message or stack. Pre-existing token logging recorded as R8, deferred per PRE-3. |
| SECURITY-04 HTTP headers | **Partial - deliberately staged, NOT met** | Four headers enforcing; the CSP is report-only, so no CSP is enforced yet. `'unsafe-inline'` is used for `style-src` only and justified; `script-src` has neither `'unsafe-inline'` nor `'unsafe-eval'`. Completion path in section 8. |
| SECURITY-05 Input validation | N/A | No API handler or input surface added or altered. |
| SECURITY-06 Least privilege | N/A | No IAM policy or role touched. |
| SECURITY-07 Network config | N/A | No VPC or firewall layer in this architecture. |
| SECURITY-08 Access control | Compliant for changed code | No authorization logic changed. All five reviewed auth error paths deny by default. |
| SECURITY-09 Hardening | Compliant | No stack trace or internal detail reachable from the ErrorBoundary; `nosniff` enforcing. |
| SECURITY-10 Supply chain | N/A | No dependency added, removed or upgraded. |
| SECURITY-11 Secure design | N/A | No new security-critical logic. |
| SECURITY-13 Integrity | Compliant for changed code | No external script added. The policy blocks the unpinned `cdn.tailwindcss.com` script rather than allowing it (R1). |
| SECURITY-12 Authentication | N/A | Cognito flow unchanged. |
| SECURITY-14 Alerting | N/A | No alerting or retention configuration in scope. |
| SECURITY-15 Exception handling | Compliant | Top-level boundary at the app entry point returns a generic response; every reviewed error path fails closed; the ErrorBoundary leaves no partial authenticated state. |

SECURITY-04 is the one rule not met. It is recorded as partial rather than claimed, by explicit owner
decision, because enforcing an unverified CSP on a live production app risks an outage. The remaining
step is browser verification, not further code.

---

## 11. Completion criteria

Against the criterion as revised by the owner:

| U1 criterion | Status |
|---|---|
| `npx tsc --noEmit` exits 0 in `services/leaderboard` | **Met.** Was exit 1 with 30 errors. This was the actual blocker for U7. |
| Suites that previously could not compile now compile and run | **Met.** 107 to 164 tests; four suites green, including `event.handler` at 15/15. |
| Pre-existing failures unrelated to the `Difficulty` fix are documented, not fixed | **Met.** 9 failures, three root causes, itemised in section 5 with before-and-after evidence. |
| All five required headers present | **Met for presence; four of five enforcing.** The CSP is report-only by decision - section 8. |
| No stack trace reachable in the user interface | **Met.** Neither the message nor the stack is kept in state or rendered. |
| CSP verified not to break existing pages | **Not met, and not claimed.** No browser was available. Report-only staging exists so this can be verified against real traffic before enforcement. `/traffic-sim.html` is a known, deliberate, documented breakage (R1). |
