import 'package:graphql_flutter/graphql_flutter.dart';

import 'api_errors.dart';
import 'stats_models.dart';

/// Statistics and history queries on the game service. Documents mirror
/// apps/web `src/api/game.ts`.
class StatsApi {
  StatsApi(this._client);
  final GraphQLClient _client;

  static const String _statisticsQuery = r'''
    query GetUserStatistics {
      getUserStatistics {
        totalGames
        totalCompletedGames
        averageScore
        bestScore
        averageCompletionTime
        fastestCompletionTime
        totalAttempts
        averageAttempts
        favoriteTheme { id name }
        favoriteDifficulty
        currentStreak
        longestStreak
      }
    }
  ''';

  static const String _historyQuery = r'''
    query GetGameHistory($input: GameHistoryInput!) {
      getGameHistory(input: $input) {
        games {
          id
          themeId
          themeName
          difficulty
          completedAt
          completionTime
          attempts
          score
        }
        pagination { total page pageSize hasMore }
      }
    }
  ''';

  Future<UserStatistics> getUserStatistics() async {
    final result = await _client.query(QueryOptions(
      document: gql(_statisticsQuery),
      fetchPolicy: FetchPolicy.noCache,
    ));
    throwIfGraphQLError(result);
    return UserStatistics.fromJson(
      result.data!['getUserStatistics'] as Map<String, dynamic>,
    );
  }

  /// Server-side paged history. [sortBy] is `date`, `score` or `time`;
  /// [sortOrder] is `asc` or `desc`. Only non-null filters are sent.
  Future<GameHistoryPage> getGameHistory({
    int page = 1,
    int pageSize = 10,
    String? sortBy,
    String? sortOrder,
    String? themeId,
    int? difficulty,
    String? startDate,
    String? endDate,
  }) async {
    final input = <String, dynamic>{
      'page': page,
      'pageSize': pageSize,
      if (sortBy != null) 'sortBy': sortBy,
      if (sortOrder != null) 'sortOrder': sortOrder,
      if (themeId != null) 'themeId': themeId,
      if (difficulty != null) 'difficulty': difficulty,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
    };
    final result = await _client.query(QueryOptions(
      document: gql(_historyQuery),
      variables: {'input': input},
      fetchPolicy: FetchPolicy.noCache,
    ));
    throwIfGraphQLError(result);
    return GameHistoryPage.fromJson(
      result.data!['getGameHistory'] as Map<String, dynamic>,
    );
  }
}
