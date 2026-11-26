import 'package:dashden_mobile/api/challenge_models.dart';
import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/code_a_bot/bot_controller.dart';
import 'package:dashden_mobile/game/code_a_bot/logic.dart';
import 'package:dashden_mobile/game/hangman/hangman_controller.dart';
import 'package:dashden_mobile/game/math/math_controller.dart';
import 'package:dashden_mobile/game/math_maze/logic.dart';
import 'package:dashden_mobile/game/math_maze/maze_controller.dart';
import 'package:dashden_mobile/game/sudoku/sudoku_controller.dart';
import 'package:dashden_mobile/game/word_puzzle/word_puzzle_controller.dart';
import 'package:dashden_mobile/game/word_puzzle/word_puzzle_logic.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/challenge_fixtures.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

/// Given-content mode (M3): a play route with `challenge=<day>` plays the
/// served content, starts with `challengeContext`, and reports the shared
/// `expectedTotals`.

const _f = Instruction.forward;
const _j = Instruction.jump;

/// Records the extra metrics sent with completeGame.
class _Completion {
  Map<String, dynamic>? extra;

  FakeGameApi api() => FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
        this.extra = extra;
        return serverResult(1234);
      });
}

Future<RouterHarness> _launch(
  WidgetTester tester,
  String path,
  DailyChallengeView? view,
  FakeGameApi api, {
  FakeChallengeApi? challengeApi,
  Locale locale = const Locale('en'),
}) async {
  final h = await pumpRouterApp(
    tester,
    location: path,
    api: api,
    locale: locale,
    challengeApi: challengeApi ?? FakeChallengeApi(view),
  );
  await settleStart(tester);
  return h;
}

String _location(RouterHarness h) => h.router.routerDelegate.currentConfiguration.uri.toString();

