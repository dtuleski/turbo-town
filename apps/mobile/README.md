# DashDen Mobile (Flutter)

Cross-platform (iOS/Android) client for DashDen. This MVP ships the **app shell**
(Cognito auth + navigation) and the **Memory Match** game, integrated with the
existing GraphQL game-service backend.

> This project's Dart source was authored on a Windows machine. The platform
> folders (`ios/`, `android/`, etc.) and `pubspec.lock` are **not** committed —
> generate them on your Mac with `flutter create .` (see below).

## Prerequisites (macOS)

- Flutter SDK (3.19+) and Dart 3.3+ — `flutter --version`
- Xcode + CocoaPods (for iOS): `sudo gem install cocoapods`
- An iOS Simulator or a connected device
- Run `flutter doctor` and resolve any issues

## First-time setup

From `apps/mobile/`:

```bash
# 1. Generate the native platform folders around the existing lib/.
#    This is safe: it won't overwrite lib/, pubspec.yaml, or analysis_options.yaml.
flutter create --project-name dashden_mobile --org app.dashden .

# 2. Fetch dependencies
flutter pub get

# 3. (iOS) install pods
cd ios && pod install && cd ..
```

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
│   ├── game_api.dart        # startGame / completeGame / canStartGame
│   └── game_providers.dart  # Riverpod providers for the client + API
├── game/
│   ├── card.dart            # MemoryCard model
│   ├── game_logic.dart      # Card generation, matching, themes (ported from web)
│   └── game_controller.dart # Game lifecycle StateNotifier (calls backend)
└── ui/
    ├── theme.dart
    ├── router.dart          # go_router with auth redirects
    └── screens/             # login, register, home, memory setup + game
```

## Backend integration

- **Auth**: AWS Cognito. After sign-in we keep the **ID token** and send it as
  `Authorization: Bearer <idToken>` on every GraphQL request — matching the web
  app, since the API Gateway JWT authorizer reads ID-token claims (`email`,
  `preferred_username`).
- **Game service**: GraphQL at `…/game/graphql`. The Memory Match flow calls
  `startGame` on begin (server enforces tier/rate limits), then `completeGame`
  with elapsed seconds + attempts, and shows the server-computed score.
- Entitlement/paywall and rate-limit errors from the backend are surfaced in the
  game screen (`BlockedView`).

## Not in this MVP (intentionally deferred)

- Apple In-App Purchase / subscriptions (Stripe stays on web; IAP is a separate
  workstream — see the subscription design discussion).
- Leaderboards, statistics, achievements screens.
- Games other than Memory Match.
- Localization (the web app supports en/es/pt).
```
