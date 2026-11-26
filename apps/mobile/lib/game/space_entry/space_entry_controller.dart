import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'config.dart';
import 'physics.dart';
import 'puzzles.dart';

typedef SpaceEntryArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs spaceEntrySessionArgs(SpaceEntryArgs a) => (
      themeId: 'SPACE_ENTRY',
      difficulty: spaceEntryDifficultyValue(a.difficulty),
      questContext: a.quest,
      challengeDay: null,
    );

enum SpacePhase { setup, reentry, results }

/// One puzzle on the console and what the player did with it.
class PuzzleSlot {
  const PuzzleSlot(this.id, this.puzzle, {this.submitted = false, this.value, this.correct});

  /// `angle`, `thruster`, `lateral` or `bonus-<n>`.
  final String id;
  final MissionPuzzle puzzle;
  final bool submitted;
  final double? value;
  final bool? correct;

  PuzzleSlot answered(double v) =>
      PuzzleSlot(id, puzzle, submitted: true, value: v, correct: isCorrectAnswer(puzzle, v));
}

class SpaceEntryState {
  const SpaceEntryState({
    required this.config,
    required this.zone,
    required this.slots,
    required this.countdown,
    this.tries = 1,
    this.phase = SpacePhase.setup,
    this.finalResult,
  });

  final SpaceEntryConfig config;
  final LandingZone zone;
  final List<PuzzleSlot> slots;

  /// Seconds left before the auto-fire.
  final int countdown;

  /// Missions started this round; the server gets it as `attempts`.
  final int tries;
  final SpacePhase phase;
  final LandingPrediction? finalResult;

  PuzzleSlot? slot(String id) {
    for (final s in slots) {
      if (s.id == id) return s;
    }
    return null;
  }

  List<PuzzleSlot> get controls => [
        for (final s in slots)
          if (s.puzzle.type != PuzzleType.bonus) s,
      ];
  List<PuzzleSlot> get bonus => [
        for (final s in slots)
          if (s.puzzle.type == PuzzleType.bonus) s,
      ];

  int get totalPuzzles => config.totalPuzzles;
  int get submittedCount => slots.where((s) => s.submitted).length;
  int get controlSubmittedCount => controls.where((s) => s.submitted).length;
  bool get allSubmitted => slots.isNotEmpty && slots.every((s) => s.submitted);
  int get totalCorrect => slots.where((s) => s.correct == true).length;

  /// Control values the physics uses: a control that is not answered yet
  /// counts as 0 (angle, lateral) or the ideal thrust (web).
  double get resolvedAngle => _value('angle', 0);
  double get resolvedThruster {
    final s = slot('thruster');
    if (s == null || !s.submitted) return config.optimalThrusterPower;
    final v = s.value ?? 0;
    return v == 0 ? 50 : v;
  }

  double get resolvedLateral => _value('lateral', 0);

  double _value(String id, double fallback) {
    final s = slot(id);
    return (s != null && s.submitted) ? (s.value ?? 0) : fallback;
  }

  /// Where the craft would land with the answers so far.
  LandingPrediction get prediction => predictLanding(
        zone.latitude,
        zone.longitude,
        resolvedAngle,
        resolvedThruster,
        resolvedLateral,
        config,
      );

  SpaceEntryState copyWith({
    List<PuzzleSlot>? slots,
    int? countdown,
    int? tries,
    SpacePhase? phase,
    LandingPrediction? Function()? finalResult,
  }) =>
      SpaceEntryState(
        config: config,
        zone: zone,
        slots: slots ?? this.slots,
        countdown: countdown ?? this.countdown,
        tries: tries ?? this.tries,
        phase: phase ?? this.phase,
        finalResult: finalResult != null ? finalResult() : this.finalResult,
      );
}

List<PuzzleSlot> _newPuzzles(SpaceEntryConfig config, String difficulty, Random rng) {
  return [
    PuzzleSlot('angle', generateAnglePuzzle(difficulty, rng)),
    if (config.showThrusterPower) PuzzleSlot('thruster', generateThrusterPuzzle(difficulty, rng)),
    if (config.showLateralCorrection) PuzzleSlot('lateral', generateLateralPuzzle(difficulty, rng)),
    for (final (i, p) in generateBonusPuzzles(difficulty, config.bonusPuzzleCount, rng).indexed)
      PuzzleSlot('bonus-$i', p),
  ];
}

