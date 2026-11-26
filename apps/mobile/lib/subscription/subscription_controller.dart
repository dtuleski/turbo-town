import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/game_models.dart';
import '../api/game_providers.dart';
import '../auth/auth_controller.dart';
import '../auth/display_name.dart';
import '../game/hub_providers.dart';
import 'store_gateway.dart';
import 'store_products.dart';
import 'subscription_api.dart';

/// App Store subscriptions are offered on iOS only for now. Android keeps the
/// neutral "not available" tiles until Google Play billing is added.
final storeSubscriptionsEnabledProvider = Provider<bool>(
  (_) => !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS,
);

final storeGatewayProvider = Provider<StoreGateway>((_) => InAppPurchaseGateway());

final subscriptionApiProvider = Provider<SubscriptionApi>(
  (ref) => SubscriptionApi(ref.watch(gameGraphQLClientProvider)),
);

/// Error codes the paywall turns into messages.
abstract final class SubscriptionErrors {
  static const storeUnavailable = 'STORE_UNAVAILABLE';
  static const purchaseFailed = 'PURCHASE_FAILED';
  static const verifyFailed = 'VERIFY_FAILED';
  static const otherAccount = 'APPLE_PURCHASE_OTHER_ACCOUNT';
  static const network = 'NETWORK_ERROR';
  static const notSignedIn = 'NOT_SIGNED_IN';
  static const nothingToRestore = 'NOTHING_TO_RESTORE';
}

class SubscriptionState {
  const SubscriptionState({
    this.loading = true,
    this.info,
    this.products = const [],
    this.storeAvailable = false,
    this.busy,
    this.errorCode,
    this.justPurchased = false,
  });

  final bool loading;
  final SubscriptionInfo? info;
  final List<StoreProduct> products;
  final bool storeAvailable;

  /// Product id being bought, or 'restore'. Null when idle.
  final String? busy;
  final String? errorCode;

  /// Set after a successful purchase or restore, for a confirmation message.
  final bool justPurchased;

  SubscriptionState copyWith({
    bool? loading,
    SubscriptionInfo? info,
    List<StoreProduct>? products,
    bool? storeAvailable,
    String? busy,
    bool clearBusy = false,
    String? errorCode,
    bool clearError = false,
    bool? justPurchased,
  }) =>
      SubscriptionState(
        loading: loading ?? this.loading,
        info: info ?? this.info,
        products: products ?? this.products,
        storeAvailable: storeAvailable ?? this.storeAvailable,
        busy: clearBusy ? null : (busy ?? this.busy),
        errorCode: clearError ? null : (errorCode ?? this.errorCode),
        justPurchased: justPurchased ?? this.justPurchased,
      );
}

/// Purchase flow:
/// 1. The user taps a plan; StoreKit shows Apple's sheet and charges them.
/// 2. StoreKit sends the signed transaction on the purchase stream.
/// 3. The app sends it to the backend, which verifies it with Apple and
///    stores the plan. Only then is the transaction finished.
/// If step 3 fails on the network, the transaction stays unfinished and
/// StoreKit delivers it again on the next launch, so a payment is never lost.
class SubscriptionController extends StateNotifier<SubscriptionState> {
  SubscriptionController({
    required SubscriptionApi api,
    required StoreGateway store,
    required Future<String?> Function() userId,
    required bool storeEnabled,
    void Function()? onPlanChanged,
  })  : _api = api,
        _store = store,
        _userId = userId,
        _storeEnabled = storeEnabled,
        _onPlanChanged = onPlanChanged,
        super(const SubscriptionState()) {
    if (_storeEnabled) {
      _sub = _store.purchases.listen(_onPurchases, onError: (Object _) {
        state = state.copyWith(clearBusy: true, errorCode: SubscriptionErrors.purchaseFailed);
      });
    }
  }

  final SubscriptionApi _api;
  final StoreGateway _store;
  final Future<String?> Function() _userId;
  final bool _storeEnabled;
  final void Function()? _onPlanChanged;
  StreamSubscription<List<StorePurchase>>? _sub;
  bool _restoreFoundSomething = false;

