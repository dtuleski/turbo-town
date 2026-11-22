import 'package:dashden_mobile/game/space_coder/logic.dart';
import 'package:dashden_mobile/game/space_coder/space_coder_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/lcg_random.dart';

Command f(String id) => Command(id: id, type: CommandType.forward);
Command tl(String id) => Command(id: id, type: CommandType.turnLeft);
Command tr(String id) => Command(id: id, type: CommandType.turnRight);
Command loop(String id, int n, List<Command> body) =>
    Command(id: id, type: CommandType.loop, parameter: n, body: body);

SpaceLevel level(String d, int n) => kSpaceLevels[d]![n - 1];

void main() {
  group('levels', () {
    test('five levels per difficulty with web grid sizes', () {
      expect(totalSpaceLevels('easy'), 5);
      expect(totalSpaceLevels('medium'), 5);
      expect(totalSpaceLevels('hard'), 5);
      expect(level('easy', 1).rows, 6);
      expect(level('medium', 1).cols, 8);
      expect(level('hard', 1).rows, 12);
      for (final d in kSpaceCoderDifficulties) {
        for (final l in kSpaceLevels[d]!) {
          expect(l.grid[l.goal.row][l.goal.col], CellType.goal, reason: '$d ${l.levelNumber}');
          expect(l.optimalLines, lessThanOrEqualTo(l.maxLines));
          // Medium 3 (the spiral) has no open path on the web either; its web test
          // only checks the structure, so this one does the same.
          if (!(d == 'medium' && l.levelNumber == 3)) {
            expect(bfsPathExists(l.grid, l.start, l.goal), isTrue, reason: '$d ${l.levelNumber}');
          }
        }
      }
    });

    test('the medium solutions from the web tests reach the airlock within the line limit', () {
      final solutions = {
        1: [
          loop('l', 3, [f('a'), f('b'), tr('c'), f('d'), f('e'), tl('g')])
        ],
        4: [
          loop('l', 2, [f('a'), f('b'), f('c'), tr('d'), f('e'), f('g'), f('h'), tl('i')])
        ],
        5: [
          loop('l', 6, [f('a'), tr('b'), f('c'), tl('d')])
        ],
      };
      for (final e in solutions.entries) {
        final l = level('medium', e.key);
        final steps = executeProgram(l, e.value);
        expect(steps.last.reachedGoal, isTrue, reason: 'medium ${e.key}');
        expect(countAllLines(e.value), lessThanOrEqualTo(l.maxLines));
      }
    });

    test('hard levels get fresh random obstacles that never block the way', () {
      final a = loadSpaceLevel('hard', 3, LcgRandom(1));
      final b = loadSpaceLevel('hard', 3, LcgRandom(2));
      int count(SpaceLevel l) =>
          l.grid.expand((r) => r).where((c) => c == CellType.obstacle).length;
      expect(count(a), 15);
      expect(a.grid, isNot(b.grid));
      expect(bfsPathExists(a.grid, a.start, a.goal), isTrue);
      // Next to the start is always clear, so the first move is never a dead end.
      for (final d in kDirDelta.values) {
        final p = Position(a.start.row + d.row, a.start.col + d.col);
        if (inBounds(p, a)) expect(a.grid[p.row][p.col], isNot(CellType.obstacle));
      }
      expect(loadSpaceLevel('easy', 1, LcgRandom(1)).grid, level('easy', 1).grid);
    });
  });

  group('interpreter', () {
    final open = level('easy', 1);

    test('forward, turns and the step limit', () {
      final steps = executeProgram(open, [f('a'), tr('b'), f('c')]);
      expect(steps.map((s) => s.pos),
          [const Position(0, 1), const Position(0, 1), const Position(1, 1)]);
      expect(steps[1].dir, Direction.down);
      final forever = executeProgram(open, [
        const Command(
          id: 'w',
          type: CommandType.whileCmd,
          condition: SensorCondition(SensorType.notAtGoal),
          body: [Command(id: 't', type: CommandType.turnLeft)],
        ),
      ]);
      expect(forever.length, lessThanOrEqualTo(kMaxSteps + 1));
      expect(forever.last.alive, isFalse);
      expect(forever.last.errorType, ErrorType.infiniteLoop);
    });

    test('walking off the grid and into a wall are collisions', () {
      final off = executeProgram(open, [tl('a'), f('b')]);
      expect(off.last.outOfBounds, isTrue);
      expect(off.last.errorType, ErrorType.collision);
      final wall = executeProgram(level('easy', 3), [tr('a'), f('b')]);
      expect(wall.last.hitWall, isTrue);
    });

    test('jump needs an obstacle ahead and a clear landing; it takes two steps', () {
      final grid = [
        for (var r = 0; r < 6; r++) [for (var c = 0; c < 6; c++) CellType.empty],
      ];
      grid[0][1] = CellType.obstacle;
      grid[0][5] = CellType.goal;
      final l = open.withGrid(grid);
      final ok = executeProgram(l, [const Command(id: 'j', type: CommandType.jump)]);
      expect(ok, hasLength(2));
      expect(ok.first.isJumpMidpoint, isTrue);
      expect(ok.last.pos, const Position(0, 2));
      final none = executeProgram(open, [const Command(id: 'j', type: CommandType.jump)]);
      expect(none.single.errorType, ErrorType.noObstacleToJump);
      grid[0][2] = CellType.obstacle;
      final blocked =
          executeProgram(open.withGrid(grid), [const Command(id: 'j', type: CommandType.jump)]);
      expect(blocked.single.errorType, ErrorType.jumpLandingBlocked);
      expect(blocked.single.hitObstacle, isTrue);
    });

    test('if takes the else branch; while stops when the condition fails', () {
      final steps = executeProgram(open, [
        const Command(
          id: 'i',
          type: CommandType.ifCmd,
          condition: SensorCondition(SensorType.edgeAhead),
          body: [Command(id: 'a', type: CommandType.turnLeft)],
          elseBody: [Command(id: 'b', type: CommandType.forward)],
        ),
        const Command(
          id: 'w',
          type: CommandType.whileCmd,
          condition: SensorCondition(SensorType.notAtGoal),
          body: [Command(id: 'c', type: CommandType.forward)],
        ),
      ]);
      expect(steps.first.commandId, 'b');
      expect(steps.last.reachedGoal, isTrue);
      expect(steps.last.pos, open.goal);
    });

    test('variables: undefined reads stop the run, declared ones count', () {
      final undefined = executeProgram(open, [const Command(id: 'i', type: CommandType.varNumInc)]);
      expect(undefined.single.errorType, ErrorType.undefinedVariable);
      final counted = executeProgram(open, [
        const Command(id: 'd', type: CommandType.varNumDecl, varValue: 0),
        const Command(
          id: 'w',
          type: CommandType.whileCmd,
          condition: ComparisonCondition(Variable.num, ComparisonOperator.lt, 3),
          body: [
            Command(id: 'f', type: CommandType.forward),
            Command(id: 'p', type: CommandType.varNumInc),
          ],
        ),
      ]);
      expect(counted.last.pos, const Position(0, 3));
      expect(counted.last.alive, isTrue);
      final chars = executeProgram(open, [
        const Command(id: 'd', type: CommandType.varCharDecl, varValue: 'c'),
        const Command(
          id: 'i',
          type: CommandType.ifCmd,
          condition: ComparisonCondition(Variable.char, ComparisonOperator.gt, 'b'),
          body: [Command(id: 'f', type: CommandType.forward)],
          elseBody: [],
        ),
      ]);
      expect(chars.single.commandId, 'f');
    });

    test('every step names the editor line of its command', () {
      final program = [
        f('a'),
        loop('l', 2, [f('b')]),
        tr('c'),
      ];
      // lines: 0 forward, 1 loop, 2 forward, 3 next, 4 turn
      final steps = executeProgram(open, program);
      expect(steps.map((s) => s.lineIndex), [0, 2, 2, 4]);
    });
  });

  group('editor', () {
    test('text, line count and cursor marker for nested structures', () {
      var program = <Command>[];
      var cursor = const InsertionCursor();
      final ids = CommandIds();
      void add(CommandType t) {
        final r = insertCommand(program, createCommand(t, ids.next()), cursor);
        program = r.program;
        cursor = r.cursor;
      }

      add(CommandType.forward);
      add(CommandType.ifCmd); // cursor goes inside if
      add(CommandType.turnLeft);
      expect(programToText(program),
          ['forward()', 'if(obstacle-ahead())', '  turn-left()', 'else', 'end-if']);
      expect(countAllLines(program), 5);
      expect(cursor, const InsertionCursor(parentId: 'cmd-2', index: 1));
      expect(cursorLinePosition(program, cursor), 3, reason: 'just before else');

      // Tap the else line: new commands go into the else branch.
      cursor = cursorForLine(program, 3)!;
      expect(cursor, const InsertionCursor(parentId: 'cmd-2', branch: Branch.elseBody));
      add(CommandType.forward);
      expect(programToText(program)[4], '  forward()');
      expect(cursorLinePosition(program, cursor), 5, reason: 'before end-if');

      // Tap the closing line: after the structure.
      cursor = cursorForLine(program, 5)!;
      expect(cursor, const InsertionCursor(index: 2));
      expect(cursorLinePosition(program, cursor), 6);

      // Removing the opening line removes the whole structure.
      final removed = removeAtLine(program, 1);
      expect(programToText(removed.program), ['forward()']);
      expect(removed.cursor, const InsertionCursor(index: 1));
    });

    test('a cursor whose structure is gone inserts at the top level', () {
      final r = insertCommand(
        [f('a')],
        createCommand(CommandType.turnLeft, 'x'),
        const InsertionCursor(parentId: 'gone', index: 0),
      );
      expect(r.program.map((c) => c.id), ['x', 'a']);
    });

    test('updateCommand edits nested commands without touching others', () {
      final program = [
        loop('l', 2, [
          loop('m', 3, [f('a')])
        ]),
      ];
      final updated = updateCommand(program, 'm', (c) => c.copyWith(parameter: 9));
      expect(programToText(updated), ['loop(2)', '  loop(9)', '    forward()', '  next', 'next']);
      expect(findCommand(updated, 'a')!.type, CommandType.forward);
      expect(findCommand(updated, 'zzz'), isNull);
    });

    test('new commands get the web defaults', () {
      expect(createCommand(CommandType.loop, 'a').parameter, 2);
      expect(createCommand(CommandType.ifCmd, 'a').condition,
          const SensorCondition(SensorType.obstacleAhead));
      expect(createCommand(CommandType.ifCmd, 'a').elseBody, isEmpty);
      expect(createCommand(CommandType.whileCmd, 'a').condition,
          const SensorCondition(SensorType.notAtGoal));
      expect(createCommand(CommandType.varNumDecl, 'a').varValue, 0);
      expect(createCommand(CommandType.varCharDecl, 'a').varValue, 'a');
      expect(commandsForDifficulty('easy').map((c) => c.type),
          [CommandType.forward, CommandType.turnLeft, CommandType.turnRight]);
      expect(commandsForDifficulty('medium').map((c) => c.type), contains(CommandType.loop));
      expect(commandsForDifficulty('hard'), hasLength(11));
    });
  });

  group('fail messages', () {
    ExecutionStep step({
      bool alive = false,
      ErrorType? error,
      bool wall = false,
      bool obstacle = false,
      bool out = false,
      String id = 'x',
    }) =>
        ExecutionStep(
          commandId: id,
          pos: const Position(0, 0),
          dir: Direction.up,
          alive: alive,
          reachedGoal: false,
          hitWall: wall,
          hitObstacle: obstacle,
          outOfBounds: out,
          errorType: error,
          lineIndex: 0,
        );

    test('follow the web order', () {
      expect(failOf(null, const []), SpaceFail.notReached);
      expect(failOf(step(alive: true), const []), SpaceFail.notReached);
      expect(failOf(step(error: ErrorType.noObstacleToJump), const []), SpaceFail.noObstacleToJump);
      expect(failOf(step(error: ErrorType.jumpLandingBlocked, obstacle: true), const []),
          SpaceFail.jumpLandingBlocked);
      expect(failOf(step(error: ErrorType.infiniteLoop), const []), SpaceFail.infiniteLoop);
      expect(failOf(step(error: ErrorType.collision, obstacle: true), const []),
          SpaceFail.hitObstacle);
      expect(failOf(step(error: ErrorType.collision, wall: true), const []), SpaceFail.hitWall);
      expect(failOf(step(error: ErrorType.collision, out: true), const []), SpaceFail.offGrid);
      expect(failOf(step(error: ErrorType.undefinedVariable), const []), SpaceFail.undefinedVarNum);
      const charIf = Command(
        id: 'x',
        type: CommandType.ifCmd,
        condition: ComparisonCondition(Variable.char, ComparisonOperator.eq, 'a'),
        body: [],
        elseBody: [],
      );
      expect(failOf(step(error: ErrorType.undefinedVariable), const [charIf]),
          SpaceFail.undefinedVarChar);
    });
  });

  test('efficiency weights the levels completed (web scoring input)', () {
    expect(computeLineEfficiency(const []), 1);
    expect(computeLineEfficiency(const [(optimalLines: 5, actualLines: 10)]), 0.5);
    expect(computeLineEfficiency(const [(optimalLines: 5, actualLines: 4)]), 1);
    expect(spaceCoderDifficultyValue('easy'), 1);
    expect(spaceCoderDifficultyValue('medium'), 2);
    expect(spaceCoderDifficultyValue('hard'), 3);
    expect(spaceCoderDifficultyValue('bogus'), 1);
  });
}
