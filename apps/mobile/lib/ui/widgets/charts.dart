import 'package:flutter/material.dart';

/// Vertical bars with an optional line over them, drawn with a plain
/// CustomPainter. Values are fractions of the chart height (0..1).
class MiniBarChart extends StatelessWidget {
  const MiniBarChart({
    super.key,
    required this.values,
    required this.colors,
    this.line,
    this.lineColor = const Color(0xFFF59E0B),
    this.height = 140,
  });

  final List<double> values;
  final List<Color> colors;
  final List<double>? line;
  final Color lineColor;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _BarPainter(values, colors, line, lineColor),
      ),
    );
  }
}

class _BarPainter extends CustomPainter {
  _BarPainter(this.values, this.colors, this.line, this.lineColor);

  final List<double> values;
  final List<Color> colors;
  final List<double>? line;
  final Color lineColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final slot = size.width / values.length;
    final barWidth = slot * 0.7;
    for (var i = 0; i < values.length; i++) {
      final v = values[i].clamp(0.0, 1.0);
      final h = v == 0 ? 0.0 : (size.height * v).clamp(3.0, size.height);
      final left = i * slot + (slot - barWidth) / 2;
      canvas.drawRRect(
        RRect.fromRectAndCorners(
          Rect.fromLTWH(left, size.height - h, barWidth, h),
          topLeft: const Radius.circular(4),
          topRight: const Radius.circular(4),
        ),
        Paint()..color = colors[i % colors.length].withValues(alpha: 0.85),
      );
    }
    final pts = line;
    if (pts != null && pts.length > 1) {
      final path = Path();
      for (var i = 0; i < pts.length; i++) {
        final x = i * slot + slot / 2;
        final y = size.height - size.height * pts[i].clamp(0.0, 1.0);
        i == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
      }
      canvas.drawPath(
        path,
        Paint()
          ..color = lineColor
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    }
  }

  @override
  bool shouldRepaint(_BarPainter old) =>
      old.values != values || old.line != line || old.colors != colors;
}
