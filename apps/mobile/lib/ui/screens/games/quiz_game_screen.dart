import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_drawing/path_drawing.dart';

import '../../../game/data/quiz_data.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/quiz/quiz_engine.dart';
import '../../../game/quiz/quiz_providers.dart';
import '../../../game/quiz/quiz_questions.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/stat_chip.dart';

/// Play screen shared by Geo, History and Civics quizzes.
class QuizGameScreen extends ConsumerWidget {
  const QuizGameScreen({super.key, required this.args});

  final QuizArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final spec = quizSpecFor(args);
    final engine = quizEngineProvider(args);
    // Keep the engine alive while the frame shows pause and result screens.
    ref.listen(engine, (_, __) {});
    final entry = gameById(args.gameId)!;
    return GameSessionFrame(
      args: spec.sessionArgs(args.quest),
      title: gameTitle(l10n, args.gameId) ?? args.gameId,
      reviewType: entry.reviewType,
      onPlayAgain: () => ref.read(engine.notifier).restart(),
      boardBuilder: (context, session) =>
          QuizBoard(args: args, spec: spec, session: session),
    );
  }
}

String _clock(int seconds) {
  final m = seconds ~/ 60;
  final s = (seconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

class QuizBoard extends ConsumerWidget {
  const QuizBoard({super.key, required this.args, required this.spec, required this.session});

  final QuizArgs args;
  final QuizSpec spec;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(quizEngineProvider(args));
    final engine = ref.read(quizEngineProvider(args).notifier);
    if (state.questions.isEmpty) {
      return Center(child: Text(l10n.gameplay_loadingQuestions));
    }
    final q = state.current;
    final feedback = state.phase == QuizPhase.feedback;
    final timerColor = state.timeLeft <= 3
        ? AppTheme.error
        : state.timeLeft <= 7
            ? AppTheme.warning
            : AppTheme.success;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 8,
          runSpacing: 8,
          children: [
            StatChip(
              key: const Key('quiz-time'),
              label: '⏱',
              value: _clock(session.elapsedSeconds),
            ),
            StatChip(
              key: const Key('quiz-progress'),
              label: 'Q',
              value: '${state.index + 1}/${state.total}',
            ),
            StatChip(
              key: const Key('quiz-score'),
              label: '🎯',
              value: '${state.score}',
            ),
          ],
        ),
        const SizedBox(height: 12),
        LinearProgressIndicator(
          value: (state.index + (feedback ? 1 : 0)) / state.total,
          minHeight: 6,
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 12),
        LinearProgressIndicator(
          value: state.timeLeft / spec.secondsPerQuestion,
          minHeight: 10,
          color: timerColor,
          borderRadius: BorderRadius.circular(6),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 4, bottom: 8),
          child: Text(
            '${state.timeLeft}s',
            key: const Key('quiz-timer'),
            textAlign: TextAlign.center,
            style: TextStyle(color: timerColor, fontWeight: FontWeight.w800),
          ),
        ),
        if (state.streak > 1 && !feedback)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '🔥 ${state.streak} ${l10n.game_streak} (+${state.streak * 25} ${l10n.game_bonus})',
              key: const Key('quiz-streak'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.orange),
            ),
          ),
        _PromptCard(question: q),
        const SizedBox(height: 12),
        for (var i = 0; i < q.options.length; i++)
          _OptionButton(
            key: Key('quiz-option-$i'),
            text: q.options[i],
            state: _optionState(state, q.options[i]),
            onTap: feedback ? null : () => engine.answer(q.options[i]),
          ),
        if (!feedback && spec.hintsEnabled) ...[
          if (state.showHint1 && q.hint1 != null)
            _Note(key: const Key('quiz-hint-1'), text: '💡 ${q.hint1}'),
          if (state.showHint2 && q.hint2 != null)
            _Note(key: const Key('quiz-hint-2'), text: '💡 ${q.hint2}'),
        ],
        if (feedback) ...[
          const SizedBox(height: 8),
          Text(
            state.isCorrect
                ? '🎉 ${l10n.game_correct}'
                : '❌ ${args.gameId == 'civics-quiz' ? l10n.gameplay_answer(q.correctAnswer) : l10n.gameplay_theAnswerWas(q.correctAnswer)}',
            key: const Key('quiz-feedback'),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: state.isCorrect ? AppTheme.success : AppTheme.error,
            ),
          ),
          if (q.funFact != null) _Note(key: const Key('quiz-fun-fact'), text: '🌟 ${q.funFact}'),
        ],
      ],
    );
  }
}

