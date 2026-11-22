/// Models for statistics, leaderboard, email preferences and contact.
library;

/// Leaderboard service game types. The wire value is [name] upper-cased.
enum LeaderboardGameType {
  overall('OVERALL'),
  memoryMatch('MEMORY_MATCH'),
  mathChallenge('MATH_CHALLENGE'),
  wordPuzzle('WORD_PUZZLE'),
  languageLearning('LANGUAGE_LEARNING'),
  sudoku('SUDOKU'),
  jigsawPuzzle('JIGSAW_PUZZLE'),
  bubblePop('BUBBLE_POP'),
  sequenceMemory('SEQUENCE_MEMORY'),
  codeABot('CODE_A_BOT'),
  geoQuiz('GEO_QUIZ'),
  historyQuiz('HISTORY_QUIZ'),
  civicsQuiz('CIVICS_QUIZ'),
  colorByNumber('COLOR_BY_NUMBER'),
  hangman('HANGMAN'),
  ticTacToe('TIC_TAC_TOE'),
  mathMaze('MATH_MAZE'),
  patternRecall('PATTERN_RECALL'),
  spaceEntry('SPACE_ENTRY'),
  scratchCoding('SCRATCH_CODING'),
  bondAndBurn('BOND_AND_BURN'),
  trafficLab('TRAFFIC_LAB'),
  miniGolf('MINI_GOLF'),
  circuitBuilder('CIRCUIT_BUILDER');

  const LeaderboardGameType(this.wire);
  final String wire;
}

enum LeaderboardTimeframe {
  daily('DAILY'),
  weekly('WEEKLY'),
  monthly('MONTHLY'),
  allTime('ALL_TIME');

  const LeaderboardTimeframe(this.wire);
  final String wire;
}

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.userId,
    required this.username,
    required this.score,
    required this.gameType,
    required this.difficulty,
    required this.completionTime,
    required this.accuracy,
    required this.timestamp,
    required this.isCurrentUser,
  });

  final int rank;
  final String userId;
  final String username;
  final int score;

  /// Wire value such as `MEMORY_MATCH`; kept as a string so a type this app
  /// does not know yet still displays.
  final String gameType;
  final String difficulty;

  /// Seconds.
  final double completionTime;

  /// 0..1.
  final double accuracy;
  final DateTime timestamp;
  final bool isCurrentUser;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: (json['rank'] as num?)?.toInt() ?? 0,
      userId: json['userId'] as String? ?? '',
      username: json['username'] as String? ?? '',
      score: (json['score'] as num?)?.toInt() ?? 0,
      gameType: json['gameType'] as String? ?? '',
      difficulty: json['difficulty'] as String? ?? '',
      completionTime: (json['completionTime'] as num?)?.toDouble() ?? 0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      isCurrentUser: json['isCurrentUser'] as bool? ?? false,
    );
  }
}

class LeaderboardResult {
  const LeaderboardResult({
    required this.entries,
    required this.totalEntries,
    this.currentUserEntry,
  });

  final List<LeaderboardEntry> entries;
  final LeaderboardEntry? currentUserEntry;
  final int totalEntries;

