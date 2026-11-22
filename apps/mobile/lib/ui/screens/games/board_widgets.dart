import 'package:flutter/material.dart';

import '../../theme.dart';

/// `m:ss`.
String clockText(int seconds) {
  final m = seconds ~/ 60;
  final s = (seconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

/// Row of hearts, full then empty.
String heartsText(int lives, int max) =>
    '${'❤️' * lives.clamp(0, max)}${'🖤' * (max - lives).clamp(0, max)}';

/// Rounded status pill above a board ("MEMORIZE! 4s").
class StatusPill extends StatelessWidget {
  const StatusPill(this.text, {super.key, this.color = AppTheme.primary});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(999)),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
      ),
    );
  }
}

/// Card shown when a lives-based round ends: message, score button, retry.
class GameOverCard extends StatelessWidget {
  const GameOverCard({
    super.key,
    required this.title,
    required this.lines,
    required this.seeScoreLabel,
    required this.onSeeScore,
    this.tryAgainLabel,
    this.onTryAgain,
  });

  final String title;
  final List<String> lines;
  final String seeScoreLabel;
  final VoidCallback onSeeScore;
  final String? tryAgainLabel;
  final VoidCallback? onTryAgain;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('💔', style: TextStyle(fontSize: 44)),
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            for (final l in lines) Text(l, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(
              key: const Key('game-over-score'),
              onPressed: onSeeScore,
              child: Text(seeScoreLabel),
            ),
            if (onTryAgain != null)
              TextButton(
                key: const Key('game-over-retry'),
                onPressed: onTryAgain,
                child: Text(tryAgainLabel ?? ''),
              ),
          ],
        ),
      ),
    );
  }
}
