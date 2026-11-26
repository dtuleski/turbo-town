import 'package:graphql_flutter/graphql_flutter.dart';

import 'api_errors.dart';
import 'challenge_models.dart';

/// Daily Challenge reads (M1). GraphQL documents mirror apps/web
/// `src/api/challenge.ts`. Both calls return null when the feature is off or
/// anything fails, so a caller never has to handle an error.
class ChallengeApi {
  ChallengeApi(this._client);

  final GraphQLClient _client;

  static const String _dailyChallengeQuery = r'''
    query GetDailyChallenge {
      getDailyChallenge {
        day
        gameId
        themeId
        difficulty
        settings
        content
        endsAt
        me { bestScore rank achievedAt }
      }
    }
  ''';

  static const String _leaderboardQuery = r'''
    query GetChallengeLeaderboard($day: String, $limit: Int) {
      getChallengeLeaderboard(day: $day, limit: $limit) {
        day
        gameId
        themeId
        final
        entries { rank username score achievedAt isMe }
        me { bestScore rank achievedAt }
      }
    }
  ''';

  /// Today's challenge, or null.
  Future<DailyChallengeView?> getDailyChallenge() async {
    try {
      final result = await _client.query(QueryOptions(
        document: gql(_dailyChallengeQuery),
        fetchPolicy: FetchPolicy.noCache,
      ));
      throwIfGraphQLError(result);
      return DailyChallengeView.fromJson(result.data?['getDailyChallenge']);
    } catch (_) {
      return null;
    }
  }

  /// A day's leaderboard (today when [day] is null), or null.
  Future<ChallengeLeaderboardView?> getChallengeLeaderboard({String? day, int? limit}) async {
    try {
      final result = await _client.query(QueryOptions(
        document: gql(_leaderboardQuery),
        variables: {
          if (day != null) 'day': day,
          if (limit != null) 'limit': limit,
        },
        fetchPolicy: FetchPolicy.noCache,
      ));
      throwIfGraphQLError(result);
      final data = result.data?['getChallengeLeaderboard'];
      return data is Map<String, dynamic> ? ChallengeLeaderboardView.fromJson(data) : null;
    } catch (_) {
      return null;
    }
  }
}
