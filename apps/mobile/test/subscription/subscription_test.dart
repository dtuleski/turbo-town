import 'dart:async';
import 'dart:convert';

import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/auth/display_name.dart';
import 'package:dashden_mobile/l10n/gen/app_localizations.dart';
import 'package:dashden_mobile/subscription/store_gateway.dart';
import 'package:dashden_mobile/subscription/subscription_api.dart';
import 'package:dashden_mobile/subscription/subscription_controller.dart';
import 'package:dashden_mobile/ui/screens/subscription_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const userId = '74f804f8-1061-70e6-2280-d7860eda9dfc';

class FakeStore implements StoreGateway {
  final controller = StreamController<List<StorePurchase>>.broadcast();
  final finished = <StorePurchase>[];
  final bought = <String>[];
  String? lastToken;
  bool available = true;
  List<StoreProduct> products = const [
    StoreProduct(id: 'dashden.premium.monthly', title: 'Premium', price: r'$9.99'),
    StoreProduct(id: 'dashden.light.monthly', title: 'Light', price: r'$2.99'),
    StoreProduct(id: 'dashden.standard.monthly', title: 'Standard', price: r'$5.99'),
  ];
  bool managed = false;

  @override
  Stream<List<StorePurchase>> get purchases => controller.stream;
  @override
  Future<bool> isAvailable() async => available;
  @override
  Future<List<StoreProduct>> loadProducts(Set<String> ids) async =>
      products.where((p) => ids.contains(p.id)).toList();
  @override
  Future<void> buy(StoreProduct product, {required String accountToken}) async {
    bought.add(product.id);
    lastToken = accountToken;
  }

  @override
  Future<void> restore({required String accountToken}) async => lastToken = accountToken;
  @override
  Future<void> finish(StorePurchase purchase) async => finished.add(purchase);
  @override
  Future<void> showManageSubscriptions() async => managed = true;

  void emit(StorePurchase p) => controller.add([p]);
}

class FakeApi implements SubscriptionApi {
  SubscriptionInfo current = SubscriptionInfo.free;
  final verified = <String>[];
  GameApiException? verifyError;

  @override
  Future<SubscriptionInfo> getSubscription() async => current;

  @override
  Future<SubscriptionInfo> verifyAppleTransaction(String signedTransaction) async {
    verified.add(signedTransaction);
    if (verifyError != null) throw verifyError!;
    current = const SubscriptionInfo(tier: 'STANDARD', status: 'ACTIVE', source: 'apple');
    return current;
  }
}

Future<void> pump() => Future<void>.delayed(Duration.zero);

SubscriptionController controller(FakeApi api, FakeStore store, {void Function()? onChanged}) =>
    SubscriptionController(
      api: api,
      store: store,
      userId: () async => userId,
      storeEnabled: true,
      onPlanChanged: onChanged,
    );

