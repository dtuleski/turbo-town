import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../quiz/quiz_engine.dart';
import 'logic.dart';

typedef SudokuArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs sudokuSessionArgs(SudokuArgs a) => (
      themeId: 'SUDOKU',
      difficulty: quizDifficultyNumber(a.difficulty),
      questContext: a.quest,
    );

class SudokuState {
  const SudokuState({
    required this.grid,
    required this.given,
    required this.solution,
    required this.notes,
    this.selected,
    this.noteMode = false,
    this.mistakes = 0,
  });

  final SudokuGrid grid;
  final List<List<bool>> given;
  final SudokuGrid solution;

  /// Pencil marks per cell.
  final List<List<Set<int>>> notes;
  final ({int row, int col})? selected;
  final bool noteMode;
  final int mistakes;

  int get givenCount => given.expand((r) => r).where((g) => g).length;

  /// How many times [n] is on the board.
  int count(int n) => grid.expand((r) => r).where((v) => v == n).length;

  SudokuState copyWith({
    SudokuGrid? grid,
    List<List<Set<int>>>? notes,
    ({int row, int col})? selected,
    bool? noteMode,
    int? mistakes,
  }) =>
      SudokuState(
        grid: grid ?? this.grid,
        given: given,
        solution: solution,
        notes: notes ?? this.notes,
        selected: selected ?? this.selected,
        noteMode: noteMode ?? this.noteMode,
        mistakes: mistakes ?? this.mistakes,
      );
}

SudokuState newSudokuState(String difficulty, Random rng) {
  final p = generateSudoku(difficulty, rng);
  return SudokuState(
    grid: copyGrid(p.puzzle),
    given: [for (final r in p.puzzle) [for (final v in r) v != 0]],
    solution: p.solution,
    notes: List.generate(9, (_) => List.generate(9, (_) => <int>{})),
  );
}

/// Sudoku board. The server scores from filled cells and mistakes.
class SudokuController extends StateNotifier<SudokuState> {
  SudokuController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        super(newSudokuState(args.difficulty, random ?? Random()));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final SudokuArgs args;
  final Random _rng;

  bool get _active => _session.state.phase == SessionPhase.playing;

  void select(int row, int col) {
    if (!_active) return;
    state = state.copyWith(selected: (row: row, col: col));
  }

  void toggleNotes() {
    if (!_active) return;
    state = state.copyWith(noteMode: !state.noteMode);
  }

  List<List<Set<int>>> _copyNotes() => [
        for (final r in state.notes) [for (final s in r) {...s}],
      ];

  void enter(int num) {
    final sel = state.selected;
    if (!_active || sel == null || state.given[sel.row][sel.col]) return;
    if (state.noteMode) {
      final notes = _copyNotes();
      final cell = notes[sel.row][sel.col];
      if (!cell.remove(num)) cell.add(num);
      state = state.copyWith(notes: notes);
      return;
    }
    final grid = copyGrid(state.grid);
    grid[sel.row][sel.col] = num;
    final notes = _copyNotes();
    notes[sel.row][sel.col].clear();
    var mistakes = state.mistakes;
    if (state.solution[sel.row][sel.col] != num) {
      mistakes++;
      _feedback.haptic(HapticKind.error);
    } else {
      _feedback.haptic(HapticKind.light);
    }
    state = state.copyWith(grid: grid, notes: notes, mistakes: mistakes);
    if (isSudokuGridComplete(grid)) _finish();
  }

  void erase() {
    final sel = state.selected;
    if (!_active || sel == null || state.given[sel.row][sel.col]) return;
    final grid = copyGrid(state.grid);
    grid[sel.row][sel.col] = 0;
    final notes = _copyNotes();
    notes[sel.row][sel.col].clear();
    state = state.copyWith(grid: grid, notes: notes);
  }

  void _finish() {
    final filled = 81 - state.givenCount;
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {
        'correctAnswers': max(0, filled - state.mistakes),
        'totalQuestions': filled,
      },
      attempts: state.mistakes + filled,
    );
  }

  void restart() => state = newSudokuState(args.difficulty, _rng);
}

final sudokuControllerProvider = StateNotifierProvider.family
    .autoDispose<SudokuController, SudokuState, SudokuArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(sudokuSessionArgs(args)).notifier);
  return SudokuController(session, ref.watch(gameFeedbackProvider), args);
});
