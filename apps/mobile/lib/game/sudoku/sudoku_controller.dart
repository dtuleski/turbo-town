import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/challenge_models.dart';
import '../../api/quest_models.dart';
import '../../challenge/challenge_content.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../quiz/quiz_engine.dart';
import 'logic.dart';

typedef SudokuArgs = ({String difficulty, QuestContext? quest});

/// A Daily Challenge round: [args] carries the challenge difficulty.
typedef SudokuChallengeArgs = ({SudokuArgs args, GivenChallenge<SudokuContent> challenge});

GameSessionArgs sudokuSessionArgs(SudokuArgs a, {String? challengeDay}) => (
      themeId: 'SUDOKU',
      difficulty: quizDifficultyNumber(a.difficulty),
      questContext: a.quest,
      challengeDay: challengeDay,
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

SudokuState newSudokuState(String difficulty, Random rng) =>
    _sudokuState(generateSudoku(difficulty, rng));

SudokuState _sudokuState(({SudokuGrid puzzle, SudokuGrid solution}) p) {
  return SudokuState(
    grid: copyGrid(p.puzzle),
    given: [for (final r in p.puzzle) [for (final v in r) v != 0]],
    solution: p.solution,
    notes: List.generate(9, (_) => List.generate(9, (_) => <int>{})),
  );
}

/// Sudoku board. The server scores from filled cells and mistakes. [given] (a
/// Daily Challenge) is played instead of a generated puzzle.
class SudokuController extends StateNotifier<SudokuState> {
  SudokuController(this._session, this._feedback, this.args, {Random? random, SudokuContent? given})
      : _rng = random ?? Random(),
        _given = given,
        super(given != null
            ? _sudokuState(sudokuFromChallenge(given))
            : newSudokuState(args.difficulty, random ?? Random()));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final SudokuArgs args;
  final Random _rng;
  final SudokuContent? _given;

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

  void restart() {
    final given = _given;
    state = given != null
        ? _sudokuState(sudokuFromChallenge(given))
        : newSudokuState(args.difficulty, _rng);
  }
}

final sudokuControllerProvider = StateNotifierProvider.family
    .autoDispose<SudokuController, SudokuState, SudokuArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(sudokuSessionArgs(args)).notifier);
  return SudokuController(session, ref.watch(gameFeedbackProvider), args);
});

/// The board of a Daily Challenge round: the served puzzle.
final sudokuChallengeControllerProvider = StateNotifierProvider.family
    .autoDispose<SudokuController, SudokuState, SudokuChallengeArgs>((ref, key) {
  final session = ref.watch(
    gameSessionProvider(sudokuSessionArgs(key.args, challengeDay: key.challenge.day)).notifier,
  );
  return SudokuController(session, ref.watch(gameFeedbackProvider), key.args,
      given: key.challenge.content);
});
