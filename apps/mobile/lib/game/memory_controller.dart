import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/quest_models.dart';
import '../config/constants.dart';
import 'card.dart';
import 'framework/game_feedback.dart';
import 'framework/game_session.dart';
import 'game_logic.dart';

/// Identifies one Memory Match round.
typedef MemoryArgs = ({
  String themeId,
  Difficulty difficulty,
  QuestContext? questContext,
});

/// Session key for [args] (the backend takes the difficulty as 1-4).
GameSessionArgs memorySessionArgs(MemoryArgs args) => (
      themeId: args.themeId,
      difficulty: args.difficulty.apiValue,
      questContext: args.questContext,
    );

/// Time a mismatched pair stays face up. Same as web `useGame` (1000 ms).
const Duration kMemoryMismatchDelay = Duration(milliseconds: 1000);

class MemoryBoardState {
  const MemoryBoardState({
    required this.cards,
    this.matches = 0,
    this.isChecking = false,
  });

  final List<MemoryCard> cards;
  final int matches;
  final bool isChecking;

  int get totalPairs => cards.length ~/ 2;

  MemoryBoardState copyWith({
    List<MemoryCard>? cards,
    int? matches,
    bool? isChecking,
  }) =>
      MemoryBoardState(
        cards: cards ?? this.cards,
        matches: matches ?? this.matches,
        isChecking: isChecking ?? this.isChecking,
      );
}

/// Memory Match board. Game rules live here; the round (start call, timer,
/// attempts, completion) is the shared [GameSessionController].
class MemoryController extends StateNotifier<MemoryBoardState> {
  MemoryController(this._session, this._feedback, this.args)
      : super(MemoryBoardState(
          cards: generateCards(args.themeId, args.difficulty),
        ));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final MemoryArgs args;
  Timer? _pending;
  int _generation = 0;

  void flipCard(MemoryCard card) {
    if (_session.state.phase != SessionPhase.playing ||
        state.isChecking ||
        card.isFlipped ||
        card.isMatched) {
      return;
    }
    final flipped = state.cards.where((c) => c.isFlipped && !c.isMatched).toList();
    if (flipped.length >= 2) return;
    final updated = state.cards
        .map((c) => c.id == card.id ? c.copyWith(isFlipped: true) : c)
        .toList();
    state = state.copyWith(cards: updated);
    _feedback.haptic(HapticKind.light);
    final nowFlipped = updated.where((c) => c.isFlipped && !c.isMatched).toList();
    if (nowFlipped.length == 2) _resolvePair(nowFlipped[0], nowFlipped[1]);
  }

  void _resolvePair(MemoryCard a, MemoryCard b) {
    state = state.copyWith(isChecking: true);
    final isMatch = checkMatch(a, b);
    final generation = _generation;
    _pending = Timer(kMemoryMismatchDelay, () {
      if (!mounted || generation != _generation) return;
      // Resolve while paused too, so a pending pair never stays stuck face up.
      final phase = _session.state.phase;
      if (phase != SessionPhase.playing && phase != SessionPhase.paused) {
        state = state.copyWith(isChecking: false);
        return;
      }
      final cards = state.cards
          .map((c) => (c.id == a.id || c.id == b.id)
              ? (isMatch ? c.copyWith(isMatched: true) : c.copyWith(isFlipped: false))
              : c)
          .toList();
      state = state.copyWith(
        cards: cards,
        matches: isMatch ? state.matches + 1 : state.matches,
        isChecking: false,
      );
      _session.addAttempt();
      _feedback.haptic(isMatch ? HapticKind.success : HapticKind.error);
      if (isGameComplete(cards)) {
        _feedback.play(SoundCue.celebration);
        _session.complete();
      }
    });
  }

  /// Fresh deck for another round with the same theme and difficulty.
  void restart() {
    _generation++;
    _pending?.cancel();
    state = MemoryBoardState(cards: generateCards(args.themeId, args.difficulty));
  }

  @override
  void dispose() {
    _pending?.cancel();
    super.dispose();
  }
}

final memoryControllerProvider = StateNotifierProvider.family
    .autoDispose<MemoryController, MemoryBoardState, MemoryArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(memorySessionArgs(args)).notifier);
  return MemoryController(session, ref.watch(gameFeedbackProvider), args);
});
