import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/math/math_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const MathArgs _easy = (difficulty: 'easy', quest: null);

MathState _state(RouterHarness h, [MathArgs args = _easy]) =>
    h.container.read(mathControllerProvider(args));

Future<void> _answer(WidgetTester tester, String text) async {
  await tester.enterText(find.byKey(const Key('math-input')), text);
  await tester.pump();
  await tester.tap(find.byKey(const Key('math-submit')));
  await tester.pump(const Duration(milliseconds: 50));
}

CompleteGameResult _result(int score) => CompleteGameResult.fromJson({
      'id': 'game-1',
      'status': 'COMPLETED',
      'score': score,
      'scoreBreakdown': {
        'baseScore': 900,
        'difficultyMultiplier': 1.0,
        'speedBonus': 10,
        'accuracyBonus': 20,
        'finalScore': score,
      },
    });

void main() {
  testWidgets('setup -> play 10 questions -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return _result(7777);
    });
    final h = await pumpRouterApp(tester, location: '/math-challenge/setup', api: api);

    expect(find.text('Select a Level'), findsOneWidget);
    await tester.tap(find.byKey(const Key('difficulty-easy')));
    await tester.pump();
    expect(find.text('Start Challenge! 🚀'), findsOneWidget);
    await tester.tap(find.byKey(const Key('game-start-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));

    expect(api.calls, contains('startGame:MATH_CHALLENGE:1'));
    for (var n = 1; n <= 10; n++) {
      expect(_state(h).number, n);
      expect(find.text('$n / 10'), findsOneWidget);
      await _answer(tester, '${_state(h).question.answer}');
      expect(find.text('✅ Correct!'), findsOneWidget);
      await tester.pump(kMathFeedbackDelay + const Duration(milliseconds: 100));
    }
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('7777'), findsOneWidget);
    expect(sent, {'correctAnswers': 10, 'totalQuestions': 10});
    // attempts = number of the last question, as on web.
    expect(api.calls.last, endsWith(':10'));
  });

  testWidgets('a wrong answer shows the right one and does not score', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/math-challenge/play?difficulty=easy',
    );
    await tester.pump(const Duration(milliseconds: 100));
    final answer = _state(h).question.answer;
    await _answer(tester, '${answer + 1}');
    expect(find.text('❌ Wrong! Answer: $answer'), findsOneWidget);
    expect(_state(h).correctCount, 0);
    expect(find.byKey(const Key('math-score')), findsOneWidget);
    // The field is locked during feedback and the next question is a new one.
    final before = _state(h).question.question;
    await tester.pump(kMathFeedbackDelay + const Duration(milliseconds: 100));
    expect(_state(h).number, 2);
    expect(_state(h).question.question, isNot(before));
    expect(find.byKey(const Key('math-feedback')), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('submit is off for an empty answer', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/math-challenge/play?difficulty=medium');
    await tester.pump(const Duration(milliseconds: 100));
    final button = tester.widget<FilledButton>(find.byKey(const Key('math-submit')));
    expect(button.onPressed, isNull);
    await tester.enterText(find.byKey(const Key('math-input')), '5');
    await tester.pump();
    expect(tester.widget<FilledButton>(find.byKey(const Key('math-submit'))).onPressed,
        isNotNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('running out of time ends the round with the questions reached',
      (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return _result(100);
    });
    final h = await pumpRouterApp(
      tester,
      location: '/math-challenge/play?difficulty=easy',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    await _answer(tester, '${_state(h).question.answer}');
    await tester.pump(kMathFeedbackDelay + const Duration(milliseconds: 100));
    // 120 s round; about 2 s have passed.
    for (var i = 0; i < 125; i++) {
      await tester.pump(const Duration(seconds: 1));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(sent, {'correctAnswers': 1, 'totalQuestions': 10});
    expect(api.calls.last, endsWith(':2'));
  });

  testWidgets('the clock is hard-coded per difficulty', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/math-challenge/play?difficulty=hard');
    await tester.pump(const Duration(milliseconds: 100));
    expect(_state(h, (difficulty: 'hard', quest: null)).timeRemaining, lessThanOrEqualTo(240));
    expect(find.text('20'), findsNothing);
    expect(find.text('1 / 20'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/math-challenge/play?difficulty=medium&quest=brain-peaks:bp-03-math:1',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:MATH_CHALLENGE:2:brain-peaks:bp-03-math:1'));
    await tester.pumpWidget(const SizedBox());
  });
}
