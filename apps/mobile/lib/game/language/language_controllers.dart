import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/feature_providers.dart';
import '../../api/game_providers.dart';
import '../../api/language_api.dart';
import '../../config/feature_flags.dart';
import '../hub_logic.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import 'language_data.dart';
import 'pronunciation_scoring.dart';
import 'speech.dart';

/// Session key for a Language Learning round.
GameSessionArgs languageSessionArgs(LanguageArgs args) => (
      themeId: languageThemeId(args.mode),
      difficulty: languageDifficultyById(args.difficulty).apiValue,
      questContext: null,
      challengeDay: null,
    );

/// The words for a round. Loaded before the round starts so an empty or failed
/// load does not spend a play.
final languageWordsProvider = FutureProvider.autoDispose
    .family<List<LanguageWord>, LanguageArgs>((ref, args) {
  return ref.watch(languageApiProvider).getLanguageWords(
        languageCode: args.lang,
        category: args.category,
        difficulty: args.difficulty,
        count: languageWordCount(args),
      );
});

/// Progress per language for the selection page. A failure shows no progress
/// bars, like web.
final languageProgressProvider =
    FutureProvider.autoDispose<Map<String, LanguageProgress>>((ref) async {
  try {
    final list = await ref.watch(languageApiProvider).getUserLanguageProgress();
    return {for (final p in list) p.languageCode: p};
  } catch (_) {
    return const {};
  }
});

/// Subscription tier from `canStartGame`; FREE when the lookup fails.
final userTierProvider = FutureProvider.autoDispose<String>((ref) async {
  try {
    final can = await ref.watch(gameApiProvider).canStartGame();
    return can.rateLimit?.tier ?? 'FREE';
  } catch (_) {
    return 'FREE';
  }
});

enum PronunciationAvailability { available, unavailable, hidden }

/// Whether the Pronunciation option can be used. This is the Language
/// Learning side of [kPaidGamePresentation]: free users get the same
/// treatment as paid tiles on the hub.
PronunciationAvailability pronunciationAvailability(
  String tier, {
  PaidGamePresentation presentation = kPaidGamePresentation,
}) {
  if (!isFreeTier(tier) || presentation == PaidGamePresentation.openForAll) {
    return PronunciationAvailability.available;
  }
  return presentation == PaidGamePresentation.hidden
      ? PronunciationAvailability.hidden
      : PronunciationAvailability.unavailable;
}

// ── Image Match ──────────────────────────────────────────────────────────────

/// Time the right/wrong highlight stays (web: 2000 ms).
const Duration kLanguageFeedbackDelay = Duration(milliseconds: 2000);

class ImageMatchState {
  const ImageMatchState({
    required this.words,
    required this.options,
    this.index = 0,
    this.selected,
    this.correctCount = 0,
    this.streak = 0,
  });

  final List<LanguageWord> words;

  /// Images of the current word in display order.
  final List<String> options;
  final int index;
  final String? selected;
  final int correctCount;
  final int streak;

  LanguageWord get word => words[index];
  bool get answered => selected != null;
  bool get isCorrect => selected == word.correctImageUrl;

  ImageMatchState copyWith({
    List<String>? options,
    int? index,
    String? selected,
    bool clearSelected = false,
    int? correctCount,
    int? streak,
  }) =>
      ImageMatchState(
        words: words,
        options: options ?? this.options,
        index: index ?? this.index,
        selected: clearSelected ? null : (selected ?? this.selected),
        correctCount: correctCount ?? this.correctCount,
        streak: streak ?? this.streak,
      );
}

List<String> _optionsFor(LanguageWord w, Random rng) =>
    [w.correctImageUrl, ...w.distractorImages]..shuffle(rng);

class ImageMatchController extends StateNotifier<ImageMatchState> {
  ImageMatchController(this._session, this._feedback, List<LanguageWord> words, {Random? random})
      : _rng = random ?? Random(),
        super(ImageMatchState(words: words, options: const [])) {
    state = state.copyWith(options: _optionsFor(words.first, _rng));
  }

  final GameSessionController _session;
  final GameFeedback _feedback;
  final Random _rng;
  Timer? _advance;

  void select(String imageUrl) {
    if (_session.state.phase != SessionPhase.playing || state.answered) return;
    final correct = imageUrl == state.word.correctImageUrl;
    state = state.copyWith(
      selected: imageUrl,
      correctCount: state.correctCount + (correct ? 1 : 0),
      streak: correct ? state.streak + 1 : 0,
    );
    _feedback.haptic(correct ? HapticKind.success : HapticKind.error);
    _schedule(kLanguageFeedbackDelay);
  }

