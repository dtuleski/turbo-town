import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/game_models.dart';
import '../../auth/auth_controller.dart';
import '../../game/game_registry.dart';
import '../../game/hub_logic.dart';
import '../../game/hub_providers.dart';
import '../../l10n/game_text.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../l10n/language_picker.dart';
import '../../subscription/subscription_controller.dart';
import '../theme.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';

String _filterLabel(AppLocalizations l10n, GameCategory? c) {
  switch (c) {
    case null:
      return l10n.hub_filter_all;
    case GameCategory.scienceMath:
      return l10n.hub_filter_scienceMath;
    case GameCategory.historyCivics:
      return l10n.hub_filter_historyCivics;
    case GameCategory.geographyLanguage:
      return l10n.hub_filter_geographyLanguage;
    case GameCategory.puzzlesLogic:
      return l10n.hub_filter_puzzlesLogic;
    case GameCategory.other:
      return '';
  }
}

String _filterKey(GameCategory? c) => 'filter-${c?.name ?? 'all'}';

/// Game hub: quest card, category chips and a tile per playable game.
class HubScreen extends ConsumerStatefulWidget {
  const HubScreen({super.key});

  @override
  ConsumerState<HubScreen> createState() => _HubScreenState();
}

class _HubScreenState extends ConsumerState<HubScreen> {
  GameCategory? _filter;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = ref.watch(authControllerProvider);
    final name = auth.displayName ?? auth.username ?? auth.email ?? l10n.common_player;
    final data = ref.watch(hubDataProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.hub_title),
        actions: [
          const LanguagePicker(),
          IconButton(
            key: const Key('hub-sign-out'),
            tooltip: l10n.nav_logout,
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authControllerProvider.notifier).signOut(),
          ),
        ],
      ),
      body: SafeArea(
        child: data.when(
          loading: () => LoadingView(message: l10n.hub_loadingGames),
          error: (_, __) => ErrorView(
            message: l10n.hub_failedToLoad,
            retryLabel: l10n.common_tryAgain,
            onRetry: () => ref.invalidate(hubDataProvider),
          ),
          data: (hub) => _content(context, l10n, name, hub),
        ),
      ),
    );
  }

  Widget _content(
    BuildContext context,
    AppLocalizations l10n,
    String name,
    HubData hub,
  ) {
    final all = buildHubTiles(catalog: hub.catalog, tier: hub.tier);
    final shown = filterHubTiles(all, _filter);
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(hubDataProvider);
        await ref.read(hubDataProvider.future);
      },
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            sliver: SliverList.list(
              children: [
                Text(
                  l10n.hub_greeting(name),
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(l10n.hub_subtitle),
                const SizedBox(height: 12),
                SizedBox(
                  height: 44,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      for (final f in kHubFilters)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            key: Key(_filterKey(f.category)),
                            label: Text('${f.emoji} ${_filterLabel(l10n, f.category)}'),
                            selected: _filter == f.category,
                            onSelected: (_) => setState(() => _filter = f.category),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _QuestCard(onTap: () => context.go('/quest-map')),
                const SizedBox(height: 12),
                if (all.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(l10n.hub_noGames, textAlign: TextAlign.center),
                  )
                else if (shown.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(l10n.hub_noGamesFilter, textAlign: TextAlign.center),
                  ),
              ],
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            sliver: SliverList.separated(
              itemCount: shown.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => GameTile(
                tile: shown[i],
                rating: hub.ratings[shown[i].entry.reviewType],
                onTap: () => context.push(shown[i].entry.setupRoute),
                onSubscribe: ref.watch(storeSubscriptionsEnabledProvider)
                    ? () => context.push('/subscription')
                    : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuestCard extends StatelessWidget {
  const _QuestCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Card(
      key: const Key('quest-card'),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: const BoxDecoration(gradient: AppTheme.brandGradient),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Text('🗺', style: TextStyle(fontSize: 36)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.quest_hub_title,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text(l10n.quest_hub_body,
                        style: const TextStyle(color: Colors.white70)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

/// One hub tile. Paid tiles for FREE users carry a neutral label and no price.
class GameTile extends StatelessWidget {
  const GameTile({super.key, required this.tile, required this.onTap, this.rating, this.onSubscribe});

  final HubTile tile;
  final ReviewStats? rating;
  final VoidCallback onTap;

  /// When set (iOS with App Store subscriptions), a paid tile for a FREE user
  /// opens the plans instead of being inert.
  final VoidCallback? onSubscribe;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final entry = tile.entry;
    final playable = tile.availability == TileAvailability.playable;
    final title = gameTitle(l10n, entry.gameId) ?? tile.catalog.title;
    final description =
        gameDescription(l10n, entry.gameId) ?? tile.catalog.description;
    final category = gameCategory(l10n, entry.gameId) ?? tile.catalog.category;
    final icon = tile.catalog.icon.isEmpty ? entry.emoji : tile.catalog.icon;
    final label = switch (tile.availability) {
      TileAvailability.playable => null,
      TileAvailability.comingSoon => l10n.hub_comingSoon,
      TileAvailability.paidUnavailable =>
        onSubscribe != null ? l10n.mobileSub_subscribeToPlay : l10n.mobileGame_notAvailableLabel,
      TileAvailability.notInApp => l10n.mobileGame_comingToApp,
    };
    return Opacity(
      opacity: playable ? 1 : 0.7,
      child: Card(
        key: Key('tile-${entry.gameId}'),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: playable
              ? onTap
              : (tile.availability == TileAvailability.paidUnavailable ? onSubscribe : null),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(icon, style: const TextStyle(fontSize: 40)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 2),
                      Text(description,
                          style: Theme.of(context).textTheme.bodyMedium),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          _Pill('${l10n.hub_ages} ${tile.catalog.ageRange}'),
                          _Pill(category),
                        ],
                      ),
                      if (rating != null && rating!.totalReviews > 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(
                            key: Key('rating-${entry.gameId}'),
                            children: [
                              const Icon(Icons.star, size: 16, color: Colors.amber),
                              const SizedBox(width: 4),
                              Text(
                                '${rating!.averageRating.toStringAsFixed(1)} '
                                '(${rating!.totalReviews})',
                              ),
                            ],
                          ),
                        ),
                      if (label != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            label,
                            key: Key('tile-label-${entry.gameId}'),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                    ],
                  ),
                ),
                if (playable) const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text, style: const TextStyle(fontSize: 12)),
    );
  }
}
