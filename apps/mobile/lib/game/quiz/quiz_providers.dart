import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import 'quiz_engine.dart';
import 'quiz_questions.dart';

/// Identifies one quiz round. [gameId] is the registry id (`geo-quiz`,
/// `history-quiz`, `civics-quiz`). [difficulty] is `easy`, `medium` or `hard`.
/// [mode] is the Geo or History mode id; [category] and [count] are for Civics.
typedef QuizArgs = ({
  String gameId,
  String difficulty,
  String mode,
  String category,
  int count,
  QuestContext? quest,
});

const Map<String, int> _geoSeconds = {'easy': 15, 'medium': 12, 'hard': 10};
const Map<String, int> _historySeconds = {'easy': 20, 'medium': 15, 'hard': 12};
const int kQuizRounds = 10;
const int kCivicsSeconds = 20;

/// Builds the rules for [args]. Unknown modes fall back to the first mode
/// (Geo: capitals, History: name the event, Civics: all topics).
QuizSpec quizSpecFor(QuizArgs args) {
  final difficulty = args.difficulty;
  switch (args.gameId) {
    case 'history-quiz':
      final mode = historyModeFromId(args.mode) ?? HistoryMode.nameEvent;
      return QuizSpec(
        themeId: 'HISTORY_QUIZ',
        difficulty: quizDifficultyNumber(difficulty),
        secondsPerQuestion: _historySeconds[difficulty] ?? 20,
        feedbackDelay: const Duration(milliseconds: 3000),
        build: (rng) => generateHistoryQuestions(mode, difficulty, kQuizRounds, rng),
      );
    case 'civics-quiz':
      final category = civicsCategoryFromId(args.category) ?? CivicsCategory.all;
      return QuizSpec(
        themeId: 'CIVICS_QUIZ',
        difficulty: quizDifficultyNumber(difficulty),
        secondsPerQuestion: kCivicsSeconds,
        feedbackDelay: const Duration(milliseconds: 2500),
        hintsEnabled: false,
        build: (rng) => generateCivicsQuestions(category, args.count, rng),
      );
    default:
      final mode = geoModeFromId(args.mode) ?? GeoMode.capitals;
      return QuizSpec(
        themeId: 'GEO_QUIZ',
        difficulty: quizDifficultyNumber(difficulty),
        secondsPerQuestion: _geoSeconds[difficulty] ?? 15,
        feedbackDelay: const Duration(milliseconds: 2500),
        build: (rng) => generateGeoQuestions(mode, kQuizRounds, rng),
      );
  }
}

final quizEngineProvider =
    StateNotifierProvider.family.autoDispose<QuizEngine, QuizState, QuizArgs>((ref, args) {
  final spec = quizSpecFor(args);
  final session = ref.watch(gameSessionProvider(spec.sessionArgs(args.quest)).notifier);
  return QuizEngine(session, ref.watch(gameFeedbackProvider), spec, random: Random());
});
