import 'package:dashden_mobile/api/game_api.dart';
import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/api/quest_models.dart';
import 'package:dashden_mobile/game/framework/game_session.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';

const _args = (themeId: 'ANIMALS', difficulty: 1, questContext: null, challengeDay: null);
const _quest = QuestContext(worldId: 'brain-peaks', nodeId: 'bp-01-memory', legIndex: 0);

CompleteGameResult _completed(int score, {Map<String, dynamic>? quest}) =>
    CompleteGameResult.fromJson({
      'id': 'game-1',
      'status': 'COMPLETED',
      'score': score,
      'scoreBreakdown': {
        'baseScore': 1000,
        'difficultyMultiplier': 1.5,
        'speedBonus': 200,
        'accuracyBonus': 100,
        'finalScore': score,
      },
      'leaderboardRank': 4,
      'achievements': [
        {'type': 'PERFECT_GAME', 'unlocked': true, 'progress': 1},
      ],
      'quest': quest,
    });

final _live = <GameSessionController>[];

GameSessionController _ctrl(
  GameApi api,
  GameSessionArgs args, {
  void Function(QuestResult?)? onQuestResult,
}) {
  final c = GameSessionController(api, args, onQuestResult: onQuestResult);
  _live.add(c);
  return c;
}

/// Disposes every controller before the test ends: the framework fails a test
/// that leaves the round timer pending.
void sessionTest(String name, Future<void> Function(WidgetTester) body) {
  testWidgets(name, (tester) async {
    try {
      await body(tester);
    } finally {
      for (final c in _live) {
        c.dispose();
      }
      _live.clear();
    }
  });
}

