import 'dart:math' as math;
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Sound cues. Same set and synthesis as apps/web `services/audioService.ts`:
/// the repo ships no audio files, so each cue is generated.
enum SoundCue { celebration, fusePop, spark, place, connect }

enum HapticKind { light, medium, success, error }

/// Same key as web `STORAGE_KEYS.SOUND_ENABLED`.
const String kSoundEnabledPrefKey = 'sound_enabled';

const double _cuePeak = 0.22;
const int kCueSampleRate = 22050;

const Map<SoundCue, int> _cueDurationMs = {
  SoundCue.celebration: 900,
  SoundCue.fusePop: 180,
  SoundCue.spark: 90,
  SoundCue.place: 60,
  SoundCue.connect: 110,
};

double Function() _noise(int seed) {
  var state = seed;
  return () {
    state = (state * 1103515245 + 12345) % 2147483648;
    return (state / 2147483648) * 2 - 1;
  };
}

double _clamp(double v) => v.isFinite ? v.clamp(-1.0, 1.0) : 0.0;

/// Mono samples (-1..1) for [cue]. Pure, so it can be tested without audio.
List<double> synthesizeCue(SoundCue cue, {int sampleRate = kCueSampleRate}) {
  final frames = math.max(1, (_cueDurationMs[cue]! / 1000 * sampleRate).round());
  final data = List<double>.filled(frames, 0);
  switch (cue) {
    case SoundCue.celebration:
      const notes = [523.25, 659.25, 783.99];
      final noteFrames = math.max(1, frames ~/ notes.length);
      for (var f = 0; f < frames; f++) {
        final t = f / sampleRate;
        var sample = 0.0;
        for (var n = 0; n < notes.length; n++) {
          final start = n * noteFrames;
          if (f < start) continue;
          final age = (f - start) / sampleRate;
          sample += math.sin(2 * math.pi * notes[n] * t) * math.exp(-age * 4.5);
        }
        data[f] = _clamp(sample * _cuePeak);
      }
    case SoundCue.fusePop:
      final noise = _noise(7919);
      var filtered = 0.0;
      for (var f = 0; f < frames; f++) {
        filtered += (noise() - filtered) * 0.12;
        final age = f / sampleRate;
        data[f] = _clamp(filtered * math.exp(-age * 26) * _cuePeak * 4);
      }
    case SoundCue.spark:
      final noise = _noise(104729);
      for (var f = 0; f < frames; f++) {
        final age = f / sampleRate;
        data[f] = _clamp(noise() * math.exp(-age * 48) * _cuePeak);
      }
    case SoundCue.place:
      for (var f = 0; f < frames; f++) {
        final age = f / sampleRate;
        data[f] = _clamp(
            math.sin(2 * math.pi * 320 * age) * math.exp(-age * 60) * _cuePeak);
      }
    case SoundCue.connect:
      final half = math.max(1, frames ~/ 2);
      for (var f = 0; f < frames; f++) {
        final age = f / sampleRate;
        final freq = f < half ? 440 : 660;
        data[f] = _clamp(
            math.sin(2 * math.pi * freq * age) * math.exp(-age * 12) * _cuePeak);
      }
  }
  return data;
}

/// 16-bit mono PCM WAV for [cue], playable from memory.
Uint8List cueToWav(SoundCue cue, {int sampleRate = kCueSampleRate}) {
  final samples = synthesizeCue(cue, sampleRate: sampleRate);
  final dataLen = samples.length * 2;
  final bytes = ByteData(44 + dataLen);
  void ascii(int offset, String s) {
    for (var i = 0; i < s.length; i++) {
      bytes.setUint8(offset + i, s.codeUnitAt(i));
    }
  }

  ascii(0, 'RIFF');
  bytes.setUint32(4, 36 + dataLen, Endian.little);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  bytes.setUint32(16, 16, Endian.little);
  bytes.setUint16(20, 1, Endian.little); // PCM
  bytes.setUint16(22, 1, Endian.little); // mono
  bytes.setUint32(24, sampleRate, Endian.little);
  bytes.setUint32(28, sampleRate * 2, Endian.little);
  bytes.setUint16(32, 2, Endian.little);
  bytes.setUint16(34, 16, Endian.little);
  ascii(36, 'data');
  bytes.setUint32(40, dataLen, Endian.little);
  for (var i = 0; i < samples.length; i++) {
    bytes.setInt16(44 + i * 2, (samples[i] * 32767).round(), Endian.little);
  }
  return bytes.buffer.asUint8List();
}

/// Sound and haptic feedback for games. Never throws: feedback is decoration.
abstract class GameFeedback {
  Future<void> play(SoundCue cue);
  Future<void> haptic(HapticKind kind);
  Future<bool> isSoundEnabled();
  Future<void> setSoundEnabled(bool enabled);
}

class PlatformGameFeedback implements GameFeedback {
  PlatformGameFeedback();

  final Map<SoundCue, Uint8List> _wavs = {};
  AudioPlayer? _player;

  @override
  Future<bool> isSoundEnabled() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(kSoundEnabledPrefKey) ?? true;
    } catch (_) {
      return true;
    }
  }

  @override
  Future<void> setSoundEnabled(bool enabled) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(kSoundEnabledPrefKey, enabled);
    } catch (_) {}
  }

  @override
  Future<void> play(SoundCue cue) async {
    try {
      if (!await isSoundEnabled()) return;
      final wav = _wavs.putIfAbsent(cue, () => cueToWav(cue));
      final player = _player ??= AudioPlayer();
      await player.stop();
      await player.play(BytesSource(wav, mimeType: 'audio/wav'), volume: 0.5);
    } catch (_) {}
  }

  @override
  Future<void> haptic(HapticKind kind) async {
    try {
      switch (kind) {
        case HapticKind.light:
          await HapticFeedback.selectionClick();
        case HapticKind.medium:
          await HapticFeedback.mediumImpact();
        case HapticKind.success:
          await HapticFeedback.lightImpact();
        case HapticKind.error:
          await HapticFeedback.heavyImpact();
      }
    } catch (_) {}
  }
}

/// Silent feedback for tests and for previews.
class NoopGameFeedback implements GameFeedback {
  const NoopGameFeedback();
  @override
  Future<void> play(SoundCue cue) async {}
  @override
  Future<void> haptic(HapticKind kind) async {}
  @override
  Future<bool> isSoundEnabled() async => false;
  @override
  Future<void> setSoundEnabled(bool enabled) async {}
}

final gameFeedbackProvider = Provider<GameFeedback>((ref) => PlatformGameFeedback());
