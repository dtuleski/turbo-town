// Circuit Builder surface state: the Dart port of web `circuitBuilderState.ts`.
// Pure functions over an immutable state; every action is validated here and
// refusals are reported as codes (copy lives in the locale files).
import 'engine/engine.dart';

class TerminalRef {
  const TerminalRef(this.elementId, this.terminalIndex);
  final String elementId;
  final int terminalIndex;

  @override
  bool operator ==(Object other) =>
      other is TerminalRef && other.elementId == elementId && other.terminalIndex == terminalIndex;
  @override
  int get hashCode => Object.hash(elementId, terminalIndex);
}

class GridCell {
  const GridCell(this.col, this.row);
  final int col;
  final int row;

  @override
  bool operator ==(Object other) => other is GridCell && other.col == col && other.row == row;
  @override
  int get hashCode => Object.hash(col, row);
}

enum RejectionCode {
  outOfBounds('OUT_OF_BOUNDS'),
  cellOccupied('CELL_OCCUPIED'),
  overBudget('OVER_BUDGET'),
  elementLimit('ELEMENT_LIMIT'),
  connectionLimit('CONNECTION_LIMIT'),
  unknownElement('UNKNOWN_ELEMENT'),
  unknownConnection('UNKNOWN_CONNECTION'),
  elementLocked('ELEMENT_LOCKED'),
  notASwitch('NOT_A_SWITCH'),
  selfConnection('SELF_CONNECTION'),
  duplicateConnection('DUPLICATE_CONNECTION'),
  invalidVoltage('INVALID_VOLTAGE'),
  invalidLightLevel('INVALID_LIGHT_LEVEL');

  const RejectionCode(this.id);
  final String id;
}

/// Initial supply voltage (web `INITIAL_SOURCE_VOLTAGE`).
const double kInitialSourceVoltage = 9;
const double kInitialLightLevel = 1;

class CircuitBuilderState {
  const CircuitBuilderState({
    required this.level,
    required this.layout,
    required this.switches,
    required this.environment,
    this.fuseBlown = false,
    this.faultEpoch = 0,
    this.faultCount = 0,
    required this.budget,
    required this.lockedElementIds,
    this.nextElementSeq = 1,
    this.nextConnectionSeq = 1,
    this.lastRejection,
  });

  final LevelDefinition level;
  final CircuitLayout layout;
  final Map<String, SwitchState> switches;
  final Environment environment;
  final bool fuseBlown;

  /// Bumped by every reset that clears a blown fuse, so a short that is still
  /// wired reads as a new event.
  final int faultEpoch;
  final int faultCount;
  final Map<ElementKind, int> budget;
  final List<String> lockedElementIds;
  final int nextElementSeq;
  final int nextConnectionSeq;
  final ({RejectionCode code, GridCell? at})? lastRejection;

  String get levelId => level.id;

  CircuitBuilderState copyWith({
    CircuitLayout? layout,
    Map<String, SwitchState>? switches,
    Environment? environment,
    bool? fuseBlown,
    int? faultEpoch,
    int? faultCount,
    int? nextElementSeq,
    int? nextConnectionSeq,
    ({RejectionCode code, GridCell? at})? Function()? lastRejection,
  }) =>
      CircuitBuilderState(
        level: level,
        layout: layout ?? this.layout,
        switches: switches ?? this.switches,
        environment: environment ?? this.environment,
        fuseBlown: fuseBlown ?? this.fuseBlown,
        faultEpoch: faultEpoch ?? this.faultEpoch,
        faultCount: faultCount ?? this.faultCount,
        budget: budget,
        lockedElementIds: lockedElementIds,
        nextElementSeq: nextElementSeq ?? this.nextElementSeq,
        nextConnectionSeq: nextConnectionSeq ?? this.nextConnectionSeq,
        lastRejection: lastRejection != null ? lastRejection() : this.lastRejection,
      );
}

CircuitBuilderState createInitialState(LevelDefinition level) {
  final elements = [...level.prePlaced];
  return CircuitBuilderState(
    level: level,
    layout: CircuitLayout(elements: elements, connections: const [], gridSize: level.gridSize),
    switches: {
      for (final e in elements)
        if (e.kind == ElementKind.switchKind) e.id: SwitchState.closed,
    },
    environment: const Environment(
      sourceVoltage: kInitialSourceVoltage,
      lightLevel: kInitialLightLevel,
    ),
    budget: Map.of(level.availableComponents),
    lockedElementIds: [...level.lockedElementIds],
  );
}

CircuitBuilderState _reject(CircuitBuilderState s, RejectionCode code, [GridCell? at]) =>
    s.copyWith(lastRejection: () => (code: code, at: at));

/// A successful mutation clears the last rejection in one place.
CircuitBuilderState _commit(CircuitBuilderState s, CircuitBuilderState next) =>
    next.copyWith(lastRejection: () => null);

CircuitElement? elementById(CircuitBuilderState s, String id) {
  for (final e in s.layout.elements) {
    if (e.id == id) return e;
  }
  return null;
}

