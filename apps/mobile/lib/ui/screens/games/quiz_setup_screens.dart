import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../game/framework/game_setup_scaffold.dart';
import '../../../game/quiz/quiz_questions.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../widgets/choice_tile.dart';

const List<String> kQuizDifficulties = ['easy', 'medium', 'hard'];

String quizDifficultyLabel(AppLocalizations l10n, String id) => switch (id) {
      'medium' => l10n.game_medium,
      'hard' => l10n.game_hard,
      _ => l10n.game_easy,
    };

String quizDifficultyEmoji(String id) => switch (id) {
      'medium' => '🟡',
      'hard' => '🔴',
      _ => '🟢',
    };

Widget _heading(BuildContext context, String text) => Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: Text(text, style: Theme.of(context).textTheme.titleMedium),
    );

Widget _intro(BuildContext context, String subtitle, String info, {bool englishOnly = false}) {
  final l10n = AppLocalizations.of(context);
  final theme = Theme.of(context);
  return Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      children: [
        Text(subtitle,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text(info, textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
        if (englishOnly)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(l10n.gameplay_englishOnlyBadge,
                key: const Key('english-only-badge'), style: theme.textTheme.labelMedium),
          ),
      ],
    ),
  );
}

/// Geo Quiz: pick a difficulty, then one of the modes that difficulty offers.
class GeoQuizSetupScreen extends StatefulWidget {
  const GeoQuizSetupScreen({super.key});

  @override
  State<GeoQuizSetupScreen> createState() => _GeoQuizSetupScreenState();
}

class _GeoQuizSetupScreenState extends State<GeoQuizSetupScreen> {
  String? _difficulty;
  GeoMode? _mode;

  String _modeLabel(AppLocalizations l10n, GeoMode m) => switch (m) {
        GeoMode.capitals => l10n.setup_geoModes_capitals,
        GeoMode.flags => l10n.setup_geoModes_flags,
        GeoMode.states => l10n.setup_geoModes_usStates,
        GeoMode.silhouettes => l10n.setup_geoModes_silhouettes,
        GeoMode.continents => l10n.setup_geoModes_continents,
      };

  String _modeEmoji(GeoMode m) => switch (m) {
        GeoMode.capitals => '🏛',
        GeoMode.flags => '🏁',
        GeoMode.states => '📍',
        GeoMode.silhouettes => '🗺',
        GeoMode.continents => '🌍',
      };

  void _pickDifficulty(String d) {
    final modes = kGeoDifficultyModes[d]!;
    setState(() {
      _difficulty = d;
      _mode = modes.length == 1 ? modes.first : null;
    });
  }

  void _start() {
    context.push(Uri(path: '/geo-quiz/play', queryParameters: {
      'difficulty': _difficulty!,
      'mode': _mode!.name,
    }).toString());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final modes = _difficulty == null ? <GeoMode>[] : kGeoDifficultyModes[_difficulty]!;
    final ready = _difficulty != null && _mode != null;
    return GameSetupScaffold(
      title: gameTitle(l10n, 'geo-quiz') ?? l10n.setup_geoQuiz_title,
      startLabel: ready ? l10n.game_startQuiz : l10n.game_selectDifficultyAndMode,
      onStart: ready ? _start : null,
      children: [
        _intro(context, l10n.setup_geoQuiz_subtitle, l10n.setup_geoQuiz_info),
        _heading(context, l10n.game_chooseDifficulty),
        for (final d in kQuizDifficulties)
          ChoiceTile(
            key: Key('difficulty-$d'),
            emoji: quizDifficultyEmoji(d),
            label: quizDifficultyLabel(l10n, d),
            selected: _difficulty == d,
            onTap: () => _pickDifficulty(d),
          ),
        if (modes.length > 1) ...[
          _heading(context, l10n.game_chooseGameMode),
          for (final m in modes)
            ChoiceTile(
              key: Key('mode-${m.name}'),
              emoji: _modeEmoji(m),
              label: _modeLabel(l10n, m),
              selected: _mode == m,
              onTap: () => setState(() => _mode = m),
            ),
        ],
        _heading(context, l10n.setup_geoQuiz_howItWorks),
        Text('📝 ${l10n.setup_geoQuiz_questionsLabel}   ⏱ ${l10n.setup_geoQuiz_timerPerQ}\n'
            '💡 ${l10n.setup_geoQuiz_hintsAfter}   🔥 ${l10n.setup_geoQuiz_streakBonuses}\n'
            '🎉 ${l10n.setup_geoQuiz_funFacts}'),
      ],
    );
  }
}

/// History Quiz: difficulty, then the modes that difficulty offers.
class HistoryQuizSetupScreen extends StatefulWidget {
  const HistoryQuizSetupScreen({super.key});

  @override
  State<HistoryQuizSetupScreen> createState() => _HistoryQuizSetupScreenState();
}

class _HistoryQuizSetupScreenState extends State<HistoryQuizSetupScreen> {
  String? _difficulty;
  HistoryMode? _mode;

  String _modeLabel(AppLocalizations l10n, HistoryMode m) => switch (m) {
        HistoryMode.nameEvent => l10n.gameplay_nameEvent,
        HistoryMode.whenHappened => l10n.gameplay_whenHappened,
        HistoryMode.whoSaid => l10n.gameplay_whoSaidIt,
      };

