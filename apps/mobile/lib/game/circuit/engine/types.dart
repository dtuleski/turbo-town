// Circuit Builder engine: types, bounds and element specifications.
//
// Dart port of packages/shared/src/circuit/{types,constants,builders}.ts. The
// server re-evaluates every submitted layout with the TypeScript engine, so this
// port only has to agree with it (proved by test/fixtures/circuit_golden.json).

/// Kinds of element, in the order of web `ELEMENT_KINDS` (alphabetical).
enum ElementKind { battery, buzzer, led, motor, resistor, solar, switchKind, wire }

extension ElementKindX on ElementKind {
  /// Wire name used by the API and the locale keys (`switch`, not `switchKind`).
  String get id => this == ElementKind.switchKind ? 'switch' : name;

  static ElementKind? tryParse(String? id) {
    for (final k in ElementKind.values) {
      if (k.id == id) return k;
    }
    return null;
  }
}

/// One of 0, 90, 180, 270.
const List<int> kValidRotations = [0, 90, 180, 270];

class GridPosition {
  const GridPosition(this.col, this.row, [this.rotation = 0]);
  final int col;
  final int row;
  final int rotation;

  @override
  bool operator ==(Object other) =>
      other is GridPosition && other.col == col && other.row == row && other.rotation == rotation;
  @override
  int get hashCode => Object.hash(col, row, rotation);

  Map<String, dynamic> toJson() => {'col': col, 'row': row, 'rotation': rotation};
}

class GridSize {
  const GridSize(this.cols, this.rows);
  final int cols;
  final int rows;

  @override
  bool operator ==(Object other) => other is GridSize && other.cols == cols && other.rows == rows;
  @override
  int get hashCode => Object.hash(cols, rows);

  Map<String, dynamic> toJson() => {'cols': cols, 'rows': rows};
}

class CircuitElement {
  const CircuitElement({
    required this.id,
    required this.kind,
    required this.terminal0,
    required this.terminal1,
    required this.position,
    this.params,
  });

  final String id;
  final ElementKind kind;

  /// `terminal0` is the positive / forward-current entry terminal.
  final String terminal0;
  final String terminal1;
  final GridPosition position;
  final Map<String, double>? params;

  String terminal(int index) => index == 0 ? terminal0 : terminal1;

  CircuitElement copyWith({GridPosition? position}) => CircuitElement(
        id: id,
        kind: kind,
        terminal0: terminal0,
        terminal1: terminal1,
        position: position ?? this.position,
        params: params,
      );

  /// Exactly the keys the server accepts (its schema is strict).
  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': kind.id,
        'terminals': [terminal0, terminal1],
        'position': position.toJson(),
        if (params != null) 'params': {for (final e in params!.entries) e.key: e.value},
      };

  static CircuitElement? fromJson(Map<String, dynamic> j) {
    final kind = ElementKindX.tryParse(j['kind'] as String?);
    final terminals = j['terminals'];
    final pos = j['position'];
    if (kind == null || terminals is! List || terminals.length != 2 || pos is! Map) return null;
    final params = j['params'];
    return CircuitElement(
      id: j['id'] as String,
      kind: kind,
      terminal0: terminals[0] as String,
      terminal1: terminals[1] as String,
      position: GridPosition(
        (pos['col'] as num).toInt(),
        (pos['row'] as num).toInt(),
        (pos['rotation'] as num).toInt(),
      ),
      params: params is Map
          ? {for (final e in params.entries) e.key as String: (e.value as num).toDouble()}
          : null,
    );
  }
}

class Connection {
  const Connection(this.id, this.from, this.to);
  final String id;
  final String from;
  final String to;

  Connection copyWith({String? from, String? to}) =>
      Connection(id, from ?? this.from, to ?? this.to);

  Map<String, dynamic> toJson() => {'id': id, 'from': from, 'to': to};
}

class CircuitLayout {
  const CircuitLayout({
    required this.elements,
    required this.connections,
    required this.gridSize,
  });
  final List<CircuitElement> elements;
  final List<Connection> connections;
  final GridSize gridSize;

