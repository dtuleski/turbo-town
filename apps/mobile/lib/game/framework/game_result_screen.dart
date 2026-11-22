import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/game_providers.dart';
import '../../api/quest_models.dart';
import '../../l10n/game_text.dart';
import '../../l10n/gen/app_localizations.dart';
import 'game_session.dart';

/// Result page shared by every game: server score and breakdown, rank,
/// achievements, quest outcome, rating and the next actions.
class GameResultScreen extends StatelessWidget {
  const GameResultScreen({
    super.key,
    required this.result,
    required this.onPlayAgain,
    required this.onHome,
    this.reviewType,
    this.onBackToMap,
    this.onNextLeg,
  });

  final GameResult result;
  final VoidCallback onPlayAgain;
  final VoidCallback onHome;

  /// Review key (`MEMORY_MATCH`). Null hides the rating row.
  final String? reviewType;

  /// Set when the round came from the Quest Map.
  final VoidCallback? onBackToMap;

  /// Set when the quest run has another leg to play.
  final VoidCallback? onNextLeg;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final b = result.scoreBreakdown;
    final unlocked = result.achievements.where((a) => a.unlocked).toList();
    final quest = result.quest;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('🎉', textAlign: TextAlign.center, style: TextStyle(fontSize: 64)),
            const SizedBox(height: 8),
            Text(
              l10n.mobileGame_complete,
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            if (!result.saved)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  l10n.mobileGame_scoreHiccup,
                  key: const Key('result-not-saved'),
                  textAlign: TextAlign.center,
                ),
              ),
            _Row(
              label: l10n.game_totalScore,
              value: '${result.score}',
              valueKey: const Key('result-score'),
              big: true,
            ),
            if (b != null) ...[
              _Row(label: l10n.game_baseScore, value: '${b.baseScore}'),
              _Row(label: l10n.game_difficulty, value: '×${b.difficultyMultiplier}'),
              _Row(label: l10n.game_speed, value: '+${b.speedBonus}'),
              _Row(label: l10n.game_accuracy, value: '+${b.accuracyBonus}'),
            ],
            _Row(label: l10n.game_time, value: '${result.completionTime}s'),
            _Row(label: l10n.setup_memoryMatch_attempts, value: '${result.attempts}'),
            if (result.leaderboardRank != null)
              _Row(
                label: l10n.mobileGame_leaderboardRank,
                value: '#${result.leaderboardRank}',
              ),
            if (unlocked.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                l10n.mobileGame_achievementsUnlocked,
                style: theme.textTheme.titleMedium,
              ),
              for (final a in unlocked)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('🏆 ${_prettyAchievement(a.type)}'),
                ),
            ],
            if (quest != null) _QuestSection(quest: quest, saved: result.saved),
            if (reviewType != null) ...[
              const SizedBox(height: 16),
              RateGame(reviewType: reviewType!),
            ],
            const SizedBox(height: 24),
            if (onNextLeg != null)
              FilledButton(
                key: const Key('result-next-leg'),
                onPressed: onNextLeg,
                child: Text(l10n.quest_result_nextLeg),
              )
            else
              FilledButton(
                key: const Key('result-play-again'),
                onPressed: onPlayAgain,
                child: Text(l10n.game_playAgain),
              ),
            const SizedBox(height: 8),
            if (onBackToMap != null)
              TextButton(
                key: const Key('result-back-to-map'),
                onPressed: onBackToMap,
                child: Text(l10n.quest_result_backToMap),
              ),
            TextButton(
              key: const Key('result-home'),
              onPressed: onHome,
              child: Text(l10n.mobileGame_backToHub),
            ),
          ],
        ),
      ),
    );
  }
}

String _prettyAchievement(String type) {
  final words = type.toLowerCase().split('_').where((w) => w.isNotEmpty);
  return words.map((w) => '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
}

class _Row extends StatelessWidget {
  const _Row({
    required this.label,
    required this.value,
    this.valueKey,
    this.big = false,
  });

  final String label;
  final String value;
  final Key? valueKey;
  final bool big;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyLarge),
          Text(
            value,
            key: valueKey,
            style: TextStyle(
              fontSize: big ? 24 : 16,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

/// Port of web `QuestResultSection`: what the round did to the map.
class _QuestSection extends StatelessWidget {
  const _QuestSection({required this.quest, required this.saved});

  final QuestResult quest;
  final bool saved;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final g = quest.gauntlet;
    final nextGoal = quest.stars < 3 && quest.stars < quest.thresholds.length
        ? quest.thresholds[quest.stars]
        : null;
    final names = quest.newlyUnlocked
        .map((id) => questNodeName(l10n, id) ?? id)
        .join(', ');
    final lines = <String>[];
    if (g != null && g.legsTotal > 1 && g.status == 'IN_PROGRESS') {
      lines.add(l10n.quest_result_legDone('${g.legIndex + 1}', '${g.legsTotal}'));
      lines.add(l10n.quest_result_legScore('${quest.score}'));
    } else if (g != null && g.status == 'EXPIRED') {
      lines.add(l10n.quest_result_expired);
    } else {
      lines.add(l10n.quest_result_stars('${quest.stars}'));
      lines.add(l10n.quest_result_best('${quest.bestStars}'));
      lines.add(
        nextGoal != null
            ? l10n.quest_result_nextGoal('$nextGoal')
            : l10n.quest_result_allGoals,
      );
      if (g != null && g.legsTotal > 1) {
        lines.add(l10n.quest_result_combined('${quest.score}'));
      }
    }
    if (quest.newlyUnlocked.isNotEmpty) lines.add(l10n.quest_result_unlocked(names));
    if (quest.worldCleared) lines.add(l10n.quest_result_worldCleared);
    return Container(
      key: const Key('result-quest'),
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.quest_title,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          if (g == null || g.status != 'IN_PROGRESS')
            Text(
              '★' * quest.stars + '☆' * (3 - quest.stars),
              style: const TextStyle(fontSize: 28, color: Colors.amber),
            ),
          for (final line in lines) Text(line),
          if (!saved) Text(l10n.quest_result_notSaved),
        ],
      ),
    );
  }
}

/// Five-star rating that calls `submitGameReview`.
class RateGame extends ConsumerStatefulWidget {
  const RateGame({super.key, required this.reviewType});

  final String reviewType;

  @override
  ConsumerState<RateGame> createState() => _RateGameState();
}

class _RateGameState extends ConsumerState<RateGame> {
  int _rating = 0;
  bool _sent = false;

  Future<void> _submit(int value) async {
    if (_sent) return;
    setState(() => _rating = value);
    try {
      final ok =
          await ref.read(gameApiProvider).submitGameReview(widget.reviewType, value);
      if (mounted && ok) setState(() => _sent = true);
    } catch (_) {
      // A failed rating is not worth interrupting the result page for.
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_sent) {
      return Text(
        l10n.game_thanksFeedback,
        key: const Key('rating-thanks'),
        textAlign: TextAlign.center,
      );
    }
    return Column(
      children: [
        Text(l10n.game_rateGame),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 1; i <= 5; i++)
              IconButton(
                key: Key('rate-$i'),
                onPressed: () => _submit(i),
                icon: Icon(
                  i <= _rating ? Icons.star : Icons.star_border,
                  color: Colors.amber,
                ),
              ),
          ],
        ),
      ],
    );
  }
}
