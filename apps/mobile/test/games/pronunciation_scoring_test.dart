import 'dart:convert';
import 'dart:io';

import 'package:dashden_mobile/game/language/pronunciation_scoring.dart';
import 'package:flutter_test/flutter_test.dart';

/// `test/fixtures/pronunciation_golden.json` holds what the web scorer
/// (apps/web `utils/pronunciationScoring.ts`) returns for 1800 inputs. The
/// Dart port must produce the same.
Map<String, dynamic> _golden() =>
    jsonDecode(File('test/fixtures/pronunciation_golden.json').readAsStringSync())
        as Map<String, dynamic>;

PronunciationFeedback _fb(String id) => switch (id) {
      'perfect' => PronunciationFeedback.perfect,
      'great' => PronunciationFeedback.great,
      'good-effort' => PronunciationFeedback.goodEffort,
      _ => PronunciationFeedback.tryAgain,
    };

void main() {
  final golden = _golden();

  test('Double Metaphone codes equal the web output', () {
    for (final m in golden['metaphone'] as List) {
      final word = m['word'] as String;
      final code = m['code'] as List;
      final (primary, alternate) = doubleMetaphone(word);
      expect([primary, alternate], code, reason: word);
    }
  });

  test('script detection equals the web output', () {
    for (final m in golden['latin'] as List) {
      expect(isLatinScript(m['word'] as String), m['latin'], reason: m['word'] as String);
    }
  });

  test('scores, grading and feedback equal the web output for every case', () {
    final cases = golden['scoreCases'] as List;
    expect(cases.length, 1800);
    var checked = 0;
    for (final c in cases) {
      final r = calculatePronunciationScore(
        c['expected'] as String,
        c['spoken'] as String,
        confidence: (c['confidence'] as num?)?.toDouble(),
        strictness: c['strictness'] == 'strict' ? Strictness.strict : Strictness.normal,
      );
      final why = '${c['expected']} vs "${c['spoken']}" conf=${c['confidence']} ${c['strictness']}';
      expect(r.score, c['score'], reason: why);
      expect(r.graded, c['graded'], reason: why);
      expect(r.recognized, c['recognized'], reason: why);
      expect(r.feedback, _fb(c['feedback'] as String), reason: why);
      expect(r.phoneticScore, closeTo((c['phonetic'] as num).toDouble(), 1e-9), reason: why);
      expect(r.stringScore, closeTo((c['string'] as num).toDouble(), 1e-9), reason: why);
      checked++;
    }
    expect(checked, 1800);
  });

  group('behaviour', () {
    test('identical text without confidence is recognition-only 100', () {
      final r = calculatePronunciationScore('gato', 'gato');
      expect(r.score, 100);
      expect(r.graded, isFalse);
      expect(r.recognized, isTrue);
    });

    test('confident match is graded and below 100 unless confidence is perfect', () {
      final r = calculatePronunciationScore('cat', 'cat', confidence: 0.8);
      expect(r.graded, isTrue);
      expect(r.score, lessThan(100));
      expect(calculatePronunciationScore('cat', 'cat', confidence: 1).score, 100);
    });

    test('strict grading never scores above normal', () {
      for (final conf in [0.4, 0.7, 0.95]) {
        final normal = calculatePronunciationScore('water', 'water', confidence: conf).score;
        final strict = calculatePronunciationScore('water', 'water',
            confidence: conf, strictness: Strictness.strict).score;
        expect(strict, lessThanOrEqualTo(normal));
      }
    });

    test('nothing heard scores zero and is not recognized', () {
      final r = calculatePronunciationScore('cat', '   ');
      expect(r.score, 0);
      expect(r.recognized, isFalse);
      expect(r.feedback, PronunciationFeedback.tryAgain);
    });

    test('feedback bands', () {
      expect(getFeedback(100), PronunciationFeedback.perfect);
      expect(getFeedback(91), PronunciationFeedback.perfect);
      expect(getFeedback(90), PronunciationFeedback.great);
      expect(getFeedback(71), PronunciationFeedback.great);
      expect(getFeedback(70), PronunciationFeedback.goodEffort);
      expect(getFeedback(41), PronunciationFeedback.goodEffort);
      expect(getFeedback(40), PronunciationFeedback.tryAgain);
    });

    test('levenshtein and similarity basics', () {
      expect(levenshteinDistance('kitten', 'sitting'), 3);
      expect(levenshteinDistance('', 'abc'), 3);
      expect(stringSimilarity('Cat', 'cat'), closeTo(1, 1e-12));
      expect(stringSimilarity('', 'cat'), 0);
    });

    test('speech locales cover the 7 languages', () {
      expect(kSpeechLocales.keys.toSet(), {'en', 'es', 'fr', 'it', 'de', 'pt', 'el'});
      expect(kLowAccuracyLanguages, {'el', 'pt'});
    });
  });
}
