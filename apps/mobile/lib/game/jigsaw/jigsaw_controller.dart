import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import '../quiz/quiz_engine.dart';
import 'logic.dart';

typedef JigsawArgs = ({String difficulty, String image, QuestContext? quest});

GameSessionArgs jigsawSessionArgs(JigsawArgs a) => (
      themeId: 'JIGSAW_PUZZLE',
      difficulty: quizDifficultyNumber(a.difficulty),
      questContext: a.quest,
    );

class JigsawState {
  const JigsawState({
    required this.pieces,
    required this.gridSize,
    this.selectedId,
    this.wrongCell,
    this.moves = 0,
    this.showReference = true,
  });

  final List<PuzzlePiece> pieces;
  final int gridSize;
  final int? selectedId;

  /// `row,col` of the last rejected drop, shown red for a moment.
  final String? wrongCell;
  final int moves;
  final bool showReference;

  List<PuzzlePiece> get tray => [for (final p in pieces) if (!p.placed) p];

  PuzzlePiece? pieceAt(int row, int col) {
    for (final p in pieces) {
      if (p.currentRow == row && p.currentCol == col) return p;
    }
    return null;
  }

  JigsawState copyWith({
    List<PuzzlePiece>? pieces,
    int? Function()? selectedId,
    String? Function()? wrongCell,
    int? moves,
    bool? showReference,
  }) =>
      JigsawState(
        pieces: pieces ?? this.pieces,
        gridSize: gridSize,
        selectedId: selectedId != null ? selectedId() : this.selectedId,
        wrongCell: wrongCell != null ? wrongCell() : this.wrongCell,
        moves: moves ?? this.moves,
        showReference: showReference ?? this.showReference,
      );
}

/// Jigsaw board. A piece goes on the board by tapping it and then a cell, or
/// by dragging it onto a cell. A wrong cell rejects the piece (it stays in the
/// tray and the move still counts), like web.
class JigsawController extends StateNotifier<JigsawState> {
  JigsawController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _timers = SessionTimers(_session),
        super(JigsawState(
          gridSize: jigsawGridSize(args.difficulty),
          pieces: createPuzzlePieces(jigsawGridSize(args.difficulty), random ?? Random()),
        ));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final JigsawArgs args;
  final Random _rng;
  final SessionTimers _timers;
  bool _completing = false;

  bool get _active => _session.state.phase == SessionPhase.playing;

  void selectPiece(int id) {
    if (!_active) return;
    state = state.copyWith(selectedId: () => state.selectedId == id ? null : id);
  }

  void clearSelection() => state = state.copyWith(selectedId: () => null);

  void toggleReference() => state = state.copyWith(showReference: !state.showReference);

  /// Puts piece [id] (default: the selected one) on cell [row],[col].
  void place(int row, int col, {int? id}) {
    final pieceId = id ?? state.selectedId;
    if (!_active || pieceId == null) return;
    if (state.pieceAt(row, col) != null) return;
    final piece = state.pieces.where((p) => p.id == pieceId && !p.placed).firstOrNull;
    if (piece == null) return;
    final moves = state.moves + 1;
    _session.addAttempt();
    if (piece.row != row || piece.col != col) {
      final key = '$row,$col';
      state = state.copyWith(selectedId: () => null, wrongCell: () => key, moves: moves);
      _feedback.haptic(HapticKind.error);
      _timers.later(const Duration(milliseconds: 600), () {
        if (state.wrongCell == key) state = state.copyWith(wrongCell: () => null);
      });
      return;
    }
    final next = [
      for (final p in state.pieces) p.id == pieceId ? p.placedAt(row, col) : p,
    ];
    state = state.copyWith(pieces: next, selectedId: () => null, moves: moves);
    _feedback.haptic(HapticKind.light);
    if (isPuzzleComplete(next) && !_completing) {
      _completing = true;
      _timers.later(const Duration(milliseconds: 300), _finish);
    }
  }

  void _finish() {
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {
        'correctAnswers': state.pieces.where(isPieceCorrect).length,
        'totalQuestions': state.pieces.length,
      },
      attempts: state.moves,
    );
  }

  void restart() {
    _timers.cancelAll();
    _completing = false;
    state = JigsawState(
      gridSize: state.gridSize,
      pieces: createPuzzlePieces(state.gridSize, _rng),
    );
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final jigsawControllerProvider = StateNotifierProvider.family
    .autoDispose<JigsawController, JigsawState, JigsawArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(jigsawSessionArgs(args)).notifier);
  return JigsawController(session, ref.watch(gameFeedbackProvider), args);
});
