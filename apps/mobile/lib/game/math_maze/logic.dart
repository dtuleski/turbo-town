import 'dart:math';

import '../framework/session_timers.dart';

/// Port of apps/web `utils/mazeGenerator.ts`, `mazeEquations.ts` and
/// `mazeScoringUtils.ts`. All randomness comes from the injected [Random].

enum MazeCell { wall, path, gate, collectible, start, exit }

class MazePos {
  const MazePos(this.row, this.col);
  final int row;
  final int col;

  /// Unique per cell for sets and maps.
  int get key => row * 1000 + col;

  @override
  bool operator ==(Object other) => other is MazePos && other.row == row && other.col == col;

  @override
  int get hashCode => key;

  @override
  String toString() => '($row,$col)';
}

enum MazeOperation { addition, subtraction, multiplication, division, power, root, algebra }

class MathEquation {
  const MathEquation(this.display, this.answer, this.operation);
  final String display;
  final int answer;
  final MazeOperation operation;
}

class GateInfo {
  GateInfo(this.position, this.equation);
  final MazePos position;
  final MathEquation equation;
}

class MazeData {
  MazeData({
    required this.grid,
    required this.start,
    required this.exit,
    required this.gates,
    required this.collectibles,
    required this.rows,
    required this.cols,
  });
  final List<List<MazeCell>> grid;
  final MazePos start;
  final MazePos exit;
  final List<GateInfo> gates;
  final List<MazePos> collectibles;
  final int rows;
  final int cols;
}

const List<String> kMazeDifficulties = ['easy', 'medium', 'hard'];

/// Seconds allowed per difficulty (web `TIME_LIMITS`).
const Map<String, int> kMazeTimeLimits = {'easy': 180, 'medium': 240, 'hard': 300};

int mazeDifficultyValue(String difficulty) => switch (difficulty) {
      'medium' => 2,
      'hard' => 3,
      _ => 1,
    };

String mazeDifficultyParam(String? d) => kMazeDifficulties.contains(d) ? d! : 'easy';

class MazeConfig {
  const MazeConfig(this.rows, this.cols, this.gateMin, this.gateMax, this.collMin, this.collMax);
  final int rows;
  final int cols;
  final int gateMin;
  final int gateMax;
  final int collMin;
  final int collMax;
}

MazeConfig mazeConfigFor(String difficulty) => switch (difficulty) {
      'medium' => const MazeConfig(10, 10, 5, 8, 4, 6),
      'hard' => const MazeConfig(13, 13, 8, 12, 5, 8),
      _ => const MazeConfig(7, 7, 3, 5, 3, 5),
    };

const List<MazePos> _dirs = [MazePos(-1, 0), MazePos(1, 0), MazePos(0, -1), MazePos(0, 1)];

int _randInt(Random rng, int min, int max) => min + rng.nextInt(max - min + 1);

bool _inBounds(int r, int c, int rows, int cols) => r >= 0 && r < rows && c >= 0 && c < cols;

/// BFS: can the exit be reached from [start], treating the gates in
/// [blockedGates] (cell keys) as walls?
bool hasPathToExit(
  List<List<MazeCell>> grid,
  MazePos start,
  MazePos exit, [
  Set<int>? blockedGates,
]) {
  final rows = grid.length;
  final cols = grid[0].length;
  final visited = <int>{start.key};
  final queue = <MazePos>[start];
  var head = 0;
  while (head < queue.length) {
    final cur = queue[head++];
    if (cur == exit) return true;
    for (final d in _dirs) {
      final nr = cur.row + d.row;
      final nc = cur.col + d.col;
      if (!_inBounds(nr, nc, rows, cols)) continue;
      final next = MazePos(nr, nc);
      if (visited.contains(next.key)) continue;
      final cell = grid[nr][nc];
      if (cell == MazeCell.wall) continue;
      if (blockedGates != null && cell == MazeCell.gate && blockedGates.contains(next.key)) {
        continue;
      }
      visited.add(next.key);
      queue.add(next);
    }
  }
  return false;
}

