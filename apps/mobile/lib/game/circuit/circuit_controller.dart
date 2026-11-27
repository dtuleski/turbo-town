import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import 'engine/engine.dart';
import 'state.dart';
import 'submission.dart';

typedef CircuitArgs = ({String levelId, QuestContext? quest});

/// The sandbox has no round, no score and no server call.
const String kSandboxLevelId = 'sandbox';

GameSessionArgs circuitSessionArgs(CircuitArgs a) => (
      themeId: 'CIRCUIT_BUILDER',
      difficulty: getLevel(a.levelId)?.difficulty ?? 1,
      questContext: a.quest,
      challengeDay: null,
    );

class CircuitBoardState {
  const CircuitBoardState({
    required this.builder,
    this.result,
    this.evaluationFailed = false,
    this.armedKind,
    this.selectedElementId,
    this.pendingTerminal,
    this.failure,
  });

  final CircuitBuilderState builder;

  /// Null when the engine refused the layout.
  final CircuitResult? result;
  final bool evaluationFailed;
  final ElementKind? armedKind;
  final String? selectedElementId;
  final TerminalRef? pendingTerminal;

  /// Why the last submit did not finish the round.
  final SubmitFailure? failure;

  /// What the board shows as live: nothing while the fuse is blown.
  CircuitResult? get liveResult => builder.fuseBlown ? null : result;

  CircuitBoardState copyWith({
    CircuitBuilderState? builder,
    CircuitResult? Function()? result,
    bool? evaluationFailed,
    ElementKind? Function()? armedKind,
    String? Function()? selectedElementId,
    TerminalRef? Function()? pendingTerminal,
    SubmitFailure? Function()? failure,
  }) =>
      CircuitBoardState(
        builder: builder ?? this.builder,
        result: result != null ? result() : this.result,
        evaluationFailed: evaluationFailed ?? this.evaluationFailed,
        armedKind: armedKind != null ? armedKind() : this.armedKind,
        selectedElementId: selectedElementId != null ? selectedElementId() : this.selectedElementId,
        pendingTerminal: pendingTerminal != null ? pendingTerminal() : this.pendingTerminal,
        failure: failure != null ? failure() : this.failure,
      );
}

/// Circuit Builder board: the surface reducer, the engine, and (for a guided
/// level) the submission of a solved circuit. The server re-evaluates the
/// layout and returns the score; nothing here computes one.
class CircuitController extends StateNotifier<CircuitBoardState> {
  CircuitController(this._session, this._feedback, this.level) : super(_initial(level));

  /// Null in the sandbox.
  final GameSessionController? _session;
  final GameFeedback _feedback;
  final LevelDefinition level;

  Timer? _settleTimer;
  String? _pendingKey;
  String? _rejectedKey;
  bool _latched = false;
  ({CircuitBuilderState builder, int elapsedSeconds})? _completed;

  static CircuitBoardState _initial(LevelDefinition level) {
    final builder = createInitialState(level);
    final outcome = evaluate(builder.layout, builder.switches, builder.environment);
    return CircuitBoardState(
      builder: builder,
      result: outcome.result,
      evaluationFailed: !outcome.ok,
    );
  }

  bool get isSandbox => _session == null;

  // -------------------------------------------------------------------------
  // Player intents
  // -------------------------------------------------------------------------

  void armKind(ElementKind kind) {
    final b = state.builder;
    if (selectRemainingBudget(b, kind) <= 0) return;
    final disarm = state.armedKind == kind;
    state = state.copyWith(
      armedKind: () => disarm ? null : kind,
      pendingTerminal: () => null,
    );
  }

