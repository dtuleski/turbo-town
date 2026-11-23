import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/quest_models.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/jigsaw/jigsaw_controller.dart';
import '../../../game/jigsaw/logic.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/stat_chip.dart';
import 'board_widgets.dart';
import 'jigsaw_scene.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

String jigsawImageName(AppLocalizations l10n, String id) => switch (id) {
      'mountains' => l10n.mobileBoard_imageMountains,
      'forest' => l10n.mobileBoard_imageForest,
      'ocean' => l10n.mobileBoard_imageOcean,
      'space' => l10n.mobileBoard_imageSpace,
      'garden' => l10n.mobileBoard_imageGarden,
      'city' => l10n.mobileBoard_imageCity,
      'arctic' => l10n.mobileBoard_imageArctic,
      _ => l10n.mobileBoard_imageSunset,
    };

class JigsawSetupScreen extends StatelessWidget {
  const JigsawSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final detail = {
      'easy': l10n.mobileBoard_jigsawEasyDetail,
      'medium': l10n.mobileBoard_jigsawMediumDetail,
      'hard': l10n.mobileBoard_jigsawHardDetail,
    };
    return PickerSetupScreen(
      title: gameTitle(l10n, 'jigsaw-puzzle') ?? 'Jigsaw Puzzle',
      subtitle: l10n.mobileBoard_jigsawSubtitle,
      startLabel: l10n.mobileBoard_startPuzzle,
      selectLabel: l10n.mobileBoard_selectDifficultyAndImage,
      groups: [
        SetupGroup('difficulty', l10n.mobileBoard_chooseLevel, [
          for (final d in kQuizDifficulties)
            SetupOption(
              d,
              quizDifficultyLabel(l10n, d),
              emoji: quizDifficultyEmoji(d),
              description:
                  '${l10n.mobileBoard_jigsawGrid('${jigsawGridSize(d)}', '${jigsawGridSize(d) * jigsawGridSize(d)}')} · ${detail[d]}',
            ),
        ]),
        SetupGroup('image', l10n.mobileBoard_chooseImage, [
          for (final i in kJigsawImages)
            SetupOption(i.id, jigsawImageName(l10n, i.id), emoji: i.emoji),
        ]),
      ],
      buildRoute: (s) => '/jigsaw-puzzle/play?difficulty=${s['difficulty']}&image=${s['image']}',
    );
  }
}

class JigsawGameScreen extends ConsumerWidget {
  const JigsawGameScreen({
    super.key,
    required this.difficulty,
    required this.image,
    this.questContext,
  });

  final String difficulty;
  final String image;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, image: image, quest: questContext);
    final provider = jigsawControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: jigsawSessionArgs(args),
      title: gameTitle(l10n, 'jigsaw-puzzle') ?? 'Jigsaw Puzzle',
      reviewType: gameById('jigsaw-puzzle')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _JigsawBoard(args: args, session: session),
    );
  }
}

class _JigsawBoard extends ConsumerWidget {
  const _JigsawBoard({required this.args, required this.session});