  void _schedule(Duration delay) {
    _advance?.cancel();
    _advance = Timer(delay, () {
      if (!mounted) return;
      final phase = _session.state.phase;
      if (phase == SessionPhase.paused) {
        _schedule(const Duration(milliseconds: 250));
        return;
      }
      if (phase != SessionPhase.playing) return;
      _next();
    });
  }

  void _next() {
    if (state.index + 1 >= state.words.length) {
      _feedback.play(SoundCue.celebration);
      _session.complete(
        extra: {'correctAnswers': state.correctCount, 'totalQuestions': state.words.length},
        attempts: state.words.length,
      );
      return;
    }
    final next = state.index + 1;
    state = state.copyWith(
      index: next,
      options: _optionsFor(state.words[next], _rng),
      clearSelected: true,
    );
  }

  @override
  void dispose() {
    _advance?.cancel();
    super.dispose();
  }
}

typedef ImageMatchKey = ({LanguageArgs args, List<LanguageWord> words});

final imageMatchControllerProvider = StateNotifierProvider.family
    .autoDispose<ImageMatchController, ImageMatchState, ImageMatchKey>((ref, key) {
  final session = ref.watch(gameSessionProvider(languageSessionArgs(key.args)).notifier);
  return ImageMatchController(session, ref.watch(gameFeedbackProvider), key.words);
});

// ── Pronunciation ────────────────────────────────────────────────────────────

const int kPronunciationMaxAttempts = 3;
const Duration kSpeechSilence = Duration(milliseconds: 3000);
const Duration kSpeechMax = Duration(milliseconds: 8000);

enum RecState { idle, listening, processing, done, error }

class WordResult {
  const WordResult({
    required this.word,
    required this.bestScore,
    required this.attemptsUsed,
  });

  final String word;
  final int bestScore;
  final int attemptsUsed;
}

class PronunciationState {
  const PronunciationState({
    required this.words,
    this.index = 0,
    this.attempt = 0,
    this.bestScore = 0,
    this.lastScore,
    this.rec = RecState.idle,
    this.error,
    this.results = const [],
    this.graded = true,
  });

  final List<LanguageWord> words;
  final int index;

  /// 0-based attempt on the current word.
  final int attempt;
  final int bestScore;
  final PronunciationScore? lastScore;
  final RecState rec;
  final SpeechErrorKind? error;
  final List<WordResult> results;

  /// False once a session turned out to be recognition-only.
  final bool graded;

  LanguageWord get word => words[index];
  bool get showScore => lastScore != null;
  bool get lastWord => index + 1 >= words.length;
  int get retriesLeft => kPronunciationMaxAttempts - attempt - 1;
  bool get canRetry =>
      attempt < kPronunciationMaxAttempts - 1 && lastScore != null && lastScore!.score < 50;

  PronunciationState copyWith({
    int? index,
    int? attempt,
    int? bestScore,
    PronunciationScore? lastScore,
    bool clearScore = false,
    RecState? rec,
    SpeechErrorKind? error,
    bool clearError = false,
    List<WordResult>? results,
    bool? graded,
  }) =>
      PronunciationState(
        words: words,
        index: index ?? this.index,
        attempt: attempt ?? this.attempt,
        bestScore: bestScore ?? this.bestScore,
        lastScore: clearScore ? null : (lastScore ?? this.lastScore),
        rec: rec ?? this.rec,
        error: clearError ? null : (error ?? this.error),
        results: results ?? this.results,
        graded: graded ?? this.graded,
      );
}

/// Pronunciation round: the player says each word, up to three tries, the
/// best score of a word counts. The recognition state machine follows web
/// `useSpeechRecognition`.
class PronunciationController extends StateNotifier<PronunciationState> {
  PronunciationController(
    this._session,
    this._feedback,
    this._recognizer,
    this.args,
    List<LanguageWord> words,
  ) : super(PronunciationState(words: words));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final SpeechRecognizer _recognizer;
  final LanguageArgs args;

  SpeechHeard? _heard;
  Timer? _finalizeTimer;
  Timer? _safetyTimer;
  int _capture = 0;

  Strictness get _strictness =>
      args.difficulty == 'advanced' ? Strictness.strict : Strictness.normal;

  bool get _canPlay => _session.state.phase == SessionPhase.playing;

  /// Starts listening, or stops early when already listening.
  Future<void> toggleRecording() async {
    if (!_canPlay || state.showScore) return;
    if (state.rec == RecState.listening) {
      await _recognizer.stop();
      return;
    }
    if (state.rec == RecState.processing) return;
    await _startCapture();
  }