bool _insideGrid(GridCell cell, CircuitBuilderState s) =>
    cell.col >= 0 &&
    cell.row >= 0 &&
    cell.col < s.layout.gridSize.cols &&
    cell.row < s.layout.gridSize.rows;

CircuitElement? selectElementAt(CircuitBuilderState s, GridCell cell) {
  for (final e in s.layout.elements) {
    if (e.position.col == cell.col && e.position.row == cell.row) return e;
  }
  return null;
}

/// How many more of [kind] the player may place (pre-placed ones count).
int selectRemainingBudget(CircuitBuilderState s, ElementKind kind) {
  final allowance = s.budget[kind] ?? 0;
  final placed = s.layout.elements.where((e) => e.kind == kind).length;
  return allowance - placed;
}

class TrayItem {
  const TrayItem(this.kind, this.budget, this.remaining);
  final ElementKind kind;
  final int budget;
  final int remaining;
  bool get disabled => remaining <= 0;
}

List<TrayItem> selectTrayItems(CircuitBuilderState s) => [
      for (final kind in ElementKind.values)
        if (s.budget.containsKey(kind))
          TrayItem(kind, s.budget[kind]!, selectRemainingBudget(s, kind)),
    ];

({String id, int seq}) _nextElementId(CircuitBuilderState s) {
  var seq = s.nextElementSeq;
  var id = 'e$seq';
  while (s.layout.elements.any((e) => e.id == id)) {
    seq += 1;
    id = 'e$seq';
  }
  return (id: id, seq: seq);
}

({String id, int seq}) _nextConnectionId(CircuitBuilderState s) {
  var seq = s.nextConnectionSeq;
  var id = 'c$seq';
  while (s.layout.connections.any((c) => c.id == id)) {
    seq += 1;
    id = 'c$seq';
  }
  return (id: id, seq: seq);
}

CircuitBuilderState placeElement(CircuitBuilderState s, ElementKind kind, GridCell cell) {
  if (!_insideGrid(cell, s)) return _reject(s, RejectionCode.outOfBounds, cell);
  if (selectElementAt(s, cell) != null) return _reject(s, RejectionCode.cellOccupied, cell);
  if (selectRemainingBudget(s, kind) <= 0) return _reject(s, RejectionCode.overBudget, cell);
  if (s.layout.elements.length >= kMaxElementCount) {
    return _reject(s, RejectionCode.elementLimit, cell);
  }
  final next = _nextElementId(s);
  final element = createElement(kind, id: next.id, position: GridPosition(cell.col, cell.row));
  // A switch with no entry reads as open, so a new one is written as closed.
  final switches =
      kind == ElementKind.switchKind ? {...s.switches, next.id: SwitchState.closed} : s.switches;
  return _commit(
    s,
    s.copyWith(
      layout: s.layout.copyWith(elements: [...s.layout.elements, element]),
      switches: switches,
      nextElementSeq: next.seq + 1,
    ),
  );
}

CircuitBuilderState moveElement(CircuitBuilderState s, String elementId, GridCell to) {
  final element = elementById(s, elementId);
  if (element == null) return _reject(s, RejectionCode.unknownElement);
  if (s.lockedElementIds.contains(elementId)) return _reject(s, RejectionCode.elementLocked, to);
  if (!_insideGrid(to, s)) return _reject(s, RejectionCode.outOfBounds, to);
  if (element.position.col == to.col && element.position.row == to.row) return s;
  if (selectElementAt(s, to) != null) return _reject(s, RejectionCode.cellOccupied, to);
  // Connections are untouched: connectivity is never inferred from coordinates.
  return _commit(
    s,
    s.copyWith(
      layout: s.layout.copyWith(elements: [
        for (final e in s.layout.elements)
          if (e.id == elementId)
            e.copyWith(position: GridPosition(to.col, to.row, e.position.rotation))
          else
            e,
      ]),
    ),
  );
}

CircuitBuilderState removeElement(CircuitBuilderState s, String elementId) {
  final element = elementById(s, elementId);
  if (element == null) return _reject(s, RejectionCode.unknownElement);
  if (s.lockedElementIds.contains(elementId)) return _reject(s, RejectionCode.elementLocked);
  final terminals = {element.terminal0, element.terminal1};
  // A switch entry naming a missing element invalidates the layout.
  final switches = {...s.switches}..remove(elementId);
  return _commit(
    s,
    s.copyWith(
      layout: s.layout.copyWith(
        elements: [
          for (final e in s.layout.elements)
            if (e.id != elementId) e
        ],
        connections: [
          for (final c in s.layout.connections)
            if (!terminals.contains(c.from) && !terminals.contains(c.to)) c,
        ],
      ),
      switches: switches,
    ),
  );
}

