import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/game_models.dart';
import '../api/game_providers.dart';

class HubData {
  const HubData({
    required this.catalog,
    required this.ratings,
    required this.tier,
  });

  final List<GameCatalogItem> catalog;

  /// Ratings keyed by review type (`MEMORY_MATCH`).
  final Map<String, ReviewStats> ratings;

  /// FREE when the tier lookup fails, so paid games stay closed.
  final String tier;
}

Future<T?> _orNull<T>(Future<T> Function() call) async {
  try {
    return await call();
  } catch (_) {
    return null;
  }
}

/// Catalog, ratings and tier for the hub. Only a failed catalog is an error:
/// ratings and tier are optional, as on web (`Promise.allSettled`).
final hubDataProvider = FutureProvider.autoDispose<HubData>((ref) async {
  final api = ref.watch(gameApiProvider);
  final catalogFuture = api.listAvailableGames();
  final ratingsFuture = _orNull(api.getReviewStats);
  final tierFuture = _orNull(api.canStartGame);
  final catalog = await catalogFuture;
  final stats = await ratingsFuture;
  final can = await tierFuture;
  return HubData(
    catalog: catalog,
    ratings: {for (final r in stats?.perGame ?? const <ReviewStats>[]) r.gameType: r},
    tier: can?.rateLimit?.tier ?? 'FREE',
  );
});

/// Quest Map data, loaded fresh each time the map opens.
final questProgressProvider = FutureProvider.autoDispose((ref) {
  return ref.watch(gameApiProvider).getQuestProgress();
});
