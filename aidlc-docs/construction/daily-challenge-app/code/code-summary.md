# DC5 App: Code Summary

Branch `feat/dc5-app-challenge-push`. Plan: `../../plans/daily-challenge-app-code-generation-plan.md`.
All paths under `apps/mobile/`.

## New files

| File | Component | Purpose |
|---|---|---|
| `ios/Runner/Runner.entitlements` | M8 | `aps-environment` `development` |
| `lib/push/push_channel.dart` | M5 | `kPushChannelName` `app.dashden/push`; `PushChannel.requestPermission()`, `deviceToken()`, `timeZone()`, `takeLaunchTap()`, `taps` stream; never throws |
| `lib/push/push_controller.dart` | M6 | `kSoftAskShownKey` `push.softAskShown`, `pushTapRoute(route)`, `PushController` (`maybeSoftAsk`, `registerIfAllowed`, `unregister`, `syncSettings`, `onSignedIn`, `handleTap`, `environment`, `supported`), `PushSoftAskDialog`, `pushChannelProvider`, `pushControllerProvider`, `pushSessionProvider` |
| `lib/challenge/challenge_card_data.dart` | M4 | `kChallengeCardTopCount` 5, `ChallengeCardData`, `challengeCardProvider` (separate from `dailyChallengeProvider`, which a running challenge game reads) |
| `lib/ui/widgets/daily_challenge_card.dart` | M4 | `DailyChallengeCard({failed})`: game, Play, own best and rank or "not played", ends at midnight ET, top 5, See all results; hidden while loading, when off and on error; failed-start notice |
| `lib/ui/screens/challenge_results_screen.dart` | M4 | `kChallengeResultsCount` 10, `resultsDayParam`, `challengeResultsProvider` (family by day), `ChallengeResultsScreen({day})` |

## Changed files

| File | Change |
|---|---|
| `ios/Runner/AppDelegate.swift` | `PushBridge` on the implicit engine's application registrar messenger; notification center delegate; token and tap callbacks |
| `ios/Runner.xcodeproj/project.pbxproj` | `Runner.entitlements` file reference in the Runner group; `CODE_SIGN_ENTITLEMENTS` in the three Runner configurations |
| `lib/api/profile_api.dart` | `saveNotificationSettings({timeZone, language})`, `registerPushDevice({token, environment, timeZone, language})` (platform `IOS`), `unregisterPushDevice(token)` |
| `lib/auth/auth_controller.dart` | optional `beforeSignOut`, run before `_cognito.signOut()`, failures swallowed; the provider passes `pushControllerProvider.unregister` |
| `lib/challenge/challenge_launch.dart` | `kChallengeLaunchTable` (6 themes), `buildChallengePath(view)` `<route>?difficulty=medium&challenge=<day>`, `challengeResultsPath(day)` |
| `lib/game/framework/game_session_frame.dart` | on the change to completed: refresh the hub card for a challenge play, then `maybeSoftAsk` |
| `lib/ui/screens/profile_screen.dart` | after the toggle is saved on: `maybeSoftAsk(context, digestOn: true)` |
| `lib/ui/screens/hub_screen.dart` | `HubScreen({challengeFailed})`, `DailyChallengeCard` above `_QuestCard`, pull-to-refresh also reloads the card |
| `lib/ui/router.dart` | `/` passes `challengeFailed=1`; new full-screen route `/challenge/results` |
| `lib/main.dart` | watches `pushSessionProvider` |
| `lib/l10n/app_{en,es,pt}.arb`, `lib/l10n/gen/*` | `profile_dailyDigest*` renamed (DC4 wording), `push_softAsk_*`, `challenge_card_*`, `challenge_you`, `challenge_results_*` |

Test helpers: `test/helpers/fake_push.dart` (new: `FakePushChannel`, `fakePushController`,
`kTestPushToken`); `test/helpers/fake_stats_apis.dart` (`FakeProfileApi` records settings saves,
registrations, unregistrations; `failPush`); `test/helpers/challenge_fixtures.dart` (`FakeChallengeApi`
gains an optional leaderboard and `leaderboardCalls`); `test/helpers/pump_router.dart` (new
`challengeApi` parameter, default `FakeChallengeApi()`, so the hub card never calls the network in
router tests). `test/auth/router_redirect_test.dart` overrides `challengeApiProvider` for the same reason.
`test/games/challenge_flow_test.dart` passes its fake through the new parameter, and its "nothing is
loaded" test now counts only the hub card's reads (one `getDailyChallenge` per leaderboard read).

## Behavior notes

- Push exists on iOS only (`supported` is false elsewhere): Android shows no explanation, registers
  nothing and saves only the language.
- The explanation flag is set when the dialog is shown, so a dismissed dialog counts as "Not now".
- Registration runs after sign-in, at launch with a saved session and on every resume, only when iOS
  already allows notifications; repeated calls with the same token, environment, zone and language are
  skipped for the app run. The settings save is skipped in the same way.
- A tap is followed only for `/` and `/challenge/results?day=<real day>`; anything else opens the app
  where it was. Taps are routed only while signed in.
- Sign-out unregisters with the last registered token (or the current one), with timeouts, before the
  Cognito session is cleared; a failure there never blocks sign-out. Account deletion already removes
  devices on the server (DC1); the sign-out after it tries the unregister and ignores the error.
- Not in scope: the game result page does not show the `completeGame.challenge` rank (DC3 parses it; no
  DC5 step covers it).
