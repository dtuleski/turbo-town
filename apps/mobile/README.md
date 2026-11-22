# DashDen Mobile (Flutter)

Cross-platform (iOS/Android) client for DashDen. This MVP ships the **app shell**
(Cognito auth + navigation) and the **Memory Match** game, integrated with the
existing GraphQL game-service backend.

> The platform folders (`ios/`, `android/`) and `pubspec.lock` are committed.
> The native URL-scheme config for Google sign-in (below) is already applied.
> **Android has not been built or tested** in the environment this was set up in
> (no Android SDK, adb, emulator; Java on PATH is 1.8). iOS simulator builds are verified.

## Prerequisites (macOS)

- Flutter SDK (3.19+) and Dart 3.3+ — `flutter --version`
- Xcode + CocoaPods (for iOS): `sudo gem install cocoapods`
- An iOS Simulator or a connected device
- Run `flutter doctor` and resolve any issues

## Setup and commands
From `apps/mobile/`:
```bash
flutter pub get
flutter gen-l10n                  # only if you edit lib/l10n/*.arb by hand
flutter analyze && flutter test
flutter build ios --simulator --debug --no-codesign
flutter run -d <simulator id>     # use this to run: unsigned builds installed with simctl cannot use the Keychain
```
If the iOS build fails with "Failed to codesign ... Flutter.framework", the repo sits in a
synced folder (iCloud Documents) that adds Finder xattrs. Point `build/` at a folder outside it:
`mkdir -p /tmp/dashden_mobile_build && ln -s /tmp/dashden_mobile_build build`.

### Localization
`lib/l10n/app_{en,es,pt}.arb` are generated from `apps/web/src/locales/*.json`:
```bash
node tools/convert_locales.mjs && flutter gen-l10n
```
Keys are flattened (`a.b-c` -> `a_b_c`, arrays -> `name_0`), `{{x}}` -> `{x}`. Keys missing in
es/pt on web are filled from en (same fallback as i18next). Do not edit the ARB files by hand.
`tools/export_fixtures.mjs` is a skeleton for golden fixtures.

The Circuit Builder engine (`lib/game/circuit/engine/`) is a Dart port of
`packages/shared/src/circuit`. `tools/export_circuit_golden.mjs` runs the shared TypeScript
evaluator over every level and seeded random layouts and writes
`test/fixtures/circuit_golden.json`; `test/game/circuit_golden_test.dart` checks the Dart engine
against it. Re-run it (with `tsx`, e.g. `../web/node_modules/.bin/tsx`) after any change to the
shared engine. The server stays authoritative: it re-evaluates every submitted layout.

Space Coder (`lib/game/space_coder/logic.dart`) ports the command interpreter of
`apps/web/src/utils/scratchCodingUtils.ts`; `tools/export_space_coder_golden.mjs` writes
`test/fixtures/space_coder_golden.json` (levels, seeded obstacles, 305 program runs, 120 editing
sequences) for `test/game/space_coder_golden_test.dart`.

## Platform config for Google Sign-In (required after `flutter create`)

Google (Cognito Hosted UI) sign-in uses an OAuth redirect back to the app via a
custom URL scheme: **`dashdenmobile://callback`**. If you ever regenerate the platform
folders with `flutter create .`, re-apply the following native config.

The scheme/redirect are defined in `lib/config/env.dart`
(`oauthRedirectScheme = 'dashdenmobile'`) and are already registered on the prod
Cognito app client's callback/logout URLs.

### iOS — `ios/Runner/Info.plist`

Add a `CFBundleURLTypes` entry inside the top-level `<dict>`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLName</key>
    <string>app.dashden.oauth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>dashdenmobile</string>
    </array>
  </dict>
</array>
```

### Android — `android/app/src/main/AndroidManifest.xml` (needed for the Android build)

`flutter_web_auth_2` needs an activity with an intent-filter for the callback
scheme. Add inside `<application>`:

```xml
<activity
    android:name="com.linusu.flutter_web_auth_2.CallbackActivity"
    android:exported="true">
  <intent-filter android:label="flutter_web_auth_2">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="dashdenmobile" />
  </intent-filter>
</activity>
```

No Cognito change is needed for Android — the `dashdenmobile://callback` URL is
already allow-listed on the app client and is scheme-based (platform-agnostic).

## Run

```bash
# iOS simulator
flutter run -d ios

# or Android emulator / Chrome for quick UI iteration
flutter run -d chrome
```

### Pointing at a different backend

Config lives in `lib/config/env.dart` and can be overridden at run time.
Defaults point at the DashDen **production** backend (same values the web app
uses). To override:

```bash
flutter run \
  --dart-define=GAME_ENDPOINT=https://your-host/game/graphql \
  --dart-define=COGNITO_USER_POOL_ID=us-east-1_XXXX \
  --dart-define=COGNITO_CLIENT_ID=xxxxxxxx
```

## Architecture

