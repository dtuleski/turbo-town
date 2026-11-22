import 'dart:math';

import 'package:dashden_mobile/game/data/quiz_data.dart';
import 'package:dashden_mobile/game/hangman/hangman_logic.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final rng = Random(5);

  test('constants match web', () {
    expect(kHangmanMaxWrong, 6);
    expect(kHangmanRounds, 5);
    expect(kHangmanAlphabet.length, 26);
  });

  test('word list follows language and difficulty, English by default', () {
    expect(hangmanWordsFor('easy', 'es'), same(hangmanWords['es']!['easy']));
    expect(hangmanWordsFor('medium', 'pt'), same(hangmanWords['pt']!['medium']));
    expect(hangmanWordsFor('hard', 'en'), same(hangmanWords['en']!['hard']));
    expect(hangmanWordsFor('anything', 'fr'), same(hangmanWords['en']!['hard']));
  });

  test('every word is upper-case A-Z so the on-screen keyboard can spell it', () {
    for (final lang in hangmanWords.values) {
      for (final list in lang.values) {
        for (final w in list) {
          expect(w.word, matches(RegExp(r'^[A-Z]+$')), reason: w.word);
        }
      }
    }
  });

  test('easy words are short and hard words long, as the setup page says', () {
    for (final w in hangmanWords['en']!['easy']!) {
      expect(w.word.length, lessThanOrEqualTo(5));
    }
    for (final w in hangmanWords['en']!['hard']!) {
      expect(w.word.length, greaterThan(8));
    }
  });

  test('pickHangmanWords gives 5 distinct words', () {
    for (final d in ['easy', 'medium', 'hard']) {
      final picked = pickHangmanWords(d, kHangmanRounds, 'en', rng);
      expect(picked.length, 5);
      expect(picked.map((w) => w.word).toSet().length, 5);
    }
  });

  test('wrong guesses are counted against the word', () {
    expect(hangmanWrongCount('CAT', {'C', 'Z', 'Q'}), 2);
    expect(hangmanWrongCount('CAT', {}), 0);
    expect(hangmanWordRevealed('CAT', {'C', 'A', 'T'}), isTrue);
    expect(hangmanWordRevealed('CAT', {'C', 'A'}), isFalse);
  });

  test('round score: 200 plus 100 per life left', () {
    expect(hangmanRoundScore(0), 800);
    expect(hangmanRoundScore(3), 500);
    expect(hangmanRoundScore(5), 300);
    expect(hangmanRoundScore(6), 200);
  });

  test('attempts sent to the server: wrong guesses plus 6 per won round', () {
    expect(hangmanAttempts(totalWrong: 4, roundsWon: 3), 22);
    expect(hangmanAttempts(totalWrong: 0, roundsWon: 0), 0);
  });
}
