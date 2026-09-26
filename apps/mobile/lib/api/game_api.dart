import 'package:graphql_flutter/graphql_flutter.dart';

import 'game_models.dart';

/// Game service API. GraphQL documents mirror apps/web `src/api/game.ts`.
class GameApi {
  GameApi(this._client);

  final GraphQLClient _client;

  static const String _startGameMutation = r'''
    mutation StartGame($input: StartGameInput!) {
      startGame(input: $input) {
        id
        userId
        themeId
        difficulty
        status
        startedAt
        canPlay
        rateLimit { tier limit used remaining resetAt }
      }
    }
  ''';

  static const String _completeGameMutation = r'''
    mutation CompleteGame($input: CompleteGameInput!) {
      completeGame(input: $input) {
        id
        status
        completedAt
        completionTime
        attempts
        score
        scoreBreakdown {
          baseScore
          difficultyMultiplier
          speedBonus
          accuracyBonus
          finalScore
        }
        leaderboardRank
      }
    }
  ''';

  static const String _canStartGameQuery = r'''
    query CanStartGame {
      canStartGame {
        canPlay
        rateLimit { tier limit used remaining resetAt }
        message
      }
    }
  ''';

  Future<StartGameResult> startGame({
    required String themeId,
    required int difficulty,
  }) async {
    final result = await _client.mutate(
      MutationOptions(
        document: gql(_startGameMutation),
        variables: {
          'input': {'themeId': themeId, 'difficulty': difficulty},
        },
      ),
    );
    _throwIfError(result);
    return StartGameResult.fromJson(
      result.data!['startGame'] as Map<String, dynamic>,
    );
  }

  Future<CompleteGameResult> completeGame({
    required String gameId,
    required int completionTime,
    required int attempts,
  }) async {
    final result = await _client.mutate(
      MutationOptions(
        document: gql(_completeGameMutation),
        variables: {
          'input': {
            'gameId': gameId,
            'completionTime': completionTime,
            'attempts': attempts,
          },
        },
      ),
    );
    _throwIfError(result);
    return CompleteGameResult.fromJson(
      result.data!['completeGame'] as Map<String, dynamic>,
    );
  }

  Future<CanStartGameResult> canStartGame() async {
    final result = await _client.query(
      QueryOptions(document: gql(_canStartGameQuery)),
    );
    _throwIfError(result);
    return CanStartGameResult.fromJson(
      result.data!['canStartGame'] as Map<String, dynamic>,
    );
  }

  /// Convert a GraphQL/network error into a typed [GameApiException].
  void _throwIfError(QueryResult result) {
    if (!result.hasException) return;

    final ex = result.exception!;
    if (ex.graphqlErrors.isNotEmpty) {
      final err = ex.graphqlErrors.first;
      final code = err.extensions?['code'] as String?;
      throw GameApiException(err.message, code: code);
    }
    if (ex.linkException != null) {
      throw GameApiException(
        'Network error. Check your connection and try again.',
        code: 'NETWORK_ERROR',
      );
    }
    throw GameApiException('Request failed.');
  }
}
