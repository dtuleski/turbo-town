import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../game/circuit/engine/engine.dart';
import '../../../game/circuit/geometry.dart';
import '../../../game/circuit/presentation.dart';
import '../../../game/circuit/state.dart';

const Color _boardColor = Color(0xFF0B1220);
const Color _gridColor = Color(0xFF1E293B);
const Color _idleWire = Color(0xFF64748B);
const Color _liveWire = Color(0xFF22D3EE);

Color _kindColor(ElementKind kind) => switch (kind) {
      ElementKind.battery => const Color(0xFFF59E0B),
      ElementKind.solar => const Color(0xFFEAB308),
      ElementKind.wire => const Color(0xFF94A3B8),
      ElementKind.switchKind => const Color(0xFF38BDF8),
      ElementKind.resistor => const Color(0xFFA78BFA),
      ElementKind.led => const Color(0xFFFB7185),
      ElementKind.motor => const Color(0xFF34D399),
      ElementKind.buzzer => const Color(0xFFF472B6),
    };

/// Short text drawn on a part (the locale's abbreviation).
typedef AbbrOf = String Function(ElementKind kind);

/// Draws the building grid: cells, wires, parts, terminals, the fault mark and
/// the selection. `result` is what the board shows as live (null while the fuse
/// is blown), `faults` the raw engine faults.
class CircuitPainter extends CustomPainter {
  CircuitPainter({
    required this.viewport,
    required this.layout,
    required this.switches,
    required this.result,
    required this.faults,
    required this.fuseBlown,
    required this.abbr,
    this.selectedElementId,
    this.pendingTerminal,
    this.dragElementId,
    this.dragCell,
    this.armed = false,
  });

