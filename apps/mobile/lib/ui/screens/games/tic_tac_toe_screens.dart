import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/quest_models.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/tic_tac_toe/logic.dart';
import '../../../game/tic_tac_toe/ttt_controller.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/choice_tile.dart';
import 'board_widgets.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

class TicTacToeSetupScreen extends StatelessWidget {
  const TicTacToeSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': '${l10n.setup_ticTacToe_randomAI} · ${l10n.setup_ticTacToe_greatForBeginners}',
      'medium': '${l10n.setup_ticTacToe_smartAI} · ${l10n.setup_ticTacToe_blocksYourWins}',
      'hard': '${l10n.setup_ticTacToe_perfectAI} · ${l10n.setup_ticTacToe_impossibleToBeat}',
    };
    return PickerSetupScreen(
      title: gameTitle(l10n, 'tic-tac-toe') ?? l10n.setup_ticTacToe_title,
      subtitle: l10n.setup_ticTacToe_subtitle,
      notice: l10n.setup_ticTacToe_youAreX,
      startLabel: '${l10n.game_startGame} ❌⭕',
      selectLabel: l10n.game_selectDifficulty,
      groups: [
        SetupGroup('difficulty', l10n.game_chooseAIDifficulty, [
          for (final d in kQuizDifficulties)
            SetupOption(d, quizDifficultyLabel(l10n, d),
                emoji: quizDifficultyEmoji(d), description: desc[d]),
        ]),
      ],
      buildRoute: (s) => '/tic-tac-toe/play?difficulty=${s['difficulty']}',
      footer: [
        const SizedBox(height: 4),
        Text(l10n.setup_ticTacToe_scoring,
            textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 16),
        Center(child: Text(l10n.mobileBoard_or, style: Theme.of(context).textTheme.labelLarge)),
        const SizedBox(height: 8),
        Text(l10n.mobileBoard_localMultiplayer, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        ChoiceTile(
          key: const Key('ttt-two-player'),
          emoji: '👥',
          label: l10n.mobileBoard_twoPlayer,
          description: '${l10n.mobileBoard_twoPlayerDesc} · ${l10n.mobileBoard_twoPlayerDetail}',
          selected: false,
          onTap: () => context.push('/tic-tac-toe/play?mode=two-player'),
        ),
      ],
    );
  }
}

class TicTacToeGameScreen extends ConsumerWidget {
  const TicTacToeGameScreen({super.key, required this.difficulty, this.questContext});

  final String difficulty;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, quest: questContext);
    final provider = tttControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: tttSessionArgs(args),
      title: gameTitle(l10n, 'tic-tac-toe') ?? l10n.setup_ticTacToe_title,
      reviewType: gameById('tic-tac-toe')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _TttBoard(args: args, session: session),
    );
  }
}

class _Tally extends StatelessWidget {
  const _Tally(this.value, this.label, this.color, {super.key});

  final int value;
  final String label;
  final Color color;

  /// Takes an equal share of the row, so long labels wrap instead of overflowing.
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          children: [
            Text('$value',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: color)),
            Text(label,
                textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      );
}

/// 3x3 board of tappable cells.
class _Cells extends StatelessWidget {
  const _Cells({
    required this.board,
    required this.winLine,
    required this.enabled,
    required this.onTap,
  });

