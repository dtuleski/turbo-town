import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/gen/app_localizations.dart';
import '../../quest/quest_launch.dart';
import 'blocked_view.dart';
import 'exit_dialog.dart';
import 'game_result_screen.dart';
import 'game_session.dart';

/// Page frame for a playing game. It starts the round, then shows the right
/// thing for each phase: spinner, blocked view, the game board, pause screen,
/// failure or the result page. The game supplies only the board.
class GameSessionFrame extends ConsumerStatefulWidget {
  const GameSessionFrame({
    super.key,
    required this.args,
    required this.title,
    required this.reviewType,
    required this.boardBuilder,
    required this.onPlayAgain,
    this.autoStart = true,
  });

  final GameSessionArgs args;
  final String title;
  final String reviewType;

  /// Builds the game board while the round is playing, paused or completing.
  final Widget Function(BuildContext context, GameSessionState session) boardBuilder;

  /// Resets the game's own state (new cards...) before a new round starts.
  final VoidCallback onPlayAgain;

  final bool autoStart;

  @override
  ConsumerState<GameSessionFrame> createState() => _GameSessionFrameState();
}

class _GameSessionFrameState extends ConsumerState<GameSessionFrame> {
  @override
  void initState() {
    super.initState();
    if (widget.autoStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _session.start();
      });
    }
  }

  GameSessionController get _session =>
      ref.read(gameSessionProvider(widget.args).notifier);

  void _playAgain() {
    widget.onPlayAgain();
    _session
      ..reset()
      ..start();
  }

  void _backToMap() => context.go('/quest-map');

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ref.watch(gameSessionProvider(widget.args));
    final quest = widget.args.questContext != null;

    // After a blocked quest start the player returns to the map, as on web.
    ref.listen(gameSessionProvider(widget.args), (prev, next) {
      if (next.phase == SessionPhase.blocked &&
          next.blockReason == BlockReason.questFailed) {
        context.go('/quest-map?startFailed=quest');
      }
    });

    final body = _body(context, l10n, session, quest);
    final inRound = session.isActive;
    return PopScope(
      canPop: !inRound,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final leave = await confirmLeaveGame(context);
        if (leave && context.mounted) context.pop();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.title),
          actions: [
            if (session.phase == SessionPhase.playing)
              IconButton(
                key: const Key('game-pause'),
                tooltip: l10n.setup_memoryMatch_pause,
                icon: const Icon(Icons.pause_circle_outline),
                onPressed: _session.pause,
              ),
          ],
        ),
        body: SafeArea(child: body),
      ),
    );
  }

  Widget _body(
    BuildContext context,
    AppLocalizations l10n,
    GameSessionState session,
    bool quest,
  ) {
    switch (session.phase) {
      case SessionPhase.idle:
      case SessionPhase.starting:
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 12),
              Text(l10n.mobileGame_starting),
            ],
          ),
        );
      case SessionPhase.blocked:
        return BlockedView(
          reason: session.blockReason ?? BlockReason.rateLimited,
          onBack: () => context.canPop() ? context.pop() : context.go('/'),
        );
      case SessionPhase.paused:
        return _PausedView(
          onResume: _session.resume,
          onLeave: () => context.canPop() ? context.pop() : context.go('/'),
        );
      case SessionPhase.failed:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FilledButton(
                  onPressed: _playAgain,
                  child: Text(l10n.game_playAgain),
                ),
                TextButton(
                  onPressed: () => context.go('/'),
                  child: Text(l10n.mobileGame_backToHub),
                ),
              ],
            ),
          ),
        );
      case SessionPhase.completed:
        final result = session.result;
        if (result == null) return const SizedBox.shrink();
        final nextLeg = nextLegPath(result.quest);
        return GameResultScreen(
          result: result,
          reviewType: widget.reviewType,
          onPlayAgain: _playAgain,
          onHome: () => context.go('/'),
          onBackToMap: quest || result.quest != null ? _backToMap : null,
          onNextLeg: nextLeg == null ? null : () => context.pushReplacement(nextLeg),
        );
      case SessionPhase.playing:
      case SessionPhase.completing:
        return Stack(
          children: [
            widget.boardBuilder(context, session),
            if (session.phase == SessionPhase.completing)
              const Align(
                alignment: Alignment.bottomCenter,
                child: LinearProgressIndicator(),
              ),
          ],
        );
    }
  }
}

class _PausedView extends StatelessWidget {
  const _PausedView({required this.onResume, required this.onLeave});

  final VoidCallback onResume;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('⏸', style: TextStyle(fontSize: 56)),
            const SizedBox(height: 8),
            Text(
              l10n.setup_memoryMatch_gamePaused,
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 24),
            FilledButton(
              key: const Key('game-resume'),
              onPressed: onResume,
              child: Text(l10n.setup_memoryMatch_resume),
            ),
            TextButton(
              onPressed: () async {
                if (await confirmLeaveGame(context) && context.mounted) onLeave();
              },
              child: Text(l10n.mobileGame_leave),
            ),
          ],
        ),
      ),
    );
  }
}
