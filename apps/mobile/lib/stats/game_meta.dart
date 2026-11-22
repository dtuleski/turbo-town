import 'package:flutter/material.dart';

import '../api/stats_models.dart';
import '../l10n/game_text.dart';
import '../l10n/gen/app_localizations.dart';

/// Icon and color per leaderboard game type (wire value), as on web.
const Map<String, ({String icon, Color color})> kGameTypeMeta = {
  'OVERALL': (icon: '🏆', color: Color(0xFF6366F1)),
  'MEMORY_MATCH': (icon: '🃏', color: Color(0xFF6366F1)),
  'MATH_CHALLENGE': (icon: '🧮', color: Color(0xFFF59E0B)),
  'WORD_PUZZLE': (icon: '🔤', color: Color(0xFF10B981)),
  'LANGUAGE_LEARNING': (icon: '🌍', color: Color(0xFF8B5CF6)),
  'SUDOKU': (icon: '9️⃣', color: Color(0xFFEF4444)),
  'JIGSAW_PUZZLE': (icon: '🧩', color: Color(0xFFEC4899)),
  'BUBBLE_POP': (icon: '🫧', color: Color(0xFF06B6D4)),
  'SEQUENCE_MEMORY': (icon: '🧠', color: Color(0xFFA855F7)),
  'CODE_A_BOT': (icon: '🤖', color: Color(0xFF14B8A6)),
  'GEO_QUIZ': (icon: '🌍', color: Color(0xFF059669)),
  'HISTORY_QUIZ': (icon: '📜', color: Color(0xFFD97706)),
  'CIVICS_QUIZ': (icon: '🇺🇸', color: Color(0xFF4F46E5)),
  'COLOR_BY_NUMBER': (icon: '🎨', color: Color(0xFFEC4899)),
  'HANGMAN': (icon: '🪢', color: Color(0xFF475569)),
  'TIC_TAC_TOE': (icon: '❌', color: Color(0xFF7C3AED)),
  'MATH_MAZE': (icon: '🧮', color: Color(0xFFF97316)),
  'PATTERN_RECALL': (icon: '🧩', color: Color(0xFF0EA5E9)),
  'SPACE_ENTRY': (icon: '🚀', color: Color(0xFF22D3EE)),
  'SCRATCH_CODING': (icon: '👨‍🚀', color: Color(0xFF818CF8)),
  'BOND_AND_BURN': (icon: '🧪', color: Color(0xFF84CC16)),
  'TRAFFIC_LAB': (icon: '🚦', color: Color(0xFFEAB308)),
  'MINI_GOLF': (icon: '⛳', color: Color(0xFF16A34A)),
  'CIRCUIT_BUILDER': (icon: '⚡', color: Color(0xFFF59E0B)),
};

({String icon, Color color}) gameTypeMeta(String type) =>
    kGameTypeMeta[type] ?? (icon: '🎮', color: const Color(0xFF888888));

/// `MEMORY_MATCH` -> `memory-match`, the game registry id.
String gameIdForType(String type) => type.toLowerCase().replaceAll('_', '-');

/// Localized game name, falling back to a readable form of the wire value.
String gameTypeName(AppLocalizations l10n, String type) {
  if (type == 'OVERALL') return l10n.mobileStats_overall;
  final title = gameTitle(l10n, gameIdForType(type));
  if (title != null) return title;
  return type
      .split('_')
      .map((w) => w.isEmpty ? w : w[0] + w.substring(1).toLowerCase())
      .join(' ');
}

/// Game types shown in the leaderboard selector, in web order.
List<LeaderboardGameType> get kLeaderboardGameTypes =>
    LeaderboardGameType.values;
