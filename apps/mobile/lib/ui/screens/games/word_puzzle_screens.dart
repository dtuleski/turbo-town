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
import '../../../game/word_puzzle/word_puzzle_controller.dart';
import '../../../game/word_puzzle/word_puzzle_logic.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/choice_tile.dart';
import '../../widgets/stat_chip.dart';

String _wpName(AppLocalizations l10n, String id) => switch (id) {
      'medium' => l10n.wordPuzzle_medium,
      'hard' => l10n.wordPuzzle_hard,
      _ => l10n.wordPuzzle_easy,
    };

String _wpDesc(AppLocalizations l10n, String id) => switch (id) {
      'medium' => l10n.wordPuzzle_mediumDesc,
      'hard' => l10n.wordPuzzle_hardDesc,
      _ => l10n.wordPuzzle_easyDesc,
    };

String _clock(int seconds) {
  final m = seconds ~/ 60;
  final s = (seconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

class WordPuzzleSetupScreen extends StatefulWidget {
  const WordPuzzleSetupScreen({super.key});

  @override
  State<WordPuzzleSetupScreen> createState() => _WordPuzzleSetupScreenState();
}

class _WordPuzzleSetupScreenState extends State<WordPuzzleSetupScreen> {
  String _difficulty = 'easy';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return GameSetupScaffold(
      title: gameTitle(l10n, 'word-puzzle') ?? l10n.wordPuzzle_title,
      startLabel: '${l10n.wordPuzzle_start} ${_wpName(l10n, _difficulty)}',
      onStart: () => context.push('/word-puzzle/play?difficulty=$_difficulty'),
      children: [
        Text(l10n.wordPuzzle_subtitle,
            textAlign: TextAlign.center, style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        Text(l10n.wordPuzzle_howToPlay, style: theme.textTheme.titleMedium),
        const SizedBox(height: 4),
        Text('1. ${l10n.wordPuzzle_selectLetters}: ${l10n.wordPuzzle_selectLettersDesc}\n'
            '2. ${l10n.wordPuzzle_findWords}: ${l10n.wordPuzzle_findWordsDesc}\n'
            '3. ${l10n.wordPuzzle_beatTheClock}: ${l10n.wordPuzzle_beatTheClockDesc}'),
        const SizedBox(height: 16),
        for (final d in kWordPuzzleDifficulties)
          ChoiceTile(
            key: Key('difficulty-${d.id}'),
            emoji: d.emoji,
            label: _wpName(l10n, d.id),
            description: '${_wpDesc(l10n, d.id)} · '
                '${l10n.wordPuzzle_gridSize}: ${d.gridSize}×${d.gridSize} · '
                '${l10n.wordPuzzle_words}: ${d.wordCount} · '
                '${l10n.wordPuzzle_timeLimit}: ${d.timeLimit ~/ 60} ${l10n.wordPuzzle_minutes}',
            selected: _difficulty == d.id,
            onTap: () => setState(() => _difficulty = d.id),
          ),
      ],
    );
  }
}

/// [challengeDay] plays that day's Daily Challenge grid in the app language
/// (English when the challenge has no variant for it).
class WordPuzzleGameScreen extends StatelessWidget {
  const WordPuzzleGameScreen({super.key, required this.difficulty, this.questContext, this.challengeDay});

  final String difficulty;
  final QuestContext? questContext;
  final String? challengeDay;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).languageCode;
    final day = challengeDay;
    if (day == null) {
      final args = (difficulty: difficulty, locale: locale, quest: questContext);
      return _WordPuzzleGame(
          args: args, sessionArgs: wordPuzzleSessionArgs(args), provider: wordPuzzleControllerProvider(args));
    }
    final l10n = AppLocalizations.of(context);
    return ChallengeGate<WordPuzzleContent>(
      day: day,
      title: gameTitle(l10n, 'word-puzzle') ?? l10n.wordPuzzle_title,
      builder: (context, challenge, difficulty) {
        final args = (difficulty: difficulty, locale: locale, quest: null);
        return _WordPuzzleGame(
          args: args,
          sessionArgs: wordPuzzleSessionArgs(args, challengeDay: challenge.day),
          provider: wordPuzzleChallengeControllerProvider((args: args, challenge: challenge)),
        );
      },
    );
  }
}

typedef _WordPuzzleProvider = AutoDisposeStateNotifierProvider<WordPuzzleController, WordPuzzleState>;

class _WordPuzzleGame extends ConsumerWidget {
  const _WordPuzzleGame({required this.args, required this.sessionArgs, required this.provider});

  final WordPuzzleArgs args;
  final GameSessionArgs sessionArgs;
  final _WordPuzzleProvider provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: sessionArgs,
      title: gameTitle(l10n, 'word-puzzle') ?? l10n.wordPuzzle_title,
      reviewType: gameById('word-puzzle')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) =>
          _WordPuzzleBoard(args: args, provider: provider, session: session),
    );
  }
}

