/// How free users see paid games (see FEAT-003). This is the ONE switch for it.
///
/// The default is [neutralUnavailable]. On iOS, where App Store subscriptions
/// are offered (storeSubscriptionsEnabledProvider), those tiles open the plans
/// screen instead. Android keeps them inert until Google Play billing exists.
library;

enum PaidGamePresentation {
  /// Paid games are listed but marked unavailable, with no pricing or upsell.
  neutralUnavailable,

  /// Paid games are not shown to free users at all.
  hidden,

  /// Paid games are shown and open to every user (not enforced by the backend).
  openForAll,
}

const PaidGamePresentation kPaidGamePresentation =
    PaidGamePresentation.neutralUnavailable;

/// Shows "Continue with Apple" on the login screen. Turn on only once the
/// Cognito user pool has the SignInWithApple identity provider configured,
/// otherwise the Hosted UI returns an error.
const bool kSignInWithAppleEnabled = bool.fromEnvironment('SIGN_IN_WITH_APPLE', defaultValue: false);
