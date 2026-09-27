/// App-wide constants for the Memory Match MVP.
/// Mirrors apps/web `src/config/constants.ts` (GAME_THEMES / DIFFICULTY_LEVELS).
library;

/// Secure-storage keys.
class StorageKeys {
  const StorageKeys._();
  static const String idToken = 'id_token';
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String userEmail = 'user_email';
  static const String username = 'username';
}

/// A Memory Match theme. `id` is the value sent to the backend as `themeId`.
class GameThemeDef {
  const GameThemeDef({
    required this.id,
    required this.name,
    required this.emoji,
  });

  final String id;
  final String name;
  final String emoji;
}

const List<GameThemeDef> kGameThemes = [
  GameThemeDef(id: 'ANIMALS', name: 'Animals', emoji: '🐶'),
  GameThemeDef(id: 'FRUITS', name: 'Fruits', emoji: '🍎'),
  GameThemeDef(id: 'VEHICLES', name: 'Vehicles', emoji: '🚗'),
  GameThemeDef(id: 'SPACE', name: 'Space', emoji: '🚀'),
  GameThemeDef(id: 'OCEAN', name: 'Ocean', emoji: '🐠'),
  GameThemeDef(id: 'FORMULA1', name: 'Formula 1', emoji: '🏎️'),
];

/// Difficulty levels. `apiValue` is the 1–4 int the backend expects.
enum Difficulty {
  easy('EASY', 'Easy', 1, '6 pairs — perfect for beginners'),
  medium('MEDIUM', 'Medium', 2, '8 pairs — a good challenge'),
  hard('HARD', 'Hard', 3, '10 pairs — for memory masters'),
  superHard('SUPER_HARD', 'Super Hard', 4, '15 pairs — paid members only!');

  const Difficulty(this.id, this.label, this.apiValue, this.description);

  final String id;
  final String label;
  final int apiValue;
  final String description;
}
