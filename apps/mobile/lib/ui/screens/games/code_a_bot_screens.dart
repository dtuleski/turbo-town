import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/challenge_models.dart';
import '../../../api/quest_models.dart';
import '../../../game/code_a_bot/bot_controller.dart';
import '../../../game/code_a_bot/logic.dart';
import '../../../game/framework/challenge_gate.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import 'board_widgets.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

String instructionLabel(AppLocalizations l10n, Instruction i) => switch (i) {
      Instruction.forward => l10n.mobileBoard_botForward,
      Instruction.turnLeft => l10n.mobileBoard_botTurnLeft,
      Instruction.turnRight => l10n.mobileBoard_botTurnRight,
      Instruction.jump => l10n.mobileBoard_botJump,
    };

String instructionIcon(Instruction i) => switch (i) {
      Instruction.forward => '⬆',
      Instruction.turnLeft => '↩',
      Instruction.turnRight => '↪',
      Instruction.jump => '🦘',
    };

Color instructionColor(Instruction i) => switch (i) {
      Instruction.forward => const Color(0xFF10B981),
      Instruction.turnLeft => const Color(0xFF3B82F6),
      Instruction.turnRight => const Color(0xFFA855F7),
      Instruction.jump => const Color(0xFFF59E0B),
    };

class CodeABotSetupScreen extends StatelessWidget {
  const CodeABotSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': '${l10n.mobileBoard_botEasyDesc} · ${l10n.mobileBoard_botEasyFeatures}',
      'medium': '${l10n.mobileBoard_botMediumDesc} · ${l10n.mobileBoard_botMediumFeatures}',
      'hard': '${l10n.mobileBoard_botHardDesc} · ${l10n.mobileBoard_botHardFeatures}',
    };
    return PickerSetupScreen(
      title: gameTitle(l10n, 'code-a-bot') ?? 'Code-a-Bot',
      subtitle: l10n.mobileBoard_botSubtitle,
      notice: l10n.mobileBoard_botHintsEnglishOnly,
      startLabel: l10n.mobileBoard_startBot,
      selectLabel: l10n.mobileBoard_selectLevel,
      groups: [
        SetupGroup('difficulty', l10n.mobileBoard_chooseLevel, [
          for (final d in kQuizDifficulties)
            SetupOption(d, quizDifficultyLabel(l10n, d),
                emoji: quizDifficultyEmoji(d), description: desc[d]),
        ]),
      ],
      buildRoute: (s) => '/code-a-bot/play?difficulty=${s['difficulty']}',
    );
  }
}

/// [challengeDay] plays that day's Daily Challenge levels instead of the
/// difficulty's own.
class CodeABotGameScreen extends StatelessWidget {
  const CodeABotGameScreen({super.key, required this.difficulty, this.questContext, this.challengeDay});

  final String difficulty;
  final QuestContext? questContext;
  final String? challengeDay;

  @override
  Widget build(BuildContext context) {
    final day = challengeDay;
    if (day == null) {
      final args = (difficulty: difficulty, quest: questContext);
      return _BotGame(args: args, sessionArgs: botSessionArgs(args), provider: botControllerProvider(args));
    }
    return ChallengeGate<CodeABotContent>(
      day: day,
      title: gameTitle(AppLocalizations.of(context), 'code-a-bot') ?? 'Code-a-Bot',
      builder: (context, challenge, _) {
        final args = (difficulty: challenge.content.difficulty, quest: null);
        return _BotGame(
          args: args,
          sessionArgs: botSessionArgs(args, challengeDay: challenge.day),
          provider: botChallengeControllerProvider((args: args, challenge: challenge)),
        );
      },
    );
  }
}

typedef _BotProvider = AutoDisposeStateNotifierProvider<BotController, BotState>;

class _BotGame extends ConsumerWidget {
  const _BotGame({required this.args, required this.sessionArgs, required this.provider});

  final BotArgs args;
  final GameSessionArgs sessionArgs;
  final _BotProvider provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: sessionArgs,
      title: gameTitle(l10n, 'code-a-bot') ?? 'Code-a-Bot',
      reviewType: gameById('code-a-bot')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _BotBoard(args: args, provider: provider, session: session),
    );
  }
}

class _BotBoard extends ConsumerWidget {
  const _BotBoard({required this.args, required this.provider, required this.session});

  final BotArgs args;
  final _BotProvider provider;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(provider);
    final ctrl = ref.read(provider.notifier);
    final level = state.level;
    final building = state.phase == BotPhase.building;
    final total = ctrl.totalLevels;
    final lastLevel = state.levelIndex + 1 >= total;
    final failText = switch (state.failKind) {
      FailKind.crack => l10n.mobileBoard_botFellCrack,
      FailKind.crash => l10n.mobileBoard_botCrashed,
      _ => l10n.mobileBoard_botNotReached,
    };

