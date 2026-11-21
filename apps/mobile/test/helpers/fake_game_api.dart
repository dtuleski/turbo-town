import 'package:dashden_mobile/api/game_api.dart';
import 'package:dashden_mobile/api/game_models.dart';

/// In-memory [GameApi]. Override the callbacks to script responses or errors.
class FakeGameApi implements GameApi {
  FakeGameApi({this.onStartGame, this.onCompleteGame, this.onCanStartGame});

  Future<StartGameResult> Function(String themeId, int difficulty)? onStartGame;
  Future<CompleteGameResult> Function(
    String gameId,
    int completionTime,
    int attempts,
  )? onCompleteGame;
  Future<CanStartGameResult> Function()? onCanStartGame;

  final List<String> calls = [];

  @override
  Future<StartGameResult> startGame({
    required String themeId,
    required int difficulty,
  }) async {
    calls.add('startGame:$themeId:$difficulty');
    final handler = onStartGame;
    if (handler != null) return handler(themeId, difficulty);
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
  }) async {
    calls.add('completeGame:$gameId:$completionTime:$attempts');
    final handler = onCompleteGame;
    if (handler != null) return handler(gameId, completionTime, attempts);
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
}
