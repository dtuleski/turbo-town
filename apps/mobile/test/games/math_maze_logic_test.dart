import 'dart:math';

import 'package:dashden_mobile/game/math_maze/logic.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('config', () {
    test('sizes, gate and collectible counts per difficulty (web)', () {
      final e = mazeConfigFor('easy');
      expect([e.rows, e.cols, e.gateMin, e.gateMax, e.collMin, e.collMax], [7, 7, 3, 5, 3, 5]);
      final m = mazeConfigFor('medium');
      expect([m.rows, m.cols, m.gateMin, m.gateMax, m.collMin, m.collMax], [10, 10, 5, 8, 4, 6]);
      final h = mazeConfigFor('hard');
      expect([h.rows, h.cols, h.gateMin, h.gateMax, h.collMin, h.collMax], [13, 13, 8, 12, 5, 8]);
    });

    test('time limits and API values', () {
      expect(kMazeTimeLimits, {'easy': 180, 'medium': 240, 'hard': 300});
      expect([mazeDifficultyValue('easy'), mazeDifficultyValue('medium'), mazeDifficultyValue('hard')],
          [1, 2, 3]);
      expect(mazeDifficultyParam('hard'), 'hard');
      expect(mazeDifficultyParam('nope'), 'easy');
      expect(mazeDifficultyParam(null), 'easy');
    });
  });

  group('generateMaze', () {
    for (final d in kMazeDifficulties) {
      test('$d: structure, routes, gates and collectibles hold for many seeds', () {
        final config = mazeConfigFor(d);
        for (var seed = 0; seed < 25; seed++) {
          final maze = generateMaze(d, Random(seed));
          expect(maze.rows, config.rows);
          expect(maze.cols, config.cols);
          expect(maze.grid.length, config.rows);
          expect(maze.grid[0].length, config.cols);
          final flat = maze.grid.expand((r) => r).toList();
          expect(flat.where((c) => c == MazeCell.start).length, 1, reason: 'seed $seed');
          expect(flat.where((c) => c == MazeCell.exit).length, 1, reason: 'seed $seed');
          expect(maze.grid[maze.start.row][maze.start.col], MazeCell.start);
          expect(maze.grid[maze.exit.row][maze.exit.col], MazeCell.exit);
          expect(hasPathToExit(maze.grid, maze.start, maze.exit), isTrue, reason: 'seed $seed');
          expect(findDistinctPaths(maze.grid, maze.start, maze.exit).length, greaterThanOrEqualTo(2),
              reason: 'seed $seed');
          expect(maze.gates.length, lessThanOrEqualTo(config.gateMax));
          expect(maze.collectibles.length, lessThanOrEqualTo(config.collMax));
          expect(flat.where((c) => c == MazeCell.gate).length, maze.gates.length);
          expect(flat.where((c) => c == MazeCell.collectible).length, maze.collectibles.length);
          // The top row and left column are wall (even sizes, like web, leave
          // the last row and column open).
          for (var i = 0; i < config.rows; i++) {
            expect(maze.grid[i][0], MazeCell.wall);
            expect(maze.grid[0][i], MazeCell.wall);
          }
        }
      });

      test('$d: the exit stays reachable with any single gate blocked', () {
        for (var seed = 0; seed < 25; seed++) {
          final maze = generateMaze(d, Random(seed));
          for (final g in maze.gates) {
            expect(hasPathToExit(maze.grid, maze.start, maze.exit, {g.position.key}), isTrue,
                reason: '$d seed $seed gate ${g.position}');
          }
        }
      });

      test('$d: no collectible lies on a shortest route', () {
        for (var seed = 0; seed < 15; seed++) {
          final maze = generateMaze(d, Random(seed));
          final shortest = findShortestPathCells(maze.grid, maze.start, maze.exit);
          for (final c in maze.collectibles) {
            expect(shortest.contains(c.key), isFalse, reason: '$d seed $seed $c');
          }
        }
      });
    }

    test('the same seed gives the same maze', () {
      final a = generateMaze('medium', Random(11));
      final b = generateMaze('medium', Random(11));
      expect(a.grid, b.grid);
      expect(a.start, b.start);
      expect(a.gates.map((g) => g.equation.display), b.gates.map((g) => g.equation.display));
    });

    test('gates carry real equations with integer answers', () {
      final maze = generateMaze('hard', Random(2));
      for (final g in maze.gates) {
        expect(g.equation.display, isNotEmpty);
      }
    });
  });

  group('hasPathToExit', () {
    final grid = [
      [MazeCell.wall, MazeCell.wall, MazeCell.wall],
      [MazeCell.start, MazeCell.gate, MazeCell.exit],
      [MazeCell.wall, MazeCell.wall, MazeCell.wall],
    ];
    const start = MazePos(1, 0);
    const exit = MazePos(1, 2);

    test('is true with the gate open and false with it blocked', () {
      expect(hasPathToExit(grid, start, exit), isTrue);
      expect(hasPathToExit(grid, start, exit, {const MazePos(1, 1).key}), isFalse);
    });

    test('a blocked key that is not a gate is ignored', () {
      final g = [
        [MazeCell.start, MazeCell.path, MazeCell.exit],
      ];
      expect(hasPathToExit(g, const MazePos(0, 0), const MazePos(0, 2), {const MazePos(0, 1).key}),
          isTrue);
    });
  });

  group('equations', () {
    Set<MazeOperation> opsOf(String d) {
      final ops = <MazeOperation>{};
      final rng = Random(1);
      for (var i = 0; i < 600; i++) {
        ops.add(generateEquation(d, rng).operation);
      }
      return ops;
    }

    test('easy uses + and -, medium the four operations, hard everything', () {
      expect(opsOf('easy'), {MazeOperation.addition, MazeOperation.subtraction});
      expect(opsOf('medium'), {
        MazeOperation.addition,
        MazeOperation.subtraction,
        MazeOperation.multiplication,
        MazeOperation.division,
      });
      expect(opsOf('hard'), MazeOperation.values.toSet());
    });

    test('answers are right for every operation', () {
      final rng = Random(7);
      for (var i = 0; i < 400; i++) {
        final e = generateEquation('hard', rng);
        final nums = RegExp(r'\d+').allMatches(e.display).map((m) => int.parse(m.group(0)!)).toList();
        switch (e.operation) {
          case MazeOperation.addition:
            expect(nums[0] + nums[1], e.answer);
          case MazeOperation.subtraction:
            expect(nums[0] - nums[1], e.answer);
            expect(e.answer, greaterThanOrEqualTo(0));
          case MazeOperation.multiplication:
            expect(nums[0] * nums[1], e.answer);
          case MazeOperation.division:
            expect(nums[0] ~/ nums[1], e.answer);
            expect(nums[0] % nums[1], 0);
          case MazeOperation.power:
            expect(pow(nums[0], nums[1]), e.answer);
          case MazeOperation.root:
            expect(e.answer * e.answer, nums[0]);
          case MazeOperation.algebra:
            // a x + b = c
            expect(nums[0] * e.answer + nums[1], nums[2]);
        }
        expect(e.display, isNotEmpty);
      }
    });

    test('operands stay in range for easy', () {
      final rng = Random(3);
      for (var i = 0; i < 200; i++) {
        final e = generateEquation('easy', rng);
        final nums = RegExp(r'\d+').allMatches(e.display).map((m) => int.parse(m.group(0)!));
        expect(nums.every((n) => n >= 1 && n <= 20), isTrue, reason: e.display);
      }
    });

    test('checkEquationAnswer', () {
      const e = MathEquation('2 + 3 = ?', 5, MazeOperation.addition);
      expect(checkEquationAnswer(e, 5), isTrue);
      expect(checkEquationAnswer(e, 4), isFalse);
      expect(checkEquationAnswer(e, 0), isFalse);
      const zero = MathEquation('3 − 3 = ?', 0, MazeOperation.subtraction);
      expect(checkEquationAnswer(zero, 0), isTrue);
      expect(checkEquationAnswer(zero, -0), isTrue);
    });
  });

  group('local score formula (web calculateMazeScore)', () {
    MazeScore score({
      String d = 'easy',
      int time = 60,
      int total = 180,
      int attempted = 4,
      int solved = 4,
      int coll = 0,
      int steps = 12,
    }) =>
        calculateMazeScore(
          difficulty: d,
          completionTime: time,
          totalTime: total,
          gatesAttempted: attempted,
          gatesSolved: solved,
          collectiblesGathered: coll,
          stepsTaken: steps,
        );

    test('multipliers 1, 1.5 and 2', () {
      expect(score(d: 'easy').difficultyMultiplier, 1.0);
      expect(score(d: 'medium').difficultyMultiplier, 1.5);
      expect(score(d: 'hard').difficultyMultiplier, 2.0);
    });

    test('speed bonus is higher when faster and never below 0.1', () {
      expect(score(time: 30).speedBonus, greaterThan(score(time: 120).speedBonus));
      expect(score(time: 100000).speedBonus, 0.1);
    });

    test('accuracy 1.5 when perfect and 1.0 with no gates solved', () {
      expect(score(attempted: 3, solved: 3).accuracyBonus, 1.5);
      expect(score(attempted: 3, solved: 0).accuracyBonus, 1.0);
      expect(score(attempted: 0, solved: 0).accuracyBonus, 1.0);
    });

    test('efficiency: 1.5 at the optimal steps, falling to 0.5', () {
      expect(score(steps: 12).efficiencyBonus, 1.5);
      expect(score(steps: 6).efficiencyBonus, 3.0);
      expect(score(steps: 1000).efficiencyBonus, 0.5);
    });

    test('final score adds 100 per gate and 50 per star', () {
      final s = score(attempted: 2, solved: 2, coll: 3);
      expect(s.gatesSolvedBonus, 200);
      expect(s.collectibleBonus, 150);
      final base = (1000 * s.difficultyMultiplier * s.speedBonus * s.accuracyBonus * s.efficiencyBonus)
          .round();
      expect(s.finalScore, base + 200 + 150);
    });
  });
}
