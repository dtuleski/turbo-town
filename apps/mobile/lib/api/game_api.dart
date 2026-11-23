import 'package:graphql_flutter/graphql_flutter.dart';

import 'game_models.dart';
import 'quest_models.dart';

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
          accuracy
        }
        leaderboardRank
        achievements { type unlocked progress completedAt }
        quest {
          worldId
          nodeId
          kind
          score
          thresholds
          stars
          bestStars
          newlyUnlocked
          worldCleared
          badgesAwarded
          gauntlet {
            legIndex
            legsTotal
            status
            nextLeg { themeId difficulty params { levelId pageTheme } }
          }
        }
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

  static const String _listAvailableGamesQuery = r'''
    query ListAvailableGames {
      listAvailableGames {
        gameId title description icon route status displayOrder ageRange category
      }
    }
  ''';

  static const String _questProgressQuery = r'''
    query GetQuestProgress {
      getQuestProgress {
        tier
        rateLimit { limit used remaining resetAt }
        worlds {
          id
          order
          accessible
          totalStars
          maxStars
          badges
          activeGauntlet { nodeId legsDone legsTotal expiresAt }
          nodes {
            id
            kind
            status
            stars
            bestScore
            thresholds
            map { x y }
            legs { themeId difficulty params { levelId pageTheme } }
          }
        }
      }
    }
  ''';

  static const String _submitReviewMutation = r'''
    mutation SubmitGameReview($input: SubmitGameReviewInput!) {
      submitGameReview(input: $input) { success }
    }
  ''';

  static const String _userReviewQuery = r'''
    query GetUserReview($gameType: String!) {
      getUserReview(gameType: $gameType) { rating }
    }
  ''';

  static const String _reviewStatsQuery = r'''
    query GetReviewStats {
      getReviewStats {
        perGame { gameType averageRating totalReviews }
        overall { gameType averageRating totalReviews }
      }
    }
  ''';

  /// Starts a game. [questContext] is sent only when the game was opened from
  /// a Quest Map node; the server validates it.
  Future<StartGameResult> startGame({
    required String themeId,
    required int difficulty,
    QuestContext? questContext,
  }) async {
    final result = await _client.mutate(
      MutationOptions(
        document: gql(_startGameMutation),
        variables: {
          'input': {
            'themeId': themeId,
            'difficulty': difficulty,
            if (questContext != null) 'questContext': questContext.toJson(),
          },
        },
      ),
    );
    _throwIfError(result);
    return StartGameResult.fromJson(
      result.data!['startGame'] as Map<String, dynamic>,
    );
  }

  /// Keys the server accepts next to the base completion fields
  /// (services/game `completeGameInputSchema`). Anything else is dropped here
  /// because the server's zod object strips unknown keys.
  static const Set<String> completeExtraKeys = {
    'correctAnswers',
    'totalQuestions',
    'wordsFound',
    'totalWords',
    'hintsUsed',
    'pauseCount',
    'circuitSubmission',
  };

  /// Completes a game. [extra] carries per-game metrics (see
  /// [completeExtraKeys]); the server computes the score from them.
  Future<CompleteGameResult> completeGame({
    required String gameId,
    required int completionTime,
    required int attempts,
    Map<String, dynamic>? extra,
  }) async {
    final result = await _client.mutate(
      MutationOptions(
        document: gql(_completeGameMutation),
        fetchPolicy: FetchPolicy.noCache,
        variables: {
          'input': {
            if (extra != null)
              for (final e in extra.entries)
                if (completeExtraKeys.contains(e.key) && e.value != null)
                  e.key: e.value,
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
      QueryOptions(
        document: gql(_canStartGameQuery),
        fetchPolicy: FetchPolicy.noCache,
      ),
    );
    _throwIfError(result);
    return CanStartGameResult.fromJson(
      result.data!['canStartGame'] as Map<String, dynamic>,
    );
  }

  Future<List<GameCatalogItem>> listAvailableGames() async {
    final result = await _client.query(QueryOptions(
      document: gql(_listAvailableGamesQuery),
      fetchPolicy: FetchPolicy.noCache,
    ));
    _throwIfError(result);
    return ((result.data!['listAvailableGames'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(GameCatalogItem.fromJson)
        .toList();
  }

  Future<QuestProgressView> getQuestProgress() async {
    final result = await _client.query(QueryOptions(
      document: gql(_questProgressQuery),
      fetchPolicy: FetchPolicy.noCache,
    ));
    _throwIfError(result);
    return QuestProgressView.fromJson(
      result.data!['getQuestProgress'] as Map<String, dynamic>,
    );
  }

  /// [gameType] is the game id upper-cased with dashes as underscores.
  Future<bool> submitGameReview(String gameType, int rating) async {
    final result = await _client.mutate(MutationOptions(
      document: gql(_submitReviewMutation),
      variables: {
        'input': {'gameType': gameType, 'rating': rating},
      },
    ));
    _throwIfError(result);
    final data = result.data?['submitGameReview'] as Map<String, dynamic>?;
    return data?['success'] as bool? ?? false;
  }

  Future<int?> getUserReview(String gameType) async {
    final result = await _client.query(QueryOptions(
      document: gql(_userReviewQuery),
      variables: {'gameType': gameType},
      fetchPolicy: FetchPolicy.noCache,
    ));
    _throwIfError(result);
    final data = result.data?['getUserReview'] as Map<String, dynamic>?;
    return (data?['rating'] as num?)?.toInt();
  }

  Future<ReviewStatsResult> getReviewStats() async {
    final result = await _client.query(QueryOptions(
      document: gql(_reviewStatsQuery),
      fetchPolicy: FetchPolicy.noCache,
    ));
    _throwIfError(result);
    return ReviewStatsResult.fromJson(
      result.data!['getReviewStats'] as Map<String, dynamic>,
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
