import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/quiz/quiz_engine.dart';
import 'package:dashden_mobile/game/quiz/quiz_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

Map<String, dynamic> _done(int score) => {
      'id': 'game-1',
      'status': 'COMPLETED',
      'score': score,
      'scoreBreakdown': {
        'baseScore': 1000,
        'difficultyMultiplier': 1.0,
        'speedBonus': 10,
        'accuracyBonus': 5,
        'finalScore': score,
      },
      'leaderboardRank': 4,
    };

const QuizArgs _geoEasy = (
  gameId: 'geo-quiz',
  difficulty: 'easy',
  mode: 'capitals',
  category: '',
  count: 0,
  quest: null,
);
const QuizArgs _historyMedium = (
  gameId: 'history-quiz',
  difficulty: 'medium',
  mode: 'when-happened',
  category: '',
  count: 0,
  quest: null,
);
const QuizArgs _civics = (
  gameId: 'civics-quiz',
  difficulty: 'easy',
  mode: '',
  category: 'civics',
  count: 6,
  quest: null,
);

QuizState _state(RouterHarness h, QuizArgs args) => h.container.read(quizEngineProvider(args));

Future<void> _tapOption(WidgetTester tester, RouterHarness h, QuizArgs args, int? index) async {
  final s = _state(h, args);
  final i = index ?? s.current.options.indexOf(s.current.correctAnswer);
  await tester.tap(find.byKey(Key('quiz-option-$i')));
  await tester.pump(const Duration(milliseconds: 50));
}

