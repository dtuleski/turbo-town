import 'dart:math';

import '../framework/session_timers.dart';
import 'drivers.g.dart';

export 'drivers.g.dart';

/// Port of apps/web `utils/sequenceMemoryUtils.ts`.
class SeqDifficulty {
  const SeqDifficulty(this.id, this.cards, this.viewTime, this.apiValue);
  final String id;

  /// Cards in the challenge sequence (= rounds).
  final int cards;

  /// Seconds the cards stay visible each round.
  final int viewTime;
  final int apiValue;
}

const List<SeqDifficulty> kSeqDifficulties = [
  SeqDifficulty('easy', 5, 6, 1),
  SeqDifficulty('medium', 10, 4, 2),
  SeqDifficulty('hard', 15, 3, 3),
];

SeqDifficulty seqDifficulty(String? id) =>
    kSeqDifficulties.firstWhere((d) => d.id == id, orElse: () => kSeqDifficulties.first);

const int kSeqMaxLives = 3;

const List<String> kSeqThemeIds = ['f1-2025', 'f1-2026'];

const Map<String, String> kSeqThemeNames = {
  'f1-2025': 'Formula 1 — 2025',
  'f1-2026': 'Formula 1 — 2026',
};

String seqThemeId(String? id) => kSeqThemeIds.contains(id) ? id! : kSeqThemeIds.first;

List<DriverCard> seqDrivers(String themeId) =>
    themeId == 'f1-2026' ? kF12026Drivers : kF12025Drivers;

/// [count] distinct random drivers of the theme, in challenge order.
List<DriverCard> pickChallengeCards(String themeId, int count, Random rng) =>
    shuffled(seqDrivers(themeId), rng).take(count).toList();
