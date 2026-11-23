import 'dart:math';

import 'package:dashden_mobile/game/tic_tac_toe/logic.dart';
import 'package:flutter_test/flutter_test.dart';

TttBoard _b(String s) => [
      for (final ch in s.split(''))
        ch == '.' ? null : ch,
    ];

void main() {
  test('winner and winning line for rows, columns and diagonals', () {
    expect(checkWinner(_b('XXX......')), 'X');
    expect(getWinningLine(_b('...OOO...')), [3, 4, 5]);
    expect(checkWinner(_b('X..X..X..')), 'X');
    expect(getWinningLine(_b('X...X...X')), [0, 4, 8]);
    expect(getWinningLine(_b('..O.O.O..')), [2, 4, 6]);
    expect(checkWinner(_b('XOXOXOOXO')), isNull);
    expect(getWinningLine(emptyTttBoard()), isNull);
  });

  test('full board and empty cells', () {
    expect(isBoardFull(_b('XOXOXOOXO')), isTrue);
    expect(isBoardFull(_b('XOXOXOOX.')), isFalse);
    expect(getEmptyCells(_b('X.O......')), [1, 3, 4, 5, 6, 7, 8]);
  });

  test('easy AI plays a legal cell and is reproducible by seed', () {
    final board = _b('XOX.O....');
    final moves = {for (var s = 0; s < 40; s++) getAIMove(board, 'easy', Random(s))};
    expect(moves.every((m) => board[m] == null), isTrue);
    expect(moves.length, greaterThan(1));
    expect(getAIMove(board, 'easy', Random(5)), getAIMove(board, 'easy', Random(5)));
    expect(getAIMove(board, 'unknown', Random(5)), getAIMove(board, 'easy', Random(5)));
  });

  group('medium AI', () {
    test('takes a winning cell first', () {
      // O can win at 2 (cells 0 and 1 are O); X also threatens at 5 (3,4).
      final board = _b('OO.XX....');
      expect(getAIMove(board, 'medium', Random(1)), 2);
    });

    test('blocks the opponent when it cannot win', () {
      final board = _b('XX..O....');
      expect(getAIMove(board, 'medium', Random(1)), 2);
    });

    test('takes the centre when nothing is forced', () {
      expect(getAIMove(_b('X........'), 'medium', Random(1)), 4);
    });
  });

  group('hard AI (minimax)', () {
    test('wins when it can and blocks when it must', () {
      expect(getAIMove(_b('OO.XX....'), 'hard', Random(1)), 2);
      expect(getAIMove(_b('XX..O....'), 'hard', Random(1)), 2);
    });

    test('is unbeatable: every X line of play ends in a draw or an O win', () {
      // Explore every X reply against the hard AI; X never wins.
      var xWins = 0;
      void play(TttBoard board) {
        if (checkWinner(board) != null || isBoardFull(board)) {
          if (checkWinner(board) == 'X') xWins++;
          return;
        }
        for (final cell in getEmptyCells(board)) {
          final next = List<String?>.of(board)..[cell] = 'X';
          if (checkWinner(next) != null || isBoardFull(next)) {
            if (checkWinner(next) == 'X') xWins++;
            continue;
          }
          final ai = getAIMove(next, 'hard', Random(0));
          play(List<String?>.of(next)..[ai] = 'O');
        }
      }

      play(emptyTttBoard());
      expect(xWins, 0);
    });
  });

  test('constants match web', () {
    expect(kTttRoundsPerGame, 5);
    expect(kTttWinPoints, 300);
    expect(kTttDrawPoints, 100);
    expect([tttDifficultyValue('easy'), tttDifficultyValue('medium'), tttDifficultyValue('hard')],
        [1, 2, 3]);
  });
}
