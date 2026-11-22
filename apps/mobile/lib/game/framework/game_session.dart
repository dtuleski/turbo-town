import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/game_api.dart';
import '../../api/game_models.dart';
import '../../api/game_providers.dart';
import '../../api/quest_models.dart';

/// Lifecycle of one round: idle -> starting -> playing (<-> paused) ->
/// completing -> completed, or failed / blocked.
enum SessionPhase {
  idle,
  starting,
  playing,
  paused,
  completing,
  completed,
  failed,
  blocked,
}

/// Why a round could not start.
enum BlockReason {
  /// Daily play limit reached.
  rateLimited,

  /// The backend requires a paid tier for this game.
  paidRequired,

  /// A Quest Map launch was rejected; the player goes back to the map.
  questFailed,
}

/// What a finished round produced. The score always comes from the server.
class GameResult {
  const GameResult({
    required this.score,
    required this.completionTime,
    required this.attempts,
    this.scoreBreakdown,
    this.leaderboardRank,
    this.achievements = const [],
    this.quest,
    this.saved = true,
  });

  final int score;
  final int completionTime;
  final int attempts;
  final ScoreBreakdown? scoreBreakdown;
  final int? leaderboardRank;
  final List<AchievementResult> achievements;
  final QuestResult? quest;

  /// False when the round was played offline or the save call failed, so
  /// [score] is a placeholder and not a server value.
  final bool saved;
}

/// Identifies one round. Records compare by value, so this is a provider key.
typedef GameSessionArgs = ({
  String themeId,
  int difficulty,
  QuestContext? questContext,
});

class GameSessionState {
  const GameSessionState({
    this.phase = SessionPhase.idle,
    this.elapsedSeconds = 0,
    this.attempts = 0,
    this.pauseCount = 0,
    this.hintsUsed = 0,
    this.gameId,
    this.result,
    this.blockReason,
    this.blockMessage,
    this.rateLimit,
  });

  final SessionPhase phase;
  final int elapsedSeconds;
  final int attempts;
  final int pauseCount;
  final int hintsUsed;

  /// Null when the round runs offline (the start call failed for a reason
  /// other than limit or tier).
  final String? gameId;
  final GameResult? result;
  final BlockReason? blockReason;
  final String? blockMessage;
  final RateLimitInfo? rateLimit;

  bool get isPlaying => phase == SessionPhase.playing;
  bool get isActive =>
      phase == SessionPhase.playing || phase == SessionPhase.paused;

  GameSessionState copyWith({
    SessionPhase? phase,
    int? elapsedSeconds,
    int? attempts,
    int? pauseCount,
    int? hintsUsed,
    String? gameId,
    GameResult? result,
    BlockReason? blockReason,
    String? blockMessage,
    RateLimitInfo? rateLimit,
  }) {
    return GameSessionState(
      phase: phase ?? this.phase,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
      attempts: attempts ?? this.attempts,
      pauseCount: pauseCount ?? this.pauseCount,
      hintsUsed: hintsUsed ?? this.hintsUsed,
      gameId: gameId ?? this.gameId,
      result: result ?? this.result,
      blockReason: blockReason ?? this.blockReason,
      blockMessage: blockMessage ?? this.blockMessage,
      rateLimit: rateLimit ?? this.rateLimit,
    );
  }
}

/// Reusable round controller: start call, timer, attempts, completion.
/// Game-specific boards (cards, grids...) stay in their own controllers and
/// drive this one.
class GameSessionController extends StateNotifier<GameSessionState> {
  GameSessionController(
    this._api,
    this.args, {
    void Function(QuestResult?)? onQuestResult,
  })  : _onQuestResult = onQuestResult,
        super(const GameSessionState());

  final GameApi _api;
  final GameSessionArgs args;
  final void Function(QuestResult?)? _onQuestResult;
  Timer? _timer;
  int _generation = 0;

  /// Current phase, readable by helpers that are not StateNotifiers.
  SessionPhase get phase => state.phase;

  /// Calls `startGame`, then begins play. Safe to call again after [reset].
  Future<void> start() async {
    if (state.phase != SessionPhase.idle) return;
    final generation = _generation;
    state = state.copyWith(phase: SessionPhase.starting);
    // A new start drops any stale quest result (web questResultStore.clear()).
    _onQuestResult?.call(null);
    try {
      final result = await _api.startGame(
        themeId: args.themeId,
        difficulty: args.difficulty,
        questContext: args.questContext,
      );
      if (!mounted || generation != _generation) return;
      // A quest start the server accepted is playable even when it used the
      // last allowed play (web rule R1).
      final playable = result.canPlay || (args.questContext != null && result.id.isNotEmpty);
      if (!playable) {
        _block(BlockReason.rateLimited, rateLimit: result.rateLimit);
        return;
      }
      _beginPlay(result.id, rateLimit: result.rateLimit);
    } on GameApiException catch (e) {
      if (!mounted || generation != _generation) return;
      if (e.isRateLimited) {
        _block(BlockReason.rateLimited, message: e.message);
      } else if (args.questContext != null) {
        // Any other quest start failure goes back to the map.
        _block(BlockReason.questFailed, message: e.message);
      } else if (e.isPaywall) {
        _block(BlockReason.paidRequired, message: e.message);
      } else {
        // Non-blocking failure: allow offline play with no game to submit.
        _beginPlay(null);
      }
    } catch (_) {
      if (!mounted || generation != _generation) return;
      if (args.questContext != null) {
        _block(BlockReason.questFailed);
      } else {
        _beginPlay(null);
      }
    }
  }

