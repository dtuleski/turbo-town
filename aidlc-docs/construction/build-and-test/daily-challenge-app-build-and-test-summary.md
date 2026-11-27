# DC5 App: Build and Test Summary

Branch `feat/dc5-app-challenge-push` (cut from `feat/dc4-web-challenge` at 84b474c). Run 2026-11-26 on
macOS in the worktree (Flutter 3.44.8). Nothing was deployed; no AWS, Vercel or App Store Connect call
was made.

## Commands and results

| # | Command | Result | Baseline (DC4 tip 84b474c) |
|---|---|---|---|
| 1 | `cd apps/mobile && flutter analyze` | No issues found | no issues |
| 2 | `cd apps/mobile && flutter test` | 805 tests, all pass | 763 tests |
| 3 | `cd apps/web && npx vitest run` | 61 files, 1033 tests, all pass | 61 files, 1033 tests |
| 4 | `cd services/game && npx jest` | 30 suites pass, 454 tests pass; only `tests/unit/services/event-publisher.service.test.ts` and `tests/integration/event-flow.test.ts` fail (known, fail on main) | same |
| 5 | `cd packages/shared && npx jest` | 29 suites, 617 tests, all pass | same |
| 6 | `xcrun --sdk iphonesimulator swiftc -typecheck -target arm64-apple-ios15.0-simulator -F <Flutter.xcframework simulator slice> -import-objc-header Runner/Runner-Bridging-Header.h Runner/AppDelegate.swift Runner/SceneDelegate.swift` (in `apps/mobile/ios`) | exit 0 | n/a |
| 7 | `plutil -lint Runner.xcodeproj/project.pbxproj Runner/Runner.entitlements` | OK | n/a |

Web, game and shared are not changed by this unit.

**Owner verification needed**: `flutter test` does not compile Swift or check entitlements. Row 6 only
type-checks the Swift file. Build the app once in Xcode with the team's signing (Debug on a device). With
automatic signing, Xcode adds Push Notifications to the App ID `app.dashden.dashdenMobile`. Then check
that the iOS prompt appears after "Allow" and that a token is registered. Registration stays off on the
server until `PUSH_DEVICES_TABLE_NAME` is set (production steps), and sending also needs the APNs key.

## New tests (42)

| Suite | Tests | Covers |
|---|---|---|
| `test/push/push_channel_test.dart` | 5 | no native side: false/null everywhere; `PlatformException` is a soft failure; answers passed through; wrong answer types read as nothing; `onTap` events reach `taps` |
| `test/push/push_controller_test.dart` | 18 | tap route allow list; soft-ask: toggle off shows nothing, "Not now" records the flag and never calls `requestPermission`, "Allow" calls `requestPermission` then registers (token, `sandbox`, zone, language), release build `production`, denied prompt registers nothing, shown once per device, Profile path skips the server read, failed toggle read shows nothing, unsupported platform does nothing; `registerIfAllowed` never prompts; settings and registration once per change; language only without push support; failed save retried, never throws; unregister with the registered token, failure completes; `signOut` logs `unregister` before `cognito.signOut`; a failing unregister does not block sign-out; tap `/challenge/results?day=` opens the results screen and `/` the hub through go_router, unknown route ignored |
| `test/ui/daily_challenge_test.dart` | 18 | launch paths for the 6 games, none without an app mode; hub card above the quest card with game, Play, not played, top 5 (you marked), leaderboard call limit 5; best and rank; board for another day dropped; empty board; hidden when off; failed-start notice alone; Play opens `/sudoku/play` with `difficulty=medium` and the day; See all results opens today's results; results screen: final day winner, top 10, own rank, date; live day and invitation; nobody played; no results; Spanish texts; day param validation; route reads the day, bad day means today; Profile shows "Daily emails and notifications" and "8am your time", no "8pm" |
| `test/api/stats_api_test.dart` | +1 | `saveNotificationSettings`, `registerPushDevice` (platform `IOS`), `unregisterPushDevice` variables |

`test/l10n_parity_test.dart` (es and pt keys and placeholders equal to en) passes with the new strings.

## Acceptance (FEAT-006)

- `flutter analyze` reports no issues; `flutter test` passes (763 baseline + 42 new = 805).
- The iOS prompt is requested only after the explanation's "Allow"; "Not now" records the flag; nothing is
  shown when the toggle is off (soft-ask tests).
- `signOut` calls `unregisterPushDevice` before clearing the session, and a failure there does not block
  sign-out (sign-out tests).
- Tap payload route `/` opens the hub and `/challenge/results?day=YYYY-MM-DD` opens the results screen
  (tap routing test).
- All channel calls return safely when the native side is missing (channel tests run without it).
- Web, game and shared suites still pass on this branch tip (rows 3 to 5).

## Security Baseline

| Rule | Status |
|---|---|
| SECURITY-01 Encryption | N/A: no new data store; calls go to the existing GraphQL API over HTTPS; the device keeps only a boolean flag in shared_preferences |
| SECURITY-02 Access logging on intermediaries | N/A: no new API Gateway, load balancer or CDN |
| SECURITY-03 Application logging | Compliant: no new log lines; the native bridge and Dart code never print the token, zone or payload |
| SECURITY-04 HTTP security headers | N/A: native app, no web hosting change |
| SECURITY-05 Input validation | Compliant: tap routes go through an allow list (`/`, `/challenge/results?day=<real day>`); `day` and `challengeFailed` query values are checked; channel answers are type-checked; language reduced to en/es/pt; the server validates token, zone and language again (DC1) |
| SECURITY-06 Least privilege | Compliant: the only new capability is `aps-environment`; no other entitlement or permission is added |
| SECURITY-07 Network | N/A: no network change |
| SECURITY-08 Access control | Compliant: device registration, unregister and settings use the signed-in user's token; the server takes the user id from the JWT; unregister removes only the caller's own device (DC1) |
| SECURITY-09 Hardening | Compliant: errors show a generic notice or "no results" text, never server messages |
| SECURITY-10 Supply chain | Compliant: no new dependency (native push through a method channel, no plugin) |
| SECURITY-11 Secure design | Compliant: the iOS prompt only after the in-app explanation (FR-DC-4); card and results are read-only views of server data |
| SECURITY-12 Credentials | Compliant: no credentials in the app; the APNs token is held in memory only and sent to the API |
| SECURITY-13 Integrity | Compliant: challenge content, scores and ranks come from the server; the card launches the unchanged DC3 path |
| SECURITY-14 Alerting | N/A: no new backend component |
| SECURITY-15 Fail-safe | Compliant: every channel and network call fails soft with timeouts; push off or unsupported means no UI change; a failed unregister never blocks sign-out; the card is hidden when off or failing |
