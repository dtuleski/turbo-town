import 'dart:async';

import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/api/quest_models.dart';
import 'package:dashden_mobile/config/constants.dart';
import 'package:dashden_mobile/game/card.dart';
import 'package:dashden_mobile/game/memory_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const MemoryArgs _animalsEasy =
    (themeId: 'ANIMALS', difficulty: Difficulty.easy, questContext: null);

Map<String, dynamic> _completeJson(int score, {Map<String, dynamic>? quest}) => {
      'id': 'game-1',
      'status': 'COMPLETED',
      'score': score,
      'scoreBreakdown': {
        'baseScore': 1000,
        'difficultyMultiplier': 1.0,
        'speedBonus': 50,
        'accuracyBonus': 25,
        'finalScore': score,
      },
      'leaderboardRank': 7,
      'achievements': [
        {'type': 'PERFECT_GAME', 'unlocked': true, 'progress': 1},
      ],
      'quest': quest,
    };

List<List<MemoryCard>> _pairs(List<MemoryCard> cards) {
  final byValue = <String, List<MemoryCard>>{};
  for (final c in cards) {
    byValue.putIfAbsent(c.value, () => []).add(c);
  }
  return byValue.values.toList();
}

Future<void> _tapCard(WidgetTester tester, MemoryCard c) async {
  await tester.tap(find.byKey(Key('card-${c.id}')));
  await tester.pump(const Duration(milliseconds: 50));
}

Future<void> _tapPair(WidgetTester tester, List<MemoryCard> pair) async {
  await _tapCard(tester, pair[0]);
  await _tapCard(tester, pair[1]);
  await tester.pump(kMemoryMismatchDelay + const Duration(milliseconds: 100));
}

MemoryBoardState _board(RouterHarness h, [MemoryArgs args = _animalsEasy]) =>
    h.container.read(memoryControllerProvider(args));

