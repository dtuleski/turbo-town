import '../api/game_models.dart';
import '../config/feature_flags.dart';
import 'game_registry.dart';

/// What a hub tile can do.
enum TileAvailability {
  /// Opens the game's setup page.
  playable,

  /// The catalog says COMING_SOON or MAINTENANCE.
  comingSoon,

  /// A paid game shown to a FREE user under
  /// [PaidGamePresentation.neutralUnavailable]. No price, no upsell.
  paidUnavailable,

  /// Listed by the server but without screens in the app yet.
  notInApp,
}

class HubTile {
  const HubTile({
    required this.entry,
    required this.catalog,
    required this.availability,
  });

  final GameEntry entry;
  final GameCatalogItem catalog;
  final TileAvailability availability;
}

bool isFreeTier(String tier) => tier.toUpperCase() == 'FREE';

/// Tiles for the hub: registry games the server lists, in server display order.
///
/// Games the registry does not know (color-by-number, traffic-lab, anything
/// new) are left out. The tier comes from the backend (`canStartGame`).
/// [registry] is the app's game list; tests pass their own.
List<HubTile> buildHubTiles({
  required List<GameCatalogItem> catalog,
  required String tier,
  PaidGamePresentation presentation = kPaidGamePresentation,
  List<GameEntry> registry = kGameRegistry,
}) {
  final byId = {for (final c in catalog) c.gameId: c};
  final free = isFreeTier(tier);
  final tiles = <HubTile>[];
  for (final entry in registry) {
    final item = byId[entry.gameId];
    if (item == null) continue;
    final blockedPaid = entry.isPaid &&
        free &&
        presentation != PaidGamePresentation.openForAll;
    if (blockedPaid && presentation == PaidGamePresentation.hidden) continue;
    final TileAvailability availability;
    if (!item.isActive) {
      availability = TileAvailability.comingSoon;
    } else if (blockedPaid) {
      availability = TileAvailability.paidUnavailable;
    } else if (!entry.implemented) {
      availability = TileAvailability.notInApp;
    } else {
      availability = TileAvailability.playable;
    }
    tiles.add(HubTile(entry: entry, catalog: item, availability: availability));
  }
  tiles.sort((a, b) => a.catalog.displayOrder.compareTo(b.catalog.displayOrder));
  return tiles;
}

/// Tiles in [category]; `null` is the All chip.
List<HubTile> filterHubTiles(List<HubTile> tiles, GameCategory? category) =>
    category == null
        ? tiles
        : tiles.where((t) => t.entry.category == category).toList();
