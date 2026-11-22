import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../../config/constants.dart';
import '../../game/card.dart';
import '../../game/framework/game_session.dart';
import '../../game/framework/game_session_frame.dart';
import '../../game/game_logic.dart';
import '../../game/game_registry.dart';
import '../../game/memory_controller.dart';
import '../../l10n/gen/app_localizations.dart';
import '../memory_text.dart';
import '../theme.dart';

/// Memory Match round, built on the shared game framework.
class MemoryGameScreen extends ConsumerWidget {
  const MemoryGameScreen({
    super.key,
    required this.themeId,
    required this.difficulty,
    this.questContext,
  });

  final String themeId;
  final Difficulty difficulty;

  /// Set when the round was launched from a Quest Map node.
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (
      themeId: themeId,
      difficulty: difficulty,
      questContext: questContext,
    );
    final board = memoryControllerProvider(args);
    // Keep the board alive while the frame shows pause/result screens.
    ref.listen(board, (_, __) {});
    final entry = gameById('memory-match')!;
    return GameSessionFrame(
      args: memorySessionArgs(args),
      title:
          '${memoryThemeName(l10n, themeId)} · ${memoryDifficultyLabel(l10n, difficulty)}',
      reviewType: entry.reviewType,
      onPlayAgain: () => ref.read(board.notifier).restart(),
      boardBuilder: (context, session) => _Board(args: args, session: session),
    );
  }
}

class _Board extends ConsumerWidget {
  const _Board({required this.args, required this.session});

  final MemoryArgs args;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(memoryControllerProvider(args));
    final controller = ref.read(memoryControllerProvider(args).notifier);
    return Column(
      children: [
        _StatsBar(session: session, board: state),
        Expanded(child: _CardGrid(cards: state.cards, onTap: controller.flipCard)),
      ],
    );
  }
}

class _StatsBar extends StatelessWidget {
  const _StatsBar({required this.session, required this.board});

  final GameSessionState session;
  final MemoryBoardState board;

  String get _time {
    final m = (session.elapsedSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (session.elapsedSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _Stat(
            label: l10n.setup_memoryMatch_time,
            value: _time,
            icon: Icons.timer_outlined,
            valueKey: const Key('stat-time'),
          ),
          _Stat(
            label: l10n.setup_memoryMatch_matches,
            value: '${board.matches}/${board.totalPairs}',
            icon: Icons.check_circle_outline,
            valueKey: const Key('stat-matches'),
          ),
          _Stat(
            label: l10n.setup_memoryMatch_attempts,
            value: '${session.attempts}',
            icon: Icons.touch_app_outlined,
            valueKey: const Key('stat-attempts'),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({
    required this.label,
    required this.value,
    required this.icon,
    required this.valueKey,
  });

  final String label;
  final String value;
  final IconData icon;
  final Key valueKey;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primary),
        const SizedBox(height: 2),
        Text(value,
            key: valueKey,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _CardGrid extends StatelessWidget {
  const _CardGrid({required this.cards, required this.onTap});

  final List<MemoryCard> cards;
  final void Function(MemoryCard) onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: GridView.builder(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: gridColumnsFor(cards.length),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 0.8,
        ),
        itemCount: cards.length,
        itemBuilder: (_, i) => _CardTile(card: cards[i], onTap: onTap),
      ),
    );
  }
}

class _CardTile extends StatelessWidget {
  const _CardTile({required this.card, required this.onTap});

  final MemoryCard card;
  final void Function(MemoryCard) onTap;

  @override
  Widget build(BuildContext context) {
    final faceUp = card.isFlipped || card.isMatched;
    return GestureDetector(
      key: Key('card-${card.id}'),
      onTap: () => onTap(card),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          gradient: faceUp ? null : AppTheme.brandGradient,
          color: faceUp
              ? (card.isMatched
                  ? Colors.green.shade100
                  : Theme.of(context).colorScheme.surface)
              : null,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: card.isMatched ? Colors.green : Colors.transparent,
            width: 2,
          ),
        ),
        child: Center(
          child: faceUp
              ? FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Text(card.value,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 28)),
                  ),
                )
              : const Icon(Icons.help_outline, color: Colors.white70),
        ),
      ),
    );
  }
}
