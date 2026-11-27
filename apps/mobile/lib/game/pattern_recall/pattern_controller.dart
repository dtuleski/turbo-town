import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'logic.dart';

typedef PatternArgs = ({String theme, String difficulty, QuestContext? quest});

GameSessionArgs patternSessionArgs(PatternArgs a) => (
      themeId: 'PATTERN_RECALL',
      difficulty: patternDifficultyById(a.difficulty)?.apiValue ?? 1,
      questContext: a.quest,
      challengeDay: null,
    );

enum PatternPhase { playback, input, correct, wrong, gameOver }

enum PatternFeedback { correct, wrong }

class PatternState {
  const PatternState({
    required this.items,
    required this.sequence,
    this.phase = PatternPhase.playback,
    this.playbackIndex = -1,
    this.inputIndex = 0,
    this.round = 1,
    this.lives = kPatternMaxLives,
    this.totalTaps = 0,
    this.feedbackItem,
    this.feedback,
  });

  final List<PatternItem> items;
  final List<int> sequence;
  final PatternPhase phase;

  /// Index into [sequence] being lit during playback, or -1.
  final int playbackIndex;
  final int inputIndex;
  final int round;
  final int lives;
  final int totalTaps;
  final int? feedbackItem;
  final PatternFeedback? feedback;

  /// Item tile currently lit (by playback).
  int? get litItem => phase == PatternPhase.playback && playbackIndex >= 0
      ? sequence[playbackIndex]
      : null;

  PatternState copyWith({
    List<int>? sequence,
    PatternPhase? phase,
    int? playbackIndex,
    int? inputIndex,
    int? round,
    int? lives,
    int? totalTaps,
    int? Function()? feedbackItem,
    PatternFeedback? Function()? feedback,
  }) =>
      PatternState(
        items: items,
        sequence: sequence ?? this.sequence,
        phase: phase ?? this.phase,
        playbackIndex: playbackIndex ?? this.playbackIndex,
        inputIndex: inputIndex ?? this.inputIndex,
        round: round ?? this.round,
        lives: lives ?? this.lives,
        totalTaps: totalTaps ?? this.totalTaps,
        feedbackItem: feedbackItem != null ? feedbackItem() : this.feedbackItem,
        feedback: feedback != null ? feedback() : this.feedback,
      );
}

PatternState _newState(PatternArgs args, Random rng) {
  final theme = patternThemeById(args.theme) ?? kPatternThemes.first;
  final diff = patternDifficultyById(args.difficulty) ?? kPatternDifficulties.first;
  final items = getGridItems(theme, diff);
  return PatternState(items: items, sequence: generateInitialSequence(items.length, rng));
}

/// Pattern Recall board: the pattern plays, the player repeats it, and each
/// correct round adds one item. A wrong tap costs a life and replays the same
/// pattern; no lives ends the round.
class PatternController extends StateNotifier<PatternState> {
  PatternController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _timers = SessionTimers(_session),
        super(_newState(args, random ?? Random())) {
    _play();
  }

  final GameSessionController _session;
  final GameFeedback _feedback;
  final PatternArgs args;
  final Random _rng;
  final SessionTimers _timers;

  PatternDifficulty get config =>
      patternDifficultyById(args.difficulty) ?? kPatternDifficulties.first;

  void _play() {
    state = state.copyWith(phase: PatternPhase.playback, playbackIndex: -1, inputIndex: 0);
    final speed = config.playbackMs;
    final n = state.sequence.length;
    for (var i = 0; i < n; i++) {
      _timers.later(Duration(milliseconds: i * speed), () {
        if (state.phase == PatternPhase.playback) state = state.copyWith(playbackIndex: i);
      });
      _timers.later(Duration(milliseconds: (i * speed + speed * 0.7).round()), () {
        if (state.phase == PatternPhase.playback) state = state.copyWith(playbackIndex: -1);
      });
    }
    _timers.later(Duration(milliseconds: n * speed + 300), () {
      if (state.phase != PatternPhase.playback) return;
      state = state.copyWith(phase: PatternPhase.input, playbackIndex: -1, inputIndex: 0);
    });
  }

  void tap(int index) {
    if (state.phase != PatternPhase.input || _session.state.phase != SessionPhase.playing) {
      return;
    }
    final taps = state.totalTaps + 1;
    _session.addAttempt();
    if (validateTap(state.sequence, state.inputIndex, index)) {
      _feedback.haptic(HapticKind.light);
      state = state.copyWith(
        totalTaps: taps,
        feedbackItem: () => index,
        feedback: () => PatternFeedback.correct,
      );
      _clearFeedback(200);
      final next = state.inputIndex + 1;
      if (next >= state.sequence.length) {
        state = state.copyWith(phase: PatternPhase.correct);
        _timers.later(const Duration(milliseconds: 800), () {
          state = state.copyWith(
            sequence: extendSequence(state.sequence, state.items.length, _rng),
            round: state.round + 1,
          );
          _play();
        });
      } else {
        state = state.copyWith(inputIndex: next);
      }
      return;
    }
    _feedback.haptic(HapticKind.error);
    final lives = state.lives - 1;
    state = state.copyWith(
      totalTaps: taps,
      lives: lives,
      phase: PatternPhase.wrong,
      feedbackItem: () => index,
      feedback: () => PatternFeedback.wrong,
    );
    _timers.later(const Duration(milliseconds: 400), () {
      state = state.copyWith(feedbackItem: () => null, feedback: () => null);
      if (lives <= 0) {
        state = state.copyWith(phase: PatternPhase.gameOver);
      } else {
        _play();
      }
    });
  }

  void _clearFeedback(int ms) {
    _timers.later(Duration(milliseconds: ms), () {
      if (state.feedback == PatternFeedback.correct) {
        state = state.copyWith(feedbackItem: () => null, feedback: () => null);
      }
    });
  }

  /// "See Score" after losing all lives.
  void seeScore() {
    if (state.phase != PatternPhase.gameOver) return;
    _timers.cancelAll();
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {'correctAnswers': state.round - 1, 'totalQuestions': state.round},
      attempts: state.totalTaps,
    );
  }

  void restart() {
    _timers.cancelAll();
    state = _newState(args, _rng);
    _play();
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final patternControllerProvider = StateNotifierProvider.family
    .autoDispose<PatternController, PatternState, PatternArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(patternSessionArgs(args)).notifier);
  return PatternController(session, ref.watch(gameFeedbackProvider), args);
});
