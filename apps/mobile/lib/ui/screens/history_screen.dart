import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../api/feature_providers.dart';
import '../../api/stats_models.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../stats/game_meta.dart';
import '../../stats/stats_logic.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';

/// Paged list of the user's last 100 scores with game and difficulty
/// filters and sorting, like the web Game History page.
class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  String _game = 'ALL';
  String _difficulty = 'ALL';
  HistorySort _sort = HistorySort.date;
  bool _desc = true;
  int _page = 1;

  void _resetPage(VoidCallback change) => setState(() {
        change();
        _page = 1;
      });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final history = ref.watch(scoreHistoryProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.mobileStats_historyTitle)),
      body: SafeArea(
        child: history.when(
          loading: () => LoadingView(message: l10n.common_loading),
          error: (_, __) => ErrorView(
            message: l10n.mobileStats_historyLoadFailed,
            retryLabel: l10n.common_tryAgain,
            onRetry: () => ref.invalidate(scoreHistoryProvider),
          ),
          data: (data) => data.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('📜', style: TextStyle(fontSize: 56)),
                        const SizedBox(height: 12),
                        Text(l10n.mobileStats_noGames,
                            style: const TextStyle(
                                fontSize: 22, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 8),
                        Text(l10n.mobileStats_noGamesBody,
                            textAlign: TextAlign.center),
                      ],
                    ),
                  ),
                )
              : _content(context, l10n, data),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, AppLocalizations l10n, List<LeaderboardEntry> data) {
    final types = data.map((e) => e.gameType).toSet().toList()..sort();
    final bests = personalBestScores(data);
    final filtered = filterSortHistory(
      data,
      gameFilter: _game,
      difficultyFilter: _difficulty,
      sort: _sort,
      descending: _desc,
    );
    final pages = pageCount(filtered.length);
    if (_page > pages) _page = pages;
    final shown = pageSlice(filtered, _page);
    final from = (_page - 1) * kHistoryPageSize + 1;
    final to = _page * kHistoryPageSize > filtered.length
        ? filtered.length
        : _page * kHistoryPageSize;
    final locale = Localizations.localeOf(context).toString();
    final dateFmt = DateFormat.yMMMd(locale);
    final timeFmt = DateFormat.jm(locale);

    String sortLabel(HistorySort s) => switch (s) {
          HistorySort.date => l10n.mobileStats_sortDate,
          HistorySort.score => l10n.mobileStats_sortScore,
          HistorySort.accuracy => l10n.mobileStats_sortAccuracy,
          HistorySort.time => l10n.mobileStats_sortTime,
        };

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          filtered.length <= kHistoryPageSize
              ? l10n.mobileStats_gamesCount('${filtered.length}')
              : l10n.mobileStats_rangeOf('$from', '$to', '${filtered.length}'),
          key: const Key('history-count'),
          style: Theme.of(context).textTheme.bodySmall,
        ),
        Row(
          children: [
            Expanded(
              child: DropdownButton<String>(
                key: const Key('history-game-filter'),
                isExpanded: true,
                value: _game,
                items: [
                  DropdownMenuItem(value: 'ALL', child: Text(l10n.mobileStats_allGames)),
                  for (final t in types)
                    DropdownMenuItem(
                      value: t,
                      child: Text(
                        '${gameTypeMeta(t).icon} ${gameTypeName(l10n, t)}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: (v) => _resetPage(() => _game = v ?? 'ALL'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: DropdownButton<String>(
                key: const Key('history-difficulty-filter'),
                isExpanded: true,
                value: _difficulty,
                items: [
                  DropdownMenuItem(
                      value: 'ALL', child: Text(l10n.mobileStats_allDifficulties)),
                  DropdownMenuItem(value: 'easy', child: Text(l10n.mobileStats_easy)),
                  DropdownMenuItem(value: 'medium', child: Text(l10n.mobileStats_medium)),
                  DropdownMenuItem(value: 'hard', child: Text(l10n.mobileStats_hard)),
                ],
                onChanged: (v) => _resetPage(() => _difficulty = v ?? 'ALL'),
              ),
            ),
          ],
        ),
        Wrap(
          spacing: 8,
          children: [
            for (final s in HistorySort.values)
              ChoiceChip(
                key: Key('sort-${s.name}'),
                selected: _sort == s,
                label: Text(
                  '${sortLabel(s)} ${_sort == s ? (_desc ? '↓' : '↑') : '↕'}',
                ),
                onSelected: (_) => _resetPage(() {
                  if (_sort == s) {
                    _desc = !_desc;
                  } else {
                    _sort = s;
                    _desc = true;
                  }
                }),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (filtered.isEmpty)
          Padding(
            padding: const EdgeInsets.all(24),
            child: Text(l10n.mobileStats_noMatch,
                key: const Key('history-no-match'), textAlign: TextAlign.center),
          ),
        for (final e in shown)
          _HistoryRow(
            entry: e,
            isPersonalBest: bests[e.gameType] == e.score,
            date: dateFmt.format(e.timestamp.toLocal()),
            time: timeFmt.format(e.timestamp.toLocal()),
          ),
        if (filtered.length > kHistoryPageSize)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextButton(
                key: const Key('history-prev'),
                onPressed: _page > 1 ? () => setState(() => _page--) : null,
                child: Text('← ${l10n.mobileStats_prev}'),
              ),
              Text(l10n.mobileStats_pageOf('$_page', '$pages')),
              TextButton(
                key: const Key('history-next'),
                onPressed: _page < pages ? () => setState(() => _page++) : null,
                child: Text('${l10n.mobileStats_next} →'),
              ),
            ],
          ),
      ],
    );
  }
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({
    required this.entry,
    required this.isPersonalBest,
    required this.date,
    required this.time,
  });

  final LeaderboardEntry entry;
  final bool isPersonalBest;
  final String date;
  final String time;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final meta = gameTypeMeta(entry.gameType);
    final acc = (entry.accuracy * 100).round();
    return Card(
      child: Container(
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: meta.color, width: 4)),
        ),
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Text(meta.icon, style: const TextStyle(fontSize: 26)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(gameTypeName(l10n, entry.gameType),
                      style: const TextStyle(fontWeight: FontWeight.w800),
                      overflow: TextOverflow.ellipsis),
                  Text('${entry.difficulty} · $acc% · ⏱ ${formatDuration(entry.completionTime)}',
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(formatNumber(entry.score),
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: meta.color)),
                    if (isPersonalBest) ...[
                      const SizedBox(width: 4),
                      Text('🏆 ${l10n.mobileStats_pb}',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
                    ],
                  ],
                ),
                Text('$date · $time', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