  final JigsawArgs args;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(jigsawControllerProvider(args));
    final ctrl = ref.read(jigsawControllerProvider(args).notifier);
    final n = state.gridSize;
    return LayoutBuilder(builder: (context, box) {
      final side = (box.maxWidth - 24).clamp(0.0, 400.0);
      // Each cell has a 0.5 px margin on every side, and the board a 2 px pad.
      final cell = ((side - 4) / n - 1).floorToDouble();
      final board = (cell + 1) * n;
      final tray = state.tray;
      final trayCell = (cell.clamp(48.0, 72.0)).toDouble();
      return SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                StatChip(
                  key: const Key('jigsaw-time'),
                  label: l10n.mobileBoard_timeLabel,
                  value: clockText(session.elapsedSeconds),
                ),
                StatChip(
                  key: const Key('jigsaw-moves'),
                  label: l10n.mobileBoard_moves,
                  value: '${state.moves}',
                ),
                StatChip(
                  key: const Key('jigsaw-left'),
                  label: '',
                  value: l10n.mobileBoard_piecesLeft('${tray.length}'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton.icon(
                  key: const Key('jigsaw-reference-toggle'),
                  onPressed: ctrl.toggleReference,
                  icon: const Icon(Icons.visibility_outlined),
                  label: Text(state.showReference
                      ? l10n.mobileBoard_hideReference
                      : l10n.mobileBoard_showReference),
                ),
              ],
            ),
            if (state.showReference)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: SizedBox(
                  key: const Key('jigsaw-reference'),
                  width: 96,
                  height: 96,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: CustomPaint(painter: JigsawScenePainter(args.image)),
                  ),
                ),
              ),
            if (state.selectedId != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: StatusPill(l10n.mobileBoard_pieceSelected, color: AppTheme.green),
              ),
            Container(
              width: board + 4,
              height: board + 4,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: const Color(0xFFD1D5DB),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  for (var r = 0; r < n; r++)
                    Row(
                      children: [
                        for (var c = 0; c < n; c++)
                          _BoardCell(
                            key: Key('jigsaw-cell-$r-$c'),
                            row: r,
                            col: c,
                            size: cell,
                            gridSize: n,
                            image: args.image,
                            state: state,
                            onTap: () => ctrl.place(r, c),
                            onDrop: (id) => ctrl.place(r, c, id: id),
                          ),
                      ],
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              alignment: WrapAlignment.center,
              children: [
                for (final p in tray)
                  _TrayPiece(
                    key: Key('jigsaw-piece-${p.id}'),
                    piece: p,
                    size: trayCell,
                    gridSize: n,
                    image: args.image,
                    selected: state.selectedId == p.id,
                    onTap: () => ctrl.selectPiece(p.id),
                  ),
              ],
            ),
          ],
        ),
      );
    });
  }
}

class _BoardCell extends StatelessWidget {
  const _BoardCell({
    super.key,
    required this.row,
    required this.col,
    required this.size,
    required this.gridSize,
    required this.image,
    required this.state,
    required this.onTap,
    required this.onDrop,
  });

  final int row;
  final int col;
  final double size;
  final int gridSize;
  final String image;
  final JigsawState state;
  final VoidCallback onTap;
  final void Function(int id) onDrop;

  @override
  Widget build(BuildContext context) {
    final placed = state.pieceAt(row, col);
    final wrong = state.wrongCell == '$row,$col';
    final target = state.selectedId != null && placed == null;
    return DragTarget<int>(
      onWillAcceptWithDetails: (_) => placed == null,
      onAcceptWithDetails: (d) => onDrop(d.data),
      builder: (context, candidates, _) => GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          width: size,
          height: size,
          margin: const EdgeInsets.all(0.5),
          decoration: BoxDecoration(
            color: wrong
                ? const Color(0xFFFECACA)
                : candidates.isNotEmpty
                    ? const Color(0xFFBBF7D0)
                    : target
                        ? const Color(0xFFD1FAE5)
                        : Colors.white,
            border: wrong ? Border.all(color: AppTheme.error, width: 2) : null,
          ),
          child: placed == null
              ? null
              : CustomPaint(
                  painter: JigsawScenePainter(image,
                      gridSize: gridSize, pieceRow: placed.row, pieceCol: placed.col),
                ),
        ),
      ),
    );
  }
}

class _TrayPiece extends StatelessWidget {
  const _TrayPiece({
    super.key,
    required this.piece,
    required this.size,
    required this.gridSize,
    required this.image,
    required this.selected,
    required this.onTap,
  });

  final PuzzlePiece piece;
  final double size;
  final int gridSize;
  final String image;
  final bool selected;
  final VoidCallback onTap;

  Widget _face({double? scale}) => SizedBox(
        width: size * (scale ?? 1),
        height: size * (scale ?? 1),
        child: CustomPaint(
          painter: JigsawScenePainter(image,
              gridSize: gridSize, pieceRow: piece.row, pieceCol: piece.col),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final face = Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: selected ? AppTheme.green : const Color(0xFF9CA3AF),
          width: selected ? 3 : 1,
        ),
      ),
      child: ClipRRect(borderRadius: BorderRadius.circular(4), child: _face()),
    );
    // A short press-and-hold starts a drag, so a quick swipe on the tray
    // still scrolls the page and a tap selects the piece.
    return LongPressDraggable<int>(
      data: piece.id,
      delay: const Duration(milliseconds: 150),
      feedback: Opacity(opacity: 0.85, child: _face(scale: 1.15)),
      childWhenDragging: Opacity(opacity: 0.3, child: face),
      child: GestureDetector(onTap: onTap, child: face),
    );
  }
}
