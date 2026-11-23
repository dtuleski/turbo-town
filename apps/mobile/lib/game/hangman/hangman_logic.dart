import 'dart:math';

import '../data/quiz_data.dart';

/// Pure Hangman rules. Port of apps/web `utils/hangmanData.ts` and the scoring
/// in `pages/hangman/HangmanGamePage.tsx`.

/// Wrong guesses that end a round: head, body, two arms, two legs.
const int kHangmanMaxWrong = 6;
const int kHangmanRounds = 5;
const String kHangmanAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/// Word list for [lang] (`en`, `es`, `pt`; anything else is English) and
/// [difficulty] (`easy`, `medium`; anything else is hard).
List<HangmanWord> hangmanWordsFor(
  String difficulty,
  String lang, [
  Map<String, Map<String, List<HangmanWord>>>? data,
]) {
  final all = data ?? hangmanWords;
  final byDifficulty = all[lang] ?? all['en']!;
  if (difficulty == 'easy') return byDifficulty['easy']!;
  if (difficulty == 'medium') return byDifficulty['medium']!;
  return byDifficulty['hard']!;
}

List<HangmanWord> pickHangmanWords(
  String difficulty,
  int count,
  String lang,
  Random rng, [
  Map<String, Map<String, List<HangmanWord>>>? data,
]) =>
    ([...hangmanWordsFor(difficulty, lang, data)]..shuffle(rng)).take(count).toList();

/// Letters of [guessed] that are not in [word].
int hangmanWrongCount(String word, Set<String> guessed) =>
    guessed.where((l) => !word.contains(l)).length;

bool hangmanWordRevealed(String word, Set<String> guessed) =>
    word.split('').every(guessed.contains);

/// Points for a won round: 200 base + 100 per life left.
int hangmanRoundScore(int wrongCount) =>
    max(0, (kHangmanMaxWrong - wrongCount) * 100 + 200);

/// What the server gets as `attempts`: wrong guesses plus 6 per won round
/// (web's approximation of total guesses).
int hangmanAttempts({required int totalWrong, required int roundsWon}) =>
    totalWrong + roundsWon * 6;