    return LayoutBuilder(builder: (context, box) {
      // Page padding 24, board padding 16, and a 3 px margin around each cell.
      final cell = ((box.maxWidth - 40) / level.cols - 3).clamp(26.0, 52.0).floorToDouble();
      return SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Wrap(
              spacing: 14,
              alignment: WrapAlignment.center,
              children: [
                Text('⏱ ${clockText(session.elapsedSeconds)}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(l10n.mobileBoard_levelOf('${state.levelIndex + 1}', '$total'),
                    key: const Key('bot-level'),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(quizDifficultyLabel(l10n, args.difficulty),
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.info)),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var r = 0; r < level.rows; r++)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (var c = 0; c < level.cols; c++)
                          _BotCell(
                            key: Key('bot-cell-$r-$c'),
                            type: level.grid[r][c],
                            isGoal: level.goal == Position(r, c),
                            hasBot: state.botPos == Position(r, c),
                            dir: state.botDir,
                            size: cell,
                          ),
                      ],
                    ),
                ],
              ),
            ),
            if (state.showHint)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('💡 ${level.hint}', key: const Key('bot-hint-text')),
              ),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(l10n.mobileBoard_yourProgram,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.labelLarge),
                        ),
                        Text(
                          l10n.mobileBoard_blocksUsed(
                              '${state.program.length}', '${level.maxInstructions}'),
                          key: const Key('bot-blocks'),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    if (state.program.isEmpty)
                      Text(l10n.mobileBoard_programEmpty,
                          style: Theme.of(context).textTheme.bodySmall)
                    else
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (var i = 0; i < state.program.length; i++)
                            InkWell(
                              key: Key('bot-step-$i'),
                              onTap: building ? () => ctrl.removeAt(i) : null,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                width: 44,
                                height: 44,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: instructionColor(state.program[i]),
                                  borderRadius: BorderRadius.circular(10),
                                  border: state.animStep == i && !building
                                      ? Border.all(color: Colors.black, width: 3)
                                      : null,
                                ),
                                child: Text(instructionIcon(state.program[i]),
                                    style: const TextStyle(fontSize: 20, color: Colors.white)),
                              ),
                            ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final i in Instruction.values)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: Semantics(
                        label: instructionLabel(l10n, i),
                        button: true,
                        child: InkWell(
                          key: Key('bot-add-${i.name}'),
                          onTap: building ? () => ctrl.add(i) : null,
                          borderRadius: BorderRadius.circular(12),
                          child: Opacity(
                            opacity: building ? 1 : 0.5,
                            child: Container(
                              height: 64,
                              decoration: BoxDecoration(
                                color: instructionColor(i),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(instructionIcon(i),
                                      style: const TextStyle(fontSize: 22, color: Colors.white)),
                                  Text(instructionLabel(l10n, i),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: FilledButton(
                    key: const Key('bot-run'),
                    onPressed: building && state.program.isNotEmpty ? ctrl.run : null,
                    child: Text(state.phase == BotPhase.running
                        ? l10n.mobileBoard_botRunning
                        : '▶ ${l10n.mobileBoard_botRun}'),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  flex: 2,
                  child: OutlinedButton(
                    key: const Key('bot-clear'),
                    style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 4)),
                    onPressed: building && state.program.isNotEmpty ? ctrl.clear : null,
                    child: Text(l10n.mobileBoard_botClear, maxLines: 1),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  flex: 2,
                  child: OutlinedButton(
                    key: const Key('bot-hint'),
                    style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 4)),
                    onPressed: ctrl.toggleHint,
                    child: Text('💡 ${l10n.mobileBoard_botHint}', maxLines: 1),
                  ),
                ),
              ],
            ),
            if (state.phase == BotPhase.success) ...[
              const SizedBox(height: 12),
              StatusPill(l10n.mobileBoard_botSuccess,
                  key: const Key('bot-success'), color: AppTheme.success),
              const SizedBox(height: 8),
              FilledButton(
                key: const Key('bot-next'),
                onPressed: ctrl.nextLevel,
                child: Text(lastLevel ? l10n.mobileBoard_botFinish : l10n.mobileBoard_botNextLevel),
              ),
            ],
            if (state.phase == BotPhase.fail) ...[
              const SizedBox(height: 12),
              StatusPill(failText, key: const Key('bot-fail'), color: AppTheme.error),
              const SizedBox(height: 8),
              FilledButton(
                key: const Key('bot-retry'),
                onPressed: ctrl.retry,
                child: Text(l10n.mobileBoard_botRetry),
              ),
            ],
          ],
        ),
      );
    });
  }
}

class _BotCell extends StatelessWidget {
  const _BotCell({
    super.key,
    required this.type,
    required this.isGoal,
    required this.hasBot,
    required this.dir,
    required this.size,
  });

  final CellType type;
  final bool isGoal;
  final bool hasBot;
  final Direction dir;
  final double size;

  @override
  Widget build(BuildContext context) {
    var bg = const Color(0x80334155);
    var content = '';
    switch (type) {
      case CellType.wall:
        bg = const Color(0xFF64748B);
        content = '🧱';
      case CellType.crack:
        bg = const Color(0x99450A0A);
        content = '🕳';
      case CellType.ice:
        bg = const Color(0x6622D3EE);
        content = '🧊';
      default:
        break;
    }
    if (isGoal && !hasBot) content = '⚡';
    if (hasBot) content = '🤖';
    return Container(
      width: size,
      height: size,
      margin: const EdgeInsets.all(1.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white12),
      ),
      alignment: Alignment.center,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Text(content, style: TextStyle(fontSize: size * 0.5)),
          if (hasBot)
            Positioned(
              top: -size * 0.12,
              right: -size * 0.12,
              child: Container(
                width: size * 0.38,
                height: size * 0.38,
                alignment: Alignment.center,
                decoration: const BoxDecoration(color: Color(0xFF06B6D4), shape: BoxShape.circle),
                child: Text(kDirArrow[dir]!,
                    style: TextStyle(fontSize: size * 0.2, color: Colors.white)),
              ),
            ),
        ],
      ),
    );
  }
}
