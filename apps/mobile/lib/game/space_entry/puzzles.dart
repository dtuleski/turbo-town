import 'dart:math';

import '../framework/session_timers.dart' show shuffled;

/// Space Entry math puzzles, ported from apps/web `spaceEntryPuzzles.ts`.
/// A correct answer gives the ideal control value; a wrong one feeds the
/// player's own number into the landing physics. Every random draw is
/// `rng.nextDouble()` in the same order as the web, so a replayed sequence
/// gives the same puzzle (the golden test relies on it).

enum PuzzleType { angle, thruster, lateral, bonus }

class MissionPuzzle {
  const MissionPuzzle({
    required this.type,
    required this.question,
    required this.correctAnswer,
    required this.unit,
    required this.label,
    required this.icon,
    this.visual,
  });
  final PuzzleType type;
  final String question;
  final String? visual;
  final double correctAnswer;
  final String unit;

  /// Card title ("Entry Angle"). English only, like the web.
  final String label;
  final String icon;
}

/// Integer in [min, max], both included (web `randInt`).
int randInt(Random rng, int min, int max) => (rng.nextDouble() * (max - min + 1)).floor() + min;

/// A number the way JavaScript prints it: no ".0" on whole numbers.
String jsNum(num v) {
  if (v == 0) return '0';
  if (v is int) return '$v';
  if (v == v.truncateToDouble() && v.abs() < 1e15) return v.toInt().toString();
  return v.toString();
}

/// `parseFloat(v.toFixed(1))`.
double _round1(double v) => double.parse(v.toStringAsFixed(1));

/// Player input to a number; null when it is not one (web `parseFloat` +
/// `isNaN` check, plus a decimal comma).
double? parseAnswer(String raw) => double.tryParse(raw.trim().replaceAll(',', '.'));

/// True when [answer] is the puzzle's answer. The web compares with `===`, which
/// rejects a typed -0.1 when the stored answer is -0.10000000000000009 (hard
/// lateral puzzle), so a tiny tolerance is used here.
bool isCorrectAnswer(MissionPuzzle puzzle, double answer) =>
    (answer - puzzle.correctAnswer).abs() < 1e-9;

MissionPuzzle _angle(String question, String visual, double answer) => MissionPuzzle(
      type: PuzzleType.angle,
      question: question,
      visual: visual,
      correctAnswer: answer,
      unit: '°',
      label: 'Entry Angle',
      icon: '📐',
    );

