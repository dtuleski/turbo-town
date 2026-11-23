// What the app sends for a finished Circuit Builder level (web
// `circuitGameSession.ts`). The server re-evaluates the layout and computes the
// score itself; nothing here computes one.
import 'dart:convert';

import 'engine/engine.dart';
import 'state.dart';

/// Server bound for the top-level completion time, in seconds.
const int kMaxCompletionSeconds = 3600;

/// How long a satisfied circuit must stay satisfied before it is submitted.
const Duration kSettleDelay = Duration(milliseconds: 750);

/// Whole seconds, floored to the server's minimum for the difficulty (so a
/// legitimately fast solve is not refused) and capped at its maximum.
int clampCompletionSeconds(int elapsedSeconds, int difficulty) {
  final minimum = (difficulty < 0 ? 0 : difficulty) * 2;
  final seconds = elapsedSeconds < 0 ? 0 : elapsedSeconds;
  final clamped = seconds < minimum ? minimum : seconds;
  return clamped > kMaxCompletionSeconds ? kMaxCompletionSeconds : clamped;
}

/// The `circuitSubmission` object, rebuilt key by key (the server's schema is
/// strict): {levelId, layout, switches, environment, faultCount}.
Map<String, dynamic> buildCircuitSubmission(CircuitBuilderState s) {
  final payload = selectSortedPayload(s);
  return {
    'levelId': s.levelId,
    'layout': payload.layout.toJson(),
    'switches': {for (final e in payload.switches.entries) e.key: e.value.name},
    'environment': s.environment.toJson(),
    'faultCount': s.faultCount,
  };
}

/// Identity of a circuit for "same circuit again" decisions. Never sent.
String circuitKey(CircuitBuilderState s) => jsonEncode(buildCircuitSubmission(s));

/// Whether the player's circuit currently solves [state]'s level.
bool isCompleted(CircuitBuilderState state, CircuitResult? result) {
  if (result == null || state.fuseBlown) return false;
  return evaluateSuccess(state.level, result).satisfied;
}
