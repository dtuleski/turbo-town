import 'package:dashden_mobile/game/pattern_recall/pattern_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const PatternArgs _easy = (theme: 'animals', difficulty: 'easy', quest: null);

PatternState _state(RouterHarness h, [PatternArgs args = _easy]) =>
    h.container.read(patternControllerProvider(args));

/// Waits for the pattern to finish playing.
Future<void> _untilInput(WidgetTester tester, RouterHarness h) async {
  final ms = 800 * _state(h).sequence.length + 400;
  await pumpFor(tester, Duration(milliseconds: ms));
  expect(_state(h).phase, PatternPhase.input);
}

Future<void> _tap(WidgetTester tester, int index) async {
  await tester.tap(find.byKey(Key('pattern-tile-$index')));
  await tester.pump(const Duration(milliseconds: 50));
}

Future<void> _repeatPattern(WidgetTester tester, RouterHarness h) async {
  final seq = List.of(_state(h).sequence);
  for (final i in seq) {
    await _tap(tester, i);
  }
}

void main() {
  testWidgets('setup -> two right rounds, then three lives lost -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(2468);
    });
    final h = await pumpRouterApp(tester, location: '/pattern-recall/setup', api: api);
    expect(find.text('Select theme & difficulty'), findsOneWidget);
    await chooseAndStart(tester, ['theme-animals', 'difficulty-easy']);
    expect(api.calls, contains('startGame:PATTERN_RECALL:1'));
    expect(find.text('Watch the pattern!'), findsOneWidget);
    expect(_state(h).sequence, hasLength(1));

    // Round 1 (1 item) and round 2 (2 items) right: 3 taps.
    await _untilInput(tester, h);
    expect(find.text('Your turn!'), findsOneWidget);
    await _repeatPattern(tester, h);
    expect(_state(h).phase, PatternPhase.correct);
    await pumpFor(tester, const Duration(milliseconds: 900));
    expect(_state(h).round, 2);
    expect(_state(h).sequence, hasLength(2));
    await _untilInput(tester, h);
    await _repeatPattern(tester, h);
    await pumpFor(tester, const Duration(milliseconds: 900));
    expect(_state(h).round, 3);

    // Three wrong taps: each costs a life and replays the same pattern.
    for (var life = 3; life > 0; life--) {
      await _untilInput(tester, h);
      expect(_state(h).lives, life);
      final seq = List.of(_state(h).sequence);
      final wrong = (seq.first + 1) % 4;
      await _tap(tester, wrong);
      expect(_state(h).phase, PatternPhase.wrong);
      await pumpFor(tester, const Duration(milliseconds: 500));
      expect(_state(h).sequence, seq, reason: 'the same pattern replays');
    }
    expect(_state(h).phase, PatternPhase.gameOver);
    expect(find.text('Game Over!'), findsOneWidget);
    expect(find.text('Rounds completed: 2'), findsOneWidget);
    await tester.tap(find.byKey(const Key('game-over-score')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('2468'), findsOneWidget);
    // Rounds completed 2 of 3 reached; taps: 1 + 2 + 3 wrong.
    expect(sent, {'correctAnswers': 2, 'totalQuestions': 3});
    expect(api.calls.last, endsWith(':6'));
  });

  testWidgets('taps are ignored while the pattern plays', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/pattern-recall/play?theme=colors&difficulty=hard');
    await tester.pump(const Duration(milliseconds: 100));
    const args = (theme: 'colors', difficulty: 'hard', quest: null);
    expect(_state(h, args).items, hasLength(6));
    expect(_state(h, args).phase, PatternPhase.playback);
    await tester.tap(find.byKey(const Key('pattern-tile-0')));
    await tester.pump();
    expect(_state(h, args).totalTaps, 0);
    expect(_state(h, args).lives, 3);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the pattern lights one item at a time, in order, and grows each round',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/pattern-recall/play?theme=animals&difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    const args = _easy;
    await _untilInput(tester, h);
    await _repeatPattern(tester, h);
    await pumpFor(tester, const Duration(milliseconds: 100));

    // Round 2 plays two items: record what lights up.
    final lit = <int>[];
    var lastIndex = -1;
    h.container.listen(patternControllerProvider(args), (prev, next) {
      if (next.playbackIndex >= 0 && next.playbackIndex != lastIndex) {
        lit.add(next.litItem!);
      }
      lastIndex = next.playbackIndex;
    });
    await pumpFor(tester, const Duration(milliseconds: 3000));
    expect(_state(h, args).sequence, hasLength(2));
    expect(lit, _state(h, args).sequence);
    expect(_state(h, args).phase, PatternPhase.input);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('missing or unknown theme or difficulty goes back to setup', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(tester, location: '/pattern-recall/play?theme=nope&difficulty=easy', api: api);
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Choose a Theme'), findsOneWidget);
    expect(api.calls.where((c) => c.startsWith('startGame')), isEmpty);
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/pattern-recall/play?theme=colors&difficulty=medium&quest=brain-peaks:bp-07:1',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:PATTERN_RECALL:2:brain-peaks:bp-07:1'));
    await tester.pumpWidget(const SizedBox());
  });
}
