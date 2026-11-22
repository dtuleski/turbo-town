import 'dart:io';

import 'package:dashden_mobile/config/paid_games.dart';
import 'package:dashden_mobile/game/game_registry.dart';
import 'package:dashden_mobile/l10n/game_text.dart';
import 'package:dashden_mobile/l10n/gen/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

const _comingSoonOnWeb = {'color-by-number', 'traffic-lab'};

GameCategory _categoryFromWeb(String label) {
  switch (label) {
    case 'Science & Math':
      return GameCategory.scienceMath;
    case 'History & Civics':
      return GameCategory.historyCivics;
    case 'Geography & Language':
      return GameCategory.geographyLanguage;
    case 'Puzzles & Logic':
      return GameCategory.puzzlesLogic;
  }
  throw StateError('unknown web filter group $label');
}

void main() {
  test('registry has the 21 playable games and no Coming Soon ones', () {
    expect(kGameRegistry, hasLength(21));
    final ids = kGameRegistry.map((g) => g.gameId).toList();
    expect(ids.toSet(), hasLength(21), reason: 'ids are unique');
    for (final id in _comingSoonOnWeb) {
      expect(ids, isNot(contains(id)));
    }
  });

  test('categories match GAME_FILTER_MAP in the web hub', () {
    final source =
        File('../web/src/pages/hub/GameHubPage.tsx').readAsStringSync();
    final block =
        RegExp(r'GAME_FILTER_MAP[^{]*\{(.*?)\n\}', dotAll: true).firstMatch(source);
    expect(block, isNotNull, reason: 'GAME_FILTER_MAP not found');
    final web = {
      for (final m in RegExp(r"'([a-z-]+)':\s*'([^']+)'").allMatches(block!.group(1)!))
        m.group(1)!: _categoryFromWeb(m.group(2)!),
    };
    expect(web, isNotEmpty);
    for (final entry in kGameRegistry) {
      if (web.containsKey(entry.gameId)) {
        expect(entry.category, web[entry.gameId], reason: entry.gameId);
      } else {
        // The only playable game without a web filter group lists under All.
        expect(entry.gameId, 'mini-golf');
        expect(entry.category, GameCategory.other);
      }
    }
    // Everything the web maps is either in the registry or Coming Soon.
    final ids = kGameRegistry.map((g) => g.gameId).toSet();
    expect(
      web.keys.where((k) => !ids.contains(k)).toSet(),
      _comingSoonOnWeb,
    );
  });

  test('paid flag follows kPaidGameThemeIds', () {
    final paid = kGameRegistry.where((g) => g.isPaid).map((g) => g.themeId).toSet();
    expect(paid, {
      'SPACE_ENTRY',
      'SCRATCH_CODING',
      'BOND_AND_BURN',
      'MINI_GOLF',
      'CIRCUIT_BUILDER',
    });
    for (final id in paid) {
      expect(kPaidGameThemeIds, contains(id));
    }
  });

  test('every registry game has a localized title and description', () {
    final l10n = AppLocalizationsEn();
    for (final g in kGameRegistry) {
      expect(gameTitle(l10n, g.gameId), isNotEmpty, reason: g.gameId);
      expect(gameDescription(l10n, g.gameId), isNotEmpty, reason: g.gameId);
    }
  });

  test('lookups by id, theme and review type', () {
    expect(gameById('memory-match')?.implemented, isTrue);
    expect(gameById('nope'), isNull);
    expect(gameByThemeId('MATH_CHALLENGE')?.gameId, 'math-challenge');
    expect(gameById('bond-and-burn')?.reviewType, 'BOND_AND_BURN');
    expect(gameById('memory-match')?.setupRoute, '/memory-match/setup');
    // Memory Match plus the quiz and word games (FEAT-005); later features
    // flip the others.
    expect(
      kGameRegistry.where((g) => g.implemented).map((g) => g.gameId).toSet(),
      {
        'memory-match',
        'math-challenge',
        'word-puzzle',
        'language-learning',
        'geo-quiz',
        'history-quiz',
        'civics-quiz',
        'hangman',
      },
    );
  });
}
