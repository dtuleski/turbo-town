import 'gen/app_localizations.dart';

/// Lookups for strings whose key depends on data (game id, quest node id).
/// gen-l10n creates one getter per key, so the dynamic part is a switch.
/// Each returns null for an id it does not know; callers show the server
/// value or the raw id instead.

String? gameTitle(AppLocalizations l, String gameId) {
  switch (gameId) {
    case 'memory-match':
      return l.games_memory_match_title;
    case 'math-challenge':
      return l.games_math_challenge_title;
    case 'word-puzzle':
      return l.games_word_puzzle_title;
    case 'language-learning':
      return l.games_language_learning_title;
    case 'sudoku':
      return l.games_sudoku_title;
    case 'jigsaw-puzzle':
      return l.games_jigsaw_puzzle_title;
    case 'bubble-pop':
      return l.games_bubble_pop_title;
    case 'sequence-memory':
      return l.games_sequence_memory_title;
    case 'code-a-bot':
      return l.games_code_a_bot_title;
    case 'geo-quiz':
      return l.games_geo_quiz_title;
    case 'history-quiz':
      return l.games_history_quiz_title;
    case 'civics-quiz':
      return l.games_civics_quiz_title;
    case 'hangman':
      return l.games_hangman_title;
    case 'tic-tac-toe':
      return l.games_tic_tac_toe_title;
    case 'scratch-coding':
      return l.games_scratch_coding_title;
    case 'math-maze':
      return l.games_math_maze_title;
    case 'pattern-recall':
      return l.games_pattern_recall_title;
    case 'space-entry':
      return l.games_space_entry_title;
    case 'bond-and-burn':
      return l.games_bond_and_burn_title;
    case 'circuit-builder':
      return l.games_circuit_builder_title;
    case 'mini-golf':
      return l.miniGolf_title;
    default:
      return null;
  }
}

String? gameDescription(AppLocalizations l, String gameId) {
  switch (gameId) {
    case 'memory-match':
      return l.games_memory_match_description;
    case 'math-challenge':
      return l.games_math_challenge_description;
    case 'word-puzzle':
      return l.games_word_puzzle_description;
    case 'language-learning':
      return l.games_language_learning_description;
    case 'sudoku':
      return l.games_sudoku_description;
    case 'jigsaw-puzzle':
      return l.games_jigsaw_puzzle_description;
    case 'bubble-pop':
      return l.games_bubble_pop_description;
    case 'sequence-memory':
      return l.games_sequence_memory_description;
    case 'code-a-bot':
      return l.games_code_a_bot_description;
    case 'geo-quiz':
      return l.games_geo_quiz_description;
    case 'history-quiz':
      return l.games_history_quiz_description;
    case 'civics-quiz':
      return l.games_civics_quiz_description;
    case 'hangman':
      return l.games_hangman_description;
    case 'tic-tac-toe':
      return l.games_tic_tac_toe_description;
    case 'scratch-coding':
      return l.games_scratch_coding_description;
    case 'math-maze':
      return l.games_math_maze_description;
    case 'pattern-recall':
      return l.games_pattern_recall_description;
    case 'space-entry':
      return l.games_space_entry_description;
    case 'bond-and-burn':
      return l.games_bond_and_burn_description;
    case 'circuit-builder':
      return l.games_circuit_builder_description;
    case 'mini-golf':
      return l.miniGolf_description;
    default:
      return null;
  }
}

String? gameCategory(AppLocalizations l, String gameId) {
  switch (gameId) {
    case 'memory-match':
      return l.games_memory_match_category;
    case 'math-challenge':
      return l.games_math_challenge_category;
    case 'word-puzzle':
      return l.games_word_puzzle_category;
    case 'language-learning':
      return l.games_language_learning_category;
    case 'sudoku':
      return l.games_sudoku_category;
    case 'jigsaw-puzzle':
      return l.games_jigsaw_puzzle_category;
    case 'bubble-pop':
      return l.games_bubble_pop_category;
    case 'sequence-memory':
      return l.games_sequence_memory_category;
    case 'code-a-bot':
      return l.games_code_a_bot_category;
    case 'geo-quiz':
      return l.games_geo_quiz_category;
    case 'history-quiz':
      return l.games_history_quiz_category;
    case 'civics-quiz':
      return l.games_civics_quiz_category;
    case 'hangman':
      return l.games_hangman_category;
    case 'tic-tac-toe':
      return l.games_tic_tac_toe_category;
    case 'scratch-coding':
      return l.games_scratch_coding_category;
    case 'math-maze':
      return l.games_math_maze_category;
    case 'pattern-recall':
      return l.games_pattern_recall_category;
    case 'space-entry':
      return l.games_space_entry_category;
    case 'bond-and-burn':
      return l.games_bond_and_burn_category;
    case 'circuit-builder':
      return l.games_circuit_builder_category;
    default:
      return null;
  }
}