  /// Tap on an empty cell: place the armed part, else drop selections.
  void tapCell(GridCell cell) {
    final kind = state.armedKind;
    if (kind == null) {
      state = state.copyWith(selectedElementId: () => null, pendingTerminal: () => null);
      return;
    }
    final before = state.builder;
    _mutate(placeElement(before, kind, cell));
    if (state.builder.layout.elements.length > before.layout.elements.length) {
      _feedback.play(SoundCue.place);
      _feedback.haptic(HapticKind.light);
      // The tray item is disabled once the allowance is used, so the part is put
      // down rather than left armed with nothing to place.
      if (selectRemainingBudget(state.builder, kind) <= 0) {
        state = state.copyWith(armedKind: () => null);
      }
    }
  }

  void tapTerminal(TerminalRef ref) {
    final pending = state.pendingTerminal;
    if (pending == null) {
      state = state.copyWith(pendingTerminal: () => ref, selectedElementId: () => ref.elementId);
      return;
    }
    if (pending == ref) {
      state = state.copyWith(pendingTerminal: () => null);
      return;
    }
    final before = state.builder.layout.connections.length;
    state = state.copyWith(pendingTerminal: () => null);
    _mutate(connectTerminals(state.builder, pending, ref));
    if (state.builder.layout.connections.length > before) {
      _feedback.play(SoundCue.connect);
      _feedback.haptic(HapticKind.light);
    }
  }

  /// Tap on a part: select it, and flip a switch.
  void tapElement(String elementId) {
    final element = elementById(state.builder, elementId);
    if (element == null) return;
    state = state.copyWith(selectedElementId: () => elementId, pendingTerminal: () => null);
    if (element.kind == ElementKind.switchKind) {
      _mutate(toggleSwitch(state.builder, elementId));
      _feedback.haptic(HapticKind.light);
    } else {
      state = state.copyWith(builder: state.builder.copyWith(lastRejection: () => null));
    }
  }

  /// Tap on a wire removes it (web behaviour).
  void tapConnection(String connectionId) {
    _mutate(disconnect(state.builder, connectionId));
  }

  void moveElementTo(String elementId, GridCell cell) {
    _mutate(moveElement(state.builder, elementId, cell));
  }

  void flipSelected() {
    final id = state.selectedElementId;
    if (id != null) _mutate(flipElement(state.builder, id));
  }

  void removeSelected() {
    final id = state.selectedElementId;
    if (id == null) return;
    state = state.copyWith(selectedElementId: () => null, pendingTerminal: () => null);
    _mutate(removeElement(state.builder, id));
  }

  void setVoltage(double volts) => _mutate(circuitSetVoltage(state.builder, volts));
  void setLight(double level) => _mutate(circuitSetLight(state.builder, level));

  void resetTheFuse() => _mutate(resetFuse(state.builder));

  /// Escape: drop the armed part and a half drawn wire.
  void cancel() {
    state = state.copyWith(armedKind: () => null, pendingTerminal: () => null);
  }

  /// Back to the level's starting circuit.
  void restart() {
    _cancelSettle();
    _latched = false;
    _rejectedKey = null;
    _completed = null;
    state = _initial(level);
  }

  // -------------------------------------------------------------------------
  // Evaluation and submission
  // -------------------------------------------------------------------------

  void _mutate(CircuitBuilderState next) {
    final changed = !identical(next, state.builder);
    var builder = next;
    final outcome = evaluate(builder.layout, builder.switches, builder.environment);
    final result = outcome.result;
    if (result != null) {
      final blown = faultsEvaluated(builder, [for (final f in result.faults) f.code]);
      if (!identical(blown, builder)) {
        builder = blown;
        _feedback.play(SoundCue.fusePop);
        _feedback.haptic(HapticKind.error);
      }
    }
    // Selections that name a part that is gone are dropped.
    final selected = state.selectedElementId;
    final stillThere = selected != null && elementById(builder, selected) != null;
    state = state.copyWith(
      builder: builder,
      result: () => result,
      evaluationFailed: !outcome.ok,
      selectedElementId: () => stillThere ? selected : null,
      // A changed circuit makes an old "could not verify" notice stale.
      failure: changed && state.failure == SubmitFailure.rejected ? () => null : null,
    );
    _observe();
  }

