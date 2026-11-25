import 'package:graphql_flutter/graphql_flutter.dart';

import '../api/api_errors.dart';

/// The user's effective plan, from the game service (`getSubscription`).
/// The same plan applies on the web and in the app, whatever paid for it.
class SubscriptionInfo {
  const SubscriptionInfo({
    required this.tier,
    required this.status,
    this.source,
    this.expiresAt,
    this.willRenew,
  });

  /// FREE, LIGHT, STANDARD or PREMIUM.
  final String tier;

  /// ACTIVE, CANCELLED, GRACE, or NONE when FREE.
  final String status;

  /// stripe, apple, google, manual; null when FREE.
  final String? source;
  final DateTime? expiresAt;
  final bool? willRenew;

  bool get isFree => tier.toUpperCase() == 'FREE';
  bool get isApple => source == 'apple';

  /// Paid through the web (Stripe) or granted by an admin: nothing to buy here.
  bool get isManagedOutsideApp => !isFree && (source == 'stripe' || source == 'manual');

  factory SubscriptionInfo.fromJson(Map<String, dynamic> j) => SubscriptionInfo(
        tier: (j['tier'] as String?) ?? 'FREE',
        status: (j['status'] as String?) ?? 'NONE',
        source: j['source'] as String?,
        expiresAt: j['expiresAt'] == null ? null : DateTime.tryParse(j['expiresAt'] as String),
        willRenew: j['willRenew'] as bool?,
      );

  static const free = SubscriptionInfo(tier: 'FREE', status: 'NONE');
}

class SubscriptionApi {
  SubscriptionApi(this._client);
  final GraphQLClient _client;

  static const _fields = 'tier status source expiresAt willRenew';

  static const String _getSubscription = '''
    query GetSubscription { getSubscription { $_fields } }
  ''';

  static const String _verifyApple = '''
    mutation VerifyAppleTransaction(\$signedTransaction: String!) {
      verifyAppleTransaction(signedTransaction: \$signedTransaction) { $_fields }
    }
  ''';

  Future<SubscriptionInfo> getSubscription() async {
    final result = await _client.query(QueryOptions(
      document: gql(_getSubscription),
      fetchPolicy: FetchPolicy.noCache,
    ));
    throwIfGraphQLError(result);
    final data = result.data?['getSubscription'];
    return data == null ? SubscriptionInfo.free : SubscriptionInfo.fromJson(Map<String, dynamic>.from(data as Map));
  }

  /// Sends Apple's signed StoreKit 2 transaction (JWS) to the backend, which
  /// verifies it with Apple's certificates and stores the plan.
  Future<SubscriptionInfo> verifyAppleTransaction(String signedTransaction) async {
    final result = await _client.mutate(MutationOptions(
      document: gql(_verifyApple),
      variables: {'signedTransaction': signedTransaction},
      fetchPolicy: FetchPolicy.noCache,
    ));
    throwIfGraphQLError(result);
    return SubscriptionInfo.fromJson(
      Map<String, dynamic>.from(result.data!['verifyAppleTransaction'] as Map),
    );
  }
}