  String _modeEmoji(HistoryMode m) => switch (m) {
        HistoryMode.nameEvent => '📜',
        HistoryMode.whenHappened => '📅',
        HistoryMode.whoSaid => '🗣',
      };

  void _pickDifficulty(String d) {
    final modes = kHistoryDifficultyModes[d]!;
    setState(() {
      _difficulty = d;
      _mode = modes.length == 1 ? modes.first : null;
    });
  }

  void _start() {
    context.push(Uri(path: '/history-quiz/play', queryParameters: {
      'difficulty': _difficulty!,
      'mode': historyModeId(_mode!),
    }).toString());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final modes = _difficulty == null ? <HistoryMode>[] : kHistoryDifficultyModes[_difficulty]!;
    final ready = _difficulty != null && _mode != null;
    return GameSetupScaffold(
      title: gameTitle(l10n, 'history-quiz') ?? l10n.setup_historyQuiz_title,
      startLabel: ready ? l10n.game_startQuiz : l10n.game_selectDifficultyAndMode,
      onStart: ready ? _start : null,
      children: [
        _intro(
          context,
          l10n.setup_historyQuiz_subtitle,
          l10n.setup_historyQuiz_info,
          englishOnly: Localizations.localeOf(context).languageCode != 'en',
        ),
        _heading(context, l10n.game_chooseDifficulty),
        for (final d in kQuizDifficulties)
          ChoiceTile(
            key: Key('difficulty-$d'),
            emoji: quizDifficultyEmoji(d),
            label: quizDifficultyLabel(l10n, d),
            selected: _difficulty == d,
            onTap: () => _pickDifficulty(d),
          ),
        if (modes.length > 1) ...[
          _heading(context, l10n.game_chooseGameMode),
          for (final m in modes)
            ChoiceTile(
              key: Key('mode-${historyModeId(m)}'),
              emoji: _modeEmoji(m),
              label: _modeLabel(l10n, m),
              selected: _mode == m,
              onTap: () => setState(() => _mode = m),
            ),
        ],
      ],
    );
  }
}

/// Civics Quiz: topic and level (the level sets the number of questions).
class CivicsQuizSetupScreen extends StatefulWidget {
  const CivicsQuizSetupScreen({super.key});

  @override
  State<CivicsQuizSetupScreen> createState() => _CivicsQuizSetupScreenState();
}

class _CivicsQuizSetupScreenState extends State<CivicsQuizSetupScreen> {
  CivicsCategory? _category;
  String? _level;

  void _start() {
    final count = kCivicsLevelQuestions[_level!]!;
    final available = civicsPoolSize(_category!);
    context.push(Uri(path: '/civics-quiz/play', queryParameters: {
      'category': _category!.name,
      'level': _level!,
      'questions': '${count < available ? count : available}',
    }).toString());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final topics = <(CivicsCategory, String, String, String)>[
      (CivicsCategory.all, '📋', l10n.setup_civicsQuiz_allTopics, l10n.setup_civicsQuiz_allTopicsDesc),
      (CivicsCategory.government, '🏛', l10n.setup_civicsQuiz_americanGov, l10n.setup_civicsQuiz_americanGovDesc),
      (CivicsCategory.history, '📜', l10n.setup_civicsQuiz_americanHistory, l10n.setup_civicsQuiz_americanHistoryDesc),
      (CivicsCategory.civics, '🗺', l10n.setup_civicsQuiz_integratedCivics, l10n.setup_civicsQuiz_integratedCivicsDesc),
    ];
    final ready = _category != null && _level != null;
    return GameSetupScaffold(
      title: gameTitle(l10n, 'civics-quiz') ?? l10n.setup_civicsQuiz_title,
      startLabel: ready ? l10n.game_startQuiz : l10n.game_selectTopicAndDifficulty,
      onStart: ready ? _start : null,
      children: [
        _intro(
          context,
          l10n.setup_civicsQuiz_subtitle,
          l10n.setup_civicsQuiz_based,
          englishOnly: Localizations.localeOf(context).languageCode != 'en',
        ),
        _heading(context, l10n.game_chooseTopic),
        for (final t in topics)
          ChoiceTile(
            key: Key('category-${t.$1.name}'),
            emoji: t.$2,
            label: t.$3,
            description: '${t.$4} · ${civicsPoolSize(t.$1)} ${l10n.setup_civicsQuiz_questions}',
            selected: _category == t.$1,
            onTap: () => setState(() => _category = t.$1),
          ),
        _heading(context, l10n.game_chooseDifficulty),
        for (final d in kQuizDifficulties)
          ChoiceTile(
            key: Key('level-$d'),
            emoji: quizDifficultyEmoji(d),
            label: quizDifficultyLabel(l10n, d),
            description: '${kCivicsLevelQuestions[d]} ${l10n.setup_civicsQuiz_questions}',
            selected: _level == d,
            onTap: () => setState(() => _level = d),
          ),
      ],
    );
  }
}

/// Query helper for the play routes.
String quizDifficultyParam(String? raw) =>
    kQuizDifficulties.contains(raw) ? raw! : 'easy';
