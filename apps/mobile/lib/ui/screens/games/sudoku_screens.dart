import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/challenge_models.dart';
import '../../../api/quest_models.dart';
import '../../../game/framework/challenge_gate.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/sudoku/logic.dart';
import '../../../game/sudoku/sudoku_controller.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/stat_chip.dart';
import 'board_widgets.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

class SudokuSetupScreen extends StatelessWidget {
  const SudokuSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final detail = {
      'easy': l10n.mobileBoard_sudokuEasyDetail,
      'medium': l10n.mobileBoard_sudokuMediumDetail,
      'hard': l10n.mobileBoard_sudokuHardDetail,
    };
    return PickerSetupScreen(
      title: gameTitle(l10n, 'sudoku') ?? 'Sudoku',
      subtitle: l10n.mobileBoard_sudokuSubtitle,
      startLabel: l10n.mobileBoard_startPuzzle,
      selectLabel: l10n.mobileBoard_selectLevel,
      groups: [
        SetupGroup('difficulty', l10n.mobileBoard_chooseLevel, [
          for (final d in kQuizDifficulties)
            SetupOption(
              d,
              quizDifficultyLabel(l10n, d),
              emoji: quizDifficultyEmoji(d),
              description:
                  '${l10n.mobileBoard_sudokuGiven('${kSudokuGivenLabel[d]}')} · ${detail[d]}',
            ),
        ]),
      ],
      buildRoute: (s) => '/sudoku/play?difficulty=${s['difficulty']}',
    );
  }
}

/// [challengeDay] plays that day's Daily Challenge puzzle.
class SudokuGameScreen extends StatelessWidget {
  const SudokuGameScreen({super.key, required this.difficulty, this.questContext, this.challengeDay});

  final String difficulty;
  final QuestContext? questContext;
  final String? challengeDay;

  @override
  Widget build(BuildContext context) {
    final day = challengeDay;
    if (day == null) {
      final args = (difficulty: difficulty, quest: questContext);
      return _SudokuGame(
          args: args, sessionArgs: sudokuSessionArgs(args), provider: sudokuControllerProvider(args));
    }
    return ChallengeGate<SudokuContent>(
      day: day,
      title: gameTitle(AppLocalizations.of(context), 'sudoku') ?? 'Sudoku',
      builder: (context, challenge, difficulty) {
        final args = (difficulty: difficulty, quest: null);
        return _SudokuGame(
          args: args,
          sessionArgs: sudokuSessionArgs(args, challengeDay: challenge.day),
          provider: sudokuChallengeControllerProvider((args: args, challenge: challenge)),
        );
      },
    );
  }
}

typedef _SudokuProvider = AutoDisposeStateNotifierProvider<SudokuController, SudokuState>;

class _SudokuGame extends ConsumerWidget {
  const _SudokuGame({required this.args, required this.sessionArgs, required this.provider});

  final SudokuArgs args;
  final GameSessionArgs sessionArgs;
  final _SudokuProvider provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: sessionArgs,
      title: gameTitle(l10n, 'sudoku') ?? 'Sudoku',
      reviewType: gameById('sudoku')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _SudokuBoard(args: args, provider: provider, session: session),
    );
  }
}

class _SudokuBoard extends ConsumerWidget {
  const _SudokuBoard({required this.args, required this.provider, required this.session});

