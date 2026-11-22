import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/word_puzzle/word_puzzle_controller.dart';
import 'package:dashden_mobile/game/word_puzzle/word_puzzle_logic.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const WordPuzzleArgs _easy = (difficulty: 'easy', locale: 'en', quest: null);

WordPuzzleController _ctl(RouterHarness h, [WordPuzzleArgs args = _easy]) =>
    h.container.read(wordPuzzleControllerProvider(args).notifier);

WordPuzzleState _state(RouterHarness h, [WordPuzzleArgs args = _easy]) =>
    h.container.read(wordPuzzleControllerProvider(args));

void _select(WordPuzzleController c, WordPosition p) {
  final cells = wordCells(p.word, p.startRow, p.startCol, p.direction);
  c.beginSelection(cells.first);
  c.extendSelection(cells.last);
  c.endSelection();
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
  testWidgets('setup -> find every word -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return _result(4242);
    });
    final h = await pumpRouterApp(tester, location: '/word-puzzle/setup', api: api);
    expect(find.text('Start Easy'), findsOneWidget);
    await tester.tap(find.byKey(const Key('game-start-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));

    expect(api.calls, contains('startGame:WORD_PUZZLE:1'));
    final puzzle = _state(h).puzzle;
    expect(find.text('0/${puzzle.words.length}'), findsOneWidget);
    for (final p in puzzle.positions) {
      _select(_ctl(h), p);
      await tester.pump(const Duration(milliseconds: 50));
    }
    await tester.pump(const Duration(milliseconds: 1600));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('4242'), findsOneWidget);
    expect(sent, {'wordsFound': puzzle.words.length, 'totalWords': puzzle.words.length});
    expect(api.calls.last, endsWith(':${puzzle.words.length}'));
  });

  testWidgets('dragging on the grid selects letters and finds a word', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/word-puzzle/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final puzzle = _state(h).puzzle;
    final p = puzzle.positions.first;
    final cells = wordCells(p.word, p.startRow, p.startCol, p.direction);

    final grid = find.byKey(const Key('wp-grid'));
    final box = tester.getRect(grid);
    final cell = box.width / puzzle.gridSize;
    Offset center(Cell c) => box.topLeft + Offset((c.col + 0.5) * cell, (c.row + 0.5) * cell);

    final gesture = await tester.startGesture(center(cells.first));
    await tester.pump();
    for (final c in cells.skip(1)) {
      await gesture.moveTo(center(c));
      await tester.pump();
    }
    expect(_state(h).selection, cells);
    await gesture.up();
    await tester.pump();
    expect(_state(h).found, contains(p.word));
    expect(find.byKey(const Key('wp-toast')), findsOneWidget);
    expect(find.text('✅ ${p.word}'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1600));
    expect(find.byKey(const Key('wp-toast')), findsNothing);
    // Found cells stay marked.
    expect(_state(h).foundCells, containsAll(cells));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a vertical swipe over the grid selects instead of scrolling the page',
      (tester) async {
    useTallSurface(tester);
    // A short window so the page can scroll.
    tester.view.physicalSize = const Size(600, 700);
    final h = await pumpRouterApp(tester, location: '/word-puzzle/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final puzzle = _state(h).puzzle;
    final box = tester.getRect(find.byKey(const Key('wp-grid')));
    final cell = box.width / puzzle.gridSize;
    Offset center(int row, int col) =>
        box.topLeft + Offset((col + 0.5) * cell, (row + 0.5) * cell);
    final scrollable = tester.state<ScrollableState>(find.byType(Scrollable).first);
    final before = scrollable.position.pixels;

    final gesture = await tester.startGesture(center(0, 0));
    await tester.pump();
    for (var r = 1; r <= 3; r++) {
      await gesture.moveTo(center(r, 0));
      await tester.pump();
    }
    expect(_state(h).selection,
        const [Cell(0, 0), Cell(1, 0), Cell(2, 0), Cell(3, 0)]);
    expect(scrollable.position.pixels, before);
    await gesture.up();
    await tester.pump();
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a wrong selection finds nothing, a repeat warns', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/word-puzzle/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final c = _ctl(h);
    final puzzle = _state(h).puzzle;
    // Three cells in the last row that are not a word.
    c.beginSelection(const Cell(0, 0));
    c.extendSelection(const Cell(0, 2));
    final spelled = _state(h).selection.map((x) => puzzle.grid[x.row][x.col]).join();
    c.endSelection();
    if (!puzzle.words.any((w) => w == spelled || w.split('').reversed.join() == spelled)) {
      expect(_state(h).found, isEmpty);
    }
    final p = puzzle.positions.first;
    _select(c, p);
    expect(_state(h).toast, WordPuzzleToast.found);
    _select(c, p);
    await tester.pump();
    expect(_state(h).toast, WordPuzzleToast.alreadyFound);
    expect(_state(h).found.length, 1);
    expect(find.text('⚠ ${p.word}'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1600));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('running out of time submits the words found so far', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return _result(50);
    });
    final h = await pumpRouterApp(
      tester,
      location: '/word-puzzle/play?difficulty=easy',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    final total = _state(h).puzzle.words.length;
    for (var i = 0; i < 305; i++) {
      await tester.pump(const Duration(seconds: 1));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(sent, {'wordsFound': 0, 'totalWords': total});
    // Nothing found still sends one attempt: the server needs a positive number.
    expect(api.calls.last, endsWith(':1'));
  });

  testWidgets('the Spanish app uses the Spanish list', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/word-puzzle/play?difficulty=easy',
      locale: const Locale('es'),
    );
    await tester.pump(const Duration(milliseconds: 100));
    final words = _state(h, (difficulty: 'easy', locale: 'es', quest: null)).puzzle.words;
    expect(words, isNotEmpty);
    expect(find.textContaining('Palabras'), findsWidgets);
    await tester.pumpWidget(const SizedBox());
  });
}
