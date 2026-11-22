import 'dart:math' as math;

import 'package:dashden_mobile/game/circuit/engine/engine.dart';
import 'package:dashden_mobile/game/circuit/geometry.dart';
import 'package:dashden_mobile/game/circuit/presentation.dart';
import 'package:dashden_mobile/game/circuit/rover.dart';
import 'package:dashden_mobile/game/circuit/state.dart';
import 'package:dashden_mobile/game/circuit/submission.dart';
import 'package:flutter_test/flutter_test.dart';

LevelDefinition level(String id) => getLevel(id)!;

/// Builds the state a player reaches by placing and wiring [kinds] in a row.
CircuitBuilderState build(
  String levelId,
  List<ElementKind> kinds,
  List<(String, String)> wires,
) {
  var s = createInitialState(level(levelId));
  for (final (i, kind) in kinds.indexed) {
    s = placeElement(s, kind, GridCell(i, 0));
  }
  for (final (a, b) in wires) {
    TerminalRef ref(String t) {
      final parts = t.split(':');
      return TerminalRef(parts[0], int.parse(parts[1]));
    }

    s = connectTerminals(s, ref(a), ref(b));
  }
  return s;
}

CircuitResult solve(CircuitBuilderState s) => evaluate(s.layout, s.switches, s.environment).result!;