  final SudokuArgs args;
  final _SudokuProvider provider;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(provider);
    final ctrl = ref.read(provider.notifier);
    return LayoutBuilder(builder: (context, box) {
      final side = (box.maxWidth - 16).clamp(0.0, 460.0);
      return SingleChildScrollView(
        padding: const EdgeInsets.all(8),
        child: Center(
          child: SizedBox(
            width: side,
            child: Column(
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    StatChip(
                      key: const Key('sudoku-time'),
                      label: l10n.mobileBoard_timeLabel,
                      value: clockText(session.elapsedSeconds),
                    ),
                    StatChip(
                      key: const Key('sudoku-mistakes'),
                      label: l10n.mobileBoard_mistakes,
                      value: '${state.mistakes}',
                    ),
                    StatChip(
                      label: '',
                      value: quizDifficultyLabel(l10n, args.difficulty),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                _Grid(state: state, side: side, onTap: ctrl.select),
                const SizedBox(height: 10),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  children: [
                    FilterChip(
                      key: const Key('sudoku-notes'),
                      selected: state.noteMode,
                      label: Text(
                          '✏ ${state.noteMode ? l10n.mobileBoard_notesOn : l10n.mobileBoard_notesOff}'),
                      onSelected: (_) => ctrl.toggleNotes(),
                    ),
                    ActionChip(
                      key: const Key('sudoku-erase'),
                      label: Text('⌫ ${l10n.mobileBoard_erase}'),
                      onPressed: ctrl.erase,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    for (var n = 1; n <= 9; n++)
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          child: SizedBox(
                            height: 52,
                            child: FilledButton.tonal(
                              key: Key('sudoku-num-$n'),
                              style: FilledButton.styleFrom(padding: EdgeInsets.zero),
                              onPressed: state.count(n) >= 9 ? null : () => ctrl.enter(n),
                              child: Text('$n',
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    });
  }
}

class _Grid extends StatelessWidget {
  const _Grid({required this.state, required this.side, required this.onTap});

  final SudokuState state;
  final double side;
  final void Function(int row, int col) onTap;

  @override
  Widget build(BuildContext context) {
    final cell = side / 9;
    final sel = state.selected;
    final selValue = sel == null ? 0 : state.grid[sel.row][sel.col];
    return Container(
      width: side,
      height: side,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFF1F2937), width: 2),
      ),
      child: Stack(
        children: [
          for (var r = 0; r < 9; r++)
            for (var c = 0; c < 9; c++)
              Positioned(
                left: c * cell,
                top: r * cell,
                width: cell,
                height: cell,
                child: _CellView(
                  key: Key('sudoku-cell-$r-$c'),
                  value: state.grid[r][c],
                  notes: state.notes[r][c],
                  given: state.given[r][c],
                  selected: sel?.row == r && sel?.col == c,
                  related: sel != null &&
                      (sel.row == r ||
                          sel.col == c ||
                          (sel.row ~/ 3 == r ~/ 3 && sel.col ~/ 3 == c ~/ 3)),
                  sameValue: selValue != 0 && state.grid[r][c] == selValue,
                  conflict: state.grid[r][c] != 0 &&
                      !state.given[r][c] &&
                      sudokuHasConflict(state.grid, r, c),
                  thickRight: c % 3 == 2 && c < 8,
                  thickBottom: r % 3 == 2 && r < 8,
                  size: cell,
                  onTap: () => onTap(r, c),
                ),
              ),
        ],
      ),
    );
  }
}

class _CellView extends StatelessWidget {
  const _CellView({
    super.key,
    required this.value,
    required this.notes,
    required this.given,
    required this.selected,
    required this.related,
    required this.sameValue,
    required this.conflict,
    required this.thickRight,
    required this.thickBottom,
    required this.size,
    required this.onTap,
  });

  final int value;
  final Set<int> notes;
  final bool given;
  final bool selected;
  final bool related;
  final bool sameValue;
  final bool conflict;
  final bool thickRight;
  final bool thickBottom;
  final double size;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg = selected
        ? const Color(0xFFBFDBFE)
        : related
            ? const Color(0xFFEFF6FF)
            : sameValue
                ? const Color(0xFFDBEAFE)
                : Colors.white;
    final fg = conflict
        ? AppTheme.error
        : given
            ? const Color(0xFF1F2937)
            : const Color(0xFF2563EB);
    const thin = BorderSide(color: Color(0xFFD1D5DB));
    const thick = BorderSide(color: Color(0xFF1F2937), width: 2);
    return Semantics(
      label: value == 0 ? 'empty' : '$value',
      button: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: bg,
            border: Border(
              right: thickRight ? thick : thin,
              bottom: thickBottom ? thick : thin,
            ),
          ),
          alignment: Alignment.center,
          child: value != 0
              ? Text('$value',
                  style: TextStyle(fontSize: size * 0.58, fontWeight: FontWeight.w800, color: fg))
              : notes.isEmpty
                  ? null
                  : GridView.count(
                      crossAxisCount: 3,
                      physics: const NeverScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(1),
                      children: [
                        for (var n = 1; n <= 9; n++)
                          Center(
                            child: Text(notes.contains(n) ? '$n' : '',
                                style: TextStyle(
                                    fontSize: size * 0.24, color: const Color(0xFF6B7280))),
                          ),
                      ],
                    ),
        ),
      ),
    );
  }
}
