import 'package:dashden_mobile/game/sudoku/sudoku_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const SudokuArgs _easy = (difficulty: 'easy', quest: null);

SudokuState _state(RouterHarness h) => h.container.read(sudokuControllerProvider(_easy));

Future<void> _tapCell(WidgetTester tester, int r, int c) async {
  await tester.tap(find.byKey(Key('sudoku-cell-$r-$c')));
  await tester.pump();
}

Future<void> _enter(WidgetTester tester, int r, int c, int n) async {
  await _tapCell(tester, r, c);
  await tester.tap(find.byKey(Key('sudoku-num-$n')));
  await tester.pump();
}

({int r, int c}) _firstEmpty(SudokuState s) {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (s.grid[r][c] == 0) return (r: r, c: c);
    }
  }
  throw StateError('no empty cell');
}

void main() {
  testWidgets('setup -> solve the puzzle -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(4321);
    });
    final h = await pumpRouterApp(tester, location: '/sudoku/setup', api: api);
    expect(find.text('Select a Level'), findsOneWidget);
    await chooseAndStart(tester, ['difficulty-easy']);
    expect(api.calls, contains('startGame:SUDOKU:1'));

    final initial = _state(h);
    final filled = 81 - initial.givenCount;
    expect(filled, inInclusiveRange(30, 36));
    for (var i = 0; i < filled; i++) {
      final cell = _firstEmpty(_state(h));
      await _enter(tester, cell.r, cell.c, _state(h).solution[cell.r][cell.c]);
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('4321'), findsOneWidget);
    expect(sent, {'correctAnswers': filled, 'totalQuestions': filled});
    expect(api.calls.last, endsWith(':$filled'));
  });

  testWidgets('a wrong number counts as a mistake; notes and given cells do not change the grid',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/sudoku/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final s = _state(h);
    final cell = _firstEmpty(s);
    final right = s.solution[cell.r][cell.c];
    final wrong = right == 9 ? 1 : right + 1;

    // A given cell cannot be edited.
    var given = (r: 0, c: 0);
    outer:
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (s.given[r][c]) {
          given = (r: r, c: c);
          break outer;
        }
      }
    }
    final before = s.grid[given.r][given.c];
    await _enter(tester, given.r, given.c, before == 9 ? 1 : before + 1);
    expect(_state(h).grid[given.r][given.c], before);
    expect(_state(h).mistakes, 0);

    // Notes mode writes pencil marks only.
    await tester.tap(find.byKey(const Key('sudoku-notes')));
    await tester.pump();
    expect(find.text('✏ Notes ON'), findsOneWidget);
    await _enter(tester, cell.r, cell.c, wrong);
    expect(_state(h).grid[cell.r][cell.c], 0);
    expect(_state(h).notes[cell.r][cell.c], {wrong});
    await tester.tap(find.byKey(Key('sudoku-num-$wrong')));
    await tester.pump();
    expect(_state(h).notes[cell.r][cell.c], isEmpty, reason: 'same number again removes the note');
    await tester.tap(find.byKey(const Key('sudoku-notes')));
    await tester.pump();

    // A wrong number is placed, counted and can be erased.
    await _enter(tester, cell.r, cell.c, wrong);
    expect(_state(h).grid[cell.r][cell.c], wrong);
    expect(_state(h).mistakes, 1);
    expect(find.descendant(of: find.byKey(const Key('sudoku-mistakes')), matching: find.text('1')),
        findsOneWidget);
    await tester.tap(find.byKey(const Key('sudoku-erase')));
    await tester.pump();
    expect(_state(h).grid[cell.r][cell.c], 0);
    expect(_state(h).mistakes, 1, reason: 'erasing keeps the mistake');

    // The right number is not a mistake.
    await _enter(tester, cell.r, cell.c, right);
    expect(_state(h).grid[cell.r][cell.c], right);
    expect(_state(h).mistakes, 1);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a number with nine on the board is disabled', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/sudoku/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    // Fill every empty cell except one, with the right numbers.
    var s = _state(h);
    final target = _firstEmpty(s);
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (s.grid[r][c] == 0 && !(r == target.r && c == target.c)) {
          await _enter(tester, r, c, s.solution[r][c]);
        }
      }
    }
    s = _state(h);
    for (var n = 1; n <= 9; n++) {
      final button = tester.widget<FilledButton>(find.byKey(Key('sudoku-num-$n')));
      final needed = s.solution[target.r][target.c] == n;
      expect(button.onPressed == null, !needed, reason: 'number $n');
    }
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/sudoku/play?difficulty=medium&quest=brain-peaks:bp-04:1',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:SUDOKU:2:brain-peaks:bp-04:1'));
    await tester.pumpWidget(const SizedBox());
  });
}
