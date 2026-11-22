import 'package:dashden_mobile/game/code_a_bot/bot_controller.dart';
import 'package:dashden_mobile/game/code_a_bot/logic.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const _f = Instruction.forward;
const _l = Instruction.turnLeft;
const _r = Instruction.turnRight;

const BotArgs _easy = (difficulty: 'easy', quest: null);

/// One working program per easy level.
const List<List<Instruction>> _easySolutions = [
  [_f, _f, _f, _f],
  [_f, _f, _f, _f],
  [_f, _f, _f, _f, _r, _f, _f],
  [_f, _f, _f, _f, _r, _f, _f, _f, _f],
  [_r, _f, _f, _l, _f, _f],
];

BotState _state(RouterHarness h, [BotArgs args = _easy]) =>
    h.container.read(botControllerProvider(args));

Future<void> _build(WidgetTester tester, List<Instruction> program) async {
  for (final i in program) {
    await tester.tap(find.byKey(Key('bot-add-${i.name}')));
    await tester.pump();
  }
}

Future<void> _run(WidgetTester tester, int steps) async {
  await tester.tap(find.byKey(const Key('bot-run')));
  await tester.pump();
  await pumpFor(tester, Duration(milliseconds: 400 * (steps + 1) + 100));
}

void main() {
  test('the programs used here really solve their levels', () {
    for (var n = 1; n <= 5; n++) {
      final level = getLevel('easy', n);
      final prog = _easySolutions[n - 1];
      expect(prog.length, lessThanOrEqualTo(level.maxInstructions), reason: 'level $n');
      expect(simulate(level, prog).last.reachedGoal, isTrue, reason: 'level $n');
    }
  });

  testWidgets('setup -> solve the 5 easy levels -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(9100);
    });
    final h = await pumpRouterApp(tester, location: '/code-a-bot/setup', api: api);
    await chooseAndStart(tester, ['difficulty-easy']);
    expect(api.calls, contains('startGame:CODE_A_BOT:1'));
    expect(find.text('Level 1/5'), findsOneWidget);

    for (var n = 1; n <= 5; n++) {
      expect(_state(h).level.levelNumber, n);
      final prog = _easySolutions[n - 1];
      await _build(tester, prog);
      expect(_state(h).program, prog);
      await _run(tester, prog.length);
      expect(_state(h).phase, BotPhase.success);
      expect(find.byKey(const Key('bot-success')), findsOneWidget);
      expect(_state(h).botPos, _state(h).level.goal);
      await tester.tap(find.byKey(const Key('bot-next')));
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('9100'), findsOneWidget);
    expect(sent, {'correctAnswers': 5, 'totalQuestions': 5});
    expect(api.calls.last, endsWith(':5'), reason: 'one run per level');
  });

  testWidgets('a failed run can be retried and every run counts', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/code-a-bot/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    // Not far enough.
    await _build(tester, [_f, _f]);
    await _run(tester, 2);
    expect(_state(h).phase, BotPhase.fail);
    expect(find.text("Bot didn't reach the power cell 🤔"), findsOneWidget);
    expect(_state(h).totalAttempts, 1);
    await tester.tap(find.byKey(const Key('bot-retry')));
    await tester.pump();
    expect(_state(h).phase, BotPhase.building);
    expect(_state(h).program, isEmpty);
    expect(_state(h).botPos, _state(h).level.start);
    // Walking off the board crashes.
    await _build(tester, [_l, _f]);
    await _run(tester, 2);
    expect(find.text('Bot crashed! 💥'), findsOneWidget);
    expect(_state(h).totalAttempts, 2);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('blocks can be removed, cleared and are capped at the level limit', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/code-a-bot/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('0/6 blocks'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byKey(const Key('bot-run'))).onPressed, isNull);
    await _build(tester, [_f, _l, _r]);
    await tester.tap(find.byKey(const Key('bot-step-1')));
    await tester.pump();
    expect(_state(h).program, [_f, _r]);
    await _build(tester, [_f, _f, _f, _f, _f, _f]);
    expect(_state(h).program, hasLength(6), reason: 'level 1 allows 6 blocks');
    expect(find.text('6/6 blocks'), findsOneWidget);
    await tester.tap(find.byKey(const Key('bot-clear')));
    await tester.pump();
    expect(_state(h).program, isEmpty);
    await tester.tap(find.byKey(const Key('bot-hint')));
    await tester.pump();
    expect(find.text('💡 Go straight up!'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('medium: a crack swallows the bot, a jump clears it', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/code-a-bot/play?difficulty=medium');
    await tester.pump(const Duration(milliseconds: 100));
    const args = (difficulty: 'medium', quest: null);
    expect(_state(h, args).level.rows, 6);
    await _build(tester, [_f, _f]);
    await _run(tester, 2);
    expect(find.text('Bot fell into a crack! 🕳'), findsOneWidget);
    await tester.tap(find.byKey(const Key('bot-retry')));
    await tester.pump();
    await _build(tester, [_f, Instruction.jump, _f, _f, _f]);
    await _run(tester, 5);
    expect(_state(h, args).phase, BotPhase.success);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/code-a-bot/play?difficulty=hard&quest=brain-peaks:bp-10:0',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:CODE_A_BOT:3:brain-peaks:bp-10:0'));
    await tester.pumpWidget(const SizedBox());
  });
}