  Future<void> _startCapture() async {
    final capture = ++_capture;
    _heard = null;
    _cancelTimers();
    state = state.copyWith(rec: RecState.listening, clearError: true, clearScore: true);
    final init = await _recognizer.initialize();
    if (!mounted || capture != _capture) return;
    if (init != SpeechInit.ready) {
      _fail(init == SpeechInit.denied ? SpeechErrorKind.notAllowed : SpeechErrorKind.notSupported);
      return;
    }
    try {
      await _recognizer.listen(
        localeId: kSpeechLocales[args.lang] ?? 'en-US',
        listenFor: kSpeechMax,
        pauseFor: kSpeechSilence,
        onResult: (h) => _onResult(capture, h),
        onError: (e) => _onError(capture, e),
        onDone: () => _finalize(capture),
      );
    } catch (_) {
      if (mounted && capture == _capture) _fail(SpeechErrorKind.unknown);
      return;
    }
    // Backstop, like web: never wait longer than the max length plus 2 s.
    _safetyTimer = Timer(kSpeechMax + const Duration(seconds: 2), () {
      if (!mounted || capture != _capture) return;
      _recognizer.cancel().catchError((_) {});
      _finalize(capture);
    });
  }

  void _onResult(int capture, SpeechHeard h) {
    if (!mounted || capture != _capture) return;
    _heard = h;
    if (h.isFinal) {
      state = state.copyWith(rec: RecState.processing);
      _finalizeTimer?.cancel();
      _finalizeTimer = Timer(const Duration(milliseconds: 300), () => _finalize(capture));
    }
  }

  void _onError(int capture, SpeechErrorKind kind) {
    if (!mounted || capture != _capture) return;
    final has = _heard?.transcript.trim().isNotEmpty ?? false;
    if ((kind == SpeechErrorKind.aborted || kind == SpeechErrorKind.noSpeech) && has) {
      _finalize(capture);
      return;
    }
    _cancelTimers();
    _recognizer.cancel().catchError((_) {});
    _fail(kind);
  }

  void _fail(SpeechErrorKind kind) {
    _cancelTimers();
    state = state.copyWith(rec: RecState.error, error: kind);
  }

  void _finalize(int capture) {
    if (!mounted || capture != _capture) return;
    if (state.rec == RecState.done || state.rec == RecState.error || state.rec == RecState.idle) {
      return;
    }
    _cancelTimers();
    final heard = _heard;
    if (heard == null || heard.transcript.trim().isEmpty) {
      _fail(SpeechErrorKind.noSpeech);
      return;
    }
    final score = calculatePronunciationScore(
      state.word.word,
      heard.transcript,
      confidence: heard.confidence,
      strictness: _strictness,
    );
    state = state.copyWith(
      rec: RecState.done,
      lastScore: score,
      graded: score.graded,
      bestScore: max(state.bestScore, score.score),
    );
    _feedback.haptic(score.recognized ? HapticKind.success : HapticKind.error);
  }

  void _cancelTimers() {
    _finalizeTimer?.cancel();
    _safetyTimer?.cancel();
    _finalizeTimer = null;
    _safetyTimer = null;
  }

  /// Another try on the same word (only while the score is under 50).
  void retry() {
    if (!state.canRetry) return;
    _capture++;
    _heard = null;
    state = state.copyWith(
      attempt: state.attempt + 1,
      clearScore: true,
      clearError: true,
      rec: RecState.idle,
    );
  }

  /// Keeps the best score of this word and moves on; after the last word
  /// submits the round.
  void next() {
    if (!_canPlay || !state.showScore) return;
    final result = WordResult(
      word: state.word.word,
      bestScore: state.bestScore,
      attemptsUsed: state.attempt + 1,
    );
    final results = [...state.results, result];
    if (state.lastWord) {
      state = state.copyWith(results: results);
      _finish(results);
      return;
    }
    _capture++;
    _heard = null;
    state = state.copyWith(
      results: results,
      index: state.index + 1,
      attempt: 0,
      bestScore: 0,
      clearScore: true,
      clearError: true,
      rec: RecState.idle,
    );
  }

  void _finish(List<WordResult> results) {
    final avg = results.fold<int>(0, (s, r) => s + r.bestScore) / results.length;
    _feedback.play(SoundCue.celebration);
    // Average accuracy goes to the server as correctAnswers out of 100 so the
    // continuous score is kept (same as web).
    _session.complete(
      extra: {'correctAnswers': avg.round(), 'totalQuestions': 100},
      attempts: results.fold<int>(0, (s, r) => s + r.attemptsUsed),
    );
  }

  @override
  void dispose() {
    _capture++;
    _cancelTimers();
    _recognizer.cancel().catchError((_) {});
    super.dispose();
  }
}

final pronunciationControllerProvider = StateNotifierProvider.family
    .autoDispose<PronunciationController, PronunciationState, ImageMatchKey>((ref, key) {
  final session = ref.watch(gameSessionProvider(languageSessionArgs(key.args)).notifier);
  return PronunciationController(
    session,
    ref.watch(gameFeedbackProvider),
    ref.watch(speechRecognizerProvider),
    key.args,
    key.words,
  );
});
