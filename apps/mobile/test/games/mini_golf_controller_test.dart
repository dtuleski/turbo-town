import 'dart:math';

import 'package:dashden_mobile/game/framework/game_feedback.dart';
import 'package:dashden_mobile/game/framework/game_session.dart';
import 'package:dashden_mobile/game/mini_golf/data.dart';
import 'package:dashden_mobile/game/mini_golf/golf_controller.dart';
import 'package:dashden_mobile/game/mini_golf/physics.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';

const GolfArgs _easy = (difficulty: 'easy', quest: null);
const GolfArgs _medium = (difficulty: 'medium', quest: null);

/// A controller on a started round, driven by hand (no ticker, no timers fired).
Future<({GolfController golf, GameSessionController session, FakeGameApi api})> _start(
  GolfArgs args, {
  int seed = 1,
  FakeGameApi? api,
}) async {
  final fake = api ?? FakeGameApi();
  final session = GameSessionController(fake, golfSessionArgs(args));
  addTearDown(session.dispose);
  await session.start();
  expect(session.phase, SessionPhase.playing);
  final golf = GolfController(session, const NoopGameFeedback(), args, random: Random(seed));
  addTearDown(golf.dispose);
  return (golf: golf, session: session, api: fake);
}

/// Pull-back point for a shot of [power] (0-14) toward [target].
Vec2 _pull(GolfController g, Vec2 target, double power) {
  final from = g.state.ball.pos;
  final dir = (target - from).normalized();
  return from - dir.scaled(power * 10);
}

/// Shoots toward [target] and rolls the ball until it stops (or [maxSteps]).
void _shoot(GolfController g, Vec2 target, double power, {int maxSteps = 4000}) {
  final from = g.state.ball.pos;
  final pull = _pull(g, target, power);
  expect(g.canGrab(from), isTrue);
  expect(g.shoot(from, pull), isTrue);
  for (var i = 0; i < maxSteps && g.state.phase == GolfPhase.rolling; i++) {
    g.step();
  }
}

/// Speed that makes the ball arrive at [target] slowly enough to drop in.
double _powerFor(double distance) => min(14, 3 + distance / 40);

