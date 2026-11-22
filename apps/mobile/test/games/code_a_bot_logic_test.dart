import 'package:dashden_mobile/game/code_a_bot/logic.dart';
import 'package:flutter_test/flutter_test.dart';

const _f = Instruction.forward;
const _l = Instruction.turnLeft;
const _r = Instruction.turnRight;
const _j = Instruction.jump;

SimStep _last(String d, int n, List<Instruction> p) => simulate(getLevel(d, n), p).last;

void main() {
  group('easy level 1 (ported from the web test)', () {
    test('is solved by repeating FORWARD 4 times', () {
      final level = getLevel('easy', 1);
      final program = [_f, _f, _f, _f];
      expect(program.length, lessThanOrEqualTo(level.maxInstructions));
      expect(simulate(level, program).last.reachedGoal, isTrue);
    });

    test('does not reach the goal with fewer forwards', () {
      expect(simulate(getLevel('easy', 1), [_f, _f]).last.reachedGoal, isFalse);
    });
  });

  group('levels', () {
    test('5 levels per difficulty, with growing grids', () {
      expect([for (final d in kBotDifficulties) d.levelCount], [5, 5, 5]);
      expect([for (final d in kBotDifficulties) getLevel(d.id, 1).rows], [5, 6, 7]);
      expect(getTotalLevels('hard'), 5);
      expect([botDifficultyValue('easy'), botDifficultyValue('medium'), botDifficultyValue('hard')],
          [1, 2, 3]);
    });

    test('level numbers are clamped and every level has start, goal and a hint', () {
      expect(getLevel('easy', 99).levelNumber, 99);
      expect(getLevel('easy', 99).goal, getLevel('easy', 5).goal);
      for (final d in kBotDifficulties) {
        for (var n = 1; n <= 5; n++) {
          final l = getLevel(d.id, n);
          expect(l.grid[l.start.row][l.start.col], CellType.start, reason: '${d.id} $n');
          expect(l.grid[l.goal.row][l.goal.col], CellType.goal, reason: '${d.id} $n');
          expect(l.hint, isNotEmpty);
          expect(l.rows, d.gridSize);
        }
      }
    });

    test('easy has only walls, medium adds cracks, hard adds ice', () {
      Set<CellType> kinds(String d) => {
            for (var n = 1; n <= 5; n++) ...getLevel(d, n).grid.expand((r) => r),
          };
      expect(kinds('easy').containsAll([CellType.wall]), isTrue);
      expect(kinds('easy').contains(CellType.crack), isFalse);
      expect(kinds('easy').contains(CellType.ice), isFalse);
      expect(kinds('medium').contains(CellType.crack), isTrue);
      expect(kinds('medium').contains(CellType.ice), isFalse);
      expect(kinds('hard').contains(CellType.ice), isTrue);
    });
  });

  group('simulate', () {
    test('turns change the direction without moving', () {
      final steps = simulate(getLevel('easy', 1), [_l, _r, _r]);
      expect(steps.map((s) => s.dir), [Direction.left, Direction.up, Direction.right]);
      expect(steps.every((s) => s.pos == const Position(4, 0)), isTrue);
    });

    test('walking off the board crashes the bot and stops the run', () {
      final steps = simulate(getLevel('easy', 1), [_l, _f, _f]);
      expect(steps, hasLength(2));
      expect(steps.last.alive, isFalse);
      expect(steps.last.fellInCrack, isFalse);
    });

    test('a wall stops the bot', () {
      // Easy 2 starts at (2,0) facing right; turning down then forward hits (3,0)? open. Face right, walls at row 1 and 3.
      final level = getLevel('easy', 2);
      final steps = simulate(level, [_r, _f, _f]);
      // down from (2,0): (3,0) is open, (4,0) is open: no crash. Use a real wall hit instead.
      expect(steps.last.alive, isTrue);
      final crash = simulate(level, [_f, _l, _f]);
      expect(crash.last.alive, isFalse, reason: '(1,1) is a wall');
    });

    test('easy level 2 is solved by forward x4', () {
      expect(_last('easy', 2, [_f, _f, _f, _f]).reachedGoal, isTrue);
    });

    test('easy level 3 solution: up, up, up, up, turn right, forward, forward', () {
      expect(_last('easy', 3, [_f, _f, _f, _f, _r, _f, _f]).reachedGoal, isTrue);
    });

    test('forward into a crack falls, jump over it works', () {
      final fall = simulate(getLevel('medium', 1), [_f, _f]);
      expect(fall.last.fellInCrack, isTrue);
      expect(fall.last.alive, isFalse);
      final ok = simulate(getLevel('medium', 1), [_f, _j, _f, _f, _f]);
      expect(ok.last.reachedGoal, isTrue);
      expect(ok.any((s) => s.jumped), isTrue);
    });

    test('a jump that lands on a crack falls too, and one past the edge crashes', () {
      // medium 1: start (5,0) up; crack at (3,0). One forward then jump lands on (2,0)...
      // jump from (5,0) lands on (3,0): the crack.
      final land = simulate(getLevel('medium', 1), [_j]);
      expect(land.last.fellInCrack, isTrue);
      final edge = simulate(getLevel('easy', 1), [_f, _f, _f, _j]);
      expect(edge.last.alive, isFalse);
    });

    test('ice slides the bot one extra cell', () {
      // hard 1: start (6,0) right, ice at (6,3). Forward x3 lands on ice and slides to (6,4).
      final steps = simulate(getLevel('hard', 1), [_f, _f, _f]);
      expect(steps.last.slid, isTrue);
      expect(steps.last.pos, const Position(6, 4));
      expect(simulate(getLevel('hard', 1), [_f, _f, _f, _f, _f]).last.reachedGoal, isTrue);
    });

    test('reaching the goal stops the run even with instructions left', () {
      final steps = simulate(getLevel('easy', 1), [_f, _f, _f, _f, _f, _f]);
      expect(steps, hasLength(4));
      expect(steps.last.reachedGoal, isTrue);
    });

    test('an empty program does nothing', () {
      expect(simulate(getLevel('easy', 1), const []), isEmpty);
    });
  });
}
