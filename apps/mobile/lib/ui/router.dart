import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../api/quest_models.dart';
import '../config/constants.dart';
import '../game/language/language_data.dart';
import '../game/quiz/quiz_providers.dart';
import '../game/quiz/quiz_questions.dart';
import '../quest/quest_launch.dart';
import 'main_shell.dart';
import 'screens/achievements_screen.dart';
import 'screens/contact_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/history_screen.dart';
import 'screens/leaderboard_screen.dart';
import 'screens/hub_screen.dart';
import 'screens/login_screen.dart';
import 'screens/games/hangman_screens.dart';
import 'screens/games/language_screens.dart';
import 'screens/games/math_screens.dart';
import 'screens/games/quiz_game_screen.dart';
import 'screens/games/quiz_setup_screens.dart';
import 'screens/games/word_puzzle_screens.dart';
import 'screens/memory_game_screen.dart';
import 'screens/memory_setup_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/quest_map_screen.dart';
import 'screens/register_screen.dart';
import 'screens/reset_password_screen.dart';
import 'screens/statistics_screen.dart';

/// Screens reachable while logged out. A logged-in user is sent home from them.
const _publicRoutes = {
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
};

/// App router with auth-based redirects.
final routerProvider = Provider<GoRouter>((ref) {
  // Watch only the status: any other auth change (busy flag, error text) must
  // not rebuild the router, which would reset navigation to the start route.
  final status = ref.watch(authControllerProvider.select((s) => s.status));

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final loggingIn = _publicRoutes.contains(state.matchedLocation);

      // While restoring the session, don't bounce the user around.
      if (status == AuthStatus.unknown) return null;

      final loggedIn = status == AuthStatus.authenticated;
      if (!loggedIn && !loggingIn) return '/login';
      if (loggedIn && loggingIn) return '/';
      return null;
    },
    routes: [
      // The five main tabs share the bottom navigation bar.
      ShellRoute(
        builder: (_, __, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HubScreen()),
          GoRoute(
            path: '/quest-map',
            builder: (_, state) => QuestMapScreen(
              startFailed: state.uri.queryParameters['startFailed'],
            ),
          ),
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(
            path: '/leaderboard',
            builder: (_, __) => const LeaderboardScreen(),
          ),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
      // Detail screens open full screen above the tabs.
      GoRoute(path: '/statistics', builder: (_, __) => const StatisticsScreen()),
      GoRoute(path: '/history', builder: (_, __) => const HistoryScreen()),
      GoRoute(
        path: '/achievements',
        builder: (_, __) => const AchievementsScreen(),
      ),
      GoRoute(path: '/contact', builder: (_, __) => const ContactScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (_, state) =>
            ResetPasswordScreen(initialEmail: state.uri.queryParameters['email']),
      ),
      GoRoute(
        path: '/memory-match/setup',
        builder: (_, __) => const MemorySetupScreen(),
      ),
      GoRoute(
        path: '/memory-match/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          // `theme` and `difficulty` come from setup or a quest launch URL.
          // Invalid or missing values fall back to the first theme on easy.
          final settings = resolveMemorySettings(query) ??
              _memorySettingsFromSetup(query);
          return MemoryGameScreen(
            themeId: settings.themeId,
            difficulty: settings.difficulty,
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/math-challenge/setup',
        builder: (_, __) => const MathSetupScreen(),
      ),
      GoRoute(
        path: '/math-challenge/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return MathGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/word-puzzle/setup',
        builder: (_, __) => const WordPuzzleSetupScreen(),
      ),
      GoRoute(
        path: '/word-puzzle/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return WordPuzzleGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/geo-quiz/setup',
        builder: (_, __) => const GeoQuizSetupScreen(),
      ),
      GoRoute(
        path: '/geo-quiz/play',
        builder: (_, state) =>
            QuizGameScreen(args: _quizArgs('geo-quiz', state.uri.queryParameters)),
      ),
      GoRoute(
        path: '/history-quiz/setup',
        builder: (_, __) => const HistoryQuizSetupScreen(),
      ),
      GoRoute(
        path: '/history-quiz/play',
        builder: (_, state) =>
            QuizGameScreen(args: _quizArgs('history-quiz', state.uri.queryParameters)),
      ),
      GoRoute(
        path: '/civics-quiz/setup',
        builder: (_, __) => const CivicsQuizSetupScreen(),
      ),
      GoRoute(
        path: '/civics-quiz/play',
        builder: (_, state) =>
            QuizGameScreen(args: _quizArgs('civics-quiz', state.uri.queryParameters)),
      ),
      GoRoute(
        path: '/hangman/setup',
        builder: (_, __) => const HangmanSetupScreen(),
      ),
      GoRoute(
        path: '/hangman/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return HangmanGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/language-learning/setup',
        builder: (_, __) => const LanguageSelectionScreen(),
      ),
      GoRoute(
        path: '/language-learning/setup/:code',
        builder: (_, state) =>
            LanguageSetupScreen(languageCode: state.pathParameters['code'] ?? ''),
      ),
      GoRoute(
        path: '/language-learning/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          final lang = languageByCode(query['lang']);
          if (lang == null || !isLanguageCategory(query['category'])) {
            return const LanguageSelectionScreen();
          }
          return LanguagePlayScreen(
            args: (
              lang: lang.code,
              category: query['category']!,
              difficulty: languageDifficultyById(query['difficulty']).id,
              mode: languageModeFromId(query['mode']),
            ),
          );
        },
      ),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(child: Text('Route not found: ${state.uri}')),
    ),
  );
});

/// Setup passes `difficulty` as an enum id (`SUPER_HARD`), which a launch URL
/// never does, so it needs its own lookup.
({String themeId, Difficulty difficulty}) _memorySettingsFromSetup(
  Map<String, String> query,
) {
  final themeId = kGameThemes.any((t) => t.id == query['theme'])
      ? query['theme']!
      : kGameThemes.first.id;
  final difficulty = Difficulty.values.firstWhere(
    (d) => d.id == query['difficulty']?.toUpperCase(),
    orElse: () => Difficulty.easy,
  );
  return (themeId: themeId, difficulty: difficulty);
}

/// Quiz play settings from a setup page or a quest launch URL. Missing or
/// invalid values fall back to the first option, as the web pages do.
QuizArgs _quizArgs(String gameId, Map<String, String> query) {
  final isCivics = gameId == 'civics-quiz';
  final difficulty = quizDifficultyParam(isCivics ? query['level'] : query['difficulty']);
  final asked = int.tryParse(query['questions'] ?? '') ?? 0;
  return (
    gameId: gameId,
    difficulty: difficulty,
    mode: isCivics ? '' : (query['mode'] ?? ''),
    category: isCivics ? (query['category'] ?? 'all') : '',
    count: isCivics ? (asked < 1 ? kCivicsLevelQuestions[difficulty]! : asked) : 0,
    quest: QuestContext.parse(query['quest']),
  );
}
