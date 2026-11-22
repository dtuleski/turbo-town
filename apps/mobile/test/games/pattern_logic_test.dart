import 'dart:math';

import 'package:dashden_mobile/game/pattern_recall/logic.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('difficulties match web (items, playback speed, API value)', () {
    final byId = {for (final d in kPatternDifficulties) d.id: d};
    expect([byId['easy']!.itemCount, byId['easy']!.playbackMs, byId['easy']!.apiValue], [4, 800, 1]);
    expect([byId['medium']!.itemCount, byId['medium']!.playbackMs, byId['medium']!.apiValue],
        [5, 600, 2]);
    expect([byId['hard']!.itemCount, byId['hard']!.playbackMs, byId['hard']!.apiValue], [6, 400, 3]);
  });

  test('four themes with six items each; colour items carry a colour', () {
    expect(kPatternThemes.map((t) => t.id), ['colors', 'animals', 'musical-notes', 'emojis']);
    for (final t in kPatternThemes) {
      expect(t.items, hasLength(6));
    }
    expect(kPatternThemes.first.items.every((i) => i.color != null), isTrue);
    expect(kPatternThemes[1].items.every((i) => i.visual.isNotEmpty), isTrue);
  });

  test('getGridItems slices the theme to the difficulty', () {
    final theme = patternThemeById('animals')!;
    expect(getGridItems(theme, patternDifficultyById('easy')!).map((i) => i.id),
        ['dog', 'cat', 'rabbit', 'bear']);
    expect(getGridItems(theme, patternDifficultyById('hard')!), hasLength(6));
    expect(patternThemeById('nope'), isNull);
    expect(patternDifficultyById(null), isNull);
  });

  test('sequences start at length 1 and grow by one within range', () {
    final rng = Random(3);
    var seq = generateInitialSequence(4, rng);
    expect(seq, hasLength(1));
    for (var i = 0; i < 30; i++) {
      final next = extendSequence(seq, 4, rng);
      expect(next, hasLength(seq.length + 1));
      expect(next.sublist(0, seq.length), seq);
      expect(next.every((v) => v >= 0 && v < 4), isTrue);
      seq = next;
    }
  });

  test('validateTap compares the tap with the expected index', () {
    const seq = [2, 0, 3];
    expect(validateTap(seq, 0, 2), isTrue);
    expect(validateTap(seq, 1, 2), isFalse);
    expect(validateTap(seq, 2, 3), isTrue);
    expect(validateTap(seq, 3, 0), isFalse, reason: 'past the end');
  });
}
