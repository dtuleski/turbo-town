import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/quest_models.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/math_maze/logic.dart';
import '../../../game/math_maze/maze_controller.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/stat_chip.dart';
import 'board_widgets.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

/// Finger travel (logical px) that counts as one swipe step.
const double kMazeSwipeStep = 28;

class MathMazeSetupScreen extends StatelessWidget {
  const MathMazeSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': l10n.mathMaze_easyDesc,
      'medium': l10n.mathMaze_mediumDesc,
      'hard': l10n.mathMaze_hardDesc,
    };
    return PickerSetupScreen(
      title: gameTitle(l10n, 'math-maze') ?? l10n.mathMaze_title,
      subtitle: l10n.mathMaze_subtitle,
      notice: l10n.mathMaze_gateHint,
      startLabel: l10n.mathMaze_startGame,
      selectLabel: l10n.mathMaze_selectLevel,
      groups: [
        SetupGroup('difficulty', l10n.mathMaze_chooseLevel, [
          for (final d in kQuizDifficulties)
            SetupOption(d, quizDifficultyLabel(l10n, d),
                emoji: quizDifficultyEmoji(d), description: desc[d]),
        ]),
      ],
      buildRoute: (s) => '/math-maze/play?difficulty=${s['difficulty']}',
    );
  }
}

class MathMazeGameScreen extends ConsumerWidget {
  const MathMazeGameScreen(
      {super.key, required this.difficulty, this.questContext});

  final String difficulty;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, quest: questContext);
    final provider = mazeControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: mazeSessionArgs(args),
      title: gameTitle(l10n, 'math-maze') ?? l10n.mathMaze_title,
      reviewType: gameById('math-maze')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) =>
          _MazeBoard(args: args, session: session),
    );
  }
}

class _MazeBoard extends ConsumerStatefulWidget {
  const _MazeBoard({required this.args, required this.session});

  final MazeArgs args;
  final GameSessionState session;

  @override
  ConsumerState<_MazeBoard> createState() => _MazeBoardState();
}

class _MazeBoardState extends ConsumerState<_MazeBoard> {
  Offset _drag = Offset.zero;
  final _answer = TextEditingController();

  @override
  void dispose() {
    _answer.dispose();
    super.dispose();
  }

  MazeController get _ctrl =>
      ref.read(mazeControllerProvider(widget.args).notifier);

  void _onPanUpdate(DragUpdateDetails d) {
    _drag += d.delta;
    if (_drag.dx.abs() < kMazeSwipeStep && _drag.dy.abs() < kMazeSwipeStep) {
      return;
    }
    if (_drag.dx.abs() > _drag.dy.abs()) {
      _ctrl.move(0, _drag.dx > 0 ? 1 : -1);
    } else {
      _ctrl.move(_drag.dy > 0 ? 1 : -1, 0);
    }
    _drag = Offset.zero;
  }

  void _submit() {
    final n = int.tryParse(_answer.text.trim());
    if (n == null) {
      return;
    }
    _ctrl.submitGate(n);
    _answer.clear();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(mazeControllerProvider(widget.args));
    final maze = state.maze;
    final remaining = _ctrl.timeRemaining(widget.session);
    return LayoutBuilder(builder: (context, outer) {
      // Room left for the maze after the stat chips and the d-pad. The page
      // does not scroll while playing, so a swipe on the maze is never taken
      // by the scroll view.
      final maxSide = (outer.maxHeight - 290).clamp(200.0, 420.0);
      return SingleChildScrollView(
        physics: state.gatePrompt ? null : const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                StatChip(
                  key: const Key('maze-time'),
                  label: l10n.mathMaze_timerLabel,
                  value: clockText(remaining),
                ),
                StatChip(
                  key: const Key('maze-gates'),
                  label: l10n.mathMaze_gatesLabel,
                  value: '${state.gatesSolved}/${maze.gates.length}',
                ),
                StatChip(
                  key: const Key('maze-stars'),
                  label: l10n.mathMaze_collectiblesLabel,
                  value: l10n.mathMaze_collected('${state.collected.length}',
                      '${maze.collectibles.length}'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            LayoutBuilder(builder: (context, box) {
              final side = box.maxWidth.clamp(0.0, maxSide);
              return Center(
                child: GestureDetector(
                  key: const Key('maze-swipe'),
                  behavior: HitTestBehavior.opaque,
                  onPanStart: (_) => _drag = Offset.zero,
                  onPanUpdate: _onPanUpdate,
                  child: SizedBox(
                    width: side,
                    height: side * maze.rows / maze.cols,
                    child: CustomPaint(
                      key: const Key('maze-canvas'),
                      painter: MazePainter(state),
                    ),
                  ),
                ),
              );
            }),
            const SizedBox(height: 10),
            if (state.gatePrompt)
              _gatePanel(context, l10n, state)
            else
              _dPad(l10n),
          ],
        ),
      );
    });
  }

