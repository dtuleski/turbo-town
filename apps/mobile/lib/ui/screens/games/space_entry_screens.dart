import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/quest_models.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/space_entry/config.dart';
import '../../../game/space_entry/physics.dart';
import '../../../game/space_entry/puzzles.dart';
import '../../../game/space_entry/space_entry_controller.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../widgets/step_clock.dart';
import 'board_widgets.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

const Color _green = Color(0xFF4ADE80);
const Color _greenDim = Color(0xFF16A34A);
const Color _panel = Color(0xFF030712);
const double _globeRadius = 110;

/// Position of a lat/lng on the flat globe disc (web `latLngToGlobeXY`).
Offset globePoint(double lat, double lng, double radius) =>
    Offset(radius + (lng / 180) * radius, radius - (lat / 90) * radius);

Color accuracyColor(double accuracy) {
  if (accuracy >= 80) return const Color(0xFF22C55E);
  if (accuracy >= 50) return const Color(0xFFEAB308);
  return const Color(0xFFF97316);
}

String _coords(LandingZone z) =>
    '${z.latitude.abs().toStringAsFixed(1)}°${z.latitude >= 0 ? 'N' : 'S'} '
    '${z.longitude.abs().toStringAsFixed(1)}°${z.longitude >= 0 ? 'E' : 'W'}';

class SpaceEntrySetupScreen extends StatelessWidget {
  const SpaceEntrySetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': l10n.spaceEntry_easyDesc,
      'medium': l10n.spaceEntry_mediumDesc,
      'hard': l10n.spaceEntry_hardDesc,
    };
    return PickerSetupScreen(
      title: l10n.spaceEntry_title,
      subtitle: l10n.spaceEntry_subtitle,
      notice: l10n.mobilePhysics_englishPuzzles,
      startLabel: l10n.spaceEntry_startMission,
      selectLabel: l10n.spaceEntry_selectDifficulty,
      groups: [
        SetupGroup('difficulty', l10n.spaceEntry_chooseDifficulty, [
          for (final d in kSpaceEntryDifficulties)
            SetupOption(d, quizDifficultyLabel(l10n, d),
                emoji: quizDifficultyEmoji(d), description: desc[d]),
        ]),
      ],
      buildRoute: (s) => '/space-entry/play?difficulty=${s['difficulty']}',
    );
  }
}

class SpaceEntryGameScreen extends ConsumerWidget {
  const SpaceEntryGameScreen({super.key, required this.difficulty, this.questContext});

  final String difficulty;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, quest: questContext);
    final provider = spaceEntryControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: spaceEntrySessionArgs(args),
      title: l10n.spaceEntry_title,
      reviewType: gameById('space-entry')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _SpaceBoard(args: args, session: session),
    );
  }
}

class _SpaceBoard extends ConsumerWidget {
  const _SpaceBoard({required this.args, required this.session});

  final SpaceEntryArgs args;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(spaceEntryControllerProvider(args));
    final ctrl = ref.read(spaceEntryControllerProvider(args).notifier);
    final config = state.config;
    // With the keyboard open there is no room for the globe: keep the HUD only.
    final compact = MediaQuery.viewInsetsOf(context).bottom > 0;
    final tutorial = switch (args.difficulty) {
      'medium' => l10n.spaceEntry_tutorialMedium,
      'hard' => l10n.spaceEntry_tutorialHard,
      _ => l10n.spaceEntry_tutorialEasy,
    };

