import 'dart:math';

import 'package:dashden_mobile/game/math/math_logic.dart';
import 'package:flutter_test/flutter_test.dart';

/// Parses "a OP b = ?" and checks the stored answer.
void _verify(MathQuestion q) {
  final text = q.question;
  switch (q.operation) {
    case MathOperation.addition:
      final m = RegExp(r'^(\d+) \+ (\d+) = \?$').firstMatch(text)!;
      expect(int.parse(m[1]!) + int.parse(m[2]!), q.answer);
    case MathOperation.subtraction:
      final m = RegExp(r'^(\d+) - (\d+) = \?$').firstMatch(text)!;
      expect(int.parse(m[1]!) - int.parse(m[2]!), q.answer);
      expect(q.answer, greaterThanOrEqualTo(0));
    case MathOperation.multiplication:
      final m = RegExp(r'^(\d+) × (\d+) = \?$').firstMatch(text)!;
      expect(int.parse(m[1]!) * int.parse(m[2]!), q.answer);
    case MathOperation.division:
      final m = RegExp(r'^(\d+) ÷ (\d+) = \?$').firstMatch(text)!;
      expect(int.parse(m[1]!) / int.parse(m[2]!), q.answer.toDouble());
    case MathOperation.power:
      final m = RegExp(r'^(\d+)\^(\d+) = \?$').firstMatch(text)!;
      expect(pow(int.parse(m[1]!), int.parse(m[2]!)), q.answer);
    case MathOperation.root:
      final m = RegExp(r'^√(\d+) = \?$').firstMatch(text)!;
      expect(sqrt(int.parse(m[1]!)), q.answer.toDouble());
  }
}

void main() {
  final rng = Random(3);

  test('difficulty table matches the web page', () {
    final easy = mathDifficultyById('easy');
    final medium = mathDifficultyById('medium');
    final hard = mathDifficultyById('hard');
    expect([easy.questions, medium.questions, hard.questions], [10, 15, 20]);
    expect([easy.timeLimit, medium.timeLimit, hard.timeLimit], [120, 180, 240]);
    expect([easy.apiValue, medium.apiValue, hard.apiValue], [1, 2, 3]);
    expect(easy.operations, [MathOperation.addition, MathOperation.subtraction]);
    expect(medium.operations.length, 4);
    expect(hard.operations.length, 6);
    expect(mathDifficultyById('nope').id, 'easy');
    expect(mathDifficultyById(null).id, 'easy');
  });

  test('every operation produces a correct question in range', () {
    for (final d in kMathDifficulties) {
      for (var i = 0; i < 300; i++) {
        final q = generateMathQuestion(d.operations, d.id, rng);
        expect(d.operations, contains(q.operation));
        _verify(q);
      }
    }
  });

  test('easy numbers stay at 20 or below, hard sums reach past 20', () {
    var hardMax = 0;
    for (var i = 0; i < 400; i++) {
      final e = generateMathQuestion(const [MathOperation.addition], 'easy', rng);
      expect(e.answer, lessThanOrEqualTo(40));
      final h = generateMathQuestion(const [MathOperation.addition], 'hard', rng);
      hardMax = max(hardMax, h.answer);
    }
    expect(hardMax, greaterThan(40));
  });

  test('multiplication and division factors follow the difficulty', () {
    for (var i = 0; i < 300; i++) {
      final m = generateMathQuestion(const [MathOperation.multiplication], 'medium', rng);
      expect(m.answer, lessThanOrEqualTo(144));
      final d = generateMathQuestion(const [MathOperation.division], 'medium', rng);
      expect(d.answer, inInclusiveRange(2, 12));
      final r = generateMathQuestion(const [MathOperation.root], 'hard', rng);
      expect(r.answer, inInclusiveRange(2, 12));
      final p = generateMathQuestion(const [MathOperation.power], 'hard', rng);
      expect(p.answer, inInclusiveRange(4, 1000));
    }
  });

  test('a question differs from the previous one when it can', () {
    var q = generateMathQuestion(const [MathOperation.addition], 'easy', rng);
    for (var i = 0; i < 100; i++) {
      final next = generateMathQuestion(const [MathOperation.addition], 'easy', rng,
          previous: q.question);
      expect(next.question, isNot(q.question));
      q = next;
    }
  });

  test('checkMathAnswer allows 0.01 and parses typed input', () {
    const q = MathQuestion(question: '2 + 2 = ?', answer: 4, operation: MathOperation.addition);
    expect(checkMathAnswer(q, 4), isTrue);
    expect(checkMathAnswer(q, 4.005), isTrue);
    expect(checkMathAnswer(q, 4.02), isFalse);
    expect(checkMathAnswer(q, 5), isFalse);
    expect(parseMathInput(' 12 '), 12);
    expect(parseMathInput('-3'), -3);
    expect(parseMathInput('abc'), isNull);
    expect(parseMathInput(''), isNull);
  });
}
