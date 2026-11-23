import 'package:flutter/material.dart';
import 'package:path_drawing/path_drawing.dart';

import '../../../game/jigsaw/jigsaw_scenes.g.dart';

/// One drawable shape of a scene, in the 400x400 space of the web SVGs.
class _Shape {
  _Shape(this.path, this.fill, this.stroke, this.strokeWidth);
  final Path path;
  final Paint? fill;
  final Paint? stroke;
  final double strokeWidth;
}

final RegExp _tag = RegExp(r'<(rect|circle|ellipse|polygon|path)\s([^>]*?)/?>');
final RegExp _attr = RegExp(r'([a-z-]+)="([^"]*)"');

Color? _color(String? v, double opacity) {
  if (v == null || v == 'none') return null;
  final hex = v.startsWith('#') ? v.substring(1) : v;
  final rgb = hex.length == 3 ? hex.split('').map((c) => '$c$c').join() : hex;
  final n = int.tryParse(rgb, radix: 16);
  if (n == null) {
    return v == 'white' ? Colors.white.withValues(alpha: opacity) : null;
  }
  return Color(0xFF000000 | n).withValues(alpha: opacity);
}

Path _polygon(String points) {
  final nums = points
      .split(RegExp(r'[\s,]+'))
      .where((s) => s.isNotEmpty)
      .map(double.parse)
      .toList();
  final p = Path()..moveTo(nums[0], nums[1]);
  for (var i = 2; i + 1 < nums.length; i += 2) {
    p.lineTo(nums[i], nums[i + 1]);
  }
  return p..close();
}

final Map<String, List<_Shape>> _cache = {};

List<_Shape> _shapesFor(String sceneId) {
  return _cache.putIfAbsent(sceneId, () {
    final svg = kJigsawSceneSvg[sceneId] ?? kJigsawSceneSvg['sunset']!;
    final shapes = <_Shape>[];
    for (final m in _tag.allMatches(svg)) {
      final attrs = {for (final a in _attr.allMatches(m.group(2)!)) a.group(1)!: a.group(2)!};
      double n(String k) => double.parse(attrs[k] ?? '0');
      final opacity = double.parse(attrs['opacity'] ?? '1');
      final Path path;
      switch (m.group(1)) {
        case 'rect':
          final rect = Rect.fromLTWH(n('x'), n('y'), n('width'), n('height'));
          path = attrs.containsKey('rx')
              ? (Path()..addRRect(RRect.fromRectXY(rect, n('rx'), n('rx'))))
              : (Path()..addRect(rect));
        case 'circle':
          path = Path()..addOval(Rect.fromCircle(center: Offset(n('cx'), n('cy')), radius: n('r')));
        case 'ellipse':
          path = Path()
            ..addOval(Rect.fromCenter(
                center: Offset(n('cx'), n('cy')), width: n('rx') * 2, height: n('ry') * 2));
        case 'polygon':
          path = _polygon(attrs['points']!);
        default:
          path = parseSvgPathData(attrs['d']!);
      }
      final fillColor = _color(attrs['fill'], opacity);
      final strokeColor = _color(attrs['stroke'], opacity);
      shapes.add(_Shape(
        path,
        fillColor == null ? null : (Paint()..color = fillColor),
        strokeColor == null
            ? null
            : (Paint()
              ..color = strokeColor
              ..style = PaintingStyle.stroke
              ..strokeWidth = double.parse(attrs['stroke-width'] ?? '1')),
        double.parse(attrs['stroke-width'] ?? '1'),
      ));
    }
    return shapes;
  });
}

/// Draws a jigsaw scene (same pictures as web) scaled to the widget. With
/// [pieceRow]/[pieceCol] only that cell of a [gridSize] x [gridSize] split is
/// drawn, filling the widget.
class JigsawScenePainter extends CustomPainter {
  const JigsawScenePainter(this.sceneId, {this.gridSize = 1, this.pieceRow = 0, this.pieceCol = 0});

  final String sceneId;
  final int gridSize;
  final int pieceRow;
  final int pieceCol;

  @override
  void paint(Canvas canvas, Size size) {
    final cell = 400 / gridSize;
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    canvas.scale(size.width / cell, size.height / cell);
    canvas.translate(-pieceCol * cell, -pieceRow * cell);
    for (final s in _shapesFor(sceneId)) {
      if (s.fill != null) canvas.drawPath(s.path, s.fill!);
      if (s.stroke != null) canvas.drawPath(s.path, s.stroke!);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(JigsawScenePainter old) =>
      old.sceneId != sceneId ||
      old.gridSize != gridSize ||
      old.pieceRow != pieceRow ||
      old.pieceCol != pieceCol;
}

/// Number of shapes parsed for a scene (used by tests).
int jigsawSceneShapeCount(String sceneId) => _shapesFor(sceneId).length;
