import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../api/quest_models.dart';
import '../config/constants.dart';
import '../game/jigsaw/logic.dart';
import '../game/language/language_data.dart';
import '../game/math_maze/logic.dart';
import '../game/pattern_recall/logic.dart';
import '../game/sequence_memory/logic.dart';
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
import 'screens/games/bond_and_burn_screens.dart';
import 'screens/games/bubble_pop_screens.dart';
import 'screens/games/circuit_builder_screens.dart';
import 'screens/games/code_a_bot_screens.dart';
import 'screens/games/hangman_screens.dart';
import 'screens/games/jigsaw_screens.dart';
import 'screens/games/language_screens.dart';
import 'screens/games/math_maze_screens.dart';
import 'screens/games/mini_golf_screens.dart';
import 'screens/games/math_screens.dart';
import 'screens/games/pattern_screens.dart';
import 'screens/games/quiz_game_screen.dart';
import 'screens/games/quiz_setup_screens.dart';
import 'screens/games/sequence_screens.dart';
import 'screens/games/space_coder_screens.dart';
import 'screens/games/space_entry_screens.dart';
import 'screens/games/sudoku_screens.dart';
import 'screens/games/tic_tac_toe_screens.dart';
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
      // /register stays reachable when signed in: a just-created account may
      // still need to finish the confirmation step on that screen.
      if (loggedIn && loggingIn && state.matchedLocation != '/register') {
        return '/';
      }
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
        path: '/sudoku/setup',
        builder: (_, __) => const SudokuSetupScreen(),
      ),
      GoRoute(
        path: '/sudoku/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return SudokuGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/jigsaw-puzzle/setup',
        builder: (_, __) => const JigsawSetupScreen(),
      ),
      GoRoute(
        path: '/jigsaw-puzzle/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return JigsawGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            image: jigsawImageId(query['image']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/sequence-memory/setup',
        builder: (_, __) => const SequenceSetupScreen(),
      ),
      GoRoute(
        path: '/sequence-memory/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return SequenceGameScreen(
            difficulty: seqDifficulty(query['difficulty']).id,
            theme: seqThemeId(query['theme']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/pattern-recall/setup',
        builder: (_, __) => const PatternSetupScreen(),
      ),
      GoRoute(
        path: '/pattern-recall/play',
        // A missing or unknown theme or difficulty goes back to setup (web).
        redirect: (_, state) {
          final query = state.uri.queryParameters;
          return patternThemeById(query['theme']) == null ||
                  patternDifficultyById(query['difficulty']) == null
              ? '/pattern-recall/setup'
              : null;
        },
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return PatternGameScreen(
            theme: query['theme']!,
            difficulty: query['difficulty']!,
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/tic-tac-toe/setup',
        builder: (_, __) => const TicTacToeSetupScreen(),
      ),
      GoRoute(
        path: '/tic-tac-toe/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          if (query['mode'] == 'two-player') return const TicTacToeTwoPlayerScreen();
          return TicTacToeGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/bubble-pop/setup',
        builder: (_, __) => const BubblePopSetupScreen(),
      ),
      GoRoute(
        path: '/bubble-pop/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return BubblePopGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/space-entry/setup',
        builder: (_, __) => const SpaceEntrySetupScreen(),
      ),
      GoRoute(
        path: '/space-entry/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return SpaceEntryGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/bond-and-burn/setup',
        builder: (_, __) => const BondAndBurnSetupScreen(),
      ),
      GoRoute(
        path: '/bond-and-burn/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return BondAndBurnGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/scratch-coding/setup',
        builder: (_, __) => const SpaceCoderSetupScreen(),
      ),
      GoRoute(
        path: '/scratch-coding/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return SpaceCoderGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/circuit-builder/setup',
        builder: (_, __) => const CircuitBuilderSetupScreen(),
      ),
      GoRoute(
        path: '/circuit-builder/sandbox',
        builder: (_, __) => const CircuitBuilderSandboxScreen(),
      ),
      GoRoute(
        path: '/circuit-builder/play',
        // Anything that is not a guided level of that difficulty goes back to
        // the level list (web), so no URL is a dead screen.
        redirect: (_, state) =>
            parseCircuitLevel(state.uri.queryParameters) == null ? '/circuit-builder/setup' : null,
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return CircuitBuilderGameScreen(
            level: parseCircuitLevel(query)!,
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/mini-golf/setup',
        builder: (_, __) => const MiniGolfSetupScreen(),
      ),
      GoRoute(
        path: '/mini-golf/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return MiniGolfGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/code-a-bot/setup',
        builder: (_, __) => const CodeABotSetupScreen(),
      ),
      GoRoute(
        path: '/code-a-bot/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return CodeABotGameScreen(
            difficulty: quizDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
      GoRoute(
        path: '/math-maze/setup',
        builder: (_, __) => const MathMazeSetupScreen(),
      ),
      GoRoute(
        path: '/math-maze/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          return MathMazeGameScreen(
            difficulty: mazeDifficultyParam(query['difficulty']),
            questContext: QuestContext.parse(query['quest']),
          );
        },
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
