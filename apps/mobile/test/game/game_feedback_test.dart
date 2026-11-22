import 'dart:convert';
import 'dart:typed_data';

import 'package:dashden_mobile/game/framework/game_feedback.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('every cue synthesizes bounded, non-silent samples of the web duration', () {
    const ms = {
      SoundCue.celebration: 900,
      SoundCue.fusePop: 180,
      SoundCue.spark: 90,
      SoundCue.place: 60,
      SoundCue.connect: 110,
    };
    for (final cue in SoundCue.values) {
      final samples = synthesizeCue(cue);
      expect(samples.length, (ms[cue]! / 1000 * kCueSampleRate).round(), reason: '$cue');
      expect(samples.every((s) => s >= -1 && s <= 1), isTrue, reason: '$cue');
      expect(samples.any((s) => s.abs() > 0.01), isTrue, reason: '$cue');
    }
  });

  test('synthesis is deterministic', () {
    expect(synthesizeCue(SoundCue.spark), synthesizeCue(SoundCue.spark));
  });

  test('cueToWav writes a valid 16-bit mono PCM header', () {
    final wav = cueToWav(SoundCue.place);
    final data = ByteData.sublistView(wav);
    String tag(int at) => ascii.decode(wav.sublist(at, at + 4));
    expect(tag(0), 'RIFF');
    expect(tag(8), 'WAVE');
    expect(tag(12), 'fmt ');
    expect(data.getUint16(20, Endian.little), 1); // PCM
    expect(data.getUint16(22, Endian.little), 1); // mono
    expect(data.getUint32(24, Endian.little), kCueSampleRate);
    expect(data.getUint16(34, Endian.little), 16);
    expect(tag(36), 'data');
    final dataLen = data.getUint32(40, Endian.little);
    expect(wav.length, 44 + dataLen);
    expect(data.getUint32(4, Endian.little), 36 + dataLen);
  });

  test('NoopGameFeedback never throws and reports sound off', () async {
    const f = NoopGameFeedback();
    await f.play(SoundCue.celebration);
    await f.haptic(HapticKind.success);
    expect(await f.isSoundEnabled(), isFalse);
  });
}
