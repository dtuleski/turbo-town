import 'dart:convert';
import 'dart:io';

import 'package:dashden_mobile/game/circuit/engine/engine.dart';
import 'package:flutter_test/flutter_test.dart';

// The fixtures are outputs of the real shared TypeScript engine
// (tools/export_circuit_golden.mjs). The Dart engine must reproduce them.

late Map<String, dynamic> golden;

CircuitLayout layoutOf(Map<String, dynamic> j) => CircuitLayout(
      elements: [
        for (final e in j['elements'] as List) CircuitElement.fromJson(e as Map<String, dynamic>)!,
      ],
      connections: [
        for (final c in j['connections'] as List)
          Connection(c['id'] as String, c['from'] as String, c['to'] as String),
      ],
      gridSize:
          GridSize((j['gridSize']['cols'] as num).toInt(), (j['gridSize']['rows'] as num).toInt()),
    );

Map<String, SwitchState> switchesOf(Map<String, dynamic> j) => {
      for (final e in j.entries) e.key: e.value == 'closed' ? SwitchState.closed : SwitchState.open,
    };

Environment envOf(Map<String, dynamic> j) => Environment(
      sourceVoltage: (j['sourceVoltage'] as num).toDouble(),
      lightLevel: (j['lightLevel'] as num).toDouble(),
    );

/// The TypeScript run and this one use the same IEEE operations in the same
/// order, so values agree to the last bit except where `pow` differs by an ulp.
void near(num actual, num expected, String reason) {
  final diff = (actual - expected).abs();
  expect(diff <= 1e-12 * (expected.abs() > 1 ? expected.abs() : 1), isTrue,
      reason: '$reason: $actual vs $expected');
}