    return StepClock(
      step: const Duration(seconds: 1),
      running: session.phase == SessionPhase.playing && state.phase == SpacePhase.setup,
      onStep: ctrl.tick,
      // The frame gives the board loose constraints; fill the page.
      child: Container(
        constraints: const BoxConstraints.expand(),
        color: Colors.black,
        child: Stack(
          children: [
            Column(
              children: [
                _Windshield(state: state, difficulty: args.difficulty, compact: compact),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              l10n.mobilePhysics_systemsCheck(
                                  '${state.submittedCount}', '${state.totalPuzzles}'),
                              key: const Key('se-status'),
                              style: const TextStyle(color: _green, fontSize: 12),
                            ),
                          ),
                          Text(
                            state.allSubmitted ? '● ${l10n.mobilePhysics_ready}' : '○ ${l10n.mobilePhysics_pending}',
                            style: const TextStyle(color: _greenDim, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(tutorial, style: const TextStyle(color: Color(0xFF86EFAC), fontSize: 11)),
                      const SizedBox(height: 8),
                      _sectionTitle('◆ ${l10n.spaceEntry_controlPuzzles}'),
                      for (final s in state.controls)
                        _Instrument(
                          key: ObjectKey(s.puzzle),
                          slot: s,
                          enabled: state.phase == SpacePhase.setup,
                          onSubmit: (text) => ctrl.submit(s.id, text),
                        ),
                      if (state.bonus.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        _sectionTitle(
                            '◆ ${l10n.spaceEntry_missionChecks} (${state.bonus.where((b) => b.submitted).length}/${state.bonus.length})'),
                        for (final s in state.bonus)
                          _Instrument(
                            key: ObjectKey(s.puzzle),
                            slot: s,
                            enabled: state.phase == SpacePhase.setup,
                            onSubmit: (text) => ctrl.submit(s.id, text),
                          ),
                      ],
                      if (state.countdown <= 10 && state.countdown > 0 && state.phase == SpacePhase.setup)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            '⚠ ${l10n.spaceEntry_autoFire('${state.countdown}')}',
                            key: const Key('se-autofire'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                color: Color(0xFFF87171), fontWeight: FontWeight.w700),
                          ),
                        ),
                      const SizedBox(height: 12),
                      FilledButton(
                        key: const Key('se-fire'),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFFDC2626),
                          disabledBackgroundColor: const Color(0xFF111827),
                          disabledForegroundColor: const Color(0xFF6B7280),
                        ),
                        onPressed: state.phase == SpacePhase.setup && state.allSubmitted ? ctrl.fire : null,
                        child: Text(
                          state.allSubmitted
                              ? '▶ ${l10n.spaceEntry_initiateReentry}'
                              : '○ ${l10n.spaceEntry_puzzlesRemaining('${state.totalPuzzles - state.submittedCount}')}',
                          textAlign: TextAlign.center,
                        ),
                      ),
                      if (config.turbulenceRange > 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text('⚠ ${l10n.spaceEntry_turbulenceWarning}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Color(0xFFF87171), fontSize: 11)),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (state.phase == SpacePhase.results && state.finalResult != null)
              Positioned.fill(child: _Results(state: state, ctrl: ctrl)),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: const TextStyle(color: Color(0x9922C55E), fontSize: 11, letterSpacing: 1)),
      );
}

/// Space view with the globe, target, predicted landing and the HUD.
class _Windshield extends StatelessWidget {
  const _Windshield({required this.state, required this.difficulty, required this.compact});

  final SpaceEntryState state;
  final String difficulty;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final prediction = state.prediction;
    final shown = state.controlSubmittedCount > 0 && state.phase == SpacePhase.setup;
    final shield = prediction.heatShieldRemaining;
    final countdown = state.countdown;
    final final_ = state.finalResult;
    final craft = switch ((state.phase, final_?.outcome)) {
      (SpacePhase.reentry, LandingOutcome.orbitalBurnUp) => '🔥',
      (SpacePhase.results, LandingOutcome.successfulLanding) => '🪂',
      (SpacePhase.results, LandingOutcome.orbitalBurnUp) => '💥',
      (SpacePhase.results, LandingOutcome.skipOff) => '↗️',
      _ => '🚀',
    };

    final hud = Padding(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.spaceEntry_missionControl.toUpperCase(),
                    style: const TextStyle(color: Color(0xB322C55E), fontSize: 10, letterSpacing: 1.5)),
                Text('${l10n.spaceEntry_target}: ${state.zone.name}',
                    key: const Key('se-target'),
                    style: const TextStyle(color: Color(0xFF86EFAC), fontSize: 12)),
                Text(_coords(state.zone),
                    style: const TextStyle(color: _greenDim, fontSize: 10)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                clockText(countdown),
                key: const Key('se-countdown'),
                style: TextStyle(
                  color: countdown <= 10 ? const Color(0xFFF87171) : _green,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              Text('${l10n.spaceEntry_heatShield.toUpperCase()} ${shield.round()}%',
                  key: const Key('se-shield'),
                  style: const TextStyle(color: Color(0xFF22C55E), fontSize: 10)),
              const SizedBox(height: 2),
              Container(
                width: 80,
                height: 6,
                decoration:
                    BoxDecoration(color: const Color(0xFF1F2937), borderRadius: BorderRadius.circular(3)),
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.centerLeft,
                child: FractionallySizedBox(
                  widthFactor: (shield / 100).clamp(0.0, 1.0),
                  child: Container(
                    color: shield > 60
                        ? const Color(0xFF22C55E)
                        : shield > 30
                            ? const Color(0xFFEAB308)
                            : const Color(0xFFEF4444),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );

    if (compact) return hud;

    const size = _globeRadius * 2;
    return Container(
      height: 290,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.black, Color(0xFF030712), Color(0xFF111827)],
        ),
        border: Border(bottom: BorderSide(color: Color(0x3322C55E), width: 2)),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: CustomPaint(painter: _StarsPainter())),
          Center(
            child: SizedBox(
              width: size,
              height: size,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Positioned.fill(child: CustomPaint(painter: _GlobePainter())),
                  _dot(globePoint(state.zone.latitude, state.zone.longitude, _globeRadius),
                      const Color(0xFFEF4444), const Key('se-target-dot')),
                  if (shown)
                    _dot(
                      globePoint(prediction.predictedLat, prediction.predictedLng, _globeRadius),
                      accuracyColor(prediction.accuracy),
                      const Key('se-predicted-dot'),
                      glow: true,
                    ),
                  Positioned(
                    left: size / 2 - 16,
                    top: size * 0.08 - 16,
                    child: _Spacecraft(
                      key: const Key('se-spacecraft'),
                      emoji: craft,
                      reentering: state.phase == SpacePhase.reentry,
                      outcome: final_?.outcome,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(left: 0, right: 0, top: 0, child: hud),
          if (state.controlSubmittedCount > 0 && state.phase == SpacePhase.setup)
            Positioned(
              left: 0,
              right: 0,
              bottom: 6,
              child: Text(
                '${l10n.spaceEntry_distanceFromTarget}: ${prediction.distanceKm.toStringAsFixed(0)} km'
                '   ${l10n.spaceEntry_accuracy}: ${prediction.accuracy.round()}%',
                key: const Key('se-readout'),
                textAlign: TextAlign.center,
                style: const TextStyle(color: _green, fontSize: 11),
              ),
            ),
        ],
      ),
    );
  }

  Widget _dot(Offset p, Color color, Key key, {bool glow = false}) => Positioned(
        left: p.dx - 6,
        top: p.dy - 6,
        child: Container(
          key: key,
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: glow ? [BoxShadow(color: color, blurRadius: 10)] : null,
          ),
        ),
      );
}

/// The craft. During the reentry it drifts the way the web animation does:
/// down into the target, or burning up, or bouncing off.
class _Spacecraft extends StatelessWidget {
  const _Spacecraft({super.key, required this.emoji, required this.reentering, required this.outcome});

  final String emoji;
  final bool reentering;
  final LandingOutcome? outcome;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: reentering ? 1 : 0),
      duration: reentering ? kReentryDuration : Duration.zero,
      curve: reentering ? Curves.easeOut : Curves.linear,
      builder: (context, p, child) {
        final skip = outcome == LandingOutcome.skipOff;
        final burn = outcome == LandingOutcome.orbitalBurnUp;
        // From (0, -60) at -30 degrees to rest; a skip-off leaves up and right.
        final dx = skip ? 80 * p : 0.0;
        final dy = skip ? -60 - 40 * p : -60 * (1 - p);
        final deg = skip ? -30 + 60 * p : -30 * (1 - p);
        final opacity = (skip || burn) ? (p < 0.5 ? 1.0 : 1 - (p - 0.5) * 2) : 1.0;
        final active = reentering || p > 0;
        return Opacity(
          opacity: opacity.clamp(0.0, 1.0),
          child: Transform.translate(
            offset: active ? Offset(dx, dy) : Offset.zero,
            child: Transform.rotate(
              angle: (active ? deg : -30) * math.pi / 180,
              child: child,
            ),
          ),
        );
      },
      child: SizedBox(
        width: 32,
        height: 32,
        child: Center(child: Text(emoji, style: const TextStyle(fontSize: 24))),
      ),
    );
  }
}

