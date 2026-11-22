import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_pt.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'gen/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('es'),
    Locale('pt')
  ];

  /// No description provided for @games_memory_match_title.
  ///
  /// In en, this message translates to:
  /// **'Memory Match'**
  String get games_memory_match_title;

  /// No description provided for @games_memory_match_description.
  ///
  /// In en, this message translates to:
  /// **'Flip cards and find matching pairs!'**
  String get games_memory_match_description;

  /// No description provided for @games_memory_match_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_memory_match_category;

  /// No description provided for @games_math_challenge_title.
  ///
  /// In en, this message translates to:
  /// **'Math Challenge'**
  String get games_math_challenge_title;

  /// No description provided for @games_math_challenge_description.
  ///
  /// In en, this message translates to:
  /// **'Solve math problems as fast as you can!'**
  String get games_math_challenge_description;

  /// No description provided for @games_math_challenge_category.
  ///
  /// In en, this message translates to:
  /// **'Science & Math'**
  String get games_math_challenge_category;

  /// No description provided for @games_word_puzzle_title.
  ///
  /// In en, this message translates to:
  /// **'Word Puzzle'**
  String get games_word_puzzle_title;

  /// No description provided for @games_word_puzzle_description.
  ///
  /// In en, this message translates to:
  /// **'Find hidden words in the grid!'**
  String get games_word_puzzle_description;

  /// No description provided for @games_word_puzzle_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_word_puzzle_category;

  /// No description provided for @games_language_learning_title.
  ///
  /// In en, this message translates to:
  /// **'Language Learning'**
  String get games_language_learning_title;

  /// No description provided for @games_language_learning_description.
  ///
  /// In en, this message translates to:
  /// **'Learn new languages with fun matching games!'**
  String get games_language_learning_description;

  /// No description provided for @games_language_learning_category.
  ///
  /// In en, this message translates to:
  /// **'Geography & Language'**
  String get games_language_learning_category;

  /// No description provided for @games_sudoku_title.
  ///
  /// In en, this message translates to:
  /// **'Sudoku'**
  String get games_sudoku_title;

  /// No description provided for @games_sudoku_description.
  ///
  /// In en, this message translates to:
  /// **'Fill the grid with numbers — no repeats!'**
  String get games_sudoku_description;

  /// No description provided for @games_sudoku_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_sudoku_category;

  /// No description provided for @games_jigsaw_puzzle_title.
  ///
  /// In en, this message translates to:
  /// **'Jigsaw Puzzle'**
  String get games_jigsaw_puzzle_title;

  /// No description provided for @games_jigsaw_puzzle_description.
  ///
  /// In en, this message translates to:
  /// **'Put the pieces together to complete the picture!'**
  String get games_jigsaw_puzzle_description;

  /// No description provided for @games_jigsaw_puzzle_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_jigsaw_puzzle_category;

  /// No description provided for @games_bubble_pop_title.
  ///
  /// In en, this message translates to:
  /// **'Bubble Pop'**
  String get games_bubble_pop_title;

  /// No description provided for @games_bubble_pop_description.
  ///
  /// In en, this message translates to:
  /// **'Pop bubbles by solving quick challenges!'**
  String get games_bubble_pop_description;

  /// No description provided for @games_bubble_pop_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_bubble_pop_category;

  /// No description provided for @games_sequence_memory_title.
  ///
  /// In en, this message translates to:
  /// **'Sequence Memory'**
  String get games_sequence_memory_title;

  /// No description provided for @games_sequence_memory_description.
  ///
  /// In en, this message translates to:
  /// **'Remember and repeat growing sequences!'**
  String get games_sequence_memory_description;

  /// No description provided for @games_sequence_memory_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_sequence_memory_category;

  /// No description provided for @games_code_a_bot_title.
  ///
  /// In en, this message translates to:
  /// **'Code-a-Bot'**
  String get games_code_a_bot_title;

  /// No description provided for @games_code_a_bot_description.
  ///
  /// In en, this message translates to:
  /// **'Program a robot to reach the goal!'**
  String get games_code_a_bot_description;

  /// No description provided for @games_code_a_bot_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_code_a_bot_category;

  /// No description provided for @games_geo_quiz_title.
  ///
  /// In en, this message translates to:
  /// **'Geography Quiz'**
  String get games_geo_quiz_title;

  /// No description provided for @games_geo_quiz_description.
  ///
  /// In en, this message translates to:
  /// **'Test your world geography knowledge!'**
  String get games_geo_quiz_description;

  /// No description provided for @games_geo_quiz_category.
  ///
  /// In en, this message translates to:
  /// **'Geography & Language'**
  String get games_geo_quiz_category;

  /// No description provided for @games_history_quiz_title.
  ///
  /// In en, this message translates to:
  /// **'History Quiz'**
  String get games_history_quiz_title;

  /// No description provided for @games_history_quiz_description.
  ///
  /// In en, this message translates to:
  /// **'Journey through time with history questions!'**
  String get games_history_quiz_description;

  /// No description provided for @games_history_quiz_category.
  ///
  /// In en, this message translates to:
  /// **'History & Civics'**
  String get games_history_quiz_category;

  /// No description provided for @games_civics_quiz_title.
  ///
  /// In en, this message translates to:
  /// **'Civics Quiz'**
  String get games_civics_quiz_title;

  /// No description provided for @games_civics_quiz_description.
  ///
  /// In en, this message translates to:
  /// **'Learn about government and citizenship!'**
  String get games_civics_quiz_description;

  /// No description provided for @games_civics_quiz_category.
  ///
  /// In en, this message translates to:
  /// **'History & Civics'**
  String get games_civics_quiz_category;

  /// No description provided for @games_color_by_number_title.
  ///
  /// In en, this message translates to:
  /// **'Color by Number'**
  String get games_color_by_number_title;

  /// No description provided for @games_color_by_number_description.
  ///
  /// In en, this message translates to:
  /// **'Paint beautiful pictures number by number!'**
  String get games_color_by_number_description;

  /// No description provided for @games_color_by_number_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_color_by_number_category;

  /// No description provided for @games_hangman_title.
  ///
  /// In en, this message translates to:
  /// **'Hangman'**
  String get games_hangman_title;

  /// No description provided for @games_hangman_description.
  ///
  /// In en, this message translates to:
  /// **'Guess the word letter by letter!'**
  String get games_hangman_description;

  /// No description provided for @games_hangman_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_hangman_category;

  /// No description provided for @games_tic_tac_toe_title.
  ///
  /// In en, this message translates to:
  /// **'Tic Tac Toe'**
  String get games_tic_tac_toe_title;

  /// No description provided for @games_tic_tac_toe_description.
  ///
  /// In en, this message translates to:
  /// **'Classic X and O strategy game!'**
  String get games_tic_tac_toe_description;

  /// No description provided for @games_tic_tac_toe_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_tic_tac_toe_category;

  /// No description provided for @games_scratch_coding_title.
  ///
  /// In en, this message translates to:
  /// **'Space Coder'**
  String get games_scratch_coding_title;

  /// No description provided for @games_scratch_coding_description.
  ///
  /// In en, this message translates to:
  /// **'Program your astronaut to the airlock with the fewest blocks!'**
  String get games_scratch_coding_description;

  /// No description provided for @games_scratch_coding_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_scratch_coding_category;

  /// No description provided for @games_math_maze_title.
  ///
  /// In en, this message translates to:
  /// **'Math Maze'**
  String get games_math_maze_title;

  /// No description provided for @games_math_maze_description.
  ///
  /// In en, this message translates to:
  /// **'Navigate a maze by solving math equations at gates!'**
  String get games_math_maze_description;

  /// No description provided for @games_math_maze_category.
  ///
  /// In en, this message translates to:
  /// **'Science & Math'**
  String get games_math_maze_category;

  /// No description provided for @games_pattern_recall_title.
  ///
  /// In en, this message translates to:
  /// **'Pattern Recall'**
  String get games_pattern_recall_title;

  /// No description provided for @games_pattern_recall_description.
  ///
  /// In en, this message translates to:
  /// **'Memorize and repeat patterns in this Simon Says-style memory game!'**
  String get games_pattern_recall_description;

  /// No description provided for @games_pattern_recall_category.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get games_pattern_recall_category;

  /// No description provided for @games_space_entry_title.
  ///
  /// In en, this message translates to:
  /// **'Space Entry'**
  String get games_space_entry_title;

  /// No description provided for @games_space_entry_description.
  ///
  /// In en, this message translates to:
  /// **'Calculate your reentry angle and land safely on Earth!'**
  String get games_space_entry_description;

  /// No description provided for @games_space_entry_category.
  ///
  /// In en, this message translates to:
  /// **'Science & Math'**
  String get games_space_entry_category;

  /// No description provided for @games_bond_and_burn_title.
  ///
  /// In en, this message translates to:
  /// **'Bond & Burn'**
  String get games_bond_and_burn_title;

  /// No description provided for @games_bond_and_burn_description.
  ///
  /// In en, this message translates to:
  /// **'Read the formula, find elements on the periodic table, and build compounds before the lab overheats!'**
  String get games_bond_and_burn_description;

  /// No description provided for @games_bond_and_burn_category.
  ///
  /// In en, this message translates to:
  /// **'Science & Math'**
  String get games_bond_and_burn_category;

  /// No description provided for @games_circuit_builder_title.
  ///
  /// In en, this message translates to:
  /// **'Circuit Builder'**
  String get games_circuit_builder_title;

  /// No description provided for @games_circuit_builder_description.
  ///
  /// In en, this message translates to:
  /// **'Wire up batteries, bulbs and switches, then watch the current flow and fix faults!'**
  String get games_circuit_builder_description;

  /// No description provided for @games_circuit_builder_category.
  ///
  /// In en, this message translates to:
  /// **'Science & Math'**
  String get games_circuit_builder_category;

  /// No description provided for @nav_dashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get nav_dashboard;

  /// No description provided for @nav_leaderboard.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard'**
  String get nav_leaderboard;

  /// No description provided for @nav_achievements.
  ///
  /// In en, this message translates to:
  /// **'Achievements'**
  String get nav_achievements;

  /// No description provided for @nav_changePlan.
  ///
  /// In en, this message translates to:
  /// **'Change Plan'**
  String get nav_changePlan;

  /// No description provided for @nav_logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get nav_logout;

  /// No description provided for @nav_profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get nav_profile;

  /// No description provided for @nav_contact.
  ///
  /// In en, this message translates to:
  /// **'Contact'**
  String get nav_contact;

  /// No description provided for @hub_title.
  ///
  /// In en, this message translates to:
  /// **'DashDen Game Hub'**
  String get hub_title;

  /// No description provided for @hub_greeting.
  ///
  /// In en, this message translates to:
  /// **'Hi {name}! Pick a game to play!'**
  String hub_greeting(String name);

  /// No description provided for @hub_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Educational games that make learning fun'**
  String get hub_subtitle;

  /// No description provided for @hub_filter_all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get hub_filter_all;

  /// No description provided for @hub_filter_scienceMath.
  ///
  /// In en, this message translates to:
  /// **'Science & Math'**
  String get hub_filter_scienceMath;

  /// No description provided for @hub_filter_historyCivics.
  ///
  /// In en, this message translates to:
  /// **'History & Civics'**
  String get hub_filter_historyCivics;

  /// No description provided for @hub_filter_geographyLanguage.
  ///
  /// In en, this message translates to:
  /// **'Geography & Language'**
  String get hub_filter_geographyLanguage;

  /// No description provided for @hub_filter_puzzlesLogic.
  ///
  /// In en, this message translates to:
  /// **'Puzzles & Logic'**
  String get hub_filter_puzzlesLogic;

  /// No description provided for @hub_noGames.
  ///
  /// In en, this message translates to:
  /// **'No games available right now. Check back soon!'**
  String get hub_noGames;

  /// No description provided for @hub_noGamesFilter.
  ///
  /// In en, this message translates to:
  /// **'No games in this category yet. Try another filter!'**
  String get hub_noGamesFilter;

  /// No description provided for @hub_playNow.
  ///
  /// In en, this message translates to:
  /// **'Play Now! →'**
  String get hub_playNow;

  /// No description provided for @hub_comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming Soon!'**
  String get hub_comingSoon;

  /// No description provided for @hub_loadingGames.
  ///
  /// In en, this message translates to:
  /// **'Loading games...'**
  String get hub_loadingGames;

  /// No description provided for @hub_oops.
  ///
  /// In en, this message translates to:
  /// **'Oops!'**
  String get hub_oops;

  /// No description provided for @hub_failedToLoad.
  ///
  /// In en, this message translates to:
  /// **'Failed to load games. Please try again.'**
  String get hub_failedToLoad;

  /// No description provided for @hub_dashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get hub_dashboard;

  /// No description provided for @hub_leaderboard.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard'**
  String get hub_leaderboard;

  /// No description provided for @hub_ages.
  ///
  /// In en, this message translates to:
  /// **'Ages'**
  String get hub_ages;

  /// No description provided for @game_back.
  ///
  /// In en, this message translates to:
  /// **'← Back'**
  String get game_back;

  /// No description provided for @game_startQuiz.
  ///
  /// In en, this message translates to:
  /// **'Start Quiz! 🚀'**
  String get game_startQuiz;

  /// No description provided for @game_startGame.
  ///
  /// In en, this message translates to:
  /// **'Start Game!'**
  String get game_startGame;

  /// No description provided for @game_selectDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Select Difficulty'**
  String get game_selectDifficulty;

  /// No description provided for @game_chooseDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Choose Difficulty'**
  String get game_chooseDifficulty;

  /// No description provided for @game_chooseTopic.
  ///
  /// In en, this message translates to:
  /// **'Choose a Topic'**
  String get game_chooseTopic;

  /// No description provided for @game_chooseGameMode.
  ///
  /// In en, this message translates to:
  /// **'Choose Game Mode'**
  String get game_chooseGameMode;

  /// No description provided for @game_chooseAIDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Choose AI Difficulty'**
  String get game_chooseAIDifficulty;

  /// No description provided for @game_selectDifficultyAndMode.
  ///
  /// In en, this message translates to:
  /// **'Select Difficulty & Mode'**
  String get game_selectDifficultyAndMode;

  /// No description provided for @game_selectTopicAndDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Select Topic & Difficulty'**
  String get game_selectTopicAndDifficulty;

  /// No description provided for @game_easy.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get game_easy;

  /// No description provided for @game_medium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get game_medium;

  /// No description provided for @game_hard.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get game_hard;

  /// No description provided for @game_superHard.
  ///
  /// In en, this message translates to:
  /// **'Super Hard'**
  String get game_superHard;

  /// No description provided for @game_correct.
  ///
  /// In en, this message translates to:
  /// **'Correct!'**
  String get game_correct;

  /// No description provided for @game_wrong.
  ///
  /// In en, this message translates to:
  /// **'Wrong!'**
  String get game_wrong;

  /// No description provided for @game_score.
  ///
  /// In en, this message translates to:
  /// **'Score'**
  String get game_score;

  /// No description provided for @game_time.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get game_time;

  /// No description provided for @game_round.
  ///
  /// In en, this message translates to:
  /// **'Round'**
  String get game_round;

  /// No description provided for @game_streak.
  ///
  /// In en, this message translates to:
  /// **'streak!'**
  String get game_streak;

  /// No description provided for @game_bonus.
  ///
  /// In en, this message translates to:
  /// **'bonus'**
  String get game_bonus;

  /// No description provided for @game_nextRound.
  ///
  /// In en, this message translates to:
  /// **'Next Round →'**
  String get game_nextRound;

  /// No description provided for @game_seeResults.
  ///
  /// In en, this message translates to:
  /// **'See Results 🏆'**
  String get game_seeResults;

  /// No description provided for @game_calculating.
  ///
  /// In en, this message translates to:
  /// **'Calculating score...'**
  String get game_calculating;

  /// No description provided for @game_gameComplete.
  ///
  /// In en, this message translates to:
  /// **'Game Complete!'**
  String get game_gameComplete;

  /// No description provided for @game_playAgain.
  ///
  /// In en, this message translates to:
  /// **'Play Again'**
  String get game_playAgain;

  /// No description provided for @game_close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get game_close;

  /// No description provided for @game_rateGame.
  ///
  /// In en, this message translates to:
  /// **'Rate this game'**
  String get game_rateGame;

  /// No description provided for @game_thanksFeedback.
  ///
  /// In en, this message translates to:
  /// **'✓ Thanks for your feedback!'**
  String get game_thanksFeedback;

  /// No description provided for @game_totalScore.
  ///
  /// In en, this message translates to:
  /// **'Total Score'**
  String get game_totalScore;

  /// No description provided for @game_baseScore.
  ///
  /// In en, this message translates to:
  /// **'Base Score'**
  String get game_baseScore;

  /// No description provided for @game_difficulty.
  ///
  /// In en, this message translates to:
  /// **'Difficulty'**
  String get game_difficulty;

  /// No description provided for @game_speed.
  ///
  /// In en, this message translates to:
  /// **'Speed'**
  String get game_speed;

  /// No description provided for @game_accuracy.
  ///
  /// In en, this message translates to:
  /// **'Accuracy'**
  String get game_accuracy;

  /// No description provided for @game_leaderboardBtn.
  ///
  /// In en, this message translates to:
  /// **'🏆 Leaderboard'**
  String get game_leaderboardBtn;

  /// No description provided for @game_playAgainBtn.
  ///
  /// In en, this message translates to:
  /// **'🎮 Play Again'**
  String get game_playAgainBtn;

  /// No description provided for @leaderboard_title.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard'**
  String get leaderboard_title;

  /// No description provided for @leaderboard_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Compete with players worldwide and climb the ranks!'**
  String get leaderboard_subtitle;

  /// No description provided for @leaderboard_gameType.
  ///
  /// In en, this message translates to:
  /// **'Game Type'**
  String get leaderboard_gameType;

  /// No description provided for @leaderboard_daily.
  ///
  /// In en, this message translates to:
  /// **'Daily'**
  String get leaderboard_daily;

  /// No description provided for @leaderboard_weekly.
  ///
  /// In en, this message translates to:
  /// **'Weekly'**
  String get leaderboard_weekly;

  /// No description provided for @leaderboard_monthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get leaderboard_monthly;

  /// No description provided for @leaderboard_allTime.
  ///
  /// In en, this message translates to:
  /// **'All Time'**
  String get leaderboard_allTime;

  /// No description provided for @leaderboard_yourRank.
  ///
  /// In en, this message translates to:
  /// **'Your Rank'**
  String get leaderboard_yourRank;

  /// No description provided for @leaderboard_topPlayers.
  ///
  /// In en, this message translates to:
  /// **'Top Players'**
  String get leaderboard_topPlayers;

  /// No description provided for @leaderboard_rank.
  ///
  /// In en, this message translates to:
  /// **'Rank'**
  String get leaderboard_rank;

  /// No description provided for @leaderboard_player.
  ///
  /// In en, this message translates to:
  /// **'Player'**
  String get leaderboard_player;

  /// No description provided for @leaderboard_date.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get leaderboard_date;

  /// No description provided for @leaderboard_clearAll.
  ///
  /// In en, this message translates to:
  /// **'Clear All Records'**
  String get leaderboard_clearAll;

  /// No description provided for @leaderboard_players.
  ///
  /// In en, this message translates to:
  /// **'players'**
  String get leaderboard_players;

  /// No description provided for @leaderboard_keepPlaying.
  ///
  /// In en, this message translates to:
  /// **'Keep playing to improve your rank!'**
  String get leaderboard_keepPlaying;

  /// No description provided for @leaderboard_todaysTop.
  ///
  /// In en, this message translates to:
  /// **'Today\'\'s Top Players'**
  String get leaderboard_todaysTop;

  /// No description provided for @leaderboard_thisWeeksTop.
  ///
  /// In en, this message translates to:
  /// **'This Week\'\'s Top Players'**
  String get leaderboard_thisWeeksTop;

  /// No description provided for @leaderboard_thisMonthsTop.
  ///
  /// In en, this message translates to:
  /// **'This Month\'\'s Top Players'**
  String get leaderboard_thisMonthsTop;

  /// No description provided for @leaderboard_allTimeTop.
  ///
  /// In en, this message translates to:
  /// **'All-Time Top Players'**
  String get leaderboard_allTimeTop;

  /// No description provided for @leaderboard_ranked.
  ///
  /// In en, this message translates to:
  /// **'You\'\'re ranked #{rank} out of {total} players'**
  String leaderboard_ranked(String rank, String total);

  /// No description provided for @leaderboard_showing.
  ///
  /// In en, this message translates to:
  /// **'Showing top {count} players'**
  String leaderboard_showing(String count);

  /// No description provided for @leaderboard_clearing.
  ///
  /// In en, this message translates to:
  /// **'⏳ Clearing...'**
  String get leaderboard_clearing;

  /// No description provided for @leaderboard_failedToLoad.
  ///
  /// In en, this message translates to:
  /// **'Failed to load leaderboard. Please try again later.'**
  String get leaderboard_failedToLoad;

  /// No description provided for @profile_title.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile_title;

  /// No description provided for @profile_accountTier.
  ///
  /// In en, this message translates to:
  /// **'Account Tier'**
  String get profile_accountTier;

  /// No description provided for @profile_memberSince.
  ///
  /// In en, this message translates to:
  /// **'Member Since'**
  String get profile_memberSince;

  /// No description provided for @profile_emailPrefs.
  ///
  /// In en, this message translates to:
  /// **'Email Preferences'**
  String get profile_emailPrefs;

  /// No description provided for @profile_dailyDigest.
  ///
  /// In en, this message translates to:
  /// **'Daily Digest'**
  String get profile_dailyDigest;

  /// No description provided for @profile_dailyDigestDesc.
  ///
  /// In en, this message translates to:
  /// **'Get daily leaderboard highlights and game updates'**
  String get profile_dailyDigestDesc;

  /// No description provided for @profile_dailyDigestOn.
  ///
  /// In en, this message translates to:
  /// **'✓ You\'\'ll receive daily updates at 8pm EST'**
  String get profile_dailyDigestOn;

  /// No description provided for @auth_createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get auth_createAccount;

  /// No description provided for @auth_login.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get auth_login;

  /// No description provided for @auth_email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get auth_email;

  /// No description provided for @auth_username.
  ///
  /// In en, this message translates to:
  /// **'Username'**
  String get auth_username;

  /// No description provided for @auth_password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get auth_password;

  /// No description provided for @auth_confirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm Password'**
  String get auth_confirmPassword;

  /// No description provided for @auth_forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot Password?'**
  String get auth_forgotPassword;

  /// No description provided for @auth_alreadyHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get auth_alreadyHaveAccount;

  /// No description provided for @auth_dontHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Don\'\'t have an account?'**
  String get auth_dontHaveAccount;

  /// No description provided for @auth_signUpGoogle.
  ///
  /// In en, this message translates to:
  /// **'Sign up with Google'**
  String get auth_signUpGoogle;

  /// No description provided for @auth_signInGoogle.
  ///
  /// In en, this message translates to:
  /// **'Sign in with Google'**
  String get auth_signInGoogle;

  /// No description provided for @auth_emailOptIn.
  ///
  /// In en, this message translates to:
  /// **'Send me daily game updates, leaderboard highlights, and new game alerts'**
  String get auth_emailOptIn;

  /// No description provided for @auth_or.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get auth_or;

  /// No description provided for @auth_welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome Back!'**
  String get auth_welcomeBack;

  /// No description provided for @auth_rememberMe.
  ///
  /// In en, this message translates to:
  /// **'Remember me'**
  String get auth_rememberMe;

  /// No description provided for @auth_invalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'Invalid email or password'**
  String get auth_invalidCredentials;

  /// No description provided for @auth_continueWithGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get auth_continueWithGoogle;

  /// No description provided for @auth_signUp.
  ///
  /// In en, this message translates to:
  /// **'Sign up'**
  String get auth_signUp;

  /// No description provided for @auth_confirmEmail.
  ///
  /// In en, this message translates to:
  /// **'Confirm Your Email'**
  String get auth_confirmEmail;

  /// No description provided for @auth_confirmationCode.
  ///
  /// In en, this message translates to:
  /// **'Confirmation Code'**
  String get auth_confirmationCode;

  /// No description provided for @auth_sentCodeTo.
  ///
  /// In en, this message translates to:
  /// **'We\'\'ve sent a confirmation code to {email}. Please enter it below.'**
  String auth_sentCodeTo(String email);

  /// No description provided for @auth_confirmEmailBtn.
  ///
  /// In en, this message translates to:
  /// **'Confirm Email'**
  String get auth_confirmEmailBtn;

  /// No description provided for @auth_backToRegistration.
  ///
  /// In en, this message translates to:
  /// **'Back to registration'**
  String get auth_backToRegistration;

  /// No description provided for @auth_checkEmailForCode.
  ///
  /// In en, this message translates to:
  /// **'Please check your email for a confirmation code.'**
  String get auth_checkEmailForCode;

  /// No description provided for @auth_registrationFailed.
  ///
  /// In en, this message translates to:
  /// **'Registration failed. Please try again.'**
  String get auth_registrationFailed;

  /// No description provided for @auth_confirmationFailed.
  ///
  /// In en, this message translates to:
  /// **'Confirmation failed. Please try again.'**
  String get auth_confirmationFailed;

  /// No description provided for @common_loading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get common_loading;

  /// No description provided for @common_error.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get common_error;

  /// No description provided for @common_retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get common_retry;

  /// No description provided for @common_save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get common_save;

  /// No description provided for @common_cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get common_cancel;

  /// No description provided for @common_confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get common_confirm;

  /// No description provided for @common_yes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get common_yes;

  /// No description provided for @common_no.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get common_no;

  /// No description provided for @common_tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get common_tryAgain;

  /// No description provided for @common_player.
  ///
  /// In en, this message translates to:
  /// **'Player'**
  String get common_player;

  /// No description provided for @setup_mathChallenge_title.
  ///
  /// In en, this message translates to:
  /// **'Math Challenge'**
  String get setup_mathChallenge_title;

  /// No description provided for @setup_mathChallenge_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Test your math skills! Solve problems as fast as you can!'**
  String get setup_mathChallenge_subtitle;

  /// No description provided for @setup_mathChallenge_chooseLevel.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Level'**
  String get setup_mathChallenge_chooseLevel;

  /// No description provided for @setup_mathChallenge_addSub.
  ///
  /// In en, this message translates to:
  /// **'Addition & Subtraction'**
  String get setup_mathChallenge_addSub;

  /// No description provided for @setup_mathChallenge_allBasic.
  ///
  /// In en, this message translates to:
  /// **'All Basic Operations'**
  String get setup_mathChallenge_allBasic;

  /// No description provided for @setup_mathChallenge_advanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced Math'**
  String get setup_mathChallenge_advanced;

  /// No description provided for @setup_mathChallenge_questions.
  ///
  /// In en, this message translates to:
  /// **'{count} questions'**
  String setup_mathChallenge_questions(String count);

  /// No description provided for @setup_mathChallenge_minutes.
  ///
  /// In en, this message translates to:
  /// **'{count} minutes'**
  String setup_mathChallenge_minutes(String count);

  /// No description provided for @setup_mathChallenge_startChallenge.
  ///
  /// In en, this message translates to:
  /// **'Start Challenge! 🚀'**
  String get setup_mathChallenge_startChallenge;

  /// No description provided for @setup_mathChallenge_selectLevel.
  ///
  /// In en, this message translates to:
  /// **'Select a Level'**
  String get setup_mathChallenge_selectLevel;

  /// No description provided for @setup_mathChallenge_question.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get setup_mathChallenge_question;

  /// No description provided for @setup_mathChallenge_time.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get setup_mathChallenge_time;

  /// No description provided for @setup_mathChallenge_score.
  ///
  /// In en, this message translates to:
  /// **'Score'**
  String get setup_mathChallenge_score;

  /// No description provided for @setup_mathChallenge_level.
  ///
  /// In en, this message translates to:
  /// **'{emoji} {name} Level'**
  String setup_mathChallenge_level(String emoji, String name);

  /// No description provided for @setup_mathChallenge_yourAnswer.
  ///
  /// In en, this message translates to:
  /// **'Your answer...'**
  String get setup_mathChallenge_yourAnswer;

  /// No description provided for @setup_mathChallenge_submitAnswer.
  ///
  /// In en, this message translates to:
  /// **'Submit Answer'**
  String get setup_mathChallenge_submitAnswer;

  /// No description provided for @setup_mathChallenge_calculatingScore.
  ///
  /// In en, this message translates to:
  /// **'Calculating your score...'**
  String get setup_mathChallenge_calculatingScore;

  /// No description provided for @setup_mathChallenge_correct.
  ///
  /// In en, this message translates to:
  /// **'✅ Correct!'**
  String get setup_mathChallenge_correct;

  /// No description provided for @setup_mathChallenge_wrong.
  ///
  /// In en, this message translates to:
  /// **'❌ Wrong! Answer: {answer}'**
  String setup_mathChallenge_wrong(String answer);

  /// No description provided for @setup_mathChallenge_amazing.
  ///
  /// In en, this message translates to:
  /// **'Amazing!'**
  String get setup_mathChallenge_amazing;

  /// No description provided for @setup_mathChallenge_goodJob.
  ///
  /// In en, this message translates to:
  /// **'Good Job!'**
  String get setup_mathChallenge_goodJob;

  /// No description provided for @setup_mathChallenge_keepPracticing.
  ///
  /// In en, this message translates to:
  /// **'Keep Practicing!'**
  String get setup_mathChallenge_keepPracticing;

  /// No description provided for @setup_mathChallenge_playAgain.
  ///
  /// In en, this message translates to:
  /// **'Play Again'**
  String get setup_mathChallenge_playAgain;

  /// No description provided for @setup_mathChallenge_backToHub.
  ///
  /// In en, this message translates to:
  /// **'Back to Hub'**
  String get setup_mathChallenge_backToHub;

  /// No description provided for @setup_memoryMatch_letsPlay.
  ///
  /// In en, this message translates to:
  /// **'Let\'\'s Play! 🎮'**
  String get setup_memoryMatch_letsPlay;

  /// No description provided for @setup_memoryMatch_chooseTheme.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Theme'**
  String get setup_memoryMatch_chooseTheme;

  /// No description provided for @setup_memoryMatch_chooseDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Choose Difficulty'**
  String get setup_memoryMatch_chooseDifficulty;

  /// No description provided for @setup_memoryMatch_startGame.
  ///
  /// In en, this message translates to:
  /// **'Start Game 🚀'**
  String get setup_memoryMatch_startGame;

  /// No description provided for @setup_memoryMatch_animals.
  ///
  /// In en, this message translates to:
  /// **'Animals'**
  String get setup_memoryMatch_animals;

  /// No description provided for @setup_memoryMatch_fruits.
  ///
  /// In en, this message translates to:
  /// **'Fruits'**
  String get setup_memoryMatch_fruits;

  /// No description provided for @setup_memoryMatch_vehicles.
  ///
  /// In en, this message translates to:
  /// **'Vehicles'**
  String get setup_memoryMatch_vehicles;

  /// No description provided for @setup_memoryMatch_space.
  ///
  /// In en, this message translates to:
  /// **'Space'**
  String get setup_memoryMatch_space;

  /// No description provided for @setup_memoryMatch_ocean.
  ///
  /// In en, this message translates to:
  /// **'Ocean'**
  String get setup_memoryMatch_ocean;

  /// No description provided for @setup_memoryMatch_formula1.
  ///
  /// In en, this message translates to:
  /// **'Formula 1'**
  String get setup_memoryMatch_formula1;

  /// No description provided for @setup_memoryMatch_easyDesc.
  ///
  /// In en, this message translates to:
  /// **'6 pairs - Perfect for beginners'**
  String get setup_memoryMatch_easyDesc;

  /// No description provided for @setup_memoryMatch_mediumDesc.
  ///
  /// In en, this message translates to:
  /// **'8 pairs - A good challenge'**
  String get setup_memoryMatch_mediumDesc;

  /// No description provided for @setup_memoryMatch_hardDesc.
  ///
  /// In en, this message translates to:
  /// **'10 pairs - For memory masters'**
  String get setup_memoryMatch_hardDesc;

  /// No description provided for @setup_memoryMatch_superHardDesc.
  ///
  /// In en, this message translates to:
  /// **'15 pairs (6×5) - Paid members only!'**
  String get setup_memoryMatch_superHardDesc;

  /// No description provided for @setup_memoryMatch_readyToPlay.
  ///
  /// In en, this message translates to:
  /// **'Ready to Play?'**
  String get setup_memoryMatch_readyToPlay;

  /// No description provided for @setup_memoryMatch_matchPairs.
  ///
  /// In en, this message translates to:
  /// **'Match all the pairs as fast as you can!'**
  String get setup_memoryMatch_matchPairs;

  /// No description provided for @setup_memoryMatch_theme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get setup_memoryMatch_theme;

  /// No description provided for @setup_memoryMatch_difficulty.
  ///
  /// In en, this message translates to:
  /// **'Difficulty'**
  String get setup_memoryMatch_difficulty;

  /// No description provided for @setup_memoryMatch_time.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get setup_memoryMatch_time;

  /// No description provided for @setup_memoryMatch_attempts.
  ///
  /// In en, this message translates to:
  /// **'Attempts'**
  String get setup_memoryMatch_attempts;

  /// No description provided for @setup_memoryMatch_matches.
  ///
  /// In en, this message translates to:
  /// **'Matches'**
  String get setup_memoryMatch_matches;

  /// No description provided for @setup_memoryMatch_pause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get setup_memoryMatch_pause;

  /// No description provided for @setup_memoryMatch_resume.
  ///
  /// In en, this message translates to:
  /// **'Resume'**
  String get setup_memoryMatch_resume;

  /// No description provided for @setup_memoryMatch_restart.
  ///
  /// In en, this message translates to:
  /// **'Restart'**
  String get setup_memoryMatch_restart;

  /// No description provided for @setup_memoryMatch_gamePaused.
  ///
  /// In en, this message translates to:
  /// **'Game Paused'**
  String get setup_memoryMatch_gamePaused;

  /// No description provided for @setup_contact_title.
  ///
  /// In en, this message translates to:
  /// **'Contact Us'**
  String get setup_contact_title;

  /// No description provided for @setup_contact_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Report a bug, request a feature, or just say hi!'**
  String get setup_contact_subtitle;

  /// No description provided for @setup_contact_whatsAbout.
  ///
  /// In en, this message translates to:
  /// **'What\'\'s this about?'**
  String get setup_contact_whatsAbout;

  /// No description provided for @setup_contact_bugReport.
  ///
  /// In en, this message translates to:
  /// **'Bug Report'**
  String get setup_contact_bugReport;

  /// No description provided for @setup_contact_featureRequest.
  ///
  /// In en, this message translates to:
  /// **'Feature Request'**
  String get setup_contact_featureRequest;

  /// No description provided for @setup_contact_question.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get setup_contact_question;

  /// No description provided for @setup_contact_other.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get setup_contact_other;

  /// No description provided for @setup_contact_from.
  ///
  /// In en, this message translates to:
  /// **'From:'**
  String get setup_contact_from;

  /// No description provided for @setup_contact_subject.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get setup_contact_subject;

  /// No description provided for @setup_contact_subjectPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Brief description...'**
  String get setup_contact_subjectPlaceholder;

  /// No description provided for @setup_contact_message.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get setup_contact_message;

  /// No description provided for @setup_contact_messagePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Tell us more...'**
  String get setup_contact_messagePlaceholder;

  /// No description provided for @setup_contact_send.
  ///
  /// In en, this message translates to:
  /// **'📨 Send Message'**
  String get setup_contact_send;

  /// No description provided for @setup_contact_sending.
  ///
  /// In en, this message translates to:
  /// **'⏳ Sending...'**
  String get setup_contact_sending;

  /// No description provided for @setup_contact_errorMsg.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get setup_contact_errorMsg;

  /// No description provided for @setup_contact_sentTitle.
  ///
  /// In en, this message translates to:
  /// **'Message Sent!'**
  String get setup_contact_sentTitle;

  /// No description provided for @setup_contact_sentMsg.
  ///
  /// In en, this message translates to:
  /// **'Thanks for reaching out. We\'\'ll get back to you soon.'**
  String get setup_contact_sentMsg;

  /// No description provided for @setup_contact_backToGames.
  ///
  /// In en, this message translates to:
  /// **'Back to Games'**
  String get setup_contact_backToGames;

  /// No description provided for @setup_civicsQuiz_title.
  ///
  /// In en, this message translates to:
  /// **'Civics Quiz'**
  String get setup_civicsQuiz_title;

  /// No description provided for @setup_civicsQuiz_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Master the official US Citizenship Test'**
  String get setup_civicsQuiz_subtitle;

  /// No description provided for @setup_civicsQuiz_based.
  ///
  /// In en, this message translates to:
  /// **'Based on the USCIS 100 Civics Questions'**
  String get setup_civicsQuiz_based;

  /// No description provided for @setup_civicsQuiz_allTopics.
  ///
  /// In en, this message translates to:
  /// **'All Topics'**
  String get setup_civicsQuiz_allTopics;

  /// No description provided for @setup_civicsQuiz_allTopicsDesc.
  ///
  /// In en, this message translates to:
  /// **'All 100 questions mixed together'**
  String get setup_civicsQuiz_allTopicsDesc;

  /// No description provided for @setup_civicsQuiz_americanGov.
  ///
  /// In en, this message translates to:
  /// **'American Government'**
  String get setup_civicsQuiz_americanGov;

  /// No description provided for @setup_civicsQuiz_americanGovDesc.
  ///
  /// In en, this message translates to:
  /// **'Principles, system, rights & responsibilities'**
  String get setup_civicsQuiz_americanGovDesc;

  /// No description provided for @setup_civicsQuiz_americanHistory.
  ///
  /// In en, this message translates to:
  /// **'American History'**
  String get setup_civicsQuiz_americanHistory;

  /// No description provided for @setup_civicsQuiz_americanHistoryDesc.
  ///
  /// In en, this message translates to:
  /// **'Colonial period, 1800s, and recent history'**
  String get setup_civicsQuiz_americanHistoryDesc;

  /// No description provided for @setup_civicsQuiz_integratedCivics.
  ///
  /// In en, this message translates to:
  /// **'Integrated Civics'**
  String get setup_civicsQuiz_integratedCivics;

  /// No description provided for @setup_civicsQuiz_integratedCivicsDesc.
  ///
  /// In en, this message translates to:
  /// **'Geography, symbols, and holidays'**
  String get setup_civicsQuiz_integratedCivicsDesc;

  /// No description provided for @setup_civicsQuiz_questions.
  ///
  /// In en, this message translates to:
  /// **'questions'**
  String get setup_civicsQuiz_questions;

  /// No description provided for @setup_civicsQuiz_aboutQuiz.
  ///
  /// In en, this message translates to:
  /// **'About This Quiz'**
  String get setup_civicsQuiz_aboutQuiz;

  /// No description provided for @setup_geoQuiz_title.
  ///
  /// In en, this message translates to:
  /// **'Geo Quiz'**
  String get setup_geoQuiz_title;

  /// No description provided for @setup_geoQuiz_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Test your geography knowledge!'**
  String get setup_geoQuiz_subtitle;

  /// No description provided for @setup_geoQuiz_info.
  ///
  /// In en, this message translates to:
  /// **'10 questions · Progressive hints · Fun facts'**
  String get setup_geoQuiz_info;

  /// No description provided for @setup_geoQuiz_howItWorks.
  ///
  /// In en, this message translates to:
  /// **'How It Works'**
  String get setup_geoQuiz_howItWorks;

  /// No description provided for @setup_geoQuiz_questionsLabel.
  ///
  /// In en, this message translates to:
  /// **'Questions'**
  String get setup_geoQuiz_questionsLabel;

  /// No description provided for @setup_geoQuiz_timerPerQ.
  ///
  /// In en, this message translates to:
  /// **'Timer per question'**
  String get setup_geoQuiz_timerPerQ;

  /// No description provided for @setup_geoQuiz_hintsAfter.
  ///
  /// In en, this message translates to:
  /// **'Hints after 5s & 10s'**
  String get setup_geoQuiz_hintsAfter;

  /// No description provided for @setup_geoQuiz_streakBonuses.
  ///
  /// In en, this message translates to:
  /// **'Streak bonuses'**
  String get setup_geoQuiz_streakBonuses;

  /// No description provided for @setup_geoQuiz_funFacts.
  ///
  /// In en, this message translates to:
  /// **'Fun facts after each answer'**
  String get setup_geoQuiz_funFacts;

  /// No description provided for @setup_geoModes_capitals.
  ///
  /// In en, this message translates to:
  /// **'Capitals'**
  String get setup_geoModes_capitals;

  /// No description provided for @setup_geoModes_flags.
  ///
  /// In en, this message translates to:
  /// **'Flags'**
  String get setup_geoModes_flags;

  /// No description provided for @setup_geoModes_usStates.
  ///
  /// In en, this message translates to:
  /// **'US States'**
  String get setup_geoModes_usStates;

  /// No description provided for @setup_geoModes_silhouettes.
  ///
  /// In en, this message translates to:
  /// **'Silhouettes'**
  String get setup_geoModes_silhouettes;

  /// No description provided for @setup_geoModes_continents.
  ///
  /// In en, this message translates to:
  /// **'Continents'**
  String get setup_geoModes_continents;

  /// No description provided for @setup_historyQuiz_title.
  ///
  /// In en, this message translates to:
  /// **'History Quiz'**
  String get setup_historyQuiz_title;

  /// No description provided for @setup_historyQuiz_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Famous quotes, events & people through the ages'**
  String get setup_historyQuiz_subtitle;

  /// No description provided for @setup_historyQuiz_info.
  ///
  /// In en, this message translates to:
  /// **'10 questions · Images · Fun facts after each answer'**
  String get setup_historyQuiz_info;

  /// No description provided for @setup_hangman_title.
  ///
  /// In en, this message translates to:
  /// **'Hangman'**
  String get setup_hangman_title;

  /// No description provided for @setup_hangman_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Guess the word before the hangman is complete!'**
  String get setup_hangman_subtitle;

  /// No description provided for @setup_hangman_info.
  ///
  /// In en, this message translates to:
  /// **'6 wrong guesses allowed · Hints provided · 5 rounds per game'**
  String get setup_hangman_info;

  /// No description provided for @setup_hangman_hintInfo.
  ///
  /// In en, this message translates to:
  /// **'Each word comes with a hint and category · Fewer wrong guesses = higher score'**
  String get setup_hangman_hintInfo;

  /// No description provided for @setup_hangman_upTo5.
  ///
  /// In en, this message translates to:
  /// **'Up to 5 letters'**
  String get setup_hangman_upTo5;

  /// No description provided for @setup_hangman_upTo10.
  ///
  /// In en, this message translates to:
  /// **'6-10 letters'**
  String get setup_hangman_upTo10;

  /// No description provided for @setup_hangman_moreThan10.
  ///
  /// In en, this message translates to:
  /// **'11+ letters'**
  String get setup_hangman_moreThan10;

  /// No description provided for @setup_hangman_rounds.
  ///
  /// In en, this message translates to:
  /// **'5 rounds'**
  String get setup_hangman_rounds;

  /// No description provided for @setup_ticTacToe_title.
  ///
  /// In en, this message translates to:
  /// **'Tic Tac Toe'**
  String get setup_ticTacToe_title;

  /// No description provided for @setup_ticTacToe_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Challenge the AI — Best of 5 rounds!'**
  String get setup_ticTacToe_subtitle;

  /// No description provided for @setup_ticTacToe_youAreX.
  ///
  /// In en, this message translates to:
  /// **'You are X · AI is O · Win, draw, or lose each round'**
  String get setup_ticTacToe_youAreX;

  /// No description provided for @setup_ticTacToe_randomAI.
  ///
  /// In en, this message translates to:
  /// **'Random AI'**
  String get setup_ticTacToe_randomAI;

  /// No description provided for @setup_ticTacToe_smartAI.
  ///
  /// In en, this message translates to:
  /// **'Smart AI'**
  String get setup_ticTacToe_smartAI;

  /// No description provided for @setup_ticTacToe_perfectAI.
  ///
  /// In en, this message translates to:
  /// **'Perfect AI'**
  String get setup_ticTacToe_perfectAI;

  /// No description provided for @setup_ticTacToe_greatForBeginners.
  ///
  /// In en, this message translates to:
  /// **'Great for beginners'**
  String get setup_ticTacToe_greatForBeginners;

  /// No description provided for @setup_ticTacToe_blocksYourWins.
  ///
  /// In en, this message translates to:
  /// **'Blocks your wins'**
  String get setup_ticTacToe_blocksYourWins;

  /// No description provided for @setup_ticTacToe_impossibleToBeat.
  ///
  /// In en, this message translates to:
  /// **'Impossible to beat — try to draw!'**
  String get setup_ticTacToe_impossibleToBeat;

  /// No description provided for @setup_ticTacToe_scoring.
  ///
  /// In en, this message translates to:
  /// **'Win = 300pts · Draw = 100pts · Lose = 0pts · Faster = bonus points'**
  String get setup_ticTacToe_scoring;

  /// No description provided for @scratchCoding_title.
  ///
  /// In en, this message translates to:
  /// **'Space Coder'**
  String get scratchCoding_title;

  /// No description provided for @scratchCoding_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Program your astronaut to the airlock with the fewest lines of code!'**
  String get scratchCoding_subtitle;

  /// No description provided for @scratchCoding_howToPlay.
  ///
  /// In en, this message translates to:
  /// **'How to Play'**
  String get scratchCoding_howToPlay;

  /// No description provided for @scratchCoding_chooseDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Choose Difficulty'**
  String get scratchCoding_chooseDifficulty;

  /// No description provided for @scratchCoding_startCoding.
  ///
  /// In en, this message translates to:
  /// **'Start Coding! 🚀'**
  String get scratchCoding_startCoding;

  /// No description provided for @scratchCoding_howToPlayStep1.
  ///
  /// In en, this message translates to:
  /// **'Click command buttons from the palette to add code lines'**
  String get scratchCoding_howToPlayStep1;

  /// No description provided for @scratchCoding_howToPlayStep2.
  ///
  /// In en, this message translates to:
  /// **'Build your program in the terminal-style code editor'**
  String get scratchCoding_howToPlayStep2;

  /// No description provided for @scratchCoding_howToPlayStep3.
  ///
  /// In en, this message translates to:
  /// **'Press Run and watch your astronaut follow the instructions!'**
  String get scratchCoding_howToPlayStep3;

  /// No description provided for @scratchCoding_blocks_onStart.
  ///
  /// In en, this message translates to:
  /// **'On Start'**
  String get scratchCoding_blocks_onStart;

  /// No description provided for @scratchCoding_blocks_moveForward.
  ///
  /// In en, this message translates to:
  /// **'Move Forward'**
  String get scratchCoding_blocks_moveForward;

  /// No description provided for @scratchCoding_blocks_turnLeft.
  ///
  /// In en, this message translates to:
  /// **'Turn Left'**
  String get scratchCoding_blocks_turnLeft;

  /// No description provided for @scratchCoding_blocks_turnRight.
  ///
  /// In en, this message translates to:
  /// **'Turn Right'**
  String get scratchCoding_blocks_turnRight;

  /// No description provided for @scratchCoding_blocks_repeat.
  ///
  /// In en, this message translates to:
  /// **'Repeat'**
  String get scratchCoding_blocks_repeat;

  /// No description provided for @scratchCoding_blocks_ifWallAhead.
  ///
  /// In en, this message translates to:
  /// **'If Asteroid Ahead'**
  String get scratchCoding_blocks_ifWallAhead;

  /// No description provided for @scratchCoding_blocks_ifOnGoal.
  ///
  /// In en, this message translates to:
  /// **'If At Airlock'**
  String get scratchCoding_blocks_ifOnGoal;

  /// No description provided for @scratchCoding_categories_motion.
  ///
  /// In en, this message translates to:
  /// **'Motion'**
  String get scratchCoding_categories_motion;

  /// No description provided for @scratchCoding_categories_control.
  ///
  /// In en, this message translates to:
  /// **'Control'**
  String get scratchCoding_categories_control;

  /// No description provided for @scratchCoding_categories_events.
  ///
  /// In en, this message translates to:
  /// **'Events'**
  String get scratchCoding_categories_events;

  /// No description provided for @scratchCoding_game_blocks.
  ///
  /// In en, this message translates to:
  /// **'Commands'**
  String get scratchCoding_game_blocks;

  /// No description provided for @scratchCoding_game_noMoreBlocks.
  ///
  /// In en, this message translates to:
  /// **'Maximum lines reached!'**
  String get scratchCoding_game_noMoreBlocks;

  /// No description provided for @scratchCoding_game_program.
  ///
  /// In en, this message translates to:
  /// **'Program'**
  String get scratchCoding_game_program;

  /// No description provided for @scratchCoding_game_blocksUsed.
  ///
  /// In en, this message translates to:
  /// **'{used}/{max} lines'**
  String scratchCoding_game_blocksUsed(String used, String max);

  /// No description provided for @scratchCoding_game_dragHere.
  ///
  /// In en, this message translates to:
  /// **'Click commands to add code here...'**
  String get scratchCoding_game_dragHere;

  /// No description provided for @scratchCoding_game_clearAll.
  ///
  /// In en, this message translates to:
  /// **'Clear All ✕'**
  String get scratchCoding_game_clearAll;

  /// No description provided for @scratchCoding_game_clickToRemove.
  ///
  /// In en, this message translates to:
  /// **'click to remove'**
  String get scratchCoding_game_clickToRemove;

  /// No description provided for @scratchCoding_game_run.
  ///
  /// In en, this message translates to:
  /// **'Run'**
  String get scratchCoding_game_run;

  /// No description provided for @scratchCoding_game_level.
  ///
  /// In en, this message translates to:
  /// **'Level {current}/{total}'**
  String scratchCoding_game_level(String current, String total);

  /// No description provided for @scratchCoding_game_levelComplete.
  ///
  /// In en, this message translates to:
  /// **'Level Complete!'**
  String get scratchCoding_game_levelComplete;

  /// No description provided for @scratchCoding_game_blocksUsedCount.
  ///
  /// In en, this message translates to:
  /// **'Solved in {count} lines'**
  String scratchCoding_game_blocksUsedCount(String count);

  /// No description provided for @scratchCoding_game_optimalSolution.
  ///
  /// In en, this message translates to:
  /// **'Optimal solution!'**
  String get scratchCoding_game_optimalSolution;

  /// No description provided for @scratchCoding_game_optimalHint.
  ///
  /// In en, this message translates to:
  /// **'Optimal: {count} lines'**
  String scratchCoding_game_optimalHint(String count);

  /// No description provided for @scratchCoding_game_nextLevel.
  ///
  /// In en, this message translates to:
  /// **'Next Level →'**
  String get scratchCoding_game_nextLevel;

  /// No description provided for @scratchCoding_game_seeScore.
  ///
  /// In en, this message translates to:
  /// **'See Score 🏆'**
  String get scratchCoding_game_seeScore;

  /// No description provided for @scratchCoding_game_tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again 🔄'**
  String get scratchCoding_game_tryAgain;

  /// No description provided for @scratchCoding_game_endGame.
  ///
  /// In en, this message translates to:
  /// **'End Game'**
  String get scratchCoding_game_endGame;

  /// No description provided for @scratchCoding_game_hitWall.
  ///
  /// In en, this message translates to:
  /// **'Astronaut hit an asteroid! ☄️'**
  String get scratchCoding_game_hitWall;

  /// No description provided for @scratchCoding_game_offGrid.
  ///
  /// In en, this message translates to:
  /// **'Astronaut drifted into space! ☄️'**
  String get scratchCoding_game_offGrid;

  /// No description provided for @scratchCoding_game_didntReachGoal.
  ///
  /// In en, this message translates to:
  /// **'Astronaut didn\'\'t reach the airlock 🤔'**
  String get scratchCoding_game_didntReachGoal;

  /// No description provided for @scratchCoding_game_tryDifferent.
  ///
  /// In en, this message translates to:
  /// **'Try a different sequence'**
  String get scratchCoding_game_tryDifferent;

  /// No description provided for @scratchCoding_difficulty_easy_label.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get scratchCoding_difficulty_easy_label;

  /// No description provided for @scratchCoding_difficulty_easy_desc.
  ///
  /// In en, this message translates to:
  /// **'6×6 grid · forward, turn'**
  String get scratchCoding_difficulty_easy_desc;

  /// No description provided for @scratchCoding_difficulty_easy_features.
  ///
  /// In en, this message translates to:
  /// **'forward() · turn-left() · turn-right()'**
  String get scratchCoding_difficulty_easy_features;

  /// No description provided for @scratchCoding_difficulty_medium_label.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get scratchCoding_difficulty_medium_label;

  /// No description provided for @scratchCoding_difficulty_medium_desc.
  ///
  /// In en, this message translates to:
  /// **'8×8 grid · loops!'**
  String get scratchCoding_difficulty_medium_desc;

  /// No description provided for @scratchCoding_difficulty_medium_features.
  ///
  /// In en, this message translates to:
  /// **'forward() · turns · loop(n)'**
  String get scratchCoding_difficulty_medium_features;

  /// No description provided for @scratchCoding_difficulty_hard_label.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get scratchCoding_difficulty_hard_label;

  /// No description provided for @scratchCoding_difficulty_hard_desc.
  ///
  /// In en, this message translates to:
  /// **'12×12 grid · obstacles & conditionals'**
  String get scratchCoding_difficulty_hard_desc;

  /// No description provided for @scratchCoding_difficulty_hard_features.
  ///
  /// In en, this message translates to:
  /// **'All commands · jump() · if/while'**
  String get scratchCoding_difficulty_hard_features;

  /// No description provided for @scratchCoding_nesting_ifLabel.
  ///
  /// In en, this message translates to:
  /// **'If'**
  String get scratchCoding_nesting_ifLabel;

  /// No description provided for @scratchCoding_nesting_elseLabel.
  ///
  /// In en, this message translates to:
  /// **'Else'**
  String get scratchCoding_nesting_elseLabel;

  /// No description provided for @scratchCoding_nesting_dropHere.
  ///
  /// In en, this message translates to:
  /// **'Drop blocks here'**
  String get scratchCoding_nesting_dropHere;

  /// No description provided for @scratchCoding_nesting_maxDepthReached.
  ///
  /// In en, this message translates to:
  /// **'Maximum nesting depth reached!'**
  String get scratchCoding_nesting_maxDepthReached;

  /// No description provided for @scratchCoding_nesting_perfectEfficiency.
  ///
  /// In en, this message translates to:
  /// **'Perfect Code ⚡'**
  String get scratchCoding_nesting_perfectEfficiency;

  /// No description provided for @scratchCoding_nesting_goodEfficiency.
  ///
  /// In en, this message translates to:
  /// **'Clean Code 👍'**
  String get scratchCoding_nesting_goodEfficiency;

  /// No description provided for @scratchCoding_nesting_canImprove.
  ///
  /// In en, this message translates to:
  /// **'Can improve — use fewer lines!'**
  String get scratchCoding_nesting_canImprove;

  /// No description provided for @scratchCoding_hints_easy1.
  ///
  /// In en, this message translates to:
  /// **'Move right to reach the airlock — use forward() five times'**
  String get scratchCoding_hints_easy1;

  /// No description provided for @scratchCoding_hints_easy2.
  ///
  /// In en, this message translates to:
  /// **'Move right and down to reach the airlock'**
  String get scratchCoding_hints_easy2;

  /// No description provided for @scratchCoding_hints_easy3.
  ///
  /// In en, this message translates to:
  /// **'Go around the wall — U-turn through the corridor'**
  String get scratchCoding_hints_easy3;

  /// No description provided for @scratchCoding_hints_easy4.
  ///
  /// In en, this message translates to:
  /// **'Navigate around the asteroids with turns'**
  String get scratchCoding_hints_easy4;

  /// No description provided for @scratchCoding_hints_easy5.
  ///
  /// In en, this message translates to:
  /// **'Zigzag through the S-shaped corridor'**
  String get scratchCoding_hints_easy5;

  /// No description provided for @scratchCoding_hints_medium1.
  ///
  /// In en, this message translates to:
  /// **'See the staircase pattern? Use loop() to repeat: forward + turn + forward + turn'**
  String get scratchCoding_hints_medium1;

  /// No description provided for @scratchCoding_hints_medium2.
  ///
  /// In en, this message translates to:
  /// **'The path zigzags — use loop() to repeat the zigzag pattern'**
  String get scratchCoding_hints_medium2;

  /// No description provided for @scratchCoding_hints_medium3.
  ///
  /// In en, this message translates to:
  /// **'Navigate the spiral — loops help with repeating patterns'**
  String get scratchCoding_hints_medium3;

  /// No description provided for @scratchCoding_hints_medium4.
  ///
  /// In en, this message translates to:
  /// **'Two identical L-turns — put the L-shape inside a loop(2)'**
  String get scratchCoding_hints_medium4;

  /// No description provided for @scratchCoding_hints_medium5.
  ///
  /// In en, this message translates to:
  /// **'Tiny diagonal steps repeat 6 times — perfect for a loop()'**
  String get scratchCoding_hints_medium5;

  /// No description provided for @scratchCoding_hints_hard1.
  ///
  /// In en, this message translates to:
  /// **'Obstacles block your path! Use jump() to hop over them'**
  String get scratchCoding_hints_hard1;

  /// No description provided for @scratchCoding_hints_hard2.
  ///
  /// In en, this message translates to:
  /// **'Use if(obstacle-ahead) to decide when to jump'**
  String get scratchCoding_hints_hard2;

  /// No description provided for @scratchCoding_hints_hard3.
  ///
  /// In en, this message translates to:
  /// **'Dense obstacles — combine jump() with if(obstacle-ahead) and its else branch'**
  String get scratchCoding_hints_hard3;

  /// No description provided for @scratchCoding_hints_hard4.
  ///
  /// In en, this message translates to:
  /// **'Use if(obstacle-ahead) to navigate around obstacles'**
  String get scratchCoding_hints_hard4;

  /// No description provided for @scratchCoding_hints_hard5.
  ///
  /// In en, this message translates to:
  /// **'Use while(not-at-goal) to keep moving until you reach the airlock'**
  String get scratchCoding_hints_hard5;

  /// No description provided for @spaceCoder_commands_forward.
  ///
  /// In en, this message translates to:
  /// **'forward()'**
  String get spaceCoder_commands_forward;

  /// No description provided for @spaceCoder_commands_turnLeft.
  ///
  /// In en, this message translates to:
  /// **'turn-left()'**
  String get spaceCoder_commands_turnLeft;

  /// No description provided for @spaceCoder_commands_turnRight.
  ///
  /// In en, this message translates to:
  /// **'turn-right()'**
  String get spaceCoder_commands_turnRight;

  /// No description provided for @spaceCoder_commands_jump.
  ///
  /// In en, this message translates to:
  /// **'jump()'**
  String get spaceCoder_commands_jump;

  /// No description provided for @spaceCoder_commands_loop.
  ///
  /// In en, this message translates to:
  /// **'loop(n)'**
  String get spaceCoder_commands_loop;

  /// No description provided for @spaceCoder_commands_if.
  ///
  /// In en, this message translates to:
  /// **'if(...)'**
  String get spaceCoder_commands_if;

  /// No description provided for @spaceCoder_commands_while.
  ///
  /// In en, this message translates to:
  /// **'while(...)'**
  String get spaceCoder_commands_while;

  /// No description provided for @spaceCoder_commands_varNumDecl.
  ///
  /// In en, this message translates to:
  /// **'var-num'**
  String get spaceCoder_commands_varNumDecl;

  /// No description provided for @spaceCoder_commands_varCharDecl.
  ///
  /// In en, this message translates to:
  /// **'var-char'**
  String get spaceCoder_commands_varCharDecl;

  /// No description provided for @spaceCoder_commands_varNumInc.
  ///
  /// In en, this message translates to:
  /// **'var-num++'**
  String get spaceCoder_commands_varNumInc;

  /// No description provided for @spaceCoder_commands_varNumDec.
  ///
  /// In en, this message translates to:
  /// **'var-num--'**
  String get spaceCoder_commands_varNumDec;

  /// No description provided for @spaceCoder_conditions_sensorMode.
  ///
  /// In en, this message translates to:
  /// **'Sensor'**
  String get spaceCoder_conditions_sensorMode;

  /// No description provided for @spaceCoder_conditions_comparisonMode.
  ///
  /// In en, this message translates to:
  /// **'Compare'**
  String get spaceCoder_conditions_comparisonMode;

  /// No description provided for @spaceCoder_conditions_obstacleAhead.
  ///
  /// In en, this message translates to:
  /// **'obstacle-ahead()'**
  String get spaceCoder_conditions_obstacleAhead;

  /// No description provided for @spaceCoder_conditions_atGoal.
  ///
  /// In en, this message translates to:
  /// **'at-goal()'**
  String get spaceCoder_conditions_atGoal;

  /// No description provided for @spaceCoder_conditions_notAtGoal.
  ///
  /// In en, this message translates to:
  /// **'not-at-goal()'**
  String get spaceCoder_conditions_notAtGoal;

  /// No description provided for @spaceCoder_conditions_edgeAhead.
  ///
  /// In en, this message translates to:
  /// **'edge-ahead()'**
  String get spaceCoder_conditions_edgeAhead;

  /// No description provided for @spaceCoder_variables_sectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Variables'**
  String get spaceCoder_variables_sectionTitle;

  /// No description provided for @spaceCoder_variables_numLabel.
  ///
  /// In en, this message translates to:
  /// **'Number'**
  String get spaceCoder_variables_numLabel;

  /// No description provided for @spaceCoder_variables_charLabel.
  ///
  /// In en, this message translates to:
  /// **'Character'**
  String get spaceCoder_variables_charLabel;

  /// No description provided for @spaceCoder_editor_lineNumbers.
  ///
  /// In en, this message translates to:
  /// **'Line Numbers'**
  String get spaceCoder_editor_lineNumbers;

  /// No description provided for @spaceCoder_editor_clearAll.
  ///
  /// In en, this message translates to:
  /// **'Clear All'**
  String get spaceCoder_editor_clearAll;

  /// No description provided for @spaceCoder_editor_insertionHint.
  ///
  /// In en, this message translates to:
  /// **'Click a command to insert it here'**
  String get spaceCoder_editor_insertionHint;

  /// No description provided for @spaceCoder_editor_maxLinesReached.
  ///
  /// In en, this message translates to:
  /// **'Maximum lines reached!'**
  String get spaceCoder_editor_maxLinesReached;

  /// No description provided for @spaceCoder_errors_collision.
  ///
  /// In en, this message translates to:
  /// **'Astronaut hit an asteroid! ☄️'**
  String get spaceCoder_errors_collision;

  /// No description provided for @spaceCoder_errors_hitObstacle.
  ///
  /// In en, this message translates to:
  /// **'Astronaut hit a rock! Use jump() to hop over obstacles 🪨'**
  String get spaceCoder_errors_hitObstacle;

  /// No description provided for @spaceCoder_errors_outOfBounds.
  ///
  /// In en, this message translates to:
  /// **'Astronaut drifted into space! ☄️'**
  String get spaceCoder_errors_outOfBounds;

  /// No description provided for @spaceCoder_errors_noObstacleToJump.
  ///
  /// In en, this message translates to:
  /// **'Nothing to jump over! jump() needs an obstacle ahead 🤔'**
  String get spaceCoder_errors_noObstacleToJump;

  /// No description provided for @spaceCoder_errors_jumpLandingBlocked.
  ///
  /// In en, this message translates to:
  /// **'Can\'\'t land there! The landing spot is blocked ☄️'**
  String get spaceCoder_errors_jumpLandingBlocked;

  /// No description provided for @spaceCoder_errors_infiniteLoop.
  ///
  /// In en, this message translates to:
  /// **'Program ran too long! Check your loops 🔄'**
  String get spaceCoder_errors_infiniteLoop;

  /// No description provided for @spaceCoder_errors_undefinedVarNum.
  ///
  /// In en, this message translates to:
  /// **'Variable not defined! Add var-num = <value> before using it.'**
  String get spaceCoder_errors_undefinedVarNum;

  /// No description provided for @spaceCoder_errors_undefinedVarChar.
  ///
  /// In en, this message translates to:
  /// **'Variable not defined! Add var-char = \'\'<value>\'\' before using it.'**
  String get spaceCoder_errors_undefinedVarChar;

  /// No description provided for @spaceCoder_efficiency_perfectCode.
  ///
  /// In en, this message translates to:
  /// **'Perfect Code ⚡'**
  String get spaceCoder_efficiency_perfectCode;

  /// No description provided for @spaceCoder_efficiency_cleanCode.
  ///
  /// In en, this message translates to:
  /// **'Clean Code 👍'**
  String get spaceCoder_efficiency_cleanCode;

  /// No description provided for @gameplay_loadingQuestions.
  ///
  /// In en, this message translates to:
  /// **'Loading questions...'**
  String get gameplay_loadingQuestions;

  /// No description provided for @gameplay_whichCountry.
  ///
  /// In en, this message translates to:
  /// **'Which country is this?'**
  String get gameplay_whichCountry;

  /// No description provided for @gameplay_guessesLeft.
  ///
  /// In en, this message translates to:
  /// **'{count} guesses left'**
  String gameplay_guessesLeft(String count);

  /// No description provided for @gameplay_theWordWas.
  ///
  /// In en, this message translates to:
  /// **'The word was: {word}'**
  String gameplay_theWordWas(String word);

  /// No description provided for @gameplay_theAnswerWas.
  ///
  /// In en, this message translates to:
  /// **'The answer was: {answer}'**
  String gameplay_theAnswerWas(String answer);

  /// No description provided for @gameplay_answer.
  ///
  /// In en, this message translates to:
  /// **'Answer: {answer}'**
  String gameplay_answer(String answer);

  /// No description provided for @gameplay_englishOnlyBadge.
  ///
  /// In en, this message translates to:
  /// **'🌐 Content in English only'**
  String get gameplay_englishOnlyBadge;

  /// No description provided for @gameplay_nameEvent.
  ///
  /// In en, this message translates to:
  /// **'Name the Event'**
  String get gameplay_nameEvent;

  /// No description provided for @gameplay_whenHappened.
  ///
  /// In en, this message translates to:
  /// **'When Did It Happen?'**
  String get gameplay_whenHappened;

  /// No description provided for @gameplay_whoSaidIt.
  ///
  /// In en, this message translates to:
  /// **'Who Said It?'**
  String get gameplay_whoSaidIt;

  /// No description provided for @gameplay_yourTurn.
  ///
  /// In en, this message translates to:
  /// **'Your turn'**
  String get gameplay_yourTurn;

  /// No description provided for @gameplay_aiThinking.
  ///
  /// In en, this message translates to:
  /// **'AI thinking...'**
  String get gameplay_aiThinking;

  /// No description provided for @gameplay_wins.
  ///
  /// In en, this message translates to:
  /// **'Wins'**
  String get gameplay_wins;

  /// No description provided for @gameplay_draws.
  ///
  /// In en, this message translates to:
  /// **'Draws'**
  String get gameplay_draws;

  /// No description provided for @gameplay_losses.
  ///
  /// In en, this message translates to:
  /// **'Losses'**
  String get gameplay_losses;

  /// No description provided for @gameplay_youWin.
  ///
  /// In en, this message translates to:
  /// **'You Win! +300'**
  String get gameplay_youWin;

  /// No description provided for @gameplay_draw.
  ///
  /// In en, this message translates to:
  /// **'Draw! +100'**
  String get gameplay_draw;

  /// No description provided for @gameplay_aiWins.
  ///
  /// In en, this message translates to:
  /// **'AI Wins!'**
  String get gameplay_aiWins;

  /// No description provided for @patternRecall_setup_title.
  ///
  /// In en, this message translates to:
  /// **'Pattern Recall'**
  String get patternRecall_setup_title;

  /// No description provided for @patternRecall_setup_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Memorize and repeat the pattern!'**
  String get patternRecall_setup_subtitle;

  /// No description provided for @patternRecall_setup_chooseTheme.
  ///
  /// In en, this message translates to:
  /// **'Choose a Theme'**
  String get patternRecall_setup_chooseTheme;

  /// No description provided for @patternRecall_setup_chooseDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Choose Difficulty'**
  String get patternRecall_setup_chooseDifficulty;

  /// No description provided for @patternRecall_setup_startGame.
  ///
  /// In en, this message translates to:
  /// **'Start Game! 🧩'**
  String get patternRecall_setup_startGame;

  /// No description provided for @patternRecall_setup_selectBoth.
  ///
  /// In en, this message translates to:
  /// **'Select theme & difficulty'**
  String get patternRecall_setup_selectBoth;

  /// No description provided for @patternRecall_themes_colors.
  ///
  /// In en, this message translates to:
  /// **'Colors'**
  String get patternRecall_themes_colors;

  /// No description provided for @patternRecall_themes_animals.
  ///
  /// In en, this message translates to:
  /// **'Animals'**
  String get patternRecall_themes_animals;

  /// No description provided for @patternRecall_themes_musicalNotes.
  ///
  /// In en, this message translates to:
  /// **'Musical Notes'**
  String get patternRecall_themes_musicalNotes;

  /// No description provided for @patternRecall_themes_emojis.
  ///
  /// In en, this message translates to:
  /// **'Emojis'**
  String get patternRecall_themes_emojis;

  /// No description provided for @patternRecall_difficulty_easy.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get patternRecall_difficulty_easy;

  /// No description provided for @patternRecall_difficulty_medium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get patternRecall_difficulty_medium;

  /// No description provided for @patternRecall_difficulty_hard.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get patternRecall_difficulty_hard;

  /// No description provided for @patternRecall_difficulty_easyDesc.
  ///
  /// In en, this message translates to:
  /// **'Slower playback, 4 items'**
  String get patternRecall_difficulty_easyDesc;

  /// No description provided for @patternRecall_difficulty_mediumDesc.
  ///
  /// In en, this message translates to:
  /// **'Medium speed, 5 items'**
  String get patternRecall_difficulty_mediumDesc;

  /// No description provided for @patternRecall_difficulty_hardDesc.
  ///
  /// In en, this message translates to:
  /// **'Fast playback, 6 items'**
  String get patternRecall_difficulty_hardDesc;

  /// No description provided for @patternRecall_game_round.
  ///
  /// In en, this message translates to:
  /// **'Round {current}'**
  String patternRecall_game_round(String current);

  /// No description provided for @patternRecall_game_time.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get patternRecall_game_time;

  /// No description provided for @patternRecall_game_watchPattern.
  ///
  /// In en, this message translates to:
  /// **'Watch the pattern!'**
  String get patternRecall_game_watchPattern;

  /// No description provided for @patternRecall_game_lives.
  ///
  /// In en, this message translates to:
  /// **'Lives'**
  String get patternRecall_game_lives;

  /// No description provided for @patternRecall_game_livesLeft.
  ///
  /// In en, this message translates to:
  /// **'Lives: {count}'**
  String patternRecall_game_livesLeft(String count);

  /// No description provided for @patternRecall_game_yourTurn.
  ///
  /// In en, this message translates to:
  /// **'Your turn!'**
  String get patternRecall_game_yourTurn;

  /// No description provided for @patternRecall_game_correct.
  ///
  /// In en, this message translates to:
  /// **'Correct!'**
  String get patternRecall_game_correct;

  /// No description provided for @patternRecall_game_nextRound.
  ///
  /// In en, this message translates to:
  /// **'Next round...'**
  String get patternRecall_game_nextRound;

  /// No description provided for @patternRecall_game_gameOver.
  ///
  /// In en, this message translates to:
  /// **'Game Over!'**
  String get patternRecall_game_gameOver;

  /// No description provided for @patternRecall_game_roundsCompleted.
  ///
  /// In en, this message translates to:
  /// **'Rounds completed: {count}'**
  String patternRecall_game_roundsCompleted(String count);

  /// No description provided for @patternRecall_game_totalTime.
  ///
  /// In en, this message translates to:
  /// **'Total time: {time}'**
  String patternRecall_game_totalTime(String time);

  /// No description provided for @patternRecall_game_seeScore.
  ///
  /// In en, this message translates to:
  /// **'See Score 🏆'**
  String get patternRecall_game_seeScore;

  /// No description provided for @patternRecall_game_tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get patternRecall_game_tryAgain;

  /// No description provided for @patternRecall_items_red.
  ///
  /// In en, this message translates to:
  /// **'Red'**
  String get patternRecall_items_red;

  /// No description provided for @patternRecall_items_blue.
  ///
  /// In en, this message translates to:
  /// **'Blue'**
  String get patternRecall_items_blue;

  /// No description provided for @patternRecall_items_green.
  ///
  /// In en, this message translates to:
  /// **'Green'**
  String get patternRecall_items_green;

  /// No description provided for @patternRecall_items_yellow.
  ///
  /// In en, this message translates to:
  /// **'Yellow'**
  String get patternRecall_items_yellow;

  /// No description provided for @patternRecall_items_purple.
  ///
  /// In en, this message translates to:
  /// **'Purple'**
  String get patternRecall_items_purple;

  /// No description provided for @patternRecall_items_orange.
  ///
  /// In en, this message translates to:
  /// **'Orange'**
  String get patternRecall_items_orange;

  /// No description provided for @patternRecall_items_dog.
  ///
  /// In en, this message translates to:
  /// **'Dog'**
  String get patternRecall_items_dog;

  /// No description provided for @patternRecall_items_cat.
  ///
  /// In en, this message translates to:
  /// **'Cat'**
  String get patternRecall_items_cat;

  /// No description provided for @patternRecall_items_rabbit.
  ///
  /// In en, this message translates to:
  /// **'Rabbit'**
  String get patternRecall_items_rabbit;

  /// No description provided for @patternRecall_items_bear.
  ///
  /// In en, this message translates to:
  /// **'Bear'**
  String get patternRecall_items_bear;

  /// No description provided for @patternRecall_items_fox.
  ///
  /// In en, this message translates to:
  /// **'Fox'**
  String get patternRecall_items_fox;

  /// No description provided for @patternRecall_items_penguin.
  ///
  /// In en, this message translates to:
  /// **'Penguin'**
  String get patternRecall_items_penguin;

  /// No description provided for @patternRecall_items_quarterNote.
  ///
  /// In en, this message translates to:
  /// **'Quarter Note'**
  String get patternRecall_items_quarterNote;

  /// No description provided for @patternRecall_items_eighthNote.
  ///
  /// In en, this message translates to:
  /// **'Eighth Note'**
  String get patternRecall_items_eighthNote;

  /// No description provided for @patternRecall_items_trumpet.
  ///
  /// In en, this message translates to:
  /// **'Trumpet'**
  String get patternRecall_items_trumpet;

  /// No description provided for @patternRecall_items_guitar.
  ///
  /// In en, this message translates to:
  /// **'Guitar'**
  String get patternRecall_items_guitar;

  /// No description provided for @patternRecall_items_drum.
  ///
  /// In en, this message translates to:
  /// **'Drum'**
  String get patternRecall_items_drum;

  /// No description provided for @patternRecall_items_piano.
  ///
  /// In en, this message translates to:
  /// **'Piano'**
  String get patternRecall_items_piano;

  /// No description provided for @patternRecall_items_smile.
  ///
  /// In en, this message translates to:
  /// **'Smile'**
  String get patternRecall_items_smile;

  /// No description provided for @patternRecall_items_heart.
  ///
  /// In en, this message translates to:
  /// **'Heart'**
  String get patternRecall_items_heart;

  /// No description provided for @patternRecall_items_star.
  ///
  /// In en, this message translates to:
  /// **'Star'**
  String get patternRecall_items_star;

  /// No description provided for @patternRecall_items_fire.
  ///
  /// In en, this message translates to:
  /// **'Fire'**
  String get patternRecall_items_fire;

  /// No description provided for @patternRecall_items_rainbow.
  ///
  /// In en, this message translates to:
  /// **'Rainbow'**
  String get patternRecall_items_rainbow;

  /// No description provided for @patternRecall_items_rocket.
  ///
  /// In en, this message translates to:
  /// **'Rocket'**
  String get patternRecall_items_rocket;

  /// No description provided for @spaceEntry_title.
  ///
  /// In en, this message translates to:
  /// **'Space Entry'**
  String get spaceEntry_title;

  /// No description provided for @spaceEntry_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Land your spacecraft safely on Earth!'**
  String get spaceEntry_subtitle;

  /// No description provided for @spaceEntry_chooseDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Mission Difficulty'**
  String get spaceEntry_chooseDifficulty;

  /// No description provided for @spaceEntry_easyDesc.
  ///
  /// In en, this message translates to:
  /// **'3 puzzles, wider angle tolerance, stronger heat shield'**
  String get spaceEntry_easyDesc;

  /// No description provided for @spaceEntry_mediumDesc.
  ///
  /// In en, this message translates to:
  /// **'5 puzzles, all variables active, moderate tolerances'**
  String get spaceEntry_mediumDesc;

  /// No description provided for @spaceEntry_hardDesc.
  ///
  /// In en, this message translates to:
  /// **'7 puzzles, tight tolerances, turbulence, limited heat shield'**
  String get spaceEntry_hardDesc;

  /// No description provided for @spaceEntry_startMission.
  ///
  /// In en, this message translates to:
  /// **'Launch Mission'**
  String get spaceEntry_startMission;

  /// No description provided for @spaceEntry_selectDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Select a difficulty to launch'**
  String get spaceEntry_selectDifficulty;

  /// No description provided for @spaceEntry_missionControl.
  ///
  /// In en, this message translates to:
  /// **'Mission Control'**
  String get spaceEntry_missionControl;

  /// No description provided for @spaceEntry_target.
  ///
  /// In en, this message translates to:
  /// **'Target'**
  String get spaceEntry_target;

  /// No description provided for @spaceEntry_entryAngle.
  ///
  /// In en, this message translates to:
  /// **'Entry Angle'**
  String get spaceEntry_entryAngle;

  /// No description provided for @spaceEntry_heatShield.
  ///
  /// In en, this message translates to:
  /// **'Heat Shield'**
  String get spaceEntry_heatShield;

  /// No description provided for @spaceEntry_atmosphericDensity.
  ///
  /// In en, this message translates to:
  /// **'Atmospheric Density'**
  String get spaceEntry_atmosphericDensity;

  /// No description provided for @spaceEntry_turbulenceWarning.
  ///
  /// In en, this message translates to:
  /// **'Turbulence Active'**
  String get spaceEntry_turbulenceWarning;

  /// No description provided for @spaceEntry_initiateReentry.
  ///
  /// In en, this message translates to:
  /// **'Initiate Reentry'**
  String get spaceEntry_initiateReentry;

  /// No description provided for @spaceEntry_landingAccuracy.
  ///
  /// In en, this message translates to:
  /// **'Landing Accuracy'**
  String get spaceEntry_landingAccuracy;

  /// No description provided for @spaceEntry_successTitle.
  ///
  /// In en, this message translates to:
  /// **'Successful Landing!'**
  String get spaceEntry_successTitle;

  /// No description provided for @spaceEntry_burnUpTitle.
  ///
  /// In en, this message translates to:
  /// **'Orbital Burn-up'**
  String get spaceEntry_burnUpTitle;

  /// No description provided for @spaceEntry_burnUpMessage.
  ///
  /// In en, this message translates to:
  /// **'Entry angle too steep — heat shield failed'**
  String get spaceEntry_burnUpMessage;

  /// No description provided for @spaceEntry_skipOffTitle.
  ///
  /// In en, this message translates to:
  /// **'Skip-off'**
  String get spaceEntry_skipOffTitle;

  /// No description provided for @spaceEntry_skipOffMessage.
  ///
  /// In en, this message translates to:
  /// **'Entry angle too shallow — spacecraft bounced off atmosphere'**
  String get spaceEntry_skipOffMessage;

  /// No description provided for @spaceEntry_geographyFact.
  ///
  /// In en, this message translates to:
  /// **'Did You Know?'**
  String get spaceEntry_geographyFact;

  /// No description provided for @spaceEntry_seeScore.
  ///
  /// In en, this message translates to:
  /// **'See Score'**
  String get spaceEntry_seeScore;

  /// No description provided for @spaceEntry_tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get spaceEntry_tryAgain;

  /// No description provided for @spaceEntry_heatShieldAtFailure.
  ///
  /// In en, this message translates to:
  /// **'Heat Shield at Failure'**
  String get spaceEntry_heatShieldAtFailure;

  /// No description provided for @spaceEntry_angleUsed.
  ///
  /// In en, this message translates to:
  /// **'Entry Angle Used'**
  String get spaceEntry_angleUsed;

  /// No description provided for @spaceEntry_remaining.
  ///
  /// In en, this message translates to:
  /// **'Remaining'**
  String get spaceEntry_remaining;

  /// No description provided for @spaceEntry_hintEasy.
  ///
  /// In en, this message translates to:
  /// **'💡 Safe range: 5° - 12°'**
  String get spaceEntry_hintEasy;

  /// No description provided for @spaceEntry_hintMedium.
  ///
  /// In en, this message translates to:
  /// **'💡 Aim for around 7°'**
  String get spaceEntry_hintMedium;

  /// No description provided for @spaceEntry_countdown.
  ///
  /// In en, this message translates to:
  /// **'Time Left'**
  String get spaceEntry_countdown;

  /// No description provided for @spaceEntry_autoFire.
  ///
  /// In en, this message translates to:
  /// **'Auto-firing in {seconds}s!'**
  String spaceEntry_autoFire(String seconds);

  /// No description provided for @spaceEntry_thrusterPower.
  ///
  /// In en, this message translates to:
  /// **'Thruster Power'**
  String get spaceEntry_thrusterPower;

  /// No description provided for @spaceEntry_lateralCorrection.
  ///
  /// In en, this message translates to:
  /// **'Lateral Correction'**
  String get spaceEntry_lateralCorrection;

  /// No description provided for @spaceEntry_optimalThruster.
  ///
  /// In en, this message translates to:
  /// **'Optimal: ~{value}%'**
  String spaceEntry_optimalThruster(String value);

  /// No description provided for @spaceEntry_tutorialEasy.
  ///
  /// In en, this message translates to:
  /// **'🎯 Adjust the entry angle to land safely. Watch the trajectory color!'**
  String get spaceEntry_tutorialEasy;

  /// No description provided for @spaceEntry_tutorialMedium.
  ///
  /// In en, this message translates to:
  /// **'🎯 Set your entry angle AND thruster power. Higher thrust = faster landing but more heat shield damage!'**
  String get spaceEntry_tutorialMedium;

  /// No description provided for @spaceEntry_tutorialHard.
  ///
  /// In en, this message translates to:
  /// **'🎯 Master all 3 controls: angle, thruster power, and lateral correction. No hints — trust your instruments!'**
  String get spaceEntry_tutorialHard;

  /// No description provided for @spaceEntry_predictedLanding.
  ///
  /// In en, this message translates to:
  /// **'Predicted Landing'**
  String get spaceEntry_predictedLanding;

  /// No description provided for @spaceEntry_accuracy.
  ///
  /// In en, this message translates to:
  /// **'Accuracy'**
  String get spaceEntry_accuracy;

  /// No description provided for @spaceEntry_distanceFromTarget.
  ///
  /// In en, this message translates to:
  /// **'Distance'**
  String get spaceEntry_distanceFromTarget;

  /// No description provided for @spaceEntry_solveToCalculate.
  ///
  /// In en, this message translates to:
  /// **'Solve to calculate:'**
  String get spaceEntry_solveToCalculate;

  /// No description provided for @spaceEntry_yourAnswer.
  ///
  /// In en, this message translates to:
  /// **'Your answer'**
  String get spaceEntry_yourAnswer;

  /// No description provided for @spaceEntry_submit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get spaceEntry_submit;

  /// No description provided for @spaceEntry_correctAnswer.
  ///
  /// In en, this message translates to:
  /// **'Correct!'**
  String get spaceEntry_correctAnswer;

  /// No description provided for @spaceEntry_wrongAnswer.
  ///
  /// In en, this message translates to:
  /// **'Wrong! Answer was {answer}'**
  String spaceEntry_wrongAnswer(String answer);

  /// No description provided for @spaceEntry_allPuzzlesSolved.
  ///
  /// In en, this message translates to:
  /// **'All calculations complete!'**
  String get spaceEntry_allPuzzlesSolved;

  /// No description provided for @spaceEntry_puzzlesRemaining.
  ///
  /// In en, this message translates to:
  /// **'{count} calculation(s) remaining'**
  String spaceEntry_puzzlesRemaining(String count);

  /// No description provided for @spaceEntry_controlPuzzles.
  ///
  /// In en, this message translates to:
  /// **'Flight Controls'**
  String get spaceEntry_controlPuzzles;

  /// No description provided for @spaceEntry_missionChecks.
  ///
  /// In en, this message translates to:
  /// **'Mission Checks'**
  String get spaceEntry_missionChecks;

  /// No description provided for @spaceEntry_puzzleScore.
  ///
  /// In en, this message translates to:
  /// **'Puzzles Correct'**
  String get spaceEntry_puzzleScore;

  /// No description provided for @mathMaze_title.
  ///
  /// In en, this message translates to:
  /// **'Math Maze'**
  String get mathMaze_title;

  /// No description provided for @mathMaze_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Solve equations to find your way!'**
  String get mathMaze_subtitle;

  /// No description provided for @mathMaze_chooseLevel.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Level'**
  String get mathMaze_chooseLevel;

  /// No description provided for @mathMaze_easyDesc.
  ///
  /// In en, this message translates to:
  /// **'Addition & subtraction, small maze, 3 min'**
  String get mathMaze_easyDesc;

  /// No description provided for @mathMaze_mediumDesc.
  ///
  /// In en, this message translates to:
  /// **'All 4 operations, medium maze, 4 min'**
  String get mathMaze_mediumDesc;

  /// No description provided for @mathMaze_hardDesc.
  ///
  /// In en, this message translates to:
  /// **'Advanced math & algebra, large maze, 5 min'**
  String get mathMaze_hardDesc;

  /// No description provided for @mathMaze_startGame.
  ///
  /// In en, this message translates to:
  /// **'Enter the Maze!'**
  String get mathMaze_startGame;

  /// No description provided for @mathMaze_selectLevel.
  ///
  /// In en, this message translates to:
  /// **'Select a Level'**
  String get mathMaze_selectLevel;

  /// No description provided for @mathMaze_gateHint.
  ///
  /// In en, this message translates to:
  /// **'You don\'\'t have to open every gate. Pick a route to the exit; a wrong answer blocks that gate, so choose another way.'**
  String get mathMaze_gateHint;

  /// No description provided for @mathMaze_gatePrompt.
  ///
  /// In en, this message translates to:
  /// **'Solve to open the gate:'**
  String get mathMaze_gatePrompt;

  /// No description provided for @mathMaze_submitAnswer.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get mathMaze_submitAnswer;

  /// No description provided for @mathMaze_correct.
  ///
  /// In en, this message translates to:
  /// **'Correct! Gate opened!'**
  String get mathMaze_correct;

  /// No description provided for @mathMaze_incorrect.
  ///
  /// In en, this message translates to:
  /// **'Wrong! The answer was {answer}. Path blocked!'**
  String mathMaze_incorrect(String answer);

  /// No description provided for @mathMaze_timeUp.
  ///
  /// In en, this message translates to:
  /// **'Time\'\'s Up!'**
  String get mathMaze_timeUp;

  /// No description provided for @mathMaze_mazeComplete.
  ///
  /// In en, this message translates to:
  /// **'Maze Complete!'**
  String get mathMaze_mazeComplete;

  /// No description provided for @mathMaze_noPath.
  ///
  /// In en, this message translates to:
  /// **'No Path Available!'**
  String get mathMaze_noPath;

  /// No description provided for @mathMaze_gatesLabel.
  ///
  /// In en, this message translates to:
  /// **'Gates'**
  String get mathMaze_gatesLabel;

  /// No description provided for @mathMaze_collectiblesLabel.
  ///
  /// In en, this message translates to:
  /// **'Stars'**
  String get mathMaze_collectiblesLabel;

  /// No description provided for @mathMaze_timerLabel.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get mathMaze_timerLabel;

  /// No description provided for @mathMaze_scoreLabel.
  ///
  /// In en, this message translates to:
  /// **'Score'**
  String get mathMaze_scoreLabel;

  /// No description provided for @mathMaze_collected.
  ///
  /// In en, this message translates to:
  /// **'{collected} / {total}'**
  String mathMaze_collected(String collected, String total);

  /// No description provided for @subscription_title.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Plan'**
  String get subscription_title;

  /// No description provided for @subscription_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Upgrade to unlock more plays and features!'**
  String get subscription_subtitle;

  /// No description provided for @subscription_rateLimitTitle.
  ///
  /// In en, this message translates to:
  /// **'Daily Limit Reached!'**
  String get subscription_rateLimitTitle;

  /// No description provided for @subscription_rateLimitSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Upgrade to keep playing!'**
  String get subscription_rateLimitSubtitle;

  /// No description provided for @subscription_premiumTitle.
  ///
  /// In en, this message translates to:
  /// **'Premium Game'**
  String get subscription_premiumTitle;

  /// No description provided for @subscription_premiumSubtitle.
  ///
  /// In en, this message translates to:
  /// **'This game requires a Premium subscription!'**
  String get subscription_premiumSubtitle;

  /// No description provided for @subscription_currentPlan.
  ///
  /// In en, this message translates to:
  /// **'Current Plan'**
  String get subscription_currentPlan;

  /// No description provided for @subscription_upgradeTo.
  ///
  /// In en, this message translates to:
  /// **'Upgrade to {plan}'**
  String subscription_upgradeTo(String plan);

  /// No description provided for @subscription_downgradeTo.
  ///
  /// In en, this message translates to:
  /// **'Downgrade to {plan}'**
  String subscription_downgradeTo(String plan);

  /// No description provided for @subscription_downgradeToFree.
  ///
  /// In en, this message translates to:
  /// **'Downgrade to Free'**
  String get subscription_downgradeToFree;

  /// No description provided for @subscription_popular.
  ///
  /// In en, this message translates to:
  /// **'POPULAR'**
  String get subscription_popular;

  /// No description provided for @subscription_playsPerDay.
  ///
  /// In en, this message translates to:
  /// **'{count} plays/day'**
  String subscription_playsPerDay(String count);

  /// No description provided for @subscription_perMonth.
  ///
  /// In en, this message translates to:
  /// **'month'**
  String get subscription_perMonth;

  /// No description provided for @subscription_forever.
  ///
  /// In en, this message translates to:
  /// **'forever'**
  String get subscription_forever;

  /// No description provided for @subscription_footer.
  ///
  /// In en, this message translates to:
  /// **'Free plays reset every 24 hours. You can change plans at any time.'**
  String get subscription_footer;

  /// No description provided for @subscription_footerPayment.
  ///
  /// In en, this message translates to:
  /// **'If payment doesn\'\'t clear, you\'\'ll be downgraded to the Free plan.'**
  String get subscription_footerPayment;

  /// No description provided for @subscription_plans_free_name.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get subscription_plans_free_name;

  /// No description provided for @subscription_plans_free_features_0.
  ///
  /// In en, this message translates to:
  /// **'Access to all games'**
  String get subscription_plans_free_features_0;

  /// No description provided for @subscription_plans_free_features_1.
  ///
  /// In en, this message translates to:
  /// **'Single device'**
  String get subscription_plans_free_features_1;

  /// No description provided for @subscription_plans_free_features_2.
  ///
  /// In en, this message translates to:
  /// **'Renews every 24 hours'**
  String get subscription_plans_free_features_2;

  /// No description provided for @subscription_plans_light_name.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get subscription_plans_light_name;

  /// No description provided for @subscription_plans_light_features_0.
  ///
  /// In en, this message translates to:
  /// **'Access to all games'**
  String get subscription_plans_light_features_0;

  /// No description provided for @subscription_plans_light_features_1.
  ///
  /// In en, this message translates to:
  /// **'Up to 3 devices'**
  String get subscription_plans_light_features_1;

  /// No description provided for @subscription_plans_light_features_2.
  ///
  /// In en, this message translates to:
  /// **'Renews every 24 hours'**
  String get subscription_plans_light_features_2;

  /// No description provided for @subscription_plans_light_features_3.
  ///
  /// In en, this message translates to:
  /// **'Basic statistics'**
  String get subscription_plans_light_features_3;

  /// No description provided for @subscription_plans_standard_name.
  ///
  /// In en, this message translates to:
  /// **'Standard'**
  String get subscription_plans_standard_name;

  /// No description provided for @subscription_plans_standard_features_0.
  ///
  /// In en, this message translates to:
  /// **'Access to all games'**
  String get subscription_plans_standard_features_0;

  /// No description provided for @subscription_plans_standard_features_1.
  ///
  /// In en, this message translates to:
  /// **'Up to 3 devices'**
  String get subscription_plans_standard_features_1;

  /// No description provided for @subscription_plans_standard_features_2.
  ///
  /// In en, this message translates to:
  /// **'Renews every 24 hours'**
  String get subscription_plans_standard_features_2;

  /// No description provided for @subscription_plans_standard_features_3.
  ///
  /// In en, this message translates to:
  /// **'Detailed statistics'**
  String get subscription_plans_standard_features_3;

  /// No description provided for @subscription_plans_standard_features_4.
  ///
  /// In en, this message translates to:
  /// **'Priority support'**
  String get subscription_plans_standard_features_4;

  /// No description provided for @subscription_plans_premium_name.
  ///
  /// In en, this message translates to:
  /// **'Premium'**
  String get subscription_plans_premium_name;

  /// No description provided for @subscription_plans_premium_features_0.
  ///
  /// In en, this message translates to:
  /// **'Access to all games'**
  String get subscription_plans_premium_features_0;

  /// No description provided for @subscription_plans_premium_features_1.
  ///
  /// In en, this message translates to:
  /// **'Up to 5 devices'**
  String get subscription_plans_premium_features_1;

  /// No description provided for @subscription_plans_premium_features_2.
  ///
  /// In en, this message translates to:
  /// **'1,000 plays/day'**
  String get subscription_plans_premium_features_2;

  /// No description provided for @subscription_plans_premium_features_3.
  ///
  /// In en, this message translates to:
  /// **'Advanced analytics'**
  String get subscription_plans_premium_features_3;

  /// No description provided for @subscription_plans_premium_features_4.
  ///
  /// In en, this message translates to:
  /// **'Priority support'**
  String get subscription_plans_premium_features_4;

  /// No description provided for @subscription_plans_premium_features_5.
  ///
  /// In en, this message translates to:
  /// **'Early access to new games'**
  String get subscription_plans_premium_features_5;

  /// No description provided for @bondAndBurn_title.
  ///
  /// In en, this message translates to:
  /// **'Bond & Burn'**
  String get bondAndBurn_title;

  /// No description provided for @bondAndBurn_subtitle.
  ///
  /// In en, this message translates to:
  /// **'The Reaction Lab'**
  String get bondAndBurn_subtitle;

  /// No description provided for @bondAndBurn_description.
  ///
  /// In en, this message translates to:
  /// **'Read the formula, find the elements on the periodic table, and build compounds before the lab overheats!'**
  String get bondAndBurn_description;

  /// No description provided for @bondAndBurn_chooseDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Lab Level'**
  String get bondAndBurn_chooseDifficulty;

  /// No description provided for @bondAndBurn_startMission.
  ///
  /// In en, this message translates to:
  /// **'Start Mission'**
  String get bondAndBurn_startMission;

  /// No description provided for @bondAndBurn_selectDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Select a lab level'**
  String get bondAndBurn_selectDifficulty;

  /// No description provided for @bondAndBurn_howToPlay.
  ///
  /// In en, this message translates to:
  /// **'How to Play'**
  String get bondAndBurn_howToPlay;

  /// No description provided for @bondAndBurn_step1.
  ///
  /// In en, this message translates to:
  /// **'Read the compound formula and find the right elements'**
  String get bondAndBurn_step1;

  /// No description provided for @bondAndBurn_step2.
  ///
  /// In en, this message translates to:
  /// **'Tap elements on the periodic table to add them to the beaker'**
  String get bondAndBurn_step2;

  /// No description provided for @bondAndBurn_step3.
  ///
  /// In en, this message translates to:
  /// **'Complete reactions before the heat gauge reaches 100%'**
  String get bondAndBurn_step3;

  /// No description provided for @bondAndBurn_step4.
  ///
  /// In en, this message translates to:
  /// **'Wrong picks add heat — be precise!'**
  String get bondAndBurn_step4;

  /// No description provided for @bondAndBurn_easyDesc.
  ///
  /// In en, this message translates to:
  /// **'Simple molecules, slow heat rise'**
  String get bondAndBurn_easyDesc;

  /// No description provided for @bondAndBurn_mediumDesc.
  ///
  /// In en, this message translates to:
  /// **'More complex compounds, faster heat'**
  String get bondAndBurn_mediumDesc;

  /// No description provided for @bondAndBurn_hardDesc.
  ///
  /// In en, this message translates to:
  /// **'Complex reactions, high pressure, strict heat!'**
  String get bondAndBurn_hardDesc;

  /// No description provided for @bondAndBurn_makeCompound.
  ///
  /// In en, this message translates to:
  /// **'Make: {name}'**
  String bondAndBurn_makeCompound(String name);

  /// No description provided for @bondAndBurn_pickElements.
  ///
  /// In en, this message translates to:
  /// **'Pick elements from the periodic table'**
  String get bondAndBurn_pickElements;

  /// No description provided for @bondAndBurn_labComplete.
  ///
  /// In en, this message translates to:
  /// **'Lab Mission Complete!'**
  String get bondAndBurn_labComplete;

  /// No description provided for @bondAndBurn_meltdown.
  ///
  /// In en, this message translates to:
  /// **'MELTDOWN!'**
  String get bondAndBurn_meltdown;

  /// No description provided for @bondAndBurn_preparingLab.
  ///
  /// In en, this message translates to:
  /// **'Setting up the lab...'**
  String get bondAndBurn_preparingLab;

  /// No description provided for @bondAndBurn_make.
  ///
  /// In en, this message translates to:
  /// **'Make:'**
  String get bondAndBurn_make;

  /// No description provided for @bondAndBurn_round.
  ///
  /// In en, this message translates to:
  /// **'Round'**
  String get bondAndBurn_round;

  /// No description provided for @bondAndBurn_recipes_water_name.
  ///
  /// In en, this message translates to:
  /// **'Water'**
  String get bondAndBurn_recipes_water_name;

  /// No description provided for @bondAndBurn_recipes_water_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 2 Hydrogen and 1 Oxygen'**
  String get bondAndBurn_recipes_water_hint;

  /// No description provided for @bondAndBurn_recipes_water_funFact.
  ///
  /// In en, this message translates to:
  /// **'Water covers 71% of Earth\'\'s surface! Every living thing needs it.'**
  String get bondAndBurn_recipes_water_funFact;

  /// No description provided for @bondAndBurn_recipes_salt_name.
  ///
  /// In en, this message translates to:
  /// **'Table Salt'**
  String get bondAndBurn_recipes_salt_name;

  /// No description provided for @bondAndBurn_recipes_salt_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 1 Sodium and 1 Chlorine'**
  String get bondAndBurn_recipes_salt_hint;

  /// No description provided for @bondAndBurn_recipes_salt_funFact.
  ///
  /// In en, this message translates to:
  /// **'Salt was so valuable in ancient Rome that soldiers were paid with it!'**
  String get bondAndBurn_recipes_salt_funFact;

  /// No description provided for @bondAndBurn_recipes_co2_name.
  ///
  /// In en, this message translates to:
  /// **'Carbon Dioxide'**
  String get bondAndBurn_recipes_co2_name;

  /// No description provided for @bondAndBurn_recipes_co2_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 1 Carbon and 2 Oxygen'**
  String get bondAndBurn_recipes_co2_hint;

  /// No description provided for @bondAndBurn_recipes_co2_funFact.
  ///
  /// In en, this message translates to:
  /// **'Plants breathe in CO₂ and breathe out oxygen — the opposite of us!'**
  String get bondAndBurn_recipes_co2_funFact;

  /// No description provided for @bondAndBurn_recipes_methane_name.
  ///
  /// In en, this message translates to:
  /// **'Methane'**
  String get bondAndBurn_recipes_methane_name;

  /// No description provided for @bondAndBurn_recipes_methane_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 1 Carbon and 4 Hydrogen'**
  String get bondAndBurn_recipes_methane_hint;

  /// No description provided for @bondAndBurn_recipes_methane_funFact.
  ///
  /// In en, this message translates to:
  /// **'Methane is the main ingredient in natural gas used for cooking!'**
  String get bondAndBurn_recipes_methane_funFact;

  /// No description provided for @bondAndBurn_recipes_ammonia_name.
  ///
  /// In en, this message translates to:
  /// **'Ammonia'**
  String get bondAndBurn_recipes_ammonia_name;

  /// No description provided for @bondAndBurn_recipes_ammonia_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 1 Nitrogen and 3 Hydrogen'**
  String get bondAndBurn_recipes_ammonia_hint;

  /// No description provided for @bondAndBurn_recipes_ammonia_funFact.
  ///
  /// In en, this message translates to:
  /// **'Ammonia is used to make fertilizer that helps grow food for billions!'**
  String get bondAndBurn_recipes_ammonia_funFact;

  /// No description provided for @bondAndBurn_recipes_ethane_name.
  ///
  /// In en, this message translates to:
  /// **'Ethane'**
  String get bondAndBurn_recipes_ethane_name;

  /// No description provided for @bondAndBurn_recipes_ethane_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 2 Carbon and 6 Hydrogen'**
  String get bondAndBurn_recipes_ethane_hint;

  /// No description provided for @bondAndBurn_recipes_ethane_funFact.
  ///
  /// In en, this message translates to:
  /// **'Ethane is found in natural gas and on the surface of Saturn\'\'s moon Titan!'**
  String get bondAndBurn_recipes_ethane_funFact;

  /// No description provided for @bondAndBurn_recipes_hydrogen_peroxide_name.
  ///
  /// In en, this message translates to:
  /// **'Hydrogen Peroxide'**
  String get bondAndBurn_recipes_hydrogen_peroxide_name;

  /// No description provided for @bondAndBurn_recipes_hydrogen_peroxide_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 2 Hydrogen and 2 Oxygen'**
  String get bondAndBurn_recipes_hydrogen_peroxide_hint;

  /// No description provided for @bondAndBurn_recipes_hydrogen_peroxide_funFact.
  ///
  /// In en, this message translates to:
  /// **'Hydrogen peroxide is used to clean wounds and even bleach hair!'**
  String get bondAndBurn_recipes_hydrogen_peroxide_funFact;

  /// No description provided for @bondAndBurn_recipes_hydrochloric_acid_name.
  ///
  /// In en, this message translates to:
  /// **'Hydrochloric Acid'**
  String get bondAndBurn_recipes_hydrochloric_acid_name;

  /// No description provided for @bondAndBurn_recipes_hydrochloric_acid_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 1 Hydrogen and 1 Chlorine'**
  String get bondAndBurn_recipes_hydrochloric_acid_hint;

  /// No description provided for @bondAndBurn_recipes_hydrochloric_acid_funFact.
  ///
  /// In en, this message translates to:
  /// **'Your stomach makes hydrochloric acid to digest food!'**
  String get bondAndBurn_recipes_hydrochloric_acid_funFact;

  /// No description provided for @bondAndBurn_recipes_sodium_hydroxide_name.
  ///
  /// In en, this message translates to:
  /// **'Sodium Hydroxide'**
  String get bondAndBurn_recipes_sodium_hydroxide_name;

  /// No description provided for @bondAndBurn_recipes_sodium_hydroxide_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 1 Sodium, 1 Oxygen, and 1 Hydrogen'**
  String get bondAndBurn_recipes_sodium_hydroxide_hint;

  /// No description provided for @bondAndBurn_recipes_sodium_hydroxide_funFact.
  ///
  /// In en, this message translates to:
  /// **'Sodium hydroxide (lye) is used to make soap and unclog drains!'**
  String get bondAndBurn_recipes_sodium_hydroxide_funFact;

  /// No description provided for @bondAndBurn_recipes_nitrous_oxide_name.
  ///
  /// In en, this message translates to:
  /// **'Laughing Gas'**
  String get bondAndBurn_recipes_nitrous_oxide_name;

  /// No description provided for @bondAndBurn_recipes_nitrous_oxide_hint.
  ///
  /// In en, this message translates to:
  /// **'Grab 2 Nitrogen and 1 Oxygen'**
  String get bondAndBurn_recipes_nitrous_oxide_hint;

  /// No description provided for @bondAndBurn_recipes_nitrous_oxide_funFact.
  ///
  /// In en, this message translates to:
  /// **'Dentists use laughing gas (N₂O) to help patients relax during procedures!'**
  String get bondAndBurn_recipes_nitrous_oxide_funFact;

  /// No description provided for @circuitBuilder_canvasLabel.
  ///
  /// In en, this message translates to:
  /// **'Circuit building grid'**
  String get circuitBuilder_canvasLabel;

  /// No description provided for @circuitBuilder_flip.
  ///
  /// In en, this message translates to:
  /// **'Flip'**
  String get circuitBuilder_flip;

  /// No description provided for @circuitBuilder_howTo_title.
  ///
  /// In en, this message translates to:
  /// **'How to build'**
  String get circuitBuilder_howTo_title;

  /// No description provided for @circuitBuilder_howTo_step1.
  ///
  /// In en, this message translates to:
  /// **'Pick a part, then tap a cell to place it.'**
  String get circuitBuilder_howTo_step1;

  /// No description provided for @circuitBuilder_howTo_step2.
  ///
  /// In en, this message translates to:
  /// **'Tap a part\'\'s dot, then another part\'\'s dot, to wire them.'**
  String get circuitBuilder_howTo_step2;

  /// No description provided for @circuitBuilder_howTo_step3.
  ///
  /// In en, this message translates to:
  /// **'Tap Flip if the LED shows backwards.'**
  String get circuitBuilder_howTo_step3;

  /// No description provided for @circuitBuilder_howTo_keyboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Keyboard'**
  String get circuitBuilder_howTo_keyboardTitle;

  /// No description provided for @circuitBuilder_howTo_keyboard.
  ///
  /// In en, this message translates to:
  /// **'Arrow keys move the cursor, Enter places or activates, C starts a wire, Enter or Shift+Enter finishes it on the first or second dot, R flips, Delete removes.'**
  String get circuitBuilder_howTo_keyboard;

  /// No description provided for @circuitBuilder_component_battery_name.
  ///
  /// In en, this message translates to:
  /// **'Battery'**
  String get circuitBuilder_component_battery_name;

  /// No description provided for @circuitBuilder_component_battery_abbr.
  ///
  /// In en, this message translates to:
  /// **'BAT'**
  String get circuitBuilder_component_battery_abbr;

  /// No description provided for @circuitBuilder_component_solar_name.
  ///
  /// In en, this message translates to:
  /// **'Solar panel'**
  String get circuitBuilder_component_solar_name;

  /// No description provided for @circuitBuilder_component_solar_abbr.
  ///
  /// In en, this message translates to:
  /// **'SOL'**
  String get circuitBuilder_component_solar_abbr;

  /// No description provided for @circuitBuilder_component_wire_name.
  ///
  /// In en, this message translates to:
  /// **'Wire'**
  String get circuitBuilder_component_wire_name;

  /// No description provided for @circuitBuilder_component_wire_abbr.
  ///
  /// In en, this message translates to:
  /// **'WIR'**
  String get circuitBuilder_component_wire_abbr;

  /// No description provided for @circuitBuilder_component_switch_name.
  ///
  /// In en, this message translates to:
  /// **'Switch'**
  String get circuitBuilder_component_switch_name;

  /// No description provided for @circuitBuilder_component_switch_abbr.
  ///
  /// In en, this message translates to:
  /// **'SW'**
  String get circuitBuilder_component_switch_abbr;

  /// No description provided for @circuitBuilder_component_resistor_name.
  ///
  /// In en, this message translates to:
  /// **'Resistor'**
  String get circuitBuilder_component_resistor_name;

  /// No description provided for @circuitBuilder_component_resistor_abbr.
  ///
  /// In en, this message translates to:
  /// **'RES'**
  String get circuitBuilder_component_resistor_abbr;

  /// No description provided for @circuitBuilder_component_led_name.
  ///
  /// In en, this message translates to:
  /// **'LED bulb'**
  String get circuitBuilder_component_led_name;

  /// No description provided for @circuitBuilder_component_led_abbr.
  ///
  /// In en, this message translates to:
  /// **'LED'**
  String get circuitBuilder_component_led_abbr;

  /// No description provided for @circuitBuilder_component_motor_name.
  ///
  /// In en, this message translates to:
  /// **'Motor'**
  String get circuitBuilder_component_motor_name;

  /// No description provided for @circuitBuilder_component_motor_abbr.
  ///
  /// In en, this message translates to:
  /// **'MOT'**
  String get circuitBuilder_component_motor_abbr;

  /// No description provided for @circuitBuilder_component_buzzer_name.
  ///
  /// In en, this message translates to:
  /// **'Buzzer'**
  String get circuitBuilder_component_buzzer_name;

  /// No description provided for @circuitBuilder_component_buzzer_abbr.
  ///
  /// In en, this message translates to:
  /// **'BUZ'**
  String get circuitBuilder_component_buzzer_abbr;

  /// No description provided for @circuitBuilder_tray_title.
  ///
  /// In en, this message translates to:
  /// **'Components'**
  String get circuitBuilder_tray_title;

  /// No description provided for @circuitBuilder_tray_remaining.
  ///
  /// In en, this message translates to:
  /// **'{count} left'**
  String circuitBuilder_tray_remaining(String count);

  /// No description provided for @circuitBuilder_tray_exhausted.
  ///
  /// In en, this message translates to:
  /// **'None left'**
  String get circuitBuilder_tray_exhausted;

  /// No description provided for @circuitBuilder_tray_armed.
  ///
  /// In en, this message translates to:
  /// **'Selected — tap a grid cell to place'**
  String get circuitBuilder_tray_armed;

  /// No description provided for @circuitBuilder_status_energized.
  ///
  /// In en, this message translates to:
  /// **'Current is flowing'**
  String get circuitBuilder_status_energized;

  /// No description provided for @circuitBuilder_status_deEnergized.
  ///
  /// In en, this message translates to:
  /// **'No current is flowing'**
  String get circuitBuilder_status_deEnergized;

  /// No description provided for @circuitBuilder_status_fuseBlown.
  ///
  /// In en, this message translates to:
  /// **'The fuse has blown'**
  String get circuitBuilder_status_fuseBlown;

  /// No description provided for @circuitBuilder_status_resetFuse.
  ///
  /// In en, this message translates to:
  /// **'Reset the fuse'**
  String get circuitBuilder_status_resetFuse;

  /// No description provided for @circuitBuilder_status_voltage.
  ///
  /// In en, this message translates to:
  /// **'Supply voltage'**
  String get circuitBuilder_status_voltage;

  /// No description provided for @circuitBuilder_status_lightLevel.
  ///
  /// In en, this message translates to:
  /// **'Light level'**
  String get circuitBuilder_status_lightLevel;

  /// No description provided for @circuitBuilder_fault_SHORT_CIRCUIT.
  ///
  /// In en, this message translates to:
  /// **'Short circuit'**
  String get circuitBuilder_fault_SHORT_CIRCUIT;

  /// No description provided for @circuitBuilder_fault_OVERCURRENT.
  ///
  /// In en, this message translates to:
  /// **'Too much current'**
  String get circuitBuilder_fault_OVERCURRENT;

  /// No description provided for @circuitBuilder_fault_REVERSED_POLARITY.
  ///
  /// In en, this message translates to:
  /// **'Component is backwards'**
  String get circuitBuilder_fault_REVERSED_POLARITY;

  /// No description provided for @circuitBuilder_fault_SINGULAR_SYSTEM.
  ///
  /// In en, this message translates to:
  /// **'This circuit cannot work'**
  String get circuitBuilder_fault_SINGULAR_SYSTEM;

  /// No description provided for @circuitBuilder_faultHelp_SHORT_CIRCUIT.
  ///
  /// In en, this message translates to:
  /// **'The current found a path straight from one side of the battery to the other with nothing to slow it down, so it rushed through and blew the fuse. Put a load in that path, such as an LED bulb with a resistor, or a motor.'**
  String get circuitBuilder_faultHelp_SHORT_CIRCUIT;

  /// No description provided for @circuitBuilder_faultHelp_OVERCURRENT.
  ///
  /// In en, this message translates to:
  /// **'There is more current in this path than the parts can carry safely. Raise the resistance by adding a resistor, or turn the supply voltage down.'**
  String get circuitBuilder_faultHelp_OVERCURRENT;

  /// No description provided for @circuitBuilder_faultHelp_REVERSED_POLARITY.
  ///
  /// In en, this message translates to:
  /// **'A component is connected the wrong way round, so it blocks the current instead of using it. Swap its two ends and try again.'**
  String get circuitBuilder_faultHelp_REVERSED_POLARITY;

  /// No description provided for @circuitBuilder_faultHelp_SINGULAR_SYSTEM.
  ///
  /// In en, this message translates to:
  /// **'This circuit has no single answer the simulator can work out, usually because a part is wired across itself. Remove the connection that joins a component\'\'s two terminals together.'**
  String get circuitBuilder_faultHelp_SINGULAR_SYSTEM;

  /// No description provided for @circuitBuilder_rejection_OUT_OF_BOUNDS.
  ///
  /// In en, this message translates to:
  /// **'That spot is off the grid'**
  String get circuitBuilder_rejection_OUT_OF_BOUNDS;

  /// No description provided for @circuitBuilder_rejection_CELL_OCCUPIED.
  ///
  /// In en, this message translates to:
  /// **'Something is already there'**
  String get circuitBuilder_rejection_CELL_OCCUPIED;

  /// No description provided for @circuitBuilder_rejection_OVER_BUDGET.
  ///
  /// In en, this message translates to:
  /// **'No more of those are available'**
  String get circuitBuilder_rejection_OVER_BUDGET;

  /// No description provided for @circuitBuilder_rejection_ELEMENT_LIMIT.
  ///
  /// In en, this message translates to:
  /// **'The grid is full'**
  String get circuitBuilder_rejection_ELEMENT_LIMIT;

  /// No description provided for @circuitBuilder_rejection_CONNECTION_LIMIT.
  ///
  /// In en, this message translates to:
  /// **'No more connections can be added'**
  String get circuitBuilder_rejection_CONNECTION_LIMIT;

  /// No description provided for @circuitBuilder_rejection_UNKNOWN_ELEMENT.
  ///
  /// In en, this message translates to:
  /// **'That component is no longer there'**
  String get circuitBuilder_rejection_UNKNOWN_ELEMENT;

  /// No description provided for @circuitBuilder_rejection_UNKNOWN_CONNECTION.
  ///
  /// In en, this message translates to:
  /// **'That connection is no longer there'**
  String get circuitBuilder_rejection_UNKNOWN_CONNECTION;

  /// No description provided for @circuitBuilder_rejection_ELEMENT_LOCKED.
  ///
  /// In en, this message translates to:
  /// **'That component cannot be moved'**
  String get circuitBuilder_rejection_ELEMENT_LOCKED;

  /// No description provided for @circuitBuilder_rejection_NOT_A_SWITCH.
  ///
  /// In en, this message translates to:
  /// **'Only a switch can be opened and closed'**
  String get circuitBuilder_rejection_NOT_A_SWITCH;

  /// No description provided for @circuitBuilder_rejection_SELF_CONNECTION.
  ///
  /// In en, this message translates to:
  /// **'A terminal cannot connect to itself'**
  String get circuitBuilder_rejection_SELF_CONNECTION;

  /// No description provided for @circuitBuilder_rejection_DUPLICATE_CONNECTION.
  ///
  /// In en, this message translates to:
  /// **'Those terminals are already connected'**
  String get circuitBuilder_rejection_DUPLICATE_CONNECTION;

  /// No description provided for @circuitBuilder_rejection_INVALID_VOLTAGE.
  ///
  /// In en, this message translates to:
  /// **'That voltage cannot be used'**
  String get circuitBuilder_rejection_INVALID_VOLTAGE;

  /// No description provided for @circuitBuilder_rejection_INVALID_LIGHT_LEVEL.
  ///
  /// In en, this message translates to:
  /// **'That light level cannot be used'**
  String get circuitBuilder_rejection_INVALID_LIGHT_LEVEL;

  /// No description provided for @circuitBuilder_layout_enterFullScreen.
  ///
  /// In en, this message translates to:
  /// **'Full screen'**
  String get circuitBuilder_layout_enterFullScreen;

  /// No description provided for @circuitBuilder_layout_exitFullScreen.
  ///
  /// In en, this message translates to:
  /// **'Leave full screen'**
  String get circuitBuilder_layout_exitFullScreen;

  /// No description provided for @circuitBuilder_audio_soundOn.
  ///
  /// In en, this message translates to:
  /// **'Sound on'**
  String get circuitBuilder_audio_soundOn;

  /// No description provided for @circuitBuilder_audio_soundOff.
  ///
  /// In en, this message translates to:
  /// **'Sound off'**
  String get circuitBuilder_audio_soundOff;

  /// No description provided for @circuitBuilder_error_evaluationUnavailable.
  ///
  /// In en, this message translates to:
  /// **'The simulation is unavailable right now. Try changing your circuit.'**
  String get circuitBuilder_error_evaluationUnavailable;

  /// No description provided for @circuitBuilder_error_levelUnavailable.
  ///
  /// In en, this message translates to:
  /// **'This circuit workbench could not be opened. Please try again.'**
  String get circuitBuilder_error_levelUnavailable;

  /// No description provided for @circuitBuilder_setup_title.
  ///
  /// In en, this message translates to:
  /// **'Circuit Builder'**
  String get circuitBuilder_setup_title;

  /// No description provided for @circuitBuilder_setup_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Build circuits, power the rover'**
  String get circuitBuilder_setup_subtitle;

  /// No description provided for @circuitBuilder_setup_description.
  ///
  /// In en, this message translates to:
  /// **'Wire up batteries, switches and bulbs to bring a Mars rover to life. Each level teaches one idea about electricity.'**
  String get circuitBuilder_setup_description;

  /// No description provided for @circuitBuilder_setup_howToPlay.
  ///
  /// In en, this message translates to:
  /// **'How to Play'**
  String get circuitBuilder_setup_howToPlay;

  /// No description provided for @circuitBuilder_setup_step1.
  ///
  /// In en, this message translates to:
  /// **'Pick a component and place it on the grid'**
  String get circuitBuilder_setup_step1;

  /// No description provided for @circuitBuilder_setup_step2.
  ///
  /// In en, this message translates to:
  /// **'Connect the terminals with wires'**
  String get circuitBuilder_setup_step2;

  /// No description provided for @circuitBuilder_setup_step3.
  ///
  /// In en, this message translates to:
  /// **'Watch the rover: its parts light up when current flows'**
  String get circuitBuilder_setup_step3;

  /// No description provided for @circuitBuilder_setup_step4.
  ///
  /// In en, this message translates to:
  /// **'Reach the goal to send your circuit and earn points'**
  String get circuitBuilder_setup_step4;

  /// No description provided for @circuitBuilder_setup_chooseDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Choose a difficulty'**
  String get circuitBuilder_setup_chooseDifficulty;

  /// No description provided for @circuitBuilder_setup_chooseLevel.
  ///
  /// In en, this message translates to:
  /// **'Choose a level'**
  String get circuitBuilder_setup_chooseLevel;

  /// No description provided for @circuitBuilder_setup_levelNumber.
  ///
  /// In en, this message translates to:
  /// **'Level {n}'**
  String circuitBuilder_setup_levelNumber(String n);

  /// No description provided for @circuitBuilder_setup_concept.
  ///
  /// In en, this message translates to:
  /// **'Goal'**
  String get circuitBuilder_setup_concept;

  /// No description provided for @circuitBuilder_setup_startLevel.
  ///
  /// In en, this message translates to:
  /// **'Start level'**
  String get circuitBuilder_setup_startLevel;

  /// No description provided for @circuitBuilder_setup_selectDifficulty.
  ///
  /// In en, this message translates to:
  /// **'Select a difficulty'**
  String get circuitBuilder_setup_selectDifficulty;

  /// No description provided for @circuitBuilder_setup_sandboxTitle.
  ///
  /// In en, this message translates to:
  /// **'Sandbox'**
  String get circuitBuilder_setup_sandboxTitle;

  /// No description provided for @circuitBuilder_setup_sandboxDescription.
  ///
  /// In en, this message translates to:
  /// **'Free play with every component. No goal, no score, and it does not use up a daily game.'**
  String get circuitBuilder_setup_sandboxDescription;

  /// No description provided for @circuitBuilder_setup_sandboxStart.
  ///
  /// In en, this message translates to:
  /// **'Open the sandbox'**
  String get circuitBuilder_setup_sandboxStart;

  /// No description provided for @circuitBuilder_setup_startFailed.
  ///
  /// In en, this message translates to:
  /// **'The game could not be started. Please try again.'**
  String get circuitBuilder_setup_startFailed;

  /// No description provided for @circuitBuilder_setup_noLevels.
  ///
  /// In en, this message translates to:
  /// **'No levels are available right now.'**
  String get circuitBuilder_setup_noLevels;

  /// No description provided for @circuitBuilder_setup_gateChecking.
  ///
  /// In en, this message translates to:
  /// **'Checking your access...'**
  String get circuitBuilder_setup_gateChecking;

  /// No description provided for @circuitBuilder_difficulty_1_name.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get circuitBuilder_difficulty_1_name;

  /// No description provided for @circuitBuilder_difficulty_1_summary.
  ///
  /// In en, this message translates to:
  /// **'Learn the basics: closed loops and switches. The rover shows what is on and what is off.'**
  String get circuitBuilder_difficulty_1_summary;

  /// No description provided for @circuitBuilder_difficulty_1_disclosure.
  ///
  /// In en, this message translates to:
  /// **'No numbers, just parts that are lit or dark.'**
  String get circuitBuilder_difficulty_1_disclosure;

  /// No description provided for @circuitBuilder_difficulty_1_levels.
  ///
  /// In en, this message translates to:
  /// **'{count} levels'**
  String circuitBuilder_difficulty_1_levels(String count);

  /// No description provided for @circuitBuilder_difficulty_2_name.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get circuitBuilder_difficulty_2_name;

  /// No description provided for @circuitBuilder_difficulty_2_summary.
  ///
  /// In en, this message translates to:
  /// **'Compare series and parallel wiring.'**
  String get circuitBuilder_difficulty_2_summary;

  /// No description provided for @circuitBuilder_difficulty_2_disclosure.
  ///
  /// In en, this message translates to:
  /// **'Brightness bars that compare parts, with no units.'**
  String get circuitBuilder_difficulty_2_disclosure;

  /// No description provided for @circuitBuilder_difficulty_2_levels.
  ///
  /// In en, this message translates to:
  /// **'{count} levels'**
  String circuitBuilder_difficulty_2_levels(String count);

  /// No description provided for @circuitBuilder_difficulty_3_name.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get circuitBuilder_difficulty_3_name;

  /// No description provided for @circuitBuilder_difficulty_3_summary.
  ///
  /// In en, this message translates to:
  /// **'Power the whole rover and recover from a short circuit.'**
  String get circuitBuilder_difficulty_3_summary;

  /// No description provided for @circuitBuilder_difficulty_3_disclosure.
  ///
  /// In en, this message translates to:
  /// **'Voltage and resistance values.'**
  String get circuitBuilder_difficulty_3_disclosure;

  /// No description provided for @circuitBuilder_difficulty_3_levels.
  ///
  /// In en, this message translates to:
  /// **'{count} levels'**
  String circuitBuilder_difficulty_3_levels(String count);

  /// No description provided for @circuitBuilder_difficulty_4_name.
  ///
  /// In en, this message translates to:
  /// **'Super Hard'**
  String get circuitBuilder_difficulty_4_name;

  /// No description provided for @circuitBuilder_difficulty_4_summary.
  ///
  /// In en, this message translates to:
  /// **'Control current with resistors and change the supply voltage.'**
  String get circuitBuilder_difficulty_4_summary;

  /// No description provided for @circuitBuilder_difficulty_4_disclosure.
  ///
  /// In en, this message translates to:
  /// **'Everything: volts, ohms, amps and totals.'**
  String get circuitBuilder_difficulty_4_disclosure;

  /// No description provided for @circuitBuilder_difficulty_4_levels.
  ///
  /// In en, this message translates to:
  /// **'{count} levels'**
  String circuitBuilder_difficulty_4_levels(String count);

  /// No description provided for @circuitBuilder_level_cb_01_closed_circuit_title.
  ///
  /// In en, this message translates to:
  /// **'Close the loop'**
  String get circuitBuilder_level_cb_01_closed_circuit_title;

  /// No description provided for @circuitBuilder_level_cb_01_closed_circuit_goal.
  ///
  /// In en, this message translates to:
  /// **'Light the rover headlight.'**
  String get circuitBuilder_level_cb_01_closed_circuit_goal;

  /// No description provided for @circuitBuilder_level_cb_01_closed_circuit_hint.
  ///
  /// In en, this message translates to:
  /// **'Join the battery, the resistor and the LED bulb in a ring, and bring a wire back to the battery. If the bulb stays dark, check which way round it is connected.'**
  String get circuitBuilder_level_cb_01_closed_circuit_hint;

  /// No description provided for @circuitBuilder_level_cb_01_closed_circuit_learn.
  ///
  /// In en, this message translates to:
  /// **'Current only flows around a closed loop. The resistor protects the LED bulb from too much current.'**
  String get circuitBuilder_level_cb_01_closed_circuit_learn;

  /// No description provided for @circuitBuilder_level_cb_02_switch_control_title.
  ///
  /// In en, this message translates to:
  /// **'Switch it on'**
  String get circuitBuilder_level_cb_02_switch_control_title;

  /// No description provided for @circuitBuilder_level_cb_02_switch_control_goal.
  ///
  /// In en, this message translates to:
  /// **'Light the headlight with the switch closed, then turn it off and on again.'**
  String get circuitBuilder_level_cb_02_switch_control_goal;

  /// No description provided for @circuitBuilder_level_cb_02_switch_control_hint.
  ///
  /// In en, this message translates to:
  /// **'The switch is already on the board. Put it in the loop with the battery, the resistor and the LED bulb, then select it to open or close it.'**
  String get circuitBuilder_level_cb_02_switch_control_hint;

  /// No description provided for @circuitBuilder_level_cb_02_switch_control_learn.
  ///
  /// In en, this message translates to:
  /// **'A switch opens or closes the loop. When it is open the loop is cut, no current flows and the light goes out.'**
  String get circuitBuilder_level_cb_02_switch_control_learn;

  /// No description provided for @circuitBuilder_level_cb_03_series_loop_title.
  ///
  /// In en, this message translates to:
  /// **'One loop for two'**
  String get circuitBuilder_level_cb_03_series_loop_title;

  /// No description provided for @circuitBuilder_level_cb_03_series_loop_goal.
  ///
  /// In en, this message translates to:
  /// **'Light the headlight and sound the buzzer in the same loop.'**
  String get circuitBuilder_level_cb_03_series_loop_goal;

  /// No description provided for @circuitBuilder_level_cb_03_series_loop_hint.
  ///
  /// In en, this message translates to:
  /// **'Put the LED bulb and the buzzer one after the other in the same loop, with the resistor and the switch. Then open the switch and watch both.'**
  String get circuitBuilder_level_cb_03_series_loop_hint;

  /// No description provided for @circuitBuilder_level_cb_03_series_loop_learn.
  ///
  /// In en, this message translates to:
  /// **'In a series circuit the same current goes through every part, one after the other. Open the switch and everything stops.'**
  String get circuitBuilder_level_cb_03_series_loop_learn;

  /// No description provided for @circuitBuilder_level_cb_04_parallel_branches_title.
  ///
  /// In en, this message translates to:
  /// **'Two paths'**
  String get circuitBuilder_level_cb_04_parallel_branches_title;

  /// No description provided for @circuitBuilder_level_cb_04_parallel_branches_goal.
  ///
  /// In en, this message translates to:
  /// **'Give the headlight one path and the buzzer another, each with its own switch.'**
  String get circuitBuilder_level_cb_04_parallel_branches_goal;

  /// No description provided for @circuitBuilder_level_cb_04_parallel_branches_hint.
  ///
  /// In en, this message translates to:
  /// **'Connect both paths to the same battery terminals. Each path has its own switch. Open one and see what the other does.'**
  String get circuitBuilder_level_cb_04_parallel_branches_hint;

  /// No description provided for @circuitBuilder_level_cb_04_parallel_branches_learn.
  ///
  /// In en, this message translates to:
  /// **'In a parallel circuit each path is its own loop. Switching one off leaves the other running.'**
  String get circuitBuilder_level_cb_04_parallel_branches_learn;

  /// No description provided for @circuitBuilder_level_cb_05_series_vs_parallel_title.
  ///
  /// In en, this message translates to:
  /// **'Power the whole rover'**
  String get circuitBuilder_level_cb_05_series_vs_parallel_title;

  /// No description provided for @circuitBuilder_level_cb_05_series_vs_parallel_goal.
  ///
  /// In en, this message translates to:
  /// **'Run the motors, the headlight and the buzzer at the same time.'**
  String get circuitBuilder_level_cb_05_series_vs_parallel_goal;

  /// No description provided for @circuitBuilder_level_cb_05_series_vs_parallel_hint.
  ///
  /// In en, this message translates to:
  /// **'Wire the parts side by side, each one straight across the battery, with the resistor in front of the LED bulb. Motors in one series loop turn very slowly.'**
  String get circuitBuilder_level_cb_05_series_vs_parallel_hint;

  /// No description provided for @circuitBuilder_level_cb_05_series_vs_parallel_learn.
  ///
  /// In en, this message translates to:
  /// **'Parts side by side each get the full battery voltage. Parts in series share it, so motors in series get less and turn more slowly.'**
  String get circuitBuilder_level_cb_05_series_vs_parallel_learn;

  /// No description provided for @circuitBuilder_level_cb_06_short_circuit_recovery_title.
  ///
  /// In en, this message translates to:
  /// **'Beat the short circuit'**
  String get circuitBuilder_level_cb_06_short_circuit_recovery_title;

  /// No description provided for @circuitBuilder_level_cb_06_short_circuit_recovery_goal.
  ///
  /// In en, this message translates to:
  /// **'Light the headlight even if a short circuit blows the fuse first.'**
  String get circuitBuilder_level_cb_06_short_circuit_recovery_goal;

  /// No description provided for @circuitBuilder_level_cb_06_short_circuit_recovery_hint.
  ///
  /// In en, this message translates to:
  /// **'A wire straight across the battery blows the fuse. Reset the fuse, take that wire away and put the load back in the loop.'**
  String get circuitBuilder_level_cb_06_short_circuit_recovery_hint;

  /// No description provided for @circuitBuilder_level_cb_06_short_circuit_recovery_learn.
  ///
  /// In en, this message translates to:
  /// **'A path with almost no resistance lets a huge current through. Always keep a load in the loop, and reset the fuse once the fault is fixed.'**
  String get circuitBuilder_level_cb_06_short_circuit_recovery_learn;

  /// No description provided for @circuitBuilder_level_cb_07_resistance_limits_current_title.
  ///
  /// In en, this message translates to:
  /// **'Tame the current'**
  String get circuitBuilder_level_cb_07_resistance_limits_current_title;

  /// No description provided for @circuitBuilder_level_cb_07_resistance_limits_current_goal.
  ///
  /// In en, this message translates to:
  /// **'Light the LED with a safe current, using the battery and LED already on the board.'**
  String get circuitBuilder_level_cb_07_resistance_limits_current_goal;

  /// No description provided for @circuitBuilder_level_cb_07_resistance_limits_current_hint.
  ///
  /// In en, this message translates to:
  /// **'Put a resistor in series with the LED. Two resistors in series add up. Two in parallel give less resistance than one, so more current flows.'**
  String get circuitBuilder_level_cb_07_resistance_limits_current_hint;

  /// No description provided for @circuitBuilder_level_cb_07_resistance_limits_current_learn.
  ///
  /// In en, this message translates to:
  /// **'Current is voltage divided by resistance. More resistance means less current, and resistors in parallel lower the total resistance.'**
  String get circuitBuilder_level_cb_07_resistance_limits_current_learn;

  /// No description provided for @circuitBuilder_level_cb_08_variable_voltage_title.
  ///
  /// In en, this message translates to:
  /// **'Find the right voltage'**
  String get circuitBuilder_level_cb_08_variable_voltage_title;

  /// No description provided for @circuitBuilder_level_cb_08_variable_voltage_goal.
  ///
  /// In en, this message translates to:
  /// **'Power the motor, the buzzer and the headlight from one battery, and find which supply voltages work.'**
  String get circuitBuilder_level_cb_08_variable_voltage_goal;

  /// No description provided for @circuitBuilder_level_cb_08_variable_voltage_hint.
  ///
  /// In en, this message translates to:
  /// **'Close the master switch and the headlight switch. Change the supply voltage with the slider: the motor needs enough voltage to turn, and the LED can get too much current if it is high.'**
  String get circuitBuilder_level_cb_08_variable_voltage_hint;

  /// No description provided for @circuitBuilder_level_cb_08_variable_voltage_learn.
  ///
  /// In en, this message translates to:
  /// **'Voltage pushes current through resistance. If it is too low the motor will not turn. If it is too high the LED carries more current than it is rated for.'**
  String get circuitBuilder_level_cb_08_variable_voltage_learn;

  /// No description provided for @circuitBuilder_rover_title.
  ///
  /// In en, this message translates to:
  /// **'Mars Rover'**
  String get circuitBuilder_rover_title;

  /// No description provided for @circuitBuilder_rover_alt.
  ///
  /// In en, this message translates to:
  /// **'Drawing of a Mars rover. Its wheels, headlight, buzzer and solar panel show which parts are powered.'**
  String get circuitBuilder_rover_alt;

  /// No description provided for @circuitBuilder_rover_on.
  ///
  /// In en, this message translates to:
  /// **'On'**
  String get circuitBuilder_rover_on;

  /// No description provided for @circuitBuilder_rover_off.
  ///
  /// In en, this message translates to:
  /// **'Off'**
  String get circuitBuilder_rover_off;

  /// No description provided for @circuitBuilder_rover_unused.
  ///
  /// In en, this message translates to:
  /// **'Not used in this level'**
  String get circuitBuilder_rover_unused;

  /// No description provided for @circuitBuilder_rover_allPowered.
  ///
  /// In en, this message translates to:
  /// **'The whole rover is powered!'**
  String get circuitBuilder_rover_allPowered;

  /// No description provided for @circuitBuilder_machine_marsRover_driveMotor.
  ///
  /// In en, this message translates to:
  /// **'Drive motors'**
  String get circuitBuilder_machine_marsRover_driveMotor;

  /// No description provided for @circuitBuilder_machine_marsRover_headlight.
  ///
  /// In en, this message translates to:
  /// **'Headlight'**
  String get circuitBuilder_machine_marsRover_headlight;

  /// No description provided for @circuitBuilder_machine_marsRover_buzzerAlert.
  ///
  /// In en, this message translates to:
  /// **'Buzzer alert'**
  String get circuitBuilder_machine_marsRover_buzzerAlert;

  /// No description provided for @circuitBuilder_machine_marsRover_solarCharging.
  ///
  /// In en, this message translates to:
  /// **'Solar charging'**
  String get circuitBuilder_machine_marsRover_solarCharging;

  /// No description provided for @circuitBuilder_readout_title.
  ///
  /// In en, this message translates to:
  /// **'Circuit readout'**
  String get circuitBuilder_readout_title;

  /// No description provided for @circuitBuilder_readout_supply.
  ///
  /// In en, this message translates to:
  /// **'Supply'**
  String get circuitBuilder_readout_supply;

  /// No description provided for @circuitBuilder_readout_voltage.
  ///
  /// In en, this message translates to:
  /// **'Voltage'**
  String get circuitBuilder_readout_voltage;

  /// No description provided for @circuitBuilder_readout_resistance.
  ///
  /// In en, this message translates to:
  /// **'Resistance'**
  String get circuitBuilder_readout_resistance;

  /// No description provided for @circuitBuilder_readout_current.
  ///
  /// In en, this message translates to:
  /// **'Current'**
  String get circuitBuilder_readout_current;

  /// No description provided for @circuitBuilder_readout_totalResistance.
  ///
  /// In en, this message translates to:
  /// **'Total resistance'**
  String get circuitBuilder_readout_totalResistance;

  /// No description provided for @circuitBuilder_readout_totalCurrent.
  ///
  /// In en, this message translates to:
  /// **'Total current'**
  String get circuitBuilder_readout_totalCurrent;

  /// No description provided for @circuitBuilder_readout_relative.
  ///
  /// In en, this message translates to:
  /// **'Brightness'**
  String get circuitBuilder_readout_relative;

  /// No description provided for @circuitBuilder_readout_noPath.
  ///
  /// In en, this message translates to:
  /// **'No complete loop yet'**
  String get circuitBuilder_readout_noPath;

  /// No description provided for @circuitBuilder_readout_state_lit.
  ///
  /// In en, this message translates to:
  /// **'Working'**
  String get circuitBuilder_readout_state_lit;

  /// No description provided for @circuitBuilder_readout_state_dim.
  ///
  /// In en, this message translates to:
  /// **'Dim'**
  String get circuitBuilder_readout_state_dim;

  /// No description provided for @circuitBuilder_readout_state_dark.
  ///
  /// In en, this message translates to:
  /// **'Off'**
  String get circuitBuilder_readout_state_dark;

  /// No description provided for @circuitBuilder_readout_state_spark.
  ///
  /// In en, this message translates to:
  /// **'Fault'**
  String get circuitBuilder_readout_state_spark;

  /// No description provided for @circuitBuilder_readout_brightness_off.
  ///
  /// In en, this message translates to:
  /// **'Off'**
  String get circuitBuilder_readout_brightness_off;

  /// No description provided for @circuitBuilder_readout_brightness_dim.
  ///
  /// In en, this message translates to:
  /// **'Dim'**
  String get circuitBuilder_readout_brightness_dim;

  /// No description provided for @circuitBuilder_readout_brightness_medium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get circuitBuilder_readout_brightness_medium;

  /// No description provided for @circuitBuilder_readout_brightness_bright.
  ///
  /// In en, this message translates to:
  /// **'Bright'**
  String get circuitBuilder_readout_brightness_bright;

  /// No description provided for @circuitBuilder_readout_noneHint.
  ///
  /// In en, this message translates to:
  /// **'Look at the rover: each part is on or off.'**
  String get circuitBuilder_readout_noneHint;

  /// No description provided for @circuitBuilder_readout_qualitativeHint.
  ///
  /// In en, this message translates to:
  /// **'The bars compare how bright each part is, with no units.'**
  String get circuitBuilder_readout_qualitativeHint;

  /// No description provided for @circuitBuilder_game_loading.
  ///
  /// In en, this message translates to:
  /// **'Starting your game...'**
  String get circuitBuilder_game_loading;

  /// No description provided for @circuitBuilder_game_level.
  ///
  /// In en, this message translates to:
  /// **'Level'**
  String get circuitBuilder_game_level;

  /// No description provided for @circuitBuilder_game_goal.
  ///
  /// In en, this message translates to:
  /// **'Goal'**
  String get circuitBuilder_game_goal;

  /// No description provided for @circuitBuilder_game_showHint.
  ///
  /// In en, this message translates to:
  /// **'Show hint'**
  String get circuitBuilder_game_showHint;

  /// No description provided for @circuitBuilder_game_hideHint.
  ///
  /// In en, this message translates to:
  /// **'Hide hint'**
  String get circuitBuilder_game_hideHint;

  /// No description provided for @circuitBuilder_game_solved.
  ///
  /// In en, this message translates to:
  /// **'The rover is working! Checking your circuit...'**
  String get circuitBuilder_game_solved;

  /// No description provided for @circuitBuilder_game_solvedTitle.
  ///
  /// In en, this message translates to:
  /// **'Circuit complete'**
  String get circuitBuilder_game_solvedTitle;

  /// No description provided for @circuitBuilder_game_submitting.
  ///
  /// In en, this message translates to:
  /// **'The server is checking your circuit...'**
  String get circuitBuilder_game_submitting;

  /// No description provided for @circuitBuilder_game_submitFailed.
  ///
  /// In en, this message translates to:
  /// **'We could not send your circuit. Your work is safe. Please try again.'**
  String get circuitBuilder_game_submitFailed;

  /// No description provided for @circuitBuilder_game_rejected.
  ///
  /// In en, this message translates to:
  /// **'The server could not verify that circuit. Change it and try again.'**
  String get circuitBuilder_game_rejected;

  /// No description provided for @circuitBuilder_game_retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get circuitBuilder_game_retry;

  /// No description provided for @circuitBuilder_game_nextLevel.
  ///
  /// In en, this message translates to:
  /// **'Next level'**
  String get circuitBuilder_game_nextLevel;

  /// No description provided for @circuitBuilder_game_backToSetup.
  ///
  /// In en, this message translates to:
  /// **'Back to levels'**
  String get circuitBuilder_game_backToSetup;

  /// No description provided for @circuitBuilder_game_quit.
  ///
  /// In en, this message translates to:
  /// **'Quit'**
  String get circuitBuilder_game_quit;

  /// No description provided for @circuitBuilder_game_noLevel.
  ///
  /// In en, this message translates to:
  /// **'That level could not be found.'**
  String get circuitBuilder_game_noLevel;

  /// No description provided for @circuitBuilder_game_learnTitle.
  ///
  /// In en, this message translates to:
  /// **'What you learned'**
  String get circuitBuilder_game_learnTitle;

  /// No description provided for @circuitBuilder_faultOverlay_label.
  ///
  /// In en, this message translates to:
  /// **'Circuit fault'**
  String get circuitBuilder_faultOverlay_label;

  /// No description provided for @circuitBuilder_faultOverlay_dismiss.
  ///
  /// In en, this message translates to:
  /// **'Dismiss'**
  String get circuitBuilder_faultOverlay_dismiss;

  /// No description provided for @circuitBuilder_sandbox_badge.
  ///
  /// In en, this message translates to:
  /// **'Sandbox: nothing here is scored'**
  String get circuitBuilder_sandbox_badge;

  /// No description provided for @circuitBuilder_sandbox_note.
  ///
  /// In en, this message translates to:
  /// **'Free play with every component. There is no score and no daily game is used.'**
  String get circuitBuilder_sandbox_note;

  /// No description provided for @circuitBuilder_sandbox_back.
  ///
  /// In en, this message translates to:
  /// **'Back to levels'**
  String get circuitBuilder_sandbox_back;

  /// No description provided for @circuitBuilder_result_serverScoreNote.
  ///
  /// In en, this message translates to:
  /// **'The server checked this score.'**
  String get circuitBuilder_result_serverScoreNote;

  /// No description provided for @circuitBuilder_result_rankLabel.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard rank'**
  String get circuitBuilder_result_rankLabel;

  /// No description provided for @miniGolf_title.
  ///
  /// In en, this message translates to:
  /// **'Mini Golf'**
  String get miniGolf_title;

  /// No description provided for @miniGolf_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Physics Putting'**
  String get miniGolf_subtitle;

  /// No description provided for @miniGolf_description.
  ///
  /// In en, this message translates to:
  /// **'Aim, set your power, and putt through obstacles to sink the ball in as few strokes as possible!'**
  String get miniGolf_description;

  /// No description provided for @miniGolf_chooseCourse.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Course'**
  String get miniGolf_chooseCourse;

  /// No description provided for @miniGolf_teeOff.
  ///
  /// In en, this message translates to:
  /// **'Tee Off'**
  String get miniGolf_teeOff;

  /// No description provided for @miniGolf_selectCourse.
  ///
  /// In en, this message translates to:
  /// **'Select a course'**
  String get miniGolf_selectCourse;

  /// No description provided for @miniGolf_howToPlay.
  ///
  /// In en, this message translates to:
  /// **'How to Play'**
  String get miniGolf_howToPlay;

  /// No description provided for @miniGolf_step1.
  ///
  /// In en, this message translates to:
  /// **'Drag from the ball to aim your shot'**
  String get miniGolf_step1;

  /// No description provided for @miniGolf_step2.
  ///
  /// In en, this message translates to:
  /// **'Pull back farther for more power'**
  String get miniGolf_step2;

  /// No description provided for @miniGolf_step3.
  ///
  /// In en, this message translates to:
  /// **'Release to putt — angle off walls!'**
  String get miniGolf_step3;

  /// No description provided for @miniGolf_step4.
  ///
  /// In en, this message translates to:
  /// **'Sink it in the fewest strokes'**
  String get miniGolf_step4;

  /// No description provided for @miniGolf_easyDesc.
  ///
  /// In en, this message translates to:
  /// **'Open greens, simple angles'**
  String get miniGolf_easyDesc;

  /// No description provided for @miniGolf_mediumDesc.
  ///
  /// In en, this message translates to:
  /// **'Bumpers, sand traps, water hazards'**
  String get miniGolf_mediumDesc;

  /// No description provided for @miniGolf_hardDesc.
  ///
  /// In en, this message translates to:
  /// **'Windmills, tight mazes, chaos!'**
  String get miniGolf_hardDesc;

  /// No description provided for @miniGolf_loading.
  ///
  /// In en, this message translates to:
  /// **'Setting up the course...'**
  String get miniGolf_loading;

  /// No description provided for @wordPuzzle_title.
  ///
  /// In en, this message translates to:
  /// **'Word Puzzle'**
  String get wordPuzzle_title;

  /// No description provided for @wordPuzzle_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Find all the hidden words in the grid!'**
  String get wordPuzzle_subtitle;

  /// No description provided for @wordPuzzle_howToPlay.
  ///
  /// In en, this message translates to:
  /// **'How to Play'**
  String get wordPuzzle_howToPlay;

  /// No description provided for @wordPuzzle_selectLetters.
  ///
  /// In en, this message translates to:
  /// **'Select Letters'**
  String get wordPuzzle_selectLetters;

  /// No description provided for @wordPuzzle_selectLettersDesc.
  ///
  /// In en, this message translates to:
  /// **'Click and drag to select letters in the grid'**
  String get wordPuzzle_selectLettersDesc;

  /// No description provided for @wordPuzzle_findWords.
  ///
  /// In en, this message translates to:
  /// **'Find Words'**
  String get wordPuzzle_findWords;

  /// No description provided for @wordPuzzle_findWordsDesc.
  ///
  /// In en, this message translates to:
  /// **'Words can be horizontal, vertical, or diagonal'**
  String get wordPuzzle_findWordsDesc;

  /// No description provided for @wordPuzzle_beatTheClock.
  ///
  /// In en, this message translates to:
  /// **'Beat the Clock'**
  String get wordPuzzle_beatTheClock;

  /// No description provided for @wordPuzzle_beatTheClockDesc.
  ///
  /// In en, this message translates to:
  /// **'Find all words before time runs out!'**
  String get wordPuzzle_beatTheClockDesc;

  /// No description provided for @wordPuzzle_easy.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get wordPuzzle_easy;

  /// No description provided for @wordPuzzle_easyDesc.
  ///
  /// In en, this message translates to:
  /// **'Perfect for beginners'**
  String get wordPuzzle_easyDesc;

  /// No description provided for @wordPuzzle_medium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get wordPuzzle_medium;

  /// No description provided for @wordPuzzle_mediumDesc.
  ///
  /// In en, this message translates to:
  /// **'A good challenge'**
  String get wordPuzzle_mediumDesc;

  /// No description provided for @wordPuzzle_hard.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get wordPuzzle_hard;

  /// No description provided for @wordPuzzle_hardDesc.
  ///
  /// In en, this message translates to:
  /// **'For word masters'**
  String get wordPuzzle_hardDesc;

  /// No description provided for @wordPuzzle_gridSize.
  ///
  /// In en, this message translates to:
  /// **'Grid Size'**
  String get wordPuzzle_gridSize;

  /// No description provided for @wordPuzzle_words.
  ///
  /// In en, this message translates to:
  /// **'Words'**
  String get wordPuzzle_words;

  /// No description provided for @wordPuzzle_timeLimit.
  ///
  /// In en, this message translates to:
  /// **'Time Limit'**
  String get wordPuzzle_timeLimit;

  /// No description provided for @wordPuzzle_minutes.
  ///
  /// In en, this message translates to:
  /// **'minutes'**
  String get wordPuzzle_minutes;

  /// No description provided for @wordPuzzle_start.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get wordPuzzle_start;

  /// No description provided for @wordPuzzle_backToGames.
  ///
  /// In en, this message translates to:
  /// **'← Back to Games'**
  String get wordPuzzle_backToGames;

  /// No description provided for @wordPuzzle_wordsFound.
  ///
  /// In en, this message translates to:
  /// **'Words Found'**
  String get wordPuzzle_wordsFound;

  /// No description provided for @wordPuzzle_time.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get wordPuzzle_time;

  /// No description provided for @wordPuzzle_difficulty.
  ///
  /// In en, this message translates to:
  /// **'Difficulty'**
  String get wordPuzzle_difficulty;

  /// No description provided for @wordPuzzle_wordsToFind.
  ///
  /// In en, this message translates to:
  /// **'Words to Find'**
  String get wordPuzzle_wordsToFind;

  /// No description provided for @wordPuzzle_dragHint.
  ///
  /// In en, this message translates to:
  /// **'Drag across the letters to select a word'**
  String get wordPuzzle_dragHint;

  /// No description provided for @quest_title.
  ///
  /// In en, this message translates to:
  /// **'Quest Map'**
  String get quest_title;

  /// No description provided for @quest_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Clear each node to open the next one. Earn up to 3 stars per node.'**
  String get quest_subtitle;

  /// No description provided for @quest_playsLeft.
  ///
  /// In en, this message translates to:
  /// **'{count} plays left today'**
  String quest_playsLeft(String count);

  /// No description provided for @quest_playsUsed.
  ///
  /// In en, this message translates to:
  /// **'{used} of {limit} plays used'**
  String quest_playsUsed(String used, String limit);

  /// No description provided for @quest_resetsAt.
  ///
  /// In en, this message translates to:
  /// **'Resets at {time}'**
  String quest_resetsAt(String time);

  /// No description provided for @quest_loading.
  ///
  /// In en, this message translates to:
  /// **'Loading your Quest Map...'**
  String get quest_loading;

  /// No description provided for @quest_error_title.
  ///
  /// In en, this message translates to:
  /// **'We could not load the Quest Map.'**
  String get quest_error_title;

  /// No description provided for @quest_error_retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get quest_error_retry;

  /// No description provided for @quest_worldStars.
  ///
  /// In en, this message translates to:
  /// **'{stars} of {max} stars'**
  String quest_worldStars(String stars, String max);

  /// No description provided for @quest_badges_shelfLabel.
  ///
  /// In en, this message translates to:
  /// **'{world} badges'**
  String quest_badges_shelfLabel(String world);

  /// No description provided for @quest_badges_earned.
  ///
  /// In en, this message translates to:
  /// **'Earned'**
  String get quest_badges_earned;

  /// No description provided for @quest_badges_locked.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get quest_badges_locked;

  /// No description provided for @quest_badges_new.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get quest_badges_new;

  /// No description provided for @quest_badges_WORLD_CLEARED_name.
  ///
  /// In en, this message translates to:
  /// **'World Cleared'**
  String get quest_badges_WORLD_CLEARED_name;

  /// No description provided for @quest_badges_WORLD_CLEARED_hint.
  ///
  /// In en, this message translates to:
  /// **'Beat the boss with at least 1 star.'**
  String get quest_badges_WORLD_CLEARED_hint;

  /// No description provided for @quest_badges_WORLD_MASTERED_name.
  ///
  /// In en, this message translates to:
  /// **'World Mastered'**
  String get quest_badges_WORLD_MASTERED_name;

  /// No description provided for @quest_badges_WORLD_MASTERED_hint.
  ///
  /// In en, this message translates to:
  /// **'Earn 3 stars on every path node.'**
  String get quest_badges_WORLD_MASTERED_hint;

  /// No description provided for @quest_achievements_title.
  ///
  /// In en, this message translates to:
  /// **'Quest Map badges'**
  String get quest_achievements_title;

  /// No description provided for @quest_achievements_summary.
  ///
  /// In en, this message translates to:
  /// **'{earned} of {total} badges earned'**
  String quest_achievements_summary(String earned, String total);

  /// No description provided for @quest_achievements_error.
  ///
  /// In en, this message translates to:
  /// **'Quest Map badges are not available right now.'**
  String get quest_achievements_error;

  /// No description provided for @quest_worlds_brain_peaks_name.
  ///
  /// In en, this message translates to:
  /// **'Brain Peaks'**
  String get quest_worlds_brain_peaks_name;

  /// No description provided for @quest_worlds_science_island_name.
  ///
  /// In en, this message translates to:
  /// **'Science Island'**
  String get quest_worlds_science_island_name;

  /// No description provided for @quest_nodes_bp_01_memory_name.
  ///
  /// In en, this message translates to:
  /// **'Animal Memory'**
  String get quest_nodes_bp_01_memory_name;

  /// No description provided for @quest_nodes_bp_02_math_name.
  ///
  /// In en, this message translates to:
  /// **'Math Warm-up'**
  String get quest_nodes_bp_02_math_name;

  /// No description provided for @quest_nodes_bp_03_words_name.
  ///
  /// In en, this message translates to:
  /// **'Word Hunt'**
  String get quest_nodes_bp_03_words_name;

  /// No description provided for @quest_nodes_bp_04_sequence_name.
  ///
  /// In en, this message translates to:
  /// **'Sequence Steps'**
  String get quest_nodes_bp_04_sequence_name;

  /// No description provided for @quest_nodes_bp_05_geo_name.
  ///
  /// In en, this message translates to:
  /// **'Geo Pass'**
  String get quest_nodes_bp_05_geo_name;

  /// No description provided for @quest_nodes_bp_06_maze_name.
  ///
  /// In en, this message translates to:
  /// **'Number Maze'**
  String get quest_nodes_bp_06_maze_name;

  /// No description provided for @quest_nodes_bp_07_memory_space_name.
  ///
  /// In en, this message translates to:
  /// **'Space Memory'**
  String get quest_nodes_bp_07_memory_space_name;

  /// No description provided for @quest_nodes_bp_boss_name.
  ///
  /// In en, this message translates to:
  /// **'Peak Boss'**
  String get quest_nodes_bp_boss_name;

  /// No description provided for @quest_nodes_bp_bonus_sequence_name.
  ///
  /// In en, this message translates to:
  /// **'Bonus: Long Sequence'**
  String get quest_nodes_bp_bonus_sequence_name;

  /// No description provided for @quest_nodes_si_01_bond_burn_name.
  ///
  /// In en, this message translates to:
  /// **'Chemistry Lab'**
  String get quest_nodes_si_01_bond_burn_name;

  /// No description provided for @quest_nodes_si_02_space_entry_name.
  ///
  /// In en, this message translates to:
  /// **'Rocket Landing'**
  String get quest_nodes_si_02_space_entry_name;

  /// No description provided for @quest_nodes_si_03_circuit_series_name.
  ///
  /// In en, this message translates to:
  /// **'Series Circuit'**
  String get quest_nodes_si_03_circuit_series_name;

  /// No description provided for @quest_nodes_si_04_circuit_branches_name.
  ///
  /// In en, this message translates to:
  /// **'Parallel Branches'**
  String get quest_nodes_si_04_circuit_branches_name;

  /// No description provided for @quest_nodes_si_05_scratch_name.
  ///
  /// In en, this message translates to:
  /// **'Code Corner'**
  String get quest_nodes_si_05_scratch_name;

  /// No description provided for @quest_nodes_si_06_mini_golf_name.
  ///
  /// In en, this message translates to:
  /// **'Golf Cove'**
  String get quest_nodes_si_06_mini_golf_name;

  /// No description provided for @quest_nodes_si_07_circuit_parallel_name.
  ///
  /// In en, this message translates to:
  /// **'Parallel Circuit'**
  String get quest_nodes_si_07_circuit_parallel_name;

  /// No description provided for @quest_nodes_si_boss_name.
  ///
  /// In en, this message translates to:
  /// **'Island Boss'**
  String get quest_nodes_si_boss_name;

  /// No description provided for @quest_nodes_si_bonus_name.
  ///
  /// In en, this message translates to:
  /// **'Bonus: Expert Circuit'**
  String get quest_nodes_si_bonus_name;

  /// No description provided for @quest_games_ANIMALS.
  ///
  /// In en, this message translates to:
  /// **'Memory Match: Animals'**
  String get quest_games_ANIMALS;

  /// No description provided for @quest_games_FRUITS.
  ///
  /// In en, this message translates to:
  /// **'Memory Match: Fruits'**
  String get quest_games_FRUITS;

  /// No description provided for @quest_games_VEHICLES.
  ///
  /// In en, this message translates to:
  /// **'Memory Match: Vehicles'**
  String get quest_games_VEHICLES;

  /// No description provided for @quest_games_SPACE.
  ///
  /// In en, this message translates to:
  /// **'Memory Match: Space'**
  String get quest_games_SPACE;

  /// No description provided for @quest_games_OCEAN.
  ///
  /// In en, this message translates to:
  /// **'Memory Match: Ocean'**
  String get quest_games_OCEAN;

  /// No description provided for @quest_games_FORMULA1.
  ///
  /// In en, this message translates to:
  /// **'Memory Match: Formula 1'**
  String get quest_games_FORMULA1;

  /// No description provided for @quest_games_MATH_CHALLENGE.
  ///
  /// In en, this message translates to:
  /// **'Math Challenge'**
  String get quest_games_MATH_CHALLENGE;

  /// No description provided for @quest_games_WORD_PUZZLE.
  ///
  /// In en, this message translates to:
  /// **'Word Puzzle'**
  String get quest_games_WORD_PUZZLE;

  /// No description provided for @quest_games_SEQUENCE_MEMORY.
  ///
  /// In en, this message translates to:
  /// **'Sequence Memory'**
  String get quest_games_SEQUENCE_MEMORY;

  /// No description provided for @quest_games_PATTERN_RECALL.
  ///
  /// In en, this message translates to:
  /// **'Pattern Recall'**
  String get quest_games_PATTERN_RECALL;

  /// No description provided for @quest_games_GEO_QUIZ.
  ///
  /// In en, this message translates to:
  /// **'Geography Quiz'**
  String get quest_games_GEO_QUIZ;

  /// No description provided for @quest_games_MATH_MAZE.
  ///
  /// In en, this message translates to:
  /// **'Math Maze'**
  String get quest_games_MATH_MAZE;

  /// No description provided for @quest_games_BUBBLE_POP.
  ///
  /// In en, this message translates to:
  /// **'Bubble Pop'**
  String get quest_games_BUBBLE_POP;

  /// No description provided for @quest_games_BOND_AND_BURN.
  ///
  /// In en, this message translates to:
  /// **'Bond & Burn'**
  String get quest_games_BOND_AND_BURN;

  /// No description provided for @quest_games_SPACE_ENTRY.
  ///
  /// In en, this message translates to:
  /// **'Space Entry'**
  String get quest_games_SPACE_ENTRY;

  /// No description provided for @quest_games_TRAFFIC_LAB.
  ///
  /// In en, this message translates to:
  /// **'Traffic Lab'**
  String get quest_games_TRAFFIC_LAB;

  /// No description provided for @quest_games_MINI_GOLF.
  ///
  /// In en, this message translates to:
  /// **'Mini Golf'**
  String get quest_games_MINI_GOLF;

  /// No description provided for @quest_games_SCRATCH_CODING.
  ///
  /// In en, this message translates to:
  /// **'Space Coder'**
  String get quest_games_SCRATCH_CODING;

  /// No description provided for @quest_games_CIRCUIT_BUILDER.
  ///
  /// In en, this message translates to:
  /// **'Circuit Builder'**
  String get quest_games_CIRCUIT_BUILDER;

  /// No description provided for @quest_difficulty_1.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get quest_difficulty_1;

  /// No description provided for @quest_difficulty_2.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get quest_difficulty_2;

  /// No description provided for @quest_difficulty_3.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get quest_difficulty_3;

  /// No description provided for @quest_difficulty_4.
  ///
  /// In en, this message translates to:
  /// **'Expert'**
  String get quest_difficulty_4;

  /// No description provided for @quest_node_aria_locked.
  ///
  /// In en, this message translates to:
  /// **'{name}, locked'**
  String quest_node_aria_locked(String name);

  /// No description provided for @quest_node_aria_available.
  ///
  /// In en, this message translates to:
  /// **'{name}, ready to play'**
  String quest_node_aria_available(String name);

  /// No description provided for @quest_node_aria_earned.
  ///
  /// In en, this message translates to:
  /// **'{name}, {count} of 3 stars'**
  String quest_node_aria_earned(String name, String count);

  /// No description provided for @quest_node_aria_unavailable.
  ///
  /// In en, this message translates to:
  /// **'{name}, not available'**
  String quest_node_aria_unavailable(String name);

  /// No description provided for @quest_node_aria_boss.
  ///
  /// In en, this message translates to:
  /// **'boss'**
  String get quest_node_aria_boss;

  /// No description provided for @quest_node_aria_bonus.
  ///
  /// In en, this message translates to:
  /// **'bonus'**
  String get quest_node_aria_bonus;

  /// No description provided for @quest_node_aria_new.
  ///
  /// In en, this message translates to:
  /// **'newly unlocked'**
  String get quest_node_aria_new;

  /// No description provided for @quest_node_boss.
  ///
  /// In en, this message translates to:
  /// **'Boss'**
  String get quest_node_boss;

  /// No description provided for @quest_node_bonus.
  ///
  /// In en, this message translates to:
  /// **'Bonus'**
  String get quest_node_bonus;

  /// No description provided for @quest_node_new.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get quest_node_new;

  /// No description provided for @quest_panel_goals.
  ///
  /// In en, this message translates to:
  /// **'Star goals'**
  String get quest_panel_goals;

  /// No description provided for @quest_panel_goal1.
  ///
  /// In en, this message translates to:
  /// **'1 star'**
  String get quest_panel_goal1;

  /// No description provided for @quest_panel_goal2.
  ///
  /// In en, this message translates to:
  /// **'2 stars'**
  String get quest_panel_goal2;

  /// No description provided for @quest_panel_goal3.
  ///
  /// In en, this message translates to:
  /// **'3 stars'**
  String get quest_panel_goal3;

  /// No description provided for @quest_panel_points.
  ///
  /// In en, this message translates to:
  /// **'{points} points'**
  String quest_panel_points(String points);

  /// No description provided for @quest_panel_combinedScore.
  ///
  /// In en, this message translates to:
  /// **'Combined score'**
  String get quest_panel_combinedScore;

  /// No description provided for @quest_panel_bossTotalBoth.
  ///
  /// In en, this message translates to:
  /// **'Total of both games'**
  String get quest_panel_bossTotalBoth;

  /// No description provided for @quest_panel_bossTotalAll.
  ///
  /// In en, this message translates to:
  /// **'Total of all {count} games'**
  String quest_panel_bossTotalAll(String count);

  /// No description provided for @quest_panel_perGame.
  ///
  /// In en, this message translates to:
  /// **'about {points} per game'**
  String quest_panel_perGame(String points);

  /// No description provided for @quest_panel_reached.
  ///
  /// In en, this message translates to:
  /// **'Reached'**
  String get quest_panel_reached;

  /// No description provided for @quest_panel_best.
  ///
  /// In en, this message translates to:
  /// **'Best: {score}'**
  String quest_panel_best(String score);

  /// No description provided for @quest_panel_legs.
  ///
  /// In en, this message translates to:
  /// **'Games'**
  String get quest_panel_legs;

  /// No description provided for @quest_panel_legOf.
  ///
  /// In en, this message translates to:
  /// **'Leg {k} of {n}'**
  String quest_panel_legOf(String k, String n);

  /// No description provided for @quest_panel_order.
  ///
  /// In en, this message translates to:
  /// **'Play the legs in order within 30 minutes.'**
  String get quest_panel_order;

  /// No description provided for @quest_panel_runInProgress.
  ///
  /// In en, this message translates to:
  /// **'Run in progress: {done} of {total} legs, expires at {time}'**
  String quest_panel_runInProgress(String done, String total, String time);

  /// No description provided for @quest_panel_play.
  ///
  /// In en, this message translates to:
  /// **'Play'**
  String get quest_panel_play;

  /// No description provided for @quest_panel_replay.
  ///
  /// In en, this message translates to:
  /// **'Replay'**
  String get quest_panel_replay;

  /// No description provided for @quest_panel_continue.
  ///
  /// In en, this message translates to:
  /// **'Continue run'**
  String get quest_panel_continue;

  /// No description provided for @quest_panel_notAvailableNow.
  ///
  /// In en, this message translates to:
  /// **'This node is not available right now.'**
  String get quest_panel_notAvailableNow;

  /// No description provided for @quest_panel_locked.
  ///
  /// In en, this message translates to:
  /// **'Earn a star on the previous node to unlock.'**
  String get quest_panel_locked;

  /// No description provided for @quest_panel_bonusLocked.
  ///
  /// In en, this message translates to:
  /// **'Collect stars in this world to unlock.'**
  String get quest_panel_bonusLocked;

  /// No description provided for @quest_panel_unavailable.
  ///
  /// In en, this message translates to:
  /// **'This game is not available right now. Skipping it counts as passed.'**
  String get quest_panel_unavailable;

  /// No description provided for @quest_panel_paywall.
  ///
  /// In en, this message translates to:
  /// **'Subscribe to unlock World 2'**
  String get quest_panel_paywall;

  /// No description provided for @quest_panel_noPlaysLeft.
  ///
  /// In en, this message translates to:
  /// **'You have no plays left today. Playing now will take you to the limit page.'**
  String get quest_panel_noPlaysLeft;

  /// No description provided for @quest_panel_close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get quest_panel_close;

  /// No description provided for @quest_worldLocked_label.
  ///
  /// In en, this message translates to:
  /// **'Locked: subscribers only'**
  String get quest_worldLocked_label;

  /// No description provided for @quest_worldLocked_link.
  ///
  /// In en, this message translates to:
  /// **'Subscribe to unlock World 2'**
  String get quest_worldLocked_link;

  /// No description provided for @quest_banner_playing.
  ///
  /// In en, this message translates to:
  /// **'Playing from Quest Map'**
  String get quest_banner_playing;

  /// No description provided for @quest_banner_goal.
  ///
  /// In en, this message translates to:
  /// **'3-star goal: {points} points'**
  String quest_banner_goal(String points);

  /// No description provided for @quest_banner_back.
  ///
  /// In en, this message translates to:
  /// **'Back to map'**
  String get quest_banner_back;

  /// No description provided for @quest_result_stars.
  ///
  /// In en, this message translates to:
  /// **'Stars this run: {count} of 3'**
  String quest_result_stars(String count);

  /// No description provided for @quest_result_best.
  ///
  /// In en, this message translates to:
  /// **'Best: {count} of 3 stars'**
  String quest_result_best(String count);

  /// No description provided for @quest_result_goals.
  ///
  /// In en, this message translates to:
  /// **'Goals'**
  String get quest_result_goals;

  /// No description provided for @quest_result_score.
  ///
  /// In en, this message translates to:
  /// **'Your score: {score}'**
  String quest_result_score(String score);

  /// No description provided for @quest_result_nextGoal.
  ///
  /// In en, this message translates to:
  /// **'Next star at {points} points'**
  String quest_result_nextGoal(String points);

  /// No description provided for @quest_result_allGoals.
  ///
  /// In en, this message translates to:
  /// **'All goals reached'**
  String get quest_result_allGoals;

  /// No description provided for @quest_result_legDone.
  ///
  /// In en, this message translates to:
  /// **'Leg {k} of {n} done'**
  String quest_result_legDone(String k, String n);

  /// No description provided for @quest_result_legScore.
  ///
  /// In en, this message translates to:
  /// **'Leg score: {score}'**
  String quest_result_legScore(String score);

  /// No description provided for @quest_result_nextLeg.
  ///
  /// In en, this message translates to:
  /// **'Next leg'**
  String get quest_result_nextLeg;

  /// No description provided for @quest_result_combined.
  ///
  /// In en, this message translates to:
  /// **'Combined score: {score}'**
  String quest_result_combined(String score);

  /// No description provided for @quest_result_expired.
  ///
  /// In en, this message translates to:
  /// **'This run expired. Start the boss again from leg 1.'**
  String get quest_result_expired;

  /// No description provided for @quest_result_unlocked.
  ///
  /// In en, this message translates to:
  /// **'Unlocked: {names}'**
  String quest_result_unlocked(String names);

  /// No description provided for @quest_result_worldCleared.
  ///
  /// In en, this message translates to:
  /// **'World cleared!'**
  String get quest_result_worldCleared;

  /// No description provided for @quest_result_notSaved.
  ///
  /// In en, this message translates to:
  /// **'Progress could not be saved, replay to retry.'**
  String get quest_result_notSaved;

  /// No description provided for @quest_result_backToMap.
  ///
  /// In en, this message translates to:
  /// **'Back to map'**
  String get quest_result_backToMap;

  /// No description provided for @quest_notice_questUnavailable.
  ///
  /// In en, this message translates to:
  /// **'That node is not available right now.'**
  String get quest_notice_questUnavailable;

  /// No description provided for @quest_hub_title.
  ///
  /// In en, this message translates to:
  /// **'Quest Map'**
  String get quest_hub_title;

  /// No description provided for @quest_hub_body.
  ///
  /// In en, this message translates to:
  /// **'Follow a path of games, earn stars and beat the boss.'**
  String get quest_hub_body;

  /// No description provided for @quest_hub_cta.
  ///
  /// In en, this message translates to:
  /// **'Open Quest Map'**
  String get quest_hub_cta;

  /// No description provided for @mobileAuth_firstName.
  ///
  /// In en, this message translates to:
  /// **'First name'**
  String get mobileAuth_firstName;

  /// No description provided for @mobileAuth_lastName.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get mobileAuth_lastName;

  /// No description provided for @mobileAuth_required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get mobileAuth_required;

  /// No description provided for @mobileAuth_invalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Invalid email address'**
  String get mobileAuth_invalidEmail;

  /// No description provided for @mobileAuth_usernameMin.
  ///
  /// In en, this message translates to:
  /// **'Username must be at least 3 characters'**
  String get mobileAuth_usernameMin;

  /// No description provided for @mobileAuth_usernameMax.
  ///
  /// In en, this message translates to:
  /// **'Username must be at most 20 characters'**
  String get mobileAuth_usernameMax;

  /// No description provided for @mobileAuth_usernameChars.
  ///
  /// In en, this message translates to:
  /// **'Username can only contain letters, numbers, and underscores'**
  String get mobileAuth_usernameChars;

  /// No description provided for @mobileAuth_passwordMin.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 8 characters'**
  String get mobileAuth_passwordMin;

  /// No description provided for @mobileAuth_passwordUpper.
  ///
  /// In en, this message translates to:
  /// **'Password must contain at least one uppercase letter'**
  String get mobileAuth_passwordUpper;

  /// No description provided for @mobileAuth_passwordLower.
  ///
  /// In en, this message translates to:
  /// **'Password must contain at least one lowercase letter'**
  String get mobileAuth_passwordLower;

  /// No description provided for @mobileAuth_passwordNumber.
  ///
  /// In en, this message translates to:
  /// **'Password must contain at least one number'**
  String get mobileAuth_passwordNumber;

  /// No description provided for @mobileAuth_passwordsMismatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords don\'\'t match'**
  String get mobileAuth_passwordsMismatch;

  /// No description provided for @mobileAuth_codeMin.
  ///
  /// In en, this message translates to:
  /// **'Code must be at least 6 characters'**
  String get mobileAuth_codeMin;

  /// No description provided for @mobileAuth_forgotSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your email and we\'\'ll send you a reset code'**
  String get mobileAuth_forgotSubtitle;

  /// No description provided for @mobileAuth_sendResetCode.
  ///
  /// In en, this message translates to:
  /// **'Send Reset Code'**
  String get mobileAuth_sendResetCode;

  /// No description provided for @mobileAuth_resetTitle.
  ///
  /// In en, this message translates to:
  /// **'Reset Password'**
  String get mobileAuth_resetTitle;

  /// No description provided for @mobileAuth_resetSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter the code from your email and your new password'**
  String get mobileAuth_resetSubtitle;

  /// No description provided for @mobileAuth_resetCode.
  ///
  /// In en, this message translates to:
  /// **'Reset Code'**
  String get mobileAuth_resetCode;

  /// No description provided for @mobileAuth_newPassword.
  ///
  /// In en, this message translates to:
  /// **'New Password'**
  String get mobileAuth_newPassword;

  /// No description provided for @mobileAuth_resetButton.
  ///
  /// In en, this message translates to:
  /// **'Reset Password'**
  String get mobileAuth_resetButton;

  /// No description provided for @mobileAuth_resetCodeSentTo.
  ///
  /// In en, this message translates to:
  /// **'If an account exists for {email}, we sent a reset code to it.'**
  String mobileAuth_resetCodeSentTo(String email);

  /// No description provided for @mobileAuth_haveResetCode.
  ///
  /// In en, this message translates to:
  /// **'Already have a code? Enter it'**
  String get mobileAuth_haveResetCode;

  /// No description provided for @mobileAuth_passwordResetDone.
  ///
  /// In en, this message translates to:
  /// **'Your password was reset. Sign in with your new password.'**
  String get mobileAuth_passwordResetDone;

  /// No description provided for @mobileAuth_backToLogin.
  ///
  /// In en, this message translates to:
  /// **'Back to Login'**
  String get mobileAuth_backToLogin;

  /// No description provided for @mobileAuth_resendCode.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get mobileAuth_resendCode;

  /// No description provided for @mobileAuth_resendCodeIn.
  ///
  /// In en, this message translates to:
  /// **'Resend code ({seconds}s)'**
  String mobileAuth_resendCodeIn(String seconds);

  /// No description provided for @mobileAuth_codeResent.
  ///
  /// In en, this message translates to:
  /// **'A new code was sent to your email.'**
  String get mobileAuth_codeResent;

  /// No description provided for @mobileAuth_enterEmailFirst.
  ///
  /// In en, this message translates to:
  /// **'Enter your email above first.'**
  String get mobileAuth_enterEmailFirst;

  /// No description provided for @mobileAuth_errNetwork.
  ///
  /// In en, this message translates to:
  /// **'Network error. Check your connection and try again.'**
  String get mobileAuth_errNetwork;

  /// No description provided for @mobileAuth_errCodeMismatch.
  ///
  /// In en, this message translates to:
  /// **'That code is incorrect. Check it and try again.'**
  String get mobileAuth_errCodeMismatch;

  /// No description provided for @mobileAuth_errCodeExpired.
  ///
  /// In en, this message translates to:
  /// **'That code has expired. Request a new one.'**
  String get mobileAuth_errCodeExpired;

  /// No description provided for @mobileAuth_errTooMany.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Please wait a while and try again.'**
  String get mobileAuth_errTooMany;

  /// No description provided for @mobileAuth_errInvalidPassword.
  ///
  /// In en, this message translates to:
  /// **'That password does not meet the requirements.'**
  String get mobileAuth_errInvalidPassword;

  /// No description provided for @mobileAuth_errUserExists.
  ///
  /// In en, this message translates to:
  /// **'An account with this email already exists.'**
  String get mobileAuth_errUserExists;

  /// No description provided for @mobileAuth_errUnconfirmed.
  ///
  /// In en, this message translates to:
  /// **'Please confirm your account first (check your email for a code).'**
  String get mobileAuth_errUnconfirmed;

  /// No description provided for @mobileAuth_errNewPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'A new password is required for this account. Please reset your password.'**
  String get mobileAuth_errNewPasswordRequired;

  /// No description provided for @mobileAuth_errGoogle.
  ///
  /// In en, this message translates to:
  /// **'Google sign-in failed. Please try again.'**
  String get mobileAuth_errGoogle;

  /// No description provided for @mobileAuth_errGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get mobileAuth_errGeneric;

  /// No description provided for @mobileGame_limitTitle.
  ///
  /// In en, this message translates to:
  /// **'Daily limit reached'**
  String get mobileGame_limitTitle;

  /// No description provided for @mobileGame_limitBody.
  ///
  /// In en, this message translates to:
  /// **'You have used all your plays for today. Come back tomorrow!'**
  String get mobileGame_limitBody;

  /// No description provided for @mobileGame_unavailableTitle.
  ///
  /// In en, this message translates to:
  /// **'Not available in the app yet'**
  String get mobileGame_unavailableTitle;

  /// No description provided for @mobileGame_unavailableBody.
  ///
  /// In en, this message translates to:
  /// **'This game is not available in the app yet.'**
  String get mobileGame_unavailableBody;

  /// No description provided for @mobileGame_comingToApp.
  ///
  /// In en, this message translates to:
  /// **'Coming to the app soon'**
  String get mobileGame_comingToApp;

  /// No description provided for @mobileGame_notAvailableLabel.
  ///
  /// In en, this message translates to:
  /// **'Not available in the app yet'**
  String get mobileGame_notAvailableLabel;

  /// No description provided for @mobileGame_goBack.
  ///
  /// In en, this message translates to:
  /// **'Go back'**
  String get mobileGame_goBack;

  /// No description provided for @mobileGame_starting.
  ///
  /// In en, this message translates to:
  /// **'Starting game...'**
  String get mobileGame_starting;

  /// No description provided for @mobileGame_leaveTitle.
  ///
  /// In en, this message translates to:
  /// **'Leave this game?'**
  String get mobileGame_leaveTitle;

  /// No description provided for @mobileGame_leaveBody.
  ///
  /// In en, this message translates to:
  /// **'Your progress in this round will be lost.'**
  String get mobileGame_leaveBody;

  /// No description provided for @mobileGame_leave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get mobileGame_leave;

  /// No description provided for @mobileGame_keepPlaying.
  ///
  /// In en, this message translates to:
  /// **'Keep playing'**
  String get mobileGame_keepPlaying;

  /// No description provided for @mobileGame_scoreHiccup.
  ///
  /// In en, this message translates to:
  /// **'Your score could not be loaded this time.'**
  String get mobileGame_scoreHiccup;

  /// No description provided for @mobileGame_complete.
  ///
  /// In en, this message translates to:
  /// **'Complete!'**
  String get mobileGame_complete;

  /// No description provided for @mobileGame_leaderboardRank.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard rank'**
  String get mobileGame_leaderboardRank;

  /// No description provided for @mobileGame_achievementsUnlocked.
  ///
  /// In en, this message translates to:
  /// **'Achievements unlocked'**
  String get mobileGame_achievementsUnlocked;

  /// No description provided for @mobileGame_backToHub.
  ///
  /// In en, this message translates to:
  /// **'Back to hub'**
  String get mobileGame_backToHub;

  /// No description provided for @mobileGame_questStartFailed.
  ///
  /// In en, this message translates to:
  /// **'That quest node could not be started. You are back on the map.'**
  String get mobileGame_questStartFailed;

  /// No description provided for @mobileGame_ratingsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} ratings'**
  String mobileGame_ratingsCount(String count);

  /// No description provided for @mobileGame_questLocked.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get mobileGame_questLocked;

  /// No description provided for @mobileGame_questStarsLabel.
  ///
  /// In en, this message translates to:
  /// **'{count} of 3 stars'**
  String mobileGame_questStarsLabel(String count);

  /// No description provided for @mobileGame_questNodePlayUnavailable.
  ///
  /// In en, this message translates to:
  /// **'This game is not available in the app yet.'**
  String get mobileGame_questNodePlayUnavailable;

  /// No description provided for @mobileGame_worldLockedApp.
  ///
  /// In en, this message translates to:
  /// **'This world is not available in the app yet.'**
  String get mobileGame_worldLockedApp;

  /// No description provided for @mobileStats_tabHub.
  ///
  /// In en, this message translates to:
  /// **'Hub'**
  String get mobileStats_tabHub;

  /// No description provided for @mobileStats_tabQuest.
  ///
  /// In en, this message translates to:
  /// **'Quest'**
  String get mobileStats_tabQuest;

  /// No description provided for @mobileStats_tabDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get mobileStats_tabDashboard;

  /// No description provided for @mobileStats_tabLeaderboard.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard'**
  String get mobileStats_tabLeaderboard;

  /// No description provided for @mobileStats_tabProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get mobileStats_tabProfile;

  /// No description provided for @mobileStats_overall.
  ///
  /// In en, this message translates to:
  /// **'Overall'**
  String get mobileStats_overall;

  /// No description provided for @mobileStats_totalGames.
  ///
  /// In en, this message translates to:
  /// **'Total Games'**
  String get mobileStats_totalGames;

  /// No description provided for @mobileStats_bestScore.
  ///
  /// In en, this message translates to:
  /// **'Best Score'**
  String get mobileStats_bestScore;

  /// No description provided for @mobileStats_completedGames.
  ///
  /// In en, this message translates to:
  /// **'Completed Games'**
  String get mobileStats_completedGames;

  /// No description provided for @mobileStats_yourPerformance.
  ///
  /// In en, this message translates to:
  /// **'Your Performance'**
  String get mobileStats_yourPerformance;

  /// No description provided for @mobileStats_ofPlayers.
  ///
  /// In en, this message translates to:
  /// **'of {count} players'**
  String mobileStats_ofPlayers(String count);

  /// No description provided for @mobileStats_points.
  ///
  /// In en, this message translates to:
  /// **'points'**
  String get mobileStats_points;

  /// No description provided for @mobileStats_topTen.
  ///
  /// In en, this message translates to:
  /// **'Top 10%! 🌟'**
  String get mobileStats_topTen;

  /// No description provided for @mobileStats_topQuarter.
  ///
  /// In en, this message translates to:
  /// **'Top 25%! 🎯'**
  String get mobileStats_topQuarter;

  /// No description provided for @mobileStats_topHalf.
  ///
  /// In en, this message translates to:
  /// **'Top 50%! 💪'**
  String get mobileStats_topHalf;

  /// No description provided for @mobileStats_keepPlaying.
  ///
  /// In en, this message translates to:
  /// **'Keep playing! 🎮'**
  String get mobileStats_keepPlaying;

  /// No description provided for @mobileStats_playToRank.
  ///
  /// In en, this message translates to:
  /// **'Play games to get ranked!'**
  String get mobileStats_playToRank;

  /// No description provided for @mobileStats_viewLeaderboard.
  ///
  /// In en, this message translates to:
  /// **'View Leaderboard →'**
  String get mobileStats_viewLeaderboard;

  /// No description provided for @mobileStats_trendTitle.
  ///
  /// In en, this message translates to:
  /// **'Score Trend'**
  String get mobileStats_trendTitle;

  /// No description provided for @mobileStats_trendUp.
  ///
  /// In en, this message translates to:
  /// **'Up {percent}%!'**
  String mobileStats_trendUp(String percent);

  /// No description provided for @mobileStats_trendDown.
  ///
  /// In en, this message translates to:
  /// **'Down {percent}%'**
  String mobileStats_trendDown(String percent);

  /// No description provided for @mobileStats_trendStable.
  ///
  /// In en, this message translates to:
  /// **'Stable'**
  String get mobileStats_trendStable;

  /// No description provided for @mobileStats_trendNoData.
  ///
  /// In en, this message translates to:
  /// **'Play more games to see your trend.'**
  String get mobileStats_trendNoData;

  /// No description provided for @mobileStats_statisticsTitle.
  ///
  /// In en, this message translates to:
  /// **'Statistics'**
  String get mobileStats_statisticsTitle;

  /// No description provided for @mobileStats_statisticsDesc.
  ///
  /// In en, this message translates to:
  /// **'View your detailed game statistics'**
  String get mobileStats_statisticsDesc;

  /// No description provided for @mobileStats_historyTitle.
  ///
  /// In en, this message translates to:
  /// **'Game History'**
  String get mobileStats_historyTitle;

  /// No description provided for @mobileStats_historyDesc.
  ///
  /// In en, this message translates to:
  /// **'See all your past games'**
  String get mobileStats_historyDesc;

  /// No description provided for @mobileStats_achievementsDesc.
  ///
  /// In en, this message translates to:
  /// **'Track your progress and unlock badges'**
  String get mobileStats_achievementsDesc;

  /// No description provided for @mobileStats_contactDesc.
  ///
  /// In en, this message translates to:
  /// **'Report a bug or send feedback'**
  String get mobileStats_contactDesc;

  /// No description provided for @mobileStats_noData.
  ///
  /// In en, this message translates to:
  /// **'No Data Yet'**
  String get mobileStats_noData;

  /// No description provided for @mobileStats_noDataBody.
  ///
  /// In en, this message translates to:
  /// **'Play some games to see your statistics here!'**
  String get mobileStats_noDataBody;

  /// No description provided for @mobileStats_errorTitle.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get mobileStats_errorTitle;

  /// No description provided for @mobileStats_statsLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load statistics. Please try again.'**
  String get mobileStats_statsLoadFailed;

  /// No description provided for @mobileStats_allGames.
  ///
  /// In en, this message translates to:
  /// **'All Games'**
  String get mobileStats_allGames;

  /// No description provided for @mobileStats_gamesPlayed.
  ///
  /// In en, this message translates to:
  /// **'Games Played'**
  String get mobileStats_gamesPlayed;

  /// No description provided for @mobileStats_avgScore.
  ///
  /// In en, this message translates to:
  /// **'Avg Score'**
  String get mobileStats_avgScore;

  /// No description provided for @mobileStats_avgAccuracy.
  ///
  /// In en, this message translates to:
  /// **'Avg Accuracy'**
  String get mobileStats_avgAccuracy;

  /// No description provided for @mobileStats_totalPlayTime.
  ///
  /// In en, this message translates to:
  /// **'Total Play Time'**
  String get mobileStats_totalPlayTime;

  /// No description provided for @mobileStats_gamesPerWeek.
  ///
  /// In en, this message translates to:
  /// **'Games Per Week'**
  String get mobileStats_gamesPerWeek;

  /// No description provided for @mobileStats_gamesBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Games Played by Game'**
  String get mobileStats_gamesBreakdown;

  /// No description provided for @mobileStats_distinctGames.
  ///
  /// In en, this message translates to:
  /// **'{count} different games played'**
  String mobileStats_distinctGames(String count);

  /// No description provided for @mobileStats_scoreProgression.
  ///
  /// In en, this message translates to:
  /// **'Score Progression'**
  String get mobileStats_scoreProgression;

  /// No description provided for @mobileStats_progressionHelp.
  ///
  /// In en, this message translates to:
  /// **'Each bar shows your score as a % of your personal best for that game. The line shows your rolling average.'**
  String get mobileStats_progressionHelp;

  /// No description provided for @mobileStats_progressionEmpty.
  ///
  /// In en, this message translates to:
  /// **'Play more games to see your progression!'**
  String get mobileStats_progressionEmpty;

  /// No description provided for @mobileStats_accuracyTrend.
  ///
  /// In en, this message translates to:
  /// **'Accuracy Trend'**
  String get mobileStats_accuracyTrend;

  /// No description provided for @mobileStats_speedTrend.
  ///
  /// In en, this message translates to:
  /// **'Speed Trend'**
  String get mobileStats_speedTrend;

  /// No description provided for @mobileStats_avgLabel.
  ///
  /// In en, this message translates to:
  /// **'Avg: {value}'**
  String mobileStats_avgLabel(String value);

  /// No description provided for @mobileStats_personalBests.
  ///
  /// In en, this message translates to:
  /// **'Personal Bests'**
  String get mobileStats_personalBests;

  /// No description provided for @mobileStats_bestLine.
  ///
  /// In en, this message translates to:
  /// **'{difficulty} · {time} · {accuracy}% accuracy'**
  String mobileStats_bestLine(String difficulty, String time, String accuracy);

  /// No description provided for @mobileStats_noGames.
  ///
  /// In en, this message translates to:
  /// **'No Games Yet'**
  String get mobileStats_noGames;

  /// No description provided for @mobileStats_noGamesBody.
  ///
  /// In en, this message translates to:
  /// **'Play some games and your history will appear here!'**
  String get mobileStats_noGamesBody;

  /// No description provided for @mobileStats_historyLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load game history. Please try again.'**
  String get mobileStats_historyLoadFailed;

  /// No description provided for @mobileStats_gamesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} games'**
  String mobileStats_gamesCount(String count);

  /// No description provided for @mobileStats_rangeOf.
  ///
  /// In en, this message translates to:
  /// **'{from}–{to} of {total}'**
  String mobileStats_rangeOf(String from, String to, String total);

  /// No description provided for @mobileStats_allDifficulties.
  ///
  /// In en, this message translates to:
  /// **'All Difficulties'**
  String get mobileStats_allDifficulties;

  /// No description provided for @mobileStats_easy.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get mobileStats_easy;

  /// No description provided for @mobileStats_medium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get mobileStats_medium;

  /// No description provided for @mobileStats_hard.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get mobileStats_hard;

  /// No description provided for @mobileStats_sortDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get mobileStats_sortDate;

  /// No description provided for @mobileStats_sortScore.
  ///
  /// In en, this message translates to:
  /// **'Score'**
  String get mobileStats_sortScore;

  /// No description provided for @mobileStats_sortAccuracy.
  ///
  /// In en, this message translates to:
  /// **'Accuracy'**
  String get mobileStats_sortAccuracy;

  /// No description provided for @mobileStats_sortTime.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get mobileStats_sortTime;

  /// No description provided for @mobileStats_prev.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get mobileStats_prev;

  /// No description provided for @mobileStats_next.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get mobileStats_next;

  /// No description provided for @mobileStats_pageOf.
  ///
  /// In en, this message translates to:
  /// **'Page {page} of {pages}'**
  String mobileStats_pageOf(String page, String pages);

  /// No description provided for @mobileStats_noMatch.
  ///
  /// In en, this message translates to:
  /// **'No games match your filters. Try adjusting them.'**
  String get mobileStats_noMatch;

  /// No description provided for @mobileStats_pb.
  ///
  /// In en, this message translates to:
  /// **'PB'**
  String get mobileStats_pb;

  /// No description provided for @mobileStats_unlockedCount.
  ///
  /// In en, this message translates to:
  /// **'{unlocked}/{total} unlocked'**
  String mobileStats_unlockedCount(String unlocked, String total);

  /// No description provided for @mobileStats_overallProgress.
  ///
  /// In en, this message translates to:
  /// **'Overall Progress'**
  String get mobileStats_overallProgress;

  /// No description provided for @mobileStats_earnedCount.
  ///
  /// In en, this message translates to:
  /// **'{count} earned'**
  String mobileStats_earnedCount(String count);

  /// No description provided for @mobileStats_remainingCount.
  ///
  /// In en, this message translates to:
  /// **'{count} remaining'**
  String mobileStats_remainingCount(String count);

  /// No description provided for @mobileStats_all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get mobileStats_all;

  /// No description provided for @mobileStats_catGettingStarted.
  ///
  /// In en, this message translates to:
  /// **'Getting Started'**
  String get mobileStats_catGettingStarted;

  /// No description provided for @mobileStats_catDedication.
  ///
  /// In en, this message translates to:
  /// **'Dedication'**
  String get mobileStats_catDedication;

  /// No description provided for @mobileStats_catMastery.
  ///
  /// In en, this message translates to:
  /// **'Mastery'**
  String get mobileStats_catMastery;

  /// No description provided for @mobileStats_catGameSpecific.
  ///
  /// In en, this message translates to:
  /// **'Game Mastery'**
  String get mobileStats_catGameSpecific;

  /// No description provided for @mobileStats_earnedOn.
  ///
  /// In en, this message translates to:
  /// **'Earned {date}'**
  String mobileStats_earnedOn(String date);

  /// No description provided for @mobileStats_progressBest.
  ///
  /// In en, this message translates to:
  /// **'Best: {value}'**
  String mobileStats_progressBest(String value);

  /// No description provided for @mobileStats_progressFastest.
  ///
  /// In en, this message translates to:
  /// **'Fastest: {value}'**
  String mobileStats_progressFastest(String value);

  /// No description provided for @mobileStats_progressGames.
  ///
  /// In en, this message translates to:
  /// **'{current}/{target} games'**
  String mobileStats_progressGames(String current, String target);

  /// No description provided for @mobileStats_progressCount.
  ///
  /// In en, this message translates to:
  /// **'{current}/{target}'**
  String mobileStats_progressCount(String current, String target);

  /// No description provided for @mobileStats_masterName.
  ///
  /// In en, this message translates to:
  /// **'{game} Master'**
  String mobileStats_masterName(String game);

  /// No description provided for @mobileStats_masterDesc.
  ///
  /// In en, this message translates to:
  /// **'Score 5,000+ in {game}'**
  String mobileStats_masterDesc(String game);

  /// No description provided for @mobileStats_noEntries.
  ///
  /// In en, this message translates to:
  /// **'No Entries Yet'**
  String get mobileStats_noEntries;

  /// No description provided for @mobileStats_noEntriesBody.
  ///
  /// In en, this message translates to:
  /// **'Be the first to play and claim the top spot!'**
  String get mobileStats_noEntriesBody;

  /// No description provided for @mobileStats_you.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get mobileStats_you;

  /// No description provided for @mobileStats_language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get mobileStats_language;

  /// No description provided for @mobileStats_signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get mobileStats_signOut;

  /// No description provided for @mobileStats_prefsLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load your email preferences.'**
  String get mobileStats_prefsLoadFailed;

  /// No description provided for @mobileStats_prefsSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not save your choice. Try again.'**
  String get mobileStats_prefsSaveFailed;

  /// No description provided for @mobileStats_tierValue.
  ///
  /// In en, this message translates to:
  /// **'{tier}'**
  String mobileStats_tierValue(String tier);

  /// No description provided for @mobileStats_contactTitleSubject.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get mobileStats_contactTitleSubject;

  /// No description provided for @mobileStats_contactValidation.
  ///
  /// In en, this message translates to:
  /// **'Enter a subject and a message.'**
  String get mobileStats_contactValidation;

  /// No description provided for @mobileStats_ach_firstGame_name.
  ///
  /// In en, this message translates to:
  /// **'First Game'**
  String get mobileStats_ach_firstGame_name;

  /// No description provided for @mobileStats_ach_firstGame_desc.
  ///
  /// In en, this message translates to:
  /// **'Play your first game'**
  String get mobileStats_ach_firstGame_desc;

  /// No description provided for @mobileStats_ach_sharpShooter_name.
  ///
  /// In en, this message translates to:
  /// **'Sharp Shooter'**
  String get mobileStats_ach_sharpShooter_name;

  /// No description provided for @mobileStats_ach_sharpShooter_desc.
  ///
  /// In en, this message translates to:
  /// **'Get 90%+ accuracy on any game'**
  String get mobileStats_ach_sharpShooter_desc;

  /// No description provided for @mobileStats_ach_speedDemon_name.
  ///
  /// In en, this message translates to:
  /// **'Speed Demon'**
  String get mobileStats_ach_speedDemon_name;

  /// No description provided for @mobileStats_ach_speedDemon_desc.
  ///
  /// In en, this message translates to:
  /// **'Complete any game under 30 seconds'**
  String get mobileStats_ach_speedDemon_desc;

  /// No description provided for @mobileStats_ach_explorer_name.
  ///
  /// In en, this message translates to:
  /// **'Explorer'**
  String get mobileStats_ach_explorer_name;

  /// No description provided for @mobileStats_ach_explorer_desc.
  ///
  /// In en, this message translates to:
  /// **'Try 3 different games'**
  String get mobileStats_ach_explorer_desc;

  /// No description provided for @mobileStats_ach_highRoller_name.
  ///
  /// In en, this message translates to:
  /// **'High Roller'**
  String get mobileStats_ach_highRoller_name;

  /// No description provided for @mobileStats_ach_highRoller_desc.
  ///
  /// In en, this message translates to:
  /// **'Score over 5,000 in any game'**
  String get mobileStats_ach_highRoller_desc;

  /// No description provided for @mobileStats_ach_onFire_name.
  ///
  /// In en, this message translates to:
  /// **'On Fire'**
  String get mobileStats_ach_onFire_name;

  /// No description provided for @mobileStats_ach_onFire_desc.
  ///
  /// In en, this message translates to:
  /// **'Play 10 games'**
  String get mobileStats_ach_onFire_desc;

  /// No description provided for @mobileStats_ach_committed_name.
  ///
  /// In en, this message translates to:
  /// **'Committed'**
  String get mobileStats_ach_committed_name;

  /// No description provided for @mobileStats_ach_committed_desc.
  ///
  /// In en, this message translates to:
  /// **'Play 25 games'**
  String get mobileStats_ach_committed_desc;

  /// No description provided for @mobileStats_ach_veteran_name.
  ///
  /// In en, this message translates to:
  /// **'Veteran'**
  String get mobileStats_ach_veteran_name;

  /// No description provided for @mobileStats_ach_veteran_desc.
  ///
  /// In en, this message translates to:
  /// **'Play 50 games'**
  String get mobileStats_ach_veteran_desc;

  /// No description provided for @mobileStats_ach_legend_name.
  ///
  /// In en, this message translates to:
  /// **'Legend'**
  String get mobileStats_ach_legend_name;

  /// No description provided for @mobileStats_ach_legend_desc.
  ///
  /// In en, this message translates to:
  /// **'Play 100 games'**
  String get mobileStats_ach_legend_desc;

  /// No description provided for @mobileStats_ach_brainPower_name.
  ///
  /// In en, this message translates to:
  /// **'Brain Power'**
  String get mobileStats_ach_brainPower_name;

  /// No description provided for @mobileStats_ach_brainPower_desc.
  ///
  /// In en, this message translates to:
  /// **'Score 5,000+ on 3 different games'**
  String get mobileStats_ach_brainPower_desc;

  /// No description provided for @mobileStats_ach_perfectionist_name.
  ///
  /// In en, this message translates to:
  /// **'Perfectionist'**
  String get mobileStats_ach_perfectionist_name;

  /// No description provided for @mobileStats_ach_perfectionist_desc.
  ///
  /// In en, this message translates to:
  /// **'Get 100% accuracy on any game'**
  String get mobileStats_ach_perfectionist_desc;

  /// No description provided for @mobileStats_ach_worldTraveler_name.
  ///
  /// In en, this message translates to:
  /// **'World Traveler'**
  String get mobileStats_ach_worldTraveler_name;

  /// No description provided for @mobileStats_ach_worldTraveler_desc.
  ///
  /// In en, this message translates to:
  /// **'Play all {count} games'**
  String mobileStats_ach_worldTraveler_desc(String count);

  /// No description provided for @mobileStats_ach_elite_name.
  ///
  /// In en, this message translates to:
  /// **'Elite'**
  String get mobileStats_ach_elite_name;

  /// No description provided for @mobileStats_ach_elite_desc.
  ///
  /// In en, this message translates to:
  /// **'Score over 7,000 in any game'**
  String get mobileStats_ach_elite_desc;

  /// No description provided for @mobileStats_ach_hardMode_name.
  ///
  /// In en, this message translates to:
  /// **'Difficulty Unlocked'**
  String get mobileStats_ach_hardMode_name;

  /// No description provided for @mobileStats_ach_hardMode_desc.
  ///
  /// In en, this message translates to:
  /// **'Complete a game on Hard difficulty'**
  String get mobileStats_ach_hardMode_desc;

  /// No description provided for @mobileLanguage_chooseLanguage.
  ///
  /// In en, this message translates to:
  /// **'Choose a language to learn'**
  String get mobileLanguage_chooseLanguage;

  /// No description provided for @mobileLanguage_levelLabel.
  ///
  /// In en, this message translates to:
  /// **'Level {level}'**
  String mobileLanguage_levelLabel(String level);

  /// No description provided for @mobileLanguage_wordsLearnedLabel.
  ///
  /// In en, this message translates to:
  /// **'{count} words'**
  String mobileLanguage_wordsLearnedLabel(String count);

  /// No description provided for @mobileLanguage_learnTitle.
  ///
  /// In en, this message translates to:
  /// **'Learn {language}'**
  String mobileLanguage_learnTitle(String language);

  /// No description provided for @mobileLanguage_configure.
  ///
  /// In en, this message translates to:
  /// **'Configure your learning session'**
  String get mobileLanguage_configure;

  /// No description provided for @mobileLanguage_chooseMode.
  ///
  /// In en, this message translates to:
  /// **'Choose Mode'**
  String get mobileLanguage_chooseMode;

  /// No description provided for @mobileLanguage_modeImageMatch.
  ///
  /// In en, this message translates to:
  /// **'Image Match'**
  String get mobileLanguage_modeImageMatch;

  /// No description provided for @mobileLanguage_modeImageMatchDesc.
  ///
  /// In en, this message translates to:
  /// **'See the word, pick the correct image'**
  String get mobileLanguage_modeImageMatchDesc;

  /// No description provided for @mobileLanguage_modePronunciation.
  ///
  /// In en, this message translates to:
  /// **'Pronunciation'**
  String get mobileLanguage_modePronunciation;

  /// No description provided for @mobileLanguage_modePronunciationDesc.
  ///
  /// In en, this message translates to:
  /// **'See an image, speak the word correctly'**
  String get mobileLanguage_modePronunciationDesc;

  /// No description provided for @mobileLanguage_accuracyVaries.
  ///
  /// In en, this message translates to:
  /// **'Recognition accuracy may vary for this language'**
  String get mobileLanguage_accuracyVaries;

  /// No description provided for @mobileLanguage_diffBeginner.
  ///
  /// In en, this message translates to:
  /// **'Beginner'**
  String get mobileLanguage_diffBeginner;

  /// No description provided for @mobileLanguage_diffIntermediate.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get mobileLanguage_diffIntermediate;

  /// No description provided for @mobileLanguage_diffAdvanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get mobileLanguage_diffAdvanced;

  /// No description provided for @mobileLanguage_diffBeginnerDesc.
  ///
  /// In en, this message translates to:
  /// **'Basic vocabulary, {count} words'**
  String mobileLanguage_diffBeginnerDesc(String count);

  /// No description provided for @mobileLanguage_diffIntermediateDesc.
  ///
  /// In en, this message translates to:
  /// **'Common words, {count} words'**
  String mobileLanguage_diffIntermediateDesc(String count);

  /// No description provided for @mobileLanguage_diffAdvancedDesc.
  ///
  /// In en, this message translates to:
  /// **'Complex vocabulary, {count} words'**
  String mobileLanguage_diffAdvancedDesc(String count);

  /// No description provided for @mobileLanguage_chooseCategory.
  ///
  /// In en, this message translates to:
  /// **'Choose Category'**
  String get mobileLanguage_chooseCategory;

  /// No description provided for @mobileLanguage_catAnimals.
  ///
  /// In en, this message translates to:
  /// **'Animals'**
  String get mobileLanguage_catAnimals;

  /// No description provided for @mobileLanguage_catAnimalsDesc.
  ///
  /// In en, this message translates to:
  /// **'Dogs, cats, birds, and more'**
  String get mobileLanguage_catAnimalsDesc;

  /// No description provided for @mobileLanguage_catFood.
  ///
  /// In en, this message translates to:
  /// **'Food & Drinks'**
  String get mobileLanguage_catFood;

  /// No description provided for @mobileLanguage_catFoodDesc.
  ///
  /// In en, this message translates to:
  /// **'Fruits, vegetables, meals'**
  String get mobileLanguage_catFoodDesc;

  /// No description provided for @mobileLanguage_catColors.
  ///
  /// In en, this message translates to:
  /// **'Colors'**
  String get mobileLanguage_catColors;

  /// No description provided for @mobileLanguage_catColorsDesc.
  ///
  /// In en, this message translates to:
  /// **'Basic and advanced colors'**
  String get mobileLanguage_catColorsDesc;

  /// No description provided for @mobileLanguage_catNumbers.
  ///
  /// In en, this message translates to:
  /// **'Numbers'**
  String get mobileLanguage_catNumbers;

  /// No description provided for @mobileLanguage_catNumbersDesc.
  ///
  /// In en, this message translates to:
  /// **'Numbers 1-20 and beyond'**
  String get mobileLanguage_catNumbersDesc;

  /// No description provided for @mobileLanguage_catObjects.
  ///
  /// In en, this message translates to:
  /// **'Objects'**
  String get mobileLanguage_catObjects;

  /// No description provided for @mobileLanguage_catObjectsDesc.
  ///
  /// In en, this message translates to:
  /// **'Everyday items and tools'**
  String get mobileLanguage_catObjectsDesc;

  /// No description provided for @mobileLanguage_catNature.
  ///
  /// In en, this message translates to:
  /// **'Nature'**
  String get mobileLanguage_catNature;

  /// No description provided for @mobileLanguage_catNatureDesc.
  ///
  /// In en, this message translates to:
  /// **'Trees, flowers, weather'**
  String get mobileLanguage_catNatureDesc;

  /// No description provided for @mobileLanguage_startLearning.
  ///
  /// In en, this message translates to:
  /// **'Start Learning'**
  String get mobileLanguage_startLearning;

  /// No description provided for @mobileLanguage_languageNotFound.
  ///
  /// In en, this message translates to:
  /// **'Language not found'**
  String get mobileLanguage_languageNotFound;

  /// No description provided for @mobileLanguage_backToLanguages.
  ///
  /// In en, this message translates to:
  /// **'Back to language selection'**
  String get mobileLanguage_backToLanguages;

  /// No description provided for @mobileLanguage_loadingWords.
  ///
  /// In en, this message translates to:
  /// **'Loading words...'**
  String get mobileLanguage_loadingWords;

  /// No description provided for @mobileLanguage_noWords.
  ///
  /// In en, this message translates to:
  /// **'No vocabulary is available for this language and category. Please try a different category.'**
  String get mobileLanguage_noWords;

  /// No description provided for @mobileLanguage_loadFailed.
  ///
  /// In en, this message translates to:
  /// **'The words could not be loaded. Check your connection and try again.'**
  String get mobileLanguage_loadFailed;

  /// No description provided for @mobileLanguage_retryLoad.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get mobileLanguage_retryLoad;

  /// No description provided for @mobileLanguage_questionOf.
  ///
  /// In en, this message translates to:
  /// **'Question {current} of {total}'**
  String mobileLanguage_questionOf(String current, String total);

  /// No description provided for @mobileLanguage_correctCount.
  ///
  /// In en, this message translates to:
  /// **'{count} correct'**
  String mobileLanguage_correctCount(String count);

  /// No description provided for @mobileLanguage_hearWord.
  ///
  /// In en, this message translates to:
  /// **'Hear the word'**
  String get mobileLanguage_hearWord;

  /// No description provided for @mobileLanguage_whichImage.
  ///
  /// In en, this message translates to:
  /// **'Which image matches this word?'**
  String get mobileLanguage_whichImage;

  /// No description provided for @mobileLanguage_imageUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Image unavailable'**
  String get mobileLanguage_imageUnavailable;

  /// No description provided for @mobileLanguage_attempt.
  ///
  /// In en, this message translates to:
  /// **'Attempt {current}/{max}'**
  String mobileLanguage_attempt(String current, String max);

  /// No description provided for @mobileLanguage_record.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get mobileLanguage_record;

  /// No description provided for @mobileLanguage_stopRecording.
  ///
  /// In en, this message translates to:
  /// **'Stop Recording'**
  String get mobileLanguage_stopRecording;

  /// No description provided for @mobileLanguage_tapToRecord.
  ///
  /// In en, this message translates to:
  /// **'Tap the microphone and say the word'**
  String get mobileLanguage_tapToRecord;

  /// No description provided for @mobileLanguage_listening.
  ///
  /// In en, this message translates to:
  /// **'Listening... speak now!'**
  String get mobileLanguage_listening;

  /// No description provided for @mobileLanguage_processing.
  ///
  /// In en, this message translates to:
  /// **'Processing...'**
  String get mobileLanguage_processing;

  /// No description provided for @mobileLanguage_heard.
  ///
  /// In en, this message translates to:
  /// **'Heard: \"{text}\"'**
  String mobileLanguage_heard(String text);

  /// No description provided for @mobileLanguage_recognized.
  ///
  /// In en, this message translates to:
  /// **'✓ Recognized'**
  String get mobileLanguage_recognized;

  /// No description provided for @mobileLanguage_notRecognized.
  ///
  /// In en, this message translates to:
  /// **'✗ Not recognized'**
  String get mobileLanguage_notRecognized;

  /// No description provided for @mobileLanguage_niceHeard.
  ///
  /// In en, this message translates to:
  /// **'Nice! We heard the right word.'**
  String get mobileLanguage_niceHeard;

  /// No description provided for @mobileLanguage_didntCatch.
  ///
  /// In en, this message translates to:
  /// **'We didn\'\'t catch the right word. Try again!'**
  String get mobileLanguage_didntCatch;

  /// No description provided for @mobileLanguage_retryLeft.
  ///
  /// In en, this message translates to:
  /// **'Retry ({count} left)'**
  String mobileLanguage_retryLeft(String count);

  /// No description provided for @mobileLanguage_nextWord.
  ///
  /// In en, this message translates to:
  /// **'Next Word'**
  String get mobileLanguage_nextWord;

  /// No description provided for @mobileLanguage_finish.
  ///
  /// In en, this message translates to:
  /// **'Finish'**
  String get mobileLanguage_finish;

  /// No description provided for @mobileLanguage_fbTryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get mobileLanguage_fbTryAgain;

  /// No description provided for @mobileLanguage_fbGoodEffort.
  ///
  /// In en, this message translates to:
  /// **'Good Effort'**
  String get mobileLanguage_fbGoodEffort;

  /// No description provided for @mobileLanguage_fbGreat.
  ///
  /// In en, this message translates to:
  /// **'Great!'**
  String get mobileLanguage_fbGreat;

  /// No description provided for @mobileLanguage_fbPerfect.
  ///
  /// In en, this message translates to:
  /// **'Perfect!'**
  String get mobileLanguage_fbPerfect;

  /// No description provided for @mobileLanguage_errNotAllowed.
  ///
  /// In en, this message translates to:
  /// **'I need to hear you! Please allow microphone and speech access in Settings and try again.'**
  String get mobileLanguage_errNotAllowed;

  /// No description provided for @mobileLanguage_errNoSpeech.
  ///
  /// In en, this message translates to:
  /// **'I didn\'\'t hear anything. Tap the microphone and speak clearly!'**
  String get mobileLanguage_errNoSpeech;

  /// No description provided for @mobileLanguage_errAudio.
  ///
  /// In en, this message translates to:
  /// **'I can\'\'t use the microphone. Make sure it is free and try again.'**
  String get mobileLanguage_errAudio;

  /// No description provided for @mobileLanguage_errNetwork.
  ///
  /// In en, this message translates to:
  /// **'Oops! Check your internet connection and try again.'**
  String get mobileLanguage_errNetwork;

  /// No description provided for @mobileLanguage_errAborted.
  ///
  /// In en, this message translates to:
  /// **'Recording was stopped. Tap the microphone to try again!'**
  String get mobileLanguage_errAborted;

  /// No description provided for @mobileLanguage_errNotSupported.
  ///
  /// In en, this message translates to:
  /// **'Speech recognition is not available on this device.'**
  String get mobileLanguage_errNotSupported;

  /// No description provided for @mobileLanguage_errUnknown.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again!'**
  String get mobileLanguage_errUnknown;

  /// No description provided for @mobileLanguage_pronUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Not available in the app yet'**
  String get mobileLanguage_pronUnavailable;

  /// No description provided for @mobileBoard_selectLevel.
  ///
  /// In en, this message translates to:
  /// **'Select a Level'**
  String get mobileBoard_selectLevel;

  /// No description provided for @mobileBoard_chooseLevel.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Level'**
  String get mobileBoard_chooseLevel;

  /// No description provided for @mobileBoard_gameOver.
  ///
  /// In en, this message translates to:
  /// **'Game Over!'**
  String get mobileBoard_gameOver;

  /// No description provided for @mobileBoard_seeScore.
  ///
  /// In en, this message translates to:
  /// **'See Score'**
  String get mobileBoard_seeScore;

  /// No description provided for @mobileBoard_tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get mobileBoard_tryAgain;

  /// No description provided for @mobileBoard_roundOf.
  ///
  /// In en, this message translates to:
  /// **'Round {current}/{total}'**
  String mobileBoard_roundOf(String current, String total);

  /// No description provided for @mobileBoard_lives.
  ///
  /// In en, this message translates to:
  /// **'Lives'**
  String get mobileBoard_lives;

  /// No description provided for @mobileBoard_timeLabel.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get mobileBoard_timeLabel;

  /// No description provided for @mobileBoard_sudokuSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Fill the grid so every row, column and box has 1–9!'**
  String get mobileBoard_sudokuSubtitle;

  /// No description provided for @mobileBoard_sudokuGiven.
  ///
  /// In en, this message translates to:
  /// **'{count} numbers given'**
  String mobileBoard_sudokuGiven(String count);

  /// No description provided for @mobileBoard_sudokuEasyDetail.
  ///
  /// In en, this message translates to:
  /// **'Great for beginners'**
  String get mobileBoard_sudokuEasyDetail;

  /// No description provided for @mobileBoard_sudokuMediumDetail.
  ///
  /// In en, this message translates to:
  /// **'A solid challenge'**
  String get mobileBoard_sudokuMediumDetail;

  /// No description provided for @mobileBoard_sudokuHardDetail.
  ///
  /// In en, this message translates to:
  /// **'For Sudoku pros'**
  String get mobileBoard_sudokuHardDetail;

  /// No description provided for @mobileBoard_startPuzzle.
  ///
  /// In en, this message translates to:
  /// **'Start Puzzle! 🧩'**
  String get mobileBoard_startPuzzle;

  /// No description provided for @mobileBoard_generating.
  ///
  /// In en, this message translates to:
  /// **'Generating puzzle...'**
  String get mobileBoard_generating;

  /// No description provided for @mobileBoard_notesOn.
  ///
  /// In en, this message translates to:
  /// **'Notes ON'**
  String get mobileBoard_notesOn;

  /// No description provided for @mobileBoard_notesOff.
  ///
  /// In en, this message translates to:
  /// **'Notes OFF'**
  String get mobileBoard_notesOff;

  /// No description provided for @mobileBoard_erase.
  ///
  /// In en, this message translates to:
  /// **'Erase'**
  String get mobileBoard_erase;

  /// No description provided for @mobileBoard_mistakes.
  ///
  /// In en, this message translates to:
  /// **'Mistakes'**
  String get mobileBoard_mistakes;

  /// No description provided for @mobileBoard_jigsawSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Tap a piece, then tap where it belongs. You can also drag it there!'**
  String get mobileBoard_jigsawSubtitle;

  /// No description provided for @mobileBoard_jigsawGrid.
  ///
  /// In en, this message translates to:
  /// **'{size}×{size} grid ({pieces} pieces)'**
  String mobileBoard_jigsawGrid(String size, String pieces);

  /// No description provided for @mobileBoard_jigsawEasyDetail.
  ///
  /// In en, this message translates to:
  /// **'Great for beginners'**
  String get mobileBoard_jigsawEasyDetail;

  /// No description provided for @mobileBoard_jigsawMediumDetail.
  ///
  /// In en, this message translates to:
  /// **'A fun challenge'**
  String get mobileBoard_jigsawMediumDetail;

  /// No description provided for @mobileBoard_jigsawHardDetail.
  ///
  /// In en, this message translates to:
  /// **'For puzzle masters'**
  String get mobileBoard_jigsawHardDetail;

  /// No description provided for @mobileBoard_chooseImage.
  ///
  /// In en, this message translates to:
  /// **'Choose a Picture'**
  String get mobileBoard_chooseImage;

  /// No description provided for @mobileBoard_imageSunset.
  ///
  /// In en, this message translates to:
  /// **'Sunset Beach'**
  String get mobileBoard_imageSunset;

  /// No description provided for @mobileBoard_imageMountains.
  ///
  /// In en, this message translates to:
  /// **'Mountains'**
  String get mobileBoard_imageMountains;

  /// No description provided for @mobileBoard_imageForest.
  ///
  /// In en, this message translates to:
  /// **'Enchanted Forest'**
  String get mobileBoard_imageForest;

  /// No description provided for @mobileBoard_imageOcean.
  ///
  /// In en, this message translates to:
  /// **'Ocean Waves'**
  String get mobileBoard_imageOcean;

  /// No description provided for @mobileBoard_imageSpace.
  ///
  /// In en, this message translates to:
  /// **'Outer Space'**
  String get mobileBoard_imageSpace;

  /// No description provided for @mobileBoard_imageGarden.
  ///
  /// In en, this message translates to:
  /// **'Flower Garden'**
  String get mobileBoard_imageGarden;

  /// No description provided for @mobileBoard_imageCity.
  ///
  /// In en, this message translates to:
  /// **'City Skyline'**
  String get mobileBoard_imageCity;

  /// No description provided for @mobileBoard_imageArctic.
  ///
  /// In en, this message translates to:
  /// **'Arctic Aurora'**
  String get mobileBoard_imageArctic;

  /// No description provided for @mobileBoard_selectDifficultyAndImage.
  ///
  /// In en, this message translates to:
  /// **'Select Difficulty & Image'**
  String get mobileBoard_selectDifficultyAndImage;

  /// No description provided for @mobileBoard_moves.
  ///
  /// In en, this message translates to:
  /// **'Moves'**
  String get mobileBoard_moves;

  /// No description provided for @mobileBoard_pieceSelected.
  ///
  /// In en, this message translates to:
  /// **'Piece selected. Tap the cell where it belongs'**
  String get mobileBoard_pieceSelected;

  /// No description provided for @mobileBoard_showReference.
  ///
  /// In en, this message translates to:
  /// **'Show picture'**
  String get mobileBoard_showReference;

  /// No description provided for @mobileBoard_hideReference.
  ///
  /// In en, this message translates to:
  /// **'Hide picture'**
  String get mobileBoard_hideReference;

  /// No description provided for @mobileBoard_piecesLeft.
  ///
  /// In en, this message translates to:
  /// **'Pieces left: {count}'**
  String mobileBoard_piecesLeft(String count);

  /// No description provided for @mobileBoard_seqSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Memorize the cards, then tap them back in order!'**
  String get mobileBoard_seqSubtitle;

  /// No description provided for @mobileBoard_chooseTheme.
  ///
  /// In en, this message translates to:
  /// **'Choose a Theme'**
  String get mobileBoard_chooseTheme;

  /// No description provided for @mobileBoard_seqDesc.
  ///
  /// In en, this message translates to:
  /// **'{cards} cards · {seconds}s view time'**
  String mobileBoard_seqDesc(String cards, String seconds);

  /// No description provided for @mobileBoard_memorize.
  ///
  /// In en, this message translates to:
  /// **'MEMORIZE! {seconds}s'**
  String mobileBoard_memorize(String seconds);

  /// No description provided for @mobileBoard_tapCardYouSaw.
  ///
  /// In en, this message translates to:
  /// **'TAP THE CARD YOU SAW'**
  String get mobileBoard_tapCardYouSaw;

  /// No description provided for @mobileBoard_tapCardInOrder.
  ///
  /// In en, this message translates to:
  /// **'TAP CARD {current} OF {total} IN ORDER'**
  String mobileBoard_tapCardInOrder(String current, String total);

  /// No description provided for @mobileBoard_correctNextRound.
  ///
  /// In en, this message translates to:
  /// **'✅ Correct! Next round...'**
  String get mobileBoard_correctNextRound;

  /// No description provided for @mobileBoard_challengeSequence.
  ///
  /// In en, this message translates to:
  /// **'Challenge Sequence'**
  String get mobileBoard_challengeSequence;

  /// No description provided for @mobileBoard_allDrivers.
  ///
  /// In en, this message translates to:
  /// **'{theme} — All Drivers'**
  String mobileBoard_allDrivers(String theme);

  /// No description provided for @mobileBoard_roundsCompleted.
  ///
  /// In en, this message translates to:
  /// **'You completed {done} of {total} rounds'**
  String mobileBoard_roundsCompleted(String done, String total);

  /// No description provided for @mobileBoard_mistakesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} mistakes'**
  String mobileBoard_mistakesCount(String count);

  /// No description provided for @mobileBoard_twoPlayer.
  ///
  /// In en, this message translates to:
  /// **'Two Player'**
  String get mobileBoard_twoPlayer;

  /// No description provided for @mobileBoard_localMultiplayer.
  ///
  /// In en, this message translates to:
  /// **'Local Multiplayer'**
  String get mobileBoard_localMultiplayer;

  /// No description provided for @mobileBoard_twoPlayerDesc.
  ///
  /// In en, this message translates to:
  /// **'Play against a friend on the same device'**
  String get mobileBoard_twoPlayerDesc;

  /// No description provided for @mobileBoard_twoPlayerDetail.
  ///
  /// In en, this message translates to:
  /// **'Take turns, no AI, just fun!'**
  String get mobileBoard_twoPlayerDetail;

  /// No description provided for @mobileBoard_or.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get mobileBoard_or;

  /// No description provided for @mobileBoard_player1.
  ///
  /// In en, this message translates to:
  /// **'Player 1 (X)'**
  String get mobileBoard_player1;

  /// No description provided for @mobileBoard_player2.
  ///
  /// In en, this message translates to:
  /// **'Player 2 (O)'**
  String get mobileBoard_player2;

  /// No description provided for @mobileBoard_ties.
  ///
  /// In en, this message translates to:
  /// **'Ties'**
  String get mobileBoard_ties;

  /// No description provided for @mobileBoard_playerWins.
  ///
  /// In en, this message translates to:
  /// **'{player} wins!'**
  String mobileBoard_playerWins(String player);

  /// No description provided for @mobileBoard_itsADraw.
  ///
  /// In en, this message translates to:
  /// **'It\'\'s a draw!'**
  String get mobileBoard_itsADraw;

  /// No description provided for @mobileBoard_turnOf.
  ///
  /// In en, this message translates to:
  /// **'{player}\'\'s turn'**
  String mobileBoard_turnOf(String player);

  /// No description provided for @mobileBoard_newRound.
  ///
  /// In en, this message translates to:
  /// **'New Round'**
  String get mobileBoard_newRound;

  /// No description provided for @mobileBoard_bubbleSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Pop the letters in order to spell the word!'**
  String get mobileBoard_bubbleSubtitle;

  /// No description provided for @mobileBoard_bubbleEasyDesc.
  ///
  /// In en, this message translates to:
  /// **'Short words (3–4 letters)'**
  String get mobileBoard_bubbleEasyDesc;

  /// No description provided for @mobileBoard_bubbleMediumDesc.
  ///
  /// In en, this message translates to:
  /// **'6-letter words'**
  String get mobileBoard_bubbleMediumDesc;

  /// No description provided for @mobileBoard_bubbleHardDesc.
  ///
  /// In en, this message translates to:
  /// **'Long words (7–9 letters)'**
  String get mobileBoard_bubbleHardDesc;

  /// No description provided for @mobileBoard_startBubble.
  ///
  /// In en, this message translates to:
  /// **'Start Popping! 🫧'**
  String get mobileBoard_startBubble;

  /// No description provided for @mobileBoard_nextWord.
  ///
  /// In en, this message translates to:
  /// **'Next Word →'**
  String get mobileBoard_nextWord;

  /// No description provided for @mobileBoard_wordsEnglishOnly.
  ///
  /// In en, this message translates to:
  /// **'Words and hints are in English only'**
  String get mobileBoard_wordsEnglishOnly;

  /// No description provided for @mobileBoard_botSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Program the robot to reach the power cell!'**
  String get mobileBoard_botSubtitle;

  /// No description provided for @mobileBoard_botEasyDesc.
  ///
  /// In en, this message translates to:
  /// **'5×5 grid · Simple paths'**
  String get mobileBoard_botEasyDesc;

  /// No description provided for @mobileBoard_botMediumDesc.
  ///
  /// In en, this message translates to:
  /// **'6×6 grid · Cracks to jump over'**
  String get mobileBoard_botMediumDesc;

  /// No description provided for @mobileBoard_botHardDesc.
  ///
  /// In en, this message translates to:
  /// **'7×7 grid · Cracks + Ice that slides you'**
  String get mobileBoard_botHardDesc;

  /// No description provided for @mobileBoard_botEasyFeatures.
  ///
  /// In en, this message translates to:
  /// **'Walls only'**
  String get mobileBoard_botEasyFeatures;

  /// No description provided for @mobileBoard_botMediumFeatures.
  ///
  /// In en, this message translates to:
  /// **'Walls + Cracks'**
  String get mobileBoard_botMediumFeatures;

  /// No description provided for @mobileBoard_botHardFeatures.
  ///
  /// In en, this message translates to:
  /// **'Walls + Cracks + Ice'**
  String get mobileBoard_botHardFeatures;

  /// No description provided for @mobileBoard_startBot.
  ///
  /// In en, this message translates to:
  /// **'Start Coding! 🤖'**
  String get mobileBoard_startBot;

  /// No description provided for @mobileBoard_levelOf.
  ///
  /// In en, this message translates to:
  /// **'Level {current}/{total}'**
  String mobileBoard_levelOf(String current, String total);

  /// No description provided for @mobileBoard_botForward.
  ///
  /// In en, this message translates to:
  /// **'Forward'**
  String get mobileBoard_botForward;

  /// No description provided for @mobileBoard_botTurnLeft.
  ///
  /// In en, this message translates to:
  /// **'Turn Left'**
  String get mobileBoard_botTurnLeft;

  /// No description provided for @mobileBoard_botTurnRight.
  ///
  /// In en, this message translates to:
  /// **'Turn Right'**
  String get mobileBoard_botTurnRight;

  /// No description provided for @mobileBoard_botJump.
  ///
  /// In en, this message translates to:
  /// **'Jump'**
  String get mobileBoard_botJump;

  /// No description provided for @mobileBoard_botRun.
  ///
  /// In en, this message translates to:
  /// **'Run'**
  String get mobileBoard_botRun;

  /// No description provided for @mobileBoard_botClear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get mobileBoard_botClear;

  /// No description provided for @mobileBoard_yourProgram.
  ///
  /// In en, this message translates to:
  /// **'Your program'**
  String get mobileBoard_yourProgram;

  /// No description provided for @mobileBoard_programEmpty.
  ///
  /// In en, this message translates to:
  /// **'Tap the blocks below to build your program'**
  String get mobileBoard_programEmpty;

  /// No description provided for @mobileBoard_blocksUsed.
  ///
  /// In en, this message translates to:
  /// **'{used}/{max} blocks'**
  String mobileBoard_blocksUsed(String used, String max);

  /// No description provided for @mobileBoard_botHint.
  ///
  /// In en, this message translates to:
  /// **'Hint'**
  String get mobileBoard_botHint;

  /// No description provided for @mobileBoard_botSuccess.
  ///
  /// In en, this message translates to:
  /// **'Power cell reached! ⚡'**
  String get mobileBoard_botSuccess;

  /// No description provided for @mobileBoard_botNextLevel.
  ///
  /// In en, this message translates to:
  /// **'Next level →'**
  String get mobileBoard_botNextLevel;

  /// No description provided for @mobileBoard_botFinish.
  ///
  /// In en, this message translates to:
  /// **'Finish 🏆'**
  String get mobileBoard_botFinish;

  /// No description provided for @mobileBoard_botRetry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get mobileBoard_botRetry;

  /// No description provided for @mobileBoard_botFellCrack.
  ///
  /// In en, this message translates to:
  /// **'Bot fell into a crack! 🕳'**
  String get mobileBoard_botFellCrack;

  /// No description provided for @mobileBoard_botCrashed.
  ///
  /// In en, this message translates to:
  /// **'Bot crashed! 💥'**
  String get mobileBoard_botCrashed;

  /// No description provided for @mobileBoard_botNotReached.
  ///
  /// In en, this message translates to:
  /// **'Bot didn\'\'t reach the power cell 🤔'**
  String get mobileBoard_botNotReached;

  /// No description provided for @mobileBoard_botRunning.
  ///
  /// In en, this message translates to:
  /// **'Running...'**
  String get mobileBoard_botRunning;

  /// No description provided for @mobileBoard_botHintsEnglishOnly.
  ///
  /// In en, this message translates to:
  /// **'Hints are in English only'**
  String get mobileBoard_botHintsEnglishOnly;

  /// No description provided for @mobileBoard_mazeControls.
  ///
  /// In en, this message translates to:
  /// **'Swipe on the maze or use the arrows to move'**
  String get mobileBoard_mazeControls;

  /// No description provided for @mobileBoard_mazeAnswerHint.
  ///
  /// In en, this message translates to:
  /// **'Your answer'**
  String get mobileBoard_mazeAnswerHint;

  /// No description provided for @mobileBoard_moveUp.
  ///
  /// In en, this message translates to:
  /// **'Move up'**
  String get mobileBoard_moveUp;

  /// No description provided for @mobileBoard_moveDown.
  ///
  /// In en, this message translates to:
  /// **'Move down'**
  String get mobileBoard_moveDown;

  /// No description provided for @mobileBoard_moveLeft.
  ///
  /// In en, this message translates to:
  /// **'Move left'**
  String get mobileBoard_moveLeft;

  /// No description provided for @mobileBoard_moveRight.
  ///
  /// In en, this message translates to:
  /// **'Move right'**
  String get mobileBoard_moveRight;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es', 'pt'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'pt':
      return AppLocalizationsPt();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
