/// Theme ids blocked for FREE users.
///
/// Copied from packages/shared/src/constants/paid-games.ts. A test parses that
/// file and fails if the two lists differ.
library;

const List<String> kPaidGameThemeIds = [
  'SPACE_ENTRY',
  'SCRATCH_CODING',
  'BOND_AND_BURN',
  'TRAFFIC_LAB',
  'MINI_GOLF',
  'LANGUAGE_PRONUNCIATION',
  'CIRCUIT_BUILDER',
];

bool isPaidGameTheme(String themeId) => kPaidGameThemeIds.contains(themeId);
