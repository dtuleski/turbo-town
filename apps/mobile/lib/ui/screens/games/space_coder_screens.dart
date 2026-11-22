import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/quest_models.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/space_coder/logic.dart';
import '../../../game/space_coder/space_coder_controller.dart';
import '../../../l10n/gen/app_localizations.dart';
import 'board_widgets.dart';
import 'how_to_play_card.dart';
import 'picker_setup.dart';

const Map<Direction, String> _arrow = {
  Direction.up: '↑',
  Direction.right: '→',
  Direction.down: '↓',
  Direction.left: '←',
};

const Color _terminal = Color(0xFF020617);
const Color _green = Color(0xFF4ADE80);
const Color _dimGreen = Color(0xFF166534);

String spaceHint(AppLocalizations l, String key) => switch (key) {
      'easy1' => l.scratchCoding_hints_easy1,
      'easy2' => l.scratchCoding_hints_easy2,
      'easy3' => l.scratchCoding_hints_easy3,
      'easy4' => l.scratchCoding_hints_easy4,
      'easy5' => l.scratchCoding_hints_easy5,
      'medium1' => l.scratchCoding_hints_medium1,
      'medium2' => l.scratchCoding_hints_medium2,
      'medium3' => l.scratchCoding_hints_medium3,
      'medium4' => l.scratchCoding_hints_medium4,
      'medium5' => l.scratchCoding_hints_medium5,
      'hard1' => l.scratchCoding_hints_hard1,
      'hard2' => l.scratchCoding_hints_hard2,
      'hard3' => l.scratchCoding_hints_hard3,
      'hard4' => l.scratchCoding_hints_hard4,
      'hard5' => l.scratchCoding_hints_hard5,
      _ => key,
    };

String spaceFailText(AppLocalizations l, SpaceFail f) => switch (f) {
      SpaceFail.noObstacleToJump => l.spaceCoder_errors_noObstacleToJump,
      SpaceFail.jumpLandingBlocked => l.spaceCoder_errors_jumpLandingBlocked,
      SpaceFail.infiniteLoop => l.spaceCoder_errors_infiniteLoop,
      SpaceFail.undefinedVarNum => l.spaceCoder_errors_undefinedVarNum,
      SpaceFail.undefinedVarChar => l.spaceCoder_errors_undefinedVarChar,
      SpaceFail.hitObstacle => l.spaceCoder_errors_hitObstacle,
      SpaceFail.hitWall => l.scratchCoding_game_hitWall,
      SpaceFail.offGrid => l.scratchCoding_game_offGrid,
      SpaceFail.notReached => l.scratchCoding_game_didntReachGoal,
    };

String _difficultyLabel(AppLocalizations l, String d) => switch (d) {
      'medium' => l.scratchCoding_difficulty_medium_label,
      'hard' => l.scratchCoding_difficulty_hard_label,
      _ => l.scratchCoding_difficulty_easy_label,
    };

const Map<String, String> _difficultyEmoji = {'easy': '🟢', 'medium': '🟡', 'hard': '🔴'};

class SpaceCoderSetupScreen extends StatelessWidget {
  const SpaceCoderSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy':
          '${l10n.scratchCoding_difficulty_easy_desc}\n${l10n.scratchCoding_difficulty_easy_features}',
      'medium':
          '${l10n.scratchCoding_difficulty_medium_desc}\n${l10n.scratchCoding_difficulty_medium_features}',
      'hard':
          '${l10n.scratchCoding_difficulty_hard_desc}\n${l10n.scratchCoding_difficulty_hard_features}',
    };
    return PickerSetupScreen(
      title: '💻 ${l10n.scratchCoding_title}',
      subtitle: l10n.scratchCoding_subtitle,
      startLabel: l10n.scratchCoding_startCoding,
      selectLabel: l10n.scratchCoding_chooseDifficulty,
      groups: [
        SetupGroup('difficulty', l10n.scratchCoding_chooseDifficulty, [
          for (final d in kSpaceCoderDifficulties)
            SetupOption(d, _difficultyLabel(l10n, d),
                emoji: _difficultyEmoji[d], description: desc[d]),
        ]),
      ],
      footer: [
        HowToPlayCard(title: l10n.scratchCoding_howToPlay, steps: [
          l10n.scratchCoding_howToPlayStep1,
          l10n.scratchCoding_howToPlayStep2,
          l10n.scratchCoding_howToPlayStep3,
        ]),
      ],
      buildRoute: (s) => '/scratch-coding/play?difficulty=${s['difficulty']}',
    );
  }
}

