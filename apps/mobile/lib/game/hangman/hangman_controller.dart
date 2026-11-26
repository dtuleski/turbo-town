import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/challenge_models.dart';
import '../../api/quest_models.dart';
import '../../challenge/challenge_content.dart';
import '../data/quiz_data.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../quiz/quiz_engine.dart';
import 'hangman_logic.dart';

/// `lang` is the app language code; it picks the word list.
typedef HangmanArgs = ({String difficulty, String lang, QuestContext? quest});

/// A Daily Challenge round: [args] carries the challenge difficulty and the
/// language that picks the word list.
typedef HangmanChallengeArgs = ({HangmanArgs args, GivenChallenge<HangmanContent> challenge});

GameSessionArgs hangmanSessionArgs(HangmanArgs args, {String? challengeDay}) => (
      themeId: 'HANGMAN',
      difficulty: quizDifficultyNumber(args.difficulty),
      questContext: args.quest,
      challengeDay: challengeDay,
    );

enum RoundPhase { playing, won, lost }

class HangmanState {
  const HangmanState({
    required this.words,
    this.round = 0,
    this.guessed = const {},
    this.phase = RoundPhase.playing,
    this.totalScore = 0,
    this.totalWrong = 0,
    this.roundsWon = 0,
  });

  final List<HangmanWord> words;
  final int round;
  final Set<String> guessed;
  final RoundPhase phase;
  final int totalScore;
  final int totalWrong;
  final int roundsWon;

  HangmanWord get word => words[round];
  int get wrongCount => hangmanWrongCount(word.word, guessed);
  bool get lastRound => round + 1 >= words.length;

  HangmanState copyWith({
    int? round,
    Set<String>? guessed,
    RoundPhase? phase,
    int? totalScore,
    int? totalWrong,
    int? roundsWon,
  }) =>
      HangmanState(
        words: words,
        round: round ?? this.round,
        guessed: guessed ?? this.guessed,
        phase: phase ?? this.phase,
        totalScore: totalScore ?? this.totalScore,
        totalWrong: totalWrong ?? this.totalWrong,
        roundsWon: roundsWon ?? this.roundsWon,
      );
}

/// Hangman board: five rounds, six wrong guesses per round. The game is
/// always played to the end; the server scores from rounds won. [given] (a
/// Daily Challenge) replaces the random words, in the list for `args.lang`.
class HangmanController extends StateNotifier<HangmanState> {
  HangmanController(this._session, this._feedback, this.args, {Random? random, HangmanContent? given})
      : _rng = random ?? Random(),
        _given = given,
        super(HangmanState(
          words: given != null
              ? hangmanWordsFromChallenge(given, args.lang)
              : pickHangmanWords(args.difficulty, kHangmanRounds, args.lang, random ?? Random()),
        ));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final HangmanArgs args;
  final Random _rng;
  final HangmanContent? _given;

  void guess(String letter) {
    final l = letter.toUpperCase();
    if (_session.state.phase != SessionPhase.playing ||
        state.phase != RoundPhase.playing ||
        !kHangmanAlphabet.contains(l) ||
        state.guessed.contains(l)) {
      return;
    }
    final guessed = {...state.guessed, l};
    final word = state.word.word;
    if (!word.contains(l)) {
      final wrong = hangmanWrongCount(word, guessed);
      state = state.copyWith(
        guessed: guessed,
        totalWrong: state.totalWrong + 1,
        phase: wrong >= kHangmanMaxWrong ? RoundPhase.lost : RoundPhase.playing,
      );
      _feedback.haptic(HapticKind.error);
      return;
    }
    if (hangmanWordRevealed(word, guessed)) {
      state = state.copyWith(
        guessed: guessed,
        phase: RoundPhase.won,
        totalScore: state.totalScore + hangmanRoundScore(hangmanWrongCount(word, guessed)),
        roundsWon: state.roundsWon + 1,
      );
      _feedback.haptic(HapticKind.success);
      return;
    }
    state = state.copyWith(guessed: guessed);
    _feedback.haptic(HapticKind.light);
  }

  /// Moves on after a won or lost round; after the last round, submits.
  void nextRound() {
    if (_session.state.phase != SessionPhase.playing || state.phase == RoundPhase.playing) return;
    if (state.lastRound) {
      _feedback.play(SoundCue.celebration);
      _session.complete(
        extra: {'correctAnswers': state.roundsWon, 'totalQuestions': state.words.length},
        attempts: hangmanAttempts(totalWrong: state.totalWrong, roundsWon: state.roundsWon),
      );
      return;
    }
    state = state.copyWith(round: state.round + 1, guessed: const {}, phase: RoundPhase.playing);
  }

  /// New words for another game.
  void restart() {
    final given = _given;
    state = HangmanState(
      words: given != null
          ? hangmanWordsFromChallenge(given, args.lang)
          : pickHangmanWords(args.difficulty, kHangmanRounds, args.lang, _rng),
    );
  }
}

final hangmanControllerProvider = StateNotifierProvider.family
    .autoDispose<HangmanController, HangmanState, HangmanArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(hangmanSessionArgs(args)).notifier);
  return HangmanController(session, ref.watch(gameFeedbackProvider), args);
});

/// The board of a Daily Challenge round: the served words.
final hangmanChallengeControllerProvider = StateNotifierProvider.family
    .autoDispose<HangmanController, HangmanState, HangmanChallengeArgs>((ref, key) {
  final session = ref.watch(
    gameSessionProvider(hangmanSessionArgs(key.args, challengeDay: key.challenge.day)).notifier,
  );
  return HangmanController(session, ref.watch(gameFeedbackProvider), key.args,
      given: key.challenge.content);
});
