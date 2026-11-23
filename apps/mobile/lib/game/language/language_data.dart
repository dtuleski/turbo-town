/// Fixed tables for Language Learning. Port of the constants in apps/web
/// `pages/language/*`.
library;

class LanguageInfo {
  const LanguageInfo(this.code, this.name, this.nativeName, this.flag);

  final String code;
  final String name;
  final String nativeName;
  final String flag;
}

const List<LanguageInfo> kLanguages = [
  LanguageInfo('en', 'English', 'English', '🇺🇸'),
  LanguageInfo('es', 'Spanish', 'Español', '🇪🇸'),
  LanguageInfo('fr', 'French', 'Français', '🇫🇷'),
  LanguageInfo('it', 'Italian', 'Italiano', '🇮🇹'),
  LanguageInfo('de', 'German', 'Deutsch', '🇩🇪'),
  LanguageInfo('pt', 'Portuguese', 'Português', '🇧🇷'),
  LanguageInfo('el', 'Greek', 'Ελληνικά', '🇬🇷'),
];

LanguageInfo? languageByCode(String? code) {
  for (final l in kLanguages) {
    if (l.code == code) return l;
  }
  return null;
}

class LanguageDifficulty {
  const LanguageDifficulty(this.id, this.icon, this.wordCount, this.apiValue, this.targetSeconds);

  final String id;
  final String icon;

  /// Words in an Image Match round.
  final int wordCount;
  final int apiValue;

  /// Round length after which the local fallback score starts to drop.
  final int targetSeconds;
}

const List<LanguageDifficulty> kLanguageDifficulties = [
  LanguageDifficulty('beginner', '🌱', 10, 1, 30),
  LanguageDifficulty('intermediate', '🌿', 15, 2, 45),
  LanguageDifficulty('advanced', '🌳', 20, 3, 60),
];

LanguageDifficulty languageDifficultyById(String? id) =>
    kLanguageDifficulties.firstWhere((d) => d.id == id, orElse: () => kLanguageDifficulties.first);

/// Words per round in Pronunciation mode (fewer than Image Match).
const Map<String, int> kPronunciationWordCounts = {
  'beginner': 5,
  'intermediate': 8,
  'advanced': 12,
};

/// Category ids sent to `getLanguageWords`, with their icons.
const List<({String id, String icon})> kLanguageCategories = [
  (id: 'animals', icon: '🐕'),
  (id: 'food_drinks', icon: '🍎'),
  (id: 'colors', icon: '🌈'),
  (id: 'numbers', icon: '🔢'),
  (id: 'objects', icon: '📱'),
  (id: 'nature', icon: '🌲'),
];

bool isLanguageCategory(String? id) => kLanguageCategories.any((c) => c.id == id);

enum LanguageMode { imageMatch, pronunciation }

String languageModeId(LanguageMode m) =>
    m == LanguageMode.pronunciation ? 'pronunciation' : 'image-match';

LanguageMode languageModeFromId(String? id) =>
    id == 'pronunciation' ? LanguageMode.pronunciation : LanguageMode.imageMatch;

/// Server theme for [mode]. Pronunciation is a paid theme.
String languageThemeId(LanguageMode mode) =>
    mode == LanguageMode.pronunciation ? 'LANGUAGE_PRONUNCIATION' : 'LANGUAGE_LEARNING';

/// What one Language Learning round needs.
typedef LanguageArgs = ({
  String lang,
  String category,
  String difficulty,
  LanguageMode mode,
});

/// Words to fetch for [args].
int languageWordCount(LanguageArgs args) => args.mode == LanguageMode.pronunciation
    ? (kPronunciationWordCounts[args.difficulty] ?? 5)
    : languageDifficultyById(args.difficulty).wordCount;