void main() {
  sessionTest('start -> playing, timer, attempts, complete with server score',
      (tester) async {
    final api = FakeGameApi(
      onCompleteGame: (id, time, attempts, extra) async => _completed(4321),
    );
    final c = _ctrl(api, _args);
    
    expect(c.state.phase, SessionPhase.idle);
    await c.start();
    expect(c.state.phase, SessionPhase.playing);
    expect(c.state.gameId, 'game-1');
    expect(api.calls, ['startGame:ANIMALS:1']);

    await tester.pump(const Duration(seconds: 3));
    expect(c.state.elapsedSeconds, 3);

    c.addAttempt();
    c.addAttempt();
    final result = await c.complete();
    expect(c.state.phase, SessionPhase.completed);
    expect(result?.score, 4321);
    expect(result?.attempts, 2);
    expect(result?.completionTime, 3);
    expect(result?.leaderboardRank, 4);
    expect(result?.scoreBreakdown?.speedBonus, 200);
    expect(result?.achievements.single.type, 'PERFECT_GAME');
    expect(api.calls.last, 'completeGame:game-1:3:2');

    // The timer stopped with the round.
    await tester.pump(const Duration(seconds: 5));
    expect(c.state.elapsedSeconds, 3);
  });

  sessionTest('pause stops the timer and counts pauses', (tester) async {
    final c = _ctrl(FakeGameApi(), _args);
        await c.start();
    await tester.pump(const Duration(seconds: 2));
    c.pause();
    expect(c.state.phase, SessionPhase.paused);
    await tester.pump(const Duration(seconds: 4));
    expect(c.state.elapsedSeconds, 2);
    c.resume();
    await tester.pump(const Duration(seconds: 1));
    expect(c.state.elapsedSeconds, 3);
    expect(c.state.pauseCount, 1);
  });

  sessionTest('extra metrics reach completeGame', (tester) async {
    Map<String, dynamic>? seen;
    final c = _ctrl(
      FakeGameApi(onCompleteGame: (id, t, a, extra) async {
        seen = extra;
        return _completed(10);
      }),
      _args,
    );
        await c.start();
    await c.complete(extra: {'correctAnswers': 8, 'totalQuestions': 10}, attempts: 10);
    expect(seen, {'correctAnswers': 8, 'totalQuestions': 10});
    expect(c.state.result?.attempts, 10);
  });

  sessionTest('rate limit blocks the round', (tester) async {
    final c = _ctrl(
      FakeGameApi(onStartGame: (t, d, q) async =>
          throw GameApiException('Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED')),
      _args,
    );
        await c.start();
    expect(c.state.phase, SessionPhase.blocked);
    expect(c.state.blockReason, BlockReason.rateLimited);
  });

  sessionTest('canPlay=false blocks a normal start', (tester) async {
    final c = _ctrl(
      FakeGameApi(onStartGame: (t, d, q) async => StartGameResult(
          id: '', themeId: t, difficulty: d, status: 'X', canPlay: false)),
      _args,
    );
        await c.start();
    expect(c.state.blockReason, BlockReason.rateLimited);
  });

  sessionTest('paid tier error blocks with paidRequired', (tester) async {
    final c = _ctrl(
      FakeGameApi(onStartGame: (t, d, q) async =>
          throw GameApiException('This game requires a paid subscription',
              code: 'PAID_FEATURE_REQUIRED')),
      _args,
    );
        await c.start();
    expect(c.state.blockReason, BlockReason.paidRequired);
  });

  sessionTest('other start failures run offline and score nothing', (tester) async {
    final api = FakeGameApi(
        onStartGame: (t, d, q) async => throw GameApiException('Network error'));
    final c = _ctrl(api, _args);
        await c.start();
    expect(c.state.phase, SessionPhase.playing);
    expect(c.state.gameId, isNull);
    final result = await c.complete();
    expect(result?.saved, isFalse);
    expect(result?.score, 0);
    expect(api.calls.where((c) => c.startsWith('completeGame')), isEmpty);
  });

  sessionTest('a failing completeGame still ends the round, flagged unsaved',
      (tester) async {
    final c = _ctrl(
      FakeGameApi(onCompleteGame: (a, b, d, e) async => throw StateError('boom')),
      _args,
    );
        await c.start();
    final result = await c.complete();
    expect(c.state.phase, SessionPhase.completed);
    expect(result?.saved, isFalse);
  });

  group('quest launch', () {
    const questArgs = (themeId: 'ANIMALS', difficulty: 1, questContext: _quest, challengeDay: null);

    sessionTest('sends the context and treats an accepted start as playable',
        (tester) async {
      final api = FakeGameApi(
        onStartGame: (t, d, q) async => StartGameResult(
            id: 'g', themeId: t, difficulty: d, status: 'IN_PROGRESS', canPlay: false),
      );
      final c = _ctrl(api, questArgs);
            await c.start();
      expect(api.calls.single, 'startGame:ANIMALS:1:brain-peaks:bp-01-memory:0');
      expect(c.state.phase, SessionPhase.playing);
    });

    sessionTest('any other start failure sends the player back to the map',
        (tester) async {
      final c = _ctrl(
        FakeGameApi(onStartGame: (t, d, q) async => throw GameApiException('nope')),
        questArgs,
      );
            await c.start();
      expect(c.state.blockReason, BlockReason.questFailed);
    });

    sessionTest('quest result is published on complete and cleared on start',
        (tester) async {
      final published = <QuestResult?>[];
      final c = _ctrl(
        FakeGameApi(
          onCompleteGame: (a, b, d, e) async => _completed(3000, quest: {
            'worldId': 'brain-peaks',
            'nodeId': 'bp-01-memory',
            'kind': 'GAME',
            'score': 3000,
            'thresholds': [1450, 2750, 3000],
            'stars': 3,
            'bestStars': 3,
            'newlyUnlocked': ['bp-02-math'],
            'worldCleared': false,
            'badgesAwarded': [],
          }),
        ),
        questArgs,
        onQuestResult: published.add,
      );
            await c.start();
      expect(published, [null]);
      final result = await c.complete();
      expect(published.last?.stars, 3);
      expect(result?.quest?.newlyUnlocked, ['bp-02-math']);
    });
  });

  group('challenge launch', () {
    const challengeArgs =
        (themeId: 'SUDOKU', difficulty: 2, questContext: null, challengeDay: '2026-11-26');

    sessionTest('sends the day and treats an accepted start as playable', (tester) async {
      final api = FakeGameApi(
        onStartGame: (t, d, q) async => StartGameResult(
            id: 'g', themeId: t, difficulty: d, status: 'IN_PROGRESS', canPlay: false),
      );
      final c = _ctrl(api, challengeArgs);
      await c.start();
      expect(api.calls.single, 'startGame:SUDOKU:2:challenge=2026-11-26');
      expect(c.state.phase, SessionPhase.playing);
      expect(c.state.gameId, 'g');
    });

    sessionTest('a normal start sends no challenge day', (tester) async {
      final api = FakeGameApi();
      final c = _ctrl(api, _args);
      await c.start();
      expect(api.calls.single, 'startGame:ANIMALS:1');
    });

    sessionTest('a rate limit shows the limit screen as for any play', (tester) async {
      final c = _ctrl(
        FakeGameApi(onStartGame: (t, d, q) async =>
            throw GameApiException('Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED')),
        challengeArgs,
      );
      await c.start();
      expect(c.state.blockReason, BlockReason.rateLimited);
    });

    sessionTest('any other failure blocks with challengeFailed instead of offline play',
        (tester) async {
      for (final error in <Object>[
        GameApiException('Challenge not available'),
        GameApiException('This game requires a paid subscription', code: 'PAID_FEATURE_REQUIRED'),
        StateError('boom'),
      ]) {
        final c = _ctrl(FakeGameApi(onStartGame: (t, d, q) async => throw error), challengeArgs);
        await c.start();
        expect(c.state.phase, SessionPhase.blocked, reason: '$error');
        expect(c.state.blockReason, BlockReason.challengeFailed, reason: '$error');
      }
    });

    sessionTest('the quest context wins over a challenge day', (tester) async {
      final api = FakeGameApi(onStartGame: (t, d, q) async => throw GameApiException('nope'));
      final c = _ctrl(
        api,
        (themeId: 'SUDOKU', difficulty: 2, questContext: _quest, challengeDay: '2026-11-26'),
      );
      await c.start();
      expect(c.state.blockReason, BlockReason.questFailed);
    });
  });

  sessionTest('reset returns to a fresh idle round that can start again',
      (tester) async {
    final api = FakeGameApi();
    final c = _ctrl(api, _args);
        await c.start();
    await c.complete();
    c.reset();
    expect(c.state.phase, SessionPhase.idle);
    expect(c.state.result, isNull);
    expect(c.state.attempts, 0);
    await c.start();
    expect(c.state.phase, SessionPhase.playing);
    expect(api.calls.where((x) => x.startsWith('startGame')), hasLength(2));
  });
}