SpaceEntryState _newState(String difficulty, Random rng) {
  final config = spaceEntryConfig(difficulty);
  final zone = randomLandingZone(rng);
  return SpaceEntryState(
    config: config,
    zone: zone,
    slots: _newPuzzles(config, difficulty, rng),
    countdown: config.countdownSeconds,
  );
}

/// Space Entry: answer the console puzzles, then fire. The answers move the
/// predicted landing spot over the target. Only a successful landing can be
/// scored; a burn-up or skip-off sends the player back for another mission.
class SpaceEntryController extends StateNotifier<SpaceEntryState> {
  SpaceEntryController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _timers = SessionTimers(_session),
        super(_newState(args.difficulty, random ?? Random()));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final SpaceEntryArgs args;
  final Random _rng;
  final SessionTimers _timers;

  bool get _playing => _session.phase == SessionPhase.playing;

  /// Answers the puzzle [id] with the typed text. Ignored when it is not a
  /// number, already answered, or the mission is under way.
  void submit(String id, String raw) {
    if (state.phase != SpacePhase.setup || !_playing) return;
    final slot = state.slot(id);
    if (slot == null || slot.submitted) return;
    final value = parseAnswer(raw);
    if (value == null) return;
    final answered = slot.answered(value);
    _feedback.haptic(answered.correct == true ? HapticKind.light : HapticKind.error);
    state = state.copyWith(slots: [for (final s in state.slots) s.id == id ? answered : s]);
  }

  /// One second of the countdown. At zero the mission fires by itself.
  void tick() {
    if (state.phase != SpacePhase.setup || !_playing) return;
    final next = state.countdown - 1;
    if (next <= 0) {
      state = state.copyWith(countdown: 0);
      fire(auto: true);
      return;
    }
    state = state.copyWith(countdown: next);
  }

  /// Starts the reentry. The button needs every puzzle answered; the
  /// countdown does not.
  void fire({bool auto = false}) {
    if (state.phase != SpacePhase.setup || !_playing) return;
    if (!auto && !state.allSubmitted) return;
    final range = state.config.turbulenceRange;
    final turbulence = range > 0 ? (_rng.nextDouble() * 2 - 1) * range : 0.0;
    final result = predictLanding(
      state.zone.latitude,
      state.zone.longitude,
      state.resolvedAngle,
      state.resolvedThruster,
      state.resolvedLateral,
      state.config,
      turbulence,
    );
    state = state.copyWith(phase: SpacePhase.reentry, finalResult: () => result);
    _timers.later(kReentryDuration, () {
      if (state.phase != SpacePhase.reentry) return;
      if (result.outcome == LandingOutcome.successfulLanding) {
        _feedback.play(SoundCue.celebration);
        _feedback.haptic(HapticKind.success);
      } else {
        _feedback.haptic(HapticKind.error);
      }
      state = state.copyWith(phase: SpacePhase.results);
    });
  }

  /// "Retry Mission": same target, new puzzles, full countdown.
  void retry() {
    if (state.phase != SpacePhase.results) return;
    state = SpaceEntryState(
      config: state.config,
      zone: state.zone,
      slots: _newPuzzles(state.config, args.difficulty, _rng),
      countdown: state.config.countdownSeconds,
      tries: state.tries + 1,
    );
  }

  /// "View Score": submits the round after a successful landing. The time is
  /// the last mission's, as on the web.
  void seeScore() {
    final result = state.finalResult;
    if (state.phase != SpacePhase.results ||
        result == null ||
        result.outcome != LandingOutcome.successfulLanding) {
      return;
    }
    _timers.cancelAll();
    final used = state.config.countdownSeconds - state.countdown;
    _session.complete(
      extra: {'correctAnswers': state.totalCorrect, 'totalQuestions': state.totalPuzzles},
      attempts: state.tries,
      completionSeconds: used < 1 ? 1 : used,
    );
  }

  /// Play Again from the result page: a new target and new puzzles.
  void restart() {
    _timers.cancelAll();
    state = _newState(args.difficulty, _rng);
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final spaceEntryControllerProvider = StateNotifierProvider.family
    .autoDispose<SpaceEntryController, SpaceEntryState, SpaceEntryArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(spaceEntrySessionArgs(args)).notifier);
  return SpaceEntryController(session, ref.watch(gameFeedbackProvider), args);
});