class SpaceCoderGameScreen extends ConsumerWidget {
  const SpaceCoderGameScreen({super.key, required this.difficulty, this.questContext});

  final String difficulty;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, quest: questContext);
    final provider = spaceCoderControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: spaceCoderSessionArgs(args),
      title: l10n.scratchCoding_title,
      reviewType: gameById('scratch-coding')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _SpaceBoard(args: args, session: session),
    );
  }
}

class _SpaceBoard extends ConsumerWidget {
  const _SpaceBoard({required this.args, required this.session});
  final SpaceCoderArgs args;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(spaceCoderControllerProvider(args));
    final ctrl = ref.read(spaceCoderControllerProvider(args).notifier);
    final level = state.level;
    final building = state.phase == SpacePhase.building;
    final lines = state.lineCount;
    final lastLevel = level.levelNumber >= ctrl.totalLevels;
    final lineColor = lines <= level.optimalLines
        ? const Color(0xFF16A34A)
        : (lines <= level.maxLines ? const Color(0xFFCA8A04) : const Color(0xFFDC2626));

    return LayoutBuilder(builder: (context, box) {
      final cell = ((box.maxWidth - 40) / level.cols - 2).clamp(18.0, 52.0).floorToDouble();
      return SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 14,
              children: [
                Text('⏱ ${clockText(session.elapsedSeconds)}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(
                  l10n.scratchCoding_game_level('${level.levelNumber}', '${ctrl.totalLevels}'),
                  key: const Key('space-level'),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                Text(
                    '${_difficultyEmoji[args.difficulty] ?? ''} ${_difficultyLabel(l10n, args.difficulty)}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0x1A6366F1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0x4D818CF8)),
              ),
              child: Row(
                children: [
                  Expanded(child: Text(l10n.mobileSpaceCoder_goal('${level.optimalLines}'))),
                  const SizedBox(width: 8),
                  Text('$lines/${level.maxLines}',
                      key: const Key('space-lines'),
                      style: TextStyle(
                          fontFamily: 'monospace', fontWeight: FontWeight.w800, color: lineColor)),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Text('💡 ${spaceHint(l10n, level.hint)}', key: const Key('space-hint')),
            const SizedBox(height: 8),
            Center(child: _Stage(state: state, cell: cell)),
            const SizedBox(height: 10),
            _Palette(state: state, controller: ctrl, difficulty: args.difficulty),
            const SizedBox(height: 8),
            _Editor(state: state, controller: ctrl),
            const SizedBox(height: 8),
            FilledButton(
              key: const Key('space-run'),
              onPressed: building && state.program.isNotEmpty ? ctrl.run : null,
              child: Text(state.phase == SpacePhase.running
                  ? l10n.mobileSpaceCoder_running
                  : '▶ ${l10n.scratchCoding_game_run}'),
            ),
            if (state.phase == SpacePhase.success) ...[
              const SizedBox(height: 12),
              Card(
                key: const Key('space-success'),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      const Text('✅', style: TextStyle(fontSize: 40)),
                      Text(l10n.scratchCoding_game_levelComplete,
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text(
                        '${l10n.scratchCoding_game_blocksUsedCount('$lines')} / '
                        '${l10n.scratchCoding_game_optimalHint('${level.optimalLines}')}',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        lines <= level.optimalLines
                            ? l10n.spaceCoder_efficiency_perfectCode
                            : (lines <= level.optimalLines + 2
                                ? l10n.spaceCoder_efficiency_cleanCode
                                : '🤔 ${l10n.scratchCoding_nesting_canImprove}'),
                        key: const Key('space-efficiency'),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        key: const Key('space-next'),
                        onPressed: ctrl.nextLevel,
                        child: Text(lastLevel
                            ? l10n.scratchCoding_game_seeScore
                            : l10n.scratchCoding_game_nextLevel),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (state.phase == SpacePhase.fail) ...[
              const SizedBox(height: 12),
              Card(
                key: const Key('space-fail'),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      const Text('☄', style: TextStyle(fontSize: 40)),
                      Text(spaceFailText(l10n, state.fail ?? SpaceFail.notReached),
                          key: const Key('space-fail-text'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                      Text(l10n.scratchCoding_game_tryDifferent),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        alignment: WrapAlignment.center,
                        children: [
                          FilledButton(
                            key: const Key('space-retry'),
                            onPressed: ctrl.retry,
                            child: Text(l10n.scratchCoding_game_tryAgain),
                          ),
                          OutlinedButton(
                            key: const Key('space-end'),
                            onPressed: ctrl.endGame,
                            child: Text(l10n.scratchCoding_game_endGame),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      );
    });
  }
}

class _Stage extends StatelessWidget {
  const _Stage({required this.state, required this.cell});
  final SpaceCoderState state;
  final double cell;

  @override
  Widget build(BuildContext context) {
    final level = state.level;
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x4D06B6D4), width: 2),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var r = 0; r < level.rows; r++)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var c = 0; c < level.cols; c++)
                  _SpaceCell(
                    key: Key('space-cell-$r-$c'),
                    type: level.grid[r][c],
                    isGoal: level.goal == Position(r, c),
                    hasChar: state.charPos == Position(r, c),
                    dir: state.charDir,
                    size: cell,
                    star: (r * 7 + c * 13) % 10,
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _SpaceCell extends StatelessWidget {
  const _SpaceCell({
    super.key,
    required this.type,
    required this.isGoal,
    required this.hasChar,
    required this.dir,
    required this.size,
    required this.star,
  });
  final CellType type;
  final bool isGoal;
  final bool hasChar;
  final Direction dir;
  final double size;
  final int star;

  @override
  Widget build(BuildContext context) {
    var bg = const Color(0x990F172A);
    var content = '';
    if (type == CellType.empty && !hasChar && !isGoal) {
      content = star < 2 ? '✦' : (star < 4 ? '·' : '');
    }
    if (type == CellType.wall) {
      bg = const Color(0xFF64748B);
      content = '🪨';
    }
    if (type == CellType.obstacle) {
      bg = const Color(0x66783F04);
      content = '🪨';
    }
    if (isGoal && !hasChar) {
      bg = const Color(0x66164E63);
      content = '🚀';
    }
    if (hasChar) content = '🧑‍🚀';
    return Container(
      width: size,
      height: size,
      margin: const EdgeInsets.all(1),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.white10),
      ),
      alignment: Alignment.center,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Text(content,
              style: TextStyle(
                  fontSize: size * 0.5, color: content.length == 1 ? Colors.white38 : null)),
          if (hasChar)
            Positioned(
              top: -size * 0.12,
              right: -size * 0.12,
              child: Container(
                width: size * 0.4,
                height: size * 0.4,
                alignment: Alignment.center,
                decoration: const BoxDecoration(color: Color(0xFFA855F7), shape: BoxShape.circle),
                child: Text(_arrow[dir]!,
                    key: const Key('space-char-dir'),
                    style: TextStyle(fontSize: size * 0.22, color: Colors.white)),
              ),
            ),
        ],
      ),
    );
  }
}

class _Palette extends StatelessWidget {
  const _Palette({required this.state, required this.controller, required this.difficulty});
  final SpaceCoderState state;
  final SpaceCoderController controller;
  final String difficulty;

  Widget _button(BuildContext context, CommandDefinition def, bool enabled) {
    final chip = Opacity(
      opacity: enabled ? 1 : 0.4,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0x8022C55E)),
        ),
        child: Text(def.text,
            style: const TextStyle(
                color: _green, fontFamily: 'monospace', fontWeight: FontWeight.w700, fontSize: 13)),
      ),
    );
    final tap = Material(
      color: Colors.transparent,
      child: InkWell(
        key: Key('space-add-${def.type.id}'),
        borderRadius: BorderRadius.circular(8),
        onTap: enabled ? () => controller.insert(def.type) : null,
        child: chip,
      ),
    );
    if (!enabled) return tap;
    return LongPressDraggable<CommandType>(
      data: def.type,
      delay: const Duration(milliseconds: 150),
      feedback: Material(color: Colors.transparent, child: chip),
      childWhenDragging: Opacity(opacity: 0.3, child: chip),
      child: tap,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final enabled = state.phase == SpacePhase.building && !state.maxReached;
    final commands = commandsForDifficulty(difficulty);
    final regular = [
      for (final c in commands)
        if (!kVariableCommands.contains(c.type)) c
    ];
    final variables = [
      for (final c in commands)
        if (kVariableCommands.contains(c.type)) c
    ];
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xCC000000),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x4D22C55E)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.scratchCoding_game_blocks.toUpperCase(),
              style: const TextStyle(
                  color: Color(0x994ADE80), fontSize: 11, fontWeight: FontWeight.w800)),
          if (state.maxReached)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(l10n.spaceCoder_editor_maxLinesReached,
                  key: const Key('space-max-lines'),
                  style: const TextStyle(
                      color: Color(0xFFFDE047), fontSize: 11, fontWeight: FontWeight.w700)),
            ),
          const SizedBox(height: 6),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final d in regular) _button(context, d, enabled),
          ]),
          if (variables.isNotEmpty) ...[
            const Divider(color: Color(0x3322C55E)),
            Text(l10n.spaceCoder_variables_sectionTitle.toUpperCase(),
                style: const TextStyle(
                    color: Color(0x804ADE80), fontSize: 10, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final d in variables) _button(context, d, enabled),
            ]),
          ],
          const SizedBox(height: 6),
          Text(l10n.mobileSpaceCoder_dragHint,
              style: const TextStyle(color: Color(0x994ADE80), fontSize: 11)),
        ],
      ),
    );
  }
}

