# DC4 Web: Build and Test Summary
Branch `feat/dc4-web-challenge` (cut from `feat/dc1-notifications-backend` at 3e8094c). Run 2026-11-26 on
macOS in the worktree. Nothing was deployed; no AWS or Vercel call was made.
## Commands and results
| # | Command (in `apps/web`) | Result | Baseline (DC1 tip 3e8094c) |
|---|---|---|---|
| 1 | `npx tsc --noEmit -p tsconfig.json --types vite/client` | pass | pass |
| 2 | `npx vitest run` | 61 files, 1033 tests, all pass | 55 files, 961 tests |
| 3 | `npm run build` | pass (existing chunk-size warning only) | pass |
Shared, game, infrastructure and app are not touched by this unit (baselines stay shared 29 suites / 617
tests, game 30 suites pass / 454 tests with the 2 known failures, app 763 tests).
## New tests (72)
| Suite | Tests | Covers |
|---|---|---|
| `src/hooks/__tests__/useNotificationSettingsSync.test.ts` | 12 | first load saves and remembers; same values on later loads: no save; one save per zone change and per language change; another user on the same browser saves; failed save not remembered and retried; language only without a zone; unreadable stored value; storage missing or throwing; base language code with `en` fallback; browser IANA zone; Intl failure |
| `src/components/challenge/__tests__/DailyChallengeCard.test.tsx` | 21 | game name; Play link equals `buildChallengeUrl` (44px); own best and rank; top 5 with the player marked; ends at midnight ET; results link; not-played text; at most 5 rows; empty leaderboard; card without leaderboard; no Play link without a web mode; nothing without data; `challengeFailed=1` notice alone and above the card; container empty before load; `loadDailyChallengeCard` null when `getDailyChallenge` returns null or throws, leaderboard dropped on failure or other day |
| `src/pages/challenge/__tests__/ChallengeResultsPage.test.tsx` | 13 | `day` param parsing (5 invalid cases = today); final day with game, winner, top 10, own rank; live day and invitation; nobody played; no results; loading; date formatting en and pt |
| `src/locales/__tests__/challengeLocaleCompleteness.test.ts` | 16 | es and pt: nothing missing or extra, non-empty, same placeholders, no copied English outside 3 proper names; a name for each of the 16 rotation games; placeholders; toggle texts renamed in en, es, pt, 8am local time, no "8pm EST" |
| `src/pages/legal/__tests__/PrivacyPage.test.tsx` | 8 | push token, time zone, use, challenge leaderboard, SNS and APNs sharing, token and score retention, deletion |
| `src/api/__tests__/challengeSettings.test.ts` | 2 | mutation and variables; failure rethrown |
## Acceptance (FEAT-005)
- tsc, vitest (961 baseline + 72 new = 1033) and build pass.
- The card renders the game name, the Play link from `buildChallengeUrl`, own best and rank and the top 5,
  and renders nothing when `getDailyChallenge` returns null or throws (card tests).
- The locale sync saves once per change of time zone or language and not on every load (hook tests).
- en, es and pt contain every `challenge.*` key (completeness test).
- The privacy page contains the push token, time zone, challenge leaderboard, SNS and APNs sharing,
  retention and deletion text (privacy test).
## Security Baseline
| Rule | Status |
|---|---|
| SECURITY-01 Encryption | N/A: no data store; the web calls the existing GraphQL API over HTTPS |
| SECURITY-02 Access logging on intermediaries | N/A: no new API Gateway, load balancer or CDN |
| SECURITY-03 Application logging | Compliant: the only new log line is a generic "Notification settings could not be saved" with no values |
| SECURITY-04 HTTP security headers | N/A: no hosting or header change (`vercel.json` untouched) |
| SECURITY-05 Input validation | Compliant: `?day=` accepted only as a real calendar day (`isChallengeDay`), `challengeFailed` only as `1`; zone capped at 64 characters and language reduced to en/es/pt before sending; the server validates both again (DC1). Usernames render as React text (escaped) |
| SECURITY-06 Least privilege | N/A: no IAM change |
| SECURITY-07 Network | N/A: no network change |
| SECURITY-08 Access control | Compliant: the results route sits inside `ProtectedRoute`; the sync runs only for a signed-in user; the server takes the user id from the JWT (the stored user id is only a local cache key) |
| SECURITY-09 Hardening | Compliant: errors show one generic notice or "no results" text, never server messages |
| SECURITY-10 Supply chain | Compliant: no new dependency |
| SECURITY-11 Secure design | Compliant: the card and page are read-only views of server data; scores and ranks come from the server |
| SECURITY-12 Credentials | N/A: no credentials; localStorage holds only user id, zone and language |
| SECURITY-13 Integrity | Compliant: challenge content and results come from the server (unchanged DC3 launch path) |
| SECURITY-14 Alerting | N/A: no new backend component |
| SECURITY-15 Fail-safe | Compliant: card hidden when off or failing; results page shows "no results" on error; a failed sync is retried later and never blocks the page |
## Notes for later units
- DC5 app: the digest push route `/challenge/results?day=<yesterday>` matches the web route
  `ROUTES.CHALLENGE_RESULTS`; the app needs its own screen for it. Game names for all 16 rotation games
  are in `challenge.games.<gameId>` (web) for reuse in the app ARB files.
