import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/quest_models.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/pattern_recall/logic.dart';
import '../../../game/pattern_recall/pattern_controller.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import 'board_widgets.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

String patternThemeName(AppLocalizations l10n, String id) => switch (id) {
      'animals' => l10n.patternRecall_themes_animals,
      'musical-notes' => l10n.patternRecall_themes_musicalNotes,
      'emojis' => l10n.patternRecall_themes_emojis,
      _ => l10n.patternRecall_themes_colors,
    };

String patternItemName(AppLocalizations l10n, String id) => switch (id) {
      'red' => l10n.patternRecall_items_red,
      'blue' => l10n.patternRecall_items_blue,
      'green' => l10n.patternRecall_items_green,
      'yellow' => l10n.patternRecall_items_yellow,
      'purple' => l10n.patternRecall_items_purple,
      'orange' => l10n.patternRecall_items_orange,
      'dog' => l10n.patternRecall_items_dog,
      'cat' => l10n.patternRecall_items_cat,
      'rabbit' => l10n.patternRecall_items_rabbit,
      'bear' => l10n.patternRecall_items_bear,
      'fox' => l10n.patternRecall_items_fox,
      'penguin' => l10n.patternRecall_items_penguin,
      'quarter' => l10n.patternRecall_items_quarterNote,
      'eighth' => l10n.patternRecall_items_eighthNote,
      'trumpet' => l10n.patternRecall_items_trumpet,
      'guitar' => l10n.patternRecall_items_guitar,
      'drum' => l10n.patternRecall_items_drum,
      'piano' => l10n.patternRecall_items_piano,
      'smile' => l10n.patternRecall_items_smile,
      'heart' => l10n.patternRecall_items_heart,
      'star' => l10n.patternRecall_items_star,
      'fire' => l10n.patternRecall_items_fire,
      'rainbow' => l10n.patternRecall_items_rainbow,
      _ => l10n.patternRecall_items_rocket,
    };

class PatternSetupScreen extends StatelessWidget {
  const PatternSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': l10n.patternRecall_difficulty_easyDesc,
      'medium': l10n.patternRecall_difficulty_mediumDesc,
      'hard': l10n.patternRecall_difficulty_hardDesc,
    };
    return PickerSetupScreen(
      title: gameTitle(l10n, 'pattern-recall') ?? l10n.patternRecall_setup_title,
      subtitle: l10n.patternRecall_setup_subtitle,
      startLabel: l10n.patternRecall_setup_startGame,
      selectLabel: l10n.patternRecall_setup_selectBoth,
      groups: [
        SetupGroup('theme', l10n.patternRecall_setup_chooseTheme, [
          for (final t in kPatternThemes)
            SetupOption(t.id, patternThemeName(l10n, t.id), emoji: t.icon),
        ]),
        SetupGroup('difficulty', l10n.patternRecall_setup_chooseDifficulty, [
          for (final d in kQuizDifficulties)
            SetupOption(d, quizDifficultyLabel(l10n, d),
                emoji: quizDifficultyEmoji(d), description: desc[d]),
        ]),
      ],
      buildRoute: (s) => '/pattern-recall/play?theme=${s['theme']}&difficulty=${s['difficulty']}',
    );
  }
}

class PatternGameScreen extends ConsumerWidget {
  const PatternGameScreen({
    super.key,
    required this.theme,
    required this.difficulty,
    this.questContext,
  });

  final String theme;
  final String difficulty;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (theme: theme, difficulty: difficulty, quest: questContext);
    final provider = patternControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: patternSessionArgs(args),
      title: gameTitle(l10n, 'pattern-recall') ?? l10n.patternRecall_setup_title,
      reviewType: gameById('pattern-recall')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _PatternBoard(args: args, session: session),
    );
  }
}

class _PatternBoard extends ConsumerWidget {
  const _PatternBoard({required this.args, required this.session});

  final PatternArgs args;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(patternControllerProvider(args));
    final ctrl = ref.read(patternControllerProvider(args).notifier);
    final lit = state.litItem;

    final status = switch (state.phase) {
      PatternPhase.playback => (l10n.patternRecall_game_watchPattern, AppTheme.info),
      PatternPhase.input => (l10n.patternRecall_game_yourTurn, AppTheme.success),
      PatternPhase.correct => (
          '${l10n.patternRecall_game_correct} ${l10n.patternRecall_game_nextRound}',
          AppTheme.success
        ),
      PatternPhase.wrong => (l10n.patternRecall_game_tryAgain, AppTheme.error),
      PatternPhase.gameOver => ('', AppTheme.error),
    };

    return LayoutBuilder(builder: (context, box) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Wrap(
              spacing: 12,
              runSpacing: 6,
              alignment: WrapAlignment.center,
              children: [
                Text('⏱ ${clockText(session.elapsedSeconds)}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(heartsText(state.lives, kPatternMaxLives), key: const Key('pattern-lives')),
                Text(l10n.patternRecall_game_round('${state.round}'),
                    key: const Key('pattern-round'),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 10),
            if (state.phase != PatternPhase.gameOver)
              StatusPill(status.$1, key: const Key('pattern-status'), color: status.$2),
            const SizedBox(height: 12),
            if (state.phase == PatternPhase.gameOver)
              GameOverCard(
                title: l10n.patternRecall_game_gameOver,
                lines: [l10n.patternRecall_game_roundsCompleted('${state.round - 1}')],
                seeScoreLabel: l10n.patternRecall_game_seeScore,
                onSeeScore: ctrl.seeScore,
                tryAgainLabel: l10n.patternRecall_game_tryAgain,
                onTryAgain: () =>
                    context.canPop() ? context.pop() : context.go('/pattern-recall/setup'),
              )
            else
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.25,
                children: [
                  for (var i = 0; i < state.items.length; i++)
                    _PatternTile(
                      key: Key('pattern-tile-$i'),
                      item: state.items[i],
                      label: patternItemName(l10n, state.items[i].id),
                      lit: lit == i,
                      feedback: state.feedbackItem == i ? state.feedback : null,
                      onTap: () => ctrl.tap(i),
                    ),
                ],
              ),
          ],
        ),
      );
    });
  }
}

class _PatternTile extends StatelessWidget {
  const _PatternTile({
    super.key,
    required this.item,
    required this.label,
    required this.lit,
    required this.feedback,
    required this.onTap,
  });

  final PatternItem item;
  final String label;
  final bool lit;
  final PatternFeedback? feedback;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final border = feedback == PatternFeedback.correct
        ? AppTheme.success
        : feedback == PatternFeedback.wrong
            ? AppTheme.error
            : lit
                ? const Color(0xFFFACC15)
                : Colors.transparent;
    return Semantics(
      label: label,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          decoration: BoxDecoration(
            color: item.color ?? const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: border, width: 5),
            boxShadow: lit
                ? [BoxShadow(color: (item.color ?? const Color(0xFFFACC15)).withValues(alpha: 0.7), blurRadius: 18)]
                : null,
          ),
          alignment: Alignment.center,
          child: item.color != null
              ? null
              : Text(item.visual, style: const TextStyle(fontSize: 52)),
        ),
      ),
    );
  }
}
