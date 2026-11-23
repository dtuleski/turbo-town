import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:dashden_mobile/game/bond_and_burn/logic.dart';
import 'package:dashden_mobile/game/mini_golf/data.dart';
import 'package:dashden_mobile/game/mini_golf/physics.dart';
import 'package:dashden_mobile/game/space_entry/config.dart';
import 'package:dashden_mobile/game/space_entry/physics.dart';
import 'package:dashden_mobile/game/space_entry/puzzles.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/lcg_random.dart';

/// Compares the Dart ports with outputs recorded from the web TypeScript
/// (`tools/export_physics_data.mjs`). Floating point: the same operations in
/// the same order, so only the platform's sin/cos/atan2 may differ in the
/// last digits.
late final Map<String, dynamic> golden;

Matcher near(num v) => closeTo(v, 1e-6 + v.abs() * 1e-9);

void main() {
  setUpAll(() {
    golden = jsonDecode(File('test/fixtures/physics_web_golden.json').readAsStringSync())
        as Map<String, dynamic>;
  });

  group('Space Entry landing physics', () {
    test('predictLanding matches the web on every recorded input', () {
      final rows = golden['spacePredict'] as List;
      expect(rows, hasLength(972));
      for (final r in rows) {
        final row = r as Map<String, dynamic>;
        final zone = kLandingZones[row['z'] as int];
        final p = predictLanding(
          zone.latitude,
          zone.longitude,
          (row['a'] as num).toDouble(),
          (row['thr'] as num).toDouble(),
          (row['l'] as num).toDouble(),
          spaceEntryConfig(row['d'] as String),
          (row['t'] as num).toDouble(),
        );
        final out = row['out'] as List;
        final label = '${row['d']} zone ${row['z']} angle ${row['a']} thr ${row['thr']}';
        expect(p.predictedLat, near(out[0] as num), reason: label);
        expect(p.predictedLng, near(out[1] as num), reason: label);
        expect(p.distanceKm, near(out[2] as num), reason: label);
        expect(p.accuracy, near(out[3] as num), reason: label);
        expect(p.heatShieldRemaining, near(out[4] as num), reason: label);
        expect(switch (p.outcome) {
          LandingOutcome.successfulLanding => 'SUCCESSFUL_LANDING',
          LandingOutcome.orbitalBurnUp => 'ORBITAL_BURN_UP',
          LandingOutcome.skipOff => 'SKIP_OFF',
        }, out[5], reason: label);
      }
    });

    test('haversine distance and heat shield degradation match the web', () {
      for (final r in golden['haversine'] as List) {
        final i = ((r as Map<String, dynamic>)['in'] as List).map((e) => (e as num).toDouble()).toList();
        expect(haversineDistance(i[0], i[1], i[2], i[3]), near(r['out'] as num));
      }
      for (final r in golden['spaceDegradation'] as List) {
        final row = r as Map<String, dynamic>;
        expect(
          calculateHeatShieldDegradation((row['angle'] as num).toDouble(), spaceEntryConfig(row['d'] as String)),
          near(row['out'] as num),
        );
      }
    });

    test('config and landing zones come from the web data', () {
      expect(kLandingZones, hasLength(24));
      expect(spaceEntryConfig('easy').countdownSeconds, 90);
      expect(spaceEntryConfig('medium').countdownSeconds, 60);
      expect(spaceEntryConfig('hard').countdownSeconds, 45);
      expect(spaceEntryConfig('hard').turbulenceRange, 0.3);
      expect(spaceEntryConfig('easy').totalPuzzles, 3);
      expect(spaceEntryConfig('medium').totalPuzzles, 5);
      expect(spaceEntryConfig('hard').totalPuzzles, 7, reason: 'matches the 3/5/7 puzzles of the setup page');
      expect(spaceEntryConfig('nonsense').countdownSeconds, 90, reason: 'unknown is easy');
    });
  });

  group('Space Entry puzzles replay the web draws', () {
    test('angle, thruster and lateral puzzles equal the web for 12 seeds', () {
      final rows = golden['spacePuzzles'] as List;
      expect(rows, hasLength(96));
      for (final r in rows) {
        final row = r as Map<String, dynamic>;
        final d = row['d'] as String;
        final rng = LcgRandom(row['seed'] as int);
        final MissionPuzzle got = switch (row['kind']) {
          'angle' => generateAnglePuzzle(d, rng),
          'thruster' => generateThrusterPuzzle(d, rng),
          _ => generateLateralPuzzle(d, rng),
        };
        final web = row['puzzle'] as Map<String, dynamic>;
        final label = '${row['kind']} $d seed ${row['seed']}';
        expect(got.question, web['question'], reason: label);
        expect(got.correctAnswer, near(web['correctAnswer'] as num), reason: label);
        expect(got.unit, web['unit'], reason: label);
        expect(got.label, web['label'], reason: label);
        expect(got.icon, web['icon'], reason: label);
        // Two web visuals print a literal "${...}" (a template written in single
        // quotes); the app shows the number instead, so those are skipped.
        final visual = web['visual'] as String?;
        if (visual != null && !visual.contains(r'${')) {
          expect(got.visual, visual, reason: label);
        }
      }
    });
  });

  group('Mini Golf physics', () {
    test('PHYSICS constants equal the web', () {
      final web = golden['golfPhysics'] as Map<String, dynamic>;
      expect(kGolfPhysics.ballRadius, web['BALL_RADIUS']);
      expect(kGolfPhysics.cupRadius, web['CUP_RADIUS']);
      expect(kGolfPhysics.friction, web['FRICTION']);
      expect(kGolfPhysics.sandFriction, web['SAND_FRICTION']);
      expect(kGolfPhysics.minVelocity, web['MIN_VELOCITY']);
      expect(kGolfPhysics.maxPower, web['MAX_POWER']);
      expect(kGolfPhysics.wallBounce, web['WALL_BOUNCE']);
      expect(kGolfPhysics.bumperBounce, web['BUMPER_BOUNCE']);
      expect(kGolfPhysics.tickRateMs, web['TICK_RATE']);
      expect(golfPhysicsJson['GRAVITY'], 0);
    });

    test('generateEnvironment replays the web draws', () {
      for (final r in golden['golfEnv'] as List) {
        final row = r as Map<String, dynamic>;
        final env = generateEnvironment(row['d'] as String, LcgRandom(row['seed'] as int).nextDouble);
        final web = row['env'] as Map<String, dynamic>;
        final label = '${row['d']} seed ${row['seed']}';
        expect(env.windSpeed, web['windSpeed'], reason: label);
        expect(env.windDirection, web['windDirection'], reason: label);
        expect(env.temperature, web['temperature'], reason: label);
        expect(env.altitude, web['altitude'], reason: label);
      }
    });

    test('ball trajectories match the web on all 10 holes, 3 shots, 3 environments', () {
      final envs = [
        for (final e in golden['golfEnvs'] as List)
          EnvironmentConditions(
            windSpeed: ((e as Map<String, dynamic>)['windSpeed'] as num).toDouble(),
            windDirection: (e['windDirection'] as num).toDouble(),
            temperature: (e['temperature'] as num).toDouble(),
            altitude: (e['altitude'] as num).toDouble(),
          ),
      ];
      final sims = golden['golfSims'] as List;
      expect(sims, hasLength(10 * 3 * 3), reason: '10 holes x 3 shots x 3 environments');
      var sunk = 0;
      var sand = 0;
      var water = 0;
      for (final s in sims) {
        final sim = s as Map<String, dynamic>;
        final course = kGolfCourses.firstWhere((c) => c.id == sim['course']);
        final hole = course.holes[sim['hole'] as int].scaledBy(kGolfScale);
        final power = (sim['power'] as num).toDouble();
        final angle = (sim['angle'] as num).toDouble();
        var ball = BallState(
          pos: hole.ball,
          vel: Vec2(math.cos(angle) * power, math.sin(angle) * power),
        );
        final wanted = {
          for (final st in sim['states'] as List) (st as List)[0] as int: st,
        };
        for (var tick = 0; tick < 700; tick++) {
          ball = physicsTick(ball, hole, tick * kGolfPhysics.tickRateMs, envs[sim['env'] as int]);
          final st = wanted[tick + 1];
          if (st == null) continue;
          final label = '${sim['course']} hole ${sim['hole']} env ${sim['env']} shot ${sim['shot']} tick ${tick + 1}';
          expect(ball.pos.x, near(st[1] as num), reason: label);
          expect(ball.pos.y, near(st[2] as num), reason: label);
          expect(ball.vel.x, near(st[3] as num), reason: label);
          expect(ball.vel.y, near(st[4] as num), reason: label);
          expect(ball.inSand, st[5], reason: label);
          expect(ball.inWater, st[6], reason: label);
          expect(ball.sunk, st[7], reason: label);
          if (ball.sunk) sunk++;
          if (ball.inSand) sand++;
          if (ball.inWater) water++;
        }
      }
      // The recorded runs exercise the interesting branches, not just rolling.
      expect(sunk, greaterThan(0), reason: 'some shot sinks');
      expect(sand, greaterThan(0), reason: 'some shot rolls through sand');
      expect(water, greaterThan(0), reason: 'some shot ends in water');
    });

    test('windmill blades match the web', () {
      final windmill = kGolfCourses
          .expand((c) => c.holes)
          .expand((h) => h.obstacles)
          .firstWhere((o) => o.type == 'windmill');
      for (final r in golden['golfWindmill'] as List) {
        final row = r as Map<String, dynamic>;
        final walls = getWindmillBladeWalls(windmill, (row['time'] as num).toDouble());
        final web = row['walls'] as List;
        expect(walls, hasLength(4));
        for (var i = 0; i < 4; i++) {
          expect(walls[i].end.x, near((web[i] as List)[0] as num));
          expect(walls[i].end.y, near((web[i] as List)[1] as num));
        }
      }
    });

    test('hole result names match the web', () {
      const names = {
        'Albatross!': GolfScoreName.albatross,
        'Eagle!': GolfScoreName.eagle,
        'Birdie!': GolfScoreName.birdie,
        'Par': GolfScoreName.par,
        'Bogey': GolfScoreName.bogey,
        'Double Bogey': GolfScoreName.doubleBogey,
        'Triple Bogey+': GolfScoreName.tripleBogeyPlus,
      };
      for (final r in golden['golfScoreNames'] as List) {
        final row = r as Map<String, dynamic>;
        expect(golfScoreName((row['diff'] as int) + 3, 3), names[row['out']], reason: 'diff ${row['diff']}');
      }
    });
  });

  group('Bond & Burn', () {
    test('getRandomElement replays the web draws', () {
      for (final r in golden['bbRandom'] as List) {
        final row = r as Map<String, dynamic>;
        final d = row['d'] as String;
        final config = bondConfig(d);
        final rng = LcgRandom(row['seed'] as int);
        final got = <String>[];
        for (var i = 0; i < 12; i++) {
          final recipe = i % 3 == 2
              ? null
              : bondRecipeById(config.availableRecipeIds[i % config.availableRecipeIds.length]);
          got.add(getRandomElement(config, recipe, rng.nextDouble).symbol);
        }
        expect(got, row['draws'], reason: '$d seed ${row['seed']}');
      }
    });

    test('recipe score equals the web for every recipe, speed and combo', () {
      final rows = golden['bbScores'] as List;
      expect(rows, hasLength(600));
      for (final r in rows) {
        final row = r as Map<String, dynamic>;
        final recipe = bondRecipeById(row['id'] as String)!;
        expect(
          calculateRecipeScore(recipe, (row['time'] as num).toDouble(), row['combo'] as int, row['d'] as String),
          row['out'],
          reason: '${row['id']} ${row['d']} t=${row['time']} combo=${row['combo']}',
        );
      }
    });

    test('periodic tables and the score cap equal the web', () {
      final tables = golden['bbTables'] as Map<String, dynamic>;
      for (final d in kBondDifficulties) {
        expect([for (final e in bondPeriodicTable(d)) e.symbol], tables[d], reason: d);
      }
      for (final r in golden['bbFinal'] as List) {
        final row = r as Map<String, dynamic>;
        expect(calculateFinalScore(row['s'] as int), row['out']);
      }
    });
  });
}
