import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/feature_providers.dart';
import '../../api/stats_models.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../stats/game_meta.dart';
import '../../stats/stats_logic.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';

/// Leaderboard with a game selector, timeframe chips and the user's own rank.
/// Read-only: the admin clear action from web is not part of the app.
class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  LeaderboardGameType _game = LeaderboardGameType.overall;
  LeaderboardTimeframe _timeframe = LeaderboardTimeframe.weekly;

  String _timeframeLabel(AppLocalizations l10n, LeaderboardTimeframe t) => switch (t) {
        LeaderboardTimeframe.daily => l10n.leaderboard_daily,
        LeaderboardTimeframe.weekly => l10n.leaderboard_weekly,
        LeaderboardTimeframe.monthly => l10n.leaderboard_monthly,
        LeaderboardTimeframe.allTime => l10n.leaderboard_allTime,
      };

  String _timeframeTitle(AppLocalizations l10n, LeaderboardTimeframe t) => switch (t) {
        LeaderboardTimeframe.daily => l10n.leaderboard_todaysTop,
        LeaderboardTimeframe.weekly => l10n.leaderboard_thisWeeksTop,
        LeaderboardTimeframe.monthly => l10n.leaderboard_thisMonthsTop,
        LeaderboardTimeframe.allTime => l10n.leaderboard_allTimeTop,
      };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final query = (gameType: _game, timeframe: _timeframe);
    final board = ref.watch(leaderboardProvider(query));
    return Scaffold(
      appBar: AppBar(title: Text('🏆 ${l10n.leaderboard_title}')),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: DropdownButton<LeaderboardGameType>(
                key: const Key('lb-game'),
                isExpanded: true,
                value: _game,
                items: [
                  for (final g in kLeaderboardGameTypes)
                    DropdownMenuItem(
                      value: g,
                      child: Text(
                        '${gameTypeMeta(g.wire).icon} ${gameTypeName(l10n, g.wire)}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: (v) => setState(() => _game = v ?? _game),
              ),
            ),
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  for (final t in LeaderboardTimeframe.values)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        key: Key('lb-${t.name}'),
                        selected: _timeframe == t,
                        label: Text(_timeframeLabel(l10n, t)),
                        onSelected: (_) => setState(() => _timeframe = t),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: board.when(
                loading: () => LoadingView(message: l10n.common_loading),
                error: (_, __) => ErrorView(
                  message: l10n.leaderboard_failedToLoad,
                  retryLabel: l10n.common_tryAgain,
                  onRetry: () => ref.invalidate(leaderboardProvider(query)),
                ),
                data: (data) => _Board(
                  data: data,
                  title: _timeframeTitle(l10n, _timeframe),
                  onRefresh: () async {
                    ref.invalidate(leaderboardProvider(query));
                    await ref.read(leaderboardProvider(query).future);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Board extends StatelessWidget {
  const _Board({required this.data, required this.title, required this.onRefresh});

  final LeaderboardResult data;
  final String title;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final me = data.currentUserEntry;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (me != null)
            Card(
              key: const Key('lb-me'),
              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l10n.leaderboard_yourRank,
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.w800)),
                          Text(l10n.leaderboard_ranked(
                              '${me.rank}', '${data.totalEntries}')),
                        ],
                      ),
                    ),
                    Column(
                      children: [
                        Text('#${me.rank}',
                            style: const TextStyle(
                                fontSize: 22, fontWeight: FontWeight.w900)),
                        Text(l10n.leaderboard_rank,
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Column(
                      children: [
                        Text(formatNumber(me.score),
                            style: const TextStyle(
                                fontSize: 22, fontWeight: FontWeight.w900)),
                        Text(l10n.game_score,
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          Row(
            children: [
              Expanded(
                child: Text(title,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              ),
              Text(
                '${data.totalEntries} '
                '${data.totalEntries == 1 ? l10n.leaderboard_player.toLowerCase() : l10n.leaderboard_players}',
                key: const Key('lb-count'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (data.entries.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                key: const Key('lb-empty'),
                children: [
                  const Text('🏆', style: TextStyle(fontSize: 56)),
                  Text(l10n.mobileStats_noEntries,
                      style: const TextStyle(
                          fontSize: 20, fontWeight: FontWeight.w800)),
                  Text(l10n.mobileStats_noEntriesBody, textAlign: TextAlign.center),
                ],
              ),
            ),
          for (final e in data.entries) _EntryRow(entry: e),
          if (data.entries.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                '${l10n.leaderboard_showing('${data.entries.length}')}\n'
                '${l10n.leaderboard_keepPlaying} 🎮',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ),
    );
  }
}

class _EntryRow extends StatelessWidget {
  const _EntryRow({required this.entry});
  final LeaderboardEntry entry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final medal = switch (entry.rank) { 1 => '🥇', 2 => '🥈', 3 => '🥉', _ => null };
    return Card(
      key: Key('lb-row-${entry.rank}'),
      color: entry.isCurrentUser
          ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1)
          : null,
      child: ListTile(
        leading: SizedBox(
          width: 40,
          child: Center(
            child: Text(medal ?? '#${entry.rank}',
                style: TextStyle(
                    fontSize: medal == null ? 16 : 24, fontWeight: FontWeight.w800)),
          ),
        ),
        title: Text(
          entry.isCurrentUser
              ? '${entry.username} (${l10n.mobileStats_you})'
              : entry.username,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(
          '⏱ ${formatDuration(entry.completionTime)} · ${(entry.accuracy * 100).round()}%',
        ),
        trailing: Text(formatNumber(entry.score),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
      ),
    );
  }
}
