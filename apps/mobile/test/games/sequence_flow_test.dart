import 'package:dashden_mobile/api/quest_models.dart';
import 'package:dashden_mobile/game/sequence_memory/logic.dart';
import 'package:dashden_mobile/game/sequence_memory/sequence_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const SequenceArgs _easy = (difficulty: 'easy', theme: 'f1-2025', quest: null);

SequenceState _state(RouterHarness h, [SequenceArgs args = _easy]) =>
    h.container.read(sequenceControllerProvider(args));

/// Waits out the memorize countdown.
Future<void> _untilAnswering(WidgetTester tester, RouterHarness h, [int seconds = 6]) async {
  await pumpFor(tester, Duration(seconds: seconds), step: const Duration(seconds: 1));
  expect(_state(h).phase, SeqPhase.answering);
}

Future<void> _tapDriver(WidgetTester tester, String id) async {
  await tester.tap(find.byKey(Key('seq-bank-$id')));
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  testWidgets('setup -> memorize and repeat all 5 rounds -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(5555);
    });
    final h = await pumpRouterApp(tester, location: '/sequence-memory/setup', api: api);
    await chooseAndStart(tester, ['theme-f1-2025', 'difficulty-easy']);
    expect(api.calls, contains('startGame:SEQUENCE_MEMORY:1'));
    expect(find.byKey(const Key('seq-pill')), findsOneWidget);
    expect(find.text('MEMORIZE! 6s'), findsOneWidget);

    for (var round = 0; round < 5; round++) {
      expect(_state(h).round, round);
      // The first round's cards are face up during the countdown.
      expect(_state(h).revealed, hasLength(round + 1));
      await _untilAnswering(tester, h);
      expect(_state(h).revealed, isEmpty);
      final challenge = _state(h).challenge;
      for (var i = 0; i <= round; i++) {
        await _tapDriver(tester, challenge[i].id);
      }
      if (round < 4) {
        expect(find.text('✅ Correct! Next round...'), findsOneWidget);
        await pumpFor(tester, const Duration(milliseconds: 900));
      }
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('5555'), findsOneWidget);
    expect(sent, {'correctAnswers': 5, 'totalQuestions': 5});
    expect(api.calls.last, endsWith(':5'), reason: 'rounds + mistakes');
  });

  testWidgets('the answer prompt names the position in the sequence', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/sequence-memory/play?difficulty=medium');
    await tester.pump(const Duration(milliseconds: 100));
    const args = (difficulty: 'medium', theme: 'f1-2025', quest: null);
    expect(_state(h, args).challenge, hasLength(10));
    expect(find.text('MEMORIZE! 4s'), findsOneWidget);
    await pumpFor(tester, const Duration(seconds: 4), step: const Duration(seconds: 1));
    expect(find.text('TAP THE CARD YOU SAW'), findsOneWidget);
    await _tapDriver(tester, _state(h, args).challenge[0].id);
    await pumpFor(tester, const Duration(milliseconds: 900));
    await pumpFor(tester, const Duration(seconds: 4), step: const Duration(seconds: 1));
    expect(find.text('TAP CARD 1 OF 2 IN ORDER'), findsOneWidget);
    await _tapDriver(tester, _state(h, args).challenge[0].id);
    expect(find.text('TAP CARD 2 OF 2 IN ORDER'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('three wrong cards end the round; See Score submits the rounds completed',
      (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(900);
    });
    final h = await pumpRouterApp(
      tester,
      location: '/sequence-memory/play?difficulty=easy&theme=f1-2025',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    // Round 1 right, round 2 fails.
    await _untilAnswering(tester, h);
    await _tapDriver(tester, _state(h).challenge[0].id);
    await pumpFor(tester, const Duration(milliseconds: 900));
    await _untilAnswering(tester, h);
    final s = _state(h);
    final expected = s.challenge[0].id;
    final wrong = s.bank.firstWhere((d) => d.id != expected).id;
    await _tapDriver(tester, wrong);
    expect(_state(h).lives, 2);
    expect(_state(h).answerIndex, 0, reason: 'a wrong card does not advance');
    await _tapDriver(tester, wrong);
    await _tapDriver(tester, wrong);
    expect(_state(h).phase, SeqPhase.gameOver);
    expect(find.text('Game Over!'), findsOneWidget);
    expect(find.text('You completed 1 of 5 rounds'), findsOneWidget);
    expect(find.text('3 mistakes'), findsOneWidget);
    await tester.tap(find.byKey(const Key('game-over-score')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(sent, {'correctAnswers': 1, 'totalQuestions': 5});
    expect(api.calls.last, endsWith(':4'), reason: '1 round + 3 mistakes');
  });

  testWidgets('cards cannot be tapped while memorizing', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/sequence-memory/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final first = _state(h).challenge.first.id;
    await tester.tap(find.byKey(Key('seq-bank-$first')), warnIfMissed: false);
    await tester.pump();
    expect(_state(h).correctRounds, 0);
    expect(_state(h).answerIndex, 0);
    expect(_state(h).phase, SeqPhase.showing);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the 2026 theme and a quest launch send the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    final h = await pumpRouterApp(
      tester,
      location: '/sequence-memory/play?difficulty=hard&theme=f1-2026&quest=brain-peaks:bp-05-sequence:0',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:SEQUENCE_MEMORY:3:brain-peaks:bp-05-sequence:0'));
    final ids = seqDrivers('f1-2026').map((d) => d.id).toSet();
    final s = h.container.read(sequenceControllerProvider((
      difficulty: 'hard',
      theme: 'f1-2026',
      quest: _quest,
    )));
    expect(s.challenge, hasLength(15));
    expect(s.challenge.every((c) => ids.contains(c.id)), isTrue);
    await tester.pumpWidget(const SizedBox());
  });
}

final _quest = QuestContext.parse('brain-peaks:bp-05-sequence:0');
