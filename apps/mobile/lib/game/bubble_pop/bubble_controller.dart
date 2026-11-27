import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'logic.dart';

typedef BubbleArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs bubbleSessionArgs(BubbleArgs a) => (
      themeId: 'BUBBLE_POP',
      difficulty: bubbleDifficultyValue(a.difficulty),
      questContext: a.quest,
      challengeDay: null,
    );

enum BubblePhase { playing, roundComplete, gameOver }

class BubbleState {
  const BubbleState({
    required this.words,
    required this.bubbles,
    this.round = 0,
    this.nextLetter = 0,
    this.lives = kBubbleMaxLives,
    this.totalCorrect = 0,
    this.totalWrong = 0,
    this.wordsCompleted = 0,
    this.phase = BubblePhase.playing,
    this.shakeId,
  });

  final List<WordChallenge> words;
  final List<Bubble> bubbles;
  final int round;

  /// Index of the letter of the word to pop next.
  final int nextLetter;
  final int lives;
  final int totalCorrect;
  final int totalWrong;
  final int wordsCompleted;
  final BubblePhase phase;
  final int? shakeId;

  WordChallenge get word => words[round];

  BubbleState copyWith({
    List<Bubble>? bubbles,
    int? round,
    int? nextLetter,
    int? lives,
    int? totalCorrect,
    int? totalWrong,
    int? wordsCompleted,
    BubblePhase? phase,
    int? Function()? shakeId,
  }) =>
      BubbleState(
        words: words,
        bubbles: bubbles ?? this.bubbles,
        round: round ?? this.round,
        nextLetter: nextLetter ?? this.nextLetter,
        lives: lives ?? this.lives,
        totalCorrect: totalCorrect ?? this.totalCorrect,
        totalWrong: totalWrong ?? this.totalWrong,
        wordsCompleted: wordsCompleted ?? this.wordsCompleted,
        phase: phase ?? this.phase,
        shakeId: shakeId != null ? shakeId() : this.shakeId,
      );
}

BubbleState _newState(String difficulty, Random rng) {
  final words = pickWords(difficulty, rng);
  return BubbleState(words: words, bubbles: generateBubbles(words.first.word, difficulty, rng));
}

/// Bubble Pop board: pop the letters of the word in order. A wrong pop costs
/// a life; no lives ends the round (the server scores the words completed).
class BubbleController extends StateNotifier<BubbleState> {
  BubbleController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _timers = SessionTimers(_session),
        super(_newState(args.difficulty, random ?? Random()));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final BubbleArgs args;
  final Random _rng;
  final SessionTimers _timers;

  void pop(int bubbleId) {
    if (_session.state.phase != SessionPhase.playing || state.phase != BubblePhase.playing) {
      return;
    }
    final bubble = state.bubbles.where((b) => b.id == bubbleId).firstOrNull;
    if (bubble == null || bubble.popped) return;
    _session.addAttempt();
    final expected = state.word.word[state.nextLetter];
    if (bubble.letter == expected) {
      _feedback.play(SoundCue.spark);
      _feedback.haptic(HapticKind.light);
      final bubbles = [for (final b in state.bubbles) b.id == bubbleId ? b.pop() : b];
      final next = state.nextLetter + 1;
      final done = next >= state.word.word.length;
      final completed = state.wordsCompleted + (done ? 1 : 0);
      state = state.copyWith(
        bubbles: bubbles,
        nextLetter: next,
        totalCorrect: state.totalCorrect + 1,
        wordsCompleted: completed,
        phase: done && state.round + 1 < state.words.length ? BubblePhase.roundComplete : null,
      );
      if (done && state.round + 1 >= state.words.length) {
        _timers.later(const Duration(milliseconds: 500), _finish);
      }
      return;
    }
    _feedback.haptic(HapticKind.error);
    final lives = state.lives - 1;
    state = state.copyWith(
      totalWrong: state.totalWrong + 1,
      lives: lives,
      shakeId: () => bubbleId,
      phase: lives <= 0 ? BubblePhase.gameOver : null,
    );
    _timers.later(const Duration(milliseconds: 500), () {
      if (state.shakeId == bubbleId) state = state.copyWith(shakeId: () => null);
    });
  }

  void nextWord() {
    if (state.phase != BubblePhase.roundComplete) return;
    final next = state.round + 1;
    state = state.copyWith(
      round: next,
      nextLetter: 0,
      bubbles: generateBubbles(state.words[next].word, args.difficulty, _rng),
      phase: BubblePhase.playing,
    );
  }

  /// "See Score" after losing all lives.
  void seeScore() {
    if (state.phase != BubblePhase.gameOver) return;
    _finish();
  }

  void _finish() {
    _timers.cancelAll();
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {'correctAnswers': state.wordsCompleted, 'totalQuestions': kBubbleRounds},
      attempts: state.totalCorrect + state.totalWrong,
    );
  }

  void restart() {
    _timers.cancelAll();
    state = _newState(args.difficulty, _rng);
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final bubbleControllerProvider = StateNotifierProvider.family
    .autoDispose<BubbleController, BubbleState, BubbleArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(bubbleSessionArgs(args)).notifier);
  return BubbleController(session, ref.watch(gameFeedbackProvider), args);
});
