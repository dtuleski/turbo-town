import 'dart:math';

import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/game_registry.dart';
import 'package:dashden_mobile/game/mini_golf/data.dart';
import 'package:dashden_mobile/game/mini_golf/golf_controller.dart';
import 'package:dashden_mobile/game/mini_golf/physics.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const GolfArgs _easy = (difficulty: 'easy', quest: null);

GolfState _state(RouterHarness h) => h.container.read(golfControllerProvider(_easy));
GolfController _ctrl(RouterHarness h) => h.container.read(golfControllerProvider(_easy).notifier);

/// Putts with a real drag: starts on the ball and pulls away from [target].
/// [power] is the shot speed (the drag is 10 field units per unit of power).
Future<void> _putt(WidgetTester tester, RouterHarness h, Vec2 target, double power) async {
  final field = tester.getRect(find.byKey(const Key('golf-field')));
  final k = field.width / kGolfFieldSize;
  final ball = _state(h).ball.pos;
  final dir = (target - ball).normalized();
  final start = field.topLeft + Offset(ball.x * k, ball.y * k);
  final pull = Offset(-dir.x * power * 10 * k, -dir.y * power * 10 * k);
  final g = await tester.startGesture(start);
  await g.moveBy(pull * 0.5);
  await tester.pump(const Duration(milliseconds: 16));
  await g.moveBy(pull * 0.5);
  await tester.pump(const Duration(milliseconds: 16));
  await g.up();
  await tester.pump(const Duration(milliseconds: 16));
}

