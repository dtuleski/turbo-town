import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../challenge/challenge_card_data.dart';
import '../../challenge/challenge_launch.dart';
import '../../l10n/game_text.dart';
import '../../l10n/gen/app_localizations.dart';

/// Daily Challenge card at the top of the hub (M4, FR-DC-21): the game, Play,
/// own best and rank, today's top 5. Hidden while loading, when the challenge
/// is off and when it fails to load. [failed] shows the notice for a failed
/// challenge start (`/?challengeFailed=1`) even when the card is hidden.
class DailyChallengeCard extends ConsumerWidget {
  const DailyChallengeCard({super.key, this.failed = false});

  final bool failed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final data = ref.watch(challengeCardProvider).valueOrNull;
    final notice = failed
        ? Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              key: const Key('daily-challenge-failed'),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                border: Border.all(color: Colors.amber.shade300, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                l10n.challenge_card_failed,
                style: TextStyle(color: Colors.amber.shade900, fontWeight: FontWeight.w600),
              ),
            ),
          )
        : null;
    if (data == null) return notice ?? const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (notice != null) notice,
        _CardBody(data: data),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _CardBody extends StatelessWidget {
  const _CardBody({required this.data});

  final ChallengeCardData data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final challenge = data.challenge;
    final me = challenge.me;
    final playPath = buildChallengePath(challenge);
    final top = data.leaderboard?.entries.take(kChallengeCardTopCount).toList();
    final dark = Colors.orange.shade900;
    return Card(
      key: const Key('daily-challenge-card'),
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [Colors.amber.shade50, Colors.orange.shade100]),
          border: Border.all(color: Colors.amber.shade300, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('⭐ ${l10n.challenge_card_title}',
                style: TextStyle(color: dark, fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 2),
            Text(
              gameTitle(l10n, challenge.gameId) ?? challenge.gameId,
              key: const Key('daily-challenge-game'),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              me != null ? l10n.challenge_card_best('${me.bestScore}', '${me.rank}') : l10n.challenge_card_notPlayed,
              key: const Key('daily-challenge-me'),
            ),
            const SizedBox(height: 2),
            Text(l10n.challenge_card_endsAt, style: const TextStyle(fontSize: 12)),
            if (playPath != null) ...[
              const SizedBox(height: 12),
              FilledButton(
                key: const Key('daily-challenge-play'),
                style: FilledButton.styleFrom(backgroundColor: Colors.orange.shade700),
                onPressed: () => context.push(playPath),
                child: Text(l10n.challenge_card_play),
              ),
            ],
            if (top != null) ...[
              const SizedBox(height: 12),
              Text(l10n.challenge_card_top, style: TextStyle(color: dark, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              if (top.isEmpty)
                Text(l10n.challenge_card_noScores, key: const Key('daily-challenge-no-scores'))
              else
                for (final entry in top)
                  Padding(
                    key: Key('daily-challenge-entry-${entry.rank}'),
                    padding: const EdgeInsets.symmetric(vertical: 2),
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
            ],
            const SizedBox(height: 4),
            TextButton(
              key: const Key('daily-challenge-results'),
              style: TextButton.styleFrom(padding: EdgeInsets.zero, foregroundColor: dark),
              onPressed: () => context.push(challengeResultsPath(challenge.day)),
              child: Text(l10n.challenge_card_allResults),
            ),
          ],
        ),
      ),
    );
  }
}
