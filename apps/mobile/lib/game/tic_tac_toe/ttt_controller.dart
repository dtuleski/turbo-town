import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'logic.dart';

typedef TttArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs tttSessionArgs(TttArgs a) => (
      themeId: 'TIC_TAC_TOE',
      difficulty: tttDifficultyValue(a.difficulty),
      questContext: a.quest,
    );

enum RoundResult { win, lose, draw }

class TttState {
  const TttState({
    required this.board,
    this.playerTurn = true,
    this.round = 0,
    this.result,
    this.winLine,
    this.score = 0,
    this.wins = 0,
    this.draws = 0,
    this.losses = 0,
  });

  final TttBoard board;
  final bool playerTurn;

  /// 0-based round.
  final int round;
  final RoundResult? result;
  final List<int>? winLine;
  final int score;
  final int wins;
  final int draws;
  final int losses;

  bool get roundOver => result != null;
  bool get lastRound => round + 1 >= kTttRoundsPerGame;

  TttState copyWith({
    TttBoard? board,
    bool? playerTurn,
    int? round,
    RoundResult? result,
    List<int>? winLine,
    int? score,
    int? wins,
    int? draws,
    int? losses,
  }) =>
      TttState(
        board: board ?? this.board,
        playerTurn: playerTurn ?? this.playerTurn,
        round: round ?? this.round,
        result: result ?? this.result,
        winLine: winLine ?? this.winLine,
        score: score ?? this.score,
        wins: wins ?? this.wins,
        draws: draws ?? this.draws,
        losses: losses ?? this.losses,
      );

  /// Next round: fresh board, player first, tallies kept.
  TttState nextRound() => TttState(
        board: emptyTttBoard(),
        round: round + 1,
        score: score,
        wins: wins,
        draws: draws,
        losses: losses,
      );
}

/// Tic Tac Toe against the AI: five rounds, the player is X and moves first.
/// A round is worth 300 (win), 100 (draw) or 0; the server scores wins.
class TttController extends StateNotifier<TttState> {
  TttController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _timers = SessionTimers(_session),
        super(TttState(board: emptyTttBoard()));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final TttArgs args;
  final Random _rng;
  final SessionTimers _timers;

  void tapCell(int index) {
    if (_session.state.phase != SessionPhase.playing ||
        !state.playerTurn ||
        state.roundOver ||
        state.board[index] != null) {
      return;
    }
    final board = List<String?>.of(state.board)..[index] = 'X';
    _feedback.haptic(HapticKind.light);
    state = state.copyWith(board: board);
    if (!_endRoundIfOver(board)) {
      state = state.copyWith(playerTurn: false);
      _timers.later(const Duration(milliseconds: 500), _aiMove);
    }
  }

  void _aiMove() {
    if (state.playerTurn || state.roundOver) return;
    final move = getAIMove(List<String?>.of(state.board), args.difficulty, _rng);
    final board = List<String?>.of(state.board)..[move] = 'O';
    state = state.copyWith(board: board, playerTurn: true);
    _endRoundIfOver(board);
  }

  bool _endRoundIfOver(TttBoard board) {
    final winner = checkWinner(board);
    if (winner != null) {
      final won = winner == 'X';
      state = state.copyWith(
        result: won ? RoundResult.win : RoundResult.lose,
        winLine: getWinningLine(board),
        score: state.score + (won ? kTttWinPoints : 0),
        wins: state.wins + (won ? 1 : 0),
        losses: state.losses + (won ? 0 : 1),
      );
      _feedback.haptic(won ? HapticKind.success : HapticKind.error);
      return true;
    }
    if (isBoardFull(board)) {
      state = state.copyWith(
        result: RoundResult.draw,
        score: state.score + kTttDrawPoints,
        draws: state.draws + 1,
      );
      return true;
    }
    return false;
  }

  /// "Next Round" or, after the last round, "See Results".
  void next() {
    if (!state.roundOver || _session.state.phase != SessionPhase.playing) return;
    if (state.lastRound) {
      _feedback.play(SoundCue.celebration);
      _session.complete(
        extra: {'correctAnswers': state.wins, 'totalQuestions': kTttRoundsPerGame},
        attempts: state.wins + state.draws + state.losses,
      );
      return;
    }
    state = state.nextRound();
  }

  void restart() {
    _timers.cancelAll();
    state = TttState(board: emptyTttBoard());
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final tttControllerProvider =
    StateNotifierProvider.family.autoDispose<TttController, TttState, TttArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(tttSessionArgs(args)).notifier);
  return TttController(session, ref.watch(gameFeedbackProvider), args);
});

/// Local two-player state. It never talks to the server (web does not either).
class TwoPlayerState {
  const TwoPlayerState({
    required this.board,
    this.active = 'X',
    this.result,
    this.winLine,
    this.p1Wins = 0,
    this.p2Wins = 0,
    this.ties = 0,
  });

  final TttBoard board;
  final String active;

  /// 'X', 'O' or 'draw' once the round is over.
  final String? result;
  final List<int>? winLine;
  final int p1Wins;
  final int p2Wins;
  final int ties;
}

class TwoPlayerController extends StateNotifier<TwoPlayerState> {
  TwoPlayerController() : super(TwoPlayerState(board: emptyTttBoard()));

  void tapCell(int index) {
    if (state.result != null || state.board[index] != null) return;
    final board = List<String?>.of(state.board)..[index] = state.active;
    final winner = checkWinner(board);
    if (winner != null) {
      state = TwoPlayerState(
        board: board,
        active: state.active,
        result: winner,
        winLine: getWinningLine(board),
        p1Wins: state.p1Wins + (winner == 'X' ? 1 : 0),
        p2Wins: state.p2Wins + (winner == 'O' ? 1 : 0),
        ties: state.ties,
      );
    } else if (isBoardFull(board)) {
      state = TwoPlayerState(
        board: board,
        active: state.active,
        result: 'draw',
        p1Wins: state.p1Wins,
        p2Wins: state.p2Wins,
        ties: state.ties + 1,
      );
    } else {
      state = TwoPlayerState(
        board: board,
        active: state.active == 'X' ? 'O' : 'X',
        p1Wins: state.p1Wins,
        p2Wins: state.p2Wins,
        ties: state.ties,
      );
    }
  }

  /// New board, X first, tallies kept (web allows unlimited rounds).
  void newRound() => state = TwoPlayerState(
        board: emptyTttBoard(),
        p1Wins: state.p1Wins,
        p2Wins: state.p2Wins,
        ties: state.ties,
      );
}

final twoPlayerControllerProvider =
    StateNotifierProvider.autoDispose<TwoPlayerController, TwoPlayerState>(
        (ref) => TwoPlayerController());
