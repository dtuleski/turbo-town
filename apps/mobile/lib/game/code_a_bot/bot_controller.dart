import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'logic.dart';

typedef BotArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs botSessionArgs(BotArgs a) => (
      themeId: 'CODE_A_BOT',
      difficulty: botDifficultyValue(a.difficulty),
      questContext: a.quest,
    );

enum BotPhase { building, running, success, fail }

enum FailKind { crack, crash, notReached }

/// Time between simulation steps on screen (web 400 ms).
const Duration kBotStepDelay = Duration(milliseconds: 400);

class BotState {
  const BotState({
    required this.level,
    required this.botPos,
    required this.botDir,
    this.program = const [],
    this.phase = BotPhase.building,
    this.steps = const [],
    this.animStep = -1,
    this.levelsCompleted = 0,
    this.totalAttempts = 0,
    this.showHint = false,
    this.failKind,
  });

  final BotLevel level;
  final Position botPos;
  final Direction botDir;
  final List<Instruction> program;
  final BotPhase phase;
  final List<SimStep> steps;
  final int animStep;
  final int levelsCompleted;
  final int totalAttempts;
  final bool showHint;
  final FailKind? failKind;

  BotState copyWith({
    BotLevel? level,
    Position? botPos,
    Direction? botDir,
    List<Instruction>? program,
    BotPhase? phase,
    List<SimStep>? steps,
    int? animStep,
    int? levelsCompleted,
    int? totalAttempts,
    bool? showHint,
    FailKind? Function()? failKind,
  }) =>
      BotState(
        level: level ?? this.level,
        botPos: botPos ?? this.botPos,
        botDir: botDir ?? this.botDir,
        program: program ?? this.program,
        phase: phase ?? this.phase,
        steps: steps ?? this.steps,
        animStep: animStep ?? this.animStep,
        levelsCompleted: levelsCompleted ?? this.levelsCompleted,
        totalAttempts: totalAttempts ?? this.totalAttempts,
        showHint: showHint ?? this.showHint,
        failKind: failKind != null ? failKind() : this.failKind,
      );
}

BotState _levelState(String difficulty, int levelNumber, {int completed = 0, int attempts = 0}) {
  final level = getLevel(difficulty, levelNumber);
  return BotState(
    level: level,
    botPos: level.start,
    botDir: level.startDir,
    levelsCompleted: completed,
    totalAttempts: attempts,
  );
}

/// Code-a-Bot board: build a program of blocks, run it, and move to the next
/// level when the bot reaches the power cell. Five levels per difficulty; the
/// server scores from levels completed and the number of runs.
class BotController extends StateNotifier<BotState> {
  BotController(this._session, this._feedback, this.args)
      : _timers = SessionTimers(_session),
        super(_levelState(args.difficulty, 1));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final BotArgs args;
  final SessionTimers _timers;

  int get totalLevels => getTotalLevels(args.difficulty);

  void add(Instruction inst) {
    if (state.phase != BotPhase.building ||
        state.program.length >= state.level.maxInstructions) {
      return;
    }
    state = state.copyWith(program: [...state.program, inst]);
  }

  void removeAt(int index) {
    if (state.phase != BotPhase.building || index < 0 || index >= state.program.length) return;
    state = state.copyWith(program: [...state.program]..removeAt(index));
  }

  void clear() {
    if (state.phase != BotPhase.building) return;
    state = state.copyWith(program: const []);
  }

  void toggleHint() => state = state.copyWith(showHint: !state.showHint);

  void run() {
    if (state.phase != BotPhase.building ||
        state.program.isEmpty ||
        _session.state.phase != SessionPhase.playing) {
      return;
    }
    _session.addAttempt();
    state = state.copyWith(
      totalAttempts: state.totalAttempts + 1,
      steps: simulate(state.level, state.program),
      animStep: -1,
      botPos: state.level.start,
      botDir: state.level.startDir,
      phase: BotPhase.running,
    );
    _advance();
  }

  void _advance() {
    _timers.later(kBotStepDelay, () {
      if (state.phase != BotPhase.running) return;
      final idx = state.animStep + 1;
      if (idx < state.steps.length) {
        final step = state.steps[idx];
        state = state.copyWith(animStep: idx, botPos: step.pos, botDir: step.dir);
        _feedback.haptic(HapticKind.light);
      }
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
      state = state.copyWith(phase: BotPhase.success);
      _feedback.haptic(HapticKind.success);
    } else if (last != null && !last.alive) {
      state = state.copyWith(
        phase: BotPhase.fail,
        failKind: () => last.fellInCrack ? FailKind.crack : FailKind.crash,
      );
      _feedback.haptic(HapticKind.error);
    } else {
      state = state.copyWith(phase: BotPhase.fail, failKind: () => FailKind.notReached);
    }
  }

  /// After success: next level, or submit after the last one.
  void nextLevel() {
    if (state.phase != BotPhase.success) return;
    final completed = state.levelsCompleted + 1;
    if (state.level.levelNumber >= totalLevels) {
      _feedback.play(SoundCue.celebration);
      _session.complete(
        extra: {'correctAnswers': completed, 'totalQuestions': totalLevels},
        attempts: state.totalAttempts,
      );
      return;
    }
    state = _levelState(
      args.difficulty,
      state.level.levelNumber + 1,
      completed: completed,
      attempts: state.totalAttempts,
    );
  }

  /// After a failed run: back to building the same level.
  void retry() {
    if (state.phase != BotPhase.fail) return;
    state = state.copyWith(
      botPos: state.level.start,
      botDir: state.level.startDir,
      program: const [],
      steps: const [],
      animStep: -1,
      phase: BotPhase.building,
      failKind: () => null,
    );
  }

  void restart() {
    _timers.cancelAll();
    state = _levelState(args.difficulty, 1);
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final botControllerProvider =
    StateNotifierProvider.family.autoDispose<BotController, BotState, BotArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(botSessionArgs(args)).notifier);
  return BotController(session, ref.watch(gameFeedbackProvider), args);
});
