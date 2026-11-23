import 'dart:math';

import '../data/quiz_data.dart';

/// Pure Word Puzzle rules. Port of apps/web `utils/wordPuzzleUtils.ts` and the
/// difficulty table in `pages/word-puzzle/WordPuzzleGamePage.tsx`.
class Cell {
  const Cell(this.row, this.col);

  final int row;
  final int col;

  @override
  bool operator ==(Object other) => other is Cell && other.row == row && other.col == col;

  @override
  int get hashCode => Object.hash(row, col);

  @override
  String toString() => 'Cell($row, $col)';
}

enum WordDirection { horizontal, vertical, diagonal }

class WordPosition {
  const WordPosition(this.word, this.startRow, this.startCol, this.direction);

  final String word;
  final int startRow;
  final int startCol;
  final WordDirection direction;
}

class WordPuzzleDifficulty {
  const WordPuzzleDifficulty({
    required this.id,
    required this.emoji,
    required this.gridSize,
    required this.wordCount,
    required this.timeLimit,
    required this.apiValue,
  });

  final String id;
  final String emoji;
  final int gridSize;
  final int wordCount;

  /// Seconds for the round.
  final int timeLimit;
  final int apiValue;
}

const List<WordPuzzleDifficulty> kWordPuzzleDifficulties = [
  WordPuzzleDifficulty(id: 'easy', emoji: '🟢', gridSize: 10, wordCount: 6, timeLimit: 300, apiValue: 1),
  WordPuzzleDifficulty(id: 'medium', emoji: '🟡', gridSize: 12, wordCount: 8, timeLimit: 420, apiValue: 2),
  WordPuzzleDifficulty(id: 'hard', emoji: '🔴', gridSize: 15, wordCount: 10, timeLimit: 600, apiValue: 3),
];

WordPuzzleDifficulty wordPuzzleDifficultyById(String? id) =>
    kWordPuzzleDifficulties.firstWhere((d) => d.id == id, orElse: () => kWordPuzzleDifficulties.first);

class WordPuzzle {
  const WordPuzzle({required this.grid, required this.words, required this.positions, required this.gridSize});

  final List<List<String>> grid;

  /// Words that were placed in the grid. A word that did not fit is dropped so
  /// the player is never asked for one that is not there.
  final List<String> words;
  final List<WordPosition> positions;
  final int gridSize;
}

const String _letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/// Word list for [locale] (`es-AR` becomes `es`); unknown languages use English.
Map<String, List<String>> _listsFor(String? locale, Map<String, Map<String, List<String>>> data) {
  final lang = (locale ?? 'en').length >= 2 ? (locale ?? 'en').substring(0, 2) : 'en';
  return data[lang] ?? data['en']!;
}

WordPuzzle generateWordPuzzle(
  String difficulty,
  String? locale,
  Random rng, {
  Map<String, Map<String, List<String>>>? lists,
}) {
  final config = wordPuzzleDifficultyById(difficulty);
  final size = config.gridSize;
  final pool = _listsFor(locale, lists ?? wordPuzzleLists)[config.id]!;
  final selected = ([...pool]..shuffle(rng)).take(config.wordCount).toList();
  final grid = List.generate(size, (_) => List.filled(size, ''));
  final positions = <WordPosition>[];
  for (final word in selected) {
    final p = _placeWord(grid, word, size, rng);
    if (p != null) positions.add(p);
  }
  for (var r = 0; r < size; r++) {
    for (var c = 0; c < size; c++) {
      if (grid[r][c].isEmpty) grid[r][c] = _letters[rng.nextInt(_letters.length)];
    }
  }
  return WordPuzzle(
    grid: grid,
    words: positions.map((p) => p.word).toList(),
    positions: positions,
    gridSize: size,
  );
}

WordPosition? _placeWord(List<List<String>> grid, String word, int size, Random rng) {
  final directions = [...WordDirection.values]..shuffle(rng);
  for (final direction in directions) {
    for (var attempt = 0; attempt < 50; attempt++) {
      final p = _tryPlace(grid, word, size, direction, rng);
      if (p != null) return p;
    }
  }
  return null;
}

/// Cells a word occupies from its start in [direction].
List<Cell> wordCells(String word, int startRow, int startCol, WordDirection direction) => [
      for (var i = 0; i < word.length; i++)
        switch (direction) {
          WordDirection.horizontal => Cell(startRow, startCol + i),
          WordDirection.vertical => Cell(startRow + i, startCol),
          WordDirection.diagonal => Cell(startRow + i, startCol + i),
        },
    ];

WordPosition? _tryPlace(
  List<List<String>> grid,
  String word,
  int size,
  WordDirection direction,
  Random rng,
) {
  // A word longer than the grid cannot start anywhere.
  final room = size - word.length + 1;
  if (room < 1) return null;
  final int row;
  final int col;
  switch (direction) {
    case WordDirection.horizontal:
      row = rng.nextInt(size);
      col = rng.nextInt(room);
    case WordDirection.vertical:
      row = rng.nextInt(room);
      col = rng.nextInt(size);
    case WordDirection.diagonal:
      row = rng.nextInt(room);
      col = rng.nextInt(room);
  }
  final cells = wordCells(word, row, col, direction);
  for (var i = 0; i < cells.length; i++) {
    final existing = grid[cells[i].row][cells[i].col];
    if (existing.isNotEmpty && existing != word[i]) return null;
  }
  for (var i = 0; i < cells.length; i++) {
    grid[cells[i].row][cells[i].col] = word[i];
  }
  return WordPosition(word, row, col, direction);
}

/// The word [selected] spells (forward or backward), or null. Needs 3+ cells.
String? checkWord(List<List<String>> grid, List<Cell> selected, List<String> words) {
  if (selected.length < 3) return null;
  final spelled = selected.map((c) => grid[c.row][c.col]).join();
  for (final target in words) {
    if (spelled == target || spelled == target.split('').reversed.join()) return target;
  }
  return null;
}

/// True when [selected] runs in one straight line (row, column or diagonal).
bool isValidSelection(List<Cell> selected) {
  if (selected.length < 2) return true;
  final rowDiff = selected[1].row - selected[0].row;
  final colDiff = selected[1].col - selected[0].col;
  final horizontal = rowDiff == 0;
  final vertical = colDiff == 0;
  final diagonal = rowDiff.abs() == colDiff.abs();
  if (!horizontal && !vertical && !diagonal) return false;
  for (var i = 2; i < selected.length; i++) {
    if (selected[i].row - selected[i - 1].row != rowDiff ||
        selected[i].col - selected[i - 1].col != colDiff) {
      return false;
    }
  }
  return true;
}

/// Cells on the straight line from [start] to [end], or null when the two do
/// not share a row, column or diagonal. Lets a fast swipe that skips cells
/// still select the whole line.
List<Cell>? lineBetween(Cell start, Cell end) {
  final dr = end.row - start.row;
  final dc = end.col - start.col;
  if (dr != 0 && dc != 0 && dr.abs() != dc.abs()) return null;
  final steps = max(dr.abs(), dc.abs());
  final sr = dr.sign;
  final sc = dc.sign;
  return [for (var i = 0; i <= steps; i++) Cell(start.row + sr * i, start.col + sc * i)];
}
