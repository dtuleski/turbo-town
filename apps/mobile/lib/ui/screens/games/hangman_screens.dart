import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/challenge_models.dart';
import '../../../api/quest_models.dart';
import '../../../game/framework/challenge_gate.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/framework/game_setup_scaffold.dart';
import '../../../game/game_registry.dart';
import '../../../game/hangman/hangman_controller.dart';
import '../../../game/hangman/hangman_logic.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/choice_tile.dart';
import '../../widgets/stat_chip.dart';
import 'quiz_setup_screens.dart';

class HangmanSetupScreen extends StatefulWidget {
  const HangmanSetupScreen({super.key});

  @override
  State<HangmanSetupScreen> createState() => _HangmanSetupScreenState();
}

class _HangmanSetupScreenState extends State<HangmanSetupScreen> {
  String? _difficulty;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': l10n.setup_hangman_upTo5,
      'medium': l10n.setup_hangman_upTo10,
      'hard': l10n.setup_hangman_moreThan10,
    };
    return GameSetupScaffold(
      title: gameTitle(l10n, 'hangman') ?? l10n.setup_hangman_title,
      startLabel:
          _difficulty == null ? l10n.game_selectDifficulty : '${l10n.game_startGame} 🪢',
      onStart: _difficulty == null
          ? null
          : () => context.push('/hangman/play?difficulty=$_difficulty'),
      children: [
        Text(l10n.setup_hangman_subtitle,
            textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(l10n.setup_hangman_info,
            textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 16),
        Text(l10n.game_chooseDifficulty, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        for (final d in kQuizDifficulties)
          ChoiceTile(
            key: Key('difficulty-$d'),
            emoji: quizDifficultyEmoji(d),
            label: quizDifficultyLabel(l10n, d),
            description: desc[d],
            selected: _difficulty == d,
            onTap: () => setState(() => _difficulty = d),
          ),
        const SizedBox(height: 8),
        Text('💡 ${l10n.setup_hangman_hintInfo}', style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

/// [challengeDay] plays that day's Daily Challenge words in the app language
/// (English when the challenge has no list for it).
class HangmanGameScreen extends StatelessWidget {
  const HangmanGameScreen({super.key, required this.difficulty, this.questContext, this.challengeDay});

  final String difficulty;
  final QuestContext? questContext;
  final String? challengeDay;

  @override
  Widget build(BuildContext context) {
    final lang = Localizations.localeOf(context).languageCode;
    final day = challengeDay;
    if (day == null) {
      final args = (difficulty: difficulty, lang: lang, quest: questContext);
      return _HangmanGame(
          args: args, sessionArgs: hangmanSessionArgs(args), provider: hangmanControllerProvider(args));
    }
    final l10n = AppLocalizations.of(context);
    return ChallengeGate<HangmanContent>(
      day: day,
      title: gameTitle(l10n, 'hangman') ?? l10n.setup_hangman_title,
      builder: (context, challenge, difficulty) {
        final args = (difficulty: difficulty, lang: lang, quest: null);
        return _HangmanGame(
          args: args,
          sessionArgs: hangmanSessionArgs(args, challengeDay: challenge.day),
          provider: hangmanChallengeControllerProvider((args: args, challenge: challenge)),
        );
      },
    );
  }
}

typedef _HangmanProvider = AutoDisposeStateNotifierProvider<HangmanController, HangmanState>;

class _HangmanGame extends ConsumerWidget {
  const _HangmanGame({required this.args, required this.sessionArgs, required this.provider});

  final HangmanArgs args;
  final GameSessionArgs sessionArgs;
  final _HangmanProvider provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: sessionArgs,
      title: gameTitle(l10n, 'hangman') ?? l10n.setup_hangman_title,
      reviewType: gameById('hangman')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _HangmanBoard(args: args, provider: provider, session: session),
    );
  }
}

String _clock(int seconds) {
  final m = seconds ~/ 60;
  final s = (seconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

class _HangmanBoard extends ConsumerWidget {
  const _HangmanBoard({required this.args, required this.provider, required this.session});

  final HangmanArgs args;
  final _HangmanProvider provider;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    final word = state.word;
    final wrong = state.wrongCount;
    final lost = state.phase == RoundPhase.lost;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 8,
          runSpacing: 8,
          children: [
            StatChip(
              key: const Key('hm-time'),
              label: '⏱',
              value: _clock(session.elapsedSeconds),
            ),
            StatChip(
              key: const Key('hm-round'),
              label: l10n.game_round,
              value: '${state.round + 1}/${state.words.length}',
            ),
            StatChip(
              key: const Key('hm-score'),
              label: '⭐',
              value: '${state.totalScore}',
            ),
          ],
        ),
        const SizedBox(height: 12),
        LinearProgressIndicator(
          value: (state.round + (state.phase != RoundPhase.playing ? 1 : 0)) / state.words.length,
          minHeight: 6,
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 12),
        Center(child: Chip(label: Text(word.category))),
        Text('💡 ${word.hint}',
            key: const Key('hm-hint'), textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Center(
          child: SizedBox(
            width: 120,
            height: 132,
            child: CustomPaint(painter: HangmanPainter(wrong)),
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < kHangmanMaxWrong; i++)
              Container(
                width: 14,
                height: 14,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i < wrong ? AppTheme.error : AppTheme.textLight,
                ),
              ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(top: 4, bottom: 12),
          child: Text(
            l10n.gameplay_guessesLeft('${kHangmanMaxWrong - wrong}'),
            key: const Key('hm-guesses-left'),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final letter in word.word.split(''))
              _Slot(
                letter: letter,
                revealed: state.guessed.contains(letter) || lost,
                missed: lost && !state.guessed.contains(letter),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (state.phase != RoundPhase.playing) ...[
          Text(
            state.phase == RoundPhase.won
                ? '🎉 ${l10n.game_correct}'
                : '💀 ${l10n.gameplay_theWordWas(word.word)}',
            key: const Key('hm-round-result'),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: state.phase == RoundPhase.won ? AppTheme.success : AppTheme.error,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            key: const Key('hm-next'),
            onPressed: controller.nextRound,
            child: Text(state.lastRound ? l10n.game_seeResults : l10n.game_nextRound),
          ),
        ] else
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final letter in kHangmanAlphabet.split(''))
                _Key(
                  letter: letter,
                  guessed: state.guessed.contains(letter),
                  correct: state.guessed.contains(letter) && word.word.contains(letter),
                  onTap: () => controller.guess(letter),
                ),
            ],
          ),
      ],
    );
  }
}

class _Slot extends StatelessWidget {
  const _Slot({required this.letter, required this.revealed, required this.missed});

  final String letter;
  final bool revealed;
  final bool missed;

  @override
  Widget build(BuildContext context) {
    final color = missed ? AppTheme.error : AppTheme.textPrimary;
    return Container(
      width: 30,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: revealed && !missed ? AppTheme.success : color, width: 3),
        ),
      ),
      child: Text(
        revealed ? letter : '',
        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color),
      ),
    );
  }
}