MissionPuzzle generateAnglePuzzle(String difficulty, Random rng) {
  // The ideal answer is random each game, so it is not always the same.
  final double ideal = difficulty == 'easy'
      ? randInt(rng, 5, 12).toDouble()
      : difficulty == 'medium'
          ? randInt(rng, 3, 15).toDouble()
          : _round1(randInt(rng, 20, 80) / 10);

  switch (difficulty) {
    case 'medium':
      {
        final variant = randInt(rng, 0, 2);
        if (variant == 0) {
          final y = randInt(rng, 1, 4);
          final x = 180 - ideal - y;
          return _angle(
            'Two supplementary angles add to 180°. One is ${jsNum(x)}°. The entry angle is 180° − ${jsNum(x)}° − $y°. What is it?',
            '📐 180° − ${jsNum(x)}° − $y° = ?°',
            ideal,
          );
        }
        if (variant == 1) {
          final multiplier = randInt(rng, 3, 8);
          final product = multiplier * ideal;
          return _angle(
            "A spacecraft's sensor reads ${jsNum(product)}°. The entry angle is 1/$multiplier of that. What is the entry angle?",
            '📐 total ÷ $multiplier = ?°',
            ideal,
          );
        }
        final a = randInt(rng, 40, 80);
        final b = randInt(rng, 40, 80);
        final c = a + b - ideal;
        return _angle('Compute: $a° + $b° − ${jsNum(c)}° = ?°', '📐 A + B − C = ?°', ideal);
      }
    case 'hard':
      {
        final variant = randInt(rng, 0, 3);
        if (variant == 0) {
          final x = 90 - ideal;
          return _angle(
            'In a right triangle, one angle is 90° and another is ${jsNum(x)}°. What is the third angle?',
            '📐 90° + X° + ?° = 180°',
            ideal,
          );
        }
        if (variant == 1) {
          final a = randInt(rng, 50, 90);
          final b = 180 - a - ideal;
          return _angle(
            "A triangle's angles are $a°, ${jsNum(b)}°, and ?°. Solve for the missing angle.",
            '📐 △  $a° + ${jsNum(b)}° + ?° = 180°',
            ideal,
          );
        }
        if (variant == 2) {
          final decimalPart = randInt(rng, 1, 9) / 10;
          final sum = ideal + decimalPart + randInt(rng, 10, 30);
          final other = sum - ideal;
          final otherStr = other % 1 == 0 ? '${jsNum(other)}.0' : jsNum(_round1(other));
          return _angle(
            "Entry corridor: ${jsNum(_round1(sum))}° total. Atmospheric drag accounts for $otherStr°. What's the remaining entry angle?",
            '📐 total − drag = ?°',
            ideal,
          );
        }
        final divisor = randInt(rng, 2, 6);
        final product = ideal * divisor;
        final offset = randInt(rng, 5, 20);
        return _angle(
          "Sensor reads ${jsNum(product + offset)}°. Subtract $offset°, then divide by $divisor. What's the entry angle?",
          '📐 (reading − offset) ÷ divisor = ?°',
          ideal,
        );
      }
    default:
      {
        final variant = randInt(rng, 0, 2);
        if (variant == 0) {
          final a = randInt(rng, 70, 95);
          final b = 180 - a - ideal;
          return _angle(
            'A triangle has angles of $a° and ${jsNum(b)}°. What is the third angle?',
            '📐 △  $a° + ${jsNum(b)}° + ?° = 180°',
            ideal,
          );
        }
        if (variant == 1) {
          final a = randInt(rng, 50, 80);
          final b = 180 - a - ideal;
          return _angle(
            'Two angles of a triangle are $a° and ${jsNum(b)}°. Find the missing angle.',
            '📐 △  $a° + ${jsNum(b)}° + ?° = 180°',
            ideal,
          );
        }
        final total = ideal + randInt(rng, 10, 40);
        final other = total - ideal;
        return _angle(
          'Two angles add up to ${jsNum(total)}°. One is ${jsNum(other)}°. What is the other?',
          '📐 ${jsNum(other)}° + ?° = ${jsNum(total)}°',
          ideal,
        );
      }
  }
}

MissionPuzzle _thruster(String question, String visual, double answer) => MissionPuzzle(
      type: PuzzleType.thruster,
      question: question,
      visual: visual,
      correctAnswer: answer,
      unit: '%',
      label: 'Thruster Power',
      icon: '🔥',
    );

/// Medium and hard only; anything else is medium.
MissionPuzzle generateThrusterPuzzle(String difficulty, Random rng) {
  final hard = difficulty == 'hard';
  final double answer = hard ? _round1(randInt(rng, 400, 850) / 10) : randInt(rng, 50, 80).toDouble();
  if (!hard) {
    final perPercent = randInt(rng, 20, 60);
    final required = answer * perPercent;
    return _thruster(
      'Required thrust: ${jsNum(required)} N. Each 1% power gives $perPercent N. What power level (%) do you need?',
      '🚀 ${jsNum(required)} ÷ $perPercent = ?%',
      answer,
    );
  }
  final perPercent = randInt(rng, 5, 10) * 10;
  final required = (answer * perPercent + 0.5).floor();
  return _thruster(
    'Required thrust: $required N. Each 1% power gives $perPercent N. What power level (%) do you need?',
    '🚀 $required ÷ $perPercent = ?%',
    answer,
  );
}

MissionPuzzle _lateral(String question, String visual, double answer) => MissionPuzzle(
      type: PuzzleType.lateral,
      question: question,
      visual: visual,
      correctAnswer: answer,
      unit: '°',
      label: 'Lateral Correction',
      icon: '↔️',
    );

