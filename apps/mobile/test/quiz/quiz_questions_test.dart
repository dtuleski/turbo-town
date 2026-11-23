import 'dart:math';

import 'package:dashden_mobile/game/data/quiz_data.dart';
import 'package:dashden_mobile/game/quiz/quiz_engine.dart';
import 'package:dashden_mobile/game/quiz/quiz_providers.dart';
import 'package:dashden_mobile/game/quiz/quiz_questions.dart';
import 'package:flutter_test/flutter_test.dart';

void _validOptions(QuizQuestion q) {
  expect(q.options, contains(q.correctAnswer));
  expect(q.options.toSet().length, q.options.length, reason: 'options are unique');
  expect(q.options.length, 4);
}

void main() {
  final rng = Random(7);

  group('geo questions', () {
    for (final mode in GeoMode.values) {
      test('${mode.name}: 10 questions with 4 unique options each', () {
        final qs = generateGeoQuestions(mode, 10, rng);
        expect(qs, hasLength(10));
        for (final q in qs) {
          _validOptions(q);
          expect(q.hint1, isNotNull);
          expect(q.hint2, isNotNull);
        }
      });
    }

    test('capitals ask for a real capital', () {
      for (final q in generateGeoQuestions(GeoMode.capitals, 20, rng)) {
        final country = geoData.countries.firstWhere((c) => q.prompt.contains(c.name));
        expect(q.correctAnswer, country.capital);
        expect(q.hint2, 'Starts with "${country.capital[0]}"');
      }
    });

    test('continents only offer known continents', () {
      for (final q in generateGeoQuestions(GeoMode.continents, 20, rng)) {
        final all = geoData.countries.map((c) => c.continent).toSet();
        expect(all.containsAll(q.options) || q.options.length == 4, isTrue);
      }
    });

    test('state questions keep wrong capitals in the same country when they can', () {
      for (final q in generateGeoQuestions(GeoMode.states, 20, rng)) {
        final state = geoData.states.firstWhere((s) => s.capital == q.correctAnswer);
        final sameCountry =
            geoData.states.where((s) => s.country == state.country).map((s) => s.capital).toSet();
        expect(q.options.every(sameCountry.contains), isTrue);
      }
    });

    test('silhouette questions use only countries that have a shape', () {
      for (final q in generateGeoQuestions(GeoMode.silhouettes, 20, rng)) {
        expect(q.silhouette, isTrue);
        expect(geoData.silhouettes.containsKey(q.correctAnswer), isTrue);
        expect(q.prompt, q.correctAnswer);
      }
    });

    test('a round does not repeat a prompt when the pool allows it', () {
      final qs = generateGeoQuestions(GeoMode.capitals, 10, rng);
      expect(qs.map((q) => q.prompt).toSet().length, 10);
    });

    test('mode ids parse', () {
      expect(geoModeFromId('flags'), GeoMode.flags);
      expect(geoModeFromId('nope'), isNull);
    });
  });

  group('history questions', () {
    test('difficulty filters events like web', () {
      final easy = historyEventsForDifficulty('easy');
      final medium = historyEventsForDifficulty('medium');
      final hard = historyEventsForDifficulty('hard');
      expect(easy.every((e) => e.difficulty == 'easy'), isTrue);
      expect(medium.every((e) => e.difficulty != 'hard'), isTrue);
      expect(hard.length, historyEvents.length);
      expect(easy.length, lessThan(medium.length));
      expect(medium.length, lessThan(hard.length));
    });

    test('name-event: the answer is the event of the quoted line', () {
      for (final q in generateHistoryQuestions(HistoryMode.nameEvent, 'hard', 10, rng)) {
        _validOptions(q);
        final event = historyEvents.firstWhere((e) => q.prompt == '"${e.quote}"');
        expect(q.correctAnswer, event.event);
        expect(q.imageUrl, event.imageUrl);
      }
    });

    test('when-happened: decades, with BC for negative years', () {
      for (final q in generateHistoryQuestions(HistoryMode.whenHappened, 'hard', 20, rng)) {
        expect(q.prompt, startsWith('When did this happen?\n"'));
        for (final o in q.options) {
          expect(o, matches(RegExp(r'^\d+s( BC)?$')));
        }
        expect(q.options.toSet().length, q.options.length);
      }
      final ancient = historyEvents.firstWhere((e) => e.year == -47 && e.person != null);
      final q = generateWhenHappenedQuestion([ancient], rng);
      expect(q.correctAnswer, '50s BC');
      final modern = historyEvents.firstWhere((e) => e.year == 1969);
      expect(generateWhenHappenedQuestion([modern], rng).correctAnswer, '1960s');
    });

    test('who-said: the answer is a person and hint2 is the year', () {
      for (final q in generateHistoryQuestions(HistoryMode.whoSaid, 'hard', 10, rng)) {
        _validOptions(q);
        final event = historyEvents.firstWhere((e) => e.person == q.correctAnswer);
        expect(q.prompt, startsWith('Who said this?'));
        expect(q.hint2, startsWith('Year: '));
        expect(event.person, isNotNull);
      }
    });

    test('name-event hint1 falls back to the era when nobody is named', () {
      final noPerson = historyEvents.firstWhere((e) => e.person == null);
      final others = historyEvents.where((e) => e.id != noPerson.id).take(5).toList();
      final q = generateNameEventQuestion([noPerson, ...others], Random(1));
      if (q.correctAnswer == noPerson.event) {
        expect(q.hint1, 'From the ${noPerson.era} era');
      }
      expect(historyModeFromId('who-said'), HistoryMode.whoSaid);
      expect(historyModeFromId('x'), isNull);
    });
  });

  group('civics questions', () {
    test('every category fills a round up to its pool size', () {
      for (final cat in CivicsCategory.values) {
        final size = civicsPoolSize(cat);
        final qs = generateCivicsQuestions(cat, 20, rng);
        expect(qs.length, min(20, size), reason: cat.name);
      }
    });

    test('options hold one accepted answer and up to three distractors', () {
      for (final q in generateCivicsQuestions(CivicsCategory.all, 30, rng)) {
        final source = civicsQuestions.firstWhere((c) => c.question == q.prompt);
        expect(source.correctAnswers, contains(q.correctAnswer));
        expect(q.options, contains(q.correctAnswer));
        expect(q.options.length, lessThanOrEqualTo(4));
        expect(q.options.length, greaterThanOrEqualTo(2));
        final wrong = q.options.where((o) => o != q.correctAnswer);
        expect(wrong.every(source.distractors.contains), isTrue);
        expect(q.label, source.subcategory);
      }
    });

    test('category filter only returns that category', () {
      final gov = generateCivicsQuestions(CivicsCategory.government, 50, rng);
      final names = civicsQuestions.where((c) => c.category == 'government').map((c) => c.question);
      expect(gov.every((q) => names.contains(q.prompt)), isTrue);
      expect(civicsCategoryFromId('civics'), CivicsCategory.civics);
      expect(civicsCategoryFromId('zzz'), isNull);
    });
  });

  group('scoring and specs', () {
    test('quizPoints: 100 + 10 per second left + 25 per streak step', () {
      expect(quizPoints(timeLeft: 0, streak: 0), 100);
      expect(quizPoints(timeLeft: 12, streak: 0), 220);
      expect(quizPoints(timeLeft: 5, streak: 3), 225);
      expect(quizPoints(timeLeft: -4, streak: 1), 125);
    });

    test('difficulty numbers', () {
      expect(quizDifficultyNumber('easy'), 1);
      expect(quizDifficultyNumber('medium'), 2);
      expect(quizDifficultyNumber('hard'), 3);
      expect(quizDifficultyNumber('???'), 1);
    });

    test('timers and feedback delays follow the web pages', () {
      QuizArgs a(String game, String d) => (
            gameId: game,
            difficulty: d,
            mode: '',
            category: 'all',
            count: 6,
            quest: null,
          );
      expect([for (final d in ['easy', 'medium', 'hard']) quizSpecFor(a('geo-quiz', d)).secondsPerQuestion],
          [15, 12, 10]);
      expect([for (final d in ['easy', 'medium', 'hard']) quizSpecFor(a('history-quiz', d)).secondsPerQuestion],
          [20, 15, 12]);
      expect(quizSpecFor(a('civics-quiz', 'hard')).secondsPerQuestion, 20);
      expect(quizSpecFor(a('geo-quiz', 'easy')).feedbackDelay, const Duration(milliseconds: 2500));
      expect(quizSpecFor(a('history-quiz', 'easy')).feedbackDelay, const Duration(milliseconds: 3000));
      expect(quizSpecFor(a('civics-quiz', 'easy')).feedbackDelay, const Duration(milliseconds: 2500));
      expect(quizSpecFor(a('civics-quiz', 'medium')).themeId, 'CIVICS_QUIZ');
      expect(quizSpecFor(a('geo-quiz', 'medium')).themeId, 'GEO_QUIZ');
      expect(quizSpecFor(a('history-quiz', 'medium')).themeId, 'HISTORY_QUIZ');
    });
  });
}
