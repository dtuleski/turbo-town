import 'dart:math';

/// Port of apps/web `utils/ticTacToeAI.ts`. A board is 9 cells in row-major
/// order holding 'X', 'O' or null.
typedef TttBoard = List<String?>;

const List<List<int>> kWinningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6], // diagonals
];

const int kTttRoundsPerGame = 5;

/// Points for a won and a drawn round, shown while playing (web).
const int kTttWinPoints = 300;
const int kTttDrawPoints = 100;

TttBoard emptyTttBoard() => List<String?>.filled(9, null);

String? checkWinner(TttBoard b) {
  for (final l in kWinningLines) {
    if (b[l[0]] != null && b[l[0]] == b[l[1]] && b[l[0]] == b[l[2]]) return b[l[0]];
  }
  return null;
}

List<int>? getWinningLine(TttBoard b) {
  for (final l in kWinningLines) {
    if (b[l[0]] != null && b[l[0]] == b[l[1]] && b[l[0]] == b[l[2]]) return l;
  }
  return null;
}

bool isBoardFull(TttBoard b) => b.every((c) => c != null);

List<int> getEmptyCells(TttBoard b) => [
      for (var i = 0; i < b.length; i++)
        if (b[i] == null) i,
    ];

int _easyMove(TttBoard b, Random rng) {
  final empty = getEmptyCells(b);
  return empty[rng.nextInt(empty.length)];
}

/// Takes a win, blocks the opponent's win, takes the centre, else random.
int _mediumMove(TttBoard b, Random rng) {
  final empty = getEmptyCells(b);
  for (final cell in empty) {
    final t = List<String?>.of(b)..[cell] = 'O';
    if (checkWinner(t) == 'O') return cell;
  }
  for (final cell in empty) {
    final t = List<String?>.of(b)..[cell] = 'X';
    if (checkWinner(t) == 'X') return cell;
  }
  if (b[4] == null) return 4;
  return empty[rng.nextInt(empty.length)];
}

int _minimax(TttBoard b, bool maximizing, int depth) {
  final w = checkWinner(b);
  if (w == 'O') return 10 - depth;
  if (w == 'X') return depth - 10;
  if (isBoardFull(b)) return 0;
  var best = maximizing ? -1000 : 1000;
  for (final cell in getEmptyCells(b)) {
    b[cell] = maximizing ? 'O' : 'X';
    final score = _minimax(b, !maximizing, depth + 1);
    b[cell] = null;
    best = maximizing ? max(best, score) : min(best, score);
  }
  return best;
}

/// Perfect play: the first best cell in board order.
int _hardMove(TttBoard b) {
  final board = List<String?>.of(b);
  final empty = getEmptyCells(board);
  var bestScore = -1000;
  var bestMove = empty.first;
  for (final cell in empty) {
    board[cell] = 'O';
    final score = _minimax(board, false, 0);
    board[cell] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = cell;
    }
  }
  return bestMove;
}

/// The AI's ('O') move on [board]. Unknown difficulties play like easy.
int getAIMove(TttBoard board, String difficulty, Random rng) {
  switch (difficulty) {
    case 'medium':
      return _mediumMove(board, rng);
    case 'hard':
      return _hardMove(board);
    default:
      return _easyMove(board, rng);
  }
}

int tttDifficultyValue(String difficulty) => switch (difficulty) {
      'medium' => 2,
      'hard' => 3,
      _ => 1,
    };