String? questWorldName(AppLocalizations l, String worldId) {
  switch (worldId) {
    case 'brain-peaks':
      return l.quest_worlds_brain_peaks_name;
    case 'science-island':
      return l.quest_worlds_science_island_name;
    default:
      return null;
  }
}

String? questNodeName(AppLocalizations l, String nodeId) {
  switch (nodeId) {
    case 'bp-01-memory':
      return l.quest_nodes_bp_01_memory_name;
    case 'bp-02-math':
      return l.quest_nodes_bp_02_math_name;
    case 'bp-03-words':
      return l.quest_nodes_bp_03_words_name;
    case 'bp-04-sequence':
      return l.quest_nodes_bp_04_sequence_name;
    case 'bp-05-geo':
      return l.quest_nodes_bp_05_geo_name;
    case 'bp-06-maze':
      return l.quest_nodes_bp_06_maze_name;
    case 'bp-07-memory-space':
      return l.quest_nodes_bp_07_memory_space_name;
    case 'bp-boss':
      return l.quest_nodes_bp_boss_name;
    case 'bp-bonus-sequence':
      return l.quest_nodes_bp_bonus_sequence_name;
    case 'si-01-bond-burn':
      return l.quest_nodes_si_01_bond_burn_name;
    case 'si-02-space-entry':
      return l.quest_nodes_si_02_space_entry_name;
    case 'si-03-circuit-series':
      return l.quest_nodes_si_03_circuit_series_name;
    case 'si-04-circuit-branches':
      return l.quest_nodes_si_04_circuit_branches_name;
    case 'si-05-scratch':
      return l.quest_nodes_si_05_scratch_name;
    case 'si-06-mini-golf':
      return l.quest_nodes_si_06_mini_golf_name;
    case 'si-07-circuit-parallel':
      return l.quest_nodes_si_07_circuit_parallel_name;
    case 'si-boss':
      return l.quest_nodes_si_boss_name;
    case 'si-bonus':
      return l.quest_nodes_si_bonus_name;
    default:
      return null;
  }
}

/// Name of the game a quest leg launches, by server theme id.
String? questGameName(AppLocalizations l, String themeId) {
  switch (themeId) {
    case 'ANIMALS':
      return l.quest_games_ANIMALS;
    case 'FRUITS':
      return l.quest_games_FRUITS;
    case 'VEHICLES':
      return l.quest_games_VEHICLES;
    case 'SPACE':
      return l.quest_games_SPACE;
    case 'OCEAN':
      return l.quest_games_OCEAN;
    case 'FORMULA1':
      return l.quest_games_FORMULA1;
    case 'MATH_CHALLENGE':
      return l.quest_games_MATH_CHALLENGE;
    case 'WORD_PUZZLE':
      return l.quest_games_WORD_PUZZLE;
    case 'SEQUENCE_MEMORY':
      return l.quest_games_SEQUENCE_MEMORY;
    case 'PATTERN_RECALL':
      return l.quest_games_PATTERN_RECALL;
    case 'GEO_QUIZ':
      return l.quest_games_GEO_QUIZ;
    case 'MATH_MAZE':
      return l.quest_games_MATH_MAZE;
    case 'BUBBLE_POP':
      return l.quest_games_BUBBLE_POP;
    case 'BOND_AND_BURN':
      return l.quest_games_BOND_AND_BURN;
    case 'SPACE_ENTRY':
      return l.quest_games_SPACE_ENTRY;
    case 'TRAFFIC_LAB':
      return l.quest_games_TRAFFIC_LAB;
    case 'MINI_GOLF':
      return l.quest_games_MINI_GOLF;
    case 'SCRATCH_CODING':
      return l.quest_games_SCRATCH_CODING;
    case 'CIRCUIT_BUILDER':
      return l.quest_games_CIRCUIT_BUILDER;
    default:
      return null;
  }
}