CircuitBuilderState connectTerminals(CircuitBuilderState s, TerminalRef from, TerminalRef to) {
  final fromElement = elementById(s, from.elementId);
  final toElement = elementById(s, to.elementId);
  if (fromElement == null || toElement == null) return _reject(s, RejectionCode.unknownElement);
  // Terminal 0 to terminal 1 of the same element is a legal short; only a
  // terminal joined to itself is refused.
  if (from == to) return _reject(s, RejectionCode.selfConnection);
  final fromNode = fromElement.terminal(from.terminalIndex);
  final toNode = toElement.terminal(to.terminalIndex);
  final duplicate = s.layout.connections.any(
    (c) => (c.from == fromNode && c.to == toNode) || (c.from == toNode && c.to == fromNode),
  );
  if (duplicate) return _reject(s, RejectionCode.duplicateConnection);
  if (s.layout.connections.length >= kMaxConnectionCount) {
    return _reject(s, RejectionCode.connectionLimit);
  }
  final next = _nextConnectionId(s);
  return _commit(
    s,
    s.copyWith(
      layout: s.layout.copyWith(
        connections: [...s.layout.connections, Connection(next.id, fromNode, toNode)],
      ),
      nextConnectionSeq: next.seq + 1,
    ),
  );
}

CircuitBuilderState disconnect(CircuitBuilderState s, String connectionId) {
  if (!s.layout.connections.any((c) => c.id == connectionId)) {
    return _reject(s, RejectionCode.unknownConnection);
  }
  return _commit(
    s,
    s.copyWith(
      layout: s.layout.copyWith(
        connections: [
          for (final c in s.layout.connections)
            if (c.id != connectionId) c
        ],
      ),
    ),
  );
}

/// Swap which terminal plays the positive role on a polarized part: the wires'
/// endpoints are swapped, so every wire stays where it was drawn.
CircuitBuilderState flipElement(CircuitBuilderState s, String elementId) {
  final element = elementById(s, elementId);
  if (element == null) return _reject(s, RejectionCode.unknownElement);
  if (s.lockedElementIds.contains(elementId)) return _reject(s, RejectionCode.elementLocked);
  if (!kElementSpecs[element.kind]!.polarized) return s;
  String swap(String node) => node == element.terminal0
      ? element.terminal1
      : (node == element.terminal1 ? element.terminal0 : node);
  return _commit(
    s,
    s.copyWith(
      layout: s.layout.copyWith(connections: [
        for (final c in s.layout.connections) c.copyWith(from: swap(c.from), to: swap(c.to)),
      ]),
    ),
  );
}

CircuitBuilderState toggleSwitch(CircuitBuilderState s, String elementId) {
  final element = elementById(s, elementId);
  if (element == null) return _reject(s, RejectionCode.unknownElement);
  if (element.kind != ElementKind.switchKind) return _reject(s, RejectionCode.notASwitch);
  final next = s.switches[elementId] == SwitchState.closed ? SwitchState.open : SwitchState.closed;
  return _commit(s, s.copyWith(switches: {...s.switches, elementId: next}));
}

/// Snap to the control step, then clamp to the legal range.
CircuitBuilderState setVoltage(CircuitBuilderState s, double volts) {
  if (!volts.isFinite) return _reject(s, RejectionCode.invalidVoltage);
  final snapped = (volts / kSourceVoltageStep).roundToDouble() * kSourceVoltageStep;
  final clamped = snapped.clamp(kMinSourceVoltage, kMaxSourceVoltage).toDouble();
  return _commit(s, s.copyWith(environment: s.environment.copyWith(sourceVoltage: clamped)));
}

CircuitBuilderState setLightLevel(CircuitBuilderState s, double level) {
  if (!level.isFinite) return _reject(s, RejectionCode.invalidLightLevel);
  final clamped = level.clamp(kMinLightLevel, kMaxLightLevel).toDouble();
  return _commit(s, s.copyWith(environment: s.environment.copyWith(lightLevel: clamped)));
}

CircuitBuilderState resetFuse(CircuitBuilderState s) =>
    s.fuseBlown ? _commit(s, s.copyWith(fuseBlown: false, faultEpoch: s.faultEpoch + 1)) : s;

/// Blocking faults blow the fuse; only the rising edge counts as a fault.
CircuitBuilderState faultsEvaluated(CircuitBuilderState s, List<FaultCode> codes) {
  final blocking = codes.any((c) => c == FaultCode.shortCircuit || c == FaultCode.singularSystem);
  if (!blocking || s.fuseBlown) return s;
  final ceiling = s.level.maxFaultCount ?? kMaxFaultCountPerLevel;
  final next = s.faultCount + 1;
  return s.copyWith(fuseBlown: true, faultCount: next < ceiling ? next : ceiling);
}

/// Layout and switch states sorted exactly as web `selectSubmissionPayload`.
({
  CircuitLayout layout,
  Map<String, SwitchState> switches,
}) selectSortedPayload(CircuitBuilderState s) {
  final keys = s.switches.keys.toList()..sort(compareIds);
  return (
    layout: CircuitLayout(
      elements: [...s.layout.elements]..sort((a, b) => compareIds(a.id, b.id)),
      connections: [...s.layout.connections]..sort((a, b) => compareIds(a.id, b.id)),
      gridSize: s.layout.gridSize,
    ),
    switches: {for (final k in keys) k: s.switches[k]!},
  );
}
