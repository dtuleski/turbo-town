import 'package:graphql_flutter/graphql_flutter.dart';

import 'api_errors.dart';
import 'stats_models.dart';

/// Leaderboard service queries (Env.leaderboardEndpoint). Read-only: the
/// admin `clearAllRecords` mutation is deliberately not here.
class LeaderboardApi {
  LeaderboardApi(this._client);
  final GraphQLClient _client;

  static const String _entryFields = '''
    rank userId username score gameType difficulty completionTime accuracy
    timestamp isCurrentUser
  ''';

  static const String _leaderboardQuery = '''
    query GetLeaderboard(\$gameType: GameType!, \$timeframe: Timeframe!, \$limit: Int) {
      getLeaderboard(gameType: \$gameType, timeframe: \$timeframe, limit: \$limit) {
        entries { $_entryFields }
        currentUserEntry { $_entryFields }
        totalEntries
        timeframe
      }
    }
  ''';

  static const String _rankQuery = r'''
    query GetUserRank($gameType: GameType!, $timeframe: Timeframe!) {
      getUserRank(gameType: $gameType, timeframe: $timeframe) {
        rank score gameType timeframe totalPlayers percentile
      }
    }
  ''';

  static const String _historyQuery = '''
    query GetUserScoreHistory(\$gameType: GameType, \$limit: Int) {
      getUserScoreHistory(gameType: \$gameType, limit: \$limit) { $_entryFields }
    }
  ''';

  Future<LeaderboardResult> getLeaderboard(
    LeaderboardGameType gameType,
    LeaderboardTimeframe timeframe, {
    int limit = 100,
  }) async {
    final result = await _client.query(QueryOptions(
      document: gql(_leaderboardQuery),
      variables: {
        'gameType': gameType.wire,
        'timeframe': timeframe.wire,
        'limit': limit,
      },
      fetchPolicy: FetchPolicy.networkOnly,
    ));
    throwIfGraphQLError(result);
    return LeaderboardResult.fromJson(
      result.data!['getLeaderboard'] as Map<String, dynamic>,
    );
  }

  /// Null when the user has no rank yet.
  Future<UserRank?> getUserRank(
    LeaderboardGameType gameType,
    LeaderboardTimeframe timeframe,
  ) async {
    final result = await _client.query(QueryOptions(
      document: gql(_rankQuery),
      variables: {'gameType': gameType.wire, 'timeframe': timeframe.wire},
      fetchPolicy: FetchPolicy.networkOnly,
    ));
    throwIfGraphQLError(result);
    final data = result.data?['getUserRank'];
    return data is Map<String, dynamic> ? UserRank.fromJson(data) : null;
  }

  /// The user's own scores, newest first as the service returns them.
  Future<List<LeaderboardEntry>> getUserScoreHistory({
    LeaderboardGameType? gameType,
    int limit = 50,
  }) async {
    final result = await _client.query(QueryOptions(
      document: gql(_historyQuery),
      variables: {
        if (gameType != null) 'gameType': gameType.wire,
        'limit': limit,
      },
      fetchPolicy: FetchPolicy.networkOnly,
    ));
    throwIfGraphQLError(result);
    return ((result.data?['getUserScoreHistory'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(LeaderboardEntry.fromJson)
        .toList();
  }
}
