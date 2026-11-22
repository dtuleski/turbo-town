import '../api/quest_models.dart';
import '../config/constants.dart';
import '../game/game_registry.dart';

/// How a quest leg's query parameters are built. Same kinds as web
/// `utils/questLaunch.ts`.
enum LaunchKind { card, difficulty, sequence, pattern, circuit }

class LaunchRow {
  const LaunchRow(this.kind, this.gameId);
  final LaunchKind kind;

  /// Registry game id whose play route is launched.
  final String gameId;
}

/// One row per server theme id a quest leg can use (web `QUEST_LAUNCH_TABLE`).
final Map<String, LaunchRow> kQuestLaunchTable = Map.unmodifiable({
  for (final t in kGameThemes) t.id: const LaunchRow(LaunchKind.card, 'memory-match'),
  'MATH_CHALLENGE': const LaunchRow(LaunchKind.difficulty, 'math-challenge'),
  'WORD_PUZZLE': const LaunchRow(LaunchKind.difficulty, 'word-puzzle'),
  'SEQUENCE_MEMORY': const LaunchRow(LaunchKind.sequence, 'sequence-memory'),
  'PATTERN_RECALL': const LaunchRow(LaunchKind.pattern, 'pattern-recall'),
  'GEO_QUIZ': const LaunchRow(LaunchKind.difficulty, 'geo-quiz'),
  'MATH_MAZE': const LaunchRow(LaunchKind.difficulty, 'math-maze'),
  'BUBBLE_POP': const LaunchRow(LaunchKind.difficulty, 'bubble-pop'),
  'BOND_AND_BURN': const LaunchRow(LaunchKind.difficulty, 'bond-and-burn'),
  'SPACE_ENTRY': const LaunchRow(LaunchKind.difficulty, 'space-entry'),
  'MINI_GOLF': const LaunchRow(LaunchKind.difficulty, 'mini-golf'),
  'SCRATCH_CODING': const LaunchRow(LaunchKind.difficulty, 'scratch-coding'),
  'CIRCUIT_BUILDER': const LaunchRow(LaunchKind.circuit, 'circuit-builder'),
});

const Map<int, String> _difficultyNames = {1: 'easy', 2: 'medium', 3: 'hard'};

/// App route for one leg ending with `quest=<world>:<node>:<leg>`, or null when
/// the leg cannot be launched (unknown theme, missing param, bad difficulty).
String? buildLaunchPath(LegView leg, QuestContext ref) {
  final row = kQuestLaunchTable[leg.themeId];
  if (row == null) return null;
  final game = gameById(row.gameId);
  if (game == null) return null;
  final query = <String, String>{};
  final name = _difficultyNames[leg.difficulty];
  switch (row.kind) {
    case LaunchKind.card:
      if (name == null) return null;
      query['theme'] = leg.themeId;
      query['difficulty'] = name;
    case LaunchKind.difficulty:
      if (name == null) return null;
      query['difficulty'] = name;
    case LaunchKind.sequence:
      if (name == null) return null;
      query['difficulty'] = name;
      final pageTheme = leg.params?.pageTheme;
      if (pageTheme != null && pageTheme.isNotEmpty) query['theme'] = pageTheme;
    case LaunchKind.pattern:
      final pageTheme = leg.params?.pageTheme;
      if (name == null || pageTheme == null || pageTheme.isEmpty) return null;
      query['theme'] = pageTheme;
      query['difficulty'] = name;
    case LaunchKind.circuit:
      if (leg.difficulty < 1 || leg.difficulty > 4) return null;
      final levelId = leg.params?.levelId;
      if (levelId == null || levelId.isEmpty) return null;
      query['difficulty'] = '${leg.difficulty}';
      query['level'] = levelId;
  }
  query['quest'] = ref.encode();
  return Uri(path: game.playRoute, queryParameters: query).toString();
}

/// True when the leg's game has screens in this app.
bool isLegPlayableInApp(LegView leg) {
  final row = kQuestLaunchTable[leg.themeId];
  if (row == null) return false;
  return gameById(row.gameId)?.implemented ?? false;
}

/// Path of the next boss leg after [result], or null when the run has none.
String? nextLegPath(QuestResult? result) {
  final g = result?.gauntlet;
  if (result == null || g == null || g.status != 'IN_PROGRESS' || g.nextLeg == null) {
    return null;
  }
  return buildLaunchPath(
    g.nextLeg!,
    QuestContext(
      worldId: result.worldId,
      nodeId: result.nodeId,
      legIndex: g.legIndex + 1,
    ),
  );
}

/// Memory Match settings from a launch URL (`theme`, `difficulty`). Invalid
/// values return null so the screen falls back to setup.
({String themeId, Difficulty difficulty})? resolveMemorySettings(
  Map<String, String> query,
) {
  final theme = query['theme'];
  final diff = query['difficulty']?.toUpperCase();
  if (theme == null || !kGameThemes.any((t) => t.id == theme)) return null;
  for (final d in Difficulty.values) {
    // Like web, a launch URL can name easy, medium or hard only.
    if (d != Difficulty.superHard && d.id == diff) return (themeId: theme, difficulty: d);
  }
  return null;
}
