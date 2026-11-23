import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/api/language_api.dart';
import 'package:dashden_mobile/config/feature_flags.dart';
import 'package:dashden_mobile/game/language/language_controllers.dart';
import 'package:dashden_mobile/game/language/language_data.dart';
import 'package:dashden_mobile/game/language/speech.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';
import '../helpers/fake_language.dart';
import '../helpers/pump_router.dart';

CompleteGameResult _result(int score) => CompleteGameResult.fromJson({
      'id': 'game-1',
      'status': 'COMPLETED',
      'score': score,
      'scoreBreakdown': {
        'baseScore': 900,
        'difficultyMultiplier': 1.0,
        'speedBonus': 10,
        'accuracyBonus': 20,
        'finalScore': score,
      },
    });

Future<CanStartGameResult> _paid() async => const CanStartGameResult(
      canPlay: true,
      rateLimit: RateLimitInfo(tier: 'PREMIUM', limit: 100, used: 1, remaining: 99),
    );

List<LanguageWord> _words(int n) => [for (var i = 0; i < n; i++) word('w$i', 'palabra$i')];

LanguageArgs _args({
  String difficulty = 'beginner',
  LanguageMode mode = LanguageMode.imageMatch,
}) =>
    (lang: 'es', category: 'animals', difficulty: difficulty, mode: mode);

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump(const Duration(milliseconds: 100));
}

/// Index of the option that shows the correct picture for the current word.
int _correctIndex(RouterHarness h, LanguageArgs args) {
  // The controller is keyed by the very list the words provider returned.
  final words = h.container.read(languageWordsProvider(args)).value!;
  final s = h.container.read(imageMatchControllerProvider((args: args, words: words)));
  return s.options.indexOf(s.word.correctImageUrl);
}

