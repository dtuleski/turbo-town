import 'dart:math';

import '../framework/session_timers.dart';

/// Port of apps/web `utils/sudokuUtils.ts`. A grid is 9 rows of 9 ints, with
/// 0 for an empty cell.
typedef SudokuGrid = List<List<int>>;

/// Empty cells to dig per difficulty (web `CELLS_TO_REMOVE`).
const Map<String, int> kSudokuCellsToRemove = {'easy': 36, 'medium': 46, 'hard': 54};

/// Numbers shown as given, per difficulty, as the web setup page says.
const Map<String, int> kSudokuGivenLabel = {'easy': 45, 'medium': 35, 'hard': 27};

SudokuGrid _emptyGrid() => List.generate(9, (_) => List.filled(9, 0));

SudokuGrid copyGrid(SudokuGrid g) => [for (final r in g) List<int>.of(r)];

bool _canPlace(SudokuGrid g, int row, int col, int num) {
  for (var c = 0; c < 9; c++) {
    if (g[row][c] == num) return false;
  }
  for (var r = 0; r < 9; r++) {
    if (g[r][col] == num) return false;
  }
  final br = row ~/ 3 * 3;
  final bc = col ~/ 3 * 3;
  for (var r = br; r < br + 3; r++) {
    for (var c = bc; c < bc + 3; c++) {
      if (g[r][c] == num) return false;
    }
  }
  return true;
}

bool _fill(SudokuGrid g, Random rng) {
  for (var row = 0; row < 9; row++) {
    for (var col = 0; col < 9; col++) {
      if (g[row][col] != 0) continue;
      for (final n in shuffled(const [1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
        if (_canPlace(g, row, col, n)) {
          g[row][col] = n;
          if (_fill(g, rng)) return true;
          g[row][col] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

/// Number of solutions of [grid], counting up to [limit] (default 2, enough to
/// tell a unique puzzle). [grid] is changed while solving and restored.
int countSudokuSolutions(SudokuGrid grid, {int limit = 2}) {
  var count = 0;
  bool solve() {
    for (var row = 0; row < 9; row++) {
      for (var col = 0; col < 9; col++) {
        if (grid[row][col] != 0) continue;
        for (var n = 1; n <= 9; n++) {
          if (_canPlace(grid, row, col, n)) {
            grid[row][col] = n;
            if (solve()) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
    count++;
    return count >= limit;
  }

  solve();
  return count;
}

typedef SudokuPuzzle = ({SudokuGrid puzzle, SudokuGrid solution});

/// A puzzle with a unique solution. Cells are dug in random order; a cell
/// stays dug only while the solution remains unique, so a puzzle can end with
/// fewer empty cells than asked for (same as web).
SudokuPuzzle generateSudoku(String difficulty, Random rng) {
  final solution = _emptyGrid();
  _fill(solution, rng);
  final puzzle = copyGrid(solution);
  final toRemove = kSudokuCellsToRemove[difficulty] ?? kSudokuCellsToRemove['easy']!;
  final positions = shuffled([for (var i = 0; i < 81; i++) i], rng);
  var removed = 0;
  for (final p in positions) {
    if (removed >= toRemove) break;
    final row = p ~/ 9;
    final col = p % 9;
    final backup = puzzle[row][col];
    puzzle[row][col] = 0;
    if (countSudokuSolutions(copyGrid(puzzle)) == 1) {
      removed++;
    } else {
      puzzle[row][col] = backup;
    }
  }
  return (puzzle: puzzle, solution: solution);
}

/// No duplicate in any row, column or box (empty cells are ignored).
bool isSudokuGridValid(SudokuGrid g) {
  for (var i = 0; i < 9; i++) {
    final row = <int>{};
    final col = <int>{};
    final box = <int>{};
    for (var j = 0; j < 9; j++) {
      final r = g[i][j];
      if (r != 0 && !row.add(r)) return false;
      final c = g[j][i];
      if (c != 0 && !col.add(c)) return false;
      final b = g[i ~/ 3 * 3 + j ~/ 3][i % 3 * 3 + j % 3];
      if (b != 0 && !box.add(b)) return false;
    }
  }
  return true;
}

/// Every cell filled and no duplicates.
bool isSudokuGridComplete(SudokuGrid g) {
  for (final row in g) {
    if (row.contains(0)) return false;
  }
  return isSudokuGridValid(g);
}

/// True when the value at [row],[col] also appears in its row, column or box.
bool sudokuHasConflict(SudokuGrid g, int row, int col) {
  final v = g[row][col];
  if (v == 0) return false;
  for (var c = 0; c < 9; c++) {
    if (c != col && g[row][c] == v) return true;
  }
  for (var r = 0; r < 9; r++) {
    if (r != row && g[r][col] == v) return true;
  }
  final br = row ~/ 3 * 3;
  final bc = col ~/ 3 * 3;
  for (var r = br; r < br + 3; r++) {
    for (var c = bc; c < bc + 3; c++) {
      // Web only compares cells that differ in both row and column here; the
      // row and column checks above already cover the shared lines.
      if (r != row && c != col && g[r][c] == v) return true;
    }
  }
  return false;
}