void main() {
  group('reducer', () {
    final cb01 = level('cb-01-closed-circuit');

    test('starts with the level pre-placed parts, closed switches and a 9 V supply', () {
      final s = createInitialState(level('cb-02-switch-control'));
      expect(s.layout.elements.map((e) => e.id), ['pre-switch']);
      expect(s.switches, {'pre-switch': SwitchState.closed});
      expect(s.environment.sourceVoltage, 9);
      expect(s.environment.lightLevel, 1);
      expect(s.fuseBlown, isFalse);
      expect(s.faultCount, 0);
    });

    test('place respects the grid, occupied cells and the per-kind budget', () {
      var s = createInitialState(cb01);
      s = placeElement(s, ElementKind.battery, const GridCell(1, 1));
      expect(s.layout.elements, hasLength(1));
      expect(s.layout.elements.single.id, 'e1');
      expect(s.lastRejection, isNull);

      s = placeElement(s, ElementKind.led, const GridCell(1, 1));
      expect(s.lastRejection!.code, RejectionCode.cellOccupied);

      s = placeElement(s, ElementKind.battery, const GridCell(2, 1));
      expect(s.lastRejection!.code, RejectionCode.overBudget, reason: 'one battery in cb-01');

      s = placeElement(s, ElementKind.led, const GridCell(8, 0));
      expect(s.lastRejection!.code, RejectionCode.outOfBounds);
      expect(s.layout.elements, hasLength(1));
      expect(selectRemainingBudget(s, ElementKind.battery), 0);
      expect(selectRemainingBudget(s, ElementKind.wire), 4);
    });

    test('a placed switch is born closed (a missing entry would read as open)', () {
      var s = createInitialState(level('sandbox'));
      s = placeElement(s, ElementKind.switchKind, const GridCell(0, 0));
      expect(s.switches['e1'], SwitchState.closed);
      s = toggleSwitch(s, 'e1');
      expect(s.switches['e1'], SwitchState.open);
      s = toggleSwitch(s, 'e1');
      expect(s.switches['e1'], SwitchState.closed);
      s = placeElement(s, ElementKind.led, const GridCell(1, 0));
      expect(toggleSwitch(s, 'e2').lastRejection!.code, RejectionCode.notASwitch);
    });

    test('tray lists the level kinds with what is left', () {
      final items = selectTrayItems(createInitialState(cb01));
      expect({for (final i in items) i.kind.id: i.remaining},
          {'battery': 1, 'led': 1, 'resistor': 1, 'wire': 4});
      expect(items.every((i) => !i.disabled), isTrue);
    });

    test('locked pre-placed parts cannot be moved, removed or flipped', () {
      var s = createInitialState(level('cb-07-resistance-limits-current'));
      expect(moveElement(s, 'pre-led', const GridCell(0, 0)).lastRejection!.code,
          RejectionCode.elementLocked);
      expect(removeElement(s, 'pre-battery').lastRejection!.code, RejectionCode.elementLocked);
      expect(flipElement(s, 'pre-led').lastRejection!.code, RejectionCode.elementLocked);
      s = placeElement(s, ElementKind.resistor, const GridCell(4, 3));
      expect(moveElement(s, 'e1', const GridCell(4, 4)).layout.elements.last.position.row, 4);
    });

    test('removing a part removes its wires and its switch entry', () {
      var s = build('cb-02-switch-control', [ElementKind.battery, ElementKind.resistor],
          [('e1:0', 'e2:0'), ('e1:1', 'pre-switch:0')]);
      expect(s.layout.connections, hasLength(2));
      s = removeElement(s, 'e1');
      expect(s.layout.connections, isEmpty);
      s = removeElement(createInitialState(level('sandbox')).copyWith(), 'nope');
      expect(s.lastRejection!.code, RejectionCode.unknownElement);
    });

    test('connect refuses a terminal to itself and a duplicate, allows both ends of one part', () {
      var s = build('cb-01-closed-circuit', [ElementKind.battery, ElementKind.led], []);
      s = connectTerminals(s, const TerminalRef('e1', 0), const TerminalRef('e1', 0));
      expect(s.lastRejection!.code, RejectionCode.selfConnection);
      s = connectTerminals(s, const TerminalRef('e1', 0), const TerminalRef('e1', 1));
      expect(s.layout.connections, hasLength(1), reason: 'a short across one part is legal');
      s = connectTerminals(s, const TerminalRef('e1', 1), const TerminalRef('e1', 0));
      expect(s.lastRejection!.code, RejectionCode.duplicateConnection);
      final id = s.layout.connections.single.id;
      s = disconnect(s, id);
      expect(s.layout.connections, isEmpty);
      expect(disconnect(s, id).lastRejection!.code, RejectionCode.unknownConnection);
    });

    test('flip swaps the wire ends of an LED, not its terminals', () {
      var s = build(
          'cb-01-closed-circuit',
          [ElementKind.battery, ElementKind.resistor, ElementKind.led],
          [('e1:0', 'e2:0'), ('e2:1', 'e3:0'), ('e3:1', 'e1:1')]);
      expect(solve(s).faults, isEmpty);
      s = flipElement(s, 'e3');
      expect(s.layout.connections.map((c) => (c.from, c.to)),
          [('e1:0', 'e2:0'), ('e2:1', 'e3:1'), ('e3:0', 'e1:1')]);
      expect(solve(s).faults.map((f) => f.code), [FaultCode.reversedPolarity]);
      // A battery has no direction to flip.
      expect(identical(flipElement(s, 'e1'), s), isTrue);
    });

    test('voltage snaps to 0.5 V and clamps; light clamps', () {
      final s = createInitialState(cb01);
      expect(setVoltage(s, 7.3).environment.sourceVoltage, 7.5);
      expect(setVoltage(s, 100).environment.sourceVoltage, 12);
      expect(setVoltage(s, -4).environment.sourceVoltage, 1.5);
      expect(setVoltage(s, double.nan).lastRejection!.code, RejectionCode.invalidVoltage);
      expect(setLightLevel(s, 3).environment.lightLevel, 1);
      expect(setLightLevel(s, -1).environment.lightLevel, 0);
      expect(
          setLightLevel(s, double.infinity).lastRejection!.code, RejectionCode.invalidLightLevel);
    });

    test(
        'a blocking fault blows the fuse once; reset bumps the epoch and a still wired short counts again',
        () {
      var s = createInitialState(cb01);
      s = faultsEvaluated(s, [FaultCode.overcurrent]);
      expect(s.fuseBlown, isFalse, reason: 'overcurrent does not blow the fuse');
      s = faultsEvaluated(s, [FaultCode.shortCircuit]);
      expect(s.fuseBlown, isTrue);
      expect(s.faultCount, 1);
      s = faultsEvaluated(s, [FaultCode.shortCircuit]);
      expect(s.faultCount, 1, reason: 'a persisting short is one fault');
      s = resetFuse(s);
      expect(s.fuseBlown, isFalse);
      expect(s.faultEpoch, 1);
      s = faultsEvaluated(s, [FaultCode.singularSystem]);
      expect(s.faultCount, 2);
    });

    test('the fault count never passes the level ceiling', () {
      var s = createInitialState(cb01);
      for (var i = 0; i < 30; i++) {
        s = faultsEvaluated(s, [FaultCode.shortCircuit]);
        s = resetFuse(s);
      }
      expect(s.faultCount, kMaxFaultCountPerLevel);
    });
  });

  group('submission', () {
    test('payload has exactly the keys the server accepts, sorted by id', () {
      final s = build(
          'cb-01-closed-circuit',
          [ElementKind.battery, ElementKind.resistor, ElementKind.led],
          [('e3:1', 'e1:1'), ('e1:0', 'e2:0'), ('e2:1', 'e3:0')]);
      final p = buildCircuitSubmission(s);
      expect(p.keys.toSet(), {'levelId', 'layout', 'switches', 'environment', 'faultCount'});
      expect(p['levelId'], 'cb-01-closed-circuit');
      expect(p['faultCount'], 0);
      expect(p['environment'], {'sourceVoltage': 9.0, 'lightLevel': 1.0});
      final layout = p['layout'] as Map<String, dynamic>;
      expect(layout.keys.toSet(), {'elements', 'connections', 'gridSize'});
      expect(layout['gridSize'], {'cols': 8, 'rows': 6});
      final conns = layout['connections'] as List;
      expect(conns.map((c) => (c as Map)['id']), ['c1', 'c2', 'c3']);
      expect((conns.first as Map).keys.toSet(), {'id', 'from', 'to'});
      final first = (layout['elements'] as List).first as Map;
      expect(first.keys.toSet(), {'id', 'kind', 'terminals', 'position'});
      expect(first['terminals'], ['e1:0', 'e1:1']);
      expect(first['position'], {'col': 0, 'row': 0, 'rotation': 0});
    });

    test('switches are sent by name and sorted', () {
      final s = createInitialState(level('cb-04-parallel-branches'));
      final p = buildCircuitSubmission(s);
      expect((p['switches'] as Map).keys.toList(), ['pre-switch-buzzer', 'pre-switch-led']);
      expect((p['switches'] as Map).values.toSet(), {'closed'});
    });

    test('the same circuit built in another order has the same key', () {
      final a = build('cb-01-closed-circuit', [ElementKind.battery, ElementKind.led],
          [('e1:0', 'e2:0'), ('e2:1', 'e1:1')]);
      final b = a.copyWith(
        layout: a.layout.copyWith(
          elements: a.layout.elements.reversed.toList(),
          connections: a.layout.connections.reversed.toList(),
        ),
      );
      expect(circuitKey(a), circuitKey(b));
    });

    test('completion seconds are floored to the difficulty minimum and capped', () {
      expect(clampCompletionSeconds(0, 1), 2);
      expect(clampCompletionSeconds(1, 3), 6);
      expect(clampCompletionSeconds(40, 2), 40);
      expect(clampCompletionSeconds(99999, 4), kMaxCompletionSeconds);
      expect(clampCompletionSeconds(-5, 1), 2);
    });

    test('a circuit counts as completed only when solved with an intact fuse', () {
      final solved = build(
          'cb-01-closed-circuit',
          [ElementKind.battery, ElementKind.resistor, ElementKind.led],
          [('e1:0', 'e2:0'), ('e2:1', 'e3:0'), ('e3:1', 'e1:1')]);
      expect(isCompleted(solved, solve(solved)), isTrue);
      expect(isCompleted(solved.copyWith(fuseBlown: true), solve(solved)), isFalse);
      expect(isCompleted(solved, null), isFalse);
      final open = build('cb-01-closed-circuit', [ElementKind.battery, ElementKind.led], []);
      expect(isCompleted(open, solve(open)), isFalse);
      // The sandbox has no objective.
      final sb = createInitialState(level('sandbox'));
      expect(isCompleted(sb, solve(sb)), isFalse);
    });
  });

  group('rover view', () {
    test('lights the headlight of the solved cb-01 circuit and nothing without a result', () {
      final s = build(
          'cb-01-closed-circuit',
          [ElementKind.battery, ElementKind.resistor, ElementKind.led],
          [('e1:0', 'e2:0'), ('e2:1', 'e3:0'), ('e3:1', 'e1:1')]);
      final view = deriveRoverView(s.level, solve(s), false);
      final byId = {for (final r in view.roles) r.roleId: r};
      expect(byId['headlight']!.active, isTrue);
      expect(byId['headlight']!.available, isTrue);
      expect(byId['driveMotor']!.available, isFalse, reason: 'cb-01 offers no motor');
      expect(view.allRequiredActive, isTrue);
      expect(deriveRoverView(s.level, solve(s), true).roles.any((r) => r.active), isFalse);
      expect(deriveRoverView(s.level, null, false).allRequiredActive, isFalse);
    });
  });

  group('numeric disclosure', () {
    final s = build('cb-07-resistance-limits-current', [ElementKind.resistor],
        [('pre-battery:0', 'e1:0'), ('e1:1', 'pre-led:0'), ('pre-led:1', 'pre-battery:1')]);
    final result = solve(s);

    test('none shows state only', () {
      final p = presentCircuit(result, s.layout, NumericDisclosure.none);
      expect(p.supplyVoltage, isNull);
      for (final e in p.elements) {
        expect(e.brightness, isNull);
        expect(e.voltage, isNull);
        expect(e.current, isNull);
      }
    });

    test('qualitative adds brightness but no numbers', () {
      final p = presentCircuit(result, s.layout, NumericDisclosure.qualitative);
      final led = p.elements.firstWhere((e) => e.kind == ElementKind.led);
      expect(led.brightness, isNot(BrightnessLabel.off));
      expect(led.relativeBrightness, closeTo(1, 1e-9));
      expect(led.voltage, isNull);
      expect(p.supplyVoltage, isNull);
    });

    test('values add voltage, resistance and supply; full adds current and totals', () {
      final v = presentCircuit(result, s.layout, NumericDisclosure.valuesTier);
      expect(v.supplyVoltage, closeTo(9, 0.2));
      expect(v.elements.firstWhere((e) => e.kind == ElementKind.led).resistance, 30);
      expect(v.elements.every((e) => e.current == null), isTrue);
      expect(v.totalResistance, isNull);
      final f = presentCircuit(result, s.layout, NumericDisclosure.full);
      expect(f.elements.firstWhere((e) => e.kind == ElementKind.led).current, greaterThan(0));
      expect(f.totalCurrent, greaterThan(0));
      expect(f.totalResistance, greaterThan(0));
    });

    test('no presented number is negative, -0 or not finite', () {
      final f = presentCircuit(result, s.layout, NumericDisclosure.full);
      for (final e in f.elements) {
        for (final n in [e.voltage, e.resistance, e.current, e.relativeBrightness]) {
          if (n == null) continue;
          expect(n.isFinite && n >= 0 && !n.isNegative, isTrue, reason: '$n');
        }
      }
      expect(toDisplayMagnitude(double.nan), 0);
      expect(toDisplayMagnitude(-0.0).isNegative, isFalse);
    });

    test('quantities format with the locale separator; currents under 1 A read in mA', () {
      expect(formatQuantity(0.0123, QuantityUnit.amps, 'en'), '12.3 mA');
      expect(formatQuantity(0.0123, QuantityUnit.amps, 'pt'), '12,3 mA');
      expect(formatQuantity(1.5, QuantityUnit.amps, 'en'), '1.5 A');
      expect(formatQuantity(-9, QuantityUnit.volts, 'es'), '9 V');
      expect(formatQuantity(470, QuantityUnit.ohms, 'en'), '470 Ω');
    });

    test('slider text only exists for the values and full tiers', () {
      expect(sliderValueText(NumericDisclosure.none, SliderKind.voltage, 9), isNull);
      expect(sliderValueText(NumericDisclosure.qualitative, SliderKind.light, 1), isNull);
      expect(sliderValueText(NumericDisclosure.valuesTier, SliderKind.voltage, 9), '9 V');
      expect(sliderValueText(NumericDisclosure.full, SliderKind.voltage, 7.5), '7.5 V');
      expect(sliderValueText(NumericDisclosure.full, SliderKind.light, 0.55), '55%');
    });
  });

  group('geometry', () {
    final v = CircuitViewport.forGrid(const GridSize(8, 6));
    final layout = CircuitLayout(
      elements: [
        createElement(ElementKind.battery, id: 'a', position: const GridPosition(1, 1)),
        createElement(ElementKind.led, id: 'b', position: const GridPosition(4, 1)),
      ],
      connections: const [Connection('c1', 'a:1', 'b:0')],
      gridSize: const GridSize(8, 6),
    );

    test('cells and points convert both ways and outside is null', () {
      for (var c = 0; c < 8; c++) {
        for (var r = 0; r < 6; r++) {
          expect(pointToCell(cellToPoint(GridCell(c, r), v), v), GridCell(c, r));
        }
      }
      expect(pointToCell(const Offset(-5, 10), v), isNull);
      expect(pointToCell(Offset(v.sceneSize.width + 5, 10), v), isNull);
      expect(pointToCell(const Offset(double.nan, 1), v), isNull);
    });

    test('hit test: terminal beats body beats wire beats empty cell beats outside', () {
      final a = layout.elements.first;
      final t1 = terminalAnchor(a, 1, v);
      expect(hitTest(t1, layout, v), isA<TerminalHit>());
      expect((hitTest(t1, layout, v) as TerminalHit).ref, const TerminalRef('a', 1));
      expect(hitTest(cellToPoint(const GridCell(1, 1), v), layout, v), isA<ElementHit>());
      final mid = (terminalAnchor(a, 1, v) + terminalAnchor(layout.elements.last, 0, v)) / 2;
      expect(hitTest(mid, layout, v), isA<ConnectionHit>());
      expect(hitTest(cellToPoint(const GridCell(6, 4), v), layout, v), isA<CellHit>());
      expect(hitTest(const Offset(1, 1), layout, v), isA<OutsideHit>());
    });

    test('terminal anchors turn with the rotation', () {
      CircuitElement at(int rotation) => CircuitElement(
            id: 'x',
            kind: ElementKind.led,
            terminal0: 'x:0',
            terminal1: 'x:1',
            position: GridPosition(2, 2, rotation),
          );
      final c = cellToPoint(const GridCell(2, 2), v);
      expect(terminalAnchor(at(0), 0, v).dx, lessThan(c.dx));
      expect(terminalAnchor(at(90), 0, v).dy, lessThan(c.dy));
      expect(terminalAnchor(at(180), 0, v).dx, greaterThan(c.dx));
      expect(terminalAnchor(at(270), 0, v).dy, greaterThan(c.dy));
      expect((terminalAnchor(at(0), 0, v) - terminalAnchor(at(0), 1, v)).distance,
          closeTo(2 * kTerminalOffsetRatio * v.cellSize, 1e-9));
    });

    test('distance to a degenerate segment is the distance to its point', () {
      expect(distanceToSegment(const Offset(3, 4), Offset.zero, Offset.zero), 5);
      expect(distanceToSegment(const Offset(5, 3), Offset.zero, const Offset(10, 0)), 3);
      expect(distanceToSegment(const Offset(-3, 4), Offset.zero, const Offset(10, 0)),
          closeTo(math.sqrt(25), 1e-12));
    });
  });

  group('levels', () {
    test('guided levels are every level except the sandbox, in curriculum order', () {
      expect(listGuidedLevels().map((l) => l.id), [
        'cb-01-closed-circuit',
        'cb-02-switch-control',
        'cb-03-series-loop',
        'cb-04-parallel-branches',
        'cb-05-series-vs-parallel',
        'cb-06-short-circuit-recovery',
        'cb-07-resistance-limits-current',
        'cb-08-variable-voltage',
      ]);
      expect(listGuidedLevels().map((l) => l.difficulty), [1, 1, 2, 2, 3, 3, 4, 4]);
      expect(guidedLevelsForDifficulty(3), hasLength(2));
      expect(findGuidedLevel('sandbox'), isNull);
      expect(nextGuidedLevel('cb-01-closed-circuit')!.id, 'cb-02-switch-control');
      expect(nextGuidedLevel('cb-08-variable-voltage'), isNull);
      expect(nextGuidedLevel('nope'), isNull);
    });

    test('every guided level fits the engine ceilings', () {
      for (final l in listGuidedLevels()) {
        final budget =
            l.availableComponents.values.fold<int>(0, (a, b) => a + b) + l.prePlaced.length;
        expect(budget, lessThanOrEqualTo(kMaxElementCount), reason: l.id);
        expect(l.gridSize.cols, lessThanOrEqualTo(kMaxGridCols));
        expect(l.gridSize.rows, lessThanOrEqualTo(kMaxGridRows));
      }
    });
  });
}