void main() {
  group('selection', () {
    testWidgets('lists the 7 languages with progress where there is some', (tester) async {
      useTallSurface(tester);
      final lang = FakeLanguageApi(progress: const [
        LanguageProgress(
          languageCode: 'es',
          xp: 120,
          level: 3,
          wordsLearned: 41,
          accuracy: 0.8,
        ),
      ]);
      await pumpRouterApp(
        tester,
        location: '/language-learning/setup',
        overrides: languageOverrides(api: lang),
      );
      await tester.pump(const Duration(milliseconds: 100));
      for (final l in kLanguages) {
        expect(find.byKey(Key('language-${l.code}')), findsOneWidget);
      }
      expect(find.textContaining('Level 3'), findsOneWidget);
      expect(find.textContaining('41 words'), findsOneWidget);
      await tester.tap(find.byKey(const Key('language-es')));
      await _settle(tester);
      expect(find.text('Learn Spanish'), findsOneWidget);
    });

    testWidgets('an unknown language code says so', (tester) async {
      useTallSurface(tester);
      await pumpRouterApp(
        tester,
        location: '/language-learning/setup/xx',
        overrides: languageOverrides(),
      );
      expect(find.byKey(const Key('language-not-found')), findsOneWidget);
    });
  });

  group('image match', () {
    testWidgets('setup -> 10 words -> server score', (tester) async {
      useTallSurface(tester);
      final words = _words(10);
      final lang = FakeLanguageApi(words: words);
      final speaker = FakeWordSpeaker();
      Map<String, dynamic>? sent;
      final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
        sent = extra;
        return _result(5555);
      });
      final h = await pumpRouterApp(
        tester,
        location: '/language-learning/setup/es',
        api: api,
        overrides: languageOverrides(api: lang, speaker: speaker),
      );
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(find.byKey(const Key('category-animals')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('game-start-button')));
      await _settle(tester);
      await tester.pump(const Duration(milliseconds: 100));

      expect(lang.calls, contains('getLanguageWords:es:animals:beginner:10'));
      expect(api.calls, contains('startGame:LANGUAGE_LEARNING:1'));
      expect(find.byKey(const Key('lang-word')), findsOneWidget);
      expect(find.text('Question 1 of 10'), findsOneWidget);

      await tester.tap(find.byKey(const Key('lang-speak')));
      await tester.pump();
      expect(speaker.spoken, ['palabra0@es-ES']);

      for (var i = 0; i < 10; i++) {
        final index = _correctIndex(h, _args());
        await tester.tap(find.byKey(Key('lang-image-$index')));
        await tester.pump(const Duration(milliseconds: 50));
        expect(find.text('✅'), findsOneWidget);
        await tester.pump(kLanguageFeedbackDelay + const Duration(milliseconds: 100));
      }
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byKey(const Key('result-score')), findsOneWidget);
      expect(find.text('5555'), findsOneWidget);
      expect(sent, {'correctAnswers': 10, 'totalQuestions': 10});
      expect(api.calls.last, endsWith(':10'));
    });

    testWidgets('a wrong picture is marked and counts as wrong; images that fail show a fallback',
        (tester) async {
      useTallSurface(tester);
      final words = _words(10);
      final lang = FakeLanguageApi(words: words);
      Map<String, dynamic>? sent;
      final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
        sent = extra;
        return _result(10);
      });
      final h = await pumpRouterApp(
        tester,
        location: '/language-learning/play?lang=es&category=animals&difficulty=beginner&mode=image-match',
        api: api,
        overrides: languageOverrides(api: lang),
      );
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));
      // Test images cannot load: each tile shows the fallback instead of a crash.
      expect(find.text('Image unavailable'), findsWidgets);

      final right = _correctIndex(h, _args());
      final wrong = right == 0 ? 1 : 0;
      await tester.tap(find.byKey(Key('lang-image-$wrong')));
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.text('❌'), findsOneWidget);
      expect(find.text('✅'), findsOneWidget);
      await tester.pump(kLanguageFeedbackDelay + const Duration(milliseconds: 100));
      for (var i = 1; i < 10; i++) {
        final index = _correctIndex(h, _args());
        await tester.tap(find.byKey(Key('lang-image-$index')));
        await tester.pump(kLanguageFeedbackDelay + const Duration(milliseconds: 150));
      }
      await tester.pump(const Duration(milliseconds: 100));
      expect(sent, {'correctAnswers': 9, 'totalQuestions': 10});
    });

    testWidgets('no words: a message, and no play is started', (tester) async {
      useTallSurface(tester);
      final api = FakeGameApi();
      await pumpRouterApp(
        tester,
        location: '/language-learning/play?lang=es&category=animals&difficulty=beginner&mode=image-match',
        api: api,
        overrides: languageOverrides(api: FakeLanguageApi()),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('language-load-problem')), findsOneWidget);
      expect(find.textContaining('No vocabulary is available'), findsOneWidget);
      expect(api.calls.where((c) => c.startsWith('startGame')), isEmpty);
    });

    testWidgets('a failed load can be retried', (tester) async {
      useTallSurface(tester);
      final lang = FakeLanguageApi(words: _words(10), failWords: true);
      final api = FakeGameApi();
      await pumpRouterApp(
        tester,
        location: '/language-learning/play?lang=es&category=animals&difficulty=beginner&mode=image-match',
        api: api,
        overrides: languageOverrides(api: lang),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.textContaining('could not be loaded'), findsOneWidget);
      expect(api.calls.where((c) => c.startsWith('startGame')), isEmpty);
      lang.failWords = false;
      await tester.tap(find.byKey(const Key('language-retry-load')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pump(const Duration(milliseconds: 200));
      expect(find.byKey(const Key('lang-word')), findsOneWidget);
      expect(api.calls, contains('startGame:LANGUAGE_LEARNING:1'));
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('Play again goes back to the setup of that language', (tester) async {
      useTallSurface(tester);
      final words = _words(10);
      final h = await pumpRouterApp(
        tester,
        location: '/language-learning/setup/es',
        overrides: languageOverrides(api: FakeLanguageApi(words: words)),
      );
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(find.byKey(const Key('game-start-button')));
      await _settle(tester);
      await tester.pump(const Duration(milliseconds: 100));
      for (var i = 0; i < 10; i++) {
        final index = _correctIndex(h, _args());
        await tester.tap(find.byKey(Key('lang-image-$index')));
        await tester.pump(kLanguageFeedbackDelay + const Duration(milliseconds: 150));
      }
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('result-score')), findsOneWidget);
      await tester.tap(find.text('Play Again'));
      await _settle(tester);
      expect(find.text('Learn Spanish'), findsOneWidget);
      expect(find.byKey(const Key('result-score')), findsNothing);
    });
  });

  group('pronunciation and the paid switch', () {
    test('availability follows kPaidGamePresentation for a free tier', () {
      expect(pronunciationAvailability('FREE'), PronunciationAvailability.unavailable);
      expect(pronunciationAvailability('FREE', presentation: PaidGamePresentation.hidden),
          PronunciationAvailability.hidden);
      expect(pronunciationAvailability('FREE', presentation: PaidGamePresentation.openForAll),
          PronunciationAvailability.available);
      expect(pronunciationAvailability('PREMIUM', presentation: PaidGamePresentation.hidden),
          PronunciationAvailability.available);
      expect(pronunciationAvailability('premium'), PronunciationAvailability.available);
      // The shipped default is the neutral one.
      expect(kPaidGamePresentation, PaidGamePresentation.neutralUnavailable);
    });

    test('pronunciation is the paid theme, image match is not', () {
      expect(languageThemeId(LanguageMode.pronunciation), 'LANGUAGE_PRONUNCIATION');
      expect(languageThemeId(LanguageMode.imageMatch), 'LANGUAGE_LEARNING');
    });

    testWidgets('a free user sees the option closed, with no price or upsell',
        (tester) async {
      useTallSurface(tester);
      await pumpRouterApp(
        tester,
        location: '/language-learning/setup/es',
        overrides: languageOverrides(api: FakeLanguageApi(words: _words(5))),
      );
      await tester.pump(const Duration(milliseconds: 200));
      expect(find.byKey(const Key('mode-pronunciation')), findsOneWidget);
      expect(find.text('Not available in the app yet'), findsOneWidget);
      expect(find.textContaining(RegExp(r'\$|Premium|Upgrade|subscribe', caseSensitive: false)),
          findsNothing);
      await tester.tap(find.byKey(const Key('mode-pronunciation')));
      await tester.pump();
      // Still on image match: Start leads to the image-match round.
      expect(find.byKey(const Key('mode-image-match')), findsOneWidget);
    });

    testWidgets('the server refusing a free user shows the neutral page', (tester) async {
      useTallSurface(tester);
      final api = FakeGameApi(
        onStartGame: (t, d, q) async => throw GameApiException(
          'This feature requires a paid subscription',
          code: 'PAID_FEATURE_REQUIRED',
        ),
      );
      await pumpRouterApp(
        tester,
        location:
            '/language-learning/play?lang=es&category=animals&difficulty=beginner&mode=pronunciation',
        api: api,
        overrides: languageOverrides(api: FakeLanguageApi(words: _words(5))),
      );
      await tester.pump(const Duration(milliseconds: 200));
      expect(api.calls, contains('startGame:LANGUAGE_PRONUNCIATION:1'));
      expect(find.text('Not available in the app yet'), findsOneWidget);
    });

    testWidgets('a paid tier can pick pronunciation', (tester) async {
      useTallSurface(tester);
      final api = FakeGameApi(onCanStartGame: _paid);
      await pumpRouterApp(
        tester,
        location: '/language-learning/setup/pt',
        api: api,
        overrides: languageOverrides(api: FakeLanguageApi(words: _words(5))),
      );
      await tester.pump(const Duration(milliseconds: 200));
      expect(find.textContaining('Recognition accuracy may vary'), findsOneWidget);
      await tester.tap(find.byKey(const Key('mode-pronunciation')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('game-start-button')));
      await _settle(tester);
      await tester.pump(const Duration(milliseconds: 200));
      expect(find.byKey(const Key('pron-word')), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    });
  });

  group('pronunciation round', () {
    Future<
        ({
          RouterHarness h,
          FakeGameApi api,
          FakeSpeechRecognizer rec,
          Map<String, dynamic>? Function() sent,
        })> start(
      WidgetTester tester, {
      String difficulty = 'beginner',
      SpeechInit init = SpeechInit.ready,
    }) async {
      useTallSurface(tester);
      Map<String, dynamic>? sent;
      final api = FakeGameApi(
        onCanStartGame: _paid,
        onCompleteGame: (id, time, attempts, extra) async {
          sent = extra;
          return _result(4000);
        },
      );
      final rec = FakeSpeechRecognizer(init: init);
      final h = await pumpRouterApp(
        tester,
        location:
            '/language-learning/play?lang=es&category=animals&difficulty=$difficulty&mode=pronunciation',
        api: api,
        overrides: languageOverrides(api: FakeLanguageApi(words: _words(12)), recognizer: rec),
      );
      await tester.pump(const Duration(milliseconds: 200));
      return (h: h, api: api, rec: rec, sent: () => sent);
    }

    Future<void> record(WidgetTester tester) async {
      await tester.tap(find.byKey(const Key('pron-record')));
      await tester.pump(const Duration(milliseconds: 50));
    }

    testWidgets('5 words, best score counts, server gets the average', (tester) async {
      final s = await start(tester);
      expect(s.api.calls, contains('startGame:LANGUAGE_PRONUNCIATION:1'));
      expect(find.text('1 / 5'), findsOneWidget);
      for (var i = 0; i < 5; i++) {
        expect(find.text('palabra$i'), findsOneWidget);
        await record(tester);
        expect(find.byKey(const Key('pron-listening')), findsOneWidget);
        expect(s.rec.localeId, 'es-ES');
        // No usable confidence: recognition-only, a heard word is 100.
        s.rec.say('palabra$i');
        await tester.pump(const Duration(milliseconds: 50));
        expect(find.text('✓ Recognized'), findsOneWidget);
        await tester.tap(find.byKey(const Key('pron-next')));
        await tester.pump(const Duration(milliseconds: 100));
      }
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byKey(const Key('result-score')), findsOneWidget);
      expect(find.text('4000'), findsOneWidget);
      expect(s.sent(), {'correctAnswers': 100, 'totalQuestions': 100});
      // One attempt per word.
      expect(s.api.calls.last, endsWith(':5'));
    });

    testWidgets('a low score allows two retries, then only Next', (tester) async {
      final s = await start(tester);
      await record(tester);
      s.rec.say('banana', confidence: 0.9);
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const Key('pron-retry')), findsOneWidget);
      expect(find.text('🔄 Retry (2 left)'), findsOneWidget);
      expect(find.text('Attempt 1/3'), findsOneWidget);

      await tester.tap(find.byKey(const Key('pron-retry')));
      await tester.pump();
      expect(find.text('Attempt 2/3'), findsOneWidget);
      await record(tester);
      s.rec.say('banana', confidence: 0.9);
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.text('🔄 Retry (1 left)'), findsOneWidget);

      await tester.tap(find.byKey(const Key('pron-retry')));
      await tester.pump();
      await record(tester);
      s.rec.say('palabra0', confidence: 0.95);
      await tester.pump(const Duration(milliseconds: 50));
      // Graded (confidence was usable): a percentage, no more retries.
      expect(find.byKey(const Key('pron-retry')), findsNothing);
      final value = tester.widget<Text>(find.byKey(const Key('pron-score-value'))).data!;
      expect(value, endsWith('%'));
      final shown = int.parse(value.replaceAll('%', ''));
      expect(shown, greaterThan(60));
      expect(find.text('Attempt 3/3'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('the best of the tries is kept for the word', (tester) async {
      final s = await start(tester);
      await record(tester);
      s.rec.say('palabra0', confidence: 0.95);
      await tester.pump(const Duration(milliseconds: 50));
      final c = s.h.container.read(pronunciationControllerProvider((
        args: _args(mode: LanguageMode.pronunciation),
        words: s.h.container.read(languageWordsProvider(_args(mode: LanguageMode.pronunciation))).value!,
      )));
      expect(c.bestScore, greaterThan(60));
      expect(c.lastScore!.graded, isTrue);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('permission denied explains how to fix it', (tester) async {
      final s = await start(tester, init: SpeechInit.denied);
      await record(tester);
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const Key('pron-error')), findsOneWidget);
      expect(find.textContaining('allow microphone'), findsOneWidget);
      expect(s.rec.listens, 0);
      // The button is still there for another try.
      expect(find.byKey(const Key('pron-record')), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('hearing nothing is a "didn\'t hear" message, not a score', (tester) async {
      final s = await start(tester);
      await record(tester);
      s.rec.endSilently();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const Key('pron-error')), findsOneWidget);
      expect(find.textContaining("didn't hear anything"), findsOneWidget);
      expect(find.byKey(const Key('pron-score')), findsNothing);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('a network error from the recognizer is shown', (tester) async {
      final s = await start(tester);
      await record(tester);
      s.rec.fail(SpeechErrorKind.network);
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.textContaining('internet connection'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('a result that arrives before the stop is still scored', (tester) async {
      final s = await start(tester);
      await record(tester);
      s.rec.say('palabra0', isFinal: false);
      await tester.pump(const Duration(milliseconds: 50));
      // Tapping Stop ends the capture; the interim words are scored.
      await tester.tap(find.byKey(const Key('pron-record')));
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const Key('pron-score')), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('advanced grades strictly', (tester) async {
      final s = await start(tester, difficulty: 'advanced');
      expect(find.text('1 / 12'), findsOneWidget);
      await record(tester);
      s.rec.say('palabra0', confidence: 0.8);
      await tester.pump(const Duration(milliseconds: 50));
      final strict = int.parse(
          tester.widget<Text>(find.byKey(const Key('pron-score-value'))).data!.replaceAll('%', ''));
      expect(strict, lessThan(100));
      await tester.pumpWidget(const SizedBox());
    });
  });
}