```
lib/
├── main.dart                # Entry point: ProviderScope + router + auth splash
├── config/
│   ├── env.dart             # Endpoints + Cognito IDs (dart-define overridable)
│   └── constants.dart       # Storage keys, themes, Difficulty enum (apiValue 1–4)
├── auth/
│   ├── token_storage.dart   # Secure token store (Keychain / Keystore)
│   ├── cognito_service.dart # Pure-Dart Cognito (SRP sign-in, sign-up, refresh)
│   └── auth_controller.dart # Riverpod auth state + providers
├── api/
│   ├── graphql_client.dart  # graphql_flutter client + Bearer<idToken> AuthLink
│   ├── game_models.dart     # Dart models mirroring the GraphQL types
│   ├── quest_models.dart    # Quest Map models + QuestContext (world:node:leg)
│   ├── game_api.dart        # start/completeGame, catalog, quest progress, reviews
│   └── game_providers.dart  # Riverpod providers for the client + API
├── game/
│   ├── framework/           # Shared by every game (see "Game framework")
│   ├── game_registry.dart   # The 21 playable games: id, emoji, category, theme id, routes
│   ├── hub_logic.dart       # Which tiles the hub shows and what each can do
│   ├── hub_providers.dart   # Catalog + ratings + tier, quest progress
│   ├── memory_controller.dart # Memory Match board, on top of the framework
│   ├── card.dart            # MemoryCard model
│   └── game_logic.dart      # Card generation, matching, themes (ported from web)
├── quest/
│   ├── quest_launch.dart    # Leg -> app route (port of web questLaunch.ts)
│   └── quest_map_logic.dart # Node states, frontier, trail geometry (port of questMap.ts)
├── l10n/game_text.dart      # Game, quest world/node names by id
└── ui/
    ├── theme.dart
    ├── router.dart          # go_router with auth redirects
    └── screens/             # auth, hub, quest map, memory setup + game
```
## Game framework
`lib/game/framework/` is what a new game builds on:

- `GameSessionController` (`gameSessionProvider`): idle -> starting -> playing
  (<-> paused) -> completing -> completed, or failed / blocked. Owns the
  `startGame` call (with an optional `questContext`), the timer, attempts, pause
  count and the `completeGame` call. `complete(extra: {...})` forwards the
  per-game metrics the server scores from (`correctAnswers`, `totalQuestions`,
  `wordsFound`, `totalWords`, `hintsUsed`, `pauseCount`, `circuitSubmission`).
  The score always comes from the server.
- `GameSessionFrame`: page frame that starts the round and shows the spinner,
  `BlockedView`, pause screen, leave confirmation and `GameResultScreen`. A game
  only supplies its board.
- `GameResultScreen`: server score and breakdown, rank, achievements, quest
  outcome, rating, play again.
- `GameSetupScaffold`, `confirmLeaveGame`, `BlockedView`.
- `GameFeedback` (`gameFeedbackProvider`): sound cues synthesized like web
  `audioService.ts` plus haptics. Never throws. Sound preference key is the
  web `sound_enabled`.

To add a game: set `implemented: true` on its `GameEntry` in
`game_registry.dart`, add `/<game-id>/setup` and `/<game-id>/play` routes in
`ui/router.dart`, and (for quest legs) make sure its theme id is in
`kQuestLaunchTable`.

### OPEN DECISION: how paid games appear to free users
Payments are deferred, so there is no purchase or pricing UI. What a FREE user
sees for a paid game is one switch, `kPaidGamePresentation` in
`lib/config/feature_flags.dart`:

| Value | Free user sees |
|---|---|
| `neutralUnavailable` (default) | The tile, greyed, labelled "Not available in the app yet". No price, no upsell, no mention of a store. |
| `hidden` | The tile is not listed. |
| `openForAll` | The tile is playable; the backend still rejects the start and the game shows the neutral "not available" page. |

The tier comes from the backend (`canStartGame`). Paid ids are
`kPaidGameThemeIds`, kept equal to `packages/shared` by a test. The product
owner has not chosen yet; change the constant to switch.

## Backend integration

- **Auth**: AWS Cognito. After sign-in we keep the **ID token** and send it as
  `Authorization: Bearer <idToken>` on every GraphQL request — matching the web
  app, since the API Gateway JWT authorizer reads ID-token claims (`email`,
  `preferred_username`).
- **Game service**: GraphQL at `…/game/graphql`. The Memory Match flow calls
  `startGame` on begin (server enforces tier/rate limits), then `completeGame`
  with elapsed seconds + attempts, and shows the server-computed score.
- Entitlement and rate-limit errors from the backend are surfaced in the game
  screen (`BlockedView`) without any purchase flow.
- **Hub and Quest Map**: `listAvailableGames`, `getReviewStats`, `canStartGame`
  and `getQuestProgress`. A game opened from a quest node sends
  `questContext {worldId, nodeId, legIndex}` to `startGame`; `completeGame`
  returns the quest result (stars, unlocks) that the result page and the map show.

## Not in this MVP (intentionally deferred)

- Apple In-App Purchase / subscriptions (Stripe stays on web; IAP is a separate
  workstream — see the subscription design discussion).
- Leaderboards, statistics, achievements screens.
- Games other than Memory Match (the hub lists all 21; the others show "Coming to the app soon").
```
