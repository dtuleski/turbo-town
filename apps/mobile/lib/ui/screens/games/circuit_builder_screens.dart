import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/quest_models.dart';
import '../../../game/circuit/circuit_controller.dart';
import '../../../game/circuit/engine/engine.dart';
import '../../../game/circuit/geometry.dart';
import '../../../game/circuit/presentation.dart';
import '../../../game/circuit/rover.dart';
import '../../../game/circuit/state.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/framework/game_setup_scaffold.dart';
import '../../../game/game_registry.dart';
import '../../../l10n/circuit_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/choice_tile.dart';
import 'circuit_painter.dart';

/// Route of a guided level.
String circuitPlayPath(LevelDefinition level) =>
    '/circuit-builder/play?difficulty=${level.difficulty}&level=${Uri.encodeQueryComponent(level.id)}';

/// `?difficulty=<1-4>&level=<id>`: a guided level whose own difficulty matches,
/// else null (web `parseGameSearch`).
LevelDefinition? parseCircuitLevel(Map<String, String> query) {
  final raw = query['difficulty'];
  final id = query['level'];
  if (raw == null || id == null || !RegExp(r'^[1-4]$').hasMatch(raw)) {
    return null;
  }
  final level = findGuidedLevel(id);
  if (level == null || level.difficulty != int.parse(raw)) return null;
  return level;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

class CircuitBuilderSetupScreen extends StatefulWidget {
  const CircuitBuilderSetupScreen({super.key});

  @override
  State<CircuitBuilderSetupScreen> createState() => _CircuitBuilderSetupScreenState();
}

class _CircuitBuilderSetupScreenState extends State<CircuitBuilderSetupScreen> {
  int _difficulty = 1;
  String? _levelId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final text = Theme.of(context).textTheme;
    final levels = guidedLevelsForDifficulty(_difficulty);
    final selected = levels.where((l) => l.id == _levelId).firstOrNull ?? levels.firstOrNull;
    return GameSetupScaffold(
      title: l10n.circuitBuilder_setup_title,
      startLabel: selected == null
          ? l10n.circuitBuilder_setup_selectDifficulty
          : l10n.circuitBuilder_setup_startLevel,
      onStart: selected == null ? null : () => context.push(circuitPlayPath(selected)),
      children: [
        Text(l10n.circuitBuilder_setup_subtitle,
            textAlign: TextAlign.center, style: text.titleMedium),
        const SizedBox(height: 4),
        Text(l10n.circuitBuilder_setup_description, textAlign: TextAlign.center),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.circuitBuilder_setup_howToPlay,
                    style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text('1. ${l10n.circuitBuilder_setup_step1}'),
                Text('2. ${l10n.circuitBuilder_setup_step2}'),
                Text('3. ${l10n.circuitBuilder_setup_step3}'),
                Text('4. ${l10n.circuitBuilder_setup_step4}'),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 12),
          child: Text(l10n.circuitBuilder_setup_chooseDifficulty, style: text.titleMedium),
        ),
        for (final d in const [1, 2, 3, 4])
          ChoiceTile(
            key: Key('circuit-difficulty-$d'),
            label: difficultyName(l10n, d),
            description: '${difficultySummary(l10n, d)}\n${difficultyDisclosure(l10n, d)}\n'
                '${difficultyLevels(l10n, d, guidedLevelsForDifficulty(d).length)}',
            selected: _difficulty == d,
            onTap: () => setState(() {
              _difficulty = d;
              _levelId = null;
            }),
          ),
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 12),
          child: Text(l10n.circuitBuilder_setup_chooseLevel, style: text.titleMedium),
        ),
        if (levels.isEmpty)
          Text(l10n.circuitBuilder_setup_noLevels, textAlign: TextAlign.center)
        else
          for (final (i, level) in levels.indexed)
            ChoiceTile(
              key: Key('circuit-level-${level.id}'),
              label: '${l10n.circuitBuilder_setup_levelNumber('${i + 1}')}: '
                  '${levelTitle(l10n, level.id)}',
              description: '${l10n.circuitBuilder_setup_concept}: ${levelGoal(l10n, level.id)}',
              selected: selected?.id == level.id,
              onTap: () => setState(() => _levelId = level.id),
            ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Text(l10n.circuitBuilder_setup_sandboxTitle,
                    style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(l10n.circuitBuilder_setup_sandboxDescription, textAlign: TextAlign.center),
                const SizedBox(height: 8),
                OutlinedButton(
                  key: const Key('circuit-sandbox'),
                  onPressed: () => context.push('/circuit-builder/sandbox'),
                  child: Text(l10n.circuitBuilder_setup_sandboxStart),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Guided game
// ---------------------------------------------------------------------------

class CircuitBuilderGameScreen extends ConsumerWidget {
  const CircuitBuilderGameScreen({super.key, required this.level, this.questContext});

  final LevelDefinition level;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (levelId: level.id, quest: questContext);
    final provider = circuitControllerProvider(args);
    ref.listen(provider, (_, __) {});
    final next = nextGuidedLevel(level.id);
    return GameSessionFrame(
      // One round per level: moving to the next level builds a fresh session.
      key: ValueKey('circuit-${level.id}'),
      args: circuitSessionArgs(args),
      title: l10n.circuitBuilder_setup_title,
      reviewType: gameById('circuit-builder')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      // Play Again goes back to the level list, like web.
      replacePlayAgain: () =>
          context.canPop() ? context.pop() : context.go('/circuit-builder/setup'),
      resultExtras: (context, result) => _SolvedExtras(
        level: level,
        next: next,
        inQuest: questContext != null || result.quest != null,
        onNext: () {
          // Levels of one difficulty share the round key (theme, difficulty), so
          // the finished round is reset before the next level starts its own.
          ref.read(gameSessionProvider(circuitSessionArgs(args)).notifier).reset();
          context.pushReplacement(circuitPlayPath(next!));
        },
      ),
      boardBuilder: (context, session) => _GuidedBoard(args: args, session: session),
    );
  }
}

class _SolvedExtras extends StatelessWidget {
  const _SolvedExtras({
    required this.level,
    required this.next,
    required this.inQuest,
    required this.onNext,
  });
  final LevelDefinition level;
  final LevelDefinition? next;
  final bool inQuest;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          key: const Key('circuit-learn'),
          margin: const EdgeInsets.only(top: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFECFEFF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF67E8F9)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.circuitBuilder_game_learnTitle,
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(levelLearn(l10n, level.id)),
              const SizedBox(height: 4),
              Text(l10n.circuitBuilder_result_serverScoreNote,
                  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        // From the Quest Map the way out is "Back to map".
        if (!inQuest && next != null) ...[
          const SizedBox(height: 12),
          FilledButton.tonal(
            key: const Key('circuit-next-level'),
            onPressed: onNext,
            child: Text(l10n.circuitBuilder_game_nextLevel),
          ),
        ],
      ],
    );
  }
}