/// Up to 10 simple paths from [start] to [exit] (enough to check there are at
/// least two).
List<List<MazePos>> findDistinctPaths(List<List<MazeCell>> grid, MazePos start, MazePos exit) {
  final rows = grid.length;
  final cols = grid[0].length;
  const maxPaths = 10;
  final paths = <List<MazePos>>[];
  final visited = <int>{start.key};
  void dfs(MazePos cur, List<MazePos> path) {
    if (paths.length >= maxPaths) return;
    if (cur == exit) {
      paths.add(List.of(path));
      return;
    }
    for (final d in _dirs) {
      final nr = cur.row + d.row;
      final nc = cur.col + d.col;
      if (!_inBounds(nr, nc, rows, cols)) continue;
      final next = MazePos(nr, nc);
      if (visited.contains(next.key)) continue;
      if (grid[nr][nc] == MazeCell.wall) continue;
      visited.add(next.key);
      path.add(next);
      dfs(next, path);
      path.removeLast();
      visited.remove(next.key);
      if (paths.length >= maxPaths) return;
    }
  }

  dfs(start, [start]);
  return paths;
}

Map<int, int> _bfsDistances(List<List<MazeCell>> grid, MazePos from) {
  final rows = grid.length;
  final cols = grid[0].length;
  final dist = <int, int>{from.key: 0};
  final queue = <MazePos>[from];
  var head = 0;
  while (head < queue.length) {
    final cur = queue[head++];
    final d = dist[cur.key]!;
    for (final dir in _dirs) {
      final nr = cur.row + dir.row;
      final nc = cur.col + dir.col;
      if (!_inBounds(nr, nc, rows, cols)) continue;
      final next = MazePos(nr, nc);
      if (dist.containsKey(next.key) || grid[nr][nc] == MazeCell.wall) continue;
      dist[next.key] = d + 1;
      queue.add(next);
    }
  }
  return dist;
}

/// Cells (keys) that lie on any shortest path from [start] to [exit].
Set<int> findShortestPathCells(List<List<MazeCell>> grid, MazePos start, MazePos exit) {
  final fromStart = _bfsDistances(grid, start);
  final fromExit = _bfsDistances(grid, exit);
  final shortest = fromStart[exit.key];
  final result = <int>{};
  if (shortest == null) return result;
  for (var r = 0; r < grid.length; r++) {
    for (var c = 0; c < grid[0].length; c++) {
      final key = MazePos(r, c).key;
      final ds = fromStart[key];
      final de = fromExit[key];
      if (ds != null && de != null && ds + de == shortest) result.add(key);
    }
  }
  return result;
}

/// Recursive backtracker on odd grid coordinates.
void _carveMaze(List<List<MazeCell>> grid, int rows, int cols, Random rng) {
  final cellRows = rows ~/ 2;
  final cellCols = cols ~/ 2;
  final visited = <int>{0};
  final stack = <MazePos>[const MazePos(0, 0)];
  grid[1][1] = MazeCell.path;
  while (stack.isNotEmpty) {
    final current = stack.last;
    final neighbors = shuffled(_dirs, rng)
        .map((d) => MazePos(current.row + d.row, current.col + d.col))
        .where((n) =>
            n.row >= 0 &&
            n.row < cellRows &&
            n.col >= 0 &&
            n.col < cellCols &&
            !visited.contains(n.key))
        .toList();
    if (neighbors.isEmpty) {
      stack.removeLast();
      continue;
    }
    final next = neighbors.first;
    visited.add(next.key);
    grid[current.row * 2 + 1 + (next.row - current.row)][current.col * 2 + 1 + (next.col - current.col)] =
        MazeCell.path;
    grid[next.row * 2 + 1][next.col * 2 + 1] = MazeCell.path;
    stack.add(next);
  }
}

/// Opens [count] walls that separate two path cells, to make loops.
void _addExtraPassages(List<List<MazeCell>> grid, int rows, int cols, int count, Random rng) {
  final candidates = <MazePos>[];
  for (var r = 1; r < rows - 1; r++) {
    for (var c = 1; c < cols - 1; c++) {
      if (grid[r][c] != MazeCell.wall) continue;
      final horizontal = grid[r][c - 1] == MazeCell.path && grid[r][c + 1] == MazeCell.path;
      final vertical = grid[r - 1][c] == MazeCell.path && grid[r + 1][c] == MazeCell.path;
      if (horizontal || vertical) candidates.add(MazePos(r, c));
    }
  }
  final list = shuffled(candidates, rng);
  for (var i = 0; i < min(count, list.length); i++) {
    grid[list[i].row][list[i].col] = MazeCell.path;
  }
}

