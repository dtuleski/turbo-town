import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/config/feature_flags.dart';
import 'package:dashden_mobile/game/game_registry.dart';
import 'package:dashden_mobile/game/hub_logic.dart';
import 'package:flutter_test/flutter_test.dart';

GameCatalogItem item(String id, {String status = 'ACTIVE', int order = 0}) =>
    GameCatalogItem(
      gameId: id,
      title: id,
      description: '',
      icon: '',
      route: '/$id/setup',
      status: status,
      displayOrder: order,
      ageRange: '6+',
      category: '',
    );

/// The server catalog: every registry game plus the two Coming Soon games.
List<GameCatalogItem> fullCatalog() => [
      for (var i = 0; i < kGameRegistry.length; i++)
        item(kGameRegistry[i].gameId, order: i + 1),
      item('color-by-number', status: 'COMING_SOON', order: 90),
      item('traffic-lab', status: 'COMING_SOON', order: 91),
    ];

HubTile tileFor(List<HubTile> tiles, String id) =>
    tiles.firstWhere((t) => t.entry.gameId == id);

void main() {
  test('hub lists the 21 playable games and drops color-by-number and traffic-lab', () {
    final tiles = buildHubTiles(catalog: fullCatalog(), tier: 'PREMIUM');
    expect(tiles, hasLength(21));
    final ids = tiles.map((t) => t.entry.gameId);
    expect(ids, isNot(contains('color-by-number')));
    expect(ids, isNot(contains('traffic-lab')));
  });

  test('tiles follow the server display order', () {
    final catalog = [item('sudoku', order: 1), item('memory-match', order: 2)];
    final tiles = buildHubTiles(catalog: catalog, tier: 'FREE');
    expect(tiles.map((t) => t.entry.gameId), ['sudoku', 'memory-match']);
  });

  test('category filter keeps only that group; All keeps everything', () {
    final tiles = buildHubTiles(catalog: fullCatalog(), tier: 'PREMIUM');
    final science = filterHubTiles(tiles, GameCategory.scienceMath);
    expect(science, isNotEmpty);
    expect(science.every((t) => t.entry.category == GameCategory.scienceMath), isTrue);
    expect(science.map((t) => t.entry.gameId), contains('math-challenge'));
    expect(science.map((t) => t.entry.gameId), isNot(contains('hangman')));
    expect(filterHubTiles(tiles, null), hasLength(21));
    // Mini golf has no chip, so it only shows under All.
    for (final c in GameCategory.values.where((c) => c != GameCategory.other)) {
      expect(filterHubTiles(tiles, c).map((t) => t.entry.gameId), isNot(contains('mini-golf')));
    }
  });

  group('paid games for a FREE user', () {
    test('default presentation is neutralUnavailable', () {
      expect(kPaidGamePresentation, PaidGamePresentation.neutralUnavailable);
    });

    test('neutralUnavailable: listed, not playable', () {
      final tiles = buildHubTiles(
        catalog: fullCatalog(),
        tier: 'FREE',
        presentation: PaidGamePresentation.neutralUnavailable,
      );
      expect(tiles, hasLength(21));
      expect(tileFor(tiles, 'circuit-builder').availability, TileAvailability.paidUnavailable);
      expect(tileFor(tiles, 'mini-golf').availability, TileAvailability.paidUnavailable);
    });

    test('hidden: not listed', () {
      final tiles = buildHubTiles(
        catalog: fullCatalog(),
        tier: 'FREE',
        presentation: PaidGamePresentation.hidden,
      );
      expect(tiles.map((t) => t.entry.gameId), isNot(contains('circuit-builder')));
      expect(tiles, hasLength(16));
    });

    test('openForAll: treated like any other game', () {
      final tiles = buildHubTiles(
        catalog: fullCatalog(),
        tier: 'FREE',
        presentation: PaidGamePresentation.openForAll,
      );
      expect(tileFor(tiles, 'circuit-builder').availability, TileAvailability.notInApp);
    });

    test('a paid tier is not blocked', () {
      final tiles = buildHubTiles(catalog: fullCatalog(), tier: 'STANDARD');
      expect(tileFor(tiles, 'circuit-builder').availability, TileAvailability.notInApp);
    });
  });

  test('availability: playable, server Coming Soon, not in the app yet', () {
    final catalog = [
      item('memory-match'),
      item('circuit-builder'),
      item('hangman', status: 'COMING_SOON'),
      item('tic-tac-toe', status: 'MAINTENANCE'),
    ];
    // A paid tier, so the not-yet-built paid game reads as "not in the app".
    final tiles = buildHubTiles(catalog: catalog, tier: 'PREMIUM');
    expect(tileFor(tiles, 'memory-match').availability, TileAvailability.playable);
    expect(tileFor(tiles, 'circuit-builder').availability, TileAvailability.notInApp);
    expect(tileFor(tiles, 'hangman').availability, TileAvailability.comingSoon);
    expect(tileFor(tiles, 'tic-tac-toe').availability, TileAvailability.comingSoon);
  });
}