void main() {
  group('SubscriptionController', () {
    test('loads the plan and the store products in plan order', () async {
      final c = controller(FakeApi(), FakeStore());
      await c.load();
      expect(c.current.storeAvailable, isTrue);
      expect(c.current.products.map((p) => p.id), [
        'dashden.light.monthly',
        'dashden.standard.monthly',
        'dashden.premium.monthly',
      ]);
    });

    test('buys with the DashDen user id as the account token', () async {
      final store = FakeStore();
      final c = controller(FakeApi(), store);
      await c.load();
      await c.buy(c.current.products.first);
      expect(store.bought, ['dashden.light.monthly']);
      expect(store.lastToken, userId);
      expect(c.current.busy, 'dashden.light.monthly');
    });

    test('a purchased transaction is verified on the backend, then finished', () async {
      final api = FakeApi();
      final store = FakeStore();
      var changed = 0;
      final c = controller(api, store, onChanged: () => changed++);
      store.emit(const StorePurchase(productId: 'dashden.standard.monthly', status: StorePurchaseStatus.purchased, signedTransaction: 'jws-1'));
      await pump();
      await pump();
      expect(api.verified, ['jws-1']);
      expect(store.finished, hasLength(1));
      expect(c.current.info!.tier, 'STANDARD');
      expect(c.current.justPurchased, isTrue);
      expect(changed, 1);
    });

    test('a network failure leaves the transaction unfinished so StoreKit retries', () async {
      final api = FakeApi()..verifyError = GameApiException('net', code: 'NETWORK_ERROR');
      final store = FakeStore();
      final c = controller(api, store);
      store.emit(const StorePurchase(productId: 'dashden.light.monthly', status: StorePurchaseStatus.purchased, signedTransaction: 'jws'));
      await pump();
      await pump();
      expect(store.finished, isEmpty);
      expect(c.current.errorCode, 'NETWORK_ERROR');
    });

    test('a purchase owned by another account is finished and reported', () async {
      final api = FakeApi()..verifyError = GameApiException('other', code: 'APPLE_PURCHASE_OTHER_ACCOUNT');
      final store = FakeStore();
      final c = controller(api, store);
      store.emit(const StorePurchase(productId: 'dashden.light.monthly', status: StorePurchaseStatus.restored, signedTransaction: 'jws'));
      await pump();
      await pump();
      expect(store.finished, hasLength(1));
      expect(c.current.errorCode, 'APPLE_PURCHASE_OTHER_ACCOUNT');
    });

    test('a cancelled purchase clears the busy state without an error', () async {
      final store = FakeStore();
      final c = controller(FakeApi(), store);
      await c.load();
      await c.buy(c.current.products.first);
      store.emit(const StorePurchase(productId: 'dashden.light.monthly', status: StorePurchaseStatus.canceled));
      await pump();
      expect(c.current.busy, isNull);
      expect(c.current.errorCode, isNull);
    });

    test('nothing to restore is reported', () async {
      final c = controller(FakeApi(), FakeStore());
      final future = c.restore();
      await pump();
      expect(c.current.busy, 'restore');
      await future;
      expect(c.current.errorCode, SubscriptionErrors.nothingToRestore);
    }, timeout: const Timeout(Duration(seconds: 10)));
  });

  group('userIdFromIdToken', () {
    test('reads the sub claim', () {
      String enc(Object o) => base64Url.encode(utf8.encode(json.encode(o))).replaceAll('=', '');
      expect(userIdFromIdToken('${enc({})}.${enc({'sub': userId})}.s'), userId);
      expect(userIdFromIdToken('bad'), isNull);
    });
  });

  group('SubscriptionScreen', () {
    Future<FakeStore> pumpScreen(WidgetTester tester, FakeApi api, [FakeStore? store]) async {
      final s = store ?? FakeStore();
      tester.view.physicalSize = const Size(1200, 3200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(ProviderScope(
        overrides: [
          subscriptionControllerProvider.overrideWith((ref) => controller(api, s)),
        ],
        child: const MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: SubscriptionScreen(),
        ),
      ));
      await tester.pumpAndSettle();
      return s;
    }

    testWidgets('a free user sees store prices, restore, disclosure and legal links', (tester) async {
      await pumpScreen(tester, FakeApi());
      expect(find.byKey(const Key('sub-plan-dashden.standard.monthly')), findsOneWidget);
      expect(find.textContaining(r'$5.99'), findsOneWidget);
      expect(find.byKey(const Key('sub-restore')), findsOneWidget);
      expect(find.byKey(const Key('sub-disclosure')), findsOneWidget);
      expect(find.byKey(const Key('sub-terms')), findsOneWidget);
      expect(find.byKey(const Key('sub-privacy')), findsOneWidget);
    });

    testWidgets('a web subscriber sees the plan and no purchase buttons', (tester) async {
      final api = FakeApi()..current = const SubscriptionInfo(tier: 'PREMIUM', status: 'ACTIVE', source: 'stripe');
      await pumpScreen(tester, api);
      expect(find.byKey(const Key('sub-active')), findsOneWidget);
      expect(find.byKey(const Key('sub-buy-dashden.light.monthly')), findsNothing);
      expect(find.byKey(const Key('sub-manage')), findsNothing);
    });

    testWidgets('an App Store subscriber can open Manage Subscription', (tester) async {
      final api = FakeApi()
        ..current = SubscriptionInfo(
          tier: 'LIGHT',
          status: 'ACTIVE',
          source: 'apple',
          expiresAt: DateTime.utc(2026, 12, 23),
          willRenew: true,
        );
      final store = await pumpScreen(tester, api);
      await tester.tap(find.byKey(const Key('sub-manage')));
      expect(store.managed, isTrue);
      expect(find.textContaining('Renews on'), findsOneWidget);
    });

    testWidgets('no store products shows a neutral message', (tester) async {
      await pumpScreen(tester, FakeApi(), FakeStore()..available = false);
      expect(find.byKey(const Key('sub-unavailable')), findsOneWidget);
    });
  });
}

extension on SubscriptionController {
  /// Latest state, read through the public listener API.
  SubscriptionState get current {
    late SubscriptionState s;
    addListener((v) => s = v)();
    return s;
  }
}
