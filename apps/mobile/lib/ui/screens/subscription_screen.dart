import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../l10n/gen/app_localizations.dart';
import '../../subscription/store_gateway.dart';
import '../../subscription/store_products.dart';
import '../../subscription/subscription_api.dart';
import '../../subscription/subscription_controller.dart';
import '../widgets/loading_view.dart';

String planName(AppLocalizations l10n, String tier) => switch (tier.toUpperCase()) {
      'LIGHT' => l10n.subscription_plans_light_name,
      'STANDARD' => l10n.subscription_plans_standard_name,
      'PREMIUM' => l10n.subscription_plans_premium_name,
      _ => l10n.subscription_plans_free_name,
    };

/// Paywall and plan management (iOS). Prices come from the App Store.
///
/// - FREE user: the plans from the store, Restore Purchases, the auto-renew
///   disclosure, Terms of Use and Privacy Policy (App Store requirements).
/// - Paid through the App Store: the plan, its renewal date, Manage Subscription.
/// - Paid on the web or granted by an admin: the plan only. No purchase
///   buttons (no second subscription) and no links out of the app.
class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends ConsumerState<SubscriptionScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(subscriptionControllerProvider.notifier).load());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final s = ref.watch(subscriptionControllerProvider);
    final ctrl = ref.read(subscriptionControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.mobileSub_title)),
      body: SafeArea(
        child: s.loading && s.info == null
            ? const LoadingView()
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (s.errorCode != null) _Message(key: const Key('sub-error'), text: _errorText(l10n, s.errorCode!), error: true),
                  if (s.justPurchased) _Message(key: const Key('sub-thanks'), text: l10n.mobileSub_thanks),
                  ..._body(context, l10n, s, ctrl),
                ],
              ),
      ),
    );
  }

  List<Widget> _body(BuildContext context, AppLocalizations l10n, SubscriptionState s, SubscriptionController ctrl) {
    final info = s.info ?? SubscriptionInfo.free;
    final dateFmt = DateFormat.yMMMd(Localizations.localeOf(context).toLanguageTag());

    if (!info.isFree) {
      final name = planName(l10n, info.tier);
      final date = info.expiresAt == null ? null : dateFmt.format(info.expiresAt!.toLocal());
      return [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const Text('💎', style: TextStyle(fontSize: 48)),
                const SizedBox(height: 8),
                Text(
                  info.isApple ? l10n.mobileSub_activeApple(name) : l10n.mobileSub_activeOutside(name),
                  key: const Key('sub-active'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                if (info.isApple && date != null) ...[
                  const SizedBox(height: 6),
                  Text(info.willRenew == false ? l10n.mobileSub_endsOn(date) : l10n.mobileSub_renewsOn(date)),
                ],
                if (info.isApple) ...[
                  const SizedBox(height: 16),
                  FilledButton(
                    key: const Key('sub-manage'),
                    onPressed: ctrl.manage,
                    child: Text(l10n.mobileSub_manage),
                  ),
                ],
              ],
            ),
          ),
        ),
      ];
    }

    if (!s.storeAvailable || s.products.isEmpty) {
      return [_Message(key: const Key('sub-unavailable'), text: l10n.mobileSub_unavailable)];
    }

    return [
      Text(l10n.subscription_subtitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 12),
      for (final product in s.products) _PlanCard(product: product, busy: s.busy, onBuy: () => ctrl.buy(product)),
      const SizedBox(height: 8),
      TextButton(
        key: const Key('sub-restore'),
        onPressed: s.busy == null ? ctrl.restore : null,
        child: s.busy == 'restore'
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : Text(l10n.mobileSub_restore),
      ),
      const SizedBox(height: 8),
      Text(l10n.mobileSub_disclosure, key: const Key('sub-disclosure'), style: Theme.of(context).textTheme.bodySmall),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TextButton(
            key: const Key('sub-terms'),
            onPressed: () => launchUrl(Uri.parse(kTermsOfUseUrl), mode: LaunchMode.inAppBrowserView),
            child: Text(l10n.mobileSub_terms),
          ),
          TextButton(
            key: const Key('sub-privacy'),
            onPressed: () => launchUrl(Uri.parse(kPrivacyPolicyUrl), mode: LaunchMode.inAppBrowserView),
            child: Text(l10n.mobileSub_privacy),
          ),
        ],
      ),
    ];
  }

  String _errorText(AppLocalizations l10n, String code) => switch (code) {
        SubscriptionErrors.otherAccount => l10n.mobileSub_errorOtherAccount,
        SubscriptionErrors.network => l10n.mobileSub_errorNetwork,
        SubscriptionErrors.nothingToRestore => l10n.mobileSub_nothingToRestore,
        SubscriptionErrors.purchaseFailed => l10n.mobileSub_errorPurchase,
        SubscriptionErrors.storeUnavailable => l10n.mobileSub_unavailable,
        _ => l10n.mobileSub_errorVerify,
      };
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.product, required this.busy, required this.onBuy});
  final StoreProduct product;
  final String? busy;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final plan = planForProduct(product.id);
    final popular = plan?.tier == 'STANDARD';
    return Card(
      key: Key('sub-plan-${product.id}'),
      shape: popular
          ? RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFFACC15), width: 3),
            )
          : null,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    plan == null ? product.title : planName(l10n, plan.tier),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                ),
                if (popular)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFFFACC15), borderRadius: BorderRadius.circular(999)),
                    child: Text('⭐ ${l10n.subscription_popular}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(l10n.mobileSub_pricePerMonth(product.price), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            if (plan != null)
              Text(l10n.subscription_playsPerDay(
                  NumberFormat.decimalPattern(Localizations.localeOf(context).toLanguageTag()).format(plan.playsPerDay))),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                key: Key('sub-buy-${product.id}'),
                onPressed: busy == null ? onBuy : null,
                child: busy == product.id
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(l10n.mobileSub_subscribe),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({super.key, required this.text, this.error = false});
  final String text;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final color = error ? Theme.of(context).colorScheme.error : Theme.of(context).colorScheme.primary;
    return Card(
      color: color.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
