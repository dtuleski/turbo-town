import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/quest_models.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../game/mini_golf/data.dart';
import '../../../game/mini_golf/golf_controller.dart';
import '../../../game/mini_golf/physics.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../../l10n/physics_text.dart';
import '../../widgets/step_clock.dart';
import 'board_widgets.dart';
import 'how_to_play_card.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

class MiniGolfSetupScreen extends StatelessWidget {
  const MiniGolfSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': l10n.miniGolf_easyDesc,
      'medium': l10n.miniGolf_mediumDesc,
      'hard': l10n.miniGolf_hardDesc,
    };
    return PickerSetupScreen(
      title: l10n.miniGolf_title,
      subtitle: '${l10n.miniGolf_subtitle}\n${l10n.miniGolf_description}',
      notice: '🌡 ${l10n.mobilePhysics_golfConditionsNote}',
      startLabel: l10n.miniGolf_teeOff,
      selectLabel: l10n.miniGolf_selectCourse,
      groups: [
        SetupGroup('difficulty', l10n.miniGolf_chooseCourse, [
          for (final d in kQuizDifficulties)
            SetupOption(d, quizDifficultyLabel(l10n, d),
                emoji: golfCourse(d).emoji, description: desc[d]),
        ]),
      ],
      footer: [
        HowToPlayCard(title: l10n.miniGolf_howToPlay, steps: [
          l10n.miniGolf_step1,
          l10n.miniGolf_step2,
          l10n.miniGolf_step3,
          l10n.miniGolf_step4,
        ]),
      ],
      buildRoute: (s) => '/mini-golf/play?difficulty=${s['difficulty']}',
    );
  }
}

class MiniGolfGameScreen extends ConsumerWidget {
  const MiniGolfGameScreen({super.key, required this.difficulty, this.questContext});

  final String difficulty;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, quest: questContext);
    final provider = golfControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: golfSessionArgs(args),
      title: l10n.miniGolf_title,
      reviewType: gameById('mini-golf')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _GolfBoard(args: args, session: session),
    );
  }
}

class _GolfBoard extends ConsumerStatefulWidget {
  const _GolfBoard({required this.args, required this.session});

  final GolfArgs args;
  final GameSessionState session;

  @override
  ConsumerState<_GolfBoard> createState() => _GolfBoardState();
}

class _GolfBoardState extends ConsumerState<_GolfBoard> {
  Vec2? _down;
  Vec2? _dragStart;
  Vec2? _dragEnd;

  GolfController get _ctrl => ref.read(golfControllerProvider(widget.args).notifier);

  /// Screen position inside the field widget to play-field units (0-600).
  Vec2 _toField(Offset local, double side) =>
      Vec2(local.dx / side * kGolfFieldSize, local.dy / side * kGolfFieldSize);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(golfControllerProvider(widget.args));
    final ctrl = _ctrl;
    final hole = ctrl.hole;
    final course = ctrl.course;
    final dragging = _dragStart != null && _dragEnd != null && state.phase == GolfPhase.aiming;

