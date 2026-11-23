import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../api/feature_providers.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../stats/game_meta.dart';
import '../../stats/stats_logic.dart';
import '../widgets/charts.dart';
import '../widgets/loading_view.dart';
import '../widgets/section_card.dart';

/// Detailed statistics from the score history (last 100 games) and the
/// server totals, as on the web Statistics page.
class StatisticsScreen extends ConsumerStatefulWidget {
  const StatisticsScreen({super.key, this.now});

  /// Fixed clock for tests.
  final DateTime? now;

  @override
  ConsumerState<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends ConsumerState<StatisticsScreen> {
  String _game = 'ALL';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final bundle = ref.watch(statsBundleProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.mobileStats_statisticsTitle)),
      body: SafeArea(
        child: bundle.when(
          loading: () => LoadingView(message: l10n.common_loading),
          error: (_, __) => _Message(
            icon: '⚠',
            title: l10n.mobileStats_errorTitle,
            body: l10n.mobileStats_statsLoadFailed,
            onRetry: () => ref.invalidate(statsBundleProvider),
          ),
          data: (data) {
            if (data.stats == null && data.history.isEmpty) {
              return _Message(
                icon: '📊',
                title: l10n.mobileStats_noData,
                body: l10n.mobileStats_noDataBody,
              );
            }
            return _content(context, l10n, data);
          },
        ),
      ),
    );
  }

  Widget _content(BuildContext context, AppLocalizations l10n, StatsBundle data) {
    final history = data.history;
    final breakdown = gameBreakdown(history);
    if (_game != 'ALL' && !breakdown.any((e) => e.key == _game)) _game = 'ALL';
    final filtered =
        _game == 'ALL' ? history : history.where((e) => e.gameType == _game).toList();
    final weeks = weeklyActivity(filtered, widget.now ?? DateTime.now());
    final maxWeek = weeks.fold<int>(1, (m, b) => b.count > m ? b.count : m);
    final progression = scoreProgression(filtered);
    final accuracy = [for (final e in progression.entries) (e.accuracy * 100).round()];
    final avgAccuracy = accuracy.isEmpty
        ? 0.0
        : accuracy.reduce((a, b) => a + b) / accuracy.length;
    final speeds = [for (final e in progression.entries) e.completionTime];
    final avgSpeed =
        speeds.isEmpty ? 0.0 : speeds.reduce((a, b) => a + b) / speeds.length;
    final maxSpeed = speeds.fold<double>(1, (m, s) => s > m ? s : m);
    final totalTime = history.fold<double>(0, (s, e) => s + e.completionTime);
    final bestScore = history.isNotEmpty
        ? history.map((h) => h.score).reduce((a, b) => a > b ? a : b)
        : (data.stats?.bestScore ?? 0);
    final avgScore = history.isNotEmpty
        ? history.fold<int>(0, (s, h) => s + h.score) / history.length
        : (data.stats?.averageScore ?? 0);
    final totalGames = (data.stats?.totalGames ?? 0) != 0
        ? data.stats!.totalGames
        : filtered.length;
    final bests = personalBestEntries(history);
    final week = DateFormat.Md(Localizations.localeOf(context).toString());

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        DropdownButton<String>(
          key: const Key('stats-game-filter'),
          isExpanded: true,
          value: _game,
          items: [
            DropdownMenuItem(value: 'ALL', child: Text(l10n.mobileStats_allGames)),
            for (final g in breakdown)
              DropdownMenuItem(
                value: g.key,
                child: Text('${gameTypeMeta(g.key).icon} ${gameTypeName(l10n, g.key)}'),
              ),
          ],
          onChanged: (v) => setState(() => _game = v ?? 'ALL'),
        ),
        const SizedBox(height: 8),
        GridView.count(
          crossAxisCount: 2,
          childAspectRatio: 1.6,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            StatTile(icon: '🎮', value: '$totalGames', label: l10n.mobileStats_gamesPlayed),
            StatTile(icon: '⭐', value: formatNumber(bestScore), label: l10n.mobileStats_bestScore),
            StatTile(icon: '📈', value: formatNumber(avgScore), label: l10n.mobileStats_avgScore),
            StatTile(
              icon: '🎯',
              value: '${avgAccuracy.toStringAsFixed(0)}%',
              label: l10n.mobileStats_avgAccuracy,
            ),
            StatTile(
              icon: '⏱',
              value: formatDuration(totalTime),
              label: l10n.mobileStats_totalPlayTime,
            ),
          ],
        ),
        SectionCard(
          title: '📅 ${l10n.mobileStats_gamesPerWeek}',
          child: Column(
            children: [
              MiniBarChart(
                key: const Key('chart-weekly'),
                values: [for (final b in weeks) b.count / maxWeek],
                colors: const [Color(0xFF6366F1)],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  for (final b in weeks)
                    Expanded(
                      child: Text(
                        '${b.count == 0 ? '' : '${b.count}\n'}${week.format(b.start)}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 9),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        SectionCard(
          title: '🎮 ${l10n.mobileStats_gamesBreakdown}',
          child: Column(
            children: [
              for (final g in breakdown.take(6))
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${gameTypeMeta(g.key).icon} ${gameTypeName(l10n, g.key)}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text('${g.value}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      LinearProgressIndicator(
                        value: g.value / history.length,
                        color: gameTypeMeta(g.key).color,
                        minHeight: 8,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ],
                  ),
                ),
              Text(l10n.mobileStats_distinctGames('${breakdown.length}')),
            ],
          ),
        ),
        SectionCard(
          title: '📈 ${l10n.mobileStats_scoreProgression}',
          child: progression.entries.length < 2
              ? Text(l10n.mobileStats_progressionEmpty)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.mobileStats_progressionHelp,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    MiniBarChart(
                      key: const Key('chart-progression'),
                      height: 160,
                      values: [for (final v in progression.normalized) v / 100],
                      colors: [
                        for (final e in progression.entries) gameTypeMeta(e.gameType).color,
                      ],
                      line: [for (final v in progression.rollingAverage) v / 100],
                    ),
                  ],
                ),
        ),
        if (progression.entries.length >= 2) ...[
          SectionCard(
            title: '🎯 ${l10n.mobileStats_accuracyTrend}',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MiniBarChart(
                  values: [for (final a in accuracy) a / 100],
                  colors: [
                    for (final a in accuracy)
                      a >= 80
                          ? const Color(0xFF10B981)
                          : a >= 50
                              ? const Color(0xFFF59E0B)
                              : const Color(0xFFEF4444),
                  ],
                  height: 100,
                ),
                Text(l10n.mobileStats_avgLabel('${avgAccuracy.toStringAsFixed(0)}%')),
              ],
            ),
          ),
          SectionCard(
            title: '⚡ ${l10n.mobileStats_speedTrend}',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MiniBarChart(
                  values: [for (final s in speeds) s / maxSpeed],
                  colors: const [Color(0xFF06B6D4)],
                  height: 100,
                ),
                Text(l10n.mobileStats_avgLabel(formatDuration(avgSpeed))),
              ],
            ),
          ),
        ],
        SectionCard(
          title: '🏆 ${l10n.mobileStats_personalBests}',
          child: Column(
            children: [
              for (final e in bests)
                ListTile(
                  key: Key('best-${e.gameType}'),
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: Text(gameTypeMeta(e.gameType).icon,
                      style: const TextStyle(fontSize: 24)),
                  title: Text(gameTypeName(l10n, e.gameType)),
                  subtitle: Text(l10n.mobileStats_bestLine(
                    e.difficulty,
                    formatDuration(e.completionTime),
                    (e.accuracy * 100).round().toString(),
                  )),
                  trailing: Text(
                    formatNumber(e.score),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.title, required this.body, this.onRetry});
  final String icon;
  final String title;
  final String body;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(icon, style: const TextStyle(fontSize: 56)),
            const SizedBox(height: 12),
            Text(title,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(body, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton(onPressed: onRetry, child: Text(l10n.common_tryAgain)),
            ],
          ],
        ),
      ),
    );
  }
}
