import 'dart:convert';
import 'dart:io';

import 'package:dashden_mobile/game/space_coder/logic.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/lcg_random.dart';

// Outputs of the web TypeScript (tools/export_space_coder_golden.mjs) that the
// Dart port must reproduce.

late Map<String, dynamic> golden;

Condition? conditionOf(Object? j) {
  if (j is! Map) return null;
  if (j['type'] == 'sensor') {
    return SensorCondition(SensorType.values.firstWhere((s) => s.id == j['sensor']));
  }
  return ComparisonCondition(
    Variable.values.firstWhere((v) => v.id == j['variable']),
    ComparisonOperator.values.firstWhere((o) => o.symbol == j['operator']),
    j['value'] as Object,
  );
}

List<Command> programOf(List<dynamic> j) => [
      for (final c in j)
        Command(
          id: c['id'] as String,
          type: CommandType.byId(c['type'] as String)!,
          parameter: c['parameter'] as int?,
          body: c['body'] == null ? null : programOf(c['body'] as List),
          elseBody: c['elseBody'] == null ? null : programOf(c['elseBody'] as List),
          condition: conditionOf(c['condition']),
          varValue: c['varValue'] as Object?,
        ),
    ];

List<String> gridText(List<List<CellType>> grid) => [
      for (final row in grid)
        row
            .map((c) => switch (c) {
                  CellType.empty => '.',
                  CellType.wall => '#',
                  CellType.goal => 'G',
                  CellType.obstacle => 'O',
                })
            .join(),
    ];

List<List<CellType>> gridOf(List<dynamic> rows) => [
      for (final r in rows)
        [
          for (final ch in (r as String).split(''))
            switch (ch) {
              '#' => CellType.wall,
              'G' => CellType.goal,
              'O' => CellType.obstacle,
              _ => CellType.empty,
            },
        ],
    ];

const _errorIds = {
  ErrorType.collision: 'collision',
  ErrorType.noObstacleToJump: 'no-obstacle-to-jump',
  ErrorType.infiniteLoop: 'infinite-loop',
  ErrorType.jumpLandingBlocked: 'jump-landing-blocked',
  ErrorType.undefinedVariable: 'undefined-variable',
};

Map<String, Object?> cursorJson(InsertionCursor c) => {
      'parentId': c.parentId,
      'branch': c.branch == Branch.body ? 'body' : 'elseBody',
      'index': c.index,
    };

