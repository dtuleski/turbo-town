import 'dart:math' as math;
import 'dart:typed_data';

import 'topology.dart';
import 'types.dart';

/// Dense square matrix over a flat Float64List (web `matrix.ts`).
class Matrix {
  Matrix(this.dimension) : _data = Float64List(dimension * dimension);
  Matrix._copy(this.dimension, this._data);

  final int dimension;
  final Float64List _data;

  double get(int row, int col) => _data[row * dimension + col];
  void set(int row, int col, double value) => _data[row * dimension + col] = value;
  void add(int row, int col, double delta) => _data[row * dimension + col] += delta;

  void swapRows(int a, int b) {
    if (a == b) return;
    for (var col = 0; col < dimension; col++) {
      final temp = get(a, col);
      set(a, col, get(b, col));
      set(b, col, temp);
    }
  }

  double infinityNorm() {
    var norm = 0.0;
    for (var row = 0; row < dimension; row++) {
      var rowSum = 0.0;
      for (var col = 0; col < dimension; col++) {
        rowSum += get(row, col).abs();
      }
      if (rowSum > norm) norm = rowSum;
    }
    return norm;
  }

  Matrix clone() => Matrix._copy(dimension, Float64List.fromList(_data));
}

/// Solution values, or null when the system is singular.
Float64List? solveGaussian(Matrix matrix, Float64List rhs) {
  final size = matrix.dimension;
  if (size == 0) return Float64List(0);
  final working = matrix.clone();
  final vector = Float64List.fromList(rhs);
  final tolerance = kPivotEpsilon * working.infinityNorm();
  for (var col = 0; col < size; col++) {
    var pivotRow = col;
    var best = working.get(col, col).abs();
    for (var row = col + 1; row < size; row++) {
      final candidate = working.get(row, col).abs();
      if (candidate > best) {
        best = candidate;
        pivotRow = row;
      }
    }
    if (working.get(pivotRow, col).abs() <= tolerance) return null;
    if (pivotRow != col) {
      working.swapRows(pivotRow, col);
      final temp = vector[pivotRow];
      vector[pivotRow] = vector[col];
      vector[col] = temp;
    }
    final pivot = working.get(col, col);
    for (var row = col + 1; row < size; row++) {
      final leading = working.get(row, col);
      if (leading == 0) continue;
      final factor = leading / pivot;
      working.set(row, col, 0);
      for (var k = col + 1; k < size; k++) {
        working.add(row, k, -factor * working.get(col, k));
      }
      vector[row] = vector[row] - factor * vector[col];
    }
  }
  final values = Float64List(size);
  for (var row = size - 1; row >= 0; row--) {
    var sum = vector[row];
    for (var col = row + 1; col < size; col++) {
      sum -= working.get(row, col) * values[col];
    }
    final pivot = working.get(row, row);
    if (pivot == 0) return null;
    values[row] = sum / pivot;
  }
  return values;
}

class LinearSystem {
  const LinearSystem({
    required this.dimension,
    required this.matrix,
    required this.rhs,
    required this.nodeIndex,
    required this.referenceNodes,
    required this.sourceBranchIndex,
    required this.internalNodeOf,
  });
  final int dimension;
  final Matrix matrix;
  final Float64List rhs;
  final Map<String, int> nodeIndex;
  final List<String> referenceNodes;
  final Map<String, int> sourceBranchIndex;
  final Map<String, String> internalNodeOf;
}

double _clamp01(double value) {
  if (!value.isFinite) return 0;
  return value < 0 ? 0 : (value > 1 ? 1 : value);
}

void _stampConductance(Matrix m, Map<String, int> nodeIndex, String a, String b, double g) {
  final ia = nodeIndex[a];
  final ib = nodeIndex[b];
  if (ia != null) m.add(ia, ia, g);
  if (ib != null) m.add(ib, ib, g);
  if (ia != null && ib != null) {
    m.add(ia, ib, -g);
    m.add(ib, ia, -g);
  }
}

void _stampSource(
  Matrix matrix,
  Float64List rhs,
  Map<String, int> nodeIndex,
  GraphEdge edge,
  int branchIndex,
  String? internalNode,
) {
  final positive = edge.from;
  final negative = internalNode ?? edge.to;
  final ip = nodeIndex[positive];
  final ineg = nodeIndex[negative];
  if (ip != null) {
    matrix.add(ip, branchIndex, 1);
    matrix.add(branchIndex, ip, 1);
  }
  if (ineg != null) {
    matrix.add(ineg, branchIndex, -1);
    matrix.add(branchIndex, ineg, -1);
  }
  rhs[branchIndex] = edge.sourceVoltage;
  if (internalNode != null) {
    _stampConductance(matrix, nodeIndex, internalNode, edge.to, 1 / edge.resistance);
  }
}

