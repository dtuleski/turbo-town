import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/hangman/hangman_controller.dart';
import 'package:dashden_mobile/game/hangman/hangman_logic.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const HangmanArgs _easy = (difficulty: 'easy', lang: 'en', quest: null);

HangmanState _state(RouterHarness h, [HangmanArgs args = _easy]) =>
    h.container.read(hangmanControllerProvider(args));

Future<void> _tapLetter(WidgetTester tester, String letter) async {
  await tester.tap(find.byKey(Key('hm-key-$letter')));
  await tester.pump(const Duration(milliseconds: 50));
}

/// A letter that is not in [word].
String _missing(String word) =>
    kHangmanAlphabet.split('').firstWhere((l) => !word.contains(l));

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

void main() {
  testWidgets('setup -> win 5 rounds -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return _result(5150);
    });
    final h = await pumpRouterApp(tester, location: '/hangman/setup', api: api);
    expect(find.text('Select Difficulty'), findsOneWidget);
    await tester.tap(find.byKey(const Key('difficulty-easy')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('game-start-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));

    expect(api.calls, contains('startGame:HANGMAN:1'));
    for (var r = 0; r < 5; r++) {
      final word = _state(h).word.word;
      expect(find.byKey(const Key('hm-hint')), findsOneWidget);
      for (final l in word.split('').toSet()) {
        await _tapLetter(tester, l);
      }
      expect(_state(h).phase, RoundPhase.won);
      expect(find.text('🎉 Correct!'), findsOneWidget);
      await tester.tap(find.byKey(const Key('hm-next')));
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('5150'), findsOneWidget);
    expect(sent, {'correctAnswers': 5, 'totalQuestions': 5});
    // No wrong guesses and 5 wins: attempts = 5 * 6.
    expect(api.calls.last, endsWith(':30'));
  });

  testWidgets('six wrong guesses lose the round and reveal the word', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/hangman/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final word = _state(h).word.word;
    final wrong = kHangmanAlphabet.split('').where((l) => !word.contains(l)).take(6).toList();
    for (var i = 0; i < 6; i++) {
      expect(find.text('${6 - i} guesses left'), findsOneWidget);
      await _tapLetter(tester, wrong[i]);
    }
    expect(_state(h).phase, RoundPhase.lost);
    expect(find.text('💀 The word was: $word'), findsOneWidget);
    // The keyboard is replaced by the next-round button.
    expect(find.byKey(Key('hm-key-${wrong.first}')), findsNothing);
    expect(find.byKey(const Key('hm-next')), findsOneWidget);
    expect(_state(h).totalWrong, 6);
    expect(_state(h).totalScore, 0);
    await tester.tap(find.byKey(const Key('hm-next')));
    await tester.pump();
    expect(_state(h).round, 1);
    expect(_state(h).guessed, isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a won round scores 200 plus 100 per life left', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/hangman/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final word = _state(h).word.word;
    await _tapLetter(tester, _missing(word));
    for (final l in word.split('').toSet()) {
      await _tapLetter(tester, l);
    }
    expect(_state(h).phase, RoundPhase.won);
    expect(_state(h).totalScore, hangmanRoundScore(1));
    expect(find.text('700'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a letter can only be guessed once and wrong ones are marked',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/hangman/play?difficulty=medium');
    await tester.pump(const Duration(milliseconds: 100));
    const args = (difficulty: 'medium', lang: 'en', quest: null);
    final word = _state(h, args).word.word;
    final bad = _missing(word);
    await _tapLetter(tester, bad);
    await _tapLetter(tester, bad);
    expect(_state(h, args).totalWrong, 1);
    expect(_state(h, args).wrongCount, 1);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the Spanish app plays Spanish words', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/hangman/play?difficulty=easy',
      locale: const Locale('es'),
    );
    await tester.pump(const Duration(milliseconds: 100));
    const args = (difficulty: 'easy', lang: 'es', quest: null);
    final word = _state(h, args).word;
    final spanish = hangmanWordsFor('easy', 'es');
    expect(spanish.map((w) => w.word), contains(word.word));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/hangman/play?difficulty=hard&quest=brain-peaks:bp-04:2',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:HANGMAN:3:brain-peaks:bp-04:2'));
    await tester.pumpWidget(const SizedBox());
  });
}
