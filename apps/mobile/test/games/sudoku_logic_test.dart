import 'dart:math';

import 'package:dashden_mobile/game/sudoku/logic.dart';
import 'package:flutter_test/flutter_test.dart';

int _empty(SudokuGrid g) => g.expand((r) => r).where((v) => v == 0).length;

void main() {
  group('generateSudoku', () {
    for (final entry in kSudokuCellsToRemove.entries) {
      test('${entry.key}: valid, unique and matches its solution', () {
        final p = generateSudoku(entry.key, Random(42));
        expect(isSudokuGridComplete(p.solution), isTrue);
        expect(isSudokuGridValid(p.puzzle), isTrue);
        // Every given cell equals the solution.
        for (var r = 0; r < 9; r++) {
          for (var c = 0; c < 9; c++) {
            if (p.puzzle[r][c] != 0) expect(p.puzzle[r][c], p.solution[r][c]);
          }
        }
        // Digging stops at the target, or earlier if uniqueness would break.
        expect(_empty(p.puzzle), lessThanOrEqualTo(entry.value));
        expect(_empty(p.puzzle), greaterThan(entry.value - 10));
        expect(countSudokuSolutions(copyGrid(p.puzzle)), 1);
      });
    }

    test('the same seed gives the same puzzle', () {
      final a = generateSudoku('easy', Random(7));
      final b = generateSudoku('easy', Random(7));
      expect(a.puzzle, b.puzzle);
      expect(a.solution, b.solution);
    });

    test('an unknown difficulty plays like easy', () {
      final p = generateSudoku('nope', Random(1));
      expect(_empty(p.puzzle), lessThanOrEqualTo(36));
    });
  });

  group('validation', () {
    SudokuGrid solved() => generateSudoku('easy', Random(3)).solution;

    test('a full valid grid is complete', () {
      expect(isSudokuGridComplete(solved()), isTrue);
    });

    test('an empty cell makes it incomplete but still valid', () {
      final g = solved()..[4][4] = 0;
      expect(isSudokuGridComplete(g), isFalse);
      expect(isSudokuGridValid(g), isTrue);
    });

    test('a duplicate in a row, column or box is invalid', () {
      final row = solved();
      row[0][1] = row[0][0];
      expect(isSudokuGridValid(row), isFalse);
      final col = solved();
      col[1][0] = col[0][0];
      expect(isSudokuGridValid(col), isFalse);
      final box = List.generate(9, (_) => List.filled(9, 0));
      box[0][0] = 5;
      box[1][1] = 5;
      expect(isSudokuGridValid(box), isFalse);
    });

    test('hasConflict flags a value that repeats in its row, column or box', () {
      final g = List.generate(9, (_) => List.filled(9, 0));
      g[0][0] = 5;
      expect(sudokuHasConflict(g, 0, 0), isFalse);
      g[0][8] = 5; // same row
      expect(sudokuHasConflict(g, 0, 0), isTrue);
      g[0][8] = 0;
      g[8][0] = 5; // same column
      expect(sudokuHasConflict(g, 0, 0), isTrue);
      g[8][0] = 0;
      g[1][1] = 5; // same box
      expect(sudokuHasConflict(g, 0, 0), isTrue);
      expect(sudokuHasConflict(g, 4, 4), isFalse, reason: 'empty cells never conflict');
    });
  });

  test('countSudokuSolutions stops at the limit', () {
    final empty = List.generate(9, (_) => List.filled(9, 0));
    expect(countSudokuSolutions(empty), 2);
  });
}
