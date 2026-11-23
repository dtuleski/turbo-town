import 'dart:math';

import 'package:flutter/painting.dart' show Color;

/// Port of apps/web `utils/patternRecallUtils.ts`.
class PatternItem {
  const PatternItem(this.id, this.visual, {this.color});
  final String id;

  /// Emoji shown on the tile (colour themes show a coloured tile instead).
  final String visual;
  final Color? color;
}

class PatternTheme {
  const PatternTheme(this.id, this.icon, this.items);
  final String id;
  final String icon;

  /// Up to 6 items; the difficulty takes the first N.
  final List<PatternItem> items;
}

class PatternDifficulty {
  const PatternDifficulty(this.id, this.itemCount, this.playbackMs, this.apiValue);
  final String id;
  final int itemCount;

  /// Milliseconds per item while the pattern plays.
  final int playbackMs;
  final int apiValue;
}

const List<PatternTheme> kPatternThemes = [
  PatternTheme('colors', '🎨', [
    PatternItem('red', '', color: Color(0xFFEF4444)),
    PatternItem('blue', '', color: Color(0xFF3B82F6)),
    PatternItem('green', '', color: Color(0xFF22C55E)),
    PatternItem('yellow', '', color: Color(0xFFEAB308)),
    PatternItem('purple', '', color: Color(0xFFA855F7)),
    PatternItem('orange', '', color: Color(0xFFF97316)),
  ]),
  PatternTheme('animals', '🐾', [
    PatternItem('dog', '🐶'),
    PatternItem('cat', '🐱'),
    PatternItem('rabbit', '🐰'),
    PatternItem('bear', '🐻'),
    PatternItem('fox', '🦊'),
    PatternItem('penguin', '🐧'),
  ]),
  PatternTheme('musical-notes', '🎵', [
    PatternItem('quarter', '🎵'),
    PatternItem('eighth', '🎶'),
    PatternItem('trumpet', '🎺'),
    PatternItem('guitar', '🎸'),
    PatternItem('drum', '🥁'),
    PatternItem('piano', '🎹'),
  ]),
  PatternTheme('emojis', '😀', [
    PatternItem('smile', '😀'),
    PatternItem('heart', '❤'),
    PatternItem('star', '⭐'),
    PatternItem('fire', '🔥'),
    PatternItem('rainbow', '🌈'),
    PatternItem('rocket', '🚀'),
  ]),
];

const List<PatternDifficulty> kPatternDifficulties = [
  PatternDifficulty('easy', 4, 800, 1),
  PatternDifficulty('medium', 5, 600, 2),
  PatternDifficulty('hard', 6, 400, 3),
];

const int kPatternMaxLives = 3;

PatternTheme? patternThemeById(String? id) {
  for (final t in kPatternThemes) {
    if (t.id == id) return t;
  }
  return null;
}

PatternDifficulty? patternDifficultyById(String? id) {
  for (final d in kPatternDifficulties) {
    if (d.id == id) return d;
  }
  return null;
}

/// Items on the grid for [theme] at [difficulty].
List<PatternItem> getGridItems(PatternTheme theme, PatternDifficulty difficulty) =>
    theme.items.take(difficulty.itemCount).toList();

List<int> generateInitialSequence(int itemCount, Random rng) => [rng.nextInt(itemCount)];

List<int> extendSequence(List<int> sequence, int itemCount, Random rng) =>
    [...sequence, rng.nextInt(itemCount)];

bool validateTap(List<int> sequence, int inputIndex, int tappedIndex) =>
    inputIndex < sequence.length && tappedIndex == sequence[inputIndex];
