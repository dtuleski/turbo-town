import 'package:dashden_mobile/game/math_maze/logic.dart';
import 'package:dashden_mobile/game/math_maze/maze_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const MazeArgs _easy = (difficulty: 'easy', quest: null);

MazeState _state(RouterHarness h) => h.container.read(mazeControllerProvider(_easy));

/// Cells from [from] to [to] (default: the exit) through anything that is not
/// a wall (gates included: the walker answers them), first step excluded.
List<MazePos> _route(MazeData maze, MazePos from, [MazePos? to]) {
  final target = to ?? maze.exit;
  final prev = <int, MazePos?>{from.key: null};
  final queue = [from];
  var head = 0;
  while (head < queue.length) {
    final cur = queue[head++];
    if (cur == target) break;
    for (final d in const [MazePos(-1, 0), MazePos(1, 0), MazePos(0, -1), MazePos(0, 1)]) {
      final n = MazePos(cur.row + d.row, cur.col + d.col);
      if (n.row < 0 || n.row >= maze.rows || n.col < 0 || n.col >= maze.cols) continue;
      if (prev.containsKey(n.key) || maze.grid[n.row][n.col] == MazeCell.wall) continue;
      prev[n.key] = cur;
      queue.add(n);
    }
  }
  final path = <MazePos>[];
  MazePos? at = target;
  while (at != null && at != from) {
    path.add(at);
    at = prev[at.key];
  }
  return path.reversed.toList();
}

String _pad(MazePos from, MazePos to) {
  if (to.row < from.row) return 'maze-pad-up';
  if (to.row > from.row) return 'maze-pad-down';
  return to.col < from.col ? 'maze-pad-left' : 'maze-pad-right';
}

Future<void> _answerGate(WidgetTester tester, int answer) async {
  await tester.enterText(find.byKey(const Key('maze-gate-input')), '$answer');
  await tester.pump();
  await tester.tap(find.byKey(const Key('maze-gate-submit')));
  await tester.pump(const Duration(milliseconds: 50));
}

/// Walks to [target]'s gate and stops when its equation is on screen. Other
/// gates met on the way are answered correctly.
Future<void> _walkToGate(WidgetTester tester, RouterHarness h, GateInfo target) async {
  var guard = 0;
  while (guard++ < 300) {
    final s = _state(h);
    if (s.gatePrompt) {
      if (identical(s.activeGate, target)) return;
      await _answerGate(tester, s.activeGate!.equation.answer);
      await pumpFor(tester, const Duration(milliseconds: 1100));
      continue;
    }
    final next = _route(s.maze, s.player, target.position).first;
    await tester.tap(find.byKey(Key(_pad(s.player, next))));
    await tester.pump(const Duration(milliseconds: 50));
  }
  fail('never reached the gate');
}