class _Key extends StatelessWidget {
  const _Key({
    required this.letter,
    required this.guessed,
    required this.correct,
    required this.onTap,
  });

  final String letter;
  final bool guessed;
  final bool correct;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final Color bg = !guessed
        ? AppTheme.bgWhite
        : correct
            ? AppTheme.success
            : AppTheme.error.withValues(alpha: 0.5);
    return SizedBox(
      width: 40,
      height: 44,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: const BorderSide(color: AppTheme.textLight),
        ),
        child: InkWell(
          key: Key('hm-key-$letter'),
          borderRadius: BorderRadius.circular(10),
          onTap: guessed ? null : onTap,
          child: Center(
            child: Text(
              letter,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: guessed ? Colors.white : AppTheme.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Gallows and figure, one part per wrong guess. Same drawing as the web SVG
/// (viewBox 0 0 200 220).
class HangmanPainter extends CustomPainter {
  HangmanPainter(this.wrong);

  final int wrong;

  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 200;
    final sy = size.height / 220;
    Offset p(double x, double y) => Offset(x * sx, y * sy);
    final gallows = Paint()
      ..color = const Color(0xFF64748B)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke;
    final body = Paint()
      ..color = AppTheme.error
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;
    canvas
      ..drawLine(p(20, 210), p(180, 210), gallows)
      ..drawLine(p(60, 210), p(60, 20), gallows)
      ..drawLine(p(60, 20), p(130, 20), gallows)
      ..drawLine(p(130, 20), p(130, 50), gallows);
    if (wrong >= 1) canvas.drawOval(Rect.fromCenter(center: p(130, 70), width: 40 * sx, height: 40 * sy), body);
    if (wrong >= 2) canvas.drawLine(p(130, 90), p(130, 150), body);
    if (wrong >= 3) canvas.drawLine(p(130, 110), p(100, 135), body);
    if (wrong >= 4) canvas.drawLine(p(130, 110), p(160, 135), body);
    if (wrong >= 5) canvas.drawLine(p(130, 150), p(105, 190), body);
    if (wrong >= 6) {
      canvas
        ..drawLine(p(130, 150), p(155, 190), body)
        ..drawLine(p(122, 63), p(128, 69), body)
        ..drawLine(p(128, 63), p(122, 69), body)
        ..drawLine(p(132, 63), p(138, 69), body)
        ..drawLine(p(138, 63), p(132, 69), body);
    }
  }

  @override
  bool shouldRepaint(HangmanPainter old) => old.wrong != wrong;
}
