import 'package:dashden_mobile/game/jigsaw/jigsaw_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const JigsawArgs _easy = (difficulty: 'easy', image: 'ocean', quest: null);

JigsawState _state(RouterHarness h, [JigsawArgs args = _easy]) =>
    h.container.read(jigsawControllerProvider(args));

Future<void> _tapPlace(WidgetTester tester, int id, int r, int c) async {
  await tester.tap(find.byKey(Key('jigsaw-piece-$id')));
  await tester.pump();
  await tester.tap(find.byKey(Key('jigsaw-cell-$r-$c')));
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  testWidgets('setup -> place every piece -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(6150);
    });
    final h = await pumpRouterApp(tester, location: '/jigsaw-puzzle/setup', api: api);
    expect(find.text('Select Difficulty & Image'), findsOneWidget);
    await tester.tap(find.byKey(const Key('difficulty-easy')));
    await tester.pump();
    // Still disabled until a picture is chosen too.
    expect(tester.widget<FilledButton>(find.byKey(const Key('game-start-button'))).onPressed, isNull);
    await chooseAndStart(tester, ['image-ocean']);
    expect(api.calls, contains('startGame:JIGSAW_PUZZLE:1'));
    expect(_state(h).pieces, hasLength(9));

    for (final p in List.of(_state(h).pieces)) {
      await _tapPlace(tester, p.id, p.row, p.col);
    }
    expect(_state(h).moves, 9);
    expect(_state(h).tray, isEmpty);
    await pumpFor(tester, const Duration(milliseconds: 500));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('6150'), findsOneWidget);
    expect(sent, {'correctAnswers': 9, 'totalQuestions': 9});
    expect(api.calls.last, endsWith(':9'));
  });

  testWidgets('a wrong cell rejects the piece, flashes red and still counts as a move',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/jigsaw-puzzle/play?difficulty=easy&image=ocean');
    await tester.pump(const Duration(milliseconds: 100));
    final piece = _state(h).pieces.first;
    final wrongRow = (piece.row + 1) % 3;
    await _tapPlace(tester, piece.id, wrongRow, piece.col);
    expect(_state(h).moves, 1);
    expect(_state(h).wrongCell, '$wrongRow,${piece.col}');
    expect(_state(h).tray, hasLength(9), reason: 'the piece stays in the tray');
    expect(_state(h).selectedId, isNull);
    await pumpFor(tester, const Duration(milliseconds: 700));
    expect(_state(h).wrongCell, isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('tapping a selected piece again deselects it; a taken cell ignores a drop',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/jigsaw-puzzle/play?difficulty=easy&image=ocean');
    await tester.pump(const Duration(milliseconds: 100));
    final a = _state(h).pieces[0];
    final b = _state(h).pieces[1];
    await tester.tap(find.byKey(Key('jigsaw-piece-${a.id}')));
    await tester.pump();
    expect(_state(h).selectedId, a.id);
    expect(find.text('Piece selected. Tap the cell where it belongs'), findsOneWidget);
    await tester.tap(find.byKey(Key('jigsaw-piece-${a.id}')));
    await tester.pump();
    expect(_state(h).selectedId, isNull);

    await _tapPlace(tester, a.id, a.row, a.col);
    expect(_state(h).pieceAt(a.row, a.col)?.id, a.id);
    // Cell already taken: nothing happens and no move is counted.
    await _tapPlace(tester, b.id, a.row, a.col);
    expect(_state(h).moves, 1);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a piece can be dragged onto its cell', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/jigsaw-puzzle/play?difficulty=easy&image=ocean');
    await tester.pump(const Duration(milliseconds: 100));
    final piece = _state(h).pieces.first;
    final from = tester.getCenter(find.byKey(Key('jigsaw-piece-${piece.id}')));
    final to = tester.getCenter(find.byKey(Key('jigsaw-cell-${piece.row}-${piece.col}')));
    final gesture = await tester.startGesture(from);
    await tester.pump(const Duration(milliseconds: 300));
    await gesture.moveTo(to);
    await tester.pump();
    await gesture.up();
    await tester.pump();
    expect(_state(h).pieceAt(piece.row, piece.col)?.id, piece.id);
    expect(_state(h).moves, 1);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the reference picture can be hidden', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/jigsaw-puzzle/play?difficulty=medium&image=space');
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('jigsaw-reference')), findsOneWidget);
    await tester.tap(find.byKey(const Key('jigsaw-reference-toggle')));
    await tester.pump();
    expect(find.byKey(const Key('jigsaw-reference')), findsNothing);
    expect(find.text('Show picture'), findsOneWidget);
    // Medium is a 4x4 board.
    expect(find.byKey(const Key('jigsaw-cell-3-3')), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/jigsaw-puzzle/play?difficulty=hard&image=nope&quest=brain-peaks:bp-06:0',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:JIGSAW_PUZZLE:3:brain-peaks:bp-06:0'));
    await tester.pumpWidget(const SizedBox());
  });
}
