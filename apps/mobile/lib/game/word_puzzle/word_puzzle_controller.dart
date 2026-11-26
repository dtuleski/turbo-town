import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/challenge_models.dart';
import '../../api/quest_models.dart';
import '../../challenge/challenge_content.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import 'word_puzzle_logic.dart';

/// `locale` is the app language code; it picks the word list.
typedef WordPuzzleArgs = ({String difficulty, String locale, QuestContext? quest});

/// A Daily Challenge round: [args] carries the challenge difficulty and the
/// locale that picks the language variant.
typedef WordPuzzleChallengeArgs = ({WordPuzzleArgs args, GivenChallenge<WordPuzzleContent> challenge});

GameSessionArgs wordPuzzleSessionArgs(WordPuzzleArgs args, {String? challengeDay}) => (
      themeId: 'WORD_PUZZLE',
      difficulty: wordPuzzleDifficultyById(args.difficulty).apiValue,
      questContext: args.quest,
      challengeDay: challengeDay,
    );

enum WordPuzzleToast { none, found, alreadyFound }

class WordPuzzleState {
  const WordPuzzleState({
    required this.puzzle,
    this.found = const {},
    this.foundCells = const {},
    this.selection = const [],
    required this.timeRemaining,
    this.toast = WordPuzzleToast.none,
    this.toastWord,
  });

  final WordPuzzle puzzle;
  final Set<String> found;

  /// Cells of every word found so far (drawn highlighted).
  final Set<Cell> foundCells;
  final List<Cell> selection;
  final int timeRemaining;
  final WordPuzzleToast toast;
  final String? toastWord;

  WordPuzzleState copyWith({
    Set<String>? found,
    Set<Cell>? foundCells,
    List<Cell>? selection,
    int? timeRemaining,
    WordPuzzleToast? toast,
    String? toastWord,
  }) =>
      WordPuzzleState(
        puzzle: puzzle,
        found: found ?? this.found,
        foundCells: foundCells ?? this.foundCells,
        selection: selection ?? this.selection,
        timeRemaining: timeRemaining ?? this.timeRemaining,
        toast: toast ?? this.toast,
        toastWord: toastWord ?? this.toastWord,
      );
}

/// Word Puzzle board: drag across letters, find every word before the clock
/// runs out. [given] (a Daily Challenge) is played instead of a generated
/// grid, in the variant for `args.locale`.
class WordPuzzleController extends StateNotifier<WordPuzzleState> {
  WordPuzzleController(this._session, this._feedback, this.args,
      {Random? random, WordPuzzleContent? given})
      : _rng = random ?? Random(),
        _given = given,
        _config = wordPuzzleDifficultyById(args.difficulty),
        super(WordPuzzleState(
          puzzle: given != null
              ? wordPuzzleFromChallenge(given, args.locale)
              : generateWordPuzzle(args.difficulty, args.locale, random ?? Random()),
          timeRemaining: wordPuzzleDifficultyById(args.difficulty).timeLimit,
        )) {
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  final GameSessionController _session;
  final GameFeedback _feedback;
  final WordPuzzleArgs args;
  final Random _rng;
  final WordPuzzleDifficulty _config;
  final WordPuzzleContent? _given;
  Timer? _ticker;
  Timer? _toastTimer;

  void _tick() {
    if (!mounted || _session.state.phase != SessionPhase.playing) return;
    final left = state.timeRemaining - 1;
    state = state.copyWith(timeRemaining: max(0, left));
    if (left <= 0) _finish();
  }

  bool get _canPlay => _session.state.phase == SessionPhase.playing;

  void beginSelection(Cell cell) {
    if (!_canPlay) return;
    state = state.copyWith(selection: [cell]);
  }

  /// Extends the selection to [cell]. A cell that shares a row, column or
  /// diagonal with the first one selects the whole line, so a quick swipe that
  /// skips cells still works. Anything else is ignored.
  void extendSelection(Cell cell) {
    if (!_canPlay || state.selection.isEmpty) return;
    final line = lineBetween(state.selection.first, cell);
    if (line == null || !isValidSelection(line)) return;
    state = state.copyWith(selection: line);
  }

  void endSelection() {
    final selection = state.selection;
    if (selection.isEmpty) return;
    final word = _canPlay ? checkWord(state.puzzle.grid, selection, state.puzzle.words) : null;
    if (word != null && !state.found.contains(word)) {
      final found = {...state.found, word};
      state = state.copyWith(
        found: found,
        foundCells: {...state.foundCells, ...selection},
        selection: const [],
        toast: WordPuzzleToast.found,
        toastWord: word,
      );
      _feedback.haptic(HapticKind.success);
      _clearToast(const Duration(milliseconds: 1500));
      if (found.length == state.puzzle.words.length) _finish();
      return;
    }
    if (word != null) {
      state = state.copyWith(
        selection: const [],
        toast: WordPuzzleToast.alreadyFound,
        toastWord: word,
      );
      _clearToast(const Duration(milliseconds: 1000));
      return;
    }
    state = state.copyWith(selection: const []);
  }

  void _clearToast(Duration after) {
    _toastTimer?.cancel();
    _toastTimer = Timer(after, () {
      if (mounted) state = state.copyWith(toast: WordPuzzleToast.none);
    });
  }

  void _finish() {
    _ticker?.cancel();
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {'wordsFound': state.found.length, 'totalWords': state.puzzle.words.length},
      attempts: state.found.length,
    );
  }

  /// A new grid and a full clock for another round.
  void restart() {
    _ticker?.cancel();
    _toastTimer?.cancel();
    final given = _given;
    state = WordPuzzleState(
      puzzle: given != null
          ? wordPuzzleFromChallenge(given, args.locale)
          : generateWordPuzzle(args.difficulty, args.locale, _rng),
      timeRemaining: _config.timeLimit,
    );
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _toastTimer?.cancel();
    super.dispose();
  }
}

final wordPuzzleControllerProvider = StateNotifierProvider.family
    .autoDispose<WordPuzzleController, WordPuzzleState, WordPuzzleArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(wordPuzzleSessionArgs(args)).notifier);
  return WordPuzzleController(session, ref.watch(gameFeedbackProvider), args);
});

/// The board of a Daily Challenge round: the served grid.
final wordPuzzleChallengeControllerProvider = StateNotifierProvider.family
    .autoDispose<WordPuzzleController, WordPuzzleState, WordPuzzleChallengeArgs>((ref, key) {
  final session = ref.watch(
    gameSessionProvider(wordPuzzleSessionArgs(key.args, challengeDay: key.challenge.day)).notifier,
  );
  return WordPuzzleController(session, ref.watch(gameFeedbackProvider), key.args,
      given: key.challenge.content);
});