void main() {
  testWidgets('setup -> answer the gates on the way -> reach the exit -> server score',
      (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(7070);
    });
    final h = await pumpRouterApp(tester, location: '/math-maze/setup', api: api);
    expect(find.text('Select a Level'), findsOneWidget);
    expect(find.textContaining("You don't have to open every gate"), findsOneWidget);
    await chooseAndStart(tester, ['difficulty-easy']);
    expect(api.calls, contains('startGame:MATH_MAZE:1'));
    expect(find.text('3:00'), findsOneWidget);

    var guard = 0;
    while (_state(h).end == null && guard++ < 200) {
      final s = _state(h);
      if (s.gatePrompt) {
        expect(find.byKey(const Key('maze-equation')), findsOneWidget);
        await _answerGate(tester, s.activeGate!.equation.answer);
        expect(find.text('Correct! Gate opened!'), findsOneWidget);
        await pumpFor(tester, const Duration(milliseconds: 1100));
        continue;
      }
      final next = _route(s.maze, s.player).first;
      await tester.tap(find.byKey(Key(_pad(s.player, next))));
      await tester.pump(const Duration(milliseconds: 50));
    }
    final end = _state(h);
    expect(end.end, MazeEnd.exitReached);
    expect(end.player, end.maze.exit);
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('7070'), findsOneWidget);
    expect(sent, {'correctAnswers': end.gatesSolved, 'totalQuestions': end.maze.gates.length});
    expect(api.calls.last, endsWith(':${end.gatesAttempted < 1 ? 1 : end.gatesAttempted}'));
  });

  testWidgets('a wrong answer blocks the gate for good and shows the right answer',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/math-maze/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    // Walk to the first gate until it asks.
    await _walkToGate(tester, h, _state(h).maze.gates.first);
    final s = _state(h);
    expect(s.gatePrompt, isTrue);
    expect(s.activeGate, same(s.maze.gates.first));
    final gate = s.activeGate!;
    final before = s.player;
    final attemptedBefore = s.gatesAttempted;
    final solvedBefore = s.gatesSolved;
    await _answerGate(tester, gate.equation.answer + 1);
    expect(_state(h).gateStates[gate.position.key], GateState.blocked);
    expect(_state(h).gatesAttempted, attemptedBefore + 1);
    expect(_state(h).gatesSolved, solvedBefore);
    expect(find.text('Wrong! The answer was ${gate.equation.answer}. Path blocked!'), findsOneWidget);
    // The prompt can not be closed or answered again while feedback shows.
    expect(find.byKey(const Key('maze-gate-submit')), findsNothing);
    await pumpFor(tester, const Duration(milliseconds: 2100));
    expect(_state(h).player, before, reason: 'the player stays in front of the gate');
    expect(_state(h).gatePrompt, isFalse);

    // Walking into the blocked gate does nothing and asks nothing.
    final dir = _pad(before, gate.position);
    await tester.tap(find.byKey(Key(dir)));
    await tester.pump(const Duration(milliseconds: 50));
    expect(_state(h).gatePrompt, isFalse);
    expect(_state(h).player, before);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a gate prompt can be closed without answering and asks again later',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/math-maze/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    await _walkToGate(tester, h, _state(h).maze.gates.first);
    final gate = _state(h).activeGate!;
    final attemptedBefore = _state(h).gatesAttempted;
    await tester.tap(find.byKey(const Key('maze-gate-close')));
    await tester.pump();
    expect(_state(h).gatePrompt, isFalse);
    expect(_state(h).gateStates[gate.position.key], GateState.locked);
    expect(_state(h).gatesAttempted, attemptedBefore);
    await tester.tap(find.byKey(Key(_pad(_state(h).player, gate.position))));
    await tester.pump(const Duration(milliseconds: 50));
    expect(_state(h).activeGate, same(gate));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('swiping moves the player and walls do not', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/math-maze/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final s = _state(h);
    final maze = s.maze;
    bool open(int r, int c) =>
        r >= 0 &&
        r < maze.rows &&
        c >= 0 &&
        c < maze.cols &&
        maze.grid[r][c] != MazeCell.wall &&
        maze.grid[r][c] != MazeCell.gate;
    final p = s.player;
    final right = open(p.row, p.col + 1);
    final down = open(p.row + 1, p.col);
    expect(right || down, isTrue);
    // Swipe toward an open side, then toward the nearest wall on the other axis.
    await tester.drag(find.byKey(const Key('maze-swipe')), right ? const Offset(60, 0) : const Offset(0, 60));
    await tester.pump();
    final after = _state(h);
    expect(after.steps, greaterThanOrEqualTo(1));
    expect(right ? after.player.col > p.col : after.player.row > p.row, isTrue);
    // The top-left corner of the grid is wall: swiping up/left from the start region never leaves the maze.
    for (var i = 0; i < 6; i++) {
      await tester.drag(find.byKey(const Key('maze-swipe')), const Offset(0, -60));
      await tester.pump();
    }
    expect(_state(h).player.row, inInclusiveRange(1, maze.rows - 1));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('running out of time ends the round and submits what was solved', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async => serverResult(100));
    final h = await pumpRouterApp(tester, location: '/math-maze/play?difficulty=easy', api: api);
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('3:00'), findsOneWidget);
    await pumpFor(tester, const Duration(seconds: 181), step: const Duration(seconds: 1));
    await tester.pump(const Duration(milliseconds: 100));
    expect(_state(h).end, MazeEnd.timeUp);
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(api.calls.last, startsWith('completeGame:game-1:180:'));
  });

  testWidgets('the countdown starts at the limit and the d-pad cannot walk through walls',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/math-maze/play?difficulty=medium');
    await tester.pump(const Duration(milliseconds: 100));
    const args = (difficulty: 'medium', quest: null);
    expect(find.text('4:00'), findsOneWidget);
    final s = h.container.read(mazeControllerProvider(args));
    expect(s.maze.rows, 10);
    // The start sits in the top-left corner region: the cells above and to
    // its left are the maze border.
    final start = s.player;
    expect(s.maze.grid[start.row - 1][start.col], MazeCell.wall);
    expect(s.maze.grid[start.row][start.col - 1], MazeCell.wall);
    await tester.tap(find.byKey(const Key('maze-pad-up')));
    await tester.tap(find.byKey(const Key('maze-pad-left')));
    await tester.pump();
    final after = h.container.read(mazeControllerProvider(args));
    expect(after.player, start);
    expect(after.steps, 0);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/math-maze/play?difficulty=hard&quest=brain-peaks:bp-11:0',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:MATH_MAZE:3:brain-peaks:bp-11:0'));
    await tester.pumpWidget(const SizedBox());
  });
}
