import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/constants.dart';
import '../../game/card.dart';
import '../../game/game_controller.dart';
import '../../game/game_logic.dart';
import '../theme.dart';

class MemoryGameScreen extends ConsumerStatefulWidget {
  const MemoryGameScreen({
    super.key,
    required this.themeId,
    required this.difficulty,
  });

  final String themeId;
  final Difficulty difficulty;

  @override
  ConsumerState<MemoryGameScreen> createState() => _MemoryGameScreenState();
}

class _MemoryGameScreenState extends ConsumerState<MemoryGameScreen> {
  late final ({String themeId, Difficulty difficulty}) _key =
      (themeId: widget.themeId, difficulty: widget.difficulty);

  @override
  void initState() {
    super.initState();
    // Kick off the backend startGame once the first frame is laid out.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(gameControllerProvider(_key).notifier).start();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(gameControllerProvider(_key));
    final controller = ref.read(gameControllerProvider(_key).notifier);

    final themeName = kGameThemes
        .firstWhere((t) => t.id == widget.themeId,
            orElse: () => kGameThemes.first)
        .name;

    return Scaffold(
      appBar: AppBar(
        title: Text('$themeName · ${widget.difficulty.label}'),
      ),
      body: SafeArea(child: _body(context, state, controller)),
    );
  }

  Widget _body(
    BuildContext context,
    GameSessionState state,
    GameController controller,
  ) {
    // Blocked by paywall or rate limit before play began.
    if (state.status == GameStatus.notStarted && state.error != null) {
      return _BlockedView(
        message: state.error!,
        isPaywall: controller.paywallHit,
        onBack: () => context.pop(),
      );
    }

    if (state.status == GameStatus.notStarted && state.isBusy) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.status == GameStatus.completed) {
      return _ResultView(
        state: state,
        onPlayAgain: () {
          controller.restart();
          controller.start();
        },
        onHome: () => context.go('/'),
      );
    }

    return Column(
      children: [
        _StatsBar(state: state),
        Expanded(child: _CardGrid(state: state, onTap: controller.flipCard)),
        if (state.isBusy)
          const Padding(
            padding: EdgeInsets.all(12),
            child: LinearProgressIndicator(),
          ),
      ],
    );
  }
}

class _StatsBar extends StatelessWidget {
  const _StatsBar({required this.state});
  final GameSessionState state;

  String get _time {
    final m = (state.elapsedSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (state.elapsedSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _Stat(label: 'Time', value: _time, icon: Icons.timer_outlined),
          _Stat(
              label: 'Matches',
              value: '${state.matches}/${state.totalPairs}',
              icon: Icons.check_circle_outline),
          _Stat(
              label: 'Attempts',
              value: '${state.attempts}',
              icon: Icons.touch_app_outlined),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.icon});
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primary),
        const SizedBox(height: 2),
        Text(value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _CardGrid extends StatelessWidget {
  const _CardGrid({required this.state, required this.onTap});
  final GameSessionState state;
  final void Function(MemoryCard) onTap;

  @override
  Widget build(BuildContext context) {
    final columns = gridColumnsFor(state.cards.length);
    return Padding(
      padding: const EdgeInsets.all(12),
      child: GridView.builder(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 0.8,
        ),
        itemCount: state.cards.length,
        itemBuilder: (_, i) => _CardTile(card: state.cards[i], onTap: onTap),
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

class _ResultView extends StatelessWidget {
  const _ResultView({
    required this.state,
    required this.onPlayAgain,
    required this.onHome,
  });

  final GameSessionState state;
  final VoidCallback onPlayAgain;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🎉', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 8),
            Text('Complete!',
                style: Theme.of(context)
                    .textTheme
                    .headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            _ResultRow(label: 'Score', value: '${state.score ?? 0}'),
            _ResultRow(
                label: 'Time',
                value: '${state.elapsedSeconds}s'),
            _ResultRow(label: 'Attempts', value: '${state.attempts}'),
            if (state.leaderboardRank != null)
              _ResultRow(
                  label: 'Leaderboard rank', value: '#${state.leaderboardRank}'),
            const SizedBox(height: 24),
            FilledButton(onPressed: onPlayAgain, child: const Text('Play again')),
            const SizedBox(height: 8),
            TextButton(onPressed: onHome, child: const Text('Back to home')),
          ],
        ),
      ),
    );
  }
}

class _ResultRow extends StatelessWidget {
  const _ResultRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyLarge),
          Text(value,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _BlockedView extends StatelessWidget {
  const _BlockedView({
    required this.message,
    required this.isPaywall,
    required this.onBack,
  });

  final String message;
  final bool isPaywall;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(isPaywall ? '🔒' : '⏳', style: const TextStyle(fontSize: 56)),
            const SizedBox(height: 12),
            Text(isPaywall ? 'Subscription required' : 'Limit reached',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(onPressed: onBack, child: const Text('Go back')),
          ],
        ),
      ),
    );
  }
}