MazePos _findPathCellInRegion(List<List<MazeCell>> grid, int rows, int cols, bool topLeft) {
  final halfR = (rows / 2).ceil();
  final halfC = (cols / 2).ceil();
  if (topLeft) {
    for (var r = 1; r < halfR; r++) {
      for (var c = 1; c < halfC; c++) {
        if (grid[r][c] == MazeCell.path) return MazePos(r, c);
      }
    }
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (grid[r][c] == MazeCell.path) return MazePos(r, c);
      }
    }
    return const MazePos(1, 1);
  }
  for (var r = rows - 2; r >= halfR; r--) {
    for (var c = cols - 2; c >= halfC; c--) {
      if (grid[r][c] == MazeCell.path) return MazePos(r, c);
    }
  }
  for (var r = rows - 1; r >= 0; r--) {
    for (var c = cols - 1; c >= 0; c--) {
      if (grid[r][c] == MazeCell.path) return MazePos(r, c);
    }
  }
  return MazePos(rows - 2, cols - 2);
}

/// Gates go on cells that keep at least two routes: first on shortest-path
/// cells (so they are hard to bypass), then elsewhere.
List<GateInfo> _placeGates(
  List<List<MazeCell>> grid,
  MazePos start,
  MazePos exit,
  int count,
  String difficulty,
  Random rng,
) {
  final gates = <GateInfo>[];
  final shortest = findShortestPathCells(grid, start, exit);
  final on = <MazePos>[];
  final off = <MazePos>[];
  for (var r = 0; r < grid.length; r++) {
    for (var c = 0; c < grid[0].length; c++) {
      if (grid[r][c] != MazeCell.path) continue;
      final dStart = (r - start.row).abs() + (c - start.col).abs();
      final dExit = (r - exit.row).abs() + (c - exit.col).abs();
      if (dStart <= 1 || dExit <= 1) continue;
      final pos = MazePos(r, c);
      (shortest.contains(pos.key) ? on : off).add(pos);
    }
  }
  for (final pos in [...shuffled(on, rng), ...shuffled(off, rng)]) {
    if (gates.length >= count) break;
    grid[pos.row][pos.col] = MazeCell.gate;
    if (hasPathToExit(grid, start, exit, {pos.key}) &&
        findDistinctPaths(grid, start, exit).length >= 2) {
      gates.add(GateInfo(pos, generateEquation(difficulty, rng)));
    } else {
      grid[pos.row][pos.col] = MazeCell.path;
    }
  }
  return gates;
}

/// Collectibles go on path cells that are not on a shortest route.
List<MazePos> _placeCollectibles(
  List<List<MazeCell>> grid,
  MazePos start,
  MazePos exit,
  int count,
  Random rng,
) {
  final shortest = findShortestPathCells(grid, start, exit);
  final candidates = <MazePos>[
    for (var r = 0; r < grid.length; r++)
      for (var c = 0; c < grid[0].length; c++)
        if (grid[r][c] == MazeCell.path && !shortest.contains(MazePos(r, c).key)) MazePos(r, c),
  ];
  final picked = shuffled(candidates, rng).take(count).toList();
  for (final p in picked) {
    grid[p.row][p.col] = MazeCell.collectible;
  }
  return picked;
}

/// A new maze for [difficulty], with real equations on its gates.
MazeData generateMaze(String difficulty, Random rng) {
  final config = mazeConfigFor(difficulty);
  final rows = config.rows;
  final cols = config.cols;
  final grid = List.generate(rows, (_) => List.filled(cols, MazeCell.wall));
  _carveMaze(grid, rows, cols, rng);
  final extra = difficulty == 'easy' ? 2 : (difficulty == 'medium' ? 3 : 4);
  _addExtraPassages(grid, rows, cols, extra, rng);
  final start = _findPathCellInRegion(grid, rows, cols, true);
  final exit = _findPathCellInRegion(grid, rows, cols, false);
  grid[start.row][start.col] = MazeCell.start;
  grid[exit.row][exit.col] = MazeCell.exit;
  for (var attempts = 0; attempts < 20; attempts++) {
    if (findDistinctPaths(grid, start, exit).length >= 2) break;
    _addExtraPassages(grid, rows, cols, 2, rng);
  }
  final gates = _placeGates(
      grid, start, exit, _randInt(rng, config.gateMin, config.gateMax), difficulty, rng);
  final collectibles =
      _placeCollectibles(grid, start, exit, _randInt(rng, config.collMin, config.collMax), rng);
  if (!hasPathToExit(grid, start, exit)) {
    // Should not happen: open every gate so the maze stays solvable.
    for (final g in gates) {
      grid[g.position.row][g.position.col] = MazeCell.path;
    }
    gates.clear();
  }
  return MazeData(
    grid: grid,
    start: start,
    exit: exit,
    gates: gates,
    collectibles: collectibles,
    rows: rows,
    cols: cols,
  );
}

// ── Equations ──────────────────────────────────────────────────────────────

const List<int> _perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];

