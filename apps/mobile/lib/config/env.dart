/// Environment configuration.
///
/// Values mirror the web app's production config (apps/web `.env`).
/// Override any of these at build/run time with --dart-define, e.g.:
///   flutter run --dart-define=GAME_ENDPOINT=https://.../game/graphql
///
/// Nothing here is secret: the Cognito pool/client IDs and API URLs are
/// public client-side config (same values ship in the web bundle).
class Env {
  const Env._();

  // ── Cognito ────────────────────────────────────────────────────────────
  static const String cognitoRegion = String.fromEnvironment(
    'COGNITO_REGION',
    defaultValue: 'us-east-1',
  );

  static const String cognitoUserPoolId = String.fromEnvironment(
    'COGNITO_USER_POOL_ID',
    defaultValue: 'us-east-1_FoWLQ5lmI',
  );

  static const String cognitoClientId = String.fromEnvironment(
    'COGNITO_CLIENT_ID',
    defaultValue: '2mtbfk302lr43cuhjf8it8of9o',
  );

  // ── GraphQL endpoints ────────────────────────────────────────────────────
  static const String authEndpoint = String.fromEnvironment(
    'AUTH_ENDPOINT',
    defaultValue:
        'https://7pwns5lkof.execute-api.us-east-1.amazonaws.com/auth/graphql',
  );

  static const String gameEndpoint = String.fromEnvironment(
    'GAME_ENDPOINT',
    defaultValue:
        'https://7pwns5lkof.execute-api.us-east-1.amazonaws.com/game/graphql',
  );

  static const String leaderboardEndpoint = String.fromEnvironment(
    'LEADERBOARD_ENDPOINT',
    defaultValue:
        'https://7pwns5lkof.execute-api.us-east-1.amazonaws.com/leaderboard/graphql',
  );

  static const String appName = 'DashDen';
}
