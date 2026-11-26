import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'data.dart';
import 'physics.dart';

typedef GolfArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs golfSessionArgs(GolfArgs a) => (
      themeId: 'MINI_GOLF',
      difficulty: golfDifficultyValue(a.difficulty),
      questContext: a.quest,
      challengeDay: null,
    );

/// Pauses of the web round.
const Duration kHoleSunkDelay = Duration(milliseconds: 2200);
const Duration kWaterResetDelay = Duration(milliseconds: 1500);
const Duration kHoleNameDelay = Duration(milliseconds: 2000);

/// A pull shorter than this (play-field units) is not a shot.
const double kMinDragDistance = 12;

/// A drag may start this close to the ball (play-field units).
const double kGrabRadius = 80;

enum GolfPhase { aiming, rolling, sunk, waterReset }

class GolfState {
  const GolfState({
    required this.ball,
    required this.env,
    this.holeIndex = 0,
    this.holeStrokes = const [],
    this.currentStrokes = 0,
    this.totalStrokes = 0,
    this.phase = GolfPhase.aiming,
    this.simTimeMs = 0,
    this.showHoleName = true,
    this.finished = false,
  });

  final BallState ball;
  final EnvironmentConditions env;
  final int holeIndex;

  /// Strokes of each finished hole.
  final List<int> holeStrokes;
  final int currentStrokes;
  final int totalStrokes;
  final GolfPhase phase;

  /// Simulation clock in ms; it moves the windmill blades.
  final double simTimeMs;
  final bool showHoleName;

  /// The last hole is done and the round is being submitted.
  final bool finished;

  GolfState copyWith({
    BallState? ball,
    EnvironmentConditions? env,
    int? holeIndex,
    List<int>? holeStrokes,
    int? currentStrokes,
    int? totalStrokes,
    GolfPhase? phase,
    double? simTimeMs,
    bool? showHoleName,
    bool? finished,
  }) =>
      GolfState(
        ball: ball ?? this.ball,
        env: env ?? this.env,
        holeIndex: holeIndex ?? this.holeIndex,
        holeStrokes: holeStrokes ?? this.holeStrokes,
        currentStrokes: currentStrokes ?? this.currentStrokes,
        totalStrokes: totalStrokes ?? this.totalStrokes,
        phase: phase ?? this.phase,
        simTimeMs: simTimeMs ?? this.simTimeMs,
        showHoleName: showHoleName ?? this.showHoleName,
        finished: finished ?? this.finished,
      );
}

/// Mini Golf: drag back from the ball and let go to putt. Each hole has its
/// own wind, temperature and altitude. [step] is one fixed 1/60 s physics
/// step; the screen calls it from a ticker, tests call it directly.
class GolfController extends StateNotifier<GolfState> {
  GolfController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _timers = SessionTimers(_session),
        course = golfCourse(args.difficulty),
        _holes = [for (final h in golfCourse(args.difficulty).holes) h.scaledBy(kGolfScale)],
        super(_firstState(args.difficulty, random ?? Random(), golfCourse(args.difficulty))) {
    _hideHoleNameSoon();
  }

  final GameSessionController _session;
  final GameFeedback _feedback;
  final GolfArgs args;
  final Random _rng;
  final Course course;
  final List<Hole> _holes;
  final SessionTimers _timers;

  int get maxStrokes => kGolfMaxStrokes[args.difficulty] ?? kGolfMaxStrokes['easy']!;

  /// Current hole in the web data (400x400).
  Hole get hole => course.holes[state.holeIndex];

  /// Current hole in the 600x600 play field the physics runs in.
  Hole get fieldHole => _holes[state.holeIndex];

  bool get _playing => _session.phase == SessionPhase.playing;

  static GolfState _firstState(String difficulty, Random rng, Course course) => GolfState(
        ball: BallState(pos: course.holes.first.ball.scaled(kGolfScale)),
        env: generateEnvironment(difficulty, rng.nextDouble),
      );

  void _hideHoleNameSoon() {
    _timers.later(kHoleNameDelay, () {
      if (state.showHoleName) state = state.copyWith(showHoleName: false);
    });
  }

  /// True when a drag that starts at [fieldPos] grabs the ball.
  bool canGrab(Vec2 fieldPos) =>
      _playing &&
      state.phase == GolfPhase.aiming &&
      !state.finished &&
      fieldPos.distanceTo(state.ball.pos) < kGrabRadius;

