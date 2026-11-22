import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/game_registry.dart';
import 'package:dashden_mobile/game/space_entry/config.dart';
import 'package:dashden_mobile/game/space_entry/physics.dart';
import 'package:dashden_mobile/game/space_entry/puzzles.dart';
import 'package:dashden_mobile/game/space_entry/space_entry_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

SpaceEntryArgs _args(String d) => (difficulty: d, quest: null);

SpaceEntryState _state(RouterHarness h, [String d = 'easy']) =>
    h.container.read(spaceEntryControllerProvider(_args(d)));
SpaceEntryController _ctrl(RouterHarness h, [String d = 'easy']) =>
    h.container.read(spaceEntryControllerProvider(_args(d)).notifier);

Future<void> _answer(WidgetTester tester, PuzzleSlot slot, String text) async {
  await tester.ensureVisible(find.byKey(Key('se-input-${slot.id}')));
  await tester.enterText(find.byKey(Key('se-input-${slot.id}')), text);
  await tester.pump();
  await tester.ensureVisible(find.byKey(Key('se-submit-${slot.id}')));
  await tester.tap(find.byKey(Key('se-submit-${slot.id}')));
  await tester.pump();
}

/// Answers every puzzle correctly, except where [wrong] gives another value.
Future<void> _solveAll(WidgetTester tester, RouterHarness h, String d, {Map<String, String> wrong = const {}}) async {
  for (final slot in _state(h, d).slots) {
    await _answer(tester, slot, wrong[slot.id] ?? jsNum(slot.puzzle.correctAnswer));
  }
}

Future<void> _fire(WidgetTester tester) async {
  await tester.ensureVisible(find.byKey(const Key('se-fire')));
  await tester.tap(find.byKey(const Key('se-fire')));
  await tester.pump();
}