/// Hard only on the web. The `difficulty` argument picks decimal or whole
/// answers, as there.
MissionPuzzle generateLateralPuzzle(String difficulty, Random rng) {
  final double answer =
      difficulty == 'hard' ? _round1(randInt(rng, -30, 30) / 10) : randInt(rng, -5, 5).toDouble();
  final variant = randInt(rng, 0, 3);

  if (variant == 0) {
    final a = randInt(rng, 3, 15);
    final b = a + answer;
    return _lateral(
      'Wind pushes $a° east, compensator corrects ${jsNum(b)}° west. Net lateral correction: $a − ${jsNum(b)} = ?',
      '↔️ $a − ${jsNum(b)} = ?°',
      a - b,
    );
  }
  if (variant == 1) {
    final a = randInt(rng, 2, 8);
    final b = randInt(rng, 2, 8);
    final c = a * b - answer;
    return _lateral(
      '$a × $b − ${jsNum(c)} = ? What lateral correction is needed?',
      '↔️ Solve: $a × $b − ${jsNum(c)} = ?°',
      answer,
    );
  }
  if (variant == 2) {
    final divisor = randInt(rng, 2, 6);
    final product = answer * divisor;
    final offset = randInt(rng, 5, 20);
    return _lateral(
      'Sensor reads ${jsNum(product + offset)}°. Subtract $offset°, divide by $divisor. What correction?',
      '↔️ (${jsNum(product + offset)} − $offset) ÷ $divisor = ?°',
      answer,
    );
  }
  final a = randInt(rng, 10, 30);
  final b = a - answer;
  return _lateral(
    'Left drift: $a°. Right compensation: ${jsNum(b)}°. Net correction: $a − ${jsNum(b)} = ?',
    '↔️ $a − ${jsNum(b)} = ?°',
    answer,
  );
}

// ── Bonus puzzles ───────────────────────────────────────────────────────────

const List<({String label, String icon})> _bonusLabels = [
  (label: 'Fuel Calculation', icon: '⛽'),
  (label: 'Orbit Velocity', icon: '🛰️'),
  (label: 'Shield Calibration', icon: '🛡️'),
  (label: 'Navigation Check', icon: '🧭'),
  (label: 'Comm Frequency', icon: '📡'),
  (label: 'Payload Balance', icon: '⚖️'),
  (label: 'Oxygen Reserve', icon: '💨'),
];

typedef _BonusGenerator = MissionPuzzle Function(String difficulty, Random rng);

MissionPuzzle _bonus(
  ({String label, String icon}) meta,
  String question,
  String visual,
  num answer, [
  String unit = '',
]) =>
    MissionPuzzle(
      type: PuzzleType.bonus,
      question: question,
      visual: visual,
      correctAnswer: answer.toDouble(),
      unit: unit,
      label: meta.label,
      icon: meta.icon,
    );

({String label, String icon}) _meta(Random rng) =>
    _bonusLabels[randInt(rng, 0, _bonusLabels.length - 1)];

/// Multi-step arithmetic.
MissionPuzzle _genMultiStep(String difficulty, Random rng) {
  final meta = _meta(rng);
  if (difficulty == 'easy') {
    final a = randInt(rng, 2, 5);
    final b = randInt(rng, 2, 5);
    final c = randInt(rng, 1, 10);
    return _bonus(meta, '$a × $b + $c = ?', '🔢 Solve the equation', a * b + c);
  }
  if (difficulty == 'medium') {
    final a = randInt(rng, 3, 8);
    final b = randInt(rng, 3, 8);
    final c = randInt(rng, 5, 20);
    return _bonus(meta, '$a × $b − $c = ?', '🔢 Solve the equation', a * b - c);
  }
  final a = randInt(rng, 4, 12);
  final b = randInt(rng, 4, 12);
  final c = randInt(rng, 10, 30);
  final d = randInt(rng, 2, 5);
  return _bonus(
    meta,
    '($a × $b − $c) ÷ $d = ?  (round down)',
    '🔢 Solve step by step',
    ((a * b - c) / d).floor(),
  );
}

/// "What is X% of Y?"
MissionPuzzle _genPercentage(String difficulty, Random rng) {
  final meta = _meta(rng);
  const visual = '📊 percentage × total ÷ 100';
  if (difficulty == 'easy') {
    final pct = const [10, 25, 50][randInt(rng, 0, 2)];
    final total = randInt(rng, 2, 10) * 20;
    return _bonus(meta, 'What is $pct% of $total?', visual, (pct / 100) * total);
  }
  if (difficulty == 'medium') {
    final pct = const [15, 20, 25, 30, 75][randInt(rng, 0, 4)];
    final total = randInt(rng, 2, 8) * 40;
    return _bonus(meta, 'What is $pct% of $total?', visual, (pct / 100) * total);
  }
  final pct = randInt(rng, 1, 9) * 5 + randInt(rng, 0, 1) * 5;
  final total = randInt(rng, 3, 12) * 20;
  return _bonus(meta, 'What is $pct% of $total?', visual, (pct / 100) * total);
}