class _GuidedBoard extends ConsumerStatefulWidget {
  const _GuidedBoard({required this.args, required this.session});
  final CircuitArgs args;
  final GameSessionState session;

  @override
  ConsumerState<_GuidedBoard> createState() => _GuidedBoardState();
}

class _GuidedBoardState extends ConsumerState<_GuidedBoard> {
  bool _hint = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final provider = circuitControllerProvider(widget.args);
    final state = ref.watch(provider);
    final ctrl = ref.read(provider.notifier);
    final level = ctrl.level;
    final submitting = widget.session.phase == SessionPhase.completing;
    final failure = state.failure;
    return _CircuitBoardView(
      state: state,
      controller: ctrl,
      header: [
        Text(levelTitle(l10n, level.id),
            key: const Key('circuit-title'),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text.rich(
            TextSpan(children: [
              TextSpan(
                  text: '${l10n.circuitBuilder_game_goal}: ',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              TextSpan(text: levelGoal(l10n, level.id)),
            ]),
            key: const Key('circuit-goal')),
        TextButton(
          key: const Key('circuit-hint'),
          onPressed: () => setState(() => _hint = !_hint),
          child:
              Text(_hint ? l10n.circuitBuilder_game_hideHint : l10n.circuitBuilder_game_showHint),
        ),
        if (_hint) Text(levelHint(l10n, level.id), key: const Key('circuit-hint-text')),
        if (submitting)
          _notice(l10n.circuitBuilder_game_submitting, const Color(0xFF0E7490),
              key: const Key('circuit-submitting')),
        if (failure == SubmitFailure.unavailable)
          _notice(l10n.circuitBuilder_game_submitFailed, const Color(0xFFB45309),
              key: const Key('circuit-submit-failed'),
              action: TextButton(
                key: const Key('circuit-retry'),
                onPressed: ctrl.retrySubmit,
                child: Text(l10n.circuitBuilder_game_retry),
              )),
        if (failure == SubmitFailure.rejected)
          _notice(l10n.circuitBuilder_game_rejected, const Color(0xFFB45309),
              key: const Key('circuit-rejected')),
      ],
    );
  }
}

Widget _notice(String text, Color color, {Key? key, Widget? action}) => Container(
      key: key,
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          Expanded(child: Text(text)),
          if (action != null) action,
        ],
      ),
    );

