import 'dart:math';

import 'package:flutter/painting.dart' show Color;

import '../framework/session_timers.dart';
import 'words.g.dart';

export 'words.g.dart';

/// Port of apps/web `utils/bubblePopUtils.ts`.
const int kBubbleRounds = 5;
const int kBubbleMaxLives = 3;

const List<String> kBubbleDifficulties = ['easy', 'medium', 'hard'];

const String _alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/// Light, base and dark shade per bubble colour (web `BUBBLE_COLORS`).
const List<List<Color>> kBubbleColors = [
  [Color(0xFF60A5FA), Color(0xFF3B82F6), Color(0xFF2563EB)], // blue
  [Color(0xFFF472B6), Color(0xFFEC4899), Color(0xFFDB2777)], // pink
  [Color(0xFF4ADE80), Color(0xFF22C55E), Color(0xFF16A34A)], // green
  [Color(0xFFFACC15), Color(0xFFEAB308), Color(0xFFCA8A04)], // yellow
  [Color(0xFFC084FC), Color(0xFFA855F7), Color(0xFF9333EA)], // purple
  [Color(0xFFFB923C), Color(0xFFF97316), Color(0xFFEA580C)], // orange
  [Color(0xFF2DD4BF), Color(0xFF14B8A6), Color(0xFF0D9488)], // teal
  [Color(0xFFF87171), Color(0xFFEF4444), Color(0xFFDC2626)], // red
];

class Bubble {
  const Bubble({
    required this.id,
    required this.letter,
    required this.x,
    required this.y,
    required this.isCorrect,
    required this.delay,
    required this.colorIndex,
    this.popped = false,
  });

  final int id;
  final String letter;

  /// Position as a percentage of the field.
  final double x;
  final double y;
  final bool isCorrect;

  /// Float animation offset, 0..0.5 s.
  final double delay;
  final int colorIndex;
  final bool popped;

  Bubble pop() => Bubble(
        id: id,
        letter: letter,
        x: x,
        y: y,
        isCorrect: isCorrect,
        delay: delay,
        colorIndex: colorIndex,
        popped: true,
      );
}

List<WordChallenge> bubbleWordPool(String difficulty) => switch (difficulty) {
      'medium' => kBubbleMediumWords,
      'hard' => kBubbleHardWords,
      _ => kBubbleEasyWords,
    };

int bubbleDifficultyValue(String difficulty) => switch (difficulty) {
      'medium' => 2,
      'hard' => 3,
      _ => 1,
    };

/// [count] distinct random words for one game.
List<WordChallenge> pickWords(String difficulty, Random rng, [int count = kBubbleRounds]) =>
    shuffled(bubbleWordPool(difficulty), rng).take(count).toList();

/// Bubbles for [word]: one per letter plus decoys, shuffled and spread over the
/// field without much overlap. Easy uses 2 colours, medium 4, hard 8, all
/// random (no colour hint).
List<Bubble> generateBubbles(String word, String difficulty, Random rng) {
  final letters = word.split('');
  final decoyCount = max(4, (word.length * 0.8).floor());
  final decoys = <String>[];
  for (var i = 0; i < decoyCount; i++) {
    String letter;
    do {
      letter = _alphabet[rng.nextInt(26)];
      // Sometimes a decoy may repeat a correct letter.
    } while (letters.contains(letter) && rng.nextDouble() > 0.3);
    decoys.add(letter);
  }
  final all = shuffled([
    for (final l in letters) (letter: l, isCorrect: true),
    for (final l in decoys) (letter: l, isCorrect: false),
  ], rng);
  final colorCount = difficulty == 'easy' ? 2 : (difficulty == 'medium' ? 4 : 8);
  final positions = <({double x, double y})>[];
  final bubbles = <Bubble>[];
  for (var i = 0; i < all.length; i++) {
    late double x;
    late double y;
    var attempts = 0;
    do {
      x = 5 + rng.nextDouble() * 80;
      y = 5 + rng.nextDouble() * 75;
      attempts++;
    } while (attempts < 50 &&
        positions.any((p) => (p.x - x).abs() < 12 && (p.y - y).abs() < 14));
    positions.add((x: x, y: y));
    bubbles.add(Bubble(
      id: i,
      letter: all[i].letter,
      x: x,
      y: y,
      isCorrect: all[i].isCorrect,
      delay: rng.nextDouble() * 0.5,
      colorIndex: rng.nextInt(colorCount),
    ));
  }
  return bubbles;
}