void main() {
  setUpAll(() {
    golden = jsonDecode(File('test/fixtures/circuit_golden.json').readAsStringSync())
        as Map<String, dynamic>;
  });

  test('level registry matches the shared one', () {
    final levels = golden['levels'] as List;
    expect(listLevels().map((l) => l.id).toList(), [for (final l in levels) l['id']]);
    for (final j in levels) {
      final level = getLevel(j['id'] as String)!;
      expect(level.difficulty, j['difficulty'], reason: level.id);
      expect(level.numericDisclosure.id, j['numericDisclosure'], reason: level.id);
      expect(level.gridSize, GridSize(j['gridSize']['cols'] as int, j['gridSize']['rows'] as int));
      expect(level.targetMachineId, j['targetMachineId']);
      expect(level.successConditionId, j['successConditionId']);
      expect(level.conceptTag, j['conceptTag']);
      expect(level.lockedElementIds, (j['lockedElementIds'] as List).cast<String>());
      final available =
          (j['availableComponents'] as Map).map((k, v) => MapEntry(k as String, v as int));
      expect({for (final e in level.availableComponents.entries) e.key.id: e.value}, available,
          reason: level.id);
      final pre = [
        for (final e in j['prePlaced'] as List) CircuitElement.fromJson(e as Map<String, dynamic>)!
      ];
      expect(level.prePlaced.map((e) => e.toJson()).toList(), pre.map((e) => e.toJson()).toList(),
          reason: level.id);
    }
  });

  test('the Mars Rover machine matches', () {
    final machine = golden['machine'] as Map<String, dynamic>;
    expect(kMarsRover.id, machine['id']);
    final roles = machine['roles'] as List;
    expect(kMarsRover.roles.length, roles.length);
    for (var i = 0; i < roles.length; i++) {
      expect(kMarsRover.roles[i].roleId, roles[i]['roleId']);
      expect(kMarsRover.roles[i].requiredKind.id, roles[i]['requiredKind']);
      expect(kMarsRover.roles[i].activationRule, roles[i]['activationRule']);
      expect(kMarsRover.roles[i].presentationKey, roles[i]['presentationKey']);
    }
  });

  test('the fault count clamp matches', () {
    for (final c in golden['clamps'] as List) {
      final level = getLevel(c['levelId'] as String)!;
      final got = clampFaultCount((c['reported'] as num).toInt(), level);
      final want = c['expected'] as Map<String, dynamic>;
      expect(got.value, want['value'], reason: '${c['levelId']} ${c['reported']}');
      expect(got.wasClamped, want['wasClamped']);
      expect(got.wasMalformed, want['wasMalformed']);
    }
  });

  test('every golden case evaluates to the same result as the TypeScript engine', () {
    final cases = golden['cases'] as List;
    expect(cases.length, greaterThan(600));
    var errors = 0;
    var faulted = 0;
    var singular = 0;
    var solved = 0;
    for (final c in cases) {
      final name = c['name'] as String;
      final outcome = evaluate(
        layoutOf(c['layout'] as Map<String, dynamic>),
        switchesOf((c['switches'] as Map).cast<String, dynamic>()),
        envOf(c['env'] as Map<String, dynamic>),
      );
      final expected = c['expected'] as Map<String, dynamic>;
      if (expected.containsKey('errorCode')) {
        errors++;
        expect(outcome.ok, isFalse, reason: name);
        expect(outcome.error!.id, expected['errorCode'], reason: name);
        continue;
      }
      expect(outcome.ok, isTrue, reason: '$name: ${outcome.error}');
      final r = outcome.result!;
      expect(r.closedPathExists, expected['closedPathExists'], reason: name);
      near(r.totalCurrent, expected['totalCurrent'] as num, '$name totalCurrent');
      near(r.totalResistance, expected['totalResistance'] as num, '$name totalResistance');

      final nodes = (expected['nodeVoltages'] as Map).cast<String, dynamic>();
      expect(r.nodeVoltages.keys.toSet(), nodes.keys.toSet(), reason: name);
      for (final e in nodes.entries) {
        near(r.nodeVoltages[e.key]!, e.value as num, '$name node ${e.key}');
      }

      final elements = expected['elements'] as List;
      expect(r.elements.length, elements.length, reason: name);
      for (var i = 0; i < elements.length; i++) {
        final w = elements[i] as Map<String, dynamic>;
        final g = r.elements[i];
        expect(g.elementId, w['elementId'], reason: name);
        expect(g.kind.id, w['kind'], reason: name);
        expect(g.energized, w['energized'], reason: '$name ${g.elementId} energized');
        near(g.current, w['current'] as num, '$name ${g.elementId} current');
        near(g.voltageDrop, w['voltageDrop'] as num, '$name ${g.elementId} drop');
        near(g.intensity, w['intensity'] as num, '$name ${g.elementId} intensity');
      }

      final faults = expected['faults'] as List;
      expect(r.faults.length, faults.length, reason: name);
      for (var i = 0; i < faults.length; i++) {
        final w = faults[i] as Map<String, dynamic>;
        expect(r.faults[i].code.id, w['code'], reason: name);
        expect(r.faults[i].elementIds, (w['elementIds'] as List).cast<String>(), reason: name);
        final pos = w['atPosition'] as Map<String, dynamic>?;
        if (pos == null) {
          expect(r.faults[i].atPosition, isNull, reason: name);
        } else {
          expect(r.faults[i].atPosition,
              GridPosition(pos['col'] as int, pos['row'] as int, pos['rotation'] as int),
              reason: name);
        }
      }
      if (faults.isNotEmpty) faulted++;
      if (faults.any((f) => f['code'] == 'SINGULAR_SYSTEM')) singular++;

      final levelId = c['levelId'] as String?;
      if (levelId != null) {
        final level = getLevel(levelId)!;
        final success = evaluateSuccess(level, r);
        final want = c['success'] as Map<String, dynamic>;
        expect(success.satisfied, want['satisfied'], reason: '$name success');
        expect(success.unmetClauses, (want['unmetClauses'] as List).cast<String>(), reason: name);
        final roles = evaluateRoleActivation(getMachine(level.targetMachineId)!, r);
        expect(roles, (c['roles'] as Map).cast<String, bool>(), reason: '$name roles');
        if (success.satisfied) solved++;
      }
    }
    // The fixtures must exercise the interesting outcomes, not only quiet circuits.
    expect(errors, greaterThanOrEqualTo(15));
    expect(faulted, greaterThan(40));
    expect(singular, greaterThan(0));
    expect(solved, greaterThanOrEqualTo(8), reason: 'every level has a solved reference case');
  });

  test('every guided level has a reference solution the Dart engine accepts', () {
    final solvedLevels = <String>{};
    for (final c in golden['cases'] as List) {
      final name = c['name'] as String;
      if (!name.contains('reference at 9.0 V') && !name.contains('reference at 9 V')) continue;
      final level = getLevel(c['levelId'] as String)!;
      final outcome = evaluate(
        layoutOf(c['layout'] as Map<String, dynamic>),
        switchesOf((c['switches'] as Map).cast<String, dynamic>()),
        envOf(c['env'] as Map<String, dynamic>),
      );
      if (evaluateSuccess(level, outcome.result!).satisfied) solvedLevels.add(level.id);
    }
    expect(solvedLevels, {for (final l in listGuidedLevels()) l.id});
  });
}