  void _block(BlockReason reason, {String? message, RateLimitInfo? rateLimit}) {
    state = state.copyWith(
      phase: SessionPhase.blocked,
      blockReason: reason,
      blockMessage: message,
      rateLimit: rateLimit,
    );
  }

  void _beginPlay(String? gameId, {RateLimitInfo? rateLimit}) {
    state = state.copyWith(
      phase: SessionPhase.playing,
      gameId: gameId,
      rateLimit: rateLimit,
    );
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (state.phase != SessionPhase.playing) return;
      state = state.copyWith(elapsedSeconds: state.elapsedSeconds + 1);
    });
  }

  void pause() {
    if (state.phase != SessionPhase.playing) return;
    state = state.copyWith(
      phase: SessionPhase.paused,
      pauseCount: state.pauseCount + 1,
    );
  }

  void resume() {
    if (state.phase != SessionPhase.paused) return;
    state = state.copyWith(phase: SessionPhase.playing);
  }

  void addAttempt([int count = 1]) {
    if (!state.isActive) return;
    state = state.copyWith(attempts: state.attempts + count);
  }

  void addHint() {
    if (!state.isActive) return;
    state = state.copyWith(hintsUsed: state.hintsUsed + 1);
  }

  /// The player lost the round locally. Nothing is submitted.
  void fail() {
    if (!state.isActive) return;
    _timer?.cancel();
    state = state.copyWith(phase: SessionPhase.failed);
  }

  /// Submits the round. [extra] holds per-game metrics the server scores from
  /// (see [GameApi.completeGame]). [attempts] overrides the counter.
  Future<GameResult?> complete({
    Map<String, dynamic>? extra,
    int? attempts,
  }) async {
    if (!state.isActive) return null;
    _timer?.cancel();
    final generation = _generation;
    final seconds = state.elapsedSeconds;
    final tries = attempts ?? state.attempts;
    final gameId = state.gameId;
    state = state.copyWith(phase: SessionPhase.completing, attempts: tries);
    GameResult result;
    if (gameId == null) {
      // Offline round: nothing to submit, so there is no server score.
      result = GameResult(
        score: 0,
        completionTime: seconds,
        attempts: tries,
        saved: false,
      );
      _onQuestResult?.call(null);
    } else {
      try {
        final response = await _api.completeGame(
          gameId: gameId,
          // The server requires positive values (a round that ends at once
          // or with no attempts would otherwise be rejected).
          completionTime: seconds < 1 ? 1 : seconds,
          attempts: tries < 1 ? 1 : tries,
          extra: extra,
        );
        result = GameResult(
          score: response.score,
          completionTime: seconds,
          attempts: tries,
          scoreBreakdown: response.scoreBreakdown,
          leaderboardRank: response.leaderboardRank,
          achievements: response.achievements,
          quest: response.quest,
        );
        _onQuestResult?.call(response.quest);
      } catch (_) {
        // The round is done either way. Catch everything so a parsing problem
        // cannot leave the screen waiting; the server score is authoritative.
        result = GameResult(
          score: 0,
          completionTime: seconds,
          attempts: tries,
          saved: false,
        );
        _onQuestResult?.call(null);
      }
    }
    if (!mounted || generation != _generation) return result;
    state = state.copyWith(phase: SessionPhase.completed, result: result);
    return result;
  }

  /// Back to a fresh idle round (same theme and difficulty).
  void reset() {
    _generation++;
    _timer?.cancel();
    state = const GameSessionState();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

/// Quest result of the last completed game. Mirrors web `questResultStore`:
/// the map reads it once for unlock animations, then clears it.
final questResultProvider = StateProvider<QuestResult?>((ref) => null);

final gameSessionProvider = StateNotifierProvider.family
    .autoDispose<GameSessionController, GameSessionState, GameSessionArgs>(
  (ref, args) {
    final api = ref.watch(gameApiProvider);
    return GameSessionController(
      api,
      args,
      onQuestResult: (r) {
        try {
          ref.read(questResultProvider.notifier).state = r;
        } catch (_) {
          // The provider scope was disposed while a request was in flight.
        }
      },
    );
  },
);
