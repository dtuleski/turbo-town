// The plugin's replacements for the deprecated listen() arguments (localeId,
// listenFor, pauseFor) are not available in speech_to_text 7.5, so the
// deprecated arguments are still the working API.
// ignore_for_file: deprecated_member_use

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

/// Thin wrappers over the speech plugins so game logic and tests never touch
/// a platform channel. Tests override [speechRecognizerProvider] and
/// [wordSpeakerProvider].

enum SpeechInit { ready, denied, unavailable }

enum SpeechErrorKind { notAllowed, noSpeech, audioCapture, network, aborted, notSupported, unknown }

class SpeechHeard {
  const SpeechHeard({required this.transcript, required this.confidence, required this.isFinal});

  final String transcript;

  /// 0-1, or 0 when the platform gives none.
  final double confidence;
  final bool isFinal;
}

abstract class SpeechRecognizer {
  /// Asks for microphone and speech permission and prepares recognition.
  Future<SpeechInit> initialize();

  /// Starts one recognition. [onDone] fires when the platform stops listening.
  Future<void> listen({
    required String localeId,
    required Duration listenFor,
    required Duration pauseFor,
    required void Function(SpeechHeard) onResult,
    required void Function(SpeechErrorKind) onError,
    required VoidCallback onDone,
  });

  Future<void> stop();
  Future<void> cancel();
}

/// [SpeechRecognizer] on the `speech_to_text` plugin (SFSpeechRecognizer on
/// iOS, SpeechRecognizer on Android).
class SpeechToTextRecognizer implements SpeechRecognizer {
  final SpeechToText _stt = SpeechToText();
  bool _ready = false;
  void Function(SpeechErrorKind)? _onError;
  VoidCallback? _onDone;

  SpeechErrorKind _kind(String message) {
    final m = message.toLowerCase();
    if (m.contains('permission')) return SpeechErrorKind.notAllowed;
    if (m.contains('no_match') || m.contains('speech_timeout')) return SpeechErrorKind.noSpeech;
    if (m.contains('network')) return SpeechErrorKind.network;
    if (m.contains('audio')) return SpeechErrorKind.audioCapture;
    if (m.contains('abort') || m.contains('cancel')) return SpeechErrorKind.aborted;
    return SpeechErrorKind.unknown;
  }

  @override
  Future<SpeechInit> initialize() async {
    if (_ready) return SpeechInit.ready;
    try {
      _ready = await _stt.initialize(
        onError: (e) => _onError?.call(_kind(e.errorMsg)),
        onStatus: (s) {
          if (s == SpeechToText.doneStatus || s == SpeechToText.notListeningStatus) {
            _onDone?.call();
          }
        },
      );
    } catch (_) {
      return SpeechInit.unavailable;
    }
    if (_ready) return SpeechInit.ready;
    return await _stt.hasPermission ? SpeechInit.unavailable : SpeechInit.denied;
  }

  @override
  Future<void> listen({
    required String localeId,
    required Duration listenFor,
    required Duration pauseFor,
    required void Function(SpeechHeard) onResult,
    required void Function(SpeechErrorKind) onError,
    required VoidCallback onDone,
  }) async {
    _onError = onError;
    _onDone = onDone;
    await _stt.listen(
      localeId: localeId,
      listenFor: listenFor,
      pauseFor: pauseFor,
      listenOptions: SpeechListenOptions(
        partialResults: true,
        cancelOnError: true,
        listenMode: ListenMode.confirmation,
      ),
      onResult: (r) => onResult(SpeechHeard(
        transcript: r.recognizedWords,
        confidence: r.hasConfidenceRating ? r.confidence : 0,
        isFinal: r.finalResult,
      )),
    );
  }

  @override
  Future<void> stop() => _stt.stop();

  @override
  Future<void> cancel() => _stt.cancel();
}

/// Says a word aloud (text to speech).
abstract class WordSpeaker {
  Future<void> speak(String text, String localeId);
}

class FlutterTtsSpeaker implements WordSpeaker {
  FlutterTts? _tts;

  @override
  Future<void> speak(String text, String localeId) async {
    try {
      final tts = _tts ??= FlutterTts();
      await tts.setLanguage(localeId);
      await tts.speak(text);
    } catch (_) {
      // No voice installed for this language: stay silent.
    }
  }
}

final speechRecognizerProvider = Provider<SpeechRecognizer>((ref) => SpeechToTextRecognizer());

final wordSpeakerProvider = Provider<WordSpeaker>((ref) => FlutterTtsSpeaker());
