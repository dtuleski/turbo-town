import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/quest_models.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/sequence_memory/logic.dart';
import '../../../game/sequence_memory/sequence_controller.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import 'board_widgets.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

class SequenceSetupScreen extends StatelessWidget {
  const SequenceSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return PickerSetupScreen(
      title: gameTitle(l10n, 'sequence-memory') ?? 'Sequence Memory',
      subtitle: l10n.mobileBoard_seqSubtitle,
      startLabel: '${l10n.game_startGame} 🏎',
      selectLabel: l10n.game_selectDifficulty,
      groups: [
        SetupGroup('theme', l10n.mobileBoard_chooseTheme, [
          SetupOption('f1-2025', kSeqThemeNames['f1-2025']!, emoji: '🏎'),
          SetupOption('f1-2026', kSeqThemeNames['f1-2026']!, emoji: '🏁'),
        ]),
        SetupGroup('difficulty', l10n.game_chooseDifficulty, [
          for (final d in kSeqDifficulties)
            SetupOption(
              d.id,
              quizDifficultyLabel(l10n, d.id),
              emoji: quizDifficultyEmoji(d.id),
              description: l10n.mobileBoard_seqDesc('${d.cards}', '${d.viewTime}'),
            ),
        ]),
      ],
      buildRoute: (s) => '/sequence-memory/play?difficulty=${s['difficulty']}&theme=${s['theme']}',
    );
  }
}

class SequenceGameScreen extends ConsumerWidget {
  const SequenceGameScreen({
    super.key,
    required this.difficulty,
    required this.theme,
    this.questContext,
  });

  final String difficulty;
  final String theme;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, theme: theme, quest: questContext);
    final provider = sequenceControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: sequenceSessionArgs(args),
      title: gameTitle(l10n, 'sequence-memory') ?? 'Sequence Memory',
      reviewType: gameById('sequence-memory')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _SequenceBoard(args: args, session: session),
    );
  }
}

class _SequenceBoard extends ConsumerWidget {
  const _SequenceBoard({required this.args, required this.session});

  final SequenceArgs args;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(sequenceControllerProvider(args));
    final ctrl = ref.read(sequenceControllerProvider(args).notifier);
    final cfg = seqDifficulty(args.difficulty);
    final themeName = kSeqThemeNames[seqThemeId(args.theme)]!;
    final revealed = state.revealed;

    Widget pill() => switch (state.phase) {
          SeqPhase.showing => StatusPill(
              l10n.mobileBoard_memorize('${state.countdown}'),
              key: const Key('seq-pill'),
              color: const Color(0xFFFACC15),
            ),
          SeqPhase.answering => StatusPill(
              state.round == 0
                  ? l10n.mobileBoard_tapCardYouSaw
                  : l10n.mobileBoard_tapCardInOrder(
                      '${state.answerIndex + 1}', '${state.round + 1}'),
              key: const Key('seq-pill'),
              color: AppTheme.success,
            ),
          SeqPhase.correct => StatusPill(
              l10n.mobileBoard_correctNextRound,
              key: const Key('seq-pill'),
              color: AppTheme.success,
            ),
          SeqPhase.gameOver => const SizedBox.shrink(),
        };

    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 6,
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text('⏱ ${clockText(session.elapsedSeconds)}',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(heartsText(state.lives, kSeqMaxLives), key: const Key('seq-lives')),
              Text(
                l10n.mobileBoard_roundOf(
                    '${(state.round + 1).clamp(1, cfg.cards)}', '${cfg.cards}'),
                key: const Key('seq-round'),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 8),
          pill(),
          const SizedBox(height: 8),
          if (state.phase == SeqPhase.gameOver)
            GameOverCard(
              title: l10n.mobileBoard_gameOver,
              lines: [
                l10n.mobileBoard_roundsCompleted('${state.correctRounds}', '${cfg.cards}'),
                l10n.mobileBoard_mistakesCount('${state.mistakes}'),
              ],
              seeScoreLabel: l10n.mobileBoard_seeScore,
              onSeeScore: ctrl.seeScore,
              tryAgainLabel: l10n.mobileBoard_tryAgain,
              onTryAgain: () => context.canPop() ? context.pop() : context.go('/sequence-memory/setup'),
            ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Text(l10n.mobileBoard_challengeSequence,
                      style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    alignment: WrapAlignment.center,
                    children: [
                      for (var i = 0; i < state.challenge.length; i++)
                        _ChallengeCard(
                          key: Key('seq-challenge-$i'),
                          card: state.challenge[i],
                          revealed: revealed.contains(state.challenge[i].id),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Text(l10n.mobileBoard_allDrivers(themeName),
                      style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 8),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 6,
                    crossAxisSpacing: 6,
                    childAspectRatio: 2.6,
                    children: [
                      for (final d in state.bank)
                        _BankCard(
                          key: Key('seq-bank-${d.id}'),
                          driver: d,
                          enabled: state.phase == SeqPhase.answering,
                          wrong: state.wrongFlash == d.id,
                          correct: state.correctFlash == d.id,
                          onTap: () => ctrl.tap(d),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChallengeCard extends StatelessWidget {
  const _ChallengeCard({super.key, required this.card, required this.revealed});

  final DriverCard card;
  final bool revealed;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      width: 60,
      height: 76,
      decoration: BoxDecoration(
        color: revealed ? card.color : const Color(0xFF334155),
        borderRadius: BorderRadius.circular(12),
        border: revealed ? null : Border.all(color: const Color(0xFF64748B), width: 2),
      ),
      alignment: Alignment.center,
      child: revealed
          ? Padding(
              padding: const EdgeInsets.all(2),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(card.name,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                  Text('#${card.number}',
                      style: const TextStyle(color: Colors.white70, fontSize: 10)),
                ],
              ),
            )
          : const Text('🏎', style: TextStyle(fontSize: 24)),
    );
  }
}

class _BankCard extends StatelessWidget {
  const _BankCard({
    super.key,
    required this.driver,
    required this.enabled,
    required this.wrong,
    required this.correct,
    required this.onTap,
  });

  final DriverCard driver;
  final bool enabled;
  final bool wrong;
  final bool correct;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled || wrong || correct ? 1 : 0.7,
      child: Material(
        color: driver.color,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: wrong
              ? const BorderSide(color: Color(0xFFF87171), width: 4)
              : correct
                  ? const BorderSide(color: Color(0xFF4ADE80), width: 4)
                  : BorderSide.none,
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: enabled ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(driver.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
                Text('${driver.team} · #${driver.number}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white70, fontSize: 10)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
