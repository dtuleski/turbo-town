import 'package:dashden_mobile/api/feature_providers.dart';
import 'package:dashden_mobile/api/language_api.dart';
import 'package:dashden_mobile/game/language/speech.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

LanguageWord word(String id, String text, {int distractors = 3}) => LanguageWord(
      id: id,
      word: text,
      pronunciation: '/$text/',
      correctImageUrl: 'https://img.test/$id-correct.png',
      distractorImages: [
        for (var i = 0; i < distractors; i++) 'https://img.test/$id-wrong$i.png',
      ],
      category: 'animals',
    );

/// In-memory [LanguageApi].
class FakeLanguageApi implements LanguageApi {
  FakeLanguageApi({this.words = const [], this.progress = const [], this.failWords = false});

  List<LanguageWord> words;
  List<LanguageProgress> progress;
  bool failWords;
  final List<String> calls = [];

  @override
  Future<List<LanguageWord>> getLanguageWords({
    required String languageCode,
    required String category,
    required String difficulty,
    required int count,
  }) async {
    calls.add('getLanguageWords:$languageCode:$category:$difficulty:$count');
    if (failWords) throw Exception('offline');
    return words.take(count).toList();
  }

  @override
  Future<List<LanguageProgress>> getUserLanguageProgress() async {
    calls.add('getUserLanguageProgress');
    return progress;
  }

  @override
  Future<LanguageGameResult> saveLanguageGameResult(Map<String, dynamic> input) =>
      throw UnimplementedError();
}

/// Speech recognizer driven by the test. Call [say] while listening.
class FakeSpeechRecognizer implements SpeechRecognizer {
  FakeSpeechRecognizer({this.init = SpeechInit.ready});

  SpeechInit init;
  int listens = 0;
  int cancels = 0;
  String? localeId;
  void Function(SpeechHeard)? _onResult;
  void Function(SpeechErrorKind)? _onError;
  VoidCallback? _onDone;

  @override
  Future<SpeechInit> initialize() async => init;

  @override
  Future<void> listen({
    required String localeId,
    required Duration listenFor,
    required Duration pauseFor,
    required void Function(SpeechHeard) onResult,
    required void Function(SpeechErrorKind) onError,
    required VoidCallback onDone,
  }) async {
    listens++;
    this.localeId = localeId;
    _onResult = onResult;
    _onError = onError;
    _onDone = onDone;
  }

  /// A final result, then the platform's "done".
  void say(String text, {double confidence = 0, bool isFinal = true}) {
    _onResult?.call(SpeechHeard(transcript: text, confidence: confidence, isFinal: isFinal));
    if (isFinal) _onDone?.call();
  }

  void fail(SpeechErrorKind kind) => _onError?.call(kind);

  /// The platform stops without any result.
  void endSilently() => _onDone?.call();

  @override
  Future<void> stop() async => _onDone?.call();

  @override
  Future<void> cancel() async => cancels++;
}

class FakeWordSpeaker implements WordSpeaker {
  final List<String> spoken = [];

  @override
  Future<void> speak(String text, String localeId) async => spoken.add('$text@$localeId');
}

List<Override> languageOverrides({
  FakeLanguageApi? api,
  FakeSpeechRecognizer? recognizer,
  FakeWordSpeaker? speaker,
}) =>
    [
      languageApiProvider.overrideWithValue((api ?? FakeLanguageApi()) as LanguageApi),
      speechRecognizerProvider.overrideWithValue(recognizer ?? FakeSpeechRecognizer()),
      wordSpeakerProvider.overrideWithValue(speaker ?? FakeWordSpeaker()),
    ];
