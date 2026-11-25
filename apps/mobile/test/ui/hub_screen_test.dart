import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/game_registry.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:dashden_mobile/subscription/store_gateway.dart';
import 'package:dashden_mobile/subscription/subscription_api.dart';
import 'package:dashden_mobile/subscription/subscription_controller.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

GameCatalogItem _item(String id, int order, {String status = 'ACTIVE'}) =>
    GameCatalogItem(
      gameId: id,
      title: id,
      description: 'server description',
      icon: '',
      route: '/$id/setup',
      status: status,
      displayOrder: order,
      ageRange: '6+',
      category: 'Server category',
    );

FakeGameApi _api({String tier = 'FREE'}) {
  final api = FakeGameApi(
    catalog: [
      for (var i = 0; i < kGameRegistry.length; i++) _item(kGameRegistry[i].gameId, i + 1),
      _item('color-by-number', 90, status: 'COMING_SOON'),
      _item('traffic-lab', 91, status: 'COMING_SOON'),
    ],
    reviewStats: const ReviewStatsResult(perGame: [
      ReviewStats(gameType: 'MEMORY_MATCH', averageRating: 4.5, totalReviews: 12),
    ]),
    onCanStartGame: () async => CanStartGameResult(
      canPlay: true,
      rateLimit: RateLimitInfo(tier: tier, limit: 10, used: 0, remaining: 10),
    ),
  );
  return api;
}

Finder _tile(String id) => find.byKey(Key('tile-$id'));

void main() {
  testWidgets('hub shows the 21 games, quest card and ratings', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/', api: _api());
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('DashDen Game Hub'), findsOneWidget);
    expect(find.text('Hi tester! Pick a game to play!'), findsOneWidget);
    expect(find.byKey(const Key('quest-card')), findsOneWidget);
    expect(find.byKey(const Key('rating-memory-match')), findsOneWidget);
    expect(find.text('4.5 (12)'), findsOneWidget);

    for (final g in kGameRegistry) {
      expect(_tile(g.gameId), findsOneWidget, reason: g.gameId);
    }
    expect(_tile('color-by-number'), findsNothing);
    expect(_tile('traffic-lab'), findsNothing);
  });

  testWidgets('category chips filter the list', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/', api: _api());
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.byKey(const Key('filter-historyCivics')));
    await tester.pump();
    expect(_tile('history-quiz'), findsOneWidget);
    expect(_tile('civics-quiz'), findsOneWidget);
    expect(_tile('memory-match'), findsNothing);
    expect(_tile('mini-golf'), findsNothing);

    await tester.tap(find.byKey(const Key('filter-all')));
    await tester.pump();
    expect(_tile('memory-match'), findsOneWidget);
    expect(_tile('mini-golf'), findsOneWidget);
  });

  testWidgets('paid games are neutral for a FREE user: no price, no upsell, not tappable',
      (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/', api: _api());
    await tester.pump(const Duration(milliseconds: 300));

    expect(
      tester.widget<Text>(find.byKey(const Key('tile-label-circuit-builder'))).data,
      'Not available in the app yet',
    );
    expect(find.textContaining(RegExp(r'\$|Stripe|Upgrade|Premium|Subscribe|Paid'),
        findRichText: true), findsNothing);

    await tester.tap(_tile('circuit-builder'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('DashDen Game Hub'), findsOneWidget);
    expect(find.byKey(const Key('game-start-button')), findsNothing);
  });

  testWidgets('on iOS a paid tile for a FREE user opens the plans', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/', api: _api(), overrides: [
      storeSubscriptionsEnabledProvider.overrideWithValue(true),
      subscriptionControllerProvider.overrideWith((ref) => SubscriptionController(
            api: _NoPlanApi(),
            store: _NoStore(),
            userId: () async => null,
            storeEnabled: false,
          )),
    ]);
    await tester.pump(const Duration(milliseconds: 300));
    expect(
      tester.widget<Text>(find.byKey(const Key('tile-label-circuit-builder'))).data,
      'Subscribe to play',
    );
    await tester.tap(_tile('circuit-builder'));
    await tester.pumpAndSettle();
    expect(find.text('DashDen Plans'), findsOneWidget);
  });

  testWidgets('every game has app screens: no tile says "coming to the app" and Space Coder opens',
      (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/', api: _api(tier: 'PREMIUM'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Coming to the app soon'), findsNothing);
    await tester.tap(_tile('scratch-coding'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('game-start-button')), findsOneWidget);
  });

  testWidgets('tapping Memory Match opens its setup page', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/', api: _api());
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(_tile('memory-match'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('game-start-button')), findsOneWidget);
  });

  testWidgets('quest card opens the quest map', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/', api: _api());
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.byKey(const Key('quest-card')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Clear each node to open the next one. Earn up to 3 stars per node.'),
        findsOneWidget);
  });

  testWidgets('a failed catalog shows an error with retry', (tester) async {
    useTallSurface(tester);
    final api = _api();
    var fail = true;
    final wrapped = _FailingOnce(api, () => fail);
    await pumpRouterApp(tester, location: '/', api: wrapped);
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Failed to load games. Please try again.'), findsOneWidget);

    fail = false;
    await tester.tap(find.text('Try Again'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(_tile('memory-match'), findsOneWidget);
  });
}

/// [FakeGameApi] whose catalog call fails while [shouldFail] returns true.
class _FailingOnce extends FakeGameApi {
  _FailingOnce(FakeGameApi inner, this.shouldFail)
      : super(
          catalog: inner.catalog,
          reviewStats: inner.reviewStats,
          onCanStartGame: inner.onCanStartGame,
        );

  final bool Function() shouldFail;

  @override
  Future<List<GameCatalogItem>> listAvailableGames() async {
    if (shouldFail()) throw GameApiException('down');
    return super.listAvailableGames();
  }
}

class _NoPlanApi implements SubscriptionApi {
  @override
  Future<SubscriptionInfo> getSubscription() async => SubscriptionInfo.free;
  @override
  Future<SubscriptionInfo> verifyAppleTransaction(String s) async => SubscriptionInfo.free;
}

class _NoStore implements StoreGateway {
  @override
  Stream<List<StorePurchase>> get purchases => const Stream.empty();
  @override
  Future<bool> isAvailable() async => false;
  @override
  Future<List<StoreProduct>> loadProducts(Set<String> ids) async => const [];
  @override
  Future<void> buy(StoreProduct product, {required String accountToken}) async {}
  @override
  Future<void> restore({required String accountToken}) async {}
  @override
  Future<void> finish(StorePurchase purchase) async {}
  @override
  Future<void> showManageSubscriptions() async {}
}
