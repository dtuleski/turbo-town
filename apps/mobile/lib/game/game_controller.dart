import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/game_api.dart';
import '../api/game_models.dart';
import '../api/game_providers.dart';
import '../config/constants.dart';
import 'card.dart';
import 'game_logic.dart';

enum GameStatus { notStarted, inProgress, completed }

class GameSessionState {
  const GameSessionState({
    required this.themeId,
    required this.difficulty,
    required this.cards,
    this.status = GameStatus.notStarted,
    this.attempts = 0,
    this.matches = 0,
    this.elapsedSeconds = 0,
    this.isChecking = false,
    this.gameId,
    this.score,
    this.scoreBreakdown,
    this.leaderboardRank,
    this.error,
    this.isBusy = false,
  });

  final String themeId;
  final Difficulty difficulty;
  final List<MemoryCard> cards;
  final GameStatus status;
  final int attempts;
  final int matches;
  final int elapsedSeconds;
  final bool isChecking;
  final String? gameId;
  final int? score;
  final ScoreBreakdown? scoreBreakdown;
  final int? leaderboardRank;
  final String? error;
  final bool isBusy;

  int get totalPairs => cards.length ~/ 2;

  GameSessionState copyWith({
    List<MemoryCard>? cards,
    GameStatus? status,
    int? attempts,
    int? matches,
    int? elapsedSeconds,
    bool? isChecking,
    String? gameId,
    int? score,
    ScoreBreakdown? scoreBreakdown,
    int? leaderboardRank,
    String? error,
    bool clearError = false,
    bool? isBusy,
  }) {
    return GameSessionState(
      themeId: themeId,
      difficulty: difficulty,
      cards: cards ?? this.cards,
      status: status ?? this.status,
      attempts: attempts ?? this.attempts,
      matches: matches ?? this.matches,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
      isChecking: isChecking ?? this.isChecking,
      gameId: gameId ?? this.gameId,
      score: score ?? this.score,
      scoreBreakdown: scoreBreakdown ?? this.scoreBreakdown,
      leaderboardRank: leaderboardRank ?? this.leaderboardRank,
      error: clearError ? null : (error ?? this.error),
      isBusy: isBusy ?? this.isBusy,
    );
  }
}

class GameController extends StateNotifier<GameSessionState> {
  GameController(this._api, String themeId, Difficulty difficulty)
      : super(GameSessionState(
          themeId: themeId,
          difficulty: difficulty,
          cards: generateCards(themeId, difficulty),
        ));

  final GameApi _api;
  Timer? _timer;

  /// Flag surfaced to the UI so it can route to the paywall / rate-limit page.
  bool paywallHit = false;
  bool rateLimited = false;

  /// Call the backend to start the game, then begin play + timer.
  Future<void> start() async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final result = await _api.startGame(
        themeId: state.themeId,
        difficulty: state.difficulty.apiValue,
      );
      if (!result.canPlay) {
        rateLimited = true;
        state = state.copyWith(
          isBusy: false,
          error: 'You have reached your game limit. Try again later.',
        );
        return;
      }
      _beginPlay(result.id);
    } on GameApiException catch (e) {
      if (e.isPaywall) {
        paywallHit = true;
        state = state.copyWith(isBusy: false, error: e.message);
        return;
      }
      if (e.isRateLimited) {
        rateLimited = true;
        state = state.copyWith(isBusy: false, error: e.message);
        return;
      }
      // Non-blocking failure: allow offline play, no gameId to submit.
      _beginPlay(null);
    }
  }

  void _beginPlay(String? gameId) {
    state = state.copyWith(
      status: GameStatus.inProgress,
      gameId: gameId,
      isBusy: false,
      clearError: true,
    );
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (state.status != GameStatus.inProgress) return;
      state = state.copyWith(elapsedSeconds: state.elapsedSeconds + 1);
    });
  }

  /// Handle a tap on a card.
  void flipCard(MemoryCard card) {
    if (state.status != GameStatus.inProgress ||
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

    final nowFlipped =
        updated.where((c) => c.isFlipped && !c.isMatched).toList();
    if (nowFlipped.length == 2) {
      _resolvePair(nowFlipped[0], nowFlipped[1]);
    }
  }

  void _resolvePair(MemoryCard a, MemoryCard b) {
    state = state.copyWith(isChecking: true);
    final isMatch = checkMatch(a, b);

    Timer(const Duration(milliseconds: 800), () {
      if (state.status != GameStatus.inProgress) {
        state = state.copyWith(isChecking: false);
        return;
      }

      List<MemoryCard> cards;
      int matches = state.matches;
      if (isMatch) {
        cards = state.cards
            .map((c) => (c.id == a.id || c.id == b.id)
                ? c.copyWith(isMatched: true)
                : c)
            .toList();
        matches += 1;
      } else {
        cards = state.cards
            .map((c) => (c.id == a.id || c.id == b.id)
                ? c.copyWith(isFlipped: false)
                : c)
            .toList();
      }

      state = state.copyWith(
        cards: cards,
        matches: matches,
        attempts: state.attempts + 1,
        isChecking: false,
      );

      if (isGameComplete(cards)) {
        _complete();
      }
    });
  }

  Future<void> _complete() async {
    _timer?.cancel();
    final gameId = state.gameId;

    // No backend game (offline) — mark completed with local score = 0.
    if (gameId == null) {
      state = state.copyWith(status: GameStatus.completed, score: 0);
      return;
    }

    state = state.copyWith(isBusy: true);
    try {
      final result = await _api.completeGame(
        gameId: gameId,
        completionTime: state.elapsedSeconds,
        attempts: state.attempts,
      );
      state = state.copyWith(
        status: GameStatus.completed,
        score: result.score,
        scoreBreakdown: result.scoreBreakdown,
        leaderboardRank: result.leaderboardRank,
        isBusy: false,
      );
    } catch (e) {
      // The round is done regardless. Catch ALL errors (not just
      // GameApiException) so a response-parsing hiccup can't leave the UI
      // stuck on isBusy=true — the server score is authoritative anyway.
      state = state.copyWith(
        status: GameStatus.completed,
        score: state.score ?? 0,
        isBusy: false,
        error: 'Your game was recorded, but the score display had a hiccup.',
      );
    }
  }

  /// Reset for a fresh round with the same theme/difficulty.
  void restart() {
    _timer?.cancel();
    paywallHit = false;
    rateLimited = false;
    state = GameSessionState(
      themeId: state.themeId,
      difficulty: state.difficulty,
      cards: generateCards(state.themeId, state.difficulty),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

/// Family provider keyed by theme+difficulty so each game screen gets its own.
final gameControllerProvider = StateNotifierProvider.family
    .autoDispose<GameController, GameSessionState, ({String themeId, Difficulty difficulty})>(
  (ref, args) {
    final api = ref.watch(gameApiProvider);
    return GameController(api, args.themeId, args.difficulty);
  },
);