void main() {
  setUpAll(() {
    golden = jsonDecode(File('test/fixtures/space_coder_golden.json').readAsStringSync())
        as Map<String, dynamic>;
  });

  test('levels match the web', () {
    final levels = golden['levels'] as Map<String, dynamic>;
    for (final d in kSpaceCoderDifficulties) {
      final web = levels[d] as List;
      expect(totalSpaceLevels(d), web.length);
      for (var i = 0; i < web.length; i++) {
        final w = web[i] as Map<String, dynamic>;
        final l = kSpaceLevels[d]![i];
        expect(gridText(l.grid), (w['grid'] as List).cast<String>(), reason: '$d ${i + 1}');
        expect(l.start, Position(w['start']['row'] as int, w['start']['col'] as int));
        expect(l.goal, Position(w['goal']['row'] as int, w['goal']['col'] as int));
        expect(l.startDir.name, w['startDir']);
        expect(l.maxLines, w['maxLines']);
        expect(l.optimalLines, w['optimalLines']);
        expect(l.levelNumber, w['levelNumber']);
        expect('scratchCoding.hints.${l.hint}', w['hint']);
        expect(l.obstacleCount, w['obstacleCount']);
      }
    }
  });

  test('the palette per difficulty matches', () {
    final palette = golden['palette'] as Map<String, dynamic>;
    for (final d in kSpaceCoderDifficulties) {
      expect(
        [
          for (final c in commandsForDifficulty(d)) [c.type.id, c.text]
        ],
        palette[d],
        reason: d,
      );
    }
  });

  test('seeded obstacles match the web', () {
    for (final o in golden['obstacles'] as List) {
      final l = kSpaceLevels[o['difficulty']]![(o['level'] as int) - 1];
      final grid = generateObstacles(
          l.rows, l.cols, l.start, l.goal, l.obstacleCount!, LcgRandom(o['seed'] as int));
      expect(gridText(grid), (o['grid'] as List).cast<String>(),
          reason: '${o['level']} ${o['seed']}');
      expect(bfsPathExists(grid, l.start, l.goal), isTrue);
      expect(grid.expand((r) => r).where((c) => c == CellType.obstacle).length,
          lessThanOrEqualTo(l.obstacleCount!));
    }
  });

  test('every recorded run steps exactly like the web interpreter', () {
    final runs = golden['runs'] as List;
    var reached = 0;
    final errors = <String>{};
    for (final r in runs) {
      final base = kSpaceLevels[r['difficulty']]![(r['level'] as int) - 1];
      final level = base.withGrid(gridOf(r['grid'] as List));
      final program = programOf(r['program'] as List);
      final name = '${r['difficulty']} ${r['level']} seed ${r['seed']}';
      expect(programToText(program), (r['text'] as List).cast<String>(), reason: name);
      expect(countAllLines(program), r['lines'], reason: name);
      final steps = executeProgram(level, program);
      final want = r['steps'] as List;
      expect(steps.length, want.length, reason: name);
      for (var i = 0; i < want.length; i++) {
        final w = want[i] as Map<String, dynamic>;
        final g = steps[i];
        final where = '$name step $i';
        expect(g.commandId, w['id'], reason: where);
        expect(g.pos, Position(w['row'] as int, w['col'] as int), reason: where);
        expect(g.dir.name, w['dir'], reason: where);
        expect(g.alive, w['alive'], reason: where);
        expect(g.reachedGoal, w['reachedGoal'], reason: where);
        expect(g.hitWall, w['hitWall'], reason: where);
        expect(g.outOfBounds, w['outOfBounds'], reason: where);
        expect(g.hitObstacle, w['hitObstacle'], reason: where);
        expect(g.isJumpMidpoint, w['isJumpMidpoint'], reason: where);
        expect(g.errorType == null ? null : _errorIds[g.errorType], w['errorType'], reason: where);
        expect(g.lineIndex, w['lineIndex'], reason: where);
      }
      if (steps.isNotEmpty && steps.last.reachedGoal) reached++;
      if (steps.isNotEmpty && steps.last.errorType != null) {
        errors.add(_errorIds[steps.last.errorType]!);
      }
    }
    expect(reached, greaterThanOrEqualTo(5));
    expect(errors, _errorIds.values.toSet()..remove('jump-landing-blocked'),
        reason: 'the runs cover every error the random programs can reach');
  });

  test('editing sequences give the same program text and cursor as the web', () {
    for (final e in golden['edits'] as List) {
      final ids = CommandIds();
      var program = <Command>[];
      var cursor = const InsertionCursor();
      for (final (k, op) in (e['ops'] as List).indexed) {
        if (op['op'] == 'insert') {
          final type = CommandType.byId(op['type'] as String)!;
          final res = insertCommand(program, createCommand(type, ids.next()), cursor);
          program = res.program;
          cursor = res.cursor;
        } else {
          final res = removeAtLine(program, op['line'] as int);
          program = res.program;
          cursor = res.cursor;
        }
        final where = 'seed ${e['seed']} op $k ${op['op']}';
        expect(programToText(program), (op['text'] as List).cast<String>(), reason: where);
        expect(cursorJson(cursor), op['cursor'], reason: where);
      }
    }
  });

  test('line efficiency matches', () {
    for (final c in golden['efficiency'] as List) {
      final results = [
        for (final r in c['results'] as List)
          (optimalLines: r['optimalLines'] as int, actualLines: r['actualLines'] as int),
      ];
      expect(computeLineEfficiency(results), closeTo((c['expected'] as num).toDouble(), 1e-12));
    }
  });
}
