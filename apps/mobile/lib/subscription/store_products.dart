/// App Store subscription products. Same plans as https://dashden.app/subscription.
///
/// The ids must match the products created in App Store Connect (one
/// subscription group) and the backend map in
/// services/game/src/services/apple.service.ts (DEFAULT_APPLE_PRODUCT_TIERS).
/// Prices shown in the app always come from the store, never from here.
library;

class StorePlan {
  const StorePlan({required this.productId, required this.tier, required this.playsPerDay});
  final String productId;
  final String tier;
  final int playsPerDay;
}

const List<StorePlan> kStorePlans = [
  StorePlan(productId: 'dashden.light.monthly', tier: 'LIGHT', playsPerDay: 20),
  StorePlan(productId: 'dashden.standard.monthly', tier: 'STANDARD', playsPerDay: 100),
  StorePlan(productId: 'dashden.premium.monthly', tier: 'PREMIUM', playsPerDay: 1000),
];

StorePlan? planForProduct(String productId) {
  for (final p in kStorePlans) {
    if (p.productId == productId) return p;
  }
  return null;
}

/// Apple's standard license agreement (used when the app has no custom EULA).
const String kTermsOfUseUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/// Privacy policy. The page must exist before App Store submission.
const String kPrivacyPolicyUrl = 'https://dashden.app/privacy';

/// DashDen's own terms of service (accounts, acceptable use, web billing).
const String kServiceTermsUrl = 'https://dashden.app/terms';
