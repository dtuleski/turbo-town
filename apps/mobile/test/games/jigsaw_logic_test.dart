import 'dart:math';

import 'package:dashden_mobile/game/jigsaw/jigsaw_scenes.g.dart';
import 'package:dashden_mobile/game/jigsaw/logic.dart';
import 'package:dashden_mobile/ui/screens/games/jigsaw_scene.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('grid sizes follow the difficulty', () {
    expect(jigsawGridSize('easy'), 3);
    expect(jigsawGridSize('medium'), 4);
    expect(jigsawGridSize('hard'), 5);
    expect(jigsawGridSize('nope'), 3);
  });

  test('pieces cover the grid once each, all start in the tray', () {
    final pieces = createPuzzlePieces(4, Random(5));
    expect(pieces, hasLength(16));
    expect(pieces.map((p) => p.id).toSet(), hasLength(16));
    for (final p in pieces) {
      expect(p.id, p.row * 4 + p.col);
      expect(p.placed, isFalse);
    }
  });

  test('the tray order is shuffled and depends on the seed', () {
    final a = createPuzzlePieces(5, Random(1)).map((p) => p.id).toList();
    final b = createPuzzlePieces(5, Random(1)).map((p) => p.id).toList();
    final c = createPuzzlePieces(5, Random(2)).map((p) => p.id).toList();
    expect(a, b);
    expect(a, isNot(c));
    expect(a, isNot(List.generate(25, (i) => i)));
  });

  test('a piece is correct only on its own cell; the puzzle needs them all', () {
    var pieces = createPuzzlePieces(3, Random(0));
    expect(isPuzzleComplete(pieces), isFalse);
    expect(isPieceCorrect(pieces.first.placedAt(pieces.first.row, pieces.first.col)), isTrue);
    expect(isPieceCorrect(pieces.first.placedAt((pieces.first.row + 1) % 3, pieces.first.col)),
        isFalse);
    pieces = [for (final p in pieces) p.placedAt(p.row, p.col)];
    expect(isPuzzleComplete(pieces), isTrue);
  });

  test('image ids: known ones are kept, others fall back to the first', () {
    expect(kJigsawImages, hasLength(8));
    expect(jigsawImageId('ocean'), 'ocean');
    expect(jigsawImageId('nope'), 'sunset');
    expect(jigsawImageId(null), 'sunset');
  });

  test('every scene parses into shapes (same pictures as web)', () {
    expect(kJigsawSceneSvg.keys.toSet(), kJigsawImages.map((i) => i.id).toSet());
    for (final i in kJigsawImages) {
      expect(jigsawSceneShapeCount(i.id), greaterThan(5), reason: i.id);
    }
    // 8 scenes, element counts taken from the web source.
    final total = kJigsawImages.fold<int>(0, (n, i) => n + jigsawSceneShapeCount(i.id));
    expect(total, 53 + 10 + 8 + 15 + 41);
  });
}
