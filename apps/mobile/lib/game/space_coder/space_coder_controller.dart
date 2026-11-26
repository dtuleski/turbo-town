import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'logic.dart';

typedef SpaceCoderArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs spaceCoderSessionArgs(SpaceCoderArgs a) => (
      themeId: 'SCRATCH_CODING',
      difficulty: spaceCoderDifficultyValue(a.difficulty),
      questContext: a.quest,
      challengeDay: null,
    );

/// Time between animation steps (web 350 ms).
const Duration kSpaceCoderStepDelay = Duration(milliseconds: 350);

enum SpacePhase { building, running, success, fail }

/// Why a run failed; picks the message (web `failMessage`).
enum SpaceFail {
  noObstacleToJump,
  jumpLandingBlocked,
  infiniteLoop,
  undefinedVarNum,
  undefinedVarChar,
  hitObstacle,
  hitWall,
  offGrid,
  notReached,
}

/// Random source for the hard levels' obstacles; tests override it.
final spaceCoderRandomProvider = Provider<Random>((ref) => Random());

class SpaceCoderState {
  const SpaceCoderState({
    required this.level,
    required this.charPos,
    required this.charDir,
    this.program = const [],
    this.cursor = const InsertionCursor(),
    this.phase = SpacePhase.building,
    this.steps = const [],
    this.animStep = -1,
    this.highlightedLine,
    this.levelsCompleted = 0,
    this.totalAttempts = 0,
    this.results = const [],
    this.fail,
  });

  final SpaceLevel level;
  final Position charPos;
  final Direction charDir;
  final List<Command> program;
  final InsertionCursor cursor;
  final SpacePhase phase;
  final List<ExecutionStep> steps;
  final int animStep;
  final int? highlightedLine;
  final int levelsCompleted;
  final int totalAttempts;

  /// Lines used per solved level, for the efficiency the server is sent.
  final List<({int optimalLines, int actualLines})> results;
  final SpaceFail? fail;

  int get lineCount => countAllLines(program);
  bool get maxReached => lineCount >= level.maxLines;

  SpaceCoderState copyWith({
    SpaceLevel? level,
    Position? charPos,
    Direction? charDir,
    List<Command>? program,
    InsertionCursor? cursor,
    SpacePhase? phase,
    List<ExecutionStep>? steps,
    int? animStep,
    int? Function()? highlightedLine,
    int? levelsCompleted,
    int? totalAttempts,
    List<({int optimalLines, int actualLines})>? results,
    SpaceFail? Function()? fail,
  }) =>
      SpaceCoderState(
        level: level ?? this.level,
        charPos: charPos ?? this.charPos,
        charDir: charDir ?? this.charDir,
        program: program ?? this.program,
        cursor: cursor ?? this.cursor,
        phase: phase ?? this.phase,
        steps: steps ?? this.steps,
        animStep: animStep ?? this.animStep,
        highlightedLine: highlightedLine != null ? highlightedLine() : this.highlightedLine,
        levelsCompleted: levelsCompleted ?? this.levelsCompleted,
        totalAttempts: totalAttempts ?? this.totalAttempts,
        results: results ?? this.results,
        fail: fail != null ? fail() : this.fail,
      );
}

/// Which message a failed run shows (web game page, in the same order).
SpaceFail failOf(ExecutionStep? last, List<Command> program) {
  if (last == null || last.alive) return SpaceFail.notReached;
  switch (last.errorType) {
    case ErrorType.noObstacleToJump:
      return SpaceFail.noObstacleToJump;
    case ErrorType.jumpLandingBlocked:
      return SpaceFail.jumpLandingBlocked;
    case ErrorType.infiniteLoop:
      return SpaceFail.infiniteLoop;
    case ErrorType.undefinedVariable:
      final cmd = findCommand(program, last.commandId);
      final cond = cmd?.condition;
      return cond is ComparisonCondition && cond.variable == Variable.char
          ? SpaceFail.undefinedVarChar
          : SpaceFail.undefinedVarNum;
    default:
      if (last.hitObstacle) return SpaceFail.hitObstacle;
      if (last.hitWall) return SpaceFail.hitWall;
      if (last.outOfBounds) return SpaceFail.offGrid;
      return SpaceFail.notReached;
  }
}

/// Space Coder board: write a program line by line, run it, and reach the
/// airlock on each of the five levels. The server scores from the levels
/// completed (weighted by line efficiency) and the number of runs.
class SpaceCoderController extends StateNotifier<SpaceCoderState> {
  SpaceCoderController(this._session, this._feedback, this.args, this._rng)
      : _timers = SessionTimers(_session),
        super(_levelState(args.difficulty, 1, _rng));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final SpaceCoderArgs args;
  final Random _rng;
  final SessionTimers _timers;
  final CommandIds _ids = CommandIds();

  static SpaceCoderState _levelState(
    String difficulty,
    int n,
    Random rng, {
    int completed = 0,
    int attempts = 0,
    List<({int optimalLines, int actualLines})> results = const [],
  }) {
    final level = loadSpaceLevel(difficulty, n, rng);
    return SpaceCoderState(
      level: level,
      charPos: level.start,
      charDir: level.startDir,
      levelsCompleted: completed,
      totalAttempts: attempts,
      results: results,
    );
  }

  int get totalLevels => totalSpaceLevels(args.difficulty);
  bool get _building => state.phase == SpacePhase.building;

  // -------------------------------------------------------------------------
  // Editing
  // -------------------------------------------------------------------------