Future<void> _toQuiz(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('game-start-button')));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  testWidgets('Geo Quiz: setup -> play 10 questions -> server result', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onCompleteGame: (id, time, attempts, extra) async =>
          CompleteGameResult.fromJson(_done(3210)),
    );
    final h = await pumpRouterApp(tester, location: '/geo-quiz/setup', api: api);

    // Start is closed until a difficulty is chosen; easy has three modes.
    expect(find.text('Select Difficulty & Mode'), findsOneWidget);
    await tester.tap(find.byKey(const Key('difficulty-easy')));
    await tester.pump();
    expect(find.byKey(const Key('mode-capitals')), findsOneWidget);
    expect(find.byKey(const Key('mode-flags')), findsOneWidget);
    expect(find.byKey(const Key('mode-continents')), findsOneWidget);
    await tester.tap(find.byKey(const Key('mode-capitals')));
    await tester.pump();
    expect(find.text('Start Quiz! 🚀'), findsOneWidget);
    await _toQuiz(tester);

    expect(api.calls, contains('startGame:GEO_QUIZ:1'));
    expect(find.byKey(const Key('quiz-progress')), findsOneWidget);
    expect(_state(h, _geoEasy).total, 10);

    for (var q = 0; q < 10; q++) {
      expect(_state(h, _geoEasy).index, q);
      await _tapOption(tester, h, _geoEasy, null);
      expect(find.byKey(const Key('quiz-feedback')), findsOneWidget);
      expect(find.text('🎉 Correct!'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 2600));
    }
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('3210'), findsOneWidget);
    expect(find.text('#4'), findsOneWidget);
    expect(api.calls.where((c) => c.startsWith('completeGame:game-1:')), hasLength(1));
    expect(api.calls.last, endsWith(':10'));
  });

  testWidgets('Geo Quiz: a wrong answer and a timeout both count as wrong', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return CompleteGameResult.fromJson(_done(500));
    });
    final h = await pumpRouterApp(
      tester,
      location: '/geo-quiz/play?difficulty=easy&mode=capitals',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));

    // Wrong tap.
    final first = _state(h, _geoEasy);
    final wrong = first.current.options.indexWhere((o) => o != first.current.correctAnswer);
    await _tapOption(tester, h, _geoEasy, wrong);
    expect(_state(h, _geoEasy).isCorrect, isFalse);
    expect(find.textContaining('The answer was:'), findsOneWidget);
    expect(_state(h, _geoEasy).score, 0);
    await tester.pump(const Duration(milliseconds: 2600));

    // Let the 15 s question timer run out.
    expect(_state(h, _geoEasy).index, 1);
    for (var i = 0; i < 15; i++) {
      await tester.pump(const Duration(seconds: 1));
    }
    expect(_state(h, _geoEasy).selected, '');
    expect(_state(h, _geoEasy).phase, QuizPhase.feedback);
    expect(_state(h, _geoEasy).correctCount, 0);
    await tester.pump(const Duration(milliseconds: 2600));

    // Answer the other eight right.
    for (var q = 2; q < 10; q++) {
      await _tapOption(tester, h, _geoEasy, null);
      await tester.pump(const Duration(milliseconds: 2600));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(sent, {'correctAnswers': 8, 'totalQuestions': 10});
    expect(find.byKey(const Key('result-score')), findsOneWidget);
  });

  testWidgets('Geo Quiz: hints appear after 5 s and 10 s, streak after two right',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/geo-quiz/play?difficulty=easy&mode=flags',
    );
    await tester.pump(const Duration(milliseconds: 100));
    const flags = (
      gameId: 'geo-quiz',
      difficulty: 'easy',
      mode: 'flags',
      category: '',
      count: 0,
      quest: null,
    );
    expect(find.byKey(const Key('quiz-hint-1')), findsNothing);
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(seconds: 1));
    }
    expect(find.byKey(const Key('quiz-hint-1')), findsOneWidget);
    expect(find.byKey(const Key('quiz-hint-2')), findsNothing);
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(seconds: 1));
    }
    expect(find.byKey(const Key('quiz-hint-2')), findsOneWidget);

    await _tapOption(tester, h, flags, null);
    await tester.pump(const Duration(milliseconds: 2600));
    await _tapOption(tester, h, flags, null);
    await tester.pump(const Duration(milliseconds: 2600));
    expect(_state(h, flags).streak, 2);
    expect(find.byKey(const Key('quiz-streak')), findsOneWidget);
    expect(find.textContaining('+50'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('Geo Quiz: hard mode draws a country silhouette', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(
      tester,
      location: '/geo-quiz/play?difficulty=hard&mode=silhouettes',
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Which country is this?'), findsOneWidget);
    expect(find.byType(CustomPaint), findsWidgets);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('History Quiz: setup shows the modes of a difficulty, play, result',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onCompleteGame: (id, time, attempts, extra) async =>
          CompleteGameResult.fromJson(_done(2222)),
    );
    final h = await pumpRouterApp(tester, location: '/history-quiz/setup', api: api);
    await tester.tap(find.byKey(const Key('difficulty-medium')));
    await tester.pump();
    expect(find.byKey(const Key('mode-name-event')), findsOneWidget);
    expect(find.byKey(const Key('mode-when-happened')), findsOneWidget);
    expect(find.byKey(const Key('mode-who-said')), findsNothing);
    // Easy has a single mode, picked for the player.
    await tester.tap(find.byKey(const Key('difficulty-easy')));
    await tester.pump();
    expect(find.text('Start Quiz! 🚀'), findsOneWidget);
    await tester.tap(find.byKey(const Key('difficulty-medium')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('mode-when-happened')));
    await tester.pump();
    await _toQuiz(tester);

    expect(api.calls, contains('startGame:HISTORY_QUIZ:2'));
    expect(find.textContaining('When did this happen?'), findsOneWidget);
    for (var q = 0; q < 10; q++) {
      await _tapOption(tester, h, _historyMedium, null);
      await tester.pump(const Duration(milliseconds: 3100));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('2222'), findsOneWidget);
  });

  testWidgets('History Quiz: English-only note in other languages', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/history-quiz/setup', locale: const Locale('es'));
    expect(find.byKey(const Key('english-only-badge')), findsOneWidget);
  });

  testWidgets('Civics Quiz: setup counts, play, result', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onCompleteGame: (id, time, attempts, extra) async =>
          CompleteGameResult.fromJson(_done(1800)),
    );
    final h = await pumpRouterApp(tester, location: '/civics-quiz/setup', api: api);
    expect(find.textContaining('90 questions'), findsOneWidget);
    expect(find.textContaining('47 questions'), findsOneWidget);
    expect(find.textContaining('30 questions'), findsOneWidget);
    expect(find.textContaining('13 questions'), findsOneWidget);
    await tester.tap(find.byKey(const Key('category-civics')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('level-easy')));
    await tester.pump();
    await _toQuiz(tester);

    expect(api.calls, contains('startGame:CIVICS_QUIZ:1'));
    expect(_state(h, _civics).total, 6);
    for (var q = 0; q < 6; q++) {
      await _tapOption(tester, h, _civics, null);
      // Civics shows the plain answer line only for wrong answers.
      await tester.pump(const Duration(milliseconds: 2600));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('1800'), findsOneWidget);
    expect(api.calls.last, endsWith(':6'));
  });

  testWidgets('Civics Quiz: a hard round on a small topic is capped to the pool',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/civics-quiz/play?category=civics&level=hard&questions=20',
    );
    await tester.pump(const Duration(milliseconds: 100));
    const args = (
      gameId: 'civics-quiz',
      difficulty: 'hard',
      mode: '',
      category: 'civics',
      count: 20,
      quest: null,
    );
    expect(_state(h, args).total, 13);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('pausing stops the question clock', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/geo-quiz/play?difficulty=easy&mode=capitals',
    );
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(seconds: 2));
    final left = _state(h, _geoEasy).timeLeft;
    await tester.tap(find.byKey(const Key('game-pause')));
    await tester.pump();
    await tester.pump(const Duration(seconds: 5));
    expect(_state(h, _geoEasy).timeLeft, left);
    await tester.tap(find.byKey(const Key('game-resume')));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(_state(h, _geoEasy).timeLeft, left - 1);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context to startGame', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/geo-quiz/play?difficulty=easy&mode=capitals&quest=brain-peaks:bp-02-geo:0',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:GEO_QUIZ:1:brain-peaks:bp-02-geo:0'));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('rate limit shows the neutral page for a quiz', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onStartGame: (t, d, q) async =>
          throw GameApiException('Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED'),
    );
    await pumpRouterApp(
      tester,
      location: '/history-quiz/play?difficulty=easy&mode=name-event',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Daily limit reached'), findsOneWidget);
  });
}
