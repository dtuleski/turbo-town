import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'logic.dart';

typedef SequenceArgs = ({String difficulty, String theme, QuestContext? quest});

GameSessionArgs sequenceSessionArgs(SequenceArgs a) => (
      themeId: 'SEQUENCE_MEMORY',
      difficulty: seqDifficulty(a.difficulty).apiValue,
      questContext: a.quest,
      challengeDay: null,
    );

enum SeqPhase { showing, answering, correct, gameOver }

class SequenceState {
  const SequenceState({
    required this.challenge,
    required this.bank,
    this.round = 0,
    this.phase = SeqPhase.showing,
    this.countdown = 0,
    this.answerIndex = 0,
    this.lives = kSeqMaxLives,
    this.correctRounds = 0,
    this.mistakes = 0,
    this.wrongFlash,
    this.correctFlash,
  });

  final List<DriverCard> challenge;

  /// All drivers of the theme in the order shown in the answer bank.
  final List<DriverCard> bank;

  /// 0-based; round N shows cards 0..N.
  final int round;
  final SeqPhase phase;
  final int countdown;
  final int answerIndex;
  final int lives;
  final int correctRounds;
  final int mistakes;
  final String? wrongFlash;
  final String? correctFlash;

  /// Cards face up during [SeqPhase.showing].
  Set<String> get revealed => phase == SeqPhase.showing
      ? {for (final c in challenge.take(round + 1)) c.id}
      : const {};

  SequenceState copyWith({
    int? round,
    SeqPhase? phase,
    int? countdown,
    int? answerIndex,
    int? lives,
    int? correctRounds,
    int? mistakes,
    String? Function()? wrongFlash,
    String? Function()? correctFlash,
  }) =>
      SequenceState(
        challenge: challenge,
        bank: bank,
        round: round ?? this.round,
        phase: phase ?? this.phase,
        countdown: countdown ?? this.countdown,
        answerIndex: answerIndex ?? this.answerIndex,
        lives: lives ?? this.lives,
        correctRounds: correctRounds ?? this.correctRounds,
        mistakes: mistakes ?? this.mistakes,
        wrongFlash: wrongFlash != null ? wrongFlash() : this.wrongFlash,
        correctFlash: correctFlash != null ? correctFlash() : this.correctFlash,
      );
}

SequenceState _newState(SequenceArgs args, Random rng) {
  final cfg = seqDifficulty(args.difficulty);
  final theme = seqThemeId(args.theme);
  return SequenceState(
    challenge: pickChallengeCards(theme, cfg.cards, rng),
    bank: shuffled(seqDrivers(theme), rng),
    countdown: cfg.viewTime,
  );
}

/// Sequence Memory board: each round shows the cards 0..N for a few seconds,
/// then the player taps them back in order from the shuffled bank. A wrong tap
/// costs a life; three lives lost ends the round (the server still scores the
/// rounds completed).
class SequenceController extends StateNotifier<SequenceState> {
  SequenceController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _timers = SessionTimers(_session),
        super(_newState(args, random ?? Random())) {
    _startShowing();
  }

  final GameSessionController _session;
  final GameFeedback _feedback;
  final SequenceArgs args;
  final Random _rng;
  final SessionTimers _timers;

  SeqDifficulty get config => seqDifficulty(args.difficulty);

  void _startShowing() {
    state = state.copyWith(
      phase: SeqPhase.showing,
      countdown: config.viewTime,
      answerIndex: 0,
    );
    _tick();
  }

  void _tick() {
    _timers.later(const Duration(seconds: 1), () {
      if (state.phase != SeqPhase.showing) return;
      final left = state.countdown - 1;
      if (left <= 0) {
        state = state.copyWith(phase: SeqPhase.answering, countdown: 0, answerIndex: 0);
      } else {
        state = state.copyWith(countdown: left);
        _tick();
      }
    });
  }

  void tap(DriverCard driver) {
    if (state.phase != SeqPhase.answering || _session.state.phase != SessionPhase.playing) {
      return;
    }
    final expected = state.challenge[state.answerIndex];
    if (driver.id == expected.id) {
      _feedback.haptic(HapticKind.light);
      _flashCorrect(driver.id);
      final next = state.answerIndex + 1;
      if (next > state.round) {
        final done = state.correctRounds + 1;
        if (state.round + 1 >= state.challenge.length) {
          state = state.copyWith(correctRounds: done, answerIndex: next);
          _finish(done);
        } else {
          state = state.copyWith(correctRounds: done, phase: SeqPhase.correct);
          _timers.later(const Duration(milliseconds: 800), () {
            state = state.copyWith(round: state.round + 1);
            _startShowing();
          });
        }
      } else {
        state = state.copyWith(answerIndex: next);
      }
      return;
    }
    // Wrong card: lose a life, stay on the same card.
    _feedback.haptic(HapticKind.error);
    final lives = state.lives - 1;
    state = state.copyWith(
      lives: lives,
      mistakes: state.mistakes + 1,
      wrongFlash: () => driver.id,
      phase: lives <= 0 ? SeqPhase.gameOver : null,
    );
    _timers.later(const Duration(milliseconds: 500), () {
      if (state.wrongFlash == driver.id) state = state.copyWith(wrongFlash: () => null);
    });
  }

  void _flashCorrect(String id) {
    state = state.copyWith(correctFlash: () => id);
    _timers.later(const Duration(milliseconds: 400), () {
      if (state.correctFlash == id) state = state.copyWith(correctFlash: () => null);
    });
  }

  /// "See Score" after losing all lives.
  void seeScore() {
    if (state.phase != SeqPhase.gameOver) return;
    _finish(state.correctRounds);
  }

  void _finish(int rounds) {
    _timers.cancelAll();
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {'correctAnswers': rounds, 'totalQuestions': config.cards},
      attempts: rounds + state.mistakes,
    );
  }

  void restart() {
    _timers.cancelAll();
    state = _newState(args, _rng);
    _startShowing();
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final sequenceControllerProvider = StateNotifierProvider.family
    .autoDispose<SequenceController, SequenceState, SequenceArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(sequenceSessionArgs(args)).notifier);
  return SequenceController(session, ref.watch(gameFeedbackProvider), args);
});
