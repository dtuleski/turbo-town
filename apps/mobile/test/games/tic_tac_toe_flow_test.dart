import 'package:dashden_mobile/game/tic_tac_toe/logic.dart';
import 'package:dashden_mobile/game/tic_tac_toe/ttt_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

TttState _state(RouterHarness h, String difficulty) =>
    h.container.read(tttControllerProvider((difficulty: difficulty, quest: null)));

Future<void> _tapCell(WidgetTester tester, int i) async {
  await tester.tap(find.byKey(Key('ttt-cell-$i')));
  await tester.pump(const Duration(milliseconds: 50));
}

/// Plays the first free cell until the round ends (the AI answers after 500 ms).
Future<void> _playRound(WidgetTester tester, RouterHarness h, String difficulty) async {
  var guard = 0;
  while (!_state(h, difficulty).roundOver && guard++ < 10) {
    final s = _state(h, difficulty);
    if (s.playerTurn) {
      await _tapCell(tester, getEmptyCells(s.board).first);
    }
    await pumpFor(tester, const Duration(milliseconds: 600));
  }
  expect(_state(h, difficulty).roundOver, isTrue);
}

void main() {
  testWidgets('setup -> five rounds against the AI -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(3030);
    });
    final h = await pumpRouterApp(tester, location: '/tic-tac-toe/setup', api: api);
    expect(find.text('Select Difficulty'), findsOneWidget);
    await chooseAndStart(tester, ['difficulty-medium']);
    expect(api.calls, contains('startGame:TIC_TAC_TOE:2'));
    expect(find.text('Round 1/5'), findsOneWidget);

    for (var round = 0; round < 5; round++) {
      expect(_state(h, 'medium').round, round);
      await _playRound(tester, h, 'medium');
      final s = _state(h, 'medium');
      expect(find.text(switch (s.result!) {
        RoundResult.win => 'You Win! +300',
        RoundResult.draw => 'Draw! +100',
        RoundResult.lose => 'AI Wins!',
      }), findsOneWidget);
      expect(s.score, s.wins * 300 + s.draws * 100);
      expect(find.byKey(const Key('ttt-next')), findsOneWidget);
      if (round < 4) {
        await tester.tap(find.byKey(const Key('ttt-next')));
        await tester.pump();
        expect(_state(h, 'medium').board.every((c) => c == null), isTrue);
        expect(_state(h, 'medium').playerTurn, isTrue);
      }
    }
    final last = _state(h, 'medium');
    expect(last.wins + last.draws + last.losses, 5);
    expect(find.text('See Results 🏆'), findsOneWidget);
    await tester.tap(find.byKey(const Key('ttt-next')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('3030'), findsOneWidget);
    expect(sent, {'correctAnswers': last.wins, 'totalQuestions': 5});
    expect(api.calls.last, endsWith(':5'));
  });

  testWidgets('the AI answers 500 ms after the player and the player cannot tap meanwhile',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/tic-tac-toe/play?difficulty=hard');
    await tester.pump(const Duration(milliseconds: 100));
    await _tapCell(tester, 0);
    var s = _state(h, 'hard');
    expect(s.board[0], 'X');
    expect(s.playerTurn, isFalse);
    expect(find.text('AI thinking...'), findsOneWidget);
    await _tapCell(tester, 8); // ignored: not the player's turn
    expect(_state(h, 'hard').board[8], isNull);
    await pumpFor(tester, const Duration(milliseconds: 600));
    s = _state(h, 'hard');
    expect(s.board.where((c) => c == 'O'), hasLength(1));
    expect(s.playerTurn, isTrue);
    expect(find.text('Your turn'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the perfect AI never loses a round', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/tic-tac-toe/play?difficulty=hard');
    await tester.pump(const Duration(milliseconds: 100));
    await _playRound(tester, h, 'hard');
    expect(_state(h, 'hard').result, isNot(RoundResult.win));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/tic-tac-toe/play?difficulty=easy&quest=brain-peaks:bp-08:0',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:TIC_TAC_TOE:1:brain-peaks:bp-08:0'));
    await tester.pumpWidget(const SizedBox());
  });

  group('two players', () {
    testWidgets('setup button opens a local game that never calls the server', (tester) async {
      useTallSurface(tester);
      final api = FakeGameApi();
      await pumpRouterApp(tester, location: '/tic-tac-toe/setup', api: api);
      await tester.ensureVisible(find.byKey(const Key('ttt-two-player')));
      await tester.tap(find.byKey(const Key('ttt-two-player')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text("X's turn"), findsOneWidget);
      // X: 0, 1, 2 wins; O: 3, 4.
      for (final i in [0, 3, 1, 4]) {
        await _tapCell(tester, i);
      }
      expect(find.text("X's turn"), findsOneWidget);
      await _tapCell(tester, 2);
      expect(find.text('X wins!'), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('ttt2-p1')), matching: find.text('1')),
          findsOneWidget);
      // The finished board takes no more moves.
      await _tapCell(tester, 5);
      expect(find.text('X wins!'), findsOneWidget);
      expect(api.calls.where((c) => c.startsWith('startGame') || c.startsWith('completeGame')),
          isEmpty);
    });

    testWidgets('a full board is a tie and a new round keeps the tallies', (tester) async {
      useTallSurface(tester);
      await pumpRouterApp(tester, location: '/tic-tac-toe/play?mode=two-player');
      await tester.pump(const Duration(milliseconds: 100));
      // X O X / X O O / O X X : a draw.
      for (final i in [0, 1, 2, 4, 3, 5, 7, 6, 8]) {
        await _tapCell(tester, i);
      }
      expect(find.text("It's a draw!"), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('ttt2-ties')), matching: find.text('1')),
          findsOneWidget);
      await tester.tap(find.byKey(const Key('ttt2-new-round')));
      await tester.pump();
      expect(find.text("X's turn"), findsOneWidget);
      // O wins on the new board: O takes 0, 1, 2.
      for (final i in [3, 0, 4, 1, 8, 2]) {
        await _tapCell(tester, i);
      }
      expect(find.text('O wins!'), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('ttt2-p2')), matching: find.text('1')),
          findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('ttt2-ties')), matching: find.text('1')),
          findsOneWidget);
    });
  });
}
