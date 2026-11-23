import 'package:dashden_mobile/api/feature_providers.dart';
import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/api/leaderboard_api.dart';
import 'package:dashden_mobile/api/profile_api.dart';
import 'package:dashden_mobile/api/stats_api.dart';
import 'package:dashden_mobile/api/stats_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

LeaderboardEntry entry({
  int rank = 1,
  String username = 'ana',
  int score = 1000,
  String gameType = 'MEMORY_MATCH',
  String difficulty = 'easy',
  double time = 40,
  double accuracy = 0.8,
  DateTime? at,
  bool me = false,
}) =>
    LeaderboardEntry(
      rank: rank,
      userId: 'u$rank',
      username: username,
      score: score,
      gameType: gameType,
      difficulty: difficulty,
      completionTime: time,
      accuracy: accuracy,
      timestamp: at ?? DateTime.now().subtract(Duration(days: rank)),
      isCurrentUser: me,
    );

UserStatistics stats({int games = 3, int best = 1200}) => UserStatistics(
      totalGames: games,
      totalCompletedGames: games,
      averageScore: 900,
      bestScore: best,
      averageCompletionTime: 40,
      currentStreak: 1,
      longestStreak: 2,
    );

class FakeStatsApi implements StatsApi {
  FakeStatsApi({this.statistics, this.fail = false});
  UserStatistics? statistics;
  bool fail;
  @override
  Future<UserStatistics> getUserStatistics() async {
    if (fail) throw GameApiException('boom');
    return statistics ?? stats();
  }

  @override
  Future<GameHistoryPage> getGameHistory({
    int page = 1,
    int pageSize = 10,
    String? sortBy,
    String? sortOrder,
    String? themeId,
    int? difficulty,
    String? startDate,
    String? endDate,
  }) async =>
      const GameHistoryPage(
          games: [], total: 0, page: 1, pageSize: 10, hasMore: false);
}

class FakeLeaderboardApi implements LeaderboardApi {
  FakeLeaderboardApi({
    this.history = const [],
    this.board,
    this.rank,
    this.failHistory = false,
    this.failBoard = false,
  });
  List<LeaderboardEntry> history;
  LeaderboardResult? board;
  UserRank? rank;
  bool failHistory;
  bool failBoard;
  final List<String> boardCalls = [];

  @override
  Future<LeaderboardResult> getLeaderboard(
    LeaderboardGameType gameType,
    LeaderboardTimeframe timeframe, {
    int limit = 100,
  }) async {
    boardCalls.add('${gameType.wire}:${timeframe.wire}');
    if (failBoard) throw GameApiException('boom');
    return board ?? const LeaderboardResult(entries: [], totalEntries: 0);
  }

  @override
  Future<UserRank?> getUserRank(
    LeaderboardGameType gameType,
    LeaderboardTimeframe timeframe,
  ) async =>
      rank;

  @override
  Future<List<LeaderboardEntry>> getUserScoreHistory({
    LeaderboardGameType? gameType,
    int limit = 50,
  }) async {
    if (failHistory) throw GameApiException('boom');
    return history;
  }
}

class FakeProfileApi implements ProfileApi {
  FakeProfileApi({this.digest = false, this.failLoad = false, this.failSave = false, this.failContact = false});
  bool digest;
  bool failLoad;
  bool failSave;
  bool failContact;
  final List<bool> saves = [];
  final List<({ContactType type, String subject, String message})> contacts = [];

  @override
  Future<EmailPrefs> getEmailPrefs() async {
    if (failLoad) throw GameApiException('boom');
    return EmailPrefs(dailyDigest: digest);
  }

  @override
  Future<EmailPrefs> setEmailPrefs(bool dailyDigest) async {
    if (failSave) throw GameApiException('boom');
    saves.add(dailyDigest);
    digest = dailyDigest;
    return EmailPrefs(dailyDigest: dailyDigest);
  }

  @override
  Future<void> submitContactForm({
    required ContactType type,
    required String subject,
    required String message,
  }) async {
    if (failContact) throw GameApiException('boom');
    contacts.add((type: type, subject: subject, message: message));
  }
}

/// Provider overrides that replace the three feature APIs.
List<Override> featureOverrides({
  FakeStatsApi? stats,
  FakeLeaderboardApi? leaderboard,
  FakeProfileApi? profile,
}) =>
    [
      statsApiProvider.overrideWithValue(stats ?? FakeStatsApi()),
      leaderboardApiProvider.overrideWithValue(leaderboard ?? FakeLeaderboardApi()),
      profileApiProvider.overrideWithValue(profile ?? FakeProfileApi()),
    ];