// ---------------------------------------------------------------------------
// Sandbox
// ---------------------------------------------------------------------------

class CircuitBuilderSandboxScreen extends ConsumerWidget {
  const CircuitBuilderSandboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(sandboxControllerProvider);
    final ctrl = ref.read(sandboxControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.circuitBuilder_setup_sandboxTitle)),
      body: SafeArea(
        child: _CircuitBoardView(
          state: state,
          controller: ctrl,
          header: [
            Chip(
              key: const Key('circuit-sandbox-badge'),
              label: Text(l10n.circuitBuilder_sandbox_badge),
            ),
            Text(l10n.circuitBuilder_sandbox_note, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// The board: canvas, tray, controls
// ---------------------------------------------------------------------------

class _CircuitBoardView extends StatelessWidget {
  const _CircuitBoardView({required this.state, required this.controller, required this.header});

  final CircuitBoardState state;
  final CircuitController controller;
  final List<Widget> header;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final b = state.builder;
    final level = b.level;
    final result = state.result;
    final live = state.liveResult;
    final energized = live != null && live.closedPathExists;
    final rejection = b.lastRejection?.code;
    final selected =
        state.selectedElementId == null ? null : elementById(b, state.selectedElementId!);
    final fault =
        b.fuseBlown && result != null && result.faults.isNotEmpty ? result.faults.first : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ...header,
          const SizedBox(height: 6),
          _CircuitCanvas(state: state, controller: controller),
          const SizedBox(height: 4),
          Text(l10n.mobileCircuit_zoomHint,
              textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          _Tray(state: state, controller: controller),
          if (state.armedKind != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(l10n.circuitBuilder_tray_armed,
                  key: const Key('circuit-armed'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall),
            ),
          if (state.pendingTerminal != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(l10n.mobileCircuit_wiring,
                  key: const Key('circuit-wiring'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall),
            ),
          if (selected != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(l10n.mobileCircuit_partSelected(componentName(l10n, selected.kind)),
                      key: const Key('circuit-selected')),
                  if (kElementSpecs[selected.kind]!.polarized)
                    OutlinedButton(
                      key: const Key('circuit-flip'),
                      onPressed: controller.flipSelected,
                      child: Text(l10n.circuitBuilder_flip),
                    ),
                  OutlinedButton(
                    key: const Key('circuit-remove'),
                    onPressed: controller.removeSelected,
                    child: Text(l10n.mobileCircuit_remove),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            children: [
              Text(
                energized
                    ? l10n.circuitBuilder_status_energized
                    : l10n.circuitBuilder_status_deEnergized,
                key: const Key('circuit-status'),
                style: TextStyle(
                    color: energized ? const Color(0xFF0E7490) : AppTheme.textSecondary,
                    fontWeight: FontWeight.w700),
              ),
              if (state.evaluationFailed)
                Text(l10n.circuitBuilder_error_evaluationUnavailable,
                    key: const Key('circuit-eval-failed'),
                    style: const TextStyle(color: AppTheme.warning)),
              if (rejection != null)
                Text(rejectionText(l10n, rejection),
                    key: const Key('circuit-rejection'),
                    style: const TextStyle(color: AppTheme.warning)),
            ],
          ),
          if (b.fuseBlown)
            Card(
              key: const Key('circuit-fuse'),
              color: const Color(0xFFFEE2E2),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.circuitBuilder_status_fuseBlown,
                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.error)),
                    if (fault != null) ...[
                      const SizedBox(height: 4),
                      Text(faultTitle(l10n, fault.code),
                          key: const Key('circuit-fault-title'),
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text(faultHelp(l10n, fault.code), key: const Key('circuit-fault-help')),
                    ],
                    const SizedBox(height: 6),
                    FilledButton(
                      key: const Key('circuit-reset-fuse'),
                      onPressed: controller.resetTheFuse,
                      child: Text(l10n.circuitBuilder_status_resetFuse),
                    ),
                  ],
                ),
              ),
            ),
          _Sliders(state: state, controller: controller),
          _RoverPanel(level: level, result: result, fuseBlown: b.fuseBlown),
          _Readout(state: state),
          const SizedBox(height: 8),
          Text(l10n.mobileCircuit_moveHint,
              textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _CircuitCanvas extends StatefulWidget {
  const _CircuitCanvas({required this.state, required this.controller});
  final CircuitBoardState state;
  final CircuitController controller;

  @override
  State<_CircuitCanvas> createState() => _CircuitCanvasState();
}

class _CircuitCanvasState extends State<_CircuitCanvas> {
  final TransformationController _transform = TransformationController();
  Size? _fittedFor;
  String? _dragElementId;
  GridCell? _dragCell;

  @override
  void dispose() {
    _transform.dispose();
    super.dispose();
  }

  CircuitViewport get _viewport => CircuitViewport.forGrid(widget.state.builder.layout.gridSize);

  void _fit(Size box, Size scene) {
    if (_fittedFor == box) return;
    _fittedFor = box;
    final scale = (box.width / scene.width).clamp(0.2, 1.0);
    _transform.value = Matrix4.diagonal3Values(scale, scale, 1);
  }

  void _onTap(Offset p) {
    final b = widget.state.builder;
    final ctrl = widget.controller;
    switch (hitTest(p, b.layout, _viewport)) {
      case TerminalHit(:final ref):
        ctrl.tapTerminal(ref);
      case ElementHit(:final elementId):
        // An armed part can still go on another cell, but this cell is taken.
        if (widget.state.armedKind != null && widget.state.pendingTerminal == null) {
          ctrl.tapCell(GridCell(
            elementById(b, elementId)!.position.col,
            elementById(b, elementId)!.position.row,
          ));
        } else {
          ctrl.tapElement(elementId);
        }
      case ConnectionHit(:final connectionId):
        ctrl.tapConnection(connectionId);
      case CellHit(:final cell):
        ctrl.tapCell(cell);
      case OutsideHit():
        ctrl.cancel();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final viewport = _viewport;
    final scene = viewport.sceneSize;
    final b = widget.state.builder;
    return LayoutBuilder(builder: (context, box) {
      final width = box.maxWidth;
      final height = (width * scene.height / scene.width).clamp(220.0, 420.0);
      _fit(Size(width, height), scene);
      return Semantics(
        label: l10n.circuitBuilder_canvasLabel,
        child: Container(
          key: const Key('circuit-canvas'),
          height: height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF1E293B), width: 2),
          ),
          clipBehavior: Clip.antiAlias,
          child: InteractiveViewer(
            key: const Key('circuit-viewer'),
            transformationController: _transform,
            constrained: false,
            minScale: 0.2,
            maxScale: 3,
            boundaryMargin: const EdgeInsets.all(60),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTapUp: (d) => _onTap(d.localPosition),
              onLongPressStart: (d) {
                final hit = hitTest(d.localPosition, b.layout, viewport);
                if (hit is ElementHit || hit is TerminalHit) {
                  final id = hit is ElementHit ? hit.elementId : (hit as TerminalHit).ref.elementId;
                  setState(() {
                    _dragElementId = id;
                    _dragCell = pointToCell(d.localPosition, viewport);
                  });
                }
              },
              onLongPressMoveUpdate: (d) {
                if (_dragElementId == null) return;
                setState(() => _dragCell = pointToCell(d.localPosition, viewport));
              },
              onLongPressEnd: (d) {
                final id = _dragElementId;
                final cell = pointToCell(d.localPosition, viewport);
                setState(() {
                  _dragElementId = null;
                  _dragCell = null;
                });
                if (id != null && cell != null) {
                  widget.controller.moveElementTo(id, cell);
                }
              },
              child: CustomPaint(
                size: scene,
                painter: CircuitPainter(
                  viewport: viewport,
                  layout: b.layout,
                  switches: b.switches,
                  result: widget.state.liveResult,
                  faults: widget.state.result?.faults ?? const [],
                  fuseBlown: b.fuseBlown,
                  abbr: (k) => componentAbbr(l10n, k),
                  selectedElementId: widget.state.selectedElementId,
                  pendingTerminal: widget.state.pendingTerminal,
                  dragElementId: _dragElementId,
                  dragCell: _dragCell,
                  armed: widget.state.armedKind != null,
                ),
              ),
            ),
          ),
        ),
      );
    });
  }
}

class _Tray extends StatelessWidget {
  const _Tray({required this.state, required this.controller});
  final CircuitBoardState state;
  final CircuitController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = selectTrayItems(state.builder);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.circuitBuilder_tray_title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
        const SizedBox(height: 4),
        SizedBox(
          height: 64,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              for (final item in items)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Material(
                    color: state.armedKind == item.kind
                        ? Theme.of(context).colorScheme.primaryContainer
                        : Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      key: Key('circuit-tray-${item.kind.id}'),
                      borderRadius: BorderRadius.circular(12),
                      onTap: item.disabled ? null : () => controller.armKind(item.kind),
                      child: Opacity(
                        opacity: item.disabled ? 0.45 : 1,
                        child: Container(
                          width: 104,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(componentName(l10n, item.kind),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w700)),
                              Text(
                                item.remaining > 0
                                    ? l10n.circuitBuilder_tray_remaining('${item.remaining}')
                                    : l10n.circuitBuilder_tray_exhausted,
                                key: Key('circuit-tray-left-${item.kind.id}'),
                                style: const TextStyle(fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Sliders extends StatelessWidget {
  const _Sliders({required this.state, required this.controller});
  final CircuitBoardState state;
  final CircuitController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tier = state.builder.level.numericDisclosure;
    final env = state.builder.environment;
    String label(String name, String? value) => value == null ? name : '$name: $value';
    return Column(
      children: [
        Row(children: [
          Expanded(
            flex: 3,
            child: Text(
              label(l10n.circuitBuilder_status_voltage,
                  sliderValueText(tier, SliderKind.voltage, env.sourceVoltage)),
              key: const Key('circuit-voltage-label'),
            ),
          ),
          Expanded(
            flex: 4,
            child: Slider(
              key: const Key('circuit-voltage'),
              min: kMinSourceVoltage,
              max: kMaxSourceVoltage,
              divisions: ((kMaxSourceVoltage - kMinSourceVoltage) / kSourceVoltageStep).round(),
              value: env.sourceVoltage.clamp(kMinSourceVoltage, kMaxSourceVoltage),
              onChanged: controller.setVoltage,
            ),
          ),
        ]),
        Row(children: [
          Expanded(
            flex: 3,
            child: Text(
              label(l10n.circuitBuilder_status_lightLevel,
                  sliderValueText(tier, SliderKind.light, env.lightLevel)),
              key: const Key('circuit-light-label'),
            ),
          ),
          Expanded(
            flex: 4,
            child: Slider(
              key: const Key('circuit-light'),
              min: kMinLightLevel,
              max: kMaxLightLevel,
              divisions: 20,
              value: env.lightLevel.clamp(kMinLightLevel, kMaxLightLevel),
              onChanged: controller.setLight,
            ),
          ),
        ]),
      ],
    );
  }
}

class _RoverPanel extends StatelessWidget {
  const _RoverPanel({required this.level, required this.result, required this.fuseBlown});
  final LevelDefinition level;
  final CircuitResult? result;
  final bool fuseBlown;

  static const Map<String, String> _icons = {
    'driveMotor': '🛞',
    'headlight': '🔦',
    'buzzerAlert': '🔔',
    'solarCharging': '☀️',
  };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final view = deriveRoverView(level, result, fuseBlown);
    return Card(
      key: const Key('circuit-rover'),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('🚙 ${l10n.circuitBuilder_rover_title}',
                style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            for (final role in view.roles)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  key: Key('circuit-role-${role.roleId}'),
                  children: [
                    Text(_icons[role.roleId] ?? '•'),
                    const SizedBox(width: 8),
                    Expanded(flex: 2, child: Text(roverRoleLabel(l10n, role.labelKey))),
                    const SizedBox(width: 8),
                    Flexible(
                        child: Text(
                      !role.available
                          ? l10n.circuitBuilder_rover_unused
                          : (role.active
                              ? l10n.circuitBuilder_rover_on
                              : l10n.circuitBuilder_rover_off),
                      key: Key('circuit-role-state-${role.roleId}'),
                      textAlign: TextAlign.end,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: role.active ? const Color(0xFF0E7490) : AppTheme.textSecondary,
                      ),
                    )),
                  ],
                ),
              ),
            if (view.allRequiredActive)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(l10n.circuitBuilder_rover_allPowered,
                    key: const Key('circuit-all-powered'),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
          ],
        ),
      ),
    );
  }
}

class _Readout extends StatelessWidget {
  const _Readout({required this.state});
  final CircuitBoardState state;

  static const List<ElementKind> _kinds = [
    ElementKind.led,
    ElementKind.motor,
    ElementKind.buzzer,
    ElementKind.resistor,
  ];

  String _glyph(ElementVisualState s) => switch (s) {
        ElementVisualState.lit => '●',
        ElementVisualState.dim => '◐',
        ElementVisualState.dark => '○',
        ElementVisualState.spark => '✕',
      };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final tier = state.builder.level.numericDisclosure;
    final result = state.result;
    final blown = state.builder.fuseBlown;
    final presented = result == null ? null : presentCircuit(result, state.builder.layout, tier);

    final totals = <ElementKind, int>{};
    for (final e in presented?.elements ?? const <PresentedElement>[]) {
      totals[e.kind] = (totals[e.kind] ?? 0) + 1;
    }
    final seen = <ElementKind, int>{};
    final rows = <Widget>[];
    for (final e in presented?.elements ?? const <PresentedElement>[]) {
      if (!_kinds.contains(e.kind)) continue;
      final index = seen[e.kind] ?? 0;
      seen[e.kind] = index + 1;
      final name = componentName(l10n, e.kind);
      final label =
          (totals[e.kind] ?? 0) > 1 ? '$name ${String.fromCharCode(65 + index % 26)}' : name;
      final word = switch (e.state) {
        ElementVisualState.lit => l10n.circuitBuilder_readout_state_lit,
        ElementVisualState.dim => l10n.circuitBuilder_readout_state_dim,
        ElementVisualState.dark => l10n.circuitBuilder_readout_state_dark,
        ElementVisualState.spark => l10n.circuitBuilder_readout_state_spark,
      };
      final bright = e.brightness == null
          ? null
          : switch (e.brightness!) {
              BrightnessLabel.off => l10n.circuitBuilder_readout_brightness_off,
              BrightnessLabel.dim => l10n.circuitBuilder_readout_brightness_dim,
              BrightnessLabel.medium => l10n.circuitBuilder_readout_brightness_medium,
              BrightnessLabel.bright => l10n.circuitBuilder_readout_brightness_bright,
            };
      rows.add(Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [Text(label), Text('${_glyph(e.state)} $word')],
            ),
            if (e.relativeBrightness != null)
              Row(children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: e.relativeBrightness!.clamp(0.0, 1.0),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(width: 8),
                Text(bright ?? ''),
              ]),
            if (e.voltage != null)
              Text('${l10n.circuitBuilder_readout_voltage}: '
                  '${formatQuantity(e.voltage!, QuantityUnit.volts, locale)}'),
            if (e.resistance != null)
              Text('${l10n.circuitBuilder_readout_resistance}: '
                  '${formatQuantity(e.resistance!, QuantityUnit.ohms, locale)}'),
            if (e.current != null)
              Text('${l10n.circuitBuilder_readout_current}: '
                  '${formatQuantity(e.current!, QuantityUnit.amps, locale)}'),
          ],
        ),
      ));
    }

    final hint = tier == NumericDisclosure.none
        ? l10n.circuitBuilder_readout_noneHint
        : (tier == NumericDisclosure.qualitative
            ? l10n.circuitBuilder_readout_qualitativeHint
            : null);
    return Card(
      key: const Key('circuit-readout'),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.circuitBuilder_readout_title,
                style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            if (presented == null || blown)
              Text(l10n.circuitBuilder_readout_noPath, key: const Key('circuit-readout-nopath'))
            else ...[
              if (presented.supplyVoltage != null)
                Text(
                    '${l10n.circuitBuilder_readout_supply}: '
                    '${formatQuantity(presented.supplyVoltage!, QuantityUnit.volts, locale)}',
                    key: const Key('circuit-readout-supply')),
              ...rows,
              if (presented.totalResistance != null && presented.totalCurrent != null) ...[
                Text('${l10n.circuitBuilder_readout_totalResistance}: '
                    '${formatQuantity(presented.totalResistance!, QuantityUnit.ohms, locale)}'),
                Text('${l10n.circuitBuilder_readout_totalCurrent}: '
                    '${formatQuantity(presented.totalCurrent!, QuantityUnit.amps, locale)}'),
              ],
            ],
            if (hint != null) Text(hint, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
