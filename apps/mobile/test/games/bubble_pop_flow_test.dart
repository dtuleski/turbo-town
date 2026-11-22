import 'package:dashden_mobile/game/bubble_pop/bubble_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const BubbleArgs _easy = (difficulty: 'easy', quest: null);

BubbleState _state(RouterHarness h) => h.container.read(bubbleControllerProvider(_easy));

Future<void> _pop(WidgetTester tester, int id) async {
  await tester.tap(find.byKey(Key('bubble-$id')));
  await tester.pump(const Duration(milliseconds: 50));
}

/// A bubble that still shows [letter].
int _bubbleFor(BubbleState s, String letter) =>
    s.bubbles.firstWhere((b) => !b.popped && b.letter == letter).id;

Future<void> _spellWord(WidgetTester tester, RouterHarness h) async {
  final word = _state(h).word.word;
  for (var i = 0; i < word.length; i++) {
    await _pop(tester, _bubbleFor(_state(h), word[i]));
  }
}

void main() {
  testWidgets('setup -> spell 5 words -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(8080);
    });
    final h = await pumpRouterApp(tester, location: '/bubble-pop/setup', api: api);
    await chooseAndStart(tester, ['difficulty-easy']);
    expect(api.calls, contains('startGame:BUBBLE_POP:1'));
    expect(find.text('Round 1/5'), findsOneWidget);

    var pops = 0;
    for (var round = 0; round < 5; round++) {
      expect(_state(h).round, round);
      expect(find.text(_state(h).word.hint), findsOneWidget);
      pops += _state(h).word.word.length;
      await _spellWord(tester, h);
      if (round < 4) {
        expect(_state(h).phase, BubblePhase.roundComplete);
        await tester.tap(find.byKey(const Key('bubble-next')));
        await tester.pump();
      }
    }
    await pumpFor(tester, const Duration(milliseconds: 700));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('8080'), findsOneWidget);
    expect(sent, {'correctAnswers': 5, 'totalQuestions': 5});
    expect(api.calls.last, endsWith(':$pops'));
  });

  testWidgets('a wrong bubble costs a life; letters pop only in order', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/bubble-pop/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final word = _state(h).word.word;
    final wrongBubble = _state(h).bubbles.firstWhere((b) => b.letter != word[0]);
    await _pop(tester, wrongBubble.id);
    expect(_state(h).lives, 2);
    expect(_state(h).totalWrong, 1);
    expect(_state(h).shakeId, wrongBubble.id);
    expect(_state(h).nextLetter, 0);
    expect(_state(h).bubbles.where((b) => b.popped), isEmpty, reason: 'a wrong bubble stays');
    await pumpFor(tester, const Duration(milliseconds: 600));
    expect(_state(h).shakeId, isNull);

    await _pop(tester, _bubbleFor(_state(h), word[0]));
    expect(_state(h).nextLetter, 1);
    expect(_state(h).bubbles.where((b) => b.popped), hasLength(1));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('three wrong bubbles end the round; See Score submits the words completed',
      (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(700);
    });
    final h = await pumpRouterApp(tester, location: '/bubble-pop/play?difficulty=easy', api: api);
    await tester.pump(const Duration(milliseconds: 100));
    // First word right, then three misses on the second.
    await _spellWord(tester, h);
    final firstLength = _state(h).word.word.length;
    await tester.tap(find.byKey(const Key('bubble-next')));
    await tester.pump();
    for (var i = 0; i < 3; i++) {
      final expected = _state(h).word.word[0];
      final wrong = _state(h).bubbles.firstWhere((b) => b.letter != expected);
      await _pop(tester, wrong.id);
    }
    expect(_state(h).phase, BubblePhase.gameOver);
    expect(find.text('Game Over!'), findsOneWidget);
    expect(find.text('You completed 1 of 5 rounds'), findsOneWidget);
    await tester.tap(find.byKey(const Key('game-over-score')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(sent, {'correctAnswers': 1, 'totalQuestions': 5});
    expect(api.calls.last, endsWith(':${firstLength + 3}'));
  });

  testWidgets('the word has no repeated words within a game', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/bubble-pop/play?difficulty=hard');
    await tester.pump(const Duration(milliseconds: 100));
    final words = h.container
        .read(bubbleControllerProvider((difficulty: 'hard', quest: null)))
        .words
        .map((w) => w.word);
    expect(words.toSet(), hasLength(5));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/bubble-pop/play?difficulty=medium&quest=brain-peaks:bp-09:2',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:BUBBLE_POP:2:brain-peaks:bp-09:2'));
    await tester.pumpWidget(const SizedBox());
  });
}