  CircuitLayout copyWith({List<CircuitElement>? elements, List<Connection>? connections}) =>
      CircuitLayout(
        elements: elements ?? this.elements,
        connections: connections ?? this.connections,
        gridSize: gridSize,
      );

  Map<String, dynamic> toJson() => {
        'elements': [for (final e in elements) e.toJson()],
        'connections': [for (final c in connections) c.toJson()],
        'gridSize': gridSize.toJson(),
      };
}

enum SwitchState { open, closed }

class Environment {
  const Environment({required this.sourceVoltage, required this.lightLevel});
  final double sourceVoltage;
  final double lightLevel;

  Environment copyWith({double? sourceVoltage, double? lightLevel}) => Environment(
        sourceVoltage: sourceVoltage ?? this.sourceVoltage,
        lightLevel: lightLevel ?? this.lightLevel,
      );

  Map<String, dynamic> toJson() => {'sourceVoltage': sourceVoltage, 'lightLevel': lightLevel};
}

/// Layout construction helpers (web `builders.ts`).
CircuitElement createElement(
  ElementKind kind, {
  required String id,
  GridPosition position = const GridPosition(0, 0),
  Map<String, double>? params,
}) =>
    CircuitElement(
      id: id,
      kind: kind,
      terminal0: '$id:0',
      terminal1: '$id:1',
      position: position,
      params: params,
    );

Map<String, SwitchState> defaultSwitchStates(
  CircuitLayout layout, [
  SwitchState state = SwitchState.closed,
]) =>
    {
      for (final e in layout.elements)
        if (e.kind == ElementKind.switchKind) e.id: state,
    };

// ---------------------------------------------------------------------------
// Bounds (web constants.ts)
// ---------------------------------------------------------------------------

const int kMaxElementCount = 64;
const int kMaxConnectionCount = 128;
const int kMaxGridCols = 24;
const int kMaxGridRows = 16;
const int kMinGridCols = 2;
const int kMinGridRows = 2;
const int kMaxIdLength = 64;
const double kMinSourceVoltage = 1.5;
const double kMaxSourceVoltage = 12;
const double kSourceVoltageStep = 0.5;
const double kMinLightLevel = 0;
const double kMaxLightLevel = 1;
const double kMinResistance = 1;
const double kMaxResistance = 10000;
const int kMaxMatrixDimension = 256;
const double kShortCircuitResistanceThreshold = 1.0;
const int kMaxFaultCountPerLevel = 20;
const double kCurrentEpsilon = 1e-9;
const double kPivotEpsilon = 1e-12;
const double kIntensityGamma = 2.2;
const double kMinVisibleIntensity = 0.08;
const double kEnergizeThresholdRatio = 0.05;
const double kSolarMaxVoltage = 6;
const double kDefaultResistorResistance = 470;
const String kInternalNodePrefix = '__src:';

class ElementSpec {
  const ElementSpec({
    this.resistance,
    this.internalResistance,
    this.ratedCurrent,
    required this.polarized,
    required this.isSource,
    required this.isLoad,
    required this.isConductor,
  });
  final double? resistance;
  final double? internalResistance;
  final double? ratedCurrent;
  final bool polarized;
  final bool isSource;
  final bool isLoad;
  final bool isConductor;
}