/// Lets the ball roll until it stops, in 100 ms frames (6 physics steps each).
Future<void> _settle(WidgetTester tester, RouterHarness h) async {
  for (var i = 0; i < 400 && _state(h).phase == GolfPhase.rolling; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  test('the registry marks Mini Golf playable and paid', () {
    final e = gameById('mini-golf')!;
    expect(e.implemented, isTrue);
    expect(e.isPaid, isTrue);
    expect(e.category, GameCategory.other);
  });

  testWidgets('setup shows the courses and how to play', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/mini-golf/setup');
    expect(find.text('Choose Your Course'), findsOneWidget);
    expect(find.text('How to Play'), findsOneWidget);
    expect(find.text('1. Drag from the ball to aim your shot'), findsOneWidget);
    expect(find.text('Select a course'), findsOneWidget);
    await tester.tap(find.byKey(const Key('difficulty-hard')));
    await tester.pump();
    expect(find.text('Tee Off'), findsOneWidget);
  });

  testWidgets('setup -> putt every hole with real drags -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(3030);
    });
    final h = await pumpRouterApp(tester, location: '/mini-golf/setup', api: api);
    await chooseAndStart(tester, ['difficulty-easy']);
    expect(api.calls, contains('startGame:MINI_GOLF:1'));
    expect(find.text('Hole 1/3'), findsOneWidget);
    expect(find.byKey(const Key('golf-hole-name')), findsOneWidget);
    expect(find.text('Straight Shot'), findsOneWidget);
    expect(find.byKey(const Key('golf-wind')), findsOneWidget);
    expect(find.byKey(const Key('golf-hint')), findsOneWidget);

    var holesSunk = 0;
    for (var guard = 0; guard < 60 && !_state(h).finished; guard++) {
      final before = _state(h).holeIndex;
      final cup = _ctrl(h).fieldHole.cup;
      final ball = _state(h).ball.pos;
      await _putt(tester, h, cup, min(14, 3 + ball.distanceTo(cup) / 40));
      if (_state(h).phase == GolfPhase.rolling) {
        await _settle(tester, h);
      }
      if (_state(h).phase == GolfPhase.sunk) {
        holesSunk++;
        expect(find.byKey(const Key('golf-sunk')), findsOneWidget);
        // Wait out the "hole sunk" pause.
        await pumpFor(tester, kHoleSunkDelay + const Duration(milliseconds: 300));
      } else if (_state(h).holeIndex == before) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }
    expect(holesSunk, greaterThanOrEqualTo(1), reason: 'the straight shot is a gimme');
    await tester.pump(const Duration(milliseconds: 300));
    expect(_state(h).finished, isTrue);
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('3030'), findsOneWidget);

    final course = _ctrl(h).course;
    final total = _state(h).totalStrokes;
    final expectedAccuracy = golfAccuracyPercent(
      totalStrokes: total,
      totalPar: course.totalPar,
      holes: course.holes.length,
      maxStrokesPerHole: 8,
    );
    expect(sent, {'correctAnswers': expectedAccuracy, 'totalQuestions': 100});
    expect(api.calls.last, endsWith(':$total'), reason: 'attempts = strokes');
    expect(_state(h).holeStrokes, hasLength(3));
  });

  testWidgets('a short or off-ball drag is not a shot; a real one is', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/mini-golf/play?difficulty=easy');
    await settleStart(tester);
    final field = tester.getRect(find.byKey(const Key('golf-field')));
    final k = field.width / kGolfFieldSize;
    final ball = _state(h).ball.pos;
    final onBall = field.topLeft + Offset(ball.x * k, ball.y * k);

    // Starts far from the ball: nothing.
    final far = await tester.startGesture(field.topLeft + Offset(520 * k, 520 * k));
    await far.moveBy(Offset(-60 * k, 0));
    await far.up();
    await tester.pump(const Duration(milliseconds: 50));
    expect(_state(h).currentStrokes, 0);

    // Starts on the ball but is only 8 units long: nothing.
    final short = await tester.startGesture(onBall);
    await short.moveBy(Offset(-8 * k, 0));
    await tester.pump(const Duration(milliseconds: 16));
    await short.up();
    await tester.pump(const Duration(milliseconds: 50));
    expect(_state(h).currentStrokes, 0);
    expect(_state(h).phase, GolfPhase.aiming);

    // While dragging, the power hint shows.
    final drag = await tester.startGesture(onBall);
    await drag.moveBy(Offset(-40 * k, 0));
    await tester.pump(const Duration(milliseconds: 16));
    await drag.moveBy(Offset(-40 * k, 0));
    await tester.pump(const Duration(milliseconds: 16));
    expect(find.text('Pull back farther for more power'), findsOneWidget);
    await drag.up();
    await tester.pump(const Duration(milliseconds: 16));
    expect(_state(h).currentStrokes, 1);
    expect(_state(h).phase, GolfPhase.rolling);
    expect(find.text('1/8'), findsOneWidget);
    expect(_state(h).ball.vel.x, greaterThan(0), reason: 'pulled left, goes right');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the ticker moves the ball one fixed step at a time', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/mini-golf/play?difficulty=easy');
    await settleStart(tester);
    await _putt(tester, h, _ctrl(h).fieldHole.cup, 6);
    final t0 = _state(h).simTimeMs;
    await tester.pump(const Duration(milliseconds: 160));
    final steps = (_state(h).simTimeMs - t0) / kGolfPhysics.tickRateMs;
    expect(steps, inInclusiveRange(8, 10), reason: '160 ms at 60 steps per second');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context; paid rejection shows the neutral page', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/mini-golf/play?difficulty=medium&quest=sports-isle:si-06-mini-golf:0',
      api: api,
    );
    await settleStart(tester);
    expect(api.calls, contains('startGame:MINI_GOLF:2:sports-isle:si-06-mini-golf:0'));
    await tester.pumpWidget(const SizedBox());

    final paid = FakeGameApi(
      onStartGame: (_, __, ___) async =>
          throw GameApiException('This game requires a paid subscription', code: 'AUTHZ_TIER_REQUIRED'),
    );
    await pumpRouterApp(tester, location: '/mini-golf/play?difficulty=easy', api: paid);
    await settleStart(tester);
    expect(find.text('Not available in the app yet'), findsWidgets);
    expect(find.byKey(const Key('golf-field')), findsNothing);
  });
}
