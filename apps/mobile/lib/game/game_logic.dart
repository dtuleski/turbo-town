import 'dart:math';

import '../config/constants.dart';
import 'card.dart';

/// Memory Match card generation & matching rules.
/// Ported from apps/web `src/utils/gameLogic.ts` to keep gameplay identical.

const Map<String, List<String>> _themeValues = {
  'ANIMALS': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'],
  'FRUITS': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥝', '🍍', '🥭', '🍐', '🥥'],
  'VEHICLES': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚜', '🏍️', '🚲'],
  'SPACE': ['🚀', '🛸', '🌎', '🌙', '⭐', '☄️', '🪐', '🌟', '✨', '🌠', '🔭', '🛰️', '👨‍🚀', '🌌', '🌕'],
  'OCEAN': ['🐠', '🐟', '🐡', '🦈', '🐙', '🦑', '🦀', '🦞', '🐚', '🐬', '🐳', '🦭', '🪸', '🐢', '🦐'],
  'FORMULA1': [],
};

/// F1 teammate pairs (2025 season) — matching two drivers on the same team.
const List<List<String>> _f1DriverPairs = [
  ['🔴 Leclerc', '🔴 Hamilton'],
  ['⚫ Russell', '⚫ Antonelli'],
  ['🟠 Norris', '🟠 Piastri'],
  ['🔷 Verstappen', '🔷 Hadjar'],
  ['🟢 Alonso', '🟢 Stroll'],
  ['🟡 Lawson', '🟡 Lindblad'],
  ['🔵 Sainz', '🔵 Albon'],
  ['⚪ Bearman', '⚪ Ocon'],
  ['🟤 Bortoleto', '🟤 Hulkenberg'],
  ['🟣 Gasly', '🟣 Colapinto'],
  ['🩵 Perez', '🩵 Bottas'],
];

final Map<String, String> _f1TeammateMap = {
  for (final pair in _f1DriverPairs) ...{
    pair[0]: pair[1],
    pair[1]: pair[0],
  }
};

/// Pairs per difficulty for standard themes.
int _pairsForDifficulty(Difficulty d) {
  switch (d) {
    case Difficulty.easy:
      return 6;
    case Difficulty.medium:
      return 8;
    case Difficulty.hard:
      return 10;
    case Difficulty.superHard:
      return 15;
  }
}

/// F1 caps at 11 teams.
int _f1PairsForDifficulty(Difficulty d) {
  switch (d) {
    case Difficulty.easy:
      return 6;
    case Difficulty.medium:
      return 8;
    case Difficulty.hard:
    case Difficulty.superHard:
      return 11;
  }
}

/// Build a shuffled deck of cards for the given theme + difficulty.
List<MemoryCard> generateCards(String themeId, Difficulty difficulty,
    [Random? rng]) {
  final random = rng ?? Random();
  final cards = <MemoryCard>[];

  if (themeId == 'FORMULA1') {
    final numPairs = _f1PairsForDifficulty(difficulty);
    final teams = _f1DriverPairs.take(numPairs).toList();
    for (var i = 0; i < teams.length; i++) {
      cards.add(MemoryCard(id: '$i-driver1', value: teams[i][0]));
      cards.add(MemoryCard(id: '$i-driver2', value: teams[i][1]));
    }
    return _shuffle(cards, random);
  }

  final numPairs = _pairsForDifficulty(difficulty);
  final values = (_themeValues[themeId] ?? const []).take(numPairs).toList();
  for (var i = 0; i < values.length; i++) {
    cards.add(MemoryCard(id: '$i-1', value: values[i]));
    cards.add(MemoryCard(id: '$i-2', value: values[i]));
  }
  return _shuffle(cards, random);
}

/// Fisher–Yates shuffle (matches the web implementation).
List<MemoryCard> _shuffle(List<MemoryCard> cards, Random random) {
  final list = List<MemoryCard>.of(cards);
  for (var i = list.length - 1; i > 0; i--) {
    final j = random.nextInt(i + 1);
    final tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

/// Two cards match if they share a value, or (for F1) are teammates.
bool checkMatch(MemoryCard a, MemoryCard b) {
  if (a.id == b.id) return false;
  final isF1 = _f1TeammateMap.containsKey(a.value);
  if (isF1) {
    return _f1TeammateMap[a.value] == b.value;
  }
  return a.value == b.value;
}

bool isGameComplete(List<MemoryCard> cards) =>
    cards.every((c) => c.isMatched);

/// Number of columns to use when laying out the grid for a given card count.
int gridColumnsFor(int cardCount) {
  if (cardCount <= 12) return 3; // 6 pairs -> 3x4
  if (cardCount <= 16) return 4; // 8 pairs -> 4x4
  if (cardCount <= 20) return 4; // 10 pairs -> 4x5
  if (cardCount <= 22) return 4; // 11 pairs (F1)
  return 5; // 15 pairs -> 5x6
}