const Map<ElementKind, ElementSpec> kElementSpecs = {
  ElementKind.battery: ElementSpec(
      internalResistance: 0.5, polarized: false, isSource: true, isLoad: false, isConductor: false),
  ElementKind.solar: ElementSpec(
      internalResistance: 2.0, polarized: false, isSource: true, isLoad: false, isConductor: false),
  ElementKind.wire: ElementSpec(
      resistance: 0, polarized: false, isSource: false, isLoad: false, isConductor: true),
  ElementKind.switchKind: ElementSpec(
      resistance: 0, polarized: false, isSource: false, isLoad: false, isConductor: true),
  ElementKind.resistor:
      ElementSpec(polarized: false, isSource: false, isLoad: true, isConductor: false),
  ElementKind.led: ElementSpec(
      resistance: 30,
      ratedCurrent: 0.02,
      polarized: true,
      isSource: false,
      isLoad: true,
      isConductor: false),
  ElementKind.motor: ElementSpec(
      resistance: 60,
      ratedCurrent: 0.22,
      polarized: false,
      isSource: false,
      isLoad: true,
      isConductor: false),
  ElementKind.buzzer: ElementSpec(
      resistance: 180,
      ratedCurrent: 0.08,
      polarized: false,
      isSource: false,
      isLoad: true,
      isConductor: false),
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

enum FaultCode { shortCircuit, overcurrent, reversedPolarity, singularSystem }

extension FaultCodeX on FaultCode {
  /// Wire name, also the locale key suffix.
  String get id => switch (this) {
        FaultCode.shortCircuit => 'SHORT_CIRCUIT',
        FaultCode.overcurrent => 'OVERCURRENT',
        FaultCode.reversedPolarity => 'REVERSED_POLARITY',
        FaultCode.singularSystem => 'SINGULAR_SYSTEM',
      };
}

class Fault {
  const Fault(this.code, this.elementIds, [this.atPosition]);
  final FaultCode code;
  final List<String> elementIds;
  final GridPosition? atPosition;
}

class ElementResult {
  const ElementResult({
    required this.elementId,
    required this.kind,
    required this.current,
    required this.voltageDrop,
    required this.energized,
    required this.intensity,
  });
  final String elementId;
  final ElementKind kind;
  final double current;
  final double voltageDrop;
  final bool energized;
  final double intensity;
}

class CircuitResult {
  const CircuitResult({
    required this.nodeVoltages,
    required this.elements,
    required this.faults,
    required this.closedPathExists,
    required this.totalResistance,
    required this.totalCurrent,
  });
  final Map<String, double> nodeVoltages;
  final List<ElementResult> elements;
  final List<Fault> faults;
  final bool closedPathExists;
  final double totalResistance;
  final double totalCurrent;
}

enum EvaluationErrorCode { malformedInput, structuralInvalid, limitExceeded, internalError }

extension EvaluationErrorCodeX on EvaluationErrorCode {
  String get id => switch (this) {
        EvaluationErrorCode.malformedInput => 'MALFORMED_INPUT',
        EvaluationErrorCode.structuralInvalid => 'STRUCTURAL_INVALID',
        EvaluationErrorCode.limitExceeded => 'LIMIT_EXCEEDED',
        EvaluationErrorCode.internalError => 'INTERNAL_ERROR',
      };
}

/// Either a [CircuitResult] or an error code (web `EvaluationOutcome`).
class EvaluationOutcome {
  const EvaluationOutcome.result(CircuitResult this.result) : error = null;
  const EvaluationOutcome.failure(EvaluationErrorCode this.error) : result = null;
  final CircuitResult? result;
  final EvaluationErrorCode? error;
  bool get ok => result != null;
}

// ---------------------------------------------------------------------------
// Levels, machines
// ---------------------------------------------------------------------------

enum NumericDisclosure { none, qualitative, valuesTier, full }

extension NumericDisclosureX on NumericDisclosure {
  /// Wire name (`values` on the web; the enum member cannot be called that).
  String get id => this == NumericDisclosure.valuesTier ? 'values' : name;
}

class LevelDefinition {
  const LevelDefinition({
    required this.id,
    required this.difficulty,
    required this.numericDisclosure,
    required this.gridSize,
    required this.availableComponents,
    required this.prePlaced,
    required this.lockedElementIds,
    required this.targetMachineId,
    required this.successConditionId,
    required this.conceptTag,
    this.maxFaultCount,
  });
  final String id;
  final int difficulty;
  final NumericDisclosure numericDisclosure;
  final GridSize gridSize;
  final Map<ElementKind, int> availableComponents;
  final List<CircuitElement> prePlaced;
  final List<String> lockedElementIds;
  final String targetMachineId;
  final String successConditionId;
  final String conceptTag;
  final int? maxFaultCount;
}

class FaultCountClamp {
  const FaultCountClamp(this.value, this.wasClamped, this.wasMalformed);
  final int value;
  final bool wasClamped;
  final bool wasMalformed;
}

/// Code-unit comparison, never locale aware (web `compareIds`).
int compareIds(String a, String b) => a.compareTo(b);