  /// Putts: the ball goes away from where the drag ended, with a speed that
  /// grows with the pull. A short pull is ignored.
  bool shoot(Vec2 dragStart, Vec2 dragEnd) {
    if (!_playing || state.phase != GolfPhase.aiming || state.finished) return false;
    final dragDist = dragStart.distanceTo(dragEnd);
    if (dragDist <= kMinDragDistance) return false;
    final dir = calculateDirection(state.ball.pos, dragEnd);
    final vel = dir.scaled(calculatePower(dragDist));
    _feedback.haptic(HapticKind.light);
    state = state.copyWith(
      ball: state.ball.copyWith(vel: vel),
      currentStrokes: state.currentStrokes + 1,
      totalStrokes: state.totalStrokes + 1,
      phase: GolfPhase.rolling,
    );
    return true;
  }

  /// One fixed physics step.
  void step() {
    if (!_playing || state.finished) return;
    final time = state.simTimeMs + kGolfPhysics.tickRateMs;
    if (state.phase != GolfPhase.rolling) {
      state = state.copyWith(simTimeMs: time);
      return;
    }
    final next = physicsTick(state.ball, fieldHole, time, state.env);
    if (next.sunk) {
      state = state.copyWith(ball: next, simTimeMs: time);
      _holeSunk();
    } else if (next.inWater && !isBallMoving(next)) {
      state = state.copyWith(ball: next, simTimeMs: time);
      _waterReset();
    } else if (!isBallMoving(next)) {
      state = state.copyWith(ball: next, simTimeMs: time, phase: GolfPhase.aiming);
      _checkStrokeLimit();
    } else {
      state = state.copyWith(ball: next, simTimeMs: time);
    }
  }

  void _holeSunk() {
    _feedback.play(SoundCue.celebration);
    _feedback.haptic(HapticKind.success);
    state = state.copyWith(
      phase: GolfPhase.sunk,
      holeStrokes: [...state.holeStrokes, state.currentStrokes],
    );
    _timers.later(kHoleSunkDelay, _nextHole);
  }

  void _waterReset() {
    _feedback.haptic(HapticKind.error);
    state = state.copyWith(
      phase: GolfPhase.waterReset,
      currentStrokes: state.currentStrokes + 1,
      totalStrokes: state.totalStrokes + 1,
    );
    _timers.later(kWaterResetDelay, () {
      state = state.copyWith(
        ball: BallState(pos: fieldHole.ball),
        phase: GolfPhase.aiming,
      );
      _checkStrokeLimit();
    });
  }

  /// Out of strokes: the hole counts at the limit and play moves on.
  void _checkStrokeLimit() {
    if (state.phase != GolfPhase.aiming || state.currentStrokes < maxStrokes) return;
    state = state.copyWith(holeStrokes: [...state.holeStrokes, state.currentStrokes]);
    _nextHole();
  }

  void _nextHole() {
    final next = state.holeIndex + 1;
    if (next >= course.holes.length) {
      _finish();
      return;
    }
    state = state.copyWith(
      holeIndex: next,
      ball: BallState(pos: _holes[next].ball),
      currentStrokes: 0,
      env: generateEnvironment(args.difficulty, _rng.nextDouble),
      phase: GolfPhase.aiming,
      showHoleName: true,
    );
    _hideHoleNameSoon();
  }

  void _finish() {
    _timers.cancelAll();
    state = state.copyWith(finished: true);
    _feedback.play(SoundCue.celebration);
    final accuracy = golfAccuracyPercent(
      totalStrokes: state.totalStrokes,
      totalPar: course.totalPar,
      holes: course.holes.length,
      maxStrokesPerHole: maxStrokes,
    );
    // The web sends the squared stroke ratio as correctAnswers out of 100.
    _session.complete(
      extra: {'correctAnswers': accuracy, 'totalQuestions': 100},
      attempts: state.totalStrokes,
    );
  }

  void restart() {
    _timers.cancelAll();
    state = _firstState(args.difficulty, _rng, course);
    _hideHoleNameSoon();
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final golfControllerProvider = StateNotifierProvider.family
    .autoDispose<GolfController, GolfState, GolfArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(golfSessionArgs(args)).notifier);
  return GolfController(session, ref.watch(gameFeedbackProvider), args);
});
