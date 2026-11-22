import 'dart:math';

import '../framework/session_timers.dart';

/// Port of apps/web `utils/puzzleUtils.ts` (pieces and grid sizes). The
/// pictures are the same SVG scenes as web, drawn by `JigsawScenePainter`.

/// Pieces per side (web `GRID_SIZES`).
const Map<String, int> kJigsawGridSizes = {'easy': 3, 'medium': 4, 'hard': 5};

int jigsawGridSize(String difficulty) => kJigsawGridSizes[difficulty] ?? 3;

/// Picture ids and emoji, in web order (web `PUZZLE_IMAGES`).
const List<({String id, String emoji})> kJigsawImages = [
  (id: 'sunset', emoji: '🌅'),
  (id: 'mountains', emoji: '🏔'),
  (id: 'forest', emoji: '🌲'),
  (id: 'ocean', emoji: '🌊'),
  (id: 'space', emoji: '🚀'),
  (id: 'garden', emoji: '🌸'),
  (id: 'city', emoji: '🏙'),
  (id: 'arctic', emoji: '❄'),
];

/// Picture id from a query value; unknown ids fall back to the first picture.
String jigsawImageId(String? id) =>
    kJigsawImages.any((i) => i.id == id) ? id! : kJigsawImages.first.id;

class PuzzlePiece {
  const PuzzlePiece({
    required this.id,
    required this.row,
    required this.col,
    this.currentRow,
    this.currentCol,
  });

  /// Index in row-major order of the finished picture.
  final int id;

  /// Correct place.
  final int row;
  final int col;

  /// Where the player put it; null while it is still in the tray.
  final int? currentRow;
  final int? currentCol;

  bool get placed => currentRow != null;

  PuzzlePiece placedAt(int r, int c) =>
      PuzzlePiece(id: id, row: row, col: col, currentRow: r, currentCol: c);
}

/// All pieces in the tray, in shuffled order.
List<PuzzlePiece> createPuzzlePieces(int gridSize, Random rng) {
  final pieces = [
    for (var r = 0; r < gridSize; r++)
      for (var c = 0; c < gridSize; c++)
        PuzzlePiece(id: r * gridSize + c, row: r, col: c),
  ];
  return shuffled(pieces, rng);
}

bool isPieceCorrect(PuzzlePiece p) => p.currentRow == p.row && p.currentCol == p.col;

bool isPuzzleComplete(List<PuzzlePiece> pieces) => pieces.every(isPieceCorrect);