class _StarsPainter extends CustomPainter {
  const _StarsPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final rng = math.Random(42);
    for (var i = 0; i < 60; i++) {
      final big = rng.nextDouble() > 0.8;
      final paint = Paint()..color = Colors.white.withValues(alpha: 0.3 + rng.nextDouble() * 0.7);
      canvas.drawCircle(
        Offset(rng.nextDouble() * size.width, rng.nextDouble() * size.height),
        big ? 1 : 0.5,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

class _GlobePainter extends CustomPainter {
  const _GlobePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final center = rect.center;
    final r = size.width / 2;
    canvas.drawCircle(
      center,
      r,
      Paint()
        ..shader = const RadialGradient(
          center: Alignment(-0.2, -0.3),
          radius: 1,
          colors: [Color(0xFF4FC3F7), Color(0xFF1565C0), Color(0xFF0D47A1), Color(0xFF1A237E)],
          stops: [0, 0.5, 0.8, 1],
        ).createShader(rect),
    );
    canvas.save();
    canvas.clipPath(Path()..addOval(rect));
    canvas.scale(size.width / 256, size.height / 256);
    final land = Paint()..color = const Color(0x404CAF50);
    for (final e in const [
      Rect.fromLTWH(135 - 18, 120 - 35, 36, 70),
      Rect.fromLTWH(130 - 15, 75 - 12, 30, 24),
      Rect.fromLTWH(175 - 30, 85 - 20, 60, 40),
      Rect.fromLTWH(70 - 25, 80 - 18, 50, 36),
      Rect.fromLTWH(85 - 14, 145 - 28, 28, 56),
      Rect.fromLTWH(200 - 15, 155 - 10, 30, 20),
    ]) {
      canvas.drawOval(e, land);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

/// One console puzzle: question, answer field and ENTER.
class _Instrument extends StatefulWidget {
  const _Instrument({super.key, required this.slot, required this.enabled, required this.onSubmit});

  final PuzzleSlot slot;
  final bool enabled;
  final void Function(String text) onSubmit;

  @override
  State<_Instrument> createState() => _InstrumentState();
}

class _InstrumentState extends State<_Instrument> {
  final TextEditingController _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final slot = widget.slot;
    final puzzle = slot.puzzle;
    final locked = slot.submitted || !widget.enabled;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0x4D22C55E)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text('${puzzle.icon} ${puzzle.label}'.toUpperCase(),
                    style: const TextStyle(color: _green, fontSize: 11, letterSpacing: 1)),
              ),
              if (slot.submitted)
                Text(
                  slot.correct == true
                      ? '[${l10n.mobilePhysics_answerOk}]'
                      : '[${l10n.mobilePhysics_answerWrong('${jsNum(puzzle.correctAnswer)}${puzzle.unit}')}]',
                  key: Key('se-result-${slot.id}'),
                  style: TextStyle(
                    color: slot.correct == true ? _green : const Color(0xFFF87171),
                    fontSize: 11,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0x66000000),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: const Color(0x1A22C55E)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (puzzle.visual != null)
                  Text(puzzle.visual!, style: const TextStyle(color: _greenDim, fontSize: 10)),
                Text(puzzle.question,
                    key: Key('se-question-${slot.id}'),
                    style: const TextStyle(color: Color(0xFF86EFAC), fontSize: 13)),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: TextField(
                  key: Key('se-input-${slot.id}'),
                  controller: _text,
                  enabled: !locked,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,\-]'))],
                  style: const TextStyle(color: Color(0xFF86EFAC), fontSize: 15),
                  cursorColor: _green,
                  textInputAction: TextInputAction.done,
                  onSubmitted: locked ? null : widget.onSubmit,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: '___',
                    hintStyle: const TextStyle(color: Color(0xFF14532D)),
                    prefixText: '> ',
                    prefixStyle: const TextStyle(color: Color(0xFF22C55E)),
                    suffixText: puzzle.unit.isEmpty ? null : puzzle.unit,
                    suffixStyle: const TextStyle(color: _greenDim),
                    fillColor: Colors.transparent,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                key: Key('se-submit-${slot.id}'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(72, 40),
                  foregroundColor: _green,
                  side: const BorderSide(color: Color(0x4D22C55E)),
                ),
                onPressed: locked || _text.text.trim().isEmpty ? null : () => widget.onSubmit(_text.text),
                child: Text(l10n.spaceEntry_submit),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Results extends StatelessWidget {
  const _Results({required this.state, required this.ctrl});

  final SpaceEntryState state;
  final SpaceEntryController ctrl;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final result = state.finalResult!;
    final checks = '${state.totalCorrect}/${state.totalPuzzles}';
    final (emoji, title, message, color) = switch (result.outcome) {
      LandingOutcome.successfulLanding =>
        ('✅', l10n.spaceEntry_successTitle, null, const Color(0xFF4ADE80)),
      LandingOutcome.orbitalBurnUp =>
        ('💥', l10n.spaceEntry_burnUpTitle, l10n.spaceEntry_burnUpMessage, const Color(0xFFF87171)),
      LandingOutcome.skipOff =>
        ('↗️', l10n.spaceEntry_skipOffTitle, l10n.spaceEntry_skipOffMessage, const Color(0xFFFACC15)),
    };
    final rows = <(String, String)>[
      if (result.outcome == LandingOutcome.successfulLanding) (l10n.spaceEntry_target, state.zone.name),
      if (result.outcome != LandingOutcome.orbitalBurnUp) ...[
        (l10n.spaceEntry_accuracy, '${result.accuracy.toStringAsFixed(1)}%'),
        (l10n.spaceEntry_distanceFromTarget, '${result.distanceKm.toStringAsFixed(0)} km'),
      ],
      if (result.outcome != LandingOutcome.skipOff)
        (l10n.spaceEntry_heatShield, '${result.heatShieldRemaining.toStringAsFixed(1)}%'),
      (l10n.spaceEntry_puzzleScore, checks),
    ];
    final success = result.outcome == LandingOutcome.successfulLanding;
    return Container(
      key: const Key('se-results'),
      color: const Color(0xCC000000),
      padding: const EdgeInsets.all(16),
      alignment: Alignment.center,
      child: SingleChildScrollView(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 420),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: _panel,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x4D22C55E)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(emoji, textAlign: TextAlign.center, style: const TextStyle(fontSize: 44)),
              Text(title,
                  key: const Key('se-result-title'),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w800)),
              if (message != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(message,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: color.withValues(alpha: 0.7), fontSize: 12)),
                ),
              const SizedBox(height: 16),
              for (final (label, value) in rows)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(label, style: TextStyle(color: color.withValues(alpha: 0.85))),
                      Flexible(
                        child: Text(value,
                            textAlign: TextAlign.end, style: TextStyle(color: color.withValues(alpha: 0.85))),
                      ),
                    ],
                  ),
                ),
              if (success) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0x66000000),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0x1A22C55E)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.spaceEntry_geographyFact.toUpperCase(),
                          style: const TextStyle(color: _greenDim, fontSize: 10)),
                      const SizedBox(height: 2),
                      Text(state.zone.geographyFact,
                          style: const TextStyle(color: Color(0xFF86EFAC), fontSize: 12)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              FilledButton(
                key: Key(success ? 'se-see-score' : 'se-retry'),
                style: FilledButton.styleFrom(
                  backgroundColor: success ? const Color(0xFF16A34A) : const Color(0xFFB91C1C),
                ),
                onPressed: success ? ctrl.seeScore : ctrl.retry,
                child: Text(success ? l10n.spaceEntry_seeScore : l10n.spaceEntry_tryAgain),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
