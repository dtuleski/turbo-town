import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/feature_providers.dart';
import '../../api/stats_models.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../stats/stats_logic.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';
import '../widgets/section_card.dart';

/// Totals, rank, score trend and links to the detail screens.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final bundle = ref.watch(statsBundleProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.nav_dashboard)),
      body: SafeArea(
        child: bundle.when(
          loading: () => LoadingView(message: l10n.common_loading),
          error: (_, __) => ErrorView(
            message: l10n.mobileStats_statsLoadFailed,
            retryLabel: l10n.common_tryAgain,
            onRetry: () => ref.invalidate(statsBundleProvider),
          ),
          data: (data) => RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(statsBundleProvider);
              ref.invalidate(overallRankProvider);
              await ref.read(statsBundleProvider.future);
            },
            child: _Content(data: data),
          ),
        ),
      ),
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({required this.data});
  final StatsBundle data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final totals = dashboardTotals(data.stats, data.history);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: StatTile(
                icon: '🎮',
                value: '${totals.totalGames}',
                label: l10n.mobileStats_totalGames,
              ),
            ),
            Expanded(
              child: StatTile(
                icon: '⭐',
                value: formatNumber(totals.bestScore),
                label: l10n.mobileStats_bestScore,
              ),
            ),
            Expanded(
              child: StatTile(
                icon: '🏆',
                value: '${totals.completedGames}',
                label: l10n.mobileStats_completedGames,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          l10n.mobileStats_yourPerformance,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const _RankCard(),
        _TrendCard(history: data.history),
        _LinkCard(
          keyName: 'link-statistics',
          icon: '📊',
          title: l10n.mobileStats_statisticsTitle,
          body: l10n.mobileStats_statisticsDesc,
          onTap: () => context.push('/statistics'),
        ),
        _LinkCard(
          keyName: 'link-history',
          icon: '📜',
          title: l10n.mobileStats_historyTitle,
          body: l10n.mobileStats_historyDesc,
          onTap: () => context.push('/history'),
        ),
        _LinkCard(
          keyName: 'link-achievements',
          icon: '🏅',
          title: l10n.nav_achievements,
          body: l10n.mobileStats_achievementsDesc,
          onTap: () => context.push('/achievements'),
        ),
      ],
    );
  }
}

class _RankCard extends ConsumerWidget {
  const _RankCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final rank = ref.watch(overallRankProvider);
    return SectionCard(
      title: '🏆 ${l10n.leaderboard_yourRank}',
      onTap: () => context.go('/leaderboard'),
      child: rank.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Text(l10n.mobileStats_playToRank),
        data: (r) {
          if (r == null) {
            return Text(l10n.mobileStats_playToRank, key: const Key('rank-empty'));
          }
          final message = r.percentile >= 90
              ? l10n.mobileStats_topTen
              : r.percentile >= 75
                  ? l10n.mobileStats_topQuarter
                  : r.percentile >= 50
                      ? l10n.mobileStats_topHalf
                      : l10n.mobileStats_keepPlaying;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '#${r.rank}',
                    key: const Key('rank-value'),
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      l10n.mobileStats_ofPlayers(formatNumber(r.totalPlayers)),
                    ),
                  ),
                  Text(
                    '${formatNumber(r.score)} ${l10n.mobileStats_points}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(message),
            ],
          );
        },
      ),
    );
  }
}

class _TrendCard extends StatelessWidget {
  const _TrendCard({required this.history});
  final List<LeaderboardEntry> history;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final trend = scoreTrend(history.take(10).toList());
    final text = switch (trend.direction) {
      TrendDirection.up => '📈 ${l10n.mobileStats_trendUp(trend.percent.toStringAsFixed(0))}',
      TrendDirection.down => '📉 ${l10n.mobileStats_trendDown(trend.percent.toStringAsFixed(0))}',
      TrendDirection.stable => '➡ ${l10n.mobileStats_trendStable}',
    };
    return SectionCard(
      title: l10n.mobileStats_trendTitle,
      child: Text(
        history.length < 2 ? l10n.mobileStats_trendNoData : text,
        key: const Key('trend-text'),
      ),
    );
  }
}

class _LinkCard extends StatelessWidget {
  const _LinkCard({
    required this.keyName,
    required this.icon,
    required this.title,
    required this.body,
    required this.onTap,
  });

  final String keyName;
  final String icon;
  final String title;
  final String body;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      key: Key(keyName),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Text(icon, style: const TextStyle(fontSize: 32)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    Text(body, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
