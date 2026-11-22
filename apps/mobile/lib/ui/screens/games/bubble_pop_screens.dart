import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/quest_models.dart';
import '../../../game/bubble_pop/bubble_controller.dart';
import '../../../game/bubble_pop/logic.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import 'board_widgets.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

class BubblePopSetupScreen extends StatelessWidget {
  const BubblePopSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': l10n.mobileBoard_bubbleEasyDesc,
      'medium': l10n.mobileBoard_bubbleMediumDesc,
      'hard': l10n.mobileBoard_bubbleHardDesc,
    };
    return PickerSetupScreen(
      title: gameTitle(l10n, 'bubble-pop') ?? 'Bubble Pop',
      subtitle: l10n.mobileBoard_bubbleSubtitle,
      notice: l10n.mobileBoard_wordsEnglishOnly,
      startLabel: l10n.mobileBoard_startBubble,
      selectLabel: l10n.mobileBoard_selectLevel,
      groups: [
        SetupGroup('difficulty', l10n.mobileBoard_chooseLevel, [
          for (final d in kQuizDifficulties)
            SetupOption(d, quizDifficultyLabel(l10n, d),
                emoji: quizDifficultyEmoji(d), description: desc[d]),
        ]),
      ],
      buildRoute: (s) => '/bubble-pop/play?difficulty=${s['difficulty']}',
    );
  }
}

class BubblePopGameScreen extends ConsumerWidget {
  const BubblePopGameScreen({super.key, required this.difficulty, this.questContext});

  final String difficulty;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, quest: questContext);
    final provider = bubbleControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: bubbleSessionArgs(args),
      title: gameTitle(l10n, 'bubble-pop') ?? 'Bubble Pop',
      reviewType: gameById('bubble-pop')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _BubbleBoard(args: args, session: session),
    );
  }
}

class _BubbleBoard extends ConsumerStatefulWidget {
  const _BubbleBoard({required this.args, required this.session});

  final BubbleArgs args;
  final GameSessionState session;

  @override
  ConsumerState<_BubbleBoard> createState() => _BubbleBoardState();
}

class _BubbleBoardState extends ConsumerState<_BubbleBoard>
    with SingleTickerProviderStateMixin {
  /// Drives the gentle float of every bubble (web: 4 px, 2-2.5 s).
  late final AnimationController _float =
      AnimationController(vsync: this, duration: const Duration(seconds: 10))..repeat();

  @override
  void dispose() {
    _float.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(bubbleControllerProvider(widget.args));
    final ctrl = ref.read(bubbleControllerProvider(widget.args).notifier);
    final word = state.word;
    final paused = widget.session.phase == SessionPhase.paused;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Wrap(
            spacing: 12,
            alignment: WrapAlignment.center,
            children: [
              Text('⏱ ${clockText(widget.session.elapsedSeconds)}',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(heartsText(state.lives, kBubbleMaxLives), key: const Key('bubble-lives')),
              Text(
                l10n.mobileBoard_roundOf('${state.round + 1}', '$kBubbleRounds'),
                key: const Key('bubble-round'),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Text(word.emoji, style: const TextStyle(fontSize: 44)),
                  Text(word.hint,
                      key: const Key('bubble-hint'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    alignment: WrapAlignment.center,
                    children: [
                      for (var i = 0; i < word.word.length; i++)
                        _LetterBox(
                          letter: word.word[i],
                          done: i < state.nextLetter,
                          current: i == state.nextLetter,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          if (state.phase == BubblePhase.gameOver)
            GameOverCard(
              title: l10n.mobileBoard_gameOver,
              lines: [
                l10n.mobileBoard_roundsCompleted('${state.wordsCompleted}', '$kBubbleRounds'),
              ],
              seeScoreLabel: l10n.mobileBoard_seeScore,
              onSeeScore: ctrl.seeScore,
              tryAgainLabel: l10n.mobileBoard_tryAgain,
              onTryAgain: () => context.canPop() ? context.pop() : context.go('/bubble-pop/setup'),
            )
          else
            LayoutBuilder(builder: (context, box) {
              final w = box.maxWidth;
              const h = 380.0;
              const d = 56.0;
              return Container(
                key: const Key('bubble-field'),
                height: h,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFFBAE6FD), Color(0xFFE0F2FE)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                clipBehavior: Clip.antiAlias,
                child: AnimatedBuilder(
                  animation: _float,
                  builder: (context, _) {
                    final t = _float.value * 10; // seconds
                    return Stack(
                      children: [
                        for (final b in state.bubbles)
                          Positioned(
                            left: (b.x / 100 * w).clamp(0.0, w - d),
                            top: (b.y / 100 * h).clamp(0.0, h - d) +
                                (paused
                                    ? 0
                                    : math.sin((t + b.delay) * 2 * math.pi / (2 + b.delay)) * 2),
                            child: _BubbleView(
                              key: Key('bubble-${b.id}'),
                              bubble: b,
                              diameter: d,
                              wrong: state.shakeId == b.id,
                              onTap: () => ctrl.pop(b.id),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              );
            }),
          if (state.phase == BubblePhase.roundComplete) ...[
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('bubble-next'),
              onPressed: ctrl.nextWord,
              child: Text(l10n.mobileBoard_nextWord),
            ),
          ],
        ],
      ),
    );
  }
}

class _LetterBox extends StatelessWidget {
  const _LetterBox({required this.letter, required this.done, required this.current});

  final String letter;
  final bool done;
  final bool current;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 34,
      height: 42,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: done
            ? const Color(0xFFDCFCE7)
            : current
                ? const Color(0xFFFEFCE8)
                : const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: done
              ? const Color(0xFF4ADE80)
              : current
                  ? const Color(0xFFFACC15)
                  : const Color(0xFFD1D5DB),
          width: 2,
        ),
      ),
      child: Text(
        done ? letter : '_',
        style: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w900,
          color: done ? const Color(0xFF15803D) : const Color(0xFF9CA3AF),
        ),
      ),
    );
  }
}

class _BubbleView extends StatelessWidget {
  const _BubbleView({
    super.key,
    required this.bubble,
    required this.diameter,
    required this.wrong,
    required this.onTap,
  });

  final Bubble bubble;
  final double diameter;
  final bool wrong;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final shades = kBubbleColors[bubble.colorIndex];
    return IgnorePointer(
      ignoring: bubble.popped,
      child: AnimatedScale(
        scale: bubble.popped ? 1.5 : 1,
        duration: const Duration(milliseconds: 300),
        child: AnimatedOpacity(
          opacity: bubble.popped ? 0 : 1,
          duration: const Duration(milliseconds: 300),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onTap,
            child: Container(
              width: diameter,
              height: diameter,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  center: const Alignment(-0.4, -0.4),
                  colors: shades,
                ),
                border: wrong ? Border.all(color: AppTheme.error, width: 4) : null,
                boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 3))],
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Positioned(
                    left: 10,
                    top: 8,
                    child: Container(
                      width: 14,
                      height: 10,
                      decoration: BoxDecoration(
                        color: Colors.white38,
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  Text(bubble.letter,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
