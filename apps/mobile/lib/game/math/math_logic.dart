import 'dart:math';

/// Pure Math Challenge rules. Port of apps/web `utils/mathUtils.ts` and the
/// difficulty table in `pages/math/MathGamePage.tsx`.
enum MathOperation { addition, subtraction, multiplication, division, power, root }

class MathQuestion {
  const MathQuestion({
    required this.question,
    required this.answer,
    required this.operation,
  });

  final String question;
  final int answer;
  final MathOperation operation;
}

class MathDifficulty {
  const MathDifficulty({
    required this.id,
    required this.emoji,
    required this.operations,
    required this.questions,
    required this.timeLimit,
    required this.apiValue,
  });

  final String id;
  final String emoji;
  final List<MathOperation> operations;
  final int questions;

  /// Seconds for the whole round.
  final int timeLimit;
  final int apiValue;
}

const List<MathDifficulty> kMathDifficulties = [
  MathDifficulty(
    id: 'easy',
    emoji: '🟢',
    operations: [MathOperation.addition, MathOperation.subtraction],
    questions: 10,
    timeLimit: 120,
    apiValue: 1,
  ),
  MathDifficulty(
    id: 'medium',
    emoji: '🟡',
    operations: [
      MathOperation.addition,
      MathOperation.subtraction,
      MathOperation.multiplication,
      MathOperation.division,
    ],
    questions: 15,
    timeLimit: 180,
    apiValue: 2,
  ),
  MathDifficulty(
    id: 'hard',
    emoji: '🔴',
    operations: MathOperation.values,
    questions: 20,
    timeLimit: 240,
    apiValue: 3,
  ),
];

/// The config for [id]; anything unknown is Easy (as on web).
MathDifficulty mathDifficultyById(String? id) =>
    kMathDifficulties.firstWhere((d) => d.id == id, orElse: () => kMathDifficulties.first);

int _randInt(Random rng, int min, int max) => min + rng.nextInt(max - min + 1);

MathQuestion _addition(String difficulty, Random rng) {
  final max = difficulty == 'easy' ? 20 : difficulty == 'medium' ? 50 : 100;
  final a = _randInt(rng, 1, max);
  final b = _randInt(rng, 1, max);
  return MathQuestion(question: '$a + $b = ?', answer: a + b, operation: MathOperation.addition);
}

MathQuestion _subtraction(String difficulty, Random rng) {
  final max = difficulty == 'easy' ? 20 : difficulty == 'medium' ? 50 : 100;
  final a = _randInt(rng, 1, max);
  final b = _randInt(rng, 1, a); // keeps the result positive
  return MathQuestion(question: '$a - $b = ?', answer: a - b, operation: MathOperation.subtraction);
}

MathQuestion _multiplication(String difficulty, Random rng) {
  final max = difficulty == 'medium' ? 12 : 20;
  final a = _randInt(rng, 2, max);
  final b = _randInt(rng, 2, max);
  return MathQuestion(question: '$a × $b = ?', answer: a * b, operation: MathOperation.multiplication);
}

MathQuestion _division(String difficulty, Random rng) {
  final max = difficulty == 'medium' ? 12 : 20;
  final divisor = _randInt(rng, 2, max);
  final quotient = _randInt(rng, 2, max);
  return MathQuestion(
    question: '${divisor * quotient} ÷ $divisor = ?',
    answer: quotient,
    operation: MathOperation.division,
  );
}

MathQuestion _power(Random rng) {
  final base = _randInt(rng, 2, 10);
  final exponent = _randInt(rng, 2, 3);
  return MathQuestion(
    question: '$base^$exponent = ?',
    answer: pow(base, exponent).toInt(),
    operation: MathOperation.power,
  );
}

MathQuestion _root(Random rng) {
  final root = _randInt(rng, 2, 12);
  return MathQuestion(question: '√${root * root} = ?', answer: root, operation: MathOperation.root);
}

MathQuestion _forOperation(MathOperation op, String difficulty, Random rng) => switch (op) {
      MathOperation.addition => _addition(difficulty, rng),
      MathOperation.subtraction => _subtraction(difficulty, rng),
      MathOperation.multiplication => _multiplication(difficulty, rng),
      MathOperation.division => _division(difficulty, rng),
      MathOperation.power => _power(rng),
      MathOperation.root => _root(rng),
    };

/// A question from one of [operations], different from [previous] when it can
/// be (up to 10 tries, like web).
MathQuestion generateMathQuestion(
  List<MathOperation> operations,
  String difficulty,
  Random rng, {
  String? previous,
}) {
  const maxAttempts = 10;
  for (var i = 0; i < maxAttempts; i++) {
    final op = operations[rng.nextInt(operations.length)];
    final q = _forOperation(op, difficulty, rng);
    if (q.question != previous || i == maxAttempts - 1) return q;
  }
  return _addition(difficulty, rng);
}

/// Web allows a 0.01 float tolerance.
bool checkMathAnswer(MathQuestion question, double userAnswer) =>
    (question.answer - userAnswer).abs() < 0.01;

/// Parses what the player typed. Null when it is not a number.
double? parseMathInput(String text) => double.tryParse(text.trim());