void main() {
  test('a new round: first hole of the course, ball on the tee, strokes at zero', () async {
    final r = await _start(_easy);
    final g = r.golf;
    expect(g.course.difficulty, 'easy');
    expect(g.maxStrokes, 8);
    expect(g.state.holeIndex, 0);
    expect(g.state.ball.pos, g.fieldHole.ball);
    expect(g.fieldHole.ball.x, g.hole.ball.x * 1.5);
    expect(g.state.currentStrokes, 0);
    expect(g.state.phase, GolfPhase.aiming);
    expect(g.state.showHoleName, isTrue);
  });

  test('a drag must start on the ball and be longer than 12 units to be a shot', () async {
    final g = (await _start(_easy)).golf;
    final ball = g.state.ball.pos;
    expect(g.canGrab(ball + const Vec2(79, 0)), isTrue);
    expect(g.canGrab(ball + const Vec2(81, 0)), isFalse);
    expect(g.shoot(ball, ball + const Vec2(5, 5)), isFalse, reason: 'too short');
    expect(g.state.currentStrokes, 0);
    expect(g.state.phase, GolfPhase.aiming);
    expect(g.shoot(ball, ball + const Vec2(-30, 0)), isTrue);
    expect(g.state.phase, GolfPhase.rolling);
    expect(g.state.currentStrokes, 1);
    expect(g.state.totalStrokes, 1);
    expect(g.state.ball.vel.x, closeTo(3, 1e-9), reason: 'pulled left: goes right at power 30 x 0.1');
    expect(g.canGrab(ball), isFalse, reason: 'no new drag while rolling');
    expect(g.shoot(ball, ball + const Vec2(-30, 0)), isFalse);
  });

  test('the straight shot drops in: the hole is recorded and play moves on after the pause', () async {
    final g = (await _start(_easy, seed: 3)).golf;
    final cup = g.fieldHole.cup;
    _shoot(g, cup, _powerFor(g.state.ball.pos.distanceTo(cup)));
    expect(g.state.phase, GolfPhase.sunk);
    expect(g.state.ball.sunk, isTrue);
    expect(g.state.holeStrokes, [1]);
    expect(g.state.currentStrokes, 1);
    expect(golfScoreName(1, g.hole.par), GolfScoreName.birdie);
  });

  test('stepping does nothing while the round is paused', () async {
    final r = await _start(_easy);
    final g = r.golf;
    final cup = g.fieldHole.cup;
    final from = g.state.ball.pos;
    expect(g.shoot(from, _pull(g, cup, 6)), isTrue);
    r.session.pause();
    final before = g.state.ball.pos;
    for (var i = 0; i < 30; i++) {
      g.step();
    }
    expect(g.state.ball.pos, before);
    expect(g.shoot(from, from + const Vec2(-50, 0)), isFalse);
    r.session.resume();
    g.step();
    expect(g.state.ball.pos, isNot(before));
  });

  test('out of strokes: the hole counts at the limit and the next hole starts', () async {
    final g = (await _start(_easy)).golf;
    final far = g.fieldHole.cup;
    for (var shot = 0; shot < 8; shot++) {
      expect(g.state.holeIndex, 0, reason: 'shot ${shot + 1}');
      // 15 units of pull is a 1.5 speed nudge: nowhere near the cup.
      final from = g.state.ball.pos;
      // Pulling toward the cup sends the ball away from it.
      final dir = (far - from).normalized();
      expect(g.shoot(from, from + dir.scaled(15)), isTrue, reason: 'shot ${shot + 1}');
      for (var i = 0; i < 4000 && g.state.phase == GolfPhase.rolling; i++) {
        g.step();
      }
    }
    expect(g.state.holeIndex, 1);
    expect(g.state.holeStrokes, [8]);
    expect(g.state.currentStrokes, 0);
    expect(g.state.totalStrokes, 8);
    expect(g.state.ball.pos, g.fieldHole.ball);
    expect(g.state.phase, GolfPhase.aiming);
    expect(g.state.showHoleName, isTrue);
  });

  test('the last hole ends the round: accuracy goes to the server as correctAnswers out of 100', () async {
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(777);
    });
    final r = await _start(_easy, api: api);
    final g = r.golf;
    for (var hole = 0; hole < 3; hole++) {
      for (var shot = 0; shot < 8; shot++) {
        final from = g.state.ball.pos;
        expect(g.shoot(from, from + const Vec2(15, 0)), isTrue, reason: 'hole $hole shot $shot');
        for (var i = 0; i < 4000 && g.state.phase == GolfPhase.rolling; i++) {
          g.step();
        }
      }
    }
    expect(g.state.finished, isTrue);
    expect(g.state.totalStrokes, 24);
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    // 24 strokes is the limit for 3 holes of 8: 0%.
    expect(sent, {'correctAnswers': 0, 'totalQuestions': 100});
    expect(r.api.calls.last, startsWith('completeGame:game-1:'));
    expect(r.api.calls.last, endsWith(':24'));
    expect(r.session.state.phase, SessionPhase.completed);
    expect(g.canGrab(g.state.ball.pos), isFalse);
  });

  test('a ball that stops in water costs a stroke and goes back to the tee', () async {
    // The same seed gives the same conditions, so each try starts from the same hole.
    var found = false;
    for (var power = 3.0; power <= 14 && !found; power += 0.5) {
      final g = (await _start(_medium, seed: 5)).golf;
      final index = g.course.holes.indexWhere((h) => h.obstacles.any((o) => o.type == 'water'));
      expect(index, greaterThanOrEqualTo(0), reason: 'the medium course has a water hazard');
      for (var hole = 0; hole < index; hole++) {
        for (var shot = 0; shot < g.maxStrokes; shot++) {
          final from = g.state.ball.pos;
          g.shoot(from, from + const Vec2(15, 0));
          for (var i = 0; i < 4000 && g.state.phase == GolfPhase.rolling; i++) {
            g.step();
          }
        }
      }
      expect(g.state.holeIndex, index);
      final water = g.fieldHole.obstacles.firstWhere((o) => o.type == 'water');
      final centre = Vec2(water.x + (water.width ?? 0) / 2, water.y + (water.height ?? 0) / 2);
      _shoot(g, centre, power);
      if (g.state.phase != GolfPhase.waterReset) continue;
      found = true;
      expect(g.state.ball.inWater, isTrue);
      expect(g.state.currentStrokes, 2, reason: 'the shot and the penalty stroke');
      expect(g.state.totalStrokes, g.course.holes.take(index).length * g.maxStrokes + 2);
    }
    expect(found, isTrue, reason: 'some power ends in the pond');
  });

  test('conditions are drawn again for each hole', () async {
    final g = (await _start(_easy, seed: 9)).golf;
    final first = g.state.env;
    final from = g.state.ball.pos;
    for (var shot = 0; shot < 8; shot++) {
      g.shoot(from, from + const Vec2(15, 0));
      for (var i = 0; i < 4000 && g.state.phase == GolfPhase.rolling; i++) {
        g.step();
      }
    }
    expect(g.state.holeIndex, 1);
    final second = g.state.env;
    expect(
      [second.windSpeed, second.windDirection, second.temperature, second.altitude],
      isNot([first.windSpeed, first.windDirection, first.temperature, first.altitude]),
    );
    expect(second.windSpeed, inInclusiveRange(0, 5));
    expect(second.temperature, inInclusiveRange(18, 28));
  });

  test('restart gives a fresh round', () async {
    final g = (await _start(_easy)).golf;
    final cup = g.fieldHole.cup;
    _shoot(g, cup, 8);
    expect(g.state.totalStrokes, 1);
    g.restart();
    expect(g.state.totalStrokes, 0);
    expect(g.state.holeIndex, 0);
    expect(g.state.holeStrokes, isEmpty);
    expect(g.state.finished, isFalse);
    expect(g.state.ball.pos, g.fieldHole.ball);
  });
}