    return StepClock(
      step: Duration(microseconds: (kGolfPhysics.tickRateMs * 1000).round()),
      maxStepsPerFrame: 8,
      running: widget.session.phase == SessionPhase.playing,
      onStep: ctrl.step,
      // The frame gives the board loose constraints; fill the page.
      child: Container(
        constraints: const BoxConstraints.expand(),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF14532D), Color(0xFF052E16), Color(0xFF0F172A)],
          ),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Row(
                children: [
                  _hudCell(
                    Alignment.centerLeft,
                    Text('⏱ ${clockText(widget.session.elapsedSeconds)}',
                        key: const Key('golf-clock'),
                        style: const TextStyle(color: Color(0xFFDCFCE7), fontWeight: FontWeight.w700)),
                  ),
                  _hudCell(
                    Alignment.center,
                    Text(
                      l10n.mobilePhysics_golfHoleOf('${state.holeIndex + 1}', '${course.holes.length}'),
                      key: const Key('golf-hole'),
                      style: const TextStyle(
                          color: Color(0xFF86EFAC), fontSize: 17, fontWeight: FontWeight.w800),
                    ),
                  ),
                  _hudCell(
                    Alignment.centerRight,
                    Text(
                      '${l10n.mobilePhysics_golfTotal('${state.totalStrokes}')} (${l10n.mobilePhysics_golfPar('${course.totalPar}')})',
                      key: const Key('golf-total'),
                      style: const TextStyle(color: Color(0xFFDCFCE7), fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: LayoutBuilder(builder: (context, box) {
                final side = math.max(120.0, math.min(box.maxWidth - 16, box.maxHeight - 8));
                return Center(
                  child: SizedBox(
                    width: side,
                    height: side,
                    child: Stack(
                      children: [
                        GestureDetector(
                          key: const Key('golf-field'),
                          behavior: HitTestBehavior.opaque,
                          onPanDown: (d) => _down = _toField(d.localPosition, side),
                          onPanStart: (d) {
                            final down = _down;
                            if (down == null || !ctrl.canGrab(down)) return;
                            setState(() {
                              _dragStart = down;
                              _dragEnd = _toField(d.localPosition, side);
                            });
                          },
                          onPanUpdate: (d) {
                            if (_dragStart == null) return;
                            setState(() => _dragEnd = _toField(d.localPosition, side));
                          },
                          onPanEnd: (_) => _release(),
                          onPanCancel: _release,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: CustomPaint(
                              size: Size(side, side),
                              painter: GolfPainter(
                                hole: ctrl.fieldHole,
                                ball: state.ball,
                                env: state.env,
                                timeMs: state.simTimeMs,
                                aiming: state.phase == GolfPhase.aiming,
                                dragStart: dragging ? _dragStart : null,
                                dragEnd: dragging ? _dragEnd : null,
                                powerLabel: (pct) => l10n.mobilePhysics_golfPower('$pct'),
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 10,
                          left: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xCC14532D),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              l10n.mobilePhysics_golfStrokeCounter(
                                  '${state.currentStrokes}', '${ctrl.maxStrokes}'),
                              key: const Key('golf-strokes'),
                              style: const TextStyle(
                                  color: Color(0xFFDCFCE7), fontWeight: FontWeight.w800, fontSize: 13),
                            ),
                          ),
                        ),
                        if (state.showHoleName)
                          Positioned(
                            top: 44,
                            left: 0,
                            right: 0,
                            child: IgnorePointer(
                              child: Center(
                                child: Container(
                                  key: const Key('golf-hole-name'),
                                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xE614532D),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0x6622C55E)),
                                  ),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(hole.name,
                                          style: const TextStyle(
                                              color: Color(0xFF86EFAC),
                                              fontSize: 19,
                                              fontWeight: FontWeight.w800)),
                                      Text(l10n.mobilePhysics_golfPar('${hole.par}'),
                                          style: const TextStyle(color: Color(0xCCDCFCE7))),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        if (state.phase == GolfPhase.sunk)
                          Positioned.fill(
                            child: IgnorePointer(
                              child: Container(
                                key: const Key('golf-sunk'),
                                color: const Color(0x66000000),
                                alignment: Alignment.center,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Text('🎉', style: TextStyle(fontSize: 64)),
                                    Text(
                                      golfScoreText(l10n, golfScoreName(state.currentStrokes, hole.par)),
                                      style: const TextStyle(
                                          color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900),
                                    ),
                                    Text(
                                      l10n.mobilePhysics_golfStrokesPar(
                                          '${state.currentStrokes}', '${hole.par}'),
                                      style: const TextStyle(
                                          color: Color(0xFF86EFAC), fontWeight: FontWeight.w700),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        if (state.phase == GolfPhase.waterReset)
                          Positioned.fill(
                            child: IgnorePointer(
                              child: Container(
                                key: const Key('golf-water'),
                                color: const Color(0x4D000000),
                                alignment: Alignment.center,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Text('💦', style: TextStyle(fontSize: 56)),
                                    Text(l10n.mobilePhysics_golfWaterHazard,
                                        style: const TextStyle(
                                            color: Color(0xFFBFDBFE),
                                            fontSize: 19,
                                            fontWeight: FontWeight.w800)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              }),
            ),
            if (state.phase == GolfPhase.aiming)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  dragging ? l10n.mobilePhysics_golfPullHint : '👆 ${l10n.mobilePhysics_golfAimHint}',
                  key: const Key('golf-hint'),
                  style: const TextStyle(color: Color(0xCC4ADE80), fontSize: 12),
                ),
              ),
            _Conditions(env: state.env),
            if (state.holeStrokes.isNotEmpty && state.phase != GolfPhase.sunk)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Wrap(
                  key: const Key('golf-scorecard'),
                  spacing: 6,
                  children: [
                    for (final (i, s) in state.holeStrokes.indexed)
                      _ScoreChip(hole: i + 1, strokes: s, par: course.holes[i].par),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// One third of the top bar; the text shrinks instead of overflowing.
  Widget _hudCell(Alignment alignment, Widget child) => Expanded(
        child: FittedBox(fit: BoxFit.scaleDown, alignment: alignment, child: child),
      );

  void _release() {
    final start = _dragStart;
    final end = _dragEnd;
    if (start != null && end != null) _ctrl.shoot(start, end);
    _down = null;
    if (_dragStart != null || _dragEnd != null) {
      setState(() {
        _dragStart = null;
        _dragEnd = null;
      });
    }
  }
}

class _ScoreChip extends StatelessWidget {
  const _ScoreChip({required this.hole, required this.strokes, required this.par});

  final int hole;
  final int strokes;
  final int par;

  @override
  Widget build(BuildContext context) {
    final diff = strokes - par;
    final color = diff < 0
        ? const Color(0xFF4ADE80)
        : diff == 0
            ? Colors.white
            : const Color(0xFFF87171);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0x9914532D),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0x6614532D)),
      ),
      child: Column(
        children: [
          Text('H$hole', style: const TextStyle(color: Color(0x9944D07B), fontSize: 9)),
          Text('$strokes', style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

/// Wind, temperature and altitude of the hole.
class _Conditions extends StatelessWidget {
  const _Conditions({required this.env});

  final EnvironmentConditions env;

  static String _arrow(double d) {
    if (d >= 337.5 || d < 22.5) return '→';
    if (d < 67.5) return '↘';
    if (d < 112.5) return '↓';
    if (d < 157.5) return '↙';
    if (d < 202.5) return '←';
    if (d < 247.5) return '↖';
    if (d < 292.5) return '↑';
    return '↗';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tempNote = env.temperature < 5
        ? l10n.mobilePhysics_golfTempFrosty
        : env.temperature > 35
            ? l10n.mobilePhysics_golfTempHot
            : l10n.mobilePhysics_golfTempPleasant;
    final altNote = env.altitude > 1500
        ? l10n.mobilePhysics_golfAltThin
        : env.altitude > 500
            ? l10n.mobilePhysics_golfAltModerate
            : l10n.mobilePhysics_golfAltSea;
    Widget tile(Key key, String title, String value, String note) => Expanded(
          child: Container(
            key: key,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0x6614532D),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Color(0xFFBBF7D0), fontSize: 10)),
                Text(value,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
                Text(note, style: const TextStyle(color: Color(0xB34ADE80), fontSize: 9)),
              ],
            ),
          ),
        );
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 6, 10, 6),
      child: Column(
        children: [
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                tile(
                  const Key('golf-wind'),
                  '💨 ${l10n.mobilePhysics_golfWind}',
                  '${_arrow(env.windDirection)} ${l10n.mobilePhysics_golfWindSpeed('${env.windSpeed.round()}')}',
                  l10n.mobilePhysics_golfDirection,
                ),
                tile(
                  const Key('golf-temp'),
                  '🌡️ ${l10n.mobilePhysics_golfTemp}',
                  l10n.mobilePhysics_golfTempValue('${env.temperature.round()}'),
                  tempNote,
                ),
                tile(
                  const Key('golf-altitude'),
                  '⛰️ ${l10n.mobilePhysics_golfAltitude}',
                  l10n.mobilePhysics_golfAltitudeValue('${env.altitude.round()}'),
                  altNote,
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Text(l10n.mobilePhysics_golfConditionsTip,
              style: const TextStyle(color: Color(0xCC4ADE80), fontSize: 10, fontStyle: FontStyle.italic)),
        ],
      ),
    );
  }
}

/// Draws one hole in the 600x600 play field, like the web canvas.
class GolfPainter extends CustomPainter {
  const GolfPainter({
    required this.hole,
    required this.ball,
    required this.env,
    required this.timeMs,
    required this.aiming,
    required this.dragStart,
    required this.dragEnd,
    required this.powerLabel,
  });

  final Hole hole;
  final BallState ball;
  final EnvironmentConditions env;
  final double timeMs;
  final bool aiming;
  final Vec2? dragStart;
  final Vec2? dragEnd;
  final String Function(int percent) powerLabel;

  static const double _s = kGolfScale;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / kGolfFieldSize, size.height / kGolfFieldSize);
    canvas.drawRect(const Rect.fromLTWH(0, 0, kGolfFieldSize, kGolfFieldSize), Paint()..color = const Color(0xFF1B5E20));
    final grass = Paint()..color = const Color(0x4D2E7D32);
    for (var i = 0; i < 600; i += 12) {
      for (var j = 0; j < 600; j += 12) {
        if ((i + j) % 24 == 0) canvas.drawRect(Rect.fromLTWH(i.toDouble(), j.toDouble(), 6, 6), grass);
      }
    }
    _obstacles(canvas);
    _walls(canvas);
    _cup(canvas);
    _ball(canvas);
    if (aiming && !ball.sunk) _golfer(canvas);
    _aim(canvas);
    _wind(canvas);
    canvas.restore();
  }

  Offset _o(Vec2 v) => Offset(v.x, v.y);

  void _obstacles(Canvas canvas) {
    var index = 0;
    for (final obs in hole.obstacles) {
      index++;
      final w = (obs.width == null || obs.width == 0) ? 60.0 : obs.width!;
      final h = (obs.height == null || obs.height == 0) ? 60.0 : obs.height!;
      switch (obs.type) {
        case 'sand':
          canvas.drawRRect(
            RRect.fromRectAndRadius(Rect.fromLTWH(obs.x, obs.y, w, h), const Radius.circular(8)),
            Paint()..color = const Color(0xFFC8A96A),
          );
          // Fixed speckles (the web redraws random ones every frame).
          final rng = math.Random(index * 7919);
          final speck = Paint()..color = const Color(0x66A0783C);
          for (var i = 0; i < 12; i++) {
            canvas.drawCircle(Offset(obs.x + rng.nextDouble() * w, obs.y + rng.nextDouble() * h), 2, speck);
          }
        case 'water':
          canvas.drawRRect(
            RRect.fromRectAndRadius(Rect.fromLTWH(obs.x, obs.y, w, h), const Radius.circular(10)),
            Paint()..color = const Color(0xFF1565C0),
          );
          final ring = Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.5
            ..color = const Color(0x8064C8FF);
          final c = Offset(obs.x + w / 2, obs.y + h / 2);
          canvas.drawCircle(c, 10 + math.sin(timeMs * 0.004) * 5, ring);
          canvas.drawCircle(c, 18 + math.cos(timeMs * 0.003) * 4, ring);
        case 'bumper':
          final r = (obs.radius == null || obs.radius == 0) ? 21.0 : obs.radius!;
          final c = Offset(obs.x, obs.y);
          canvas.drawCircle(
            c,
            r,
            Paint()
              ..shader = RadialGradient(
                center: Alignment(-4 / r, -4 / r),
                radius: 1,
                colors: const [Color(0xFFFF7043), Color(0xFFD32F2F)],
              ).createShader(Rect.fromCircle(center: c, radius: r)),
          );
          canvas.drawCircle(
            c,
            r,
            Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = 2
              ..color = const Color(0x66FFFFFF),
          );
        case 'windmill':
          canvas.drawCircle(Offset(obs.x, obs.y), 8, Paint()..color = const Color(0xFF5D4037));
          final blades = getWindmillBladeWalls(obs, timeMs);
          final dark = Paint()
            ..style = PaintingStyle.stroke
            ..strokeCap = StrokeCap.round
            ..strokeWidth = 8
            ..color = const Color(0xFF4E342E);
          final light = Paint()
            ..style = PaintingStyle.stroke
            ..strokeCap = StrokeCap.round
            ..strokeWidth = 5
            ..color = const Color(0xFF8D6E63);
          for (final b in blades) {
            canvas.drawLine(_o(b.start), _o(b.end), dark);
          }
          for (final b in blades) {
            canvas.drawLine(_o(b.start), _o(b.end), light);
          }
      }
    }
  }

  void _walls(Canvas canvas) {
    Paint line(double width, Color color) => Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = width
      ..color = color;
    final shadow = line(8, const Color(0x59000000));
    final main = line(7, const Color(0xFF5D4037));
    final highlight = line(3, const Color(0xFF8D6E63));
    for (final w in hole.walls) {
      canvas.drawLine(_o(w.start) + const Offset(2, 2), _o(w.end) + const Offset(2, 2), shadow);
    }
    for (final w in hole.walls) {
      canvas.drawLine(_o(w.start), _o(w.end), main);
    }
    for (final w in hole.walls) {
      canvas.drawLine(_o(w.start), _o(w.end), highlight);
    }
  }

  void _cup(Canvas canvas) {
    final c = _o(hole.cup);
    canvas.drawCircle(c, kGolfPhysics.cupRadius * _s + 3, Paint()..color = const Color(0x66000000));
    canvas.drawCircle(c, kGolfPhysics.cupRadius * _s, Paint()..color = const Color(0xFF111111));
    canvas.drawLine(
      c + const Offset(3, -36),
      c + const Offset(3, 0),
      Paint()
        ..color = Colors.white
        ..strokeWidth = 2,
    );
    canvas.drawPath(
      Path()
        ..moveTo(c.dx + 3, c.dy - 36)
        ..lineTo(c.dx + 22, c.dy - 28)
        ..lineTo(c.dx + 3, c.dy - 20)
        ..close(),
      Paint()..color = const Color(0xFFE53935),
    );
  }

  void _ball(Canvas canvas) {
    if (ball.sunk) return;
    final r = kGolfPhysics.ballRadius * _s;
    final p = _o(ball.pos);
    canvas.drawCircle(p + const Offset(2, 2), r, Paint()..color = const Color(0x4D000000));
    canvas.drawCircle(
      p,
      r,
      Paint()
        ..shader = RadialGradient(
          center: Alignment(-3 / r, -3 / r),
          radius: 1,
          colors: const [Colors.white, Color(0xFFBDBDBD)],
        ).createShader(Rect.fromCircle(center: p, radius: r)),
    );
    canvas.drawCircle(
      p,
      r,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = const Color(0x26000000),
    );
  }

  void _golfer(Canvas canvas) {
    final bx = ball.pos.x;
    final by = ball.pos.y;
    final gx = bx - 28;
    final gy = by + 8;
    final breath = math.sin(timeMs * 0.003) * 1.5;
    Paint line(double w, Color c) => Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth = w
      ..color = c;
    canvas.drawOval(
      Rect.fromCenter(center: Offset(gx, gy + 32), width: 20, height: 8),
      Paint()..color = const Color(0x26000000),
    );
    final legs = line(3, const Color(0xFF1A237E));
    canvas.drawLine(Offset(gx, gy + 14), Offset(gx - 5, gy + 30), legs);
    canvas.drawLine(Offset(gx, gy + 14), Offset(gx + 5, gy + 30), legs);
    canvas.drawLine(Offset(gx, gy + 14), Offset(gx, gy - 4 + breath), line(4, const Color(0xFFE53935)));
    final arms = line(2.5, const Color(0xFFFFCCBC));
    canvas.drawLine(Offset(gx, gy + 2), Offset(gx + 12, gy + 8), arms);
    canvas.drawLine(Offset(gx, gy + 4), Offset(gx + 14, gy + 12), arms);
    canvas.drawLine(Offset(gx + 12, gy + 8), Offset(bx - 10, by), line(2, const Color(0xFF9E9E9E)));
    canvas.drawLine(Offset(bx - 12, by - 3), Offset(bx - 6, by + 3), line(3.5, const Color(0xFF616161)));
    canvas.drawCircle(Offset(gx, gy - 10 + breath), 7, Paint()..color = const Color(0xFFFFCCBC));
    canvas.drawArc(
      Rect.fromCenter(center: Offset(gx, gy - 14 + breath), width: 16, height: 8),
      math.pi,
      math.pi,
      true,
      Paint()..color = const Color(0xFF1565C0),
    );
  }

  void _aim(Canvas canvas) {
    final start = dragStart;
    final end = dragEnd;
    if (!aiming || start == null || end == null) return;
    final dir = calculateDirection(ball.pos, end);
    final power = calculatePower(start.distanceTo(end));
    final pn = power / kGolfPhysics.maxPower;
    final len = pn * 120;
    final alpha = 0.5 + pn * 0.5;
    final yellow = Color.fromRGBO(255, 255, 80, alpha);
    final from = _o(ball.pos);
    final tip = from + Offset(dir.x * len, dir.y * len);

    // Dashed aim line.
    final total = (tip - from).distance;
    final unit = total == 0 ? Offset.zero : (tip - from) / total;
    final dash = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = yellow;
    for (var d = 0.0; d < total; d += 12) {
      canvas.drawLine(from + unit * d, from + unit * math.min(d + 6, total), dash);
    }
    final ang = math.atan2(dir.y, dir.x);
    canvas.drawPath(
      Path()
        ..moveTo(tip.dx + dir.x * 6, tip.dy + dir.y * 6)
        ..lineTo(tip.dx - 10 * math.cos(ang - 0.5), tip.dy - 10 * math.sin(ang - 0.5))
        ..lineTo(tip.dx - 10 * math.cos(ang + 0.5), tip.dy - 10 * math.sin(ang + 0.5))
        ..close(),
      Paint()..color = yellow,
    );
    // Power ring.
    canvas.drawCircle(
      from,
      kGolfPhysics.ballRadius * _s + 5 + pn * 12,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = pn > 0.7
            ? const Color(0xFFEF5350)
            : pn > 0.4
                ? const Color(0xFFFFA726)
                : const Color(0xFF66BB6A),
    );
    // Power bar, top centre.
    const barW = 160.0, barH = 12.0;
    const barX = (kGolfFieldSize - barW) / 2, barY = 16.0;
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(barX - 2, barY - 2, barW + 4, barH + 4), const Radius.circular(8)),
      Paint()..color = const Color(0x80000000),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(barX, barY, barW, barH), const Radius.circular(6)),
      Paint()..color = const Color(0xFF1B5E20),
    );
    if (pn > 0) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(Rect.fromLTWH(barX, barY, barW * pn, barH), const Radius.circular(6)),
        Paint()
          ..shader = const LinearGradient(
            colors: [Color(0xFF66BB6A), Color(0xFFFDD835), Color(0xFFEF5350)],
          ).createShader(const Rect.fromLTWH(barX, barY, barW, barH)),
      );
    }
    _text(canvas, powerLabel((pn * 100).round()), const Offset(kGolfFieldSize / 2, barY + barH + 8),
        const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700));
  }

  void _wind(Canvas canvas) {
    const cx = kGolfFieldSize - 40, cy = 40.0;
    final rad = env.windDirection * math.pi / 180;
    final len = 10 + env.windSpeed * 1.2;
    const center = Offset(cx, cy);
    canvas.drawCircle(center, 22, Paint()..color = const Color(0x66000000));
    canvas.drawCircle(
      center,
      22,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = const Color(0x4DFFFFFF),
    );
    final end = center + Offset(math.cos(rad) * len, math.sin(rad) * len);
    final arrow = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..color = const Color(0xFF81D4FA);
    canvas.drawLine(center, end, arrow);
    const head = 6.0;
    canvas.drawLine(end, end - Offset(head * math.cos(rad - 0.4), head * math.sin(rad - 0.4)), arrow);
    canvas.drawLine(end, end - Offset(head * math.cos(rad + 0.4), head * math.sin(rad + 0.4)), arrow);
    _text(canvas, '💨', const Offset(cx, cy + 40), const TextStyle(fontSize: 14));
  }

  void _text(Canvas canvas, String text, Offset center, TextStyle style) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, center - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  bool shouldRepaint(GolfPainter old) => true;
}