  /// Web `observe`: a circuit that solves the level and stays solved for
  /// [kSettleDelay] is submitted once.
  void _observe() {
    final session = _session;
    if (session == null || _latched || session.phase != SessionPhase.playing) return;
    if (!isCompleted(state.builder, state.result)) {
      _cancelSettle();
      return;
    }
    final key = circuitKey(state.builder);
    if (_rejectedKey != null) {
      if (key == _rejectedKey) return;
      _rejectedKey = null;
    }
    if (_pendingKey == key) return;
    _cancelSettle();
    _pendingKey = key;
    final snapshot = (builder: state.builder, elapsedSeconds: session.state.elapsedSeconds);
    _settleTimer = Timer(kSettleDelay, () => _fireSettled(snapshot));
  }

  void _cancelSettle() {
    _settleTimer?.cancel();
    _settleTimer = null;
    _pendingKey = null;
  }

  void _fireSettled(({CircuitBuilderState builder, int elapsedSeconds}) snapshot) {
    _settleTimer = null;
    _pendingKey = null;
    final session = _session;
    if (!mounted || session == null || _latched) return;
    final phase = session.phase;
    if (phase == SessionPhase.paused) {
      // Wait out a pause, then check the circuit again.
      _settleTimer = Timer(const Duration(milliseconds: 200), () {
        _settleTimer = null;
        _observe();
      });
      return;
    }
    if (phase != SessionPhase.playing) return;
    _latched = true;
    _completed = snapshot;
    _submit(snapshot);
  }

  Future<void> _submit(({CircuitBuilderState builder, int elapsedSeconds}) snapshot) async {
    final session = _session;
    if (session == null) return;
    state = state.copyWith(failure: () => null);
    final failure = await session.completeOrRecover(
      extra: {'circuitSubmission': buildCircuitSubmission(snapshot.builder)},
      attempts: 1,
      completionSeconds: clampCompletionSeconds(snapshot.elapsedSeconds, level.difficulty),
    );
    if (!mounted) return;
    if (failure == null) {
      _feedback.play(SoundCue.celebration);
      _feedback.haptic(HapticKind.success);
      return;
    }
    if (failure == SubmitFailure.rejected) {
      // The server disagreed with this circuit: let the player change it.
      _latched = false;
      _rejectedKey = circuitKey(snapshot.builder);
      _completed = null;
    }
    state = state.copyWith(failure: () => failure);
  }

  /// Resend the circuit after the server could not be reached.
  void retrySubmit() {
    final snapshot = _completed;
    if (snapshot == null || state.failure != SubmitFailure.unavailable) return;
    _submit(snapshot);
  }

  @override
  void dispose() {
    _cancelSettle();
    super.dispose();
  }
}

// The reducer's `setVoltage`/`setLightLevel` collide with the controller's
// method names inside the class body, so they are re-exported under other names.
CircuitBuilderState circuitSetVoltage(CircuitBuilderState s, double v) => setVoltage(s, v);
CircuitBuilderState circuitSetLight(CircuitBuilderState s, double v) => setLightLevel(s, v);

final circuitControllerProvider =
    StateNotifierProvider.family.autoDispose<CircuitController, CircuitBoardState, CircuitArgs>(
  (ref, args) {
    final session = ref.watch(gameSessionProvider(circuitSessionArgs(args)).notifier);
    final level = getLevel(args.levelId) ?? getLevel(kSandboxLevelId)!;
    return CircuitController(session, ref.watch(gameFeedbackProvider), level);
  },
);

/// Free play: no game is started and nothing is submitted.
final sandboxControllerProvider =
    StateNotifierProvider.autoDispose<CircuitController, CircuitBoardState>((ref) {
  return CircuitController(null, ref.watch(gameFeedbackProvider), getLevel(kSandboxLevelId)!);
});
