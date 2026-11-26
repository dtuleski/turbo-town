// Daily Challenge: pure conversions from served content to the state each
// first-batch game plays (M3, web `utils/challengeContent.ts`). The games use
// them only for a `challenge=<day>` launch; otherwise they keep their own
// generators.
import '../api/challenge_models.dart';
import '../game/data/quiz_data.dart';
import '../game/math/math_logic.dart';
import '../game/math_maze/logic.dart';
import '../game/sudoku/logic.dart';
import '../game/word_puzzle/word_puzzle_logic.dart';

/// Sudoku: the puzzle (0 = blank) and its solution, as fresh copies.
({SudokuGrid puzzle, SudokuGrid solution}) sudokuFromChallenge(SudokuContent content) => (
      puzzle: [
        for (final row in content.puzzle) [for (final v in row) v ?? 0],
      ],
      solution: [for (final row in content.solution) List<int>.of(row)],
    );

MathOperation _mathOperation(String name) =>
    MathOperation.values.firstWhere((o) => o.name == name, orElse: () => MathOperation.addition);

/// Math Challenge: the question list, played in order.
List<MathQuestion> mathQuestionsFromChallenge(MathChallengeContent content) => [
      for (final q in content.questions)
        MathQuestion(question: q.question, answer: q.answer, operation: _mathOperation(q.operation)),
    ];

MazeCell _mazeCell(String name) => MazeCell.values.firstWhere((c) => c.name == name);

MazeOperation _mazeOperation(String name) =>
    MazeOperation.values.firstWhere((o) => o.name == name, orElse: () => MazeOperation.addition);

MazePos _mazePos(ChallengePos p) => MazePos(p.row, p.col);

/// Math Maze: a fresh maze from the content (the board changes nothing in it).
MazeData mazeFromChallenge(MathMazeContent content) => MazeData(
      grid: [
        for (final row in content.grid) [for (final c in row) _mazeCell(c)],
      ],
      start: _mazePos(content.start),
      exit: _mazePos(content.exit),
      gates: [
        for (final g in content.gates)
          GateInfo(_mazePos(g.position), MathEquation(g.display, g.answer, _mazeOperation(g.operation))),
      ],
      collectibles: [for (final p in content.collectibles) _mazePos(p)],
      rows: content.rows,
      cols: content.cols,
    );

const List<(WordDirection, int, int)> _wordDirections = [
  (WordDirection.horizontal, 0, 1),
  (WordDirection.vertical, 1, 0),
  (WordDirection.diagonal, 1, 1),
];

/// Where [word] is written in [grid] (forward, horizontal, vertical or
/// diagonal down-right, as the generators place words), or null.
WordPosition? locateWord(List<List<String>> grid, String word) {
  final size = grid.length;
  for (var r = 0; r < size; r++) {
    for (var c = 0; c < grid[r].length; c++) {
      for (final (dir, dr, dc) in _wordDirections) {
        final endR = r + dr * (word.length - 1);
        final endC = c + dc * (word.length - 1);
        if (endR >= size || endC >= grid[r].length) continue;
        var match = true;
        for (var i = 0; i < word.length && match; i++) {
          match = grid[r + dr * i][c + dc * i] == word[i];
        }
        if (match) return WordPosition(word, r, c, dir);
      }
    }
  }
  return null;
}

/// Word Puzzle: the variant for [locale]'s language (fallback en). Every
/// listed word is played, so the total equals the shared `expectedTotals`.
WordPuzzle wordPuzzleFromChallenge(WordPuzzleContent content, String? locale) {
  final v = content.variantFor(challengeLanguage(locale));
  final grid = [for (final row in v.grid) List<String>.of(row)];
  return WordPuzzle(
    grid: grid,
    words: List<String>.of(v.words),
    positions: [
      for (final w in v.words)
        if (locateWord(grid, w) case final p?) p,
    ],
    gridSize: v.gridSize,
  );
}

/// Hangman: the rounds' words for [locale]'s language (fallback en).
List<HangmanWord> hangmanWordsFromChallenge(HangmanContent content, String? locale) => [
      for (final w in content.wordsFor(challengeLanguage(locale)))
        HangmanWord(word: w.word, hint: w.hint, category: w.category),
    ];
