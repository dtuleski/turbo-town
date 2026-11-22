import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import '../auth/auth_controller.dart';
import 'game_providers.dart';
import 'graphql_client.dart';
import 'leaderboard_api.dart';
import 'profile_api.dart';
import 'stats_api.dart';
import 'stats_models.dart';

final leaderboardGraphQLClientProvider = Provider<GraphQLClient>((ref) {
  return buildLeaderboardClient(ref.watch(cognitoServiceProvider));
});

final statsApiProvider = Provider<StatsApi>(
  (ref) => StatsApi(ref.watch(gameGraphQLClientProvider)),
);

final leaderboardApiProvider = Provider<LeaderboardApi>(
  (ref) => LeaderboardApi(ref.watch(leaderboardGraphQLClientProvider)),
);

final profileApiProvider = Provider<ProfileApi>(
  (ref) => ProfileApi(ref.watch(gameGraphQLClientProvider)),
);

/// Statistics and score history together. Each half loads on its own, as on
/// web (`Promise.allSettled`); only both failing is an error.
class StatsBundle {
  const StatsBundle({this.stats, this.history = const []});
  final UserStatistics? stats;
  final List<LeaderboardEntry> history;
}

Future<T?> _orNull<T>(Future<T> Function() call) async {
  try {
    return await call();
  } catch (_) {
    return null;
  }
}

final statsBundleProvider = FutureProvider.autoDispose<StatsBundle>((ref) async {
  final statsApi = ref.watch(statsApiProvider);
  final lbApi = ref.watch(leaderboardApiProvider);
  final results = await Future.wait<Object?>([
    _orNull(statsApi.getUserStatistics),
    _orNull(() => lbApi.getUserScoreHistory(limit: 100)),
  ]);
  final stats = results[0] as UserStatistics?;
  final history = results[1] as List<LeaderboardEntry>?;
  if (stats == null && history == null) {
    throw Exception('Failed to load statistics');
  }
  return StatsBundle(stats: stats, history: history ?? const []);
});

/// The user's last 100 scores, for history and achievements.
final scoreHistoryProvider =
    FutureProvider.autoDispose<List<LeaderboardEntry>>((ref) {
  return ref.watch(leaderboardApiProvider).getUserScoreHistory(limit: 100);
});

/// Overall all-time rank for the dashboard card; null when unranked or the
/// lookup fails (web shows a neutral "play to get ranked" card).
final overallRankProvider = FutureProvider.autoDispose<UserRank?>((ref) async {
  try {
    return await ref
        .watch(leaderboardApiProvider)
        .getUserRank(LeaderboardGameType.overall, LeaderboardTimeframe.allTime);
  } catch (_) {
    return null;
  }
});

typedef LeaderboardQuery = ({
  LeaderboardGameType gameType,
  LeaderboardTimeframe timeframe,
});

final leaderboardProvider = FutureProvider.autoDispose
    .family<LeaderboardResult, LeaderboardQuery>((ref, q) {
  return ref.watch(leaderboardApiProvider).getLeaderboard(q.gameType, q.timeframe);
});
