import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/challenge_models.dart';
import '../../api/game_providers.dart';
import '../../l10n/game_text.dart';
import '../../l10n/gen/app_localizations.dart';

/// How many rows the results screen shows (web `RESULTS_COUNT`).
const int kChallengeResultsCount = 10;

/// The `day` query parameter when it is a real calendar day, else null (today).
String? resultsDayParam(String? raw) => isChallengeDay(raw) ? raw : null;

/// A day's leaderboard (today for null); null when there is none or it failed.
final challengeResultsProvider =
    FutureProvider.autoDispose.family<ChallengeLeaderboardView?, String?>((ref, day) {
  return ref.watch(challengeApiProvider).getChallengeLeaderboard(day: day, limit: kChallengeResultsCount);
});

/// `/challenge/results?day=YYYY-MM-DD` (M4, the digest push route): the day's
/// game, winner, top 10 and own rank (web `ChallengeResultsPage`).
class ChallengeResultsScreen extends ConsumerWidget {
  const ChallengeResultsScreen({super.key, this.day});

  final String? day;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final loaded = ref.watch(challengeResultsProvider(day));
    return Scaffold(
      appBar: AppBar(title: Text(l10n.challenge_results_title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (loaded.isLoading)
              Text(l10n.challenge_results_loading, key: const Key('challenge-results-loading'))
            else if (loaded.valueOrNull == null)
              Text(l10n.challenge_results_none, key: const Key('challenge-results-none'))
            else
              _Results(data: loaded.valueOrNull!),
            const SizedBox(height: 24),
            FilledButton(
              key: const Key('challenge-results-to-hub'),
              onPressed: () => context.go('/'),
              child: Text(l10n.challenge_results_toHub),
            ),
          ],
        ),
      ),
    );
  }
}

class _Results extends StatelessWidget {
  const _Results({required this.data});

  final ChallengeLeaderboardView data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final date = DateTime.tryParse(data.day);
    final winner = data.entries.isEmpty ? null : data.entries.first;
    final me = data.me;
    return Card(
      key: const Key('challenge-results'),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              date == null ? data.day : MaterialLocalizations.of(context).formatFullDate(date),
              style: theme.textTheme.bodySmall,
            ),
            Text(
              gameTitle(l10n, data.gameId) ?? data.gameId,
              key: const Key('challenge-results-game'),
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            if (!data.isFinal)
              Text(l10n.challenge_results_live, key: const Key('challenge-results-live')),
            const SizedBox(height: 12),
            Text(
              winner != null
                  ? '🏆 ${l10n.challenge_results_winner(winner.username, '${winner.score}')}'
                  : l10n.challenge_results_noScores,
              key: const Key('challenge-results-winner'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            for (final entry in data.entries.take(kChallengeResultsCount))
              Container(
                key: Key('challenge-results-entry-${entry.rank}'),
                margin: const EdgeInsets.symmetric(vertical: 2),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: entry.isMe ? Colors.amber.shade100 : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '#${entry.rank} ${entry.username}${entry.isMe ? ' ${l10n.challenge_you}' : ''}',
                        style: TextStyle(fontWeight: entry.isMe ? FontWeight.w800 : FontWeight.normal),
                      ),
                    ),
                    Text('${entry.score}'),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            Text(
              me != null ? l10n.challenge_results_me('${me.rank}', '${me.bestScore}') : l10n.challenge_results_notPlayed,
              key: const Key('challenge-results-me'),
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