/// Unit rate.
MissionPuzzle _genRatio(String difficulty, Random rng) {
  final meta = _meta(rng);
  if (difficulty == 'easy') {
    final perUnit = randInt(rng, 2, 5);
    final units = randInt(rng, 2, 5);
    final total = perUnit * units;
    return _bonus(
      meta,
      '$units rockets need $total fuel cells. How many fuel cells per rocket?',
      '🚀 total ÷ count = ?',
      perUnit,
    );
  }
  if (difficulty == 'medium') {
    final perUnit = randInt(rng, 3, 8);
    final units = randInt(rng, 3, 7);
    final total = perUnit * units;
    return _bonus(
      meta,
      '$units missions used $total kg of fuel total. How many kg per mission?',
      '⛽ total ÷ missions = ?',
      perUnit,
      'kg',
    );
  }
  final perUnit = randInt(rng, 5, 15);
  final units = randInt(rng, 4, 9);
  final total = perUnit * units;
  return _bonus(
    meta,
    'A fleet of $units ships consumed $total liters. What is the average per ship?',
    '⛽ total ÷ ships = ?',
    perUnit,
    'L',
  );
}

/// Order of operations.
MissionPuzzle _genOrderOfOps(String difficulty, Random rng) {
  final meta = _meta(rng);
  if (difficulty == 'easy') {
    final a = randInt(rng, 1, 5);
    final b = randInt(rng, 2, 4);
    final c = randInt(rng, 2, 4);
    return _bonus(meta, '$a + $b × $c = ?', '⚠️ Remember: multiply first!', a + b * c);
  }
  if (difficulty == 'medium') {
    final a = randInt(rng, 2, 8);
    final b = randInt(rng, 2, 6);
    final c = randInt(rng, 2, 6);
    final d = randInt(rng, 1, 5);
    return _bonus(meta, '$a + $b × $c − $d = ?', '⚠️ Multiply first, then add/subtract', a + b * c - d);
  }
  final a = randInt(rng, 2, 6);
  final b = randInt(rng, 2, 6);
  final c = randInt(rng, 1, 5);
  final d = randInt(rng, 2, 4);
  return _bonus(meta, '($a + $b) × $c − $d = ?', '⚠️ Parentheses first!', (a + b) * c - d);
}

/// Negative numbers.
MissionPuzzle _genNegatives(String difficulty, Random rng) {
  final meta = _meta(rng);
  if (difficulty == 'easy') {
    final a = randInt(rng, 1, 10);
    final b = randInt(rng, a + 1, 20);
    return _bonus(meta, '−$a + $b = ?', '🌡️ Think of a number line', -a + b);
  }
  if (difficulty == 'medium') {
    final a = randInt(rng, 5, 15);
    final b = randInt(rng, 1, a - 1);
    return _bonus(meta, '$b − $a = ?', '🌡️ Result can be negative', b - a);
  }
  final a = randInt(rng, 5, 20);
  final b = randInt(rng, 5, 20);
  final c = randInt(rng, 1, 10);
  return _bonus(meta, '−$a + $b − $c = ?', '🌡️ Work left to right', -a + b - c);
}

/// Squares and square roots.
MissionPuzzle _genPowers(String difficulty, Random rng) {
  final meta = _meta(rng);
  if (difficulty == 'easy') {
    final a = randInt(rng, 2, 6);
    return _bonus(meta, 'What is $a²? ($a × $a)', '📐 Square the number', a * a);
  }
  if (difficulty == 'medium') {
    const squares = [4, 9, 16, 25, 36, 49, 64];
    final sq = squares[randInt(rng, 0, squares.length - 1)];
    return _bonus(meta, 'What is √$sq?', '📐 Find the square root', sqrt(sq));
  }
  final a = randInt(rng, 2, 5);
  final b = randInt(rng, 2, 5);
  return _bonus(meta, '$a² + $b² = ?', '📐 Square each, then add', a * a + b * b);
}

final List<_BonusGenerator> _allBonusGenerators = [
  _genMultiStep,
  _genPercentage,
  _genRatio,
  _genOrderOfOps,
  _genNegatives,
  _genPowers,
];

/// [count] bonus puzzles, each from a different generator (shuffled; with
/// more than six they repeat).
List<MissionPuzzle> generateBonusPuzzles(String difficulty, int count, Random rng) {
  final gens = shuffled(_allBonusGenerators, rng);
  return [for (var i = 0; i < count; i++) gens[i % gens.length](difficulty, rng)];
}
