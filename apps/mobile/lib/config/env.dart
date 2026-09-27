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

  // ── Hosted UI OAuth (Google federated sign-in) ──────────────────────────
  /// Cognito Hosted UI domain prefix. Full host is
  /// `<prefix>.auth.<region>.amazoncognito.com`.
  static const String cognitoDomainPrefix = String.fromEnvironment(
    'COGNITO_DOMAIN_PREFIX',
    defaultValue: 'dashden-prod',
  );

  /// Base URL of the Cognito Hosted UI / OAuth endpoints.
  static String get hostedUiBaseUrl =>
      'https://$cognitoDomainPrefix.auth.$cognitoRegion.amazoncognito.com';

  /// Custom URL scheme + redirect used for the mobile OAuth callback.
  /// Must match a CallbackURL configured on the Cognito app client and the
  /// CFBundleURLSchemes entry in ios/Runner/Info.plist.
  static const String oauthRedirectScheme = 'dashdenmobile';
  static const String oauthRedirectUri = 'dashdenmobile://callback';
  static const String oauthSignOutUri = 'dashdenmobile://signout';

  /// OAuth scopes requested for the Hosted UI flow (match the app client).
  static const List<String> oauthScopes = [
    'openid',
    'email',
    'profile',
    'aws.cognito.signin.user.admin',
  ];

  static const String appName = 'DashDen';
}