({List<MazeOperation> operations, int maxOperand}) equationConfig(String difficulty) =>
    switch (difficulty) {
      'medium' => (
          operations: [
            MazeOperation.addition,
            MazeOperation.subtraction,
            MazeOperation.multiplication,
            MazeOperation.division,
          ],
          maxOperand: 50,
        ),
      'hard' => (operations: MazeOperation.values, maxOperand: 50),
      _ => (
          operations: [MazeOperation.addition, MazeOperation.subtraction],
          maxOperand: 20,
        ),
    };

/// A random equation with an integer answer, scaled to [difficulty].
MathEquation generateEquation(String difficulty, Random rng) {
  final cfg = equationConfig(difficulty);
  final op = cfg.operations[rng.nextInt(cfg.operations.length)];
  switch (op) {
    case MazeOperation.addition:
      final a = _randInt(rng, 1, cfg.maxOperand);
      final b = _randInt(rng, 1, cfg.maxOperand);
      return MathEquation('$a + $b = ?', a + b, op);
    case MazeOperation.subtraction:
      var a = _randInt(rng, 1, cfg.maxOperand);
      var b = _randInt(rng, 1, cfg.maxOperand);
      if (a < b) {
        final t = a;
        a = b;
        b = t;
      }
      return MathEquation('$a − $b = ?', a - b, op);
    case MazeOperation.multiplication:
      final cap = min(cfg.maxOperand, 12);
      final a = _randInt(rng, 1, cap);
      final b = _randInt(rng, 1, cap);
      return MathEquation('$a × $b = ?', a * b, op);
    case MazeOperation.division:
      final cap = min(cfg.maxOperand, 12);
      final answer = _randInt(rng, 1, cap);
      final divisor = _randInt(rng, 2, cap);
      return MathEquation('${answer * divisor} ÷ $divisor = ?', answer, op);
    case MazeOperation.power:
      final base = _randInt(rng, 2, 10);
      final exp = _randInt(rng, 2, 3);
      return MathEquation('$base^$exp = ?', pow(base, exp).toInt(), op);
    case MazeOperation.root:
      final square = _perfectSquares[rng.nextInt(_perfectSquares.length)];
      return MathEquation('√$square = ?', sqrt(square).round(), op);
    case MazeOperation.algebra:
      final a = _randInt(rng, 2, 9);
      final x = _randInt(rng, 1, 20);
      final b = _randInt(rng, 1, 30);
      return MathEquation('${a}x + $b = ${a * x + b}\nSolve for x', x, op);
  }
}

bool checkEquationAnswer(MathEquation e, int answer) => answer == e.answer;

// ── Local scoring (web fallback when the server score is missing) ──────────

class MazeScore {
  const MazeScore({
    required this.baseScore,
    required this.difficultyMultiplier,
    required this.speedBonus,
    required this.accuracyBonus,
    required this.efficiencyBonus,
    required this.gatesSolvedBonus,
    required this.collectibleBonus,
    required this.finalScore,
  });
  final int baseScore;
  final double difficultyMultiplier;
  final double speedBonus;
  final double accuracyBonus;
  final double efficiencyBonus;
  final int gatesSolvedBonus;
  final int collectibleBonus;
  final int finalScore;
}

const Map<String, double> _multipliers = {'easy': 1.0, 'medium': 1.5, 'hard': 2.0};
const Map<String, int> _optimalSteps = {'easy': 12, 'medium': 18, 'hard': 24};

/// Same formula as web `calculateMazeScore`.
MazeScore calculateMazeScore({
  required String difficulty,
  required int completionTime,
  required int totalTime,
  required int gatesAttempted,
  required int gatesSolved,
  required int collectiblesGathered,
  required int stepsTaken,
}) {
  const base = 1000;
  final mult = _multipliers[difficulty] ?? 1.0;
  final speed = max(0.1, 1 + (totalTime - completionTime) / totalTime);
  final accuracy = 1 + (gatesSolved / max(1, gatesAttempted)) * 0.5;
  final stepRatio = max(1, stepsTaken) / (_optimalSteps[difficulty] ?? 12);
  final efficiency = max(0.5, 1.5 / stepRatio);
  final gatesBonus = gatesSolved * 100;
  final collBonus = collectiblesGathered * 50;
  final finalScore = (base * mult * speed * accuracy * efficiency).round() + gatesBonus + collBonus;
  return MazeScore(
    baseScore: base,
    difficultyMultiplier: mult,
    speedBonus: speed,
    accuracyBonus: accuracy,
    efficiencyBonus: efficiency,
    gatesSolvedBonus: gatesBonus,
    collectibleBonus: collBonus,
    finalScore: finalScore,
  );
}