  final TttBoard board;
  final List<int>? winLine;
  final bool enabled;
  final void Function(int) onTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, box) {
      final side = (box.maxWidth).clamp(0.0, 360.0);
      return Center(
        child: SizedBox(
          width: side,
          height: side,
          child: GridView.count(
            crossAxisCount: 3,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              for (var i = 0; i < 9; i++)
                GestureDetector(
                  key: Key('ttt-cell-$i'),
                  onTap: enabled ? () => onTap(i) : null,
                  child: Container(
                    decoration: BoxDecoration(
                      color: winLine?.contains(i) == true
                          ? const Color(0xFFBBF7D0)
                          : const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      board[i] ?? '',
                      style: TextStyle(
                        fontSize: side / 5,
                        fontWeight: FontWeight.w900,
                        color: board[i] == 'X' ? AppTheme.primary : AppTheme.pink,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    });
  }
}

class _TttBoard extends ConsumerWidget {
  const _TttBoard({required this.args, required this.session});

  final TttArgs args;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(tttControllerProvider(args));
    final ctrl = ref.read(tttControllerProvider(args).notifier);
    final banner = switch (state.result) {
      RoundResult.win => (l10n.gameplay_youWin, AppTheme.success),
      RoundResult.draw => (l10n.gameplay_draw, AppTheme.warning),
      RoundResult.lose => (l10n.gameplay_aiWins, AppTheme.error),
      null => (state.playerTurn ? l10n.gameplay_yourTurn : l10n.gameplay_aiThinking, AppTheme.info),
    };
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Wrap(
            spacing: 14,
            alignment: WrapAlignment.center,
            children: [
              Text('⏱ ${clockText(session.elapsedSeconds)}',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(
                l10n.mobileBoard_roundOf('${state.round + 1}', '$kTttRoundsPerGame'),
                key: const Key('ttt-round'),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              Text('${l10n.game_score}: ${state.score}',
                  key: const Key('ttt-score'), style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _Tally(state.wins, l10n.gameplay_wins, AppTheme.success, key: const Key('ttt-wins')),
              _Tally(state.draws, l10n.gameplay_draws, AppTheme.warning, key: const Key('ttt-draws')),
              _Tally(state.losses, l10n.gameplay_losses, AppTheme.error, key: const Key('ttt-losses')),
            ],
          ),
          const SizedBox(height: 12),
          StatusPill(banner.$1, key: const Key('ttt-status'), color: banner.$2),
          const SizedBox(height: 16),
          _Cells(
            board: state.board,
            winLine: state.winLine,
            enabled: state.playerTurn && !state.roundOver,
            onTap: ctrl.tapCell,
          ),
          if (state.roundOver) ...[
            const SizedBox(height: 16),
            FilledButton(
              key: const Key('ttt-next'),
              onPressed: ctrl.next,
              child: Text(state.lastRound ? l10n.game_seeResults : l10n.game_nextRound),
            ),
          ],
        ],
      ),
    );
  }
}

/// Two players on one device. Nothing is saved or scored.
class TicTacToeTwoPlayerScreen extends ConsumerWidget {
  const TicTacToeTwoPlayerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(twoPlayerControllerProvider);
    final ctrl = ref.read(twoPlayerControllerProvider.notifier);
    final status = switch (state.result) {
      null => l10n.mobileBoard_turnOf(state.active),
      'draw' => l10n.mobileBoard_itsADraw,
      final w => l10n.mobileBoard_playerWins(w),
    };
    return Scaffold(
      appBar: AppBar(title: Text('${l10n.mobileBoard_twoPlayer} · ${l10n.setup_ticTacToe_title}')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                children: [
                  _Tally(state.p1Wins, l10n.mobileBoard_player1, AppTheme.primary,
                      key: const Key('ttt2-p1')),
                  _Tally(state.p2Wins, l10n.mobileBoard_player2, AppTheme.pink,
                      key: const Key('ttt2-p2')),
                  _Tally(state.ties, l10n.mobileBoard_ties, AppTheme.warning,
                      key: const Key('ttt2-ties')),
                ],
              ),
              const SizedBox(height: 12),
              StatusPill(status, key: const Key('ttt2-status')),
              const SizedBox(height: 16),
              _Cells(
                board: state.board,
                winLine: state.winLine,
                enabled: state.result == null,
                onTap: ctrl.tapCell,
              ),
              if (state.result != null) ...[
                const SizedBox(height: 16),
                FilledButton(
                  key: const Key('ttt2-new-round'),
                  onPressed: ctrl.newRound,
                  child: Text(l10n.mobileBoard_newRound),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