  factory LeaderboardResult.fromJson(Map<String, dynamic> json) {
    final me = json['currentUserEntry'];
    return LeaderboardResult(
      entries: ((json['entries'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(LeaderboardEntry.fromJson)
          .toList(),
      currentUserEntry:
          me is Map<String, dynamic> ? LeaderboardEntry.fromJson(me) : null,
      totalEntries: (json['totalEntries'] as num?)?.toInt() ?? 0,
    );
  }
}

class UserRank {
  const UserRank({
    required this.rank,
    required this.score,
    required this.totalPlayers,
    required this.percentile,
  });

  final int rank;
  final int score;
  final int totalPlayers;
  final double percentile;

  factory UserRank.fromJson(Map<String, dynamic> json) => UserRank(
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        score: (json['score'] as num?)?.toInt() ?? 0,
        totalPlayers: (json['totalPlayers'] as num?)?.toInt() ?? 0,
        percentile: (json['percentile'] as num?)?.toDouble() ?? 0,
      );
}

class UserStatistics {
  const UserStatistics({
    required this.totalGames,
    required this.totalCompletedGames,
    required this.averageScore,
    required this.bestScore,
    required this.averageCompletionTime,
    required this.currentStreak,
    required this.longestStreak,
    this.fastestCompletionTime,
    this.favoriteThemeName,
  });

  final int totalGames;
  final int totalCompletedGames;
  final double averageScore;
  final int bestScore;
  final double averageCompletionTime;
  final double? fastestCompletionTime;
  final String? favoriteThemeName;
  final int currentStreak;
  final int longestStreak;

  factory UserStatistics.fromJson(Map<String, dynamic> json) {
    final theme = json['favoriteTheme'];
    return UserStatistics(
      totalGames: (json['totalGames'] as num?)?.toInt() ?? 0,
      totalCompletedGames: (json['totalCompletedGames'] as num?)?.toInt() ?? 0,
      averageScore: (json['averageScore'] as num?)?.toDouble() ?? 0,
      bestScore: (json['bestScore'] as num?)?.toInt() ?? 0,
      averageCompletionTime:
          (json['averageCompletionTime'] as num?)?.toDouble() ?? 0,
      fastestCompletionTime: (json['fastestCompletionTime'] as num?)?.toDouble(),
      favoriteThemeName: theme is Map<String, dynamic>
          ? theme['name'] as String?
          : null,
      currentStreak: (json['currentStreak'] as num?)?.toInt() ?? 0,
      longestStreak: (json['longestStreak'] as num?)?.toInt() ?? 0,
    );
  }
}

class HistoryGame {
  const HistoryGame({
    required this.id,
    required this.themeId,
    required this.themeName,
    required this.difficulty,
    required this.completionTime,
    required this.attempts,
    required this.score,
    this.completedAt,
  });

  final String id;
  final String themeId;
  final String themeName;
  final int difficulty;
  final DateTime? completedAt;
  final int completionTime;
  final int attempts;
  final int score;

  factory HistoryGame.fromJson(Map<String, dynamic> json) => HistoryGame(
        id: json['id'] as String? ?? '',
        themeId: json['themeId'] as String? ?? '',
        themeName: json['themeName'] as String? ?? '',
        difficulty: (json['difficulty'] as num?)?.toInt() ?? 0,
        completedAt: DateTime.tryParse(json['completedAt'] as String? ?? ''),
        completionTime: (json['completionTime'] as num?)?.toInt() ?? 0,
        attempts: (json['attempts'] as num?)?.toInt() ?? 0,
        score: (json['score'] as num?)?.toInt() ?? 0,
      );
}

class GameHistoryPage {
  const GameHistoryPage({
    required this.games,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.hasMore,
  });

  final List<HistoryGame> games;
  final int total;
  final int page;
  final int pageSize;
  final bool hasMore;

  factory GameHistoryPage.fromJson(Map<String, dynamic> json) {
    final p = (json['pagination'] as Map<String, dynamic>?) ?? const {};
    return GameHistoryPage(
      games: ((json['games'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(HistoryGame.fromJson)
          .toList(),
      total: (p['total'] as num?)?.toInt() ?? 0,
      page: (p['page'] as num?)?.toInt() ?? 1,
      pageSize: (p['pageSize'] as num?)?.toInt() ?? 0,
      hasMore: p['hasMore'] as bool? ?? false,
    );
  }
}

class EmailPrefs {
  const EmailPrefs({required this.dailyDigest});
  final bool dailyDigest;

  factory EmailPrefs.fromJson(Map<String, dynamic> json) =>
      EmailPrefs(dailyDigest: json['dailyDigest'] as bool? ?? false);
}

enum ContactType { bug, feature, question, other }
