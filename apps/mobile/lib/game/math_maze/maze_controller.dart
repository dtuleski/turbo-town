import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/challenge_models.dart';
import '../../api/quest_models.dart';
import '../../challenge/challenge_content.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'logic.dart';

typedef MazeArgs = ({String difficulty, QuestContext? quest});

/// A Daily Challenge round: [args] carries the challenge difficulty.
typedef MazeChallengeArgs = ({MazeArgs args, GivenChallenge<MathMazeContent> challenge});

GameSessionArgs mazeSessionArgs(MazeArgs a, {String? challengeDay}) => (
      themeId: 'MATH_MAZE',
      difficulty: mazeDifficultyValue(a.difficulty),
      questContext: a.quest,
      challengeDay: challengeDay,
    );

enum GateState { locked, open, blocked }

enum MazeEnd { exitReached, timeUp, noPath }

/// Gate feedback delays (web: 1 s after a right answer, 2 s after a wrong one).
const Duration kGateCorrectDelay = Duration(milliseconds: 1000);
const Duration kGateWrongDelay = Duration(milliseconds: 2000);

class MazeState {
  const MazeState({
    required this.maze,
    required this.player,
    required this.gateStates,
    this.collected = const {},
    this.gatesAttempted = 0,
    this.gatesSolved = 0,
    this.steps = 0,
    this.activeGate,
    this.feedbackCorrect,
    this.end,
  });

  final MazeData maze;
  final MazePos player;
  final Map<int, GateState> gateStates;
  final Set<int> collected;
  final int gatesAttempted;
  final int gatesSolved;
  final int steps;

  /// Gate whose equation is on screen.
  final GateInfo? activeGate;

  /// Result of the last gate answer while its feedback shows; null otherwise.
  final bool? feedbackCorrect;
  final MazeEnd? end;

  bool get gatePrompt => activeGate != null;

  MazeState copyWith({
    MazePos? player,
    Map<int, GateState>? gateStates,
    Set<int>? collected,
    int? gatesAttempted,
    int? gatesSolved,
    int? steps,
    GateInfo? Function()? activeGate,
    bool? Function()? feedbackCorrect,
    MazeEnd? end,
  }) =>
      MazeState(
        maze: maze,
        player: player ?? this.player,
        gateStates: gateStates ?? this.gateStates,
        collected: collected ?? this.collected,
        gatesAttempted: gatesAttempted ?? this.gatesAttempted,
        gatesSolved: gatesSolved ?? this.gatesSolved,
        steps: steps ?? this.steps,
        activeGate: activeGate != null ? activeGate() : this.activeGate,
        feedbackCorrect: feedbackCorrect != null ? feedbackCorrect() : this.feedbackCorrect,
        end: end ?? this.end,
      );
}

MazeState newMazeState(String difficulty, Random rng) => _mazeState(generateMaze(difficulty, rng));

MazeState _mazeState(MazeData maze) {
  return MazeState(
    maze: maze,
    player: maze.start,
    gateStates: {for (final g in maze.gates) g.position.key: GateState.locked},
  );
}

/// Math Maze board. The player walks (swipe or d-pad); stepping into a locked
/// gate asks its equation. A right answer opens it, a wrong one blocks it for
/// good. The round ends at the exit, when time runs out, or when blocked
/// gates leave no route to the exit. [given] (a Daily Challenge) is played
/// instead of a generated maze.
class MazeController extends StateNotifier<MazeState> {
  MazeController(this._session, this._feedback, this.args, {Random? random, MathMazeContent? given})
      : _rng = random ?? Random(),
        _given = given,
        _timers = SessionTimers(_session),
        super(given != null
            ? _mazeState(mazeFromChallenge(given))
            : newMazeState(args.difficulty, random ?? Random())) {
    _removeListener = _session.addListener(_onSession, fireImmediately: false);
  }

  final GameSessionController _session;
  final GameFeedback _feedback;
  final MazeArgs args;
  final Random _rng;
  final MathMazeContent? _given;
  final SessionTimers _timers;
  late final void Function() _removeListener;

  int get timeLimit => kMazeTimeLimits[args.difficulty] ?? kMazeTimeLimits['easy']!;

  bool get _playing => _session.state.phase == SessionPhase.playing && state.end == null;

  void _onSession(GameSessionState s) {
    if (state.end == null && s.phase == SessionPhase.playing && s.elapsedSeconds >= timeLimit) {
      // Not inside the session's own notification.
      Future.microtask(() {
        if (mounted) _endGame(MazeEnd.timeUp);
      });
    }
  }

