import 'dart:math';

import 'package:dashden_mobile/game/data/quiz_data.dart';
import 'package:dashden_mobile/game/word_puzzle/word_puzzle_logic.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final rng = Random(11);

  test('difficulty table matches the web page', () {
    const d = kWordPuzzleDifficulties;
    expect(d.map((x) => x.gridSize), [10, 12, 15]);
    expect(d.map((x) => x.wordCount), [6, 8, 10]);
    expect(d.map((x) => x.timeLimit), [300, 420, 600]);
    expect(d.map((x) => x.apiValue), [1, 2, 3]);
    expect(wordPuzzleDifficultyById('???').id, 'easy');
  });

  test('every placed word really is in the grid, in its stored position', () {
    for (final d in kWordPuzzleDifficulties) {
      for (final locale in ['en', 'es', 'pt', 'fr', null]) {
        final p = generateWordPuzzle(d.id, locale, rng);
        expect(p.grid.length, d.gridSize);
        expect(p.grid.every((r) => r.length == d.gridSize), isTrue);
        expect(p.grid.expand((r) => r).every((c) => c.length == 1), isTrue);
        expect(p.words.length, p.positions.length);
        expect(p.words.length, lessThanOrEqualTo(d.wordCount));
        expect(p.words.length, greaterThan(d.wordCount - 3), reason: 'most words fit');
        for (final pos in p.positions) {
          final cells = wordCells(pos.word, pos.startRow, pos.startCol, pos.direction);
          expect(cells.map((c) => p.grid[c.row][c.col]).join(), pos.word);
          // And the finder agrees.
          expect(checkWord(p.grid, cells, p.words), pos.word);
        }
      }
    }
  });

  test('words come from the list for the locale; unknown locale is English', () {
    for (final entry in {'es': 'es', 'pt-BR': 'pt', 'xx': 'en', null: 'en'}.entries) {
      final p = generateWordPuzzle('easy', entry.key, rng);
      final list = wordPuzzleLists[entry.value]!['easy']!;
      expect(p.words.every(list.contains), isTrue, reason: '${entry.key}');
    }
  });

  test('checkWord reads forward and backward and needs 3 cells', () {
    final grid = [
      ['C', 'A', 'T'],
      ['X', 'X', 'X'],
      ['X', 'X', 'X'],
    ];
    const row = [Cell(0, 0), Cell(0, 1), Cell(0, 2)];
    expect(checkWord(grid, row, ['CAT']), 'CAT');
    expect(checkWord(grid, row.reversed.toList(), ['CAT']), 'CAT');
    expect(checkWord(grid, row, ['DOG']), isNull);
    expect(checkWord(grid, row.take(2).toList(), ['CA']), isNull);
  });

  test('isValidSelection accepts straight lines only', () {
    expect(isValidSelection(const [Cell(0, 0)]), isTrue);
    expect(isValidSelection(const [Cell(0, 0), Cell(0, 1), Cell(0, 2)]), isTrue);
    expect(isValidSelection(const [Cell(0, 0), Cell(1, 0), Cell(2, 0)]), isTrue);
    expect(isValidSelection(const [Cell(0, 0), Cell(1, 1), Cell(2, 2)]), isTrue);
    expect(isValidSelection(const [Cell(2, 2), Cell(1, 1), Cell(0, 0)]), isTrue);
    expect(isValidSelection(const [Cell(0, 0), Cell(1, 2)]), isFalse);
    expect(isValidSelection(const [Cell(0, 0), Cell(0, 1), Cell(1, 1)]), isFalse);
  });

  test('lineBetween fills the cells a fast swipe skipped', () {
    expect(lineBetween(const Cell(0, 0), const Cell(0, 3)),
        [const Cell(0, 0), const Cell(0, 1), const Cell(0, 2), const Cell(0, 3)]);
    expect(lineBetween(const Cell(3, 3), const Cell(1, 1)),
        [const Cell(3, 3), const Cell(2, 2), const Cell(1, 1)]);
    expect(lineBetween(const Cell(0, 0), const Cell(1, 2)), isNull);
    expect(lineBetween(const Cell(2, 2), const Cell(2, 2)), [const Cell(2, 2)]);
  });
}
