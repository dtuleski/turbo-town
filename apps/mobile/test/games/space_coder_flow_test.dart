import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/space_coder/logic.dart';
import 'package:dashden_mobile/game/space_coder/space_coder_controller.dart';
import 'package:dashden_mobile/l10n/gen/app_localizations_en.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/lcg_random.dart';
import '../helpers/pump_router.dart';

final AppLocalizationsEn _en = AppLocalizationsEn();
const SpaceCoderArgs _easy = (difficulty: 'easy', quest: null);
const _f = CommandType.forward;
const _r = CommandType.turnRight;
const _l = CommandType.turnLeft;

/// A working program per easy level (flat commands only).
const List<List<CommandType>> _easySolutions = [
  [_f, _f, _f, _f, _f],
  [_f, _f, _f, _r, _f, _f],
  [_f, _f, _f, _f, _r, _f, _f, _r, _f, _f, _f, _f],
  [_f, _f, _f, _f, _r, _f, _f],
  [_f, _f, _f, _f, _r, _f, _f, _r, _f, _f, _f, _f, _l, _f, _f],
];

SpaceCoderState _state(RouterHarness h, [SpaceCoderArgs args = _easy]) =>
    h.container.read(spaceCoderControllerProvider(args));

Future<void> _type(WidgetTester tester, List<CommandType> program) async {
  for (final t in program) {
    await tester.tap(find.byKey(Key('space-add-${t.id}')));
    await tester.pump();
  }
}

Future<void> _run(WidgetTester tester, int steps) async {
  await tester.tap(find.byKey(const Key('space-run')));
  await tester.pump();
  await pumpFor(tester, Duration(milliseconds: 350 * (steps + 1) + 100));
}