class _Editor extends StatelessWidget {
  const _Editor({required this.state, required this.controller});
  final SpaceCoderState state;
  final SpaceCoderController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final building = state.phase == SpacePhase.building;
    final lines = programToText(state.program);
    final mappings = buildLineMapping(state.program);
    final cursorLine = cursorLinePosition(state.program, state.cursor);
    const mono = TextStyle(color: _green, fontFamily: 'monospace', fontSize: 13, height: 1.3);

    Widget cursorBar(int at) => Container(
          key: Key('space-cursor-$at'),
          height: 3,
          margin: const EdgeInsets.only(left: 28, top: 2, bottom: 2),
          decoration: BoxDecoration(color: _green, borderRadius: BorderRadius.circular(2)),
        );

    final rows = <Widget>[];
    for (var i = 0; i < lines.length; i++) {
      if (building && cursorLine == i) rows.add(cursorBar(i));
      final m = mappings[i];
      final highlighted = state.highlightedLine == i;
      rows.add(DragTarget<CommandType>(
        onWillAcceptWithDetails: (_) => building && !state.maxReached,
        onAcceptWithDetails: (d) => controller.insert(d.data, line: i),
        builder: (context, candidates, _) => InkWell(
          key: Key('space-line-$i'),
          onTap: building ? () => controller.selectLine(i) : null,
          child: Container(
            color: highlighted
                ? const Color(0x99155E75)
                : (candidates.isNotEmpty ? const Color(0x33166534) : null),
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              children: [
                SizedBox(
                  width: 24,
                  child: Text('${i + 1}',
                      textAlign: TextAlign.right, style: mono.copyWith(color: _dimGreen)),
                ),
                const SizedBox(width: 6),
                Expanded(
                    child: _LineContent(
                        text: lines[i], mapping: m, controller: controller, enabled: building)),
                if (building)
                  IconButton(
                    key: Key('space-remove-$i'),
                    tooltip: l10n.mobileSpaceCoder_removeLine('${i + 1}'),
                    visualDensity: VisualDensity.compact,
                    iconSize: 16,
                    color: const Color(0xB3F87171),
                    icon: const Icon(Icons.close),
                    onPressed: () => controller.removeLine(i),
                  ),
              ],
            ),
          ),
        ),
      ));
    }
    if (building && lines.isNotEmpty && cursorLine >= lines.length) {
      rows.add(cursorBar(lines.length));
    }

    return DragTarget<CommandType>(
      onWillAcceptWithDetails: (_) => building && !state.maxReached,
      onAcceptWithDetails: (d) => controller.insert(d.data),
      builder: (context, candidates, _) => Container(
        key: const Key('space-editor'),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: _terminal,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: candidates.isNotEmpty ? _green : const Color(0x4D22C55E),
              width: candidates.isNotEmpty ? 2 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(l10n.scratchCoding_game_program.toUpperCase(),
                      style: const TextStyle(
                          color: Color(0x994ADE80), fontSize: 11, fontWeight: FontWeight.w800)),
                ),
                Text('${state.lineCount}/${state.level.maxLines}',
                    style: const TextStyle(
                        color: Color(0x664ADE80), fontSize: 11, fontWeight: FontWeight.w800)),
              ],
            ),
            const SizedBox(height: 6),
            if (lines.isEmpty)
              Text('${l10n.spaceCoder_editor_insertionHint} ▌',
                  key: const Key('space-empty'),
                  style: mono.copyWith(color: const Color(0x4D22C55E), fontStyle: FontStyle.italic))
            else
              ...rows,
            if (building && state.program.isNotEmpty)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  key: const Key('space-clear'),
                  onPressed: controller.clear,
                  child: Text(l10n.scratchCoding_game_clearAll,
                      style: const TextStyle(color: Color(0xFFF87171), fontFamily: 'monospace')),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// One editor line: plain text, or inline editors for loop counts, conditions
