import 'dart:convert';
import 'dart:io';

import 'package:dashden_mobile/game/code_a_bot/logic.dart';
import 'package:flutter_test/flutter_test.dart';

/// The Daily Challenge sends Code-a-Bot level numbers only, so the app's
/// medium levels must be the web's. The fixture comes from
/// tools/export_code_a_bot_levels.mjs.
void main() {
  final fixture = jsonDecode(File('test/fixtures/code_a_bot_levels.json').readAsStringSync())
      as Map<String, dynamic>;
  final levels = (fixture['levels'] as List).cast<Map<String, dynamic>>();

  Map<String, int> pos(Position p) => {'row': p.row, 'col': p.col};

  test('the fixture has the five medium levels', () {
    expect(fixture['difficulty'], 'medium');
    expect(levels.map((l) => l['levelNumber']), [1, 2, 3, 4, 5]);
    expect(getTotalLevels('medium'), levels.length);
  });

  for (final web in levels) {
    final n = web['levelNumber'] as int;
    test('medium level $n equals the web level', () {
      final app = getLevel('medium', n);
      expect(app.levelNumber, n);
      expect(app.rows, web['rows']);
      expect(app.cols, web['cols']);
      expect(pos(app.start), web['start']);
      expect(app.startDir.name, web['startDir']);
      expect(pos(app.goal), web['goal']);
      expect(app.maxInstructions, web['maxInstructions']);
      expect(app.optimalSteps, web['optimalSteps']);
      expect(app.hint, web['hint']);
      expect([for (final row in app.grid) [for (final c in row) c.name]], web['grid']);
    });
  }
}