void main() {
  test('the programs used here really solve the easy levels', () {
    for (var n = 1; n <= 5; n++) {
      final level = kSpaceLevels['easy']![n - 1];
      final ids = CommandIds();
      final program = [for (final t in _easySolutions[n - 1]) createCommand(t, ids.next())];
      expect(countAllLines(program), lessThanOrEqualTo(level.maxLines), reason: 'level $n');
      expect(executeProgram(level, program).last.reachedGoal, isTrue, reason: 'level $n');
    }
  });

  testWidgets('setup -> solve the 5 easy levels -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    int? sentAttempts;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      sentAttempts = attempts;
      return serverResult(8800);
    });
    final h = await pumpRouterApp(tester, location: '/scratch-coding/setup', api: api);
    expect(find.textContaining('Space Coder'), findsWidgets);
    await chooseAndStart(tester, ['difficulty-easy']);
    expect(api.calls, contains('startGame:SCRATCH_CODING:1'));
    expect(find.text('Level 1/5'), findsOneWidget);
    expect(find.byKey(const Key('space-add-LOOP')), findsNothing, reason: 'no loops on easy');

    for (var n = 1; n <= 5; n++) {
      expect(_state(h).level.levelNumber, n);
      final program = _easySolutions[n - 1];
      await _type(tester, program);
      expect(_state(h).lineCount, program.length);
      await _run(tester, program.length);
      expect(_state(h).phase, SpacePhase.success, reason: 'level $n');
      expect(find.byKey(const Key('space-success')), findsOneWidget);
      expect(_state(h).charPos, _state(h).level.goal);
      await tester.tap(find.byKey(const Key('space-next')));
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('8800'), findsOneWidget);
    // 45 lines for 46 optimal: efficiency capped at 1, so 5 of 5.
    expect(sent, {'correctAnswers': 5, 'totalQuestions': 5});
    expect(sentAttempts, 5, reason: 'one run per level');
  });

  testWidgets('a failed run says why; try again empties the program; End Game submits progress',
      (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(1200);
    });
    final h =
        await pumpRouterApp(tester, location: '/scratch-coding/play?difficulty=easy', api: api);
    await settleStart(tester);

    // Not far enough.
    await _type(tester, [_f, _f]);
    await _run(tester, 2);
    expect(_state(h).phase, SpacePhase.fail);
    expect(find.text(_en.scratchCoding_game_didntReachGoal), findsOneWidget);
    await tester.tap(find.byKey(const Key('space-retry')));
    await tester.pump();
    expect(_state(h).program, isEmpty);
    expect(_state(h).charPos, _state(h).level.start);

    // Off the grid.
    await _type(tester, [_l, _f]);
    await _run(tester, 2);
    expect(find.text(_en.scratchCoding_game_offGrid), findsOneWidget);

    await tester.tap(find.byKey(const Key('space-end')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(sent, {'correctAnswers': 0, 'totalQuestions': 5});
    expect(api.calls.last, endsWith(':2'), reason: 'two runs');
  });

  testWidgets('lines can be removed, cleared and are capped at the level limit', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/scratch-coding/play?difficulty=easy');
    await settleStart(tester);
    expect(find.byKey(const Key('space-empty')), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byKey(const Key('space-run'))).onPressed, isNull);
    await _type(tester, [_f, _l, _r]);
    expect(find.text('3/9'), findsWidgets);
    await tester.tap(find.byKey(const Key('space-remove-1')));
    await tester.pump();
    expect(_state(h).program.map((c) => c.type), [_f, _r]);
    await _type(tester, List.filled(10, _f));
    expect(_state(h).lineCount, 9, reason: 'easy 1 allows 9 lines');
    expect(find.byKey(const Key('space-max-lines')), findsOneWidget);
    await tester.tap(find.byKey(const Key('space-clear')));
    await tester.pump();
    expect(_state(h).program, isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('tapping a line moves the insertion point there', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/scratch-coding/play?difficulty=easy');
    await settleStart(tester);
    await _type(tester, [_f, _f]);
    await tester.tap(find.byKey(const Key('space-line-0')));
    await tester.pump();
    expect(_state(h).cursor, const InsertionCursor(index: 1));
    expect(find.byKey(const Key('space-cursor-1')), findsOneWidget);
    await _type(tester, [_r]);
    expect(programToText(_state(h).program), ['forward()', 'turn-right()', 'forward()']);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a command dragged onto a line goes in after that line', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/scratch-coding/play?difficulty=easy');
    await settleStart(tester);
    await _type(tester, [_f, _f, _f]);
    final from = tester.getCenter(find.byKey(const Key('space-add-TURN_LEFT')));
    final to = tester.getCenter(find.byKey(const Key('space-line-0')));
    final gesture = await tester.startGesture(from);
    await tester.pump(const Duration(milliseconds: 300));
    await gesture.moveTo(to);
    await tester.pump();
    await gesture.up();
    await tester.pump();
    expect(
        programToText(_state(h).program), ['forward()', 'turn-left()', 'forward()', 'forward()']);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('medium: a loop solves level 1 in few lines and its count can be edited',
      (tester) async {
    useTallSurface(tester);
    const args = (difficulty: 'medium', quest: null);
    final h = await pumpRouterApp(tester, location: '/scratch-coding/play?difficulty=medium');
    await settleStart(tester);
    expect(find.text('Level 1/5'), findsOneWidget);
    await _type(tester, [CommandType.loop, _f, _f, _r, _f, _f, _l]);
    expect(programToText(_state(h, args).program).first, 'loop(2)');
    final loopId = _state(h, args).program.first.id;
    await tester.tap(find.bySemanticsLabel('Loop count +'));
    await tester.pump();
    expect(_state(h, args).program.first.parameter, 3);
    expect(find.byKey(Key('space-loop-$loopId')), findsOneWidget);
    expect(_state(h, args).lineCount, 8);
    await _run(tester, 18);
    expect(_state(h, args).phase, SpacePhase.success);
    expect(find.text(_en.spaceCoder_efficiency_perfectCode), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('hard: obstacles come from the random source; while(not-at-goal) and if run',
      (tester) async {
    useTallSurface(tester);
    const args = (difficulty: 'hard', quest: null);
    final h = await pumpRouterApp(
      tester,
      location: '/scratch-coding/play?difficulty=hard',
      overrides: [spaceCoderRandomProvider.overrideWithValue(LcgRandom(42))],
    );
    await settleStart(tester);
    final grid = _state(h, args).level.grid;
    expect(grid.expand((r) => r).where((c) => c == CellType.obstacle), hasLength(10));
    expect(find.byKey(const Key('space-add-JUMP')), findsOneWidget);
    expect(find.byKey(const Key('space-add-VAR_NUM_DECL')), findsOneWidget);

    await _type(tester, [CommandType.whileCmd, _f]);
    expect(programToText(_state(h, args).program),
        ['while(not-at-goal())', '  forward()', 'end-while']);
    final whileId = _state(h, args).program.first.id;
    expect(find.byKey(Key('space-sensor-$whileId')), findsOneWidget);
    // Switch the condition to a comparison and back.
    h.container
        .read(spaceCoderControllerProvider(args).notifier)
        .setCondition(whileId, const ComparisonCondition(Variable.num, ComparisonOperator.lt, 0));
    await tester.pump();
    expect(find.byKey(Key('space-op-$whileId')), findsOneWidget);
    await _run(tester, 1);
    expect(find.text(_en.spaceCoder_errors_undefinedVarNum), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context; a paywall answer shows the neutral page',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/scratch-coding/play?difficulty=medium&quest=brain-peaks:bp-10:0',
      api: api,
    );
    await settleStart(tester);
    expect(api.calls, contains('startGame:SCRATCH_CODING:2:brain-peaks:bp-10:0'));
    await tester.pumpWidget(const SizedBox());

    final paid = FakeGameApi(onStartGame: (theme, difficulty, quest) async {
      throw GameApiException('This game requires a paid subscription', code: 'AUTHZ_TIER_REQUIRED');
    });
    await pumpRouterApp(tester, location: '/scratch-coding/play?difficulty=easy', api: paid);
    await settleStart(tester);
    expect(find.text('Not available in the app yet'), findsWidgets);
    expect(find.byKey(const Key('space-editor')), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });

  for (final size in const [Size(320, 568), Size(375, 667)]) {
    for (final lang in const ['en', 'es', 'pt']) {
      for (final d in const ['easy', 'hard']) {
        testWidgets('the $d board fits ${size.width.toInt()}x${size.height.toInt()} in $lang',
            (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.reset);
          final h = await pumpRouterApp(tester,
              location: '/scratch-coding/play?difficulty=$d', locale: Locale(lang));
          await settleStart(tester);
          h.container
              .read(spaceCoderControllerProvider((difficulty: d, quest: null)).notifier)
              .insert(d == 'hard' ? CommandType.ifCmd : CommandType.forward);
          await tester.pump();
          expect(find.byKey(const Key('space-editor')), findsOneWidget);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox());
        });
      }
    }
  }
}
