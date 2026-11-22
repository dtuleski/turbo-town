import 'dart:convert';
import 'dart:io';

import 'package:dashden_mobile/game/data/quiz_data.dart';
import 'package:dashden_mobile/game/hangman/hangman_logic.dart';
import 'package:dashden_mobile/game/quiz/quiz_questions.dart';
import 'package:flutter_test/flutter_test.dart';

/// Compares the Dart data with `test/fixtures/quiz_web_counts.json`, which
/// `tools/export_quiz_data.mjs` writes from the web data files.
Map<String, dynamic> _web() =>
    jsonDecode(File('test/fixtures/quiz_web_counts.json').readAsStringSync())
        as Map<String, dynamic>;

Map<String, int> _countBy<T>(Iterable<T> items, String Function(T) key) {
  final out = <String, int>{};
  for (final i in items) {
    out.update(key(i), (v) => v + 1, ifAbsent: () => 1);
  }
  return out;
}

void main() {
  final web = _web();

  test('geo data counts match web', () {
    final geo = web['geo'] as Map<String, dynamic>;
    expect(geoData.countries.length, geo['countries']);
    expect(geoData.states.length, geo['states']);
    expect(geoData.silhouettes.length, geo['silhouettes']);
    // Every country with a shape is a real country.
    final names = geoData.countries.map((c) => c.name).toSet();
    expect(names.containsAll(geoData.silhouettes.keys), isTrue);
  });

  test('geo difficulty modes match web', () {
    final web = (_web()['geo'] as Map)['difficultyModes'] as Map<String, dynamic>;
    expect(kGeoDifficultyModes.keys.toSet(), web.keys.toSet());
    for (final e in web.entries) {
      expect(kGeoDifficultyModes[e.key]!.map((m) => m.name).toList(), e.value);
    }
    expect(GeoMode.values.map((m) => m.name).toList(), (_web()['geo'] as Map)['modes']);
  });

  test('history counts per difficulty match web', () {
    final h = web['history'] as Map<String, dynamic>;
    expect(historyEvents.length, h['events']);
    expect(_countBy(historyEvents, (e) => e.difficulty), h['byDifficulty']);
    expect(historyEvents.where((e) => e.person != null).length, h['withPerson']);
    expect(historyEvents.where((e) => e.imageUrl != null).length, h['withImage']);
    final modes = h['difficultyModes'] as Map<String, dynamic>;
    for (final e in modes.entries) {
      expect(kHistoryDifficultyModes[e.key]!.map(historyModeId).toList(), e.value);
    }
  });

  test('civics counts per category match web', () {
    final c = web['civics'] as Map<String, dynamic>;
    expect(civicsQuestions.length, c['questions']);
    expect(_countBy(civicsQuestions, (q) => q.category), c['byCategory']);
    for (final cat in CivicsCategory.values) {
      final expected =
          cat == CivicsCategory.all ? c['questions'] : (c['byCategory'] as Map)[cat.name];
      expect(civicsPoolSize(cat), expected);
    }
  });

  test('hangman words per language and difficulty match web', () {
    final h = web['hangman'] as Map<String, dynamic>;
    for (final lang in h.keys) {
      for (final d in (h[lang] as Map<String, dynamic>).keys) {
        expect(hangmanWords[lang]![d]!.length, (h[lang] as Map)[d], reason: '$lang/$d');
      }
    }
    expect(kHangmanMaxWrong, web['hangmanMaxWrong']);
    expect(kHangmanRounds, web['hangmanRounds']);
  });

  test('word puzzle lists per language and difficulty match web', () {
    final w = web['wordPuzzle'] as Map<String, dynamic>;
    for (final lang in w.keys) {
      for (final d in (w[lang] as Map<String, dynamic>).keys) {
        expect(wordPuzzleLists[lang]![d]!.length, (w[lang] as Map)[d], reason: '$lang/$d');
      }
    }
  });

  test('civics levels and word puzzle sizes follow the web setup pages', () {
    expect(kCivicsLevelQuestions, {'easy': 6, 'medium': 10, 'hard': 20});
  });
}