/// and variable values (web CodeEditor).
class _LineContent extends StatelessWidget {
  const _LineContent({
    required this.text,
    required this.mapping,
    required this.controller,
    required this.enabled,
  });
  final String text;
  final LineMapping mapping;
  final SpaceCoderController controller;
  final bool enabled;

  static const TextStyle _mono =
      TextStyle(color: _green, fontFamily: 'monospace', fontSize: 13, height: 1.3);
  static const List<String> _letters = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', //
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  ];

  // Scaled down rather than overflowing when a long condition meets a narrow phone.
  Widget _drop<T>(Key key, T value, List<(T, String)> items, void Function(T) onChanged) =>
      FittedBox(
          fit: BoxFit.scaleDown,
          child: DropdownButton<T>(
            key: key,
            value: value,
            isDense: true,
            dropdownColor: const Color(0xFF052E16),
            underline: const SizedBox.shrink(),
            style: _mono.copyWith(fontSize: 12, fontWeight: FontWeight.w700),
            iconEnabledColor: _green,
            items: [
              for (final (v, label) in items) DropdownMenuItem<T>(value: v, child: Text(label))
            ],
            onChanged: enabled ? (v) => v == null ? null : onChanged(v) : null,
          ));

  Widget _stepper(
          Key key, int value, int min, int max, void Function(int) onChanged, String label) =>
      Row(
        key: key,
        mainAxisSize: MainAxisSize.min,
        children: [
          _tiny(
              Icons.remove, enabled && value > min ? () => onChanged(value - 1) : null, '$label -'),
          Text('$value', style: _mono.copyWith(fontWeight: FontWeight.w800)),
          _tiny(Icons.add, enabled && value < max ? () => onChanged(value + 1) : null, '$label +'),
        ],
      );

  Widget _tiny(IconData icon, VoidCallback? onTap, String label) => Semantics(
        label: label,
        button: true,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: Icon(icon, size: 16, color: onTap == null ? _dimGreen : _green),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final cmd = mapping.command;
    final indent = text.length - text.trimLeft().length;
    final pad = SizedBox(width: indent * 7.0);
    if (mapping.lineType != LineType.opening && mapping.lineType != LineType.simple) {
      return Text(text, style: _mono);
    }
    switch (cmd.type) {
      case CommandType.loop when mapping.lineType == LineType.opening:
        return Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
          pad,
          const Text('loop(', style: _mono),
          _stepper(Key('space-loop-${cmd.id}'), cmd.parameter ?? 2, 1, 20,
              (v) => controller.setLoopCount(cmd.id, v), l10n.mobileSpaceCoder_loopCount),
          const Text(')', style: _mono),
        ]);
      case CommandType.ifCmd || CommandType.whileCmd when mapping.lineType == LineType.opening:
        final cond = cmd.condition ??
            SensorCondition(
                cmd.type == CommandType.ifCmd ? SensorType.obstacleAhead : SensorType.notAtGoal);
        final compare = cond is ComparisonCondition;
        return Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 2, children: [
          pad,
          Text(cmd.type == CommandType.ifCmd ? 'if(' : 'while(', style: _mono),
          _drop<bool>(
            Key('space-mode-${cmd.id}'),
            compare,
            [
              (false, l10n.spaceCoder_conditions_sensorMode),
              (true, l10n.spaceCoder_conditions_comparisonMode)
            ],
            (v) => controller.setCondition(
              cmd.id,
              v
                  ? const ComparisonCondition(Variable.num, ComparisonOperator.lt, 0)
                  : const SensorCondition(SensorType.obstacleAhead),
            ),
          ),
          if (cond is SensorCondition)
            _drop<SensorType>(
              Key('space-sensor-${cmd.id}'),
              cond.sensor,
              [for (final s in SensorType.values) (s, '${s.id}()')],
              (v) => controller.setCondition(cmd.id, SensorCondition(v)),
            ),
          if (cond is ComparisonCondition) ...[
            _drop<Variable>(
              Key('space-var-${cmd.id}'),
              cond.variable,
              [for (final v in Variable.values) (v, v.id)],
              (v) => controller.setCondition(
                cmd.id,
                ComparisonCondition(v, cond.operator, v == Variable.num ? 0 : 'a'),
              ),
            ),
            _drop<ComparisonOperator>(
              Key('space-op-${cmd.id}'),
              cond.operator,
              [for (final o in ComparisonOperator.values) (o, o.symbol)],
              (v) => controller.setCondition(cmd.id, cond.copyWith(operator: v)),
            ),
            if (cond.variable == Variable.num)
              _stepper(Key('space-value-${cmd.id}'), cond.value as int, -99, 99,
                  (v) => controller.setCondition(cmd.id, cond.copyWith(value: v)), 'value')
            else
              _drop<String>(
                Key('space-char-${cmd.id}'),
                cond.value as String,
                [for (final ch in _letters) (ch, ch)],
                (v) => controller.setCondition(cmd.id, cond.copyWith(value: v)),
              ),
          ],
          const Text(')', style: _mono),
        ]);
      case CommandType.varNumDecl:
        return Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
          pad,
          const Text('var-num = ', style: _mono),
          _stepper(Key('space-num-${cmd.id}'), (cmd.varValue as int?) ?? 0, -99, 99,
              (v) => controller.setVarValue(cmd.id, v), l10n.spaceCoder_variables_numLabel),
        ]);
      case CommandType.varCharDecl:
        return Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
          pad,
          const Text("var-char = '", style: _mono),
          _drop<String>(
            Key('space-charval-${cmd.id}'),
            (cmd.varValue as String?) ?? 'a',
            [for (final ch in _letters) (ch, ch)],
            (v) => controller.setVarValue(cmd.id, v),
          ),
          const Text("'", style: _mono),
        ]);
      default:
        return Text(text, style: _mono);
    }
  }
}
