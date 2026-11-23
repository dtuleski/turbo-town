import 'package:dashden_mobile/game/space_entry/config.dart';
import 'package:dashden_mobile/game/space_entry/physics.dart';
import 'package:dashden_mobile/game/space_entry/puzzles.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/lcg_random.dart';

num _first(RegExp re, String text) => num.parse(re.firstMatch(text)!.group(1)!);

void main() {
  group('landing physics', () {
    final zone = kLandingZones.first;

    LandingPrediction predict(String d, double angle, {double? thruster, double lateral = 0, double turbulence = 0}) {
      final c = spaceEntryConfig(d);
      return predictLanding(zone.latitude, zone.longitude, angle, thruster ?? c.optimalThrusterPower,
          lateral, c, turbulence);
    }

    test('the reference angle with optimal thrust lands on the target', () {
      for (final d in kSpaceEntryDifficulties) {
        final c = spaceEntryConfig(d);
        final p = predict(d, c.referenceAngle);
        expect(p.distanceKm, closeTo(0, 1e-9), reason: d);
        expect(p.accuracy, 100);
        expect(p.outcome, LandingOutcome.successfulLanding);
      }
    });

    test('a very steep angle burns the heat shield up', () {
      for (final d in kSpaceEntryDifficulties) {
        final p = predict(d, 60);
        expect(p.heatShieldRemaining, 0, reason: d);
        expect(p.outcome, LandingOutcome.orbitalBurnUp);
      }
    });

    test('a very shallow angle skips off the atmosphere', () {
      final p = predict('easy', -40);
      expect(p.accuracy, lessThanOrEqualTo(20));
      expect(p.heatShieldRemaining, 100, reason: 'negative degradation is clamped');
      expect(p.outcome, LandingOutcome.skipOff);
    });

    test('thrust changes how far a wrong angle misses', () {
      final c = spaceEntryConfig('medium');
      final low = predict('medium', c.referenceAngle + 4, thruster: c.optimalThrusterPower - 20);
      final high = predict('medium', c.referenceAngle + 4, thruster: c.optimalThrusterPower + 20);
      expect(high.distanceKm, greaterThan(low.distanceKm));
    });

    test('lateral correction only matters on hard', () {
      final easy = predict('easy', 8, lateral: 5);
      expect(easy.predictedLng, zone.longitude);
      final c = spaceEntryConfig('hard');
      final hard = predict('hard', c.referenceAngle, lateral: 5);
      expect(hard.predictedLng, isNot(zone.longitude));
    });

    test('predictions stay on the globe', () {
      final north = kLandingZones.firstWhere((z) => z.latitude > 60);
      final c = spaceEntryConfig('hard');
      final p = predictLanding(north.latitude, north.longitude, 80, 100, 90, c);
      expect(p.predictedLat, lessThanOrEqualTo(90));
      expect(p.predictedLng, lessThanOrEqualTo(180));
    });

    test('great-circle distance: a quarter of the equator is about 10 008 km', () {
      expect(haversineDistance(0, 0, 0, 90), closeTo(10007.5, 1));
      expect(haversineDistance(10, 20, 10, 20), 0);
    });
  });

  group('puzzles', () {
    test('answers are finite and inside the web ranges, over many seeds', () {
      for (var seed = 1; seed <= 150; seed++) {
        final easy = generateAnglePuzzle('easy', LcgRandom(seed));
        expect(easy.correctAnswer, inInclusiveRange(5, 12));
        expect(easy.correctAnswer, easy.correctAnswer.roundToDouble());
        final medium = generateAnglePuzzle('medium', LcgRandom(seed));
        expect(medium.correctAnswer, inInclusiveRange(3, 15));
        final hard = generateAnglePuzzle('hard', LcgRandom(seed));
        expect(hard.correctAnswer, inInclusiveRange(2, 8));
        final tm = generateThrusterPuzzle('medium', LcgRandom(seed));
        expect(tm.correctAnswer, inInclusiveRange(50, 80));
        final th = generateThrusterPuzzle('hard', LcgRandom(seed));
        expect(th.correctAnswer, inInclusiveRange(40, 85));
        final lat = generateLateralPuzzle('hard', LcgRandom(seed));
        expect(lat.correctAnswer.abs(), lessThanOrEqualTo(3.0000001));
        for (final p in [easy, medium, hard, tm, th, lat]) {
          expect(p.correctAnswer.isFinite, isTrue);
          expect(p.question, isNot(contains('NaN')));
          expect(p.question, isNot(contains('Infinity')));
          expect(p.visual, isNot(contains(r'${')), reason: 'the template must be filled in');
        }
      }
    });

    test('a thruster question can be solved from its numbers', () {
      final re = RegExp(r'Required thrust: (\d+) N. Each 1% power gives (\d+) N');
      for (var seed = 1; seed <= 100; seed++) {
        for (final d in ['medium', 'hard']) {
          final p = generateThrusterPuzzle(d, LcgRandom(seed));
          final m = re.firstMatch(p.question)!;
          final answer = int.parse(m.group(1)!) / int.parse(m.group(2)!);
          expect(answer, closeTo(p.correctAnswer, d == 'hard' ? 0.06 : 1e-9), reason: p.question);
        }
      }
    });

    test('easy angle questions can be solved from their numbers', () {
      final triangle = RegExp(r'angles of (\d+)° and ([\d.]+)°');
      for (var seed = 1; seed <= 100; seed++) {
        final p = generateAnglePuzzle('easy', LcgRandom(seed));
        final m = triangle.firstMatch(p.question);
        if (m != null) {
          expect(180 - num.parse(m.group(1)!) - num.parse(m.group(2)!), closeTo(p.correctAnswer, 1e-9));
        }
      }
    });

    test('bonus puzzles: counts per difficulty, distinct generators, plain numbers', () {
      for (final d in kSpaceEntryDifficulties) {
        final c = spaceEntryConfig(d);
        for (var seed = 1; seed <= 40; seed++) {
          final list = generateBonusPuzzles(d, c.bonusPuzzleCount, LcgRandom(seed));
          expect(list, hasLength(c.bonusPuzzleCount));
          expect(list.every((p) => p.type == PuzzleType.bonus), isTrue);
          expect(list.every((p) => p.correctAnswer.isFinite), isTrue);
          expect(list.map((p) => p.question).toSet().length, greaterThan(1));
        }
      }
    });

    test('simple bonus questions evaluate to their answer', () {
      final re = RegExp(r'^(\d+) × (\d+) \+ (\d+) = \?$');
      var checked = 0;
      for (var seed = 1; seed <= 300; seed++) {
        for (final p in generateBonusPuzzles('easy', 4, LcgRandom(seed))) {
          final m = re.firstMatch(p.question);
          if (m == null) continue;
          checked++;
          expect(int.parse(m.group(1)!) * int.parse(m.group(2)!) + int.parse(m.group(3)!), p.correctAnswer);
        }
      }
      expect(checked, greaterThan(20));
      final pct = RegExp(r'What is (\d+)% of (\d+)\?');
      for (var seed = 1; seed <= 300; seed++) {
        for (final p in generateBonusPuzzles('medium', 4, LcgRandom(seed))) {
          final m = pct.firstMatch(p.question);
          if (m == null) continue;
          expect(_first(RegExp(r'of (\d+)'), p.question) * int.parse(m.group(1)!) / 100, p.correctAnswer);
        }
      }
    });

    test('answers: parsing and checking', () {
      final p = generateAnglePuzzle('easy', LcgRandom(4));
      expect(parseAnswer(' 7 '), 7);
      expect(parseAnswer('7,5'), 7.5);
      expect(parseAnswer('abc'), isNull);
      expect(parseAnswer(''), isNull);
      expect(isCorrectAnswer(p, p.correctAnswer), isTrue);
      expect(isCorrectAnswer(p, p.correctAnswer + 1), isFalse);
      expect(jsNum(7.0), '7');
      expect(jsNum(7.5), '7.5');
      expect(jsNum(-0.0), '0');
    });

    test('the hard lateral answer -0.1 is accepted although the stored float is -0.10000000000000009', () {
      const puzzle = MissionPuzzle(
        type: PuzzleType.lateral,
        question: 'q',
        correctAnswer: -0.10000000000000009,
        unit: '°',
        label: 'l',
        icon: 'i',
      );
      expect(isCorrectAnswer(puzzle, -0.1), isTrue);
    });
  });
}