  Widget _gatePanel(
      BuildContext context, AppLocalizations l10n, MazeState state) {
    final gate = state.activeGate!;
    final fb = state.feedbackCorrect;
    return Card(
      key: const Key('maze-gate-panel'),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(l10n.mathMaze_gatePrompt,
                style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            Text(gate.equation.display,
                key: const Key('maze-equation'),
                textAlign: TextAlign.center,
                style:
                    const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            TextField(
              key: const Key('maze-gate-input'),
              controller: _answer,
              enabled: fb == null,
              autofocus: true,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24),
              keyboardType: const TextInputType.numberWithOptions(signed: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'^-?[0-9]*'))
              ],
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                hintText: l10n.mobileBoard_mazeAnswerHint,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            if (fb == null)
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      key: const Key('maze-gate-submit'),
                      onPressed: _submit,
                      child: Text(l10n.mathMaze_submitAnswer),
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    key: const Key('maze-gate-close'),
                    onPressed: _ctrl.closeGate,
                    child: Text(l10n.game_close),
                  ),
                ],
              )
            else
              Container(
                key: const Key('maze-gate-feedback'),
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (fb ? AppTheme.success : AppTheme.error)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  fb
                      ? l10n.mathMaze_correct
                      : l10n.mathMaze_incorrect('${gate.equation.answer}'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: fb ? AppTheme.success : AppTheme.error,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _dPad(AppLocalizations l10n) {
    Widget btn(String key, IconData icon, String label, int dr, int dc) =>
        SizedBox(
          width: 64,
          height: 56,
          child: FilledButton.tonal(
            key: Key(key),
            style: FilledButton.styleFrom(padding: EdgeInsets.zero),
            onPressed: () => _ctrl.move(dr, dc),
            child: Icon(icon, size: 30, semanticLabel: label),
          ),
        );
    return Column(
      children: [
        Text(l10n.mobileBoard_mazeControls,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 8),
        btn('maze-pad-up', Icons.keyboard_arrow_up, l10n.mobileBoard_moveUp, -1,
            0),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            btn('maze-pad-left', Icons.keyboard_arrow_left,
                l10n.mobileBoard_moveLeft, 0, -1),
            const SizedBox(width: 64),
            btn('maze-pad-right', Icons.keyboard_arrow_right,
                l10n.mobileBoard_moveRight, 0, 1),
          ],
        ),
        btn('maze-pad-down', Icons.keyboard_arrow_down,
            l10n.mobileBoard_moveDown, 1, 0),
      ],
    );
  }
}

/// Draws the maze grid, gates, stars, exit and the player.
class MazePainter extends CustomPainter {
  MazePainter(this.state);

  final MazeState state;

  void _emoji(Canvas canvas, String text, Offset center, double fontSize) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: TextStyle(fontSize: fontSize)),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, center - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  void paint(Canvas canvas, Size size) {
    final maze = state.maze;
    final cell = size.width / maze.cols;
    final paint = Paint();
    for (var r = 0; r < maze.rows; r++) {
      for (var c = 0; c < maze.cols; c++) {
        final rect = Rect.fromLTWH(c * cell, r * cell, cell, cell).deflate(0.5);
        final type = maze.grid[r][c];
        final key = MazePos(r, c).key;
        Color color;
        switch (type) {
          case MazeCell.wall:
            color = const Color(0xFF1F2937);
          case MazeCell.start:
            color = const Color(0xFF60A5FA);
          case MazeCell.exit:
            color = const Color(0xFF4ADE80);
          case MazeCell.gate:
            color = switch (state.gateStates[key]) {
              GateState.open => const Color(0xFF86EFAC),
              GateState.blocked => const Color(0xFFF87171),
              _ => const Color(0xFFFDE047),
            };
          default:
            color = const Color(0xFFF3F4F6);
        }
        canvas.drawRect(rect, paint..color = color);
        final center = rect.center;
        if (type == MazeCell.gate &&
            state.gateStates[key] == GateState.locked) {
          _emoji(canvas, '🔒', center, cell * 0.55);
        } else if (type == MazeCell.collectible &&
            !state.collected.contains(key)) {
          _emoji(canvas, '⭐', center, cell * 0.55);
        } else if (type == MazeCell.exit) {
          _emoji(canvas, '🏁', center, cell * 0.55);
        }
      }
    }
    final p = state.player;
    final center = Offset((p.col + 0.5) * cell, (p.row + 0.5) * cell);
    canvas.drawCircle(
        center, cell * 0.38, paint..color = const Color(0xFF6366F1));
    canvas.drawCircle(
      center,
      cell * 0.38,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = const Color(0xFF4338CA),
    );
  }

  @override
  bool shouldRepaint(MazePainter old) => old.state != state;
}