void main() {
  testWidgets('setup -> play -> complete shows the server score', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onCompleteGame: (id, time, attempts, extra) async =>
          CompleteGameResult.fromJson(_completeJson(4321)),
    );
    final h = await pumpRouterApp(tester, location: '/memory-match/setup', api: api);

    // Setup: pick the default theme and start.
    expect(find.text('Choose Your Theme'), findsOneWidget);
    await tester.tap(find.byKey(const Key('game-start-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));

    // Play: the round started on the server.
    expect(api.calls, contains('startGame:ANIMALS:1'));
    final cards = _board(h).cards;
    expect(cards, hasLength(12));
    expect(find.byKey(const Key('stat-matches')), findsOneWidget);

    for (final pair in _pairs(cards)) {
      await _tapPair(tester, pair);
    }
    await tester.pump(const Duration(milliseconds: 100));

    // Complete: the page shows what the server returned, not a local score.
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('4321'), findsOneWidget);
    expect(find.text('#7'), findsOneWidget);
    expect(find.textContaining('Perfect Game'), findsOneWidget);
    expect(api.calls.where((c) => c.startsWith('completeGame:game-1:')), hasLength(1));
    // Six matches took six attempts.
    expect(api.calls.last, endsWith(':6'));
    expect(find.byKey(const Key('result-not-saved')), findsNothing);
  });

  testWidgets('a mismatch flips back after the delay and counts an attempt',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/memory-match/play?theme=ANIMALS&difficulty=EASY',
    );
    await tester.pump(const Duration(milliseconds: 100));
    final cards = _board(h).cards;
    final other = cards.firstWhere((c) => c.value != cards.first.value);

    await _tapCard(tester, cards.first);
    await _tapCard(tester, other);
    expect(_board(h).isChecking, isTrue);
    expect(_board(h).cards.where((c) => c.isFlipped), hasLength(2));

    await tester.pump(kMemoryMismatchDelay + const Duration(milliseconds: 100));
    expect(_board(h).cards.where((c) => c.isFlipped), isEmpty);
    expect(_board(h).matches, 0);
    expect(tester.widget<Text>(find.byKey(const Key('stat-attempts'))).data, '1');
  });

  testWidgets('pause hides the board and resume brings it back', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(
      tester,
      location: '/memory-match/play?theme=ANIMALS&difficulty=EASY',
    );
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.byKey(const Key('game-pause')));
    await tester.pump();
    expect(find.text('Game Paused'), findsOneWidget);
    expect(find.byKey(const Key('stat-time')), findsNothing);

    await tester.tap(find.byKey(const Key('game-resume')));
    await tester.pump();
    expect(find.text('Game Paused'), findsNothing);
    expect(find.byKey(const Key('stat-time')), findsOneWidget);
  });

  testWidgets('leaving mid-game asks first', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/memory-match/setup');
    // push() completes only when the page is popped, so it is not awaited.
    unawaited(h.router.push('/memory-match/play?theme=ANIMALS&difficulty=EASY'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));

    // Not awaited: the system back handler waits for the dialog to close.
    unawaited(tester.binding.handlePopRoute());
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Leave this game?'), findsOneWidget);

    await tester.tap(find.text('Keep playing'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const Key('stat-time')), findsOneWidget);
  });

  testWidgets('rate limit shows a neutral blocked page without pricing',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onStartGame: (t, d, q) async => throw GameApiException(
        'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
      ),
    );
    await pumpRouterApp(
      tester,
      location: '/memory-match/play?theme=ANIMALS&difficulty=EASY',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Daily limit reached'), findsOneWidget);
    expect(find.textContaining(RegExp(r'\$|Stripe|price|subscribe', caseSensitive: false)),
        findsNothing);
  });

  testWidgets('a paid-tier rejection reads as not available in the app yet',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onStartGame: (t, d, q) async => throw GameApiException(
        'This feature requires a paid subscription',
        code: 'PAID_FEATURE_REQUIRED',
      ),
    );
    await pumpRouterApp(
      tester,
      location: '/memory-match/play?theme=ANIMALS&difficulty=SUPER_HARD',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Not available in the app yet'), findsOneWidget);
  });

  testWidgets('a quest launch sends the context and shows the quest result',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onCompleteGame: (id, time, attempts, extra) async =>
          CompleteGameResult.fromJson(_completeJson(3000, quest: {
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
      })),
    );
    final h = await pumpRouterApp(
      tester,
      location: '/memory-match/play?theme=ANIMALS&difficulty=easy'
          '&quest=brain-peaks%3Abp-01-memory%3A0',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:ANIMALS:1:brain-peaks:bp-01-memory:0'));

    const args = (
      themeId: 'ANIMALS',
      difficulty: Difficulty.easy,
      questContext: QuestContext(
        worldId: 'brain-peaks',
        nodeId: 'bp-01-memory',
        legIndex: 0,
      ),
    );
    for (final pair in _pairs(_board(h, args).cards)) {
      await _tapPair(tester, pair);
    }
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('3000'), findsOneWidget);
    expect(find.byKey(const Key('result-quest')), findsOneWidget);
    expect(find.textContaining('Unlocked: Math Warm-up'), findsOneWidget);
    expect(find.byKey(const Key('result-back-to-map')), findsOneWidget);
  });

  testWidgets('rating a game sends the review', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    final h = await pumpRouterApp(
      tester,
      location: '/memory-match/play?theme=ANIMALS&difficulty=EASY',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    for (final pair in _pairs(_board(h).cards)) {
      await _tapPair(tester, pair);
    }
    await tester.pump(const Duration(milliseconds: 100));
    await tester.ensureVisible(find.byKey(const Key('rate-4')));
    await tester.tap(find.byKey(const Key('rate-4')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.reviews.single, (gameType: 'MEMORY_MATCH', rating: 4));
    expect(find.byKey(const Key('rating-thanks')), findsOneWidget);
  });
}
