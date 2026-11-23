import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import 'math_logic.dart';

/// Time the right/wrong message stays before the next question (web: 1500 ms).
const Duration kMathFeedbackDelay = Duration(milliseconds: 1500);

typedef MathArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs mathSessionArgs(MathArgs args) => (
      themeId: 'MATH_CHALLENGE',
      difficulty: mathDifficultyById(args.difficulty).apiValue,
      questContext: args.quest,
    );

class MathState {
  const MathState({
    required this.question,
    this.number = 1,
    this.correctCount = 0,
    required this.timeRemaining,
    this.feedbackShown = false,
    this.lastCorrect = false,
  });

  final MathQuestion question;

  /// 1-based number of the question on screen.
  final int number;
  final int correctCount;
  final int timeRemaining;
  final bool feedbackShown;
  final bool lastCorrect;

  MathState copyWith({
    MathQuestion? question,
    int? number,
    int? correctCount,
    int? timeRemaining,
    bool? feedbackShown,
    bool? lastCorrect,
  }) =>
      MathState(
        question: question ?? this.question,
        number: number ?? this.number,
        correctCount: correctCount ?? this.correctCount,
        timeRemaining: timeRemaining ?? this.timeRemaining,
        feedbackShown: feedbackShown ?? this.feedbackShown,
        lastCorrect: lastCorrect ?? this.lastCorrect,
      );
}

/// Math Challenge board: one timer for the whole round (web), a fixed number
/// of questions, a short message after each answer.
class MathController extends StateNotifier<MathState> {
  MathController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _config = mathDifficultyById(args.difficulty),
        super(const MathState(
          question: MathQuestion(question: '', answer: 0, operation: MathOperation.addition),
          timeRemaining: 0,
        )) {
    state = _fresh();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  final GameSessionController _session;
  final GameFeedback _feedback;
  final MathArgs args;
  final Random _rng;
  final MathDifficulty _config;
  Timer? _ticker;
  Timer? _advance;
  int _generation = 0;

  MathDifficulty get config => _config;

  MathState _fresh() => MathState(
        question: generateMathQuestion(_config.operations, _config.id, _rng),
        timeRemaining: _config.timeLimit,
      );

  void _tick() {
    if (!mounted || _session.state.phase != SessionPhase.playing) return;
    final left = state.timeRemaining - 1;
    state = state.copyWith(timeRemaining: max(0, left));
    if (left <= 0) _finish();
  }

  /// Checks [text]. Empty input is ignored. Wrong or non-numeric input counts
  /// as a wrong answer.
  void submit(String text) {
    if (_session.state.phase != SessionPhase.playing ||
        state.feedbackShown ||
        text.trim().isEmpty) {
      return;
    }
    final value = parseMathInput(text);
    final correct = value != null && checkMathAnswer(state.question, value);
    state = state.copyWith(
      feedbackShown: true,
      lastCorrect: correct,
      correctCount: state.correctCount + (correct ? 1 : 0),
    );
    _feedback.haptic(correct ? HapticKind.success : HapticKind.error);
    _scheduleAdvance();
  }

  void _scheduleAdvance() {
    _advance?.cancel();
    final generation = _generation;
    _advance = Timer(kMathFeedbackDelay, () => _afterFeedback(generation));
  }

  void _afterFeedback(int generation) {
    if (!mounted || generation != _generation) return;
    final phase = _session.state.phase;
    if (phase == SessionPhase.paused) {
      _advance = Timer(const Duration(milliseconds: 250), () => _afterFeedback(generation));
      return;
    }
    if (phase != SessionPhase.playing) return;
    if (state.number >= _config.questions) {
      _finish();
      return;
    }
    state = state.copyWith(
      number: state.number + 1,
      feedbackShown: false,
      question: generateMathQuestion(
        _config.operations,
        _config.id,
        _rng,
        previous: state.question.question,
      ),
    );
  }

  void _finish() {
    _ticker?.cancel();
    _advance?.cancel();
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {'correctAnswers': state.correctCount, 'totalQuestions': _config.questions},
      attempts: state.number,
    );
  }

  /// New questions and a full clock for another round.
  void restart() {
    _generation++;
    _advance?.cancel();
    _ticker?.cancel();
    state = _fresh();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _advance?.cancel();
    super.dispose();
  }
}

final mathControllerProvider =
    StateNotifierProvider.family.autoDispose<MathController, MathState, MathArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(mathSessionArgs(args)).notifier);
  return MathController(session, ref.watch(gameFeedbackProvider), args);
});