  /// Inserts [type] at the cursor, or at [line] when the command was dropped
  /// on a line.
  void insert(CommandType type, {int? line}) {
    if (!_building || state.maxReached) return;
    final cursor =
        line == null ? state.cursor : (cursorForLine(state.program, line) ?? state.cursor);
    final res = insertCommand(state.program, createCommand(type, _ids.next()), cursor);
    state = state.copyWith(program: res.program, cursor: res.cursor);
    _feedback.haptic(HapticKind.light);
  }

  void selectLine(int line) {
    if (!_building) return;
    final cursor = cursorForLine(state.program, line);
    if (cursor != null) state = state.copyWith(cursor: cursor);
  }

  void removeLine(int line) {
    if (!_building) return;
    final res = removeAtLine(state.program, line);
    state = state.copyWith(program: res.program, cursor: res.cursor);
  }

  void clear() {
    if (!_building) return;
    state = state.copyWith(program: const [], cursor: const InsertionCursor());
  }

  void setLoopCount(String id, int count) =>
      _update(id, (c) => c.copyWith(parameter: count.clamp(1, 20)));

  void setCondition(String id, Condition condition) =>
      _update(id, (c) => c.copyWith(condition: condition));

  /// var-num takes -99..99, var-char a letter.
  void setVarValue(String id, Object value) {
    final v = value is int ? value.clamp(-99, 99) : value;
    _update(id, (c) => c.copyWith(varValue: v));
  }

  void _update(String id, Command Function(Command) f) {
    if (!_building) return;
    state = state.copyWith(program: updateCommand(state.program, id, f));
  }

  // -------------------------------------------------------------------------
  // Running
  // -------------------------------------------------------------------------

  void run() {
    if (!_building || state.program.isEmpty || _session.state.phase != SessionPhase.playing) {
      return;
    }
    _session.addAttempt();
    final steps = executeProgram(state.level, state.program);
    if (steps.isEmpty) {
      state = state.copyWith(
        totalAttempts: state.totalAttempts + 1,
        phase: SpacePhase.fail,
        fail: () => SpaceFail.notReached,
      );
      return;
    }
    state = state.copyWith(
      totalAttempts: state.totalAttempts + 1,
      steps: steps,
      animStep: -1,
      charPos: state.level.start,
      charDir: state.level.startDir,
      highlightedLine: () => null,
      phase: SpacePhase.running,
    );
    _advance();
  }

  void _advance() {
    _timers.later(kSpaceCoderStepDelay, () {
      if (state.phase != SpacePhase.running) return;
      final idx = state.animStep + 1;
      final step = state.steps[idx];
      state = state.copyWith(
        animStep: idx,
        charPos: step.pos,
        charDir: step.dir,
        highlightedLine: () => step.lineIndex,
      );
      _feedback.haptic(HapticKind.light);
      // The outcome shows as soon as the last step is drawn (web).
      if (idx >= state.steps.length - 1) {
        _settle();
      } else {
        _advance();
      }
    });
  }

  void _settle() {
    final last = state.steps.isEmpty ? null : state.steps.last;
    if (last != null && last.reachedGoal) {
      state = state.copyWith(phase: SpacePhase.success, highlightedLine: () => null);
      _feedback.haptic(HapticKind.success);
      return;
    }
    state = state.copyWith(
      phase: SpacePhase.fail,
      fail: () => failOf(last, state.program),
      highlightedLine: () => null,
    );
    _feedback.haptic(HapticKind.error);
  }

  /// After success: record the lines used, then the next level or the score.
  void nextLevel() {
    if (state.phase != SpacePhase.success) return;
    final results = [
      ...state.results,
      (optimalLines: state.level.optimalLines, actualLines: state.lineCount),
    ];
    final completed = state.levelsCompleted + 1;
    if (state.level.levelNumber >= totalLevels) {
      _finish(completed, results);
      return;
    }
    state = _levelState(
      args.difficulty,
      state.level.levelNumber + 1,
      _rng,
      completed: completed,
      attempts: state.totalAttempts,
      results: results,
    );
  }

  /// After a failed run: back to an empty program on the same level (web).
  void retry() {
    if (state.phase != SpacePhase.fail) return;
    state = state.copyWith(
      charPos: state.level.start,
      charDir: state.level.startDir,
      program: const [],
      cursor: const InsertionCursor(),
      steps: const [],
      animStep: -1,
      highlightedLine: () => null,
      phase: SpacePhase.building,
      fail: () => null,
    );
  }

  /// "End Game" after a failed run: submit what was completed so far.
  void endGame() {
    if (state.phase != SpacePhase.fail) return;
    _finish(state.levelsCompleted, state.results);
  }

  void _finish(int completed, List<({int optimalLines, int actualLines})> results) {
    _timers.cancelAll();
    final efficiency = results.isEmpty ? 1.0 : computeLineEfficiency(results);
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {
        'correctAnswers': (completed * efficiency).round(),
        'totalQuestions': totalLevels,
      },
      attempts: state.totalAttempts,
    );
  }

  void restart() {
    _timers.cancelAll();
    state = _levelState(args.difficulty, 1, _rng);
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final spaceCoderControllerProvider = StateNotifierProvider.family
    .autoDispose<SpaceCoderController, SpaceCoderState, SpaceCoderArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(spaceCoderSessionArgs(args)).notifier);
  return SpaceCoderController(
    session,
    ref.watch(gameFeedbackProvider),
    args,
    ref.watch(spaceCoderRandomProvider),
  );
});