enum _OptionVisual { idle, correct, wrong, dimmed }

_OptionVisual _optionState(QuizState s, String option) {
  if (s.phase != QuizPhase.feedback) return _OptionVisual.idle;
  if (option == s.current.correctAnswer) return _OptionVisual.correct;
  if (option == s.selected && !s.isCorrect) return _OptionVisual.wrong;
  return _OptionVisual.dimmed;
}

class _OptionButton extends StatelessWidget {
  const _OptionButton({super.key, required this.text, required this.state, required this.onTap});

  final String text;
  final _OptionVisual state;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color border) = switch (state) {
      _OptionVisual.correct => (AppTheme.success.withValues(alpha: 0.18), AppTheme.success),
      _OptionVisual.wrong => (AppTheme.error.withValues(alpha: 0.18), AppTheme.error),
      _OptionVisual.dimmed => (AppTheme.bgLight, AppTheme.textLight),
      _OptionVisual.idle => (AppTheme.bgWhite, AppTheme.primary.withValues(alpha: 0.5)),
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Opacity(
        opacity: state == _OptionVisual.dimmed ? 0.55 : 1,
        child: Material(
          color: bg,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: border, width: 2),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(text,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                  if (state == _OptionVisual.correct) const Text('✅'),
                  if (state == _OptionVisual.wrong) const Text('❌'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text(text, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
      );
}

class _PromptCard extends StatelessWidget {
  const _PromptCard({required this.question});

  final QuizQuestion question;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: scheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            if (question.silhouette) ...[
              Text(l10n.gameplay_whichCountry,
                  style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              CountrySilhouette(
                key: ValueKey('silhouette-${question.prompt}'),
                countryName: question.prompt,
              ),
            ] else ...[
              if (question.promptEmoji != null)
                Text(question.promptEmoji!, style: const TextStyle(fontSize: 44)),
              if (question.imageUrl != null) QuizImage(url: question.imageUrl!),
              if (question.label != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(question.label!.toUpperCase(),
                      style: Theme.of(context).textTheme.labelSmall),
                ),
              const SizedBox(height: 8),
              Text(
                question.prompt,
                key: const Key('quiz-prompt'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Network image with a quiet fallback: if it cannot load the card simply
/// shows no picture.
class QuizImage extends StatelessWidget {
  const QuizImage({super.key, required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          url,
          height: 160,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          loadingBuilder: (context, child, progress) => progress == null
              ? child
              : const SizedBox(height: 160, child: Center(child: CircularProgressIndicator())),
        ),
      ),
    );
  }
}

final Map<String, Path> _silhouettePaths = {};

/// Country outline drawn from the web SVG path (viewBox 0 0 2000 1001),
/// zoomed to the shape with 10% padding as the web page does.
class CountrySilhouette extends StatelessWidget {
  const CountrySilhouette({super.key, required this.countryName});

  final String countryName;

  @override
  Widget build(BuildContext context) {
    final data = geoData.silhouettes[countryName];
    if (data == null) return const Text('🗺', style: TextStyle(fontSize: 56));
    final path = _silhouettePaths.putIfAbsent(countryName, () => parseSvgPathData(data));
    return SizedBox(
      width: 220,
      height: 200,
      child: CustomPaint(
        painter: _SilhouettePainter(path, Theme.of(context).colorScheme.primary),
      ),
    );
  }
}

class _SilhouettePainter extends CustomPainter {
  _SilhouettePainter(this.path, this.color);

  final Path path;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final b = path.getBounds();
    if (b.isEmpty) return;
    final pad = (b.width > b.height ? b.width : b.height) * 0.1;
    final view = b.inflate(pad);
    final scale = (size.width / view.width < size.height / view.height)
        ? size.width / view.width
        : size.height / view.height;
    canvas
      ..translate(
        (size.width - view.width * scale) / 2 - view.left * scale,
        (size.height - view.height * scale) / 2 - view.top * scale,
      )
      ..scale(scale)
      ..drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_SilhouettePainter old) => old.path != path || old.color != color;
}
