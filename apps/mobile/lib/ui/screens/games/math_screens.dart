import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/challenge_models.dart';
import '../../../api/quest_models.dart';
import '../../../game/framework/challenge_gate.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/framework/game_setup_scaffold.dart';
import '../../../game/game_registry.dart';
import '../../../game/math/math_controller.dart';
import '../../../game/math/math_logic.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/choice_tile.dart';
import '../../widgets/stat_chip.dart';
import 'quiz_setup_screens.dart';

String _mathDescription(AppLocalizations l10n, String id) => switch (id) {
      'medium' => l10n.setup_mathChallenge_allBasic,
      'hard' => l10n.setup_mathChallenge_advanced,
      _ => l10n.setup_mathChallenge_addSub,
    };

class MathSetupScreen extends StatefulWidget {
  const MathSetupScreen({super.key});

  @override
  State<MathSetupScreen> createState() => _MathSetupScreenState();
}

class _MathSetupScreenState extends State<MathSetupScreen> {
  String? _difficulty;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return GameSetupScaffold(
      title: gameTitle(l10n, 'math-challenge') ?? l10n.setup_mathChallenge_title,
      startLabel: _difficulty == null
          ? l10n.setup_mathChallenge_selectLevel
          : l10n.setup_mathChallenge_startChallenge,
      onStart: _difficulty == null
          ? null
          : () => context.push('/math-challenge/play?difficulty=$_difficulty'),
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(l10n.setup_mathChallenge_subtitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(l10n.setup_mathChallenge_chooseLevel,
              style: Theme.of(context).textTheme.titleMedium),
        ),
        for (final d in kMathDifficulties)
          ChoiceTile(
            key: Key('difficulty-${d.id}'),
            emoji: d.emoji,
            label: quizDifficultyLabel(l10n, d.id),
            description: '${_mathDescription(l10n, d.id)} · '
                '${l10n.setup_mathChallenge_questions('${d.questions}')} · '
                '${l10n.setup_mathChallenge_minutes('${d.timeLimit ~/ 60}')}',
            selected: _difficulty == d.id,
            onTap: () => setState(() => _difficulty = d.id),
          ),
      ],
    );
  }
}

/// [challengeDay] plays that day's Daily Challenge questions.
class MathGameScreen extends StatelessWidget {
  const MathGameScreen({super.key, required this.difficulty, this.questContext, this.challengeDay});

  final String difficulty;
  final QuestContext? questContext;
  final String? challengeDay;

  @override
  Widget build(BuildContext context) {
    final day = challengeDay;
    if (day == null) {
      final args = (difficulty: difficulty, quest: questContext);
      return _MathGame(args: args, sessionArgs: mathSessionArgs(args), provider: mathControllerProvider(args));
    }
    final l10n = AppLocalizations.of(context);
    return ChallengeGate<MathChallengeContent>(
      day: day,
      title: gameTitle(l10n, 'math-challenge') ?? l10n.setup_mathChallenge_title,
      builder: (context, challenge, difficulty) {
        final args = (difficulty: difficulty, quest: null);
        return _MathGame(
          args: args,
          sessionArgs: mathSessionArgs(args, challengeDay: challenge.day),
          provider: mathChallengeControllerProvider((args: args, challenge: challenge)),
        );
      },
    );
  }
}

typedef _MathProvider = AutoDisposeStateNotifierProvider<MathController, MathState>;

class _MathGame extends ConsumerWidget {
  const _MathGame({required this.args, required this.sessionArgs, required this.provider});

  final MathArgs args;
  final GameSessionArgs sessionArgs;
  final _MathProvider provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: sessionArgs,
      title: gameTitle(l10n, 'math-challenge') ?? l10n.setup_mathChallenge_title,
      reviewType: gameById('math-challenge')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _MathBoard(args: args, provider: provider, session: session),
    );
  }
}

String _clock(int seconds) {
  final m = seconds ~/ 60;
  final s = (seconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

class _MathBoard extends ConsumerStatefulWidget {
  const _MathBoard({required this.args, required this.provider, required this.session});

  final MathArgs args;
  final _MathProvider provider;
  final GameSessionState session;

  @override
  ConsumerState<_MathBoard> createState() => _MathBoardState();
}

class _MathBoardState extends ConsumerState<_MathBoard> {
  final _input = TextEditingController();
  final _focus = FocusNode();
  int _shownNumber = 1;

  @override
  void dispose() {
    _input.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _submit() {
    ref.read(widget.provider.notifier).submit(_input.text);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(widget.provider);
    final total = ref.read(widget.provider.notifier).totalQuestions;
    final config = mathDifficultyById(widget.args.difficulty);
    if (state.number != _shownNumber) {
      // New question: clear the field and keep the keyboard up.
      _shownNumber = state.number;
      _input.clear();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _focus.requestFocus();
      });
    }
    final feedbackText = state.lastCorrect
        ? l10n.setup_mathChallenge_correct
        : l10n.setup_mathChallenge_wrong('${state.question.answer}');
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 8,
          runSpacing: 8,
          children: [
            StatChip(
              key: const Key('math-number'),
              label: l10n.setup_mathChallenge_question,
              value: '${state.number} / $total',
            ),
            StatChip(
              key: const Key('math-time'),
              label: l10n.setup_mathChallenge_time,
              value: _clock(state.timeRemaining),
            ),
            StatChip(
              key: const Key('math-score'),
              label: l10n.setup_mathChallenge_score,
              value: '${state.correctCount}',
            ),
          ],
        ),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text(
                  state.question.question,
                  key: const Key('math-question'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 6),
                Text(l10n.setup_mathChallenge_level(
                    config.emoji, quizDifficultyLabel(l10n, config.id))),
                const SizedBox(height: 20),
                TextField(
                  key: const Key('math-input'),
                  controller: _input,
                  focusNode: _focus,
                  autofocus: true,
                  enabled: !state.feedbackShown,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 28),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: (_) => setState(() {}),
                  onSubmitted: (_) => _submit(),
                  decoration: InputDecoration(
                    hintText: l10n.setup_mathChallenge_yourAnswer,
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    key: const Key('math-submit'),
                    onPressed: _input.text.trim().isEmpty || state.feedbackShown ? null : _submit,
                    child: Text(l10n.setup_mathChallenge_submitAnswer),
                  ),
                ),
                if (state.feedbackShown)
                  Container(
                    key: const Key('math-feedback'),
                    width: double.infinity,
                    margin: const EdgeInsets.only(top: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: (state.lastCorrect ? AppTheme.success : AppTheme.error)
                          .withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      feedbackText,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: state.lastCorrect ? AppTheme.success : AppTheme.error,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
