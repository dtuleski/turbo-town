import 'package:dashden_mobile/api/game_api.dart';
import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/api/quest_models.dart';

/// In-memory [GameApi]. Override the callbacks to script responses or errors.
class FakeGameApi implements GameApi {
  FakeGameApi({
    this.onStartGame,
    this.onCompleteGame,
    this.onCanStartGame,
    this.catalog,
    this.reviewStats,
    this.questProgress,
  });

  Future<StartGameResult> Function(
    String themeId,
    int difficulty,
    QuestContext? questContext,
  )? onStartGame;
  Future<CompleteGameResult> Function(
    String gameId,
    int completionTime,
    int attempts,
    Map<String, dynamic>? extra,
  )? onCompleteGame;
  Future<CanStartGameResult> Function()? onCanStartGame;

  /// Rows for `listAvailableGames`. Defaults to an empty catalog.
  List<GameCatalogItem>? catalog;
  ReviewStatsResult? reviewStats;
  QuestProgressView? questProgress;

  final List<String> calls = [];
  final List<({String gameType, int rating})> reviews = [];

  @override
  Future<StartGameResult> startGame({
    required String themeId,
    required int difficulty,
    QuestContext? questContext,
  }) async {
    calls.add('startGame:$themeId:$difficulty'
        '${questContext == null ? '' : ':${questContext.encode()}'}');
    final handler = onStartGame;
    if (handler != null) return handler(themeId, difficulty, questContext);
    return StartGameResult(
      id: 'game-1',
      themeId: themeId,
      difficulty: difficulty,
      status: 'IN_PROGRESS',
      canPlay: true,
    );
  }

  @override
  Future<CompleteGameResult> completeGame({
    required String gameId,
    required int completionTime,
    required int attempts,
    Map<String, dynamic>? extra,
  }) async {
    calls.add('completeGame:$gameId:$completionTime:$attempts');
    final handler = onCompleteGame;
    if (handler != null) {
      return handler(gameId, completionTime, attempts, extra);
    }
    return CompleteGameResult.fromJson({
      'id': gameId,
      'status': 'COMPLETED',
      'completionTime': completionTime,
      'attempts': attempts,
      'score': 100,
    });
  }

  @override
  Future<CanStartGameResult> canStartGame() async {
    calls.add('canStartGame');
    final handler = onCanStartGame;
    if (handler != null) return handler();
    return const CanStartGameResult(canPlay: true);
  }

  @override
  Future<List<GameCatalogItem>> listAvailableGames() async {
    calls.add('listAvailableGames');
    return catalog ?? const [];
  }

  @override
  Future<QuestProgressView> getQuestProgress() async {
    calls.add('getQuestProgress');
    return questProgress ??
        const QuestProgressView(
          tier: 'FREE',
          rateLimit: QuestRateLimitView(limit: 10, used: 0, remaining: 10),
          worlds: [],
        );
  }

  @override
  Future<bool> submitGameReview(String gameType, int rating) async {
    calls.add('submitGameReview:$gameType:$rating');
    reviews.add((gameType: gameType, rating: rating));
    return true;
  }

  @override
  Future<int?> getUserReview(String gameType) async => null;

  @override
  Future<ReviewStatsResult> getReviewStats() async {
    calls.add('getReviewStats');
    return reviewStats ?? const ReviewStatsResult(perGame: []);
  }
}
