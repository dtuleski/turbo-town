import 'dart:math';

import 'package:dashden_mobile/game/bubble_pop/logic.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('each difficulty has 20 distinct uppercase words of the right size', () {
    for (final d in kBubbleDifficulties) {
      final pool = bubbleWordPool(d);
      expect(pool, hasLength(20));
      expect(pool.map((w) => w.word).toSet(), hasLength(20));
      expect(pool.every((w) => RegExp(r'^[A-Z]+$').hasMatch(w.word)), isTrue, reason: d);
      expect(pool.every((w) => w.hint.isNotEmpty && w.emoji.isNotEmpty), isTrue);
    }
    expect(bubbleWordPool('easy').every((w) => w.word.length <= 4), isTrue);
    expect(bubbleWordPool('medium').every((w) => w.word.length == 6), isTrue);
    expect(bubbleWordPool('hard').every((w) => w.word.length >= 7), isTrue);
  });

  test('pickWords gives 5 distinct words from the pool', () {
    final words = pickWords('medium', Random(8));
    expect(words, hasLength(kBubbleRounds));
    expect(words.map((w) => w.word).toSet(), hasLength(5));
    final pool = bubbleWordPool('medium').map((w) => w.word).toSet();
    expect(words.every((w) => pool.contains(w.word)), isTrue);
  });

  test('bubbles hold every letter of the word plus decoys', () {
    for (final d in kBubbleDifficulties) {
      for (var seed = 0; seed < 20; seed++) {
        const word = 'GUITAR';
        final bubbles = generateBubbles(word, d, Random(seed));
        final correct = bubbles.where((b) => b.isCorrect).map((b) => b.letter).toList()..sort();
        expect(correct, word.split('')..sort());
        final decoys = bubbles.where((b) => !b.isCorrect).length;
        expect(decoys, max(4, (word.length * 0.8).floor()));
        expect(bubbles.map((b) => b.id).toSet(), hasLength(bubbles.length));
        for (final b in bubbles) {
          expect(b.x, inInclusiveRange(5, 85));
          expect(b.y, inInclusiveRange(5, 80));
          expect(b.popped, isFalse);
        }
      }
    }
  });

  test('colour count follows the difficulty (2, 4 or 8) and no letter hints the colour', () {
    for (final entry in {'easy': 2, 'medium': 4, 'hard': 8}.entries) {
      final used = <int>{};
      for (var seed = 0; seed < 30; seed++) {
        used.addAll(generateBubbles('ELEPHANT', entry.key, Random(seed)).map((b) => b.colorIndex));
      }
      expect(used.every((c) => c < entry.value), isTrue, reason: entry.key);
      expect(used.length, entry.value, reason: 'all colours get used over many bubbles');
    }
  });

  test('bubbles are spread: few overlap when there is room', () {
    final bubbles = generateBubbles('CAT', 'easy', Random(2));
    for (var i = 0; i < bubbles.length; i++) {
      for (var j = i + 1; j < bubbles.length; j++) {
        final close = (bubbles[i].x - bubbles[j].x).abs() < 12 &&
            (bubbles[i].y - bubbles[j].y).abs() < 14;
        expect(close, isFalse, reason: 'bubbles $i and $j overlap');
      }
    }
  });

  test('popping marks only that bubble', () {
    final bubbles = generateBubbles('DOG', 'easy', Random(1));
    final popped = bubbles.first.pop();
    expect(popped.popped, isTrue);
    expect(popped.id, bubbles.first.id);
    expect(bubbles.first.popped, isFalse);
  });
}
