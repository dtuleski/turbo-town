import '../config/paid_games.dart';

/// Hub filter groups. Mirrors `GAME_FILTER_MAP` in apps/web
/// `src/pages/hub/GameHubPage.tsx`.
enum GameCategory {
  scienceMath,
  historyCivics,
  geographyLanguage,
  puzzlesLogic,

  /// Listed only under "All" (no filter chip), like web mini-golf.
  other,
}

/// One playable game. The registry is the app's own list: the catalog from the
/// server decides status and order, this decides what the app can show.
class GameEntry {
  const GameEntry({
    required this.gameId,
    required this.emoji,
    required this.category,
    this.themeId,
    this.implemented = false,
  });

  /// Catalog id, kebab-case (e.g. `memory-match`).
  final String gameId;

  /// Fallback icon when the catalog has none.
  final String emoji;
  final GameCategory category;

  /// Server theme id sent to `startGame`. Null for Memory Match, where the
  /// card theme (ANIMALS, FRUITS...) is the theme id.
  final String? themeId;

  /// True once the game has screens in the app. Later features flip this and
  /// register the routes below.
  final bool implemented;

  /// Paid games are the ones the backend blocks for FREE users
  /// (`kPaidGameThemeIds`).
  bool get isPaid => themeId != null && isPaidGameTheme(themeId!);

  String get setupRoute => '/$gameId/setup';
  String get playRoute => '/$gameId/play';

  /// Key the review APIs use for this game (`MEMORY_MATCH`).
  String get reviewType => gameId.toUpperCase().replaceAll('-', '_');
}

/// The 21 games playable in the app. `color-by-number` and `traffic-lab` are
/// Coming Soon on web and are left out on purpose.
const List<GameEntry> kGameRegistry = [
  GameEntry(
    gameId: 'memory-match',
    emoji: '🃏',
    category: GameCategory.puzzlesLogic,
    implemented: true,
  ),
  GameEntry(
    gameId: 'math-challenge',
    emoji: '➗',
    category: GameCategory.scienceMath,
    themeId: 'MATH_CHALLENGE',
  ),
  GameEntry(
    gameId: 'word-puzzle',
    emoji: '🔤',
    category: GameCategory.puzzlesLogic,
    themeId: 'WORD_PUZZLE',
  ),
  GameEntry(
    gameId: 'language-learning',
    emoji: '🌍',
    category: GameCategory.geographyLanguage,
    themeId: 'LANGUAGE_LEARNING',
  ),
  GameEntry(
    gameId: 'sudoku',
    emoji: '🔢',
    category: GameCategory.scienceMath,
    themeId: 'SUDOKU',
  ),
  GameEntry(
    gameId: 'jigsaw-puzzle',
    emoji: '🧩',
    category: GameCategory.puzzlesLogic,
    themeId: 'JIGSAW_PUZZLE',
  ),
  GameEntry(
    gameId: 'bubble-pop',
    emoji: '🫧',
    category: GameCategory.puzzlesLogic,
    themeId: 'BUBBLE_POP',
  ),
  GameEntry(
    gameId: 'sequence-memory',
    emoji: '🔁',
    category: GameCategory.puzzlesLogic,
    themeId: 'SEQUENCE_MEMORY',
  ),
  GameEntry(
    gameId: 'code-a-bot',
    emoji: '🤖',
    category: GameCategory.puzzlesLogic,
    themeId: 'CODE_A_BOT',
  ),
  GameEntry(
    gameId: 'geo-quiz',
    emoji: '🗺',
    category: GameCategory.geographyLanguage,
    themeId: 'GEO_QUIZ',
  ),
  GameEntry(
    gameId: 'history-quiz',
    emoji: '📜',
    category: GameCategory.historyCivics,
    themeId: 'HISTORY_QUIZ',
  ),
  GameEntry(
    gameId: 'civics-quiz',
    emoji: '🏛',
    category: GameCategory.historyCivics,
    themeId: 'CIVICS_QUIZ',
  ),
  GameEntry(
    gameId: 'hangman',
    emoji: '🪢',
    category: GameCategory.puzzlesLogic,
    themeId: 'HANGMAN',
  ),
  GameEntry(
    gameId: 'tic-tac-toe',
    emoji: '❌',
    category: GameCategory.puzzlesLogic,
    themeId: 'TIC_TAC_TOE',
  ),
  GameEntry(
    gameId: 'scratch-coding',
    emoji: '👩‍🚀',
    category: GameCategory.puzzlesLogic,
    themeId: 'SCRATCH_CODING',
  ),
  GameEntry(
    gameId: 'math-maze',
    emoji: '🧮',
    category: GameCategory.scienceMath,
    themeId: 'MATH_MAZE',
  ),
  GameEntry(
    gameId: 'pattern-recall',
    emoji: '🎵',
    category: GameCategory.puzzlesLogic,
    themeId: 'PATTERN_RECALL',
  ),
  GameEntry(
    gameId: 'space-entry',
    emoji: '🚀',
    category: GameCategory.scienceMath,
    themeId: 'SPACE_ENTRY',
  ),
  GameEntry(
    gameId: 'bond-and-burn',
    emoji: '⚗',
    category: GameCategory.scienceMath,
    themeId: 'BOND_AND_BURN',
  ),
  GameEntry(
    gameId: 'circuit-builder',
    emoji: '🔌',
    category: GameCategory.scienceMath,
    themeId: 'CIRCUIT_BUILDER',
  ),
  GameEntry(
    gameId: 'mini-golf',
    emoji: '⛳',
    category: GameCategory.other,
    themeId: 'MINI_GOLF',
  ),
];

GameEntry? gameById(String gameId) {
  for (final g in kGameRegistry) {
    if (g.gameId == gameId) return g;
  }
  return null;
}

/// Entry for a server theme id (`MATH_CHALLENGE`). Memory Match card themes
/// (ANIMALS...) are not in the table; use [kMemoryCardThemeIds].
GameEntry? gameByThemeId(String themeId) {
  for (final g in kGameRegistry) {
    if (g.themeId == themeId) return g;
  }
  return null;
}

/// Hub filter chips in display order. `null` category = All.
const List<({GameCategory? category, String emoji})> kHubFilters = [
  (category: null, emoji: '🎮'),
  (category: GameCategory.scienceMath, emoji: '🔬'),
  (category: GameCategory.historyCivics, emoji: '📚'),
  (category: GameCategory.geographyLanguage, emoji: '🌍'),
  (category: GameCategory.puzzlesLogic, emoji: '🧩'),
];