void main() {
  testWidgets('code-a-bot plays the served level list in order', (tester) async {
    useTallSurface(tester);
    expect(simulate(getLevel('medium', 3), const [_f, _j, _f, _f]).last.reachedGoal, isTrue);
    expect(simulate(getLevel('medium', 1), const [_f, _j, _f, _f, _f]).last.reachedGoal, isTrue);
    final content = codeABotContentJson()..['levelNumbers'] = [3, 1];
    final view = dailyChallengeView(content);
    final done = _Completion();
    final api = done.api();
    final h = await _launch(tester, '/code-a-bot/play?difficulty=medium&challenge=$kTestDay', view, api);
    expect(api.calls, contains('startGame:CODE_A_BOT:2:challenge=$kTestDay'));
    final BotChallengeArgs key = (
      args: (difficulty: 'medium', quest: null),
      challenge: (day: kTestDay, content: view.content as CodeABotContent),
    );
    BotState state() => h.container.read(botChallengeControllerProvider(key));
    expect(state().level.levelNumber, 3);
    expect(find.text('Level 1/2'), findsOneWidget);
    for (final program in const [
      [_f, _j, _f, _f],
      [_f, _j, _f, _f, _f],
    ]) {
      for (final i in program) {
        await tester.tap(find.byKey(Key('bot-add-${i.name}')));
        await tester.pump();
      }
      await tester.tap(find.byKey(const Key('bot-run')));
      await tester.pump();
      await pumpFor(tester, Duration(milliseconds: 400 * (program.length + 1) + 100));
      expect(state().phase, BotPhase.success);
      await tester.tap(find.byKey(const Key('bot-next')));
      await tester.pump(const Duration(milliseconds: 100));
      if (program.length == 4) {
        expect(state().level.levelNumber, 1);
        expect(find.text('Level 2/2'), findsOneWidget);
      }
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(done.extra, {'correctAnswers': 2, 'totalQuestions': 2});
  });

  testWidgets('sudoku plays the served puzzle and reports its blanks; play again replays it',
      (tester) async {
    useTallSurface(tester);
    final view = dailyChallengeView(sudokuContentJson());
    final content = view.content as SudokuContent;
    final blanks = content.puzzle.expand((r) => r).where((v) => v == null).length;
    final done = _Completion();
    final api = done.api();
    final h = await _launch(tester, '/sudoku/play?difficulty=medium&challenge=$kTestDay', view, api);
    expect(api.calls, contains('startGame:SUDOKU:2:challenge=$kTestDay'));
    final SudokuChallengeArgs key = (args: (difficulty: 'medium', quest: null), challenge: (day: kTestDay, content: content));
    SudokuState state() => h.container.read(sudokuChallengeControllerProvider(key));
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        expect(state().grid[r][c], content.puzzle[r][c] ?? 0);
      }
    }
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (content.puzzle[r][c] != null) continue;
        await tester.tap(find.byKey(Key('sudoku-cell-$r-$c')));
        await tester.pump();
        await tester.tap(find.byKey(Key('sudoku-num-${content.solution[r][c]}')));
        await tester.pump();
      }
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(done.extra, {'correctAnswers': blanks, 'totalQuestions': blanks});

    await tester.tap(find.byKey(const Key('result-play-again')));
    await settleStart(tester);
    expect(api.calls.where((c) => c == 'startGame:SUDOKU:2:challenge=$kTestDay'), hasLength(2));
    expect(state().grid[0], [for (final v in content.puzzle[0]) v ?? 0]);
  });

  testWidgets('math plays the served questions in order and reports their count', (tester) async {
    useTallSurface(tester);
    final view = dailyChallengeView(mathContentJson());
    final done = _Completion();
    final api = done.api();
    final h = await _launch(tester, '/math-challenge/play?difficulty=medium&challenge=$kTestDay', view, api);
    expect(api.calls, contains('startGame:MATH_CHALLENGE:2:challenge=$kTestDay'));
    final MathChallengeArgs key = (
      args: (difficulty: 'medium', quest: null),
      challenge: (day: kTestDay, content: view.content as MathChallengeContent),
    );
    for (var n = 1; n <= 15; n++) {
      final s = h.container.read(mathChallengeControllerProvider(key));
      expect(s.question.question, '$n + 2 = ?');
      expect(find.text('$n / 15'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('math-input')), '${n + 2}');
      await tester.pump();
      await tester.tap(find.byKey(const Key('math-submit')));
      await tester.pump(const Duration(milliseconds: 50));
      await tester.pump(kMathFeedbackDelay + const Duration(milliseconds: 100));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(done.extra, {'correctAnswers': 15, 'totalQuestions': 15});
  });

  testWidgets('math maze plays the served maze and reports one question per gate', (tester) async {
    useTallSurface(tester);
    final view = dailyChallengeView(mazeContentJson());
    final content = view.content as MathMazeContent;
    final done = _Completion();
    final api = done.api();
    final h = await _launch(tester, '/math-maze/play?difficulty=medium&challenge=$kTestDay', view, api);
    expect(api.calls, contains('startGame:MATH_MAZE:2:challenge=$kTestDay'));
    final MazeChallengeArgs key = (args: (difficulty: 'medium', quest: null), challenge: (day: kTestDay, content: content));
    final provider = mazeChallengeControllerProvider(key);
    final maze = h.container.read(provider).maze;
    expect([for (final row in maze.grid) [for (final c in row) c.name]], content.grid);
    expect(maze.gates.map((g) => g.equation.answer), content.gates.map((g) => g.answer));
    // Walk to the exit, answering every gate on the way.
    var guard = 0;
    while (h.container.read(provider).end == null && guard++ < 400) {
      final s = h.container.read(provider);
      final ctrl = h.container.read(provider.notifier);
      if (s.gatePrompt) {
        if (s.feedbackCorrect == null) ctrl.submitGate(s.activeGate!.equation.answer);
        await pumpFor(tester, const Duration(milliseconds: 1100));
        continue;
      }
      final next = _step(s.maze, s.player);
      ctrl.move(next.row - s.player.row, next.col - s.player.col);
      await tester.pump(const Duration(milliseconds: 20));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(h.container.read(provider).end, MazeEnd.exitReached);
    expect(done.extra?['totalQuestions'], content.gates.length);
  });

  testWidgets('word puzzle plays the variant of the app language', (tester) async {
    useTallSurface(tester);
    final view = dailyChallengeView(wordPuzzleContentJson());
    final content = view.content as WordPuzzleContent;
    final done = _Completion();
    final api = done.api();
    final h = await _launch(tester, '/word-puzzle/play?difficulty=medium&challenge=$kTestDay', view, api,
        locale: const Locale('es'));
    expect(api.calls, contains('startGame:WORD_PUZZLE:2:challenge=$kTestDay'));
    final WordPuzzleChallengeArgs key = (
      args: (difficulty: 'medium', locale: 'es', quest: null),
      challenge: (day: kTestDay, content: content),
    );
    final provider = wordPuzzleChallengeControllerProvider(key);
    final puzzle = h.container.read(provider).puzzle;
    expect(puzzle.words, content.byLanguage['es']!.words);
    expect(puzzle.grid, content.byLanguage['es']!.grid);
    for (final p in puzzle.positions) {
      final cells = wordCells(p.word, p.startRow, p.startCol, p.direction);
      final ctrl = h.container.read(provider.notifier)
        ..beginSelection(cells.first)
        ..extendSelection(cells.last);
      ctrl.endSelection();
      await tester.pump(const Duration(milliseconds: 50));
    }
    await tester.pump(const Duration(milliseconds: 1600));
    await tester.pump(const Duration(milliseconds: 100));
    final total = content.byLanguage['es']!.words.length;
    expect(done.extra, {'wordsFound': total, 'totalWords': total});
  });

  testWidgets('hangman plays the words of the app language', (tester) async {
    useTallSurface(tester);
    final view = dailyChallengeView(hangmanContentJson());
    final done = _Completion();
    final api = done.api();
    final h = await _launch(tester, '/hangman/play?difficulty=medium&challenge=$kTestDay', view, api,
        locale: const Locale('es'));
    expect(api.calls, contains('startGame:HANGMAN:2:challenge=$kTestDay'));
    final HangmanChallengeArgs key = (
      args: (difficulty: 'medium', lang: 'es', quest: null),
      challenge: (day: kTestDay, content: view.content as HangmanContent),
    );
    final provider = hangmanChallengeControllerProvider(key);
    expect(h.container.read(provider).words.map((w) => w.word), ['GATO', 'PERRO', 'CASA', 'LUNA', 'MESA']);
    for (var r = 0; r < 5; r++) {
      for (final l in h.container.read(provider).word.word.split('').toSet()) {
        await tester.tap(find.byKey(Key('hm-key-$l')));
        await tester.pump(const Duration(milliseconds: 50));
      }
      await tester.tap(find.byKey(const Key('hm-next')));
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(done.extra, {'correctAnswers': 5, 'totalQuestions': 5});
  });

  group('unusable challenge', () {
    testWidgets('another game, another day or no challenge goes to the hub before any start',
        (tester) async {
      useTallSurface(tester);
      for (final view in [
        dailyChallengeView(hangmanContentJson()),
        dailyChallengeView(sudokuContentJson(), day: '2026-11-25'),
        null,
      ]) {
        final api = FakeGameApi();
        final h = await _launch(tester, '/sudoku/play?difficulty=medium&challenge=$kTestDay', view, api);
        await tester.pump(const Duration(milliseconds: 300));
        expect(_location(h), '/?challengeFailed=1');
        expect(api.calls.where((c) => c.startsWith('startGame')), isEmpty);
      }
    });

    testWidgets('a rejected start goes to the hub', (tester) async {
      useTallSurface(tester);
      final api = FakeGameApi(onStartGame: (t, d, q) async => throw GameApiException('Challenge rejected'));
      final h = await _launch(
          tester, '/math-challenge/play?difficulty=medium&challenge=$kTestDay', dailyChallengeView(mathContentJson()), api);
      await tester.pump(const Duration(milliseconds: 300));
      expect(api.calls, contains('startGame:MATH_CHALLENGE:2:challenge=$kTestDay'));
      expect(_location(h), '/?challengeFailed=1');
    });
  });

  testWidgets('without the challenge param nothing is loaded and no day is sent', (tester) async {
    useTallSurface(tester);
    for (final path in [
      '/code-a-bot/play?difficulty=medium',
      '/sudoku/play?difficulty=medium',
      '/math-challenge/play?difficulty=medium',
      '/math-maze/play?difficulty=medium',
      '/word-puzzle/play?difficulty=medium',
      '/hangman/play?difficulty=medium',
      '/sudoku/play?difficulty=medium&challenge=not-a-day',
      '/sudoku/play?difficulty=medium&challenge=$kTestDay&quest=brain-peaks:bp-01:0',
    ]) {
      final challengeApi = FakeChallengeApi(dailyChallengeView(sudokuContentJson()));
      final api = FakeGameApi();
      await _launch(tester, path, null, api, challengeApi: challengeApi);
      // The hub card (mounted first by the harness) reads the challenge with its top 5; the game never does.
      expect(challengeApi.dailyCalls, challengeApi.leaderboardCalls.length, reason: path);
      final starts = api.calls.where((c) => c.startsWith('startGame')).toList();
      expect(starts, hasLength(1), reason: path);
      expect(starts.single, isNot(contains('challenge=')), reason: path);
      await tester.pumpWidget(const SizedBox());
    }
  });
}

/// Next cell from [from] on a shortest walkable route to the exit.
MazePos _step(MazeData maze, MazePos from) {
  final prev = <int, MazePos?>{from.key: null};
  final queue = [from];
  var head = 0;
  while (head < queue.length) {
    final cur = queue[head++];
    if (cur == maze.exit) break;
    for (final d in const [MazePos(-1, 0), MazePos(1, 0), MazePos(0, -1), MazePos(0, 1)]) {
      final n = MazePos(cur.row + d.row, cur.col + d.col);
      if (n.row < 0 || n.row >= maze.rows || n.col < 0 || n.col >= maze.cols) continue;
      if (prev.containsKey(n.key) || maze.grid[n.row][n.col] == MazeCell.wall) continue;
      prev[n.key] = cur;
      queue.add(n);
    }
  }
  var at = maze.exit;
  while (prev[at.key] != from) {
    at = prev[at.key]!;
  }
  return at;
}
