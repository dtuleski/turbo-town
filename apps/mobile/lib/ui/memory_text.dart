import '../config/constants.dart';
import '../l10n/gen/app_localizations.dart';

/// Localized names for Memory Match themes and difficulties.
String memoryThemeName(AppLocalizations l10n, String themeId) {
  switch (themeId) {
    case 'ANIMALS':
      return l10n.setup_memoryMatch_animals;
    case 'FRUITS':
      return l10n.setup_memoryMatch_fruits;
    case 'VEHICLES':
      return l10n.setup_memoryMatch_vehicles;
    case 'SPACE':
      return l10n.setup_memoryMatch_space;
    case 'OCEAN':
      return l10n.setup_memoryMatch_ocean;
    case 'FORMULA1':
      return l10n.setup_memoryMatch_formula1;
    default:
      return themeId;
  }
}

String memoryDifficultyLabel(AppLocalizations l10n, Difficulty d) {
  switch (d) {
    case Difficulty.easy:
      return l10n.game_easy;
    case Difficulty.medium:
      return l10n.game_medium;
    case Difficulty.hard:
      return l10n.game_hard;
    case Difficulty.superHard:
      return l10n.game_superHard;
  }
}

String memoryDifficultyDescription(AppLocalizations l10n, Difficulty d) {
  switch (d) {
    case Difficulty.easy:
      return l10n.setup_memoryMatch_easyDesc;
    case Difficulty.medium:
      return l10n.setup_memoryMatch_mediumDesc;
    case Difficulty.hard:
      return l10n.setup_memoryMatch_hardDesc;
    case Difficulty.superHard:
      return l10n.setup_memoryMatch_superHardDesc;
  }
}
