import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import 'quiz_questions.dart';

/// Local points for a correct answer: 100 + 10 per second left + 25 per
/// answer already in the streak. Same as the web quiz pages. This is only the
/// number shown during play; the saved score always comes from the server.
int quizPoints({required int timeLeft, required int streak}) =>
    100 + max(0, timeLeft) * 10 + streak * 25;

/// Difficulty name (`easy`/`medium`/`hard`) to the 1-3 the backend takes.
int quizDifficultyNumber(String difficulty) => switch (difficulty) {
      'medium' => 2,
      'hard' => 3,
      _ => 1,
    };

/// Rules of one quiz game: which server theme, how long a question lasts,
/// how long the answer stays on screen and how questions are built.
class QuizSpec {
  const QuizSpec({
    required this.themeId,
    required this.difficulty,
    required this.secondsPerQuestion,
    required this.feedbackDelay,
    required this.build,
    this.hintsEnabled = true,
  });

  final String themeId;
  final int difficulty;
  final int secondsPerQuestion;
  final Duration feedbackDelay;
  final bool hintsEnabled;
  final List<QuizQuestion> Function(Random rng) build;

  GameSessionArgs sessionArgs(QuestContext? quest) =>
      (themeId: themeId, difficulty: difficulty, questContext: quest);
}

enum QuizPhase { answering, feedback }

class QuizState {
  const QuizState({
    required this.questions,
    this.index = 0,
    this.phase = QuizPhase.answering,
    this.selected,
    this.isCorrect = false,
    required this.timeLeft,
    this.secondsOnQuestion = 0,
    this.correctCount = 0,
    this.streak = 0,
    this.bestStreak = 0,
    this.score = 0,
  });

  final List<QuizQuestion> questions;
  final int index;
  final QuizPhase phase;

  /// The tapped option, or the empty string when time ran out.
  final String? selected;
  final bool isCorrect;
  final int timeLeft;
  final int secondsOnQuestion;
  final int correctCount;
  final int streak;
  final int bestStreak;
  final int score;

  int get total => questions.length;
  QuizQuestion get current => questions[index];
  bool get showHint1 => secondsOnQuestion >= 5;
  bool get showHint2 => secondsOnQuestion >= 10;

  QuizState copyWith({
    List<QuizQuestion>? questions,
    int? index,
    QuizPhase? phase,
    String? selected,
    bool clearSelected = false,
    bool? isCorrect,
    int? timeLeft,
    int? secondsOnQuestion,
    int? correctCount,
    int? streak,
    int? bestStreak,
    int? score,
  }) =>
      QuizState(
        questions: questions ?? this.questions,
        index: index ?? this.index,
        phase: phase ?? this.phase,
        selected: clearSelected ? null : (selected ?? this.selected),
        isCorrect: isCorrect ?? this.isCorrect,
        timeLeft: timeLeft ?? this.timeLeft,
        secondsOnQuestion: secondsOnQuestion ?? this.secondsOnQuestion,
        correctCount: correctCount ?? this.correctCount,
        streak: streak ?? this.streak,
        bestStreak: bestStreak ?? this.bestStreak,
        score: score ?? this.score,
      );
}

/// Shared engine for Geo, History and Civics quizzes. It owns the question
/// list, the per-question countdown and the answer feedback. The round (start
/// call, total time, completion) stays with [GameSessionController].
class QuizEngine extends StateNotifier<QuizState> {
  QuizEngine(this._session, this._feedback, this.spec, {Random? random})
      : _rng = random ?? Random(),
        super(QuizState(questions: const [], timeLeft: spec.secondsPerQuestion)) {
    state = _fresh();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  final GameSessionController _session;
  final GameFeedback _feedback;
  final QuizSpec spec;
  final Random _rng;
  Timer? _ticker;
  Timer? _advance;
  int _generation = 0;

  QuizState _fresh() {
    final questions = spec.build(_rng);
    return QuizState(questions: questions, timeLeft: spec.secondsPerQuestion);
  }

  void _tick() {
    if (!mounted ||
        _session.state.phase != SessionPhase.playing ||
        state.phase != QuizPhase.answering ||
        state.questions.isEmpty) {
      return;
    }
    final elapsed = state.secondsOnQuestion + 1;
    final left = spec.secondsPerQuestion - elapsed;
    if (left <= 0) {
      state = state.copyWith(secondsOnQuestion: elapsed, timeLeft: 0);
      answer('');
    } else {
      state = state.copyWith(secondsOnQuestion: elapsed, timeLeft: left);
    }
  }

  /// Records [option] for the current question. An empty string means the
  /// time ran out, which counts as wrong.
  void answer(String option) {
    if (_session.state.phase != SessionPhase.playing ||
        state.phase != QuizPhase.answering ||
        state.questions.isEmpty) {
      return;
    }
    final correct = option == state.current.correctAnswer;
    final streak = correct ? state.streak + 1 : 0;
    state = state.copyWith(
      phase: QuizPhase.feedback,
      selected: option,
      isCorrect: correct,
      correctCount: state.correctCount + (correct ? 1 : 0),
      streak: streak,
      bestStreak: max(state.bestStreak, streak),
      score: state.score +
          (correct ? quizPoints(timeLeft: state.timeLeft, streak: state.streak) : 0),
    );
    _feedback.haptic(correct ? HapticKind.success : HapticKind.error);
    _scheduleAdvance();
  }

  void _scheduleAdvance([Duration? delay]) {
    _advance?.cancel();
    final generation = _generation;
    _advance = Timer(delay ?? spec.feedbackDelay, () {
      if (!mounted || generation != _generation) return;
      final phase = _session.state.phase;
      if (phase == SessionPhase.paused) {
        // Wait out the pause, then continue.
        _scheduleAdvance(const Duration(milliseconds: 250));
        return;
      }
      if (phase != SessionPhase.playing) return;
      _next();
    });
  }

  void _next() {
    if (state.index + 1 >= state.total) {
      _ticker?.cancel();
      _feedback.play(SoundCue.celebration);
      _session.complete(
        extra: {'correctAnswers': state.correctCount, 'totalQuestions': state.total},
        attempts: state.total,
      );
      return;
    }
    state = state.copyWith(
      index: state.index + 1,
      phase: QuizPhase.answering,
      clearSelected: true,
      isCorrect: false,
      timeLeft: spec.secondsPerQuestion,
      secondsOnQuestion: 0,
    );
  }

  /// New questions for another round with the same settings.
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