void main() {
  test('the registry marks Space Entry playable and paid', () {
    final e = gameById('space-entry')!;
    expect(e.implemented, isTrue);
    expect(e.isPaid, isTrue);
    expect(e.setupRoute, '/space-entry/setup');
  });

  testWidgets('setup -> solve the console -> land -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(5150);
    });
    final h = await pumpRouterApp(tester, location: '/space-entry/setup', api: api);
    expect(find.text('Choose Your Mission Difficulty'), findsOneWidget);
    await chooseAndStart(tester, ['difficulty-easy']);
    expect(api.calls, contains('startGame:SPACE_ENTRY:1'));
    expect(find.byKey(const Key('se-target')), findsOneWidget);
    expect(find.byKey(const Key('se-fire')), findsOneWidget);

    // The button stays closed until every puzzle is answered.
    expect(tester.widget<FilledButton>(find.byKey(const Key('se-fire'))).onPressed, isNull);
    expect(find.text('Systems check: 0/3 complete'), findsOneWidget);

    await _solveAll(tester, h, 'easy');
    expect(_state(h).allSubmitted, isTrue);
    expect(_state(h).totalCorrect, 3);
    expect(find.text('Systems check: 3/3 complete'), findsOneWidget);
    expect(find.byKey(const Key('se-predicted-dot')), findsOneWidget);
    expect(_state(h).prediction.outcome, LandingOutcome.successfulLanding);

    await _fire(tester);
    expect(_state(h).phase, SpacePhase.reentry);
    await pumpFor(tester, kReentryDuration + const Duration(milliseconds: 200));
    expect(find.byKey(const Key('se-results')), findsOneWidget);
    expect(find.text('Successful Landing!'), findsOneWidget);
    expect(find.text(_state(h).zone.geographyFact), findsOneWidget);

    await tester.tap(find.byKey(const Key('se-see-score')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('5150'), findsOneWidget);
    expect(sent, {'correctAnswers': 3, 'totalQuestions': 3});
    expect(api.calls.last, matches(RegExp(r'completeGame:game-1:\d+:1$')));
  });

  testWidgets('a burn-up sends the player back; the second landing is attempt 2 and is timed alone',
      (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(900);
    });
    final h = await pumpRouterApp(tester, location: '/space-entry/play?difficulty=easy', api: api);
    await settleStart(tester);

    // A 60 degree entry burns the shield up. (A text answer is a real answer, right or wrong.)
    final firstPuzzle = _state(h).slots.first.puzzle;
    await _solveAll(tester, h, 'easy', wrong: {'angle': '60'});
    expect(_state(h).slot('angle')!.correct, isFalse);
    expect(find.byKey(const Key('se-result-angle')), findsOneWidget);
    expect(_state(h).totalCorrect, 2);
    await _fire(tester);
    await pumpFor(tester, kReentryDuration + const Duration(milliseconds: 200));
    expect(find.text('Orbital Burn-up'), findsOneWidget);
    expect(find.byKey(const Key('se-see-score')), findsNothing, reason: 'only a landing is scored');

    // Spend some countdown on the second mission.
    await tester.tap(find.byKey(const Key('se-retry')));
    await tester.pump();
    expect(_state(h).tries, 2);
    expect(_state(h).phase, SpacePhase.setup);
    expect(_state(h).countdown, spaceEntryConfig('easy').countdownSeconds);
    expect(_state(h).submittedCount, 0);
    expect(identical(_state(h).slots.first.puzzle, firstPuzzle), isFalse, reason: 'new puzzles');
    for (var i = 0; i < 12; i++) {
      _ctrl(h).tick();
    }
    await _solveAll(tester, h, 'easy');
    await _fire(tester);
    await pumpFor(tester, kReentryDuration + const Duration(milliseconds: 200));
    await tester.tap(find.byKey(const Key('se-see-score')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(sent, {'correctAnswers': 3, 'totalQuestions': 3});
    // attempts = missions started; time = 12 s of the last mission only.
    expect(api.calls.last, 'completeGame:game-1:12:2');
  });

  testWidgets('a shallow entry skips off and offers a retry', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/space-entry/play?difficulty=easy');
    await settleStart(tester);
    await _solveAll(tester, h, 'easy', wrong: {'angle': '-40'});
    await _fire(tester);
    await pumpFor(tester, kReentryDuration + const Duration(milliseconds: 200));
    expect(find.text('Skip-off'), findsOneWidget);
    expect(find.byKey(const Key('se-retry')), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the countdown auto-fires with the answers given so far', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/space-entry/play?difficulty=easy');
    await settleStart(tester);
    await _answer(tester, _state(h).slot('angle')!, '60');
    expect(_state(h).countdown, 90);
    for (var i = 0; i < 79; i++) {
      _ctrl(h).tick();
    }
    expect(_state(h).countdown, 11);
    await tester.pump();
    expect(find.byKey(const Key('se-autofire')), findsNothing, reason: 'the warning starts at 10 s');
    _ctrl(h).tick();
    await tester.pump();
    expect(find.text('⚠ Auto-firing in 10s!'), findsOneWidget);
    for (var i = 0; i < 5; i++) {
      _ctrl(h).tick();
    }
    await tester.pump();
    expect(find.text('⚠ Auto-firing in 5s!'), findsOneWidget);
    for (var i = 0; i < 5; i++) {
      _ctrl(h).tick();
    }
    expect(_state(h).countdown, 0);
    expect(_state(h).phase, SpacePhase.reentry);
    expect(_state(h).finalResult!.outcome, LandingOutcome.orbitalBurnUp,
        reason: 'the 60 degree answer was used, not an empty console');
    await pumpFor(tester, kReentryDuration + const Duration(milliseconds: 200));
    expect(find.text('Orbital Burn-up'), findsOneWidget);
  });

  testWidgets('real time drives the countdown, one second per second', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/space-entry/play?difficulty=easy');
    await settleStart(tester);
    final before = _state(h).countdown;
    await pumpFor(tester, const Duration(seconds: 5));
    expect(before - _state(h).countdown, inInclusiveRange(4, 5));
    expect(find.byKey(const Key('se-countdown')), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('input that is not a number is ignored', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/space-entry/play?difficulty=easy');
    await settleStart(tester);
    _ctrl(h).submit('angle', 'abc');
    _ctrl(h).submit('angle', '');
    expect(_state(h).submittedCount, 0);
    _ctrl(h).submit('angle', '7');
    expect(_state(h).submittedCount, 1);
    _ctrl(h).submit('angle', '9');
    expect(_state(h).slot('angle')!.value, 7, reason: 'an answer is final');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('hard adds thrust and lateral controls, 7 puzzles and turbulence', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/space-entry/play?difficulty=hard');
    await settleStart(tester);
    final s = _state(h, 'hard');
    expect(s.slots.map((e) => e.id), ['angle', 'thruster', 'lateral', 'bonus-0', 'bonus-1', 'bonus-2', 'bonus-3']);
    expect(s.countdown, 45);
    expect(find.text('Systems check: 0/7 complete'), findsOneWidget);
    expect(find.text('⚠ Turbulence Active'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('medium sends difficulty 2 and a quest context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/space-entry/play?difficulty=medium&quest=science-isle:si-02-space-entry:0',
      api: api,
    );
    await settleStart(tester);
    expect(api.calls, contains('startGame:SPACE_ENTRY:2:science-isle:si-02-space-entry:0'));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the paid backend answer shows the neutral unavailable page', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onStartGame: (_, __, ___) async =>
          throw GameApiException('This game requires a paid subscription', code: 'AUTHZ_TIER_REQUIRED'),
    );
    await pumpRouterApp(tester, location: '/space-entry/play?difficulty=easy', api: api);
    await settleStart(tester);
    expect(find.text('Not available in the app yet'), findsWidgets);
    expect(find.byKey(const Key('se-fire')), findsNothing);
  });
}
