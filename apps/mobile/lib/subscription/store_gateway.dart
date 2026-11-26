import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';

/// A product as the paywall shows it. Price text is localized by the store.
class StoreProduct {
  const StoreProduct({required this.id, required this.title, required this.price, this.raw});
  final String id;
  final String title;
  final String price;
  final Object? raw;
}

enum StorePurchaseStatus { pending, purchased, restored, canceled, error }

/// One purchase update from the store.
class StorePurchase {
  const StorePurchase({
    required this.productId,
    required this.status,
    this.signedTransaction,
    this.errorMessage,
    this.raw,
  });
  final String productId;
  final StorePurchaseStatus status;

  /// StoreKit 2 JWS (serverVerificationData). Verified on the backend.
  final String? signedTransaction;
  final String? errorMessage;
  final Object? raw;
}

/// Thin wrapper over the in_app_purchase plugin, so the controller can be
/// tested without StoreKit.
abstract class StoreGateway {
  Stream<List<StorePurchase>> get purchases;
  Future<bool> isAvailable();
  Future<List<StoreProduct>> loadProducts(Set<String> ids);

  /// [accountToken] is the DashDen user id (a UUID). StoreKit stores it on the
  /// transaction as appAccountToken, which ties the purchase to this account.
  Future<void> buy(StoreProduct product, {required String accountToken});
  Future<void> restore({required String accountToken});
  Future<void> finish(StorePurchase purchase);
  Future<void> showManageSubscriptions();
}

class InAppPurchaseGateway implements StoreGateway {
  InAppPurchaseGateway([InAppPurchase? iap]) : _iap = iap ?? InAppPurchase.instance;
  final InAppPurchase _iap;

  @override
  Stream<List<StorePurchase>> get purchases => _iap.purchaseStream.map(
        (list) => [for (final p in list) _toStore(p)],
      );

  StorePurchase _toStore(PurchaseDetails p) {
    final status = switch (p.status) {
      PurchaseStatus.pending => StorePurchaseStatus.pending,
      PurchaseStatus.purchased => StorePurchaseStatus.purchased,
      PurchaseStatus.restored => StorePurchaseStatus.restored,
      PurchaseStatus.canceled => StorePurchaseStatus.canceled,
      PurchaseStatus.error => StorePurchaseStatus.error,
    };
    return StorePurchase(
      productId: p.productID,
      status: status,
      signedTransaction: p.verificationData.serverVerificationData,
      errorMessage: p.error?.message,
      raw: p,
    );
  }

  @override
  Future<bool> isAvailable() => _iap.isAvailable();

  @override
  Future<List<StoreProduct>> loadProducts(Set<String> ids) async {
    final response = await _iap.queryProductDetails(ids);
    return [
      for (final d in response.productDetails)
        StoreProduct(id: d.id, title: d.title, price: d.price, raw: d),
    ];
  }

  @override
  Future<void> buy(StoreProduct product, {required String accountToken}) async {
    await _iap.buyNonConsumable(
      purchaseParam: PurchaseParam(
        productDetails: product.raw! as ProductDetails,
        applicationUserName: accountToken,
      ),
    );
  }

  @override
  Future<void> restore({required String accountToken}) =>
      _iap.restorePurchases(applicationUserName: accountToken);

  @override
  Future<void> finish(StorePurchase purchase) async {
    final raw = purchase.raw;
    if (raw is PurchaseDetails && raw.pendingCompletePurchase) {
      await _iap.completePurchase(raw);
    }
  }

  @override
  Future<void> showManageSubscriptions() async {
    final addition = _iap.getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();
    await addition.showManageSubscriptions();
  }
}