  /// Seconds left, from the session clock.
  int timeRemaining(GameSessionState s) => max(0, timeLimit - s.elapsedSeconds);

  void move(int dRow, int dCol) {
    if (!_playing || state.gatePrompt) return;
    final nr = state.player.row + dRow;
    final nc = state.player.col + dCol;
    final maze = state.maze;
    if (nr < 0 || nr >= maze.rows || nc < 0 || nc >= maze.cols) return;
    final cell = maze.grid[nr][nc];
    final pos = MazePos(nr, nc);
    if (cell == MazeCell.wall) return;
    if (cell == MazeCell.gate) {
      final gs = state.gateStates[pos.key];
      if (gs == GateState.blocked) return;
      if (gs == GateState.locked) {
        final gate = maze.gates.firstWhere((g) => g.position == pos);
        state = state.copyWith(activeGate: () => gate, feedbackCorrect: () => null);
        return;
      }
    }
    var collected = state.collected;
    if (cell == MazeCell.collectible && !collected.contains(pos.key)) {
      collected = {...collected, pos.key};
      _feedback.play(SoundCue.spark);
    }
    _feedback.haptic(HapticKind.light);
    state = state.copyWith(player: pos, collected: collected, steps: state.steps + 1);
    if (cell == MazeCell.exit) _endGame(MazeEnd.exitReached);
  }

  /// Answer to the active gate's equation.
  void submitGate(int answer) {
    final gate = state.activeGate;
    if (gate == null || state.feedbackCorrect != null || !_playing) return;
    final key = gate.position.key;
    final correct = checkEquationAnswer(gate.equation, answer);
    final attempted = state.gatesAttempted + 1;
    if (correct) {
      _feedback.haptic(HapticKind.success);
      state = state.copyWith(
        gatesAttempted: attempted,
        gatesSolved: state.gatesSolved + 1,
        gateStates: {...state.gateStates, key: GateState.open},
        feedbackCorrect: () => true,
      );
      _timers.later(kGateCorrectDelay, () {
        // Close the prompt and step onto the opened gate.
        state = state.copyWith(
          player: gate.position,
          activeGate: () => null,
          feedbackCorrect: () => null,
        );
      });
    } else {
      _feedback.haptic(HapticKind.error);
      state = state.copyWith(
        gatesAttempted: attempted,
        gateStates: {...state.gateStates, key: GateState.blocked},
        feedbackCorrect: () => false,
      );
      _timers.later(kGateWrongDelay, () {
        state = state.copyWith(activeGate: () => null, feedbackCorrect: () => null);
        final blocked = {
          for (final e in state.gateStates.entries)
            if (e.value == GateState.blocked) e.key,
        };
        if (!hasPathToExit(state.maze.grid, state.player, state.maze.exit, blocked)) {
          _endGame(MazeEnd.noPath);
        }
      });
    }
  }

  /// Closes the prompt without answering (only before an answer is given).
  void closeGate() {
    if (state.feedbackCorrect != null) return;
    state = state.copyWith(activeGate: () => null);
  }

  void _endGame(MazeEnd reason) {
    if (state.end != null) return;
    state = state.copyWith(end: reason);
    _timers.cancelAll();
    if (reason == MazeEnd.exitReached) _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {
        'correctAnswers': state.gatesSolved,
        'totalQuestions': state.maze.gates.length,
      },
      attempts: state.gatesAttempted,
    );
  }

  void restart() {
    _timers.cancelAll();
    final given = _given;
    state = given != null ? _mazeState(mazeFromChallenge(given)) : newMazeState(args.difficulty, _rng);
  }

  @override
  void dispose() {
    _removeListener();
    _timers.dispose();
    super.dispose();
  }
}

final mazeControllerProvider =
    StateNotifierProvider.family.autoDispose<MazeController, MazeState, MazeArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(mazeSessionArgs(args)).notifier);
  return MazeController(session, ref.watch(gameFeedbackProvider), args);
});

/// The board of a Daily Challenge round: the served maze.
final mazeChallengeControllerProvider = StateNotifierProvider.family
    .autoDispose<MazeController, MazeState, MazeChallengeArgs>((ref, key) {
  final session = ref.watch(
    gameSessionProvider(mazeSessionArgs(key.args, challengeDay: key.challenge.day)).notifier,
  );
  return MazeController(session, ref.watch(gameFeedbackProvider), key.args,
      given: key.challenge.content);
});
