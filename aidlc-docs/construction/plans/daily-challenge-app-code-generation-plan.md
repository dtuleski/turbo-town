# DC5 App: Code Generation Plan

Unit DC5, branch `feat/dc5-app-challenge-push` (cut from `feat/dc4-web-challenge` at 84b474c).
Components M4, M5, M6, M7, M8 of `inception/application-design/daily-challenge-components.md`; soft-ask
rule from `inception/plans/daily-challenge-application-design-plan.md` Q10. Self-approved 2026-11-26
under the owner's delegation. All paths below are under `apps/mobile/`.

## Steps

- [x] 1. M5 and M8 push bridge: `ios/Runner/AppDelegate.swift` method channel `app.dashden/push`
      (`requestPermission`, `getToken` = APNs token as hex or nil without permission, `getTimeZone` =
      `TimeZone.current.identifier`, `takeLaunchTap`; taps sent as `onTap` through
      `UNUserNotificationCenterDelegate`, a cold-start tap kept until `takeLaunchTap`; banner shown while the
      app is open). `ios/Runner/Runner.entitlements` (`aps-environment` `development`; distribution
      signing uses the provisioning profile's value) and `CODE_SIGN_ENTITLEMENTS = Runner/Runner.entitlements`
      in the Debug, Release and Profile Runner configurations of `ios/Runner.xcodeproj/project.pbxproj`.
      `lib/push/push_channel.dart` catches `MissingPluginException` and `PlatformException` and type-checks
      every answer. Test: `test/push/push_channel_test.dart`.
- [x] 2. M6 `lib/push/push_controller.dart`: `maybeSoftAsk(context, {digestOn})` (iOS only; flag
      `push.softAskShown` in shared_preferences, set when shown; only when the toggle is on; "Allow" opens
      the iOS prompt then registers; "Not now" only records the flag; the toggle is never changed),
      `registerIfAllowed()` (never prompts; environment `production` in release builds, else `sandbox`),
      `unregister()` (never throws), `syncSettings()` and `onSignedIn()` (zone and language once per change),
      `handleTap(payload)` with the allow list `/` and `/challenge/results?day=YYYY-MM-DD`.
      `pushSessionProvider` (watched by `lib/main.dart`) runs `onSignedIn` when signed in and on every
      resume and routes taps, also the launch tap. Hooks: completion in
      `lib/game/framework/game_session_frame.dart`; toggle turned on in `lib/ui/screens/profile_screen.dart`;
      `AuthController(beforeSignOut:)` in `lib/auth/auth_controller.dart` calls `unregister` before
      `_cognito.signOut()`. Tests with a fake channel: `test/push/push_controller_test.dart`.
- [x] 3. M7 API: `lib/api/profile_api.dart` gains `saveNotificationSettings`, `registerPushDevice`,
      `unregisterPushDevice` (DC1 operations). Test: `test/api/stats_api_test.dart` (payloads).
- [x] 4. M4 card and results: `lib/challenge/challenge_card_data.dart` (`challengeCardProvider`, top 5),
      `lib/challenge/challenge_launch.dart` (`kChallengeLaunchTable`, `buildChallengePath`,
      `challengeResultsPath`), `lib/ui/widgets/daily_challenge_card.dart` above `_QuestCard` in
      `lib/ui/screens/hub_screen.dart` (also the `challengeFailed=1` notice), and
      `lib/ui/screens/challenge_results_screen.dart` at `/challenge/results` in `lib/ui/router.dart`.
      Test: `test/ui/daily_challenge_test.dart`.
- [x] 5. M7 strings: toggle texts (same wording as DC4), soft-ask, card and results strings in
      `lib/l10n/app_{en,es,pt}.arb`; `lib/l10n/gen` regenerated with `flutter gen-l10n`. Test:
      `test/l10n_parity_test.dart` (unchanged, still green).
- [x] 6. Build and Test: `flutter analyze`, `flutter test`; web `npx vitest run`; game `npx jest`; summary
      `construction/build-and-test/daily-challenge-app-build-and-test-summary.md`.
