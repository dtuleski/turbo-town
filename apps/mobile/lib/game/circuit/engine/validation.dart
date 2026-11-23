import 'types.dart';

/// Structural issue codes (web `StructuralIssueCode`). Only the ones a typed
/// Dart layout can still produce exist here: the shape checks of the TypeScript
/// version (is this an object, is that a number) are guaranteed by the types.
enum StructuralIssueCode {
  duplicateElementId,
  duplicateConnectionId,
  unresolvedTerminalRef,
  selfConnection,
  positionOutOfBounds,
  gridSizeOutOfBounds,
  invalidRotation,
  elementCountExceeded,
  connectionCountExceeded,
  idTooLong,
  nonFiniteParam,
  paramOutOfRange,
  duplicateTerminal,
  unknownSwitchElement,
  voltageOutOfRange,
  lightLevelOutOfRange,
  malformedPayload,
}

bool _isUsableId(String value) => value.isNotEmpty;

bool _insideGrid(int col, int row, GridSize? grid) {
  final limitCols = grid?.cols ?? kMaxGridCols;
  final limitRows = grid?.rows ?? kMaxGridRows;
  return col >= 0 && row >= 0 && col < limitCols && row < limitRows;
}

void _checkRange(
  double? value,
  double low,
  double high,
  List<StructuralIssueCode> issues,
) {
  if (value == null || !value.isFinite) return;
  if (value < low || value > high) issues.add(StructuralIssueCode.paramOutOfRange);
}

/// Every structural issue of a layout, switch states and environment. Empty
/// means valid. Mirrors web `validateStructure`.
List<StructuralIssueCode> validateStructure(
  CircuitLayout layout,
  Map<String, SwitchState> switches,
  Environment env,
) {
  final issues = <StructuralIssueCode>[];
  final grid = layout.gridSize;
  final gridOk = grid.cols >= kMinGridCols &&
      grid.cols <= kMaxGridCols &&
      grid.rows >= kMinGridRows &&
      grid.rows <= kMaxGridRows;
  if (!gridOk) issues.add(StructuralIssueCode.gridSizeOutOfBounds);
  final gridForBounds = gridOk ? grid : null;

  final elementsOver = layout.elements.length > kMaxElementCount;
  final connectionsOver = layout.connections.length > kMaxConnectionCount;
  if (elementsOver) issues.add(StructuralIssueCode.elementCountExceeded);
  if (connectionsOver) issues.add(StructuralIssueCode.connectionCountExceeded);

  if (!elementsOver && !connectionsOver) {
    final terminalOwners = <String, String>{};
    final switchIds = <String>{};
    final seenIds = <String>{};
    for (final element in layout.elements) {
      if (!_isUsableId(element.id)) {
        issues.add(StructuralIssueCode.malformedPayload);
        continue;
      }
      if (element.id.length > kMaxIdLength) {
        issues.add(StructuralIssueCode.idTooLong);
        continue;
      }
      if (!seenIds.add(element.id)) {
        issues.add(StructuralIssueCode.duplicateElementId);
        continue;
      }
      if (element.kind == ElementKind.switchKind) switchIds.add(element.id);

      final seenHere = <String>[];
      for (final terminal in [element.terminal0, element.terminal1]) {
        if (!_isUsableId(terminal)) {
          issues.add(StructuralIssueCode.malformedPayload);
          continue;
        }
        if (terminal.length > kMaxIdLength) {
          issues.add(StructuralIssueCode.idTooLong);
          continue;
        }
        if (seenHere.contains(terminal) || terminalOwners.containsKey(terminal)) {
          issues.add(StructuralIssueCode.duplicateTerminal);
          continue;
        }
        seenHere.add(terminal);
        terminalOwners[terminal] = element.id;
      }

      if (!kValidRotations.contains(element.position.rotation)) {
        issues.add(StructuralIssueCode.invalidRotation);
      }
      if (!_insideGrid(element.position.col, element.position.row, gridForBounds)) {
        issues.add(StructuralIssueCode.positionOutOfBounds);
      }

      final params = element.params;
      if (params != null) {
        for (final value in params.values) {
          if (!value.isFinite) issues.add(StructuralIssueCode.nonFiniteParam);
        }
        if (element.kind == ElementKind.resistor) {
          _checkRange(params['resistance'], kMinResistance, kMaxResistance, issues);
        }
        if (kElementSpecs[element.kind]!.isSource) {
          _checkRange(params['internalResistance'], 0, kMaxResistance, issues);
        }
      }
    }

    final seenConnections = <String>{};
    for (final c in layout.connections) {
      if (!_isUsableId(c.id)) {
        issues.add(StructuralIssueCode.malformedPayload);
        continue;
      }
      if (c.id.length > kMaxIdLength) {
        issues.add(StructuralIssueCode.idTooLong);
        continue;
      }
      if (!seenConnections.add(c.id)) {
        issues.add(StructuralIssueCode.duplicateConnectionId);
        continue;
      }
      if (!_isUsableId(c.from) || !_isUsableId(c.to)) {
        issues.add(StructuralIssueCode.malformedPayload);
        continue;
      }
      if (c.from == c.to) {
        issues.add(StructuralIssueCode.selfConnection);
        continue;
      }
      for (final end in [c.from, c.to]) {
        if (!terminalOwners.containsKey(end)) issues.add(StructuralIssueCode.unresolvedTerminalRef);
      }
    }

    for (final id in switches.keys) {
      if (!switchIds.contains(id)) issues.add(StructuralIssueCode.unknownSwitchElement);
    }
  }

  if (!env.sourceVoltage.isFinite ||
      env.sourceVoltage < kMinSourceVoltage ||
      env.sourceVoltage > kMaxSourceVoltage) {
    issues.add(StructuralIssueCode.voltageOutOfRange);
  }
  if (!env.lightLevel.isFinite ||
      env.lightLevel < kMinLightLevel ||
      env.lightLevel > kMaxLightLevel) {
    issues.add(StructuralIssueCode.lightLevelOutOfRange);
  }
  return issues;
}

EvaluationErrorCode classifyIssues(List<StructuralIssueCode> issues) {
  if (issues.contains(StructuralIssueCode.malformedPayload)) {
    return EvaluationErrorCode.malformedInput;
  }
  const limits = {
    StructuralIssueCode.elementCountExceeded,
    StructuralIssueCode.connectionCountExceeded,
    StructuralIssueCode.idTooLong,
  };
  if (issues.any(limits.contains)) return EvaluationErrorCode.limitExceeded;
  return EvaluationErrorCode.structuralInvalid;
}
