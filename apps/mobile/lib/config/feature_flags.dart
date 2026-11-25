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
