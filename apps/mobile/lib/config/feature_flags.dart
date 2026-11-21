/// How free users see paid games (see FEAT-003). This is the ONE switch for it.
///
/// Open product decision: the default is [neutralUnavailable]. No purchase or
/// pricing UI exists in the app; payments are deferred.
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
