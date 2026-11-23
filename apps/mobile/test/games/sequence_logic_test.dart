import 'dart:math';

import 'package:dashden_mobile/game/sequence_memory/logic.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('difficulty config matches web (cards and view time)', () {
    expect(seqDifficulty('easy').cards, 5);
    expect(seqDifficulty('easy').viewTime, 6);
    expect(seqDifficulty('medium').cards, 10);
    expect(seqDifficulty('medium').viewTime, 4);
    expect(seqDifficulty('hard').cards, 15);
    expect(seqDifficulty('hard').viewTime, 3);
    expect([for (final d in kSeqDifficulties) d.apiValue], [1, 2, 3]);
    expect(seqDifficulty('nope').id, 'easy');
    expect(kSeqMaxLives, 3);
  });

  test('each theme lists 20 distinct drivers', () {
    for (final id in kSeqThemeIds) {
      final drivers = seqDrivers(id);
      expect(drivers, hasLength(20));
      expect(drivers.map((d) => d.id).toSet(), hasLength(20));
    }
    expect(seqDrivers('f1-2025').first.name, 'Verstappen');
    expect(seqDrivers('f1-2026').first.team, 'Aston Martin');
    expect(seqThemeId('nope'), 'f1-2025');
  });

  test('pickChallengeCards returns distinct drivers of the theme', () {
    for (final d in kSeqDifficulties) {
      final cards = pickChallengeCards('f1-2026', d.cards, Random(9));
      expect(cards, hasLength(d.cards));
      expect(cards.map((c) => c.id).toSet(), hasLength(d.cards));
      final ids = seqDrivers('f1-2026').map((c) => c.id).toSet();
      expect(cards.every((c) => ids.contains(c.id)), isTrue);
    }
  });

  test('the same seed picks the same sequence', () {
    final a = pickChallengeCards('f1-2025', 10, Random(4)).map((c) => c.id).toList();
    final b = pickChallengeCards('f1-2025', 10, Random(4)).map((c) => c.id).toList();
    expect(a, b);
  });
}
