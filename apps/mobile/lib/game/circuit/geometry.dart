// Canvas geometry, snap-to-grid and hit testing (web `circuitBuilderGeometry.ts`).
// Coordinates are logical scene pixels. The scene is `cols * cellSize` wide
// (plus padding), and the screen scales it with pinch and pan.
import 'dart:ui' show Offset, Size;

import 'engine/engine.dart';
import 'state.dart';

/// Edge of one cell in scene pixels. Large enough that a terminal can be
/// tapped at the default zoom on a phone.
const double kCircuitCellSize = 56;

/// Scene pixels kept clear around the grid.
const double kCircuitPadding = 12;

/// Terminal grab radius as a fraction of the cell.
const double kTerminalHitRatio = 0.3;

/// Connection grab distance as a fraction of the cell.
const double kConnectionHitRatio = 0.14;

/// Terminal anchor offset from the cell centre as a fraction of the cell.
const double kTerminalOffsetRatio = 0.42;

class CircuitViewport {
  const CircuitViewport({required this.cols, required this.rows, this.cellSize = kCircuitCellSize});
  factory CircuitViewport.forGrid(GridSize grid) =>
      CircuitViewport(cols: grid.cols, rows: grid.rows);

  final int cols;
  final int rows;
  final double cellSize;

  double get originX => kCircuitPadding;
  double get originY => kCircuitPadding;
  Size get sceneSize => Size(
        cols * cellSize + 2 * kCircuitPadding,
        rows * cellSize + 2 * kCircuitPadding,
      );
}

Offset cellToPoint(GridCell cell, CircuitViewport v) => Offset(
      v.originX + (cell.col + 0.5) * v.cellSize,
      v.originY + (cell.row + 0.5) * v.cellSize,
    );

/// The cell containing [p], or null outside the grid (never the nearest edge
/// cell, so a stray release cannot place a part where the player did not aim).
GridCell? pointToCell(Offset p, CircuitViewport v) {
  if (!p.dx.isFinite || !p.dy.isFinite) return null;
  final col = ((p.dx - v.originX) / v.cellSize).floor();
  final row = ((p.dy - v.originY) / v.cellSize).floor();
  if (col < 0 || row < 0 || col >= v.cols || row >= v.rows) return null;
  return GridCell(col, row);
}

/// Where terminal 0 or 1 of [element] sits. Rotation 0 puts terminal 0 left and
/// terminal 1 right; each 90 degrees turns the pair clockwise.
Offset terminalAnchor(CircuitElement element, int index, CircuitViewport v) {
  final centre = cellToPoint(GridCell(element.position.col, element.position.row), v);
  final offset = kTerminalOffsetRatio * v.cellSize;
  switch (element.position.rotation) {
    case 0:
      return Offset(centre.dx + (index == 0 ? -offset : offset), centre.dy);
    case 90:
      return Offset(centre.dx, centre.dy + (index == 0 ? -offset : offset));
    case 180:
      return Offset(centre.dx + (index == 0 ? offset : -offset), centre.dy);
    default:
      return Offset(centre.dx, centre.dy + (index == 0 ? offset : -offset));
  }
}

double distanceToSegment(Offset p, Offset a, Offset b) {
  final dx = b.dx - a.dx;
  final dy = b.dy - a.dy;
  final lengthSquared = dx * dx + dy * dy;
  if (lengthSquared == 0) return (p - a).distance;
  final raw = ((p.dx - a.dx) * dx + (p.dy - a.dy) * dy) / lengthSquared;
  final t = raw.clamp(0.0, 1.0);
  return (p - Offset(a.dx + t * dx, a.dy + t * dy)).distance;
}

sealed class HitTarget {
  const HitTarget();
}

class TerminalHit extends HitTarget {
  const TerminalHit(this.ref, this.cell);
  final TerminalRef ref;
  final GridCell cell;
}

class ElementHit extends HitTarget {
  const ElementHit(this.elementId, this.cell, this.kind);
  final String elementId;
  final GridCell cell;
  final ElementKind kind;
}

class ConnectionHit extends HitTarget {
  const ConnectionHit(this.connectionId);
  final String connectionId;
}

class CellHit extends HitTarget {
  const CellHit(this.cell);
  final GridCell cell;
}

class OutsideHit extends HitTarget {
  const OutsideHit();
}

/// What the player is pointing at. Priority: terminal, element body,
/// connection, empty cell, outside.
HitTarget hitTest(Offset p, CircuitLayout layout, CircuitViewport v) {
  // Nearest terminal within the grab radius.
  final radius = kTerminalHitRatio * v.cellSize;
  TerminalHit? bestTerminal;
  var bestDistance = double.infinity;
  for (final e in layout.elements) {
    for (final index in const [0, 1]) {
      final d = (p - terminalAnchor(e, index, v)).distance;
      if (d <= radius && d < bestDistance) {
        bestDistance = d;
        bestTerminal = TerminalHit(
          TerminalRef(e.id, index),
          GridCell(e.position.col, e.position.row),
        );
      }
    }
  }
  if (bestTerminal != null) return bestTerminal;

  final cell = pointToCell(p, v);
  if (cell != null) {
    for (final e in layout.elements) {
      if (e.position.col == cell.col && e.position.row == cell.row) {
        return ElementHit(e.id, cell, e.kind);
      }
    }
  }

  final byNode = <String, ({CircuitElement element, int index})>{};
  for (final e in layout.elements) {
    byNode[e.terminal0] = (element: e, index: 0);
    byNode[e.terminal1] = (element: e, index: 1);
  }
  final connectionRadius = kConnectionHitRatio * v.cellSize;
  String? bestConnection;
  var bestConnectionDistance = double.infinity;
  for (final c in layout.connections) {
    final a = byNode[c.from];
    final b = byNode[c.to];
    if (a == null || b == null) continue;
    final d = distanceToSegment(
      p,
      terminalAnchor(a.element, a.index, v),
      terminalAnchor(b.element, b.index, v),
    );
    if (d <= connectionRadius && d < bestConnectionDistance) {
      bestConnectionDistance = d;
      bestConnection = c.id;
    }
  }
  if (bestConnection != null) return ConnectionHit(bestConnection);
  return cell == null ? const OutsideHit() : CellHit(cell);
}