LinearSystem buildConductanceMatrix(ElectricalGraph graph) {
  final references = <String>[
    for (final component in findConnectedComponents(graph))
      if (component.isNotEmpty) component.first,
  ]..sort(compareIds);
  final internalNodeOf = <String, String>{
    for (final s in graph.sources)
      if (s.resistance > 0) s.elementId: '$kInternalNodePrefix${s.elementId}',
  };
  final grounded = references.toSet();
  final solverNodes = [...graph.nodes, ...internalNodeOf.values]..sort(compareIds);
  final nodeIndex = <String, int>{};
  for (final node in solverNodes) {
    if (!grounded.contains(node)) nodeIndex[node] = nodeIndex.length;
  }
  final sortedSources = [...graph.sources]..sort((a, b) => compareIds(a.elementId, b.elementId));
  final sourceBranchIndex = <String, int>{};
  for (final s in sortedSources) {
    sourceBranchIndex[s.elementId] = nodeIndex.length + sourceBranchIndex.length;
  }
  final dimension = nodeIndex.length + sourceBranchIndex.length;
  if (dimension > kMaxMatrixDimension) {
    throw RangeError('circuit exceeds the maximum supported matrix dimension');
  }
  final matrix = Matrix(dimension);
  final rhs = Float64List(dimension);
  for (final edge in graph.edges) {
    if (!kElementSpecs[edge.kind]!.isSource && edge.resistance > 0) {
      _stampConductance(matrix, nodeIndex, edge.from, edge.to, 1 / edge.resistance);
    }
  }
  for (final source in sortedSources) {
    final branch = sourceBranchIndex[source.elementId];
    if (branch != null) {
      _stampSource(matrix, rhs, nodeIndex, source, branch, internalNodeOf[source.elementId]);
    }
  }
  return LinearSystem(
    dimension: dimension,
    matrix: matrix,
    rhs: rhs,
    nodeIndex: nodeIndex,
    referenceNodes: references,
    sourceBranchIndex: sourceBranchIndex,
    internalNodeOf: internalNodeOf,
  );
}

double _voltageAt(LinearSystem system, Float64List values, String node) {
  final index = system.nodeIndex[node];
  return index == null ? 0 : values[index];
}

Map<String, double> nodeVoltagesOf(
        LinearSystem system, Float64List values, ElectricalGraph graph) =>
    {for (final node in graph.nodes) node: _voltageAt(system, values, node)};

({bool energized, double intensity}) presentationOf(ElementSpec spec, double current) {
  final rated = spec.ratedCurrent;
  if (rated == null || rated <= 0) {
    return (energized: current.abs() > kCurrentEpsilon, intensity: 0);
  }
  if (spec.polarized && current < -kCurrentEpsilon) return (energized: false, intensity: 0);
  final ratio = current.abs() / rated;
  if (ratio < kEnergizeThresholdRatio) return (energized: false, intensity: 0);
  final curved = kMinVisibleIntensity +
      (1 - kMinVisibleIntensity) * math.pow(ratio, 1 / kIntensityGamma).toDouble();
  return (energized: true, intensity: _clamp01(curved));
}

Set<String> _energizedNodes(ElectricalGraph graph, Map<String, double> currents) {
  final live = <String>{};
  for (final component in findConnectedComponents(graph)) {
    final members = component.toSet();
    final delivering = graph.sources.any(
      (s) => members.contains(s.from) && (currents[s.elementId] ?? 0).abs() > kCurrentEpsilon,
    );
    if (delivering) live.addAll(component);
  }
  return live;
}

List<ElementResult> deriveElementResults(
  LinearSystem system,
  Float64List values,
  ElectricalGraph graph,
) {
  final currents = <String, double>{};
  for (final source in graph.sources) {
    final branch = system.sourceBranchIndex[source.elementId];
    currents[source.elementId] = branch == null ? 0 : values[branch];
  }
  final live = _energizedNodes(graph, currents);
  final edgeByElement = {for (final e in graph.edges) e.elementId: e};
  final openSwitches = graph.openSwitchIds.toSet();
  final results = <ElementResult>[];
  for (final entry in graph.netlist.elements) {
    final element = entry.element;
    final edge = edgeByElement[element.id];
    final spec = kElementSpecs[element.kind]!;
    if (edge == null) {
      final canonical = graph.canonicalByTerminal[element.terminal0] ?? element.terminal0;
      final conducting = spec.isConductor && !openSwitches.contains(element.id);
      results.add(ElementResult(
        elementId: element.id,
        kind: element.kind,
        current: 0,
        voltageDrop: 0,
        energized: conducting && live.contains(canonical),
        intensity: 0,
      ));
      continue;
    }
    final drop = _voltageAt(system, values, edge.from) - _voltageAt(system, values, edge.to);
    final current = spec.isSource
        ? (currents[element.id] ?? 0)
        : (edge.resistance > 0 ? drop / edge.resistance : 0.0);
    final p = presentationOf(spec, current);
    results.add(ElementResult(
      elementId: element.id,
      kind: element.kind,
      current: current,
      voltageDrop: drop,
      energized: p.energized,
      intensity: p.intensity,
    ));
  }
  return results..sort((a, b) => compareIds(a.elementId, b.elementId));
}

({double totalResistance, double totalCurrent}) summarize(
  ElectricalGraph graph,
  List<ElementResult> results,
) {
  final sourceIds = graph.sources.map((s) => s.elementId).toSet();
  ElementResult? dominant;
  for (final r in results) {
    if (!sourceIds.contains(r.elementId)) continue;
    if (dominant == null || r.current.abs() > dominant.current.abs()) dominant = r;
  }
  if (dominant == null) return (totalResistance: 0, totalCurrent: 0);
  final magnitude = dominant.current.abs();
  return (
    totalResistance: magnitude > kCurrentEpsilon ? dominant.voltageDrop.abs() / magnitude : 0,
    totalCurrent: magnitude,
  );
}