class _WordPuzzleBoard extends ConsumerStatefulWidget {
  const _WordPuzzleBoard({required this.args, required this.provider, required this.session});

  final WordPuzzleArgs args;
  final _WordPuzzleProvider provider;
  final GameSessionState session;

  @override
  ConsumerState<_WordPuzzleBoard> createState() => _WordPuzzleBoardState();
}

class _WordPuzzleBoardState extends ConsumerState<_WordPuzzleBoard> {
  /// True while a finger is on the grid. The page scrolls otherwise, and a
  /// vertical swipe over the grid would scroll it instead of selecting.
  bool _touchingGrid = false;

  @override
  Widget build(BuildContext context) {
    final args = widget.args;
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(widget.provider);
    final controller = ref.read(widget.provider.notifier);
    final puzzle = state.puzzle;
    final config = wordPuzzleDifficultyById(args.difficulty);
    return ListView(
      physics: _touchingGrid ? const NeverScrollableScrollPhysics() : null,
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 8,
          runSpacing: 8,
          children: [
            StatChip(
              key: const Key('wp-found'),
              label: l10n.wordPuzzle_wordsFound,
              value: '${state.found.length}/${puzzle.words.length}',
            ),
            StatChip(
              key: const Key('wp-time'),
              label: l10n.wordPuzzle_time,
              value: _clock(state.timeRemaining),
            ),
            StatChip(
              label: l10n.wordPuzzle_difficulty,
              value: _wpName(l10n, config.id),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(l10n.wordPuzzle_dragHint,
            textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
        SizedBox(
          height: 36,
          child: Center(
            child: switch (state.toast) {
              WordPuzzleToast.found => Text('✅ ${state.toastWord}',
                  key: const Key('wp-toast'),
                  style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.success)),
              WordPuzzleToast.alreadyFound => Text('⚠ ${state.toastWord}',
                  key: const Key('wp-toast'),
                  style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.warning)),
              WordPuzzleToast.none => const SizedBox.shrink(),
            },
          ),
        ),
        Listener(
          onPointerDown: (_) => setState(() => _touchingGrid = true),
          onPointerUp: (_) => setState(() => _touchingGrid = false),
          onPointerCancel: (_) => setState(() => _touchingGrid = false),
          child: _Grid(state: state, controller: controller),
        ),
        const SizedBox(height: 16),
        Text(l10n.wordPuzzle_wordsToFind, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final w in puzzle.words)
              Chip(
                key: Key('wp-word-$w'),
                label: Text(
                  w,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    decoration: state.found.contains(w) ? TextDecoration.lineThrough : null,
                    color: state.found.contains(w) ? AppTheme.success : null,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _Grid extends StatelessWidget {
  const _Grid({required this.state, required this.controller});

  final WordPuzzleState state;
  final WordPuzzleController controller;

  @override
  Widget build(BuildContext context) {
    final size = state.puzzle.gridSize;
    return LayoutBuilder(builder: (context, constraints) {
      final side = constraints.maxWidth;
      final cellSide = side / size;
      Cell? cellAt(Offset p) {
        if (p.dx < 0 || p.dy < 0 || p.dx >= side || p.dy >= side) return null;
        return Cell((p.dy / cellSide).floor(), (p.dx / cellSide).floor());
      }

      return GestureDetector(
        key: const Key('wp-grid'),
        behavior: HitTestBehavior.opaque,
        // onPanDown fires at the touch itself. onPanStart waits for the drag
        // slop, so the first letter under the finger would be missed.
        onPanDown: (d) {
          final c = cellAt(d.localPosition);
          if (c != null) controller.beginSelection(c);
        },
        onPanUpdate: (d) {
          final c = cellAt(d.localPosition);
          if (c != null) controller.extendSelection(c);
        },
        onPanEnd: (_) => controller.endSelection(),
        onPanCancel: controller.endSelection,
        child: SizedBox(
          width: side,
          height: side,
          child: Column(
            children: [
              for (var r = 0; r < size; r++)
                Expanded(
                  child: Row(
                    children: [
                      for (var c = 0; c < size; c++)
                        Expanded(
                          child: _LetterCell(
                            letter: state.puzzle.grid[r][c],
                            selected: state.selection.contains(Cell(r, c)),
                            found: state.foundCells.contains(Cell(r, c)),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      );
    });
  }
}

class _LetterCell extends StatelessWidget {
  const _LetterCell({required this.letter, required this.selected, required this.found});

  final String letter;
  final bool selected;
  final bool found;

  @override
  Widget build(BuildContext context) {
    final color = selected
        ? AppTheme.primary
        : found
            ? AppTheme.success.withValues(alpha: 0.3)
            : AppTheme.bgWhite;
    return Container(
      margin: const EdgeInsets.all(1),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppTheme.textLight),
      ),
      alignment: Alignment.center,
      child: FittedBox(
        child: Padding(
          padding: const EdgeInsets.all(2),
          child: Text(
            letter,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: selected ? Colors.white : AppTheme.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