  final CircuitViewport viewport;
  final CircuitLayout layout;
  final Map<String, SwitchState> switches;
  final CircuitResult? result;
  final List<Fault> faults;
  final bool fuseBlown;
  final AbbrOf abbr;
  final String? selectedElementId;
  final TerminalRef? pendingTerminal;
  final String? dragElementId;
  final GridCell? dragCell;
  final bool armed;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = _boardColor);
    _paintGrid(canvas);
    final byId = {for (final e in result?.elements ?? const <ElementResult>[]) e.elementId: e};
    _paintConnections(canvas, byId);
    for (final e in layout.elements) {
      _paintElement(canvas, e, byId[e.id]);
    }
    _paintFault(canvas);
    final drag = dragCell;
    if (drag != null) {
      final c = cellToPoint(drag, viewport);
      final r = Rect.fromCenter(center: c, width: viewport.cellSize, height: viewport.cellSize);
      canvas.drawRRect(
        RRect.fromRectAndRadius(r.deflate(3), const Radius.circular(8)),
        Paint()
          ..color = const Color(0x6622D3EE)
          ..style = PaintingStyle.fill,
      );
    }
  }

  void _paintGrid(Canvas canvas) {
    final paint = Paint()
      ..color = _gridColor
      ..strokeWidth = 1;
    final w = viewport.cols * viewport.cellSize;
    final h = viewport.rows * viewport.cellSize;
    for (var c = 0; c <= viewport.cols; c++) {
      final x = viewport.originX + c * viewport.cellSize;
      canvas.drawLine(Offset(x, viewport.originY), Offset(x, viewport.originY + h), paint);
    }
    for (var r = 0; r <= viewport.rows; r++) {
      final y = viewport.originY + r * viewport.cellSize;
      canvas.drawLine(Offset(viewport.originX, y), Offset(viewport.originX + w, y), paint);
    }
  }

  void _paintConnections(Canvas canvas, Map<String, ElementResult> byId) {
    final byNode = <String, ({CircuitElement element, int index})>{};
    for (final e in layout.elements) {
      byNode[e.terminal0] = (element: e, index: 0);
      byNode[e.terminal1] = (element: e, index: 1);
    }
    for (final c in layout.connections) {
      final a = byNode[c.from];
      final b = byNode[c.to];
      if (a == null || b == null) continue;
      final live = isConnectionEnergized(
          byId[a.element.id], byId[b.element.id], fuseBlown || result == null);
      canvas.drawLine(
        terminalAnchor(a.element, a.index, viewport),
        terminalAnchor(b.element, b.index, viewport),
        Paint()
          ..color = live ? _liveWire : _idleWire
          ..strokeWidth = live ? 4 : 3
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  void _paintElement(Canvas canvas, CircuitElement e, ElementResult? r) {
    final s = viewport.cellSize;
    final centre = cellToPoint(GridCell(e.position.col, e.position.row), viewport);
    final color = _kindColor(e.kind);
    final energized = r?.energized ?? false;
    final intensity = r?.intensity ?? 0;
    final selected = e.id == selectedElementId;
    final dragging = e.id == dragElementId;

    final a = terminalAnchor(e, 0, viewport);
    final b = terminalAnchor(e, 1, viewport);
    // Lead between the terminals.
    canvas.drawLine(
      a,
      b,
      Paint()
        ..color = energized ? _liveWire : _idleWire
        ..strokeWidth = 3,
    );

    if (e.kind == ElementKind.wire) {
      // A wire is just its lead.
    } else if (e.kind == ElementKind.switchKind) {
      final closed = switches[e.id] == SwitchState.closed;
      final p = Paint()
        ..color = closed ? color : const Color(0xFF94A3B8)
        ..strokeWidth = 5
        ..strokeCap = StrokeCap.round;
      final lift = closed ? 0.0 : s * 0.22;
      canvas.drawLine(Offset(a.dx + s * 0.05, a.dy), Offset(b.dx - s * 0.05, b.dy - lift), p);
    } else {
      if ((e.kind == ElementKind.led ||
              e.kind == ElementKind.motor ||
              e.kind == ElementKind.buzzer) &&
          energized) {
        final glow = 0.25 + 0.55 * intensity;
        canvas.drawCircle(
          centre,
          s * (0.34 + 0.2 * intensity),
          Paint()..color = Color.fromRGBO(253, 224, 71, glow),
        );
      }
      final body = Rect.fromCenter(center: centre, width: s * 0.5, height: s * 0.4);
      canvas.drawRRect(
        RRect.fromRectAndRadius(body, const Radius.circular(8)),
        Paint()..color = energized ? color : color.withValues(alpha: 0.55),
      );
      _text(canvas, abbr(e.kind), centre, s * 0.17, const Color(0xFF0F172A));
    }

    // Polarity mark on the positive terminal.
    final polar = kElementSpecs[e.kind]!;
    if (polar.polarized || polar.isSource) {
      _text(canvas, '+', a + Offset(0, -s * 0.2), s * 0.2, const Color(0xFFFDE68A));
    }

    // Terminals.
    for (final index in const [0, 1]) {
      final p = terminalAnchor(e, index, viewport);
      final pending = pendingTerminal == TerminalRef(e.id, index);
      canvas.drawCircle(p, s * (pending ? 0.12 : 0.075),
          Paint()..color = pending ? const Color(0xFFFDE047) : const Color(0xFFE2E8F0));
    }

    if (selected || dragging) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: centre, width: s * 0.94, height: s * 0.94),
          const Radius.circular(10),
        ),
        Paint()
          ..color = const Color(0xFF22D3EE)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5,
      );
    }
  }

  void _paintFault(Canvas canvas) {
    if (!fuseBlown || faults.isEmpty) return;
    final at = faults.first.atPosition;
    if (at == null) return;
    final c = cellToPoint(GridCell(at.col, at.row), viewport);
    final s = viewport.cellSize;
    final red = Paint()..color = const Color(0xFFEF4444);
    final amber = Paint()..color = const Color(0xFFFBBF24);
    // A star burst: eight spikes.
    final path = Path();
    for (var i = 0; i < 16; i++) {
      final r = i.isEven ? s * 0.5 : s * 0.24;
      final ang = i * math.pi / 8;
      final p = c + Offset(math.cos(ang) * r, math.sin(ang) * r);
      i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
    }
    path.close();
    canvas.drawPath(path, red);
    canvas.drawCircle(c, s * 0.14, amber);
  }

  void _text(Canvas canvas, String text, Offset centre, double fontSize, Color color) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(color: color, fontSize: fontSize, fontWeight: FontWeight.w800),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, centre - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  bool shouldRepaint(CircuitPainter old) => true;
}