  /// Loads the current plan and, on iOS, the store products.
  Future<void> load() async {
    state = state.copyWith(loading: true, clearError: true, justPurchased: false);
    SubscriptionInfo info;
    try {
      info = await _api.getSubscription();
    } on GameApiException catch (e) {
      state = state.copyWith(loading: false, errorCode: e.code ?? SubscriptionErrors.network);
      return;
    }
    var products = <StoreProduct>[];
    var available = false;
    if (_storeEnabled) {
      try {
        available = await _store.isAvailable();
        if (available) {
          products = await _store.loadProducts({for (final p in kStorePlans) p.productId});
          products.sort((a, b) => _order(a.id).compareTo(_order(b.id)));
        }
      } catch (_) {
        available = false;
      }
    }
    state = state.copyWith(loading: false, info: info, products: products, storeAvailable: available);
  }

  int _order(String productId) => kStorePlans.indexWhere((p) => p.productId == productId);

  Future<void> buy(StoreProduct product) async {
    if (state.busy != null) return;
    final userId = await _userId();
    if (userId == null) {
      state = state.copyWith(errorCode: SubscriptionErrors.notSignedIn);
      return;
    }
    state = state.copyWith(busy: product.id, clearError: true, justPurchased: false);
    try {
      await _store.buy(product, accountToken: userId);
    } catch (_) {
      state = state.copyWith(clearBusy: true, errorCode: SubscriptionErrors.purchaseFailed);
    }
  }

  Future<void> restore() async {
    if (state.busy != null) return;
    final userId = await _userId();
    if (userId == null) {
      state = state.copyWith(errorCode: SubscriptionErrors.notSignedIn);
      return;
    }
    _restoreFoundSomething = false;
    state = state.copyWith(busy: 'restore', clearError: true, justPurchased: false);
    try {
      await _store.restore(accountToken: userId);
    } catch (_) {
      state = state.copyWith(clearBusy: true, errorCode: SubscriptionErrors.purchaseFailed);
      return;
    }
    // StoreKit sends restored transactions on the stream; when there are none
    // it sends nothing. Give it a moment, then report.
    await Future<void>.delayed(const Duration(seconds: 4));
    if (mounted && state.busy == 'restore') {
      state = state.copyWith(
        clearBusy: true,
        errorCode: _restoreFoundSomething ? null : SubscriptionErrors.nothingToRestore,
      );
    }
  }

  Future<void> manage() => _store.showManageSubscriptions();

  Future<void> _onPurchases(List<StorePurchase> purchases) async {
    for (final p in purchases) {
      switch (p.status) {
        case StorePurchaseStatus.pending:
          break;
        case StorePurchaseStatus.canceled:
          await _store.finish(p);
          state = state.copyWith(clearBusy: true);
        case StorePurchaseStatus.error:
          await _store.finish(p);
          state = state.copyWith(clearBusy: true, errorCode: SubscriptionErrors.purchaseFailed);
        case StorePurchaseStatus.purchased:
        case StorePurchaseStatus.restored:
          _restoreFoundSomething = true;
          await _verify(p);
      }
    }
  }

  Future<void> _verify(StorePurchase p) async {
    final jws = p.signedTransaction;
    if (jws == null || jws.isEmpty) {
      await _store.finish(p);
      state = state.copyWith(clearBusy: true, errorCode: SubscriptionErrors.verifyFailed);
      return;
    }
    try {
      final info = await _api.verifyAppleTransaction(jws);
      await _store.finish(p);
      state = state.copyWith(info: info, clearBusy: true, clearError: true, justPurchased: true);
      _onPlanChanged?.call();
    } on GameApiException catch (e) {
      final code = e.code ?? SubscriptionErrors.verifyFailed;
      final retryLater = code == SubscriptionErrors.network || code == 'INTERNAL_ERROR' || code == 'UNAUTHENTICATED';
      if (!retryLater) {
        // A final answer from the backend (another account, unknown product):
        // finish so StoreKit stops sending it.
        await _store.finish(p);
      }
      state = state.copyWith(clearBusy: true, errorCode: code);
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final subscriptionControllerProvider =
    StateNotifierProvider<SubscriptionController, SubscriptionState>((ref) {
  // A new session (sign in, sign out, another account) starts a fresh state.
  ref.watch(authControllerProvider.select((s) => s.status));
  final cognito = ref.watch(cognitoServiceProvider);
  return SubscriptionController(
    api: ref.watch(subscriptionApiProvider),
    store: ref.watch(storeGatewayProvider),
    storeEnabled: ref.watch(storeSubscriptionsEnabledProvider),
    userId: () async => userIdFromIdToken(await cognito.getValidIdToken()),
    onPlanChanged: () => ref.invalidate(hubDataProvider),
  );
});
