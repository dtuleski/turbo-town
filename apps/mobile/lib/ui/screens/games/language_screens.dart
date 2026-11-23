import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/language_api.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/framework/game_setup_scaffold.dart';
import '../../../game/game_registry.dart';
import '../../../game/language/language_controllers.dart';
import '../../../game/language/language_data.dart';
import '../../../game/language/pronunciation_scoring.dart';
import '../../../game/language/speech.dart';
import '../../../l10n/game_text.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../theme.dart';
import '../../widgets/choice_tile.dart';

String _title(AppLocalizations l10n) => gameTitle(l10n, 'language-learning') ?? 'Language Learning';

String _difficultyName(AppLocalizations l10n, String id) => switch (id) {
      'intermediate' => l10n.mobileLanguage_diffIntermediate,
      'advanced' => l10n.mobileLanguage_diffAdvanced,
      _ => l10n.mobileLanguage_diffBeginner,
    };

String _difficultyDesc(AppLocalizations l10n, LanguageDifficulty d) => switch (d.id) {
      'intermediate' => l10n.mobileLanguage_diffIntermediateDesc('${d.wordCount}'),
      'advanced' => l10n.mobileLanguage_diffAdvancedDesc('${d.wordCount}'),
      _ => l10n.mobileLanguage_diffBeginnerDesc('${d.wordCount}'),
    };

(String, String) _categoryText(AppLocalizations l10n, String id) => switch (id) {
      'food_drinks' => (l10n.mobileLanguage_catFood, l10n.mobileLanguage_catFoodDesc),
      'colors' => (l10n.mobileLanguage_catColors, l10n.mobileLanguage_catColorsDesc),
      'numbers' => (l10n.mobileLanguage_catNumbers, l10n.mobileLanguage_catNumbersDesc),
      'objects' => (l10n.mobileLanguage_catObjects, l10n.mobileLanguage_catObjectsDesc),
      'nature' => (l10n.mobileLanguage_catNature, l10n.mobileLanguage_catNatureDesc),
      _ => (l10n.mobileLanguage_catAnimals, l10n.mobileLanguage_catAnimalsDesc),
    };

String speechErrorText(AppLocalizations l10n, SpeechErrorKind kind) => switch (kind) {
      SpeechErrorKind.notAllowed => l10n.mobileLanguage_errNotAllowed,
      SpeechErrorKind.noSpeech => l10n.mobileLanguage_errNoSpeech,
      SpeechErrorKind.audioCapture => l10n.mobileLanguage_errAudio,
      SpeechErrorKind.network => l10n.mobileLanguage_errNetwork,
      SpeechErrorKind.aborted => l10n.mobileLanguage_errAborted,
      SpeechErrorKind.notSupported => l10n.mobileLanguage_errNotSupported,
      SpeechErrorKind.unknown => l10n.mobileLanguage_errUnknown,
    };

String _feedbackLabel(AppLocalizations l10n, PronunciationFeedback f) => switch (f) {
      PronunciationFeedback.tryAgain => l10n.mobileLanguage_fbTryAgain,
      PronunciationFeedback.goodEffort => l10n.mobileLanguage_fbGoodEffort,
      PronunciationFeedback.great => l10n.mobileLanguage_fbGreat,
      PronunciationFeedback.perfect => l10n.mobileLanguage_fbPerfect,
    };

String _feedbackEmoji(PronunciationFeedback f) => switch (f) {
      PronunciationFeedback.tryAgain => '🔄',
      PronunciationFeedback.goodEffort => '👍',
      PronunciationFeedback.great => '🌟',
      PronunciationFeedback.perfect => '🏆',
    };

// ── Language selection ───────────────────────────────────────────────────────

class LanguageSelectionScreen extends ConsumerWidget {
  const LanguageSelectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final progress = ref.watch(languageProgressProvider).valueOrNull ?? const {};
    return Scaffold(
      appBar: AppBar(title: Text(_title(l10n))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(l10n.mobileLanguage_chooseLanguage,
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            for (final lang in kLanguages)
              ChoiceTile(
                key: Key('language-${lang.code}'),
                emoji: lang.flag,
                label: '${lang.nativeName} (${lang.name})',
                description: progress[lang.code] == null
                    ? null
                    : '${l10n.mobileLanguage_levelLabel('${progress[lang.code]!.level}')} · '
                        '${l10n.mobileLanguage_wordsLearnedLabel('${progress[lang.code]!.wordsLearned}')}',
                selected: false,
                onTap: () => context.push('/language-learning/setup/${lang.code}'),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────

class LanguageSetupScreen extends ConsumerStatefulWidget {
  const LanguageSetupScreen({super.key, required this.languageCode});

  final String languageCode;

  @override
  ConsumerState<LanguageSetupScreen> createState() => _LanguageSetupScreenState();
}

class _LanguageSetupScreenState extends ConsumerState<LanguageSetupScreen> {
  LanguageMode _mode = LanguageMode.imageMatch;
  String _difficulty = 'beginner';
  String _category = 'animals';

  void _start() {
    context.push(Uri(path: '/language-learning/play', queryParameters: {
      'lang': widget.languageCode,
      'category': _category,
      'difficulty': _difficulty,
      'mode': languageModeId(_mode),
    }).toString());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final lang = languageByCode(widget.languageCode);
    if (lang == null) {
      return Scaffold(
        appBar: AppBar(title: Text(_title(l10n))),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(l10n.mobileLanguage_languageNotFound,
                    key: const Key('language-not-found'),
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => context.canPop()
                      ? context.pop()
                      : context.go('/language-learning/setup'),
                  child: Text(l10n.mobileLanguage_backToLanguages),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final tier = ref.watch(userTierProvider);
    final availability = tier.when(
      data: pronunciationAvailability,
      // While the tier loads the option stays closed rather than flickering open.
      loading: () => PronunciationAvailability.unavailable,
      error: (_, __) => PronunciationAvailability.unavailable,
    );
    if (availability != PronunciationAvailability.available &&
        _mode == LanguageMode.pronunciation) {
      _mode = LanguageMode.imageMatch;
    }
    return GameSetupScaffold(
      title: l10n.mobileLanguage_learnTitle(lang.name),
      startLabel: l10n.mobileLanguage_startLearning,
      onStart: _start,
      children: [
        Text('${lang.flag}  ${l10n.mobileLanguage_configure}',
            textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 16),
        Text(l10n.mobileLanguage_chooseMode, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        ChoiceTile(
          key: const Key('mode-image-match'),
          emoji: '🖼',
          label: l10n.mobileLanguage_modeImageMatch,
          description: l10n.mobileLanguage_modeImageMatchDesc,
          selected: _mode == LanguageMode.imageMatch,
          onTap: () => setState(() => _mode = LanguageMode.imageMatch),
        ),
        if (availability != PronunciationAvailability.hidden)
          ChoiceTile(
            key: const Key('mode-pronunciation'),
            emoji: '🎤',
            label: l10n.mobileLanguage_modePronunciation,
            description: availability == PronunciationAvailability.available
                ? (kLowAccuracyLanguages.contains(widget.languageCode)
                    ? '${l10n.mobileLanguage_modePronunciationDesc}\n'
                        'ℹ ${l10n.mobileLanguage_accuracyVaries}'
                    : l10n.mobileLanguage_modePronunciationDesc)
                : l10n.mobileLanguage_pronUnavailable,
            enabled: availability == PronunciationAvailability.available,
            selected: _mode == LanguageMode.pronunciation,
            onTap: () => setState(() => _mode = LanguageMode.pronunciation),
          ),
        const SizedBox(height: 8),
        Text(l10n.game_chooseDifficulty, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        for (final d in kLanguageDifficulties)
          ChoiceTile(
            key: Key('difficulty-${d.id}'),
            emoji: d.icon,
            label: _difficultyName(l10n, d.id),
            description: _difficultyDesc(l10n, d),
            selected: _difficulty == d.id,
            onTap: () => setState(() => _difficulty = d.id),
          ),
        const SizedBox(height: 8),
        Text(l10n.mobileLanguage_chooseCategory, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        for (final c in kLanguageCategories)
          ChoiceTile(
            key: Key('category-${c.id}'),
            emoji: c.icon,
            label: _categoryText(l10n, c.id).$1,
            description: _categoryText(l10n, c.id).$2,
            selected: _category == c.id,
            onTap: () => setState(() => _category = c.id),
          ),
      ],
    );
  }
}

// ── Play ─────────────────────────────────────────────────────────────────────

/// Loads the words, then runs the round. Loading first means a failed or
/// empty load never starts (and never spends) a play.
class LanguagePlayScreen extends ConsumerWidget {
  const LanguagePlayScreen({super.key, required this.args});

  final LanguageArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final words = ref.watch(languageWordsProvider(args));
    return words.when(
      loading: () => Scaffold(
        appBar: AppBar(title: Text(_title(l10n))),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 12),
              Text(l10n.mobileLanguage_loadingWords),
            ],
          ),
        ),
      ),
      error: (_, __) => _LoadProblem(
        message: l10n.mobileLanguage_loadFailed,
        onRetry: () => ref.invalidate(languageWordsProvider(args)),
      ),
      data: (list) => list.isEmpty
          ? _LoadProblem(message: l10n.mobileLanguage_noWords)
          : _LanguageRound(args: args, words: list),
    );
  }
}

class _LoadProblem extends StatelessWidget {
  const _LoadProblem({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_title(l10n))),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('📭', style: TextStyle(fontSize: 56)),
              const SizedBox(height: 12),
              Text(message, key: const Key('language-load-problem'), textAlign: TextAlign.center),
              const SizedBox(height: 20),
              if (onRetry != null)
                FilledButton(
                  key: const Key('language-retry-load'),
                  onPressed: onRetry,
                  child: Text(l10n.mobileLanguage_retryLoad),
                ),
              TextButton(
                onPressed: () =>
                    context.canPop() ? context.pop() : context.go('/language-learning/setup'),
                child: Text(l10n.mobileGame_goBack),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LanguageRound extends ConsumerWidget {
  const _LanguageRound({required this.args, required this.words});

  final LanguageArgs args;
  final List<LanguageWord> words;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final key = (args: args, words: words);
    final pronunciation = args.mode == LanguageMode.pronunciation;
    // Keep the controller alive while the frame shows pause and result pages.
    if (pronunciation) {
      ref.listen(pronunciationControllerProvider(key), (_, __) {});
    } else {
      ref.listen(imageMatchControllerProvider(key), (_, __) {});
    }
    final entry = gameById('language-learning')!;
    return GameSessionFrame(
      args: languageSessionArgs(args),
      title: _title(l10n),
      // The pronunciation theme has its own rating key on web.
      reviewType: pronunciation ? 'LANGUAGE_PRONUNCIATION' : entry.reviewType,
      // Another round starts from the setup page (new words), as on web.
      onPlayAgain: () {},
      replacePlayAgain: () => context.canPop()
          ? context.pop()
          : context.go('/language-learning/setup/${args.lang}'),
      boardBuilder: (context, session) => pronunciation
          ? _PronunciationBoard(keyArgs: key, session: session)
          : _ImageMatchBoard(keyArgs: key),
    );
  }
}

// ── Image Match board ────────────────────────────────────────────────────────

class _ImageMatchBoard extends ConsumerWidget {
  const _ImageMatchBoard({required this.keyArgs});

  final ImageMatchKey keyArgs;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(imageMatchControllerProvider(keyArgs));
    final controller = ref.read(imageMatchControllerProvider(keyArgs).notifier);
    final word = state.word;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        LinearProgressIndicator(
          value: (state.index + 1) / state.words.length,
          minHeight: 8,
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              l10n.mobileLanguage_questionOf('${state.index + 1}', '${state.words.length}'),
              key: const Key('lang-progress'),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              l10n.mobileLanguage_correctCount('${state.correctCount}'),
              key: const Key('lang-correct'),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Flexible(
              child: Text(
                word.word,
                key: const Key('lang-word'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900),
              ),
            ),
            IconButton(
              key: const Key('lang-speak'),
              tooltip: l10n.mobileLanguage_hearWord,
              icon: const Icon(Icons.volume_up),
              onPressed: () => ref
                  .read(wordSpeakerProvider)
                  .speak(word.word, kSpeechLocales[keyArgs.args.lang] ?? 'en-US'),
            ),
          ],
        ),
        if (word.pronunciation.isNotEmpty)
          Text(word.pronunciation,
              textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyLarge),
        const SizedBox(height: 4),
        Text(l10n.mobileLanguage_whichImage,
            textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 16),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          children: [
            for (var i = 0; i < state.options.length; i++)
              _ImageOption(
                key: Key('lang-image-$i'),
                url: state.options[i],
                visual: !state.answered
                    ? _Visual.idle
                    : state.options[i] == word.correctImageUrl
                        ? _Visual.correct
                        : state.options[i] == state.selected
                            ? _Visual.wrong
                            : _Visual.dimmed,
                onTap: () => controller.select(state.options[i]),
              ),
          ],
        ),
        if (state.streak > 1 && !state.answered)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text('🔥 ${state.streak} ${l10n.game_streak}',
                key: const Key('lang-streak'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.orange)),
          ),
      ],
    );
  }
}

enum _Visual { idle, correct, wrong, dimmed }

class _ImageOption extends StatelessWidget {
  const _ImageOption({super.key, required this.url, required this.visual, required this.onTap});

  final String url;
  final _Visual visual;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final border = switch (visual) {
      _Visual.correct => AppTheme.success,
      _Visual.wrong => AppTheme.error,
      _Visual.dimmed => AppTheme.textLight,
      _Visual.idle => AppTheme.primary.withValues(alpha: 0.4),
    };
    return Opacity(
      opacity: visual == _Visual.dimmed ? 0.5 : 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: border, width: 4),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: AppTheme.bgLight,
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('🖼', style: TextStyle(fontSize: 40)),
                      Text(l10n.mobileLanguage_imageUnavailable,
                          style: Theme.of(context).textTheme.labelSmall),
                    ],
                  ),
                ),
                loadingBuilder: (context, child, progress) => progress == null
                    ? child
                    : const Center(child: CircularProgressIndicator()),
              ),
              if (visual == _Visual.correct || visual == _Visual.wrong)
                Container(
                  color: (visual == _Visual.correct ? AppTheme.success : AppTheme.error)
                      .withValues(alpha: 0.7),
                  alignment: Alignment.center,
                  child: Text(visual == _Visual.correct ? '✅' : '❌',
                      style: const TextStyle(fontSize: 44)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Pronunciation board ──────────────────────────────────────────────────────

class _PronunciationBoard extends ConsumerWidget {
  const _PronunciationBoard({required this.keyArgs, required this.session});

  final ImageMatchKey keyArgs;
  final GameSessionState session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(pronunciationControllerProvider(keyArgs));
    final controller = ref.read(pronunciationControllerProvider(keyArgs).notifier);
    final score = state.lastScore;
    final recording = state.rec == RecState.listening;
    final processing = state.rec == RecState.processing;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        LinearProgressIndicator(
          value: state.index / state.words.length,
          minHeight: 8,
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('${state.index + 1} / ${state.words.length}',
                key: const Key('pron-progress'), style: Theme.of(context).textTheme.bodySmall),
            Text('🎤 ${l10n.mobileLanguage_modePronunciation}',
                style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              SizedBox(
                height: 190,
                width: double.infinity,
                child: Image.network(
                  state.word.correctImageUrl,
                  key: const Key('pron-image'),
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppTheme.bgLight,
                    alignment: Alignment.center,
                    child: const Text('🖼', style: TextStyle(fontSize: 56)),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(
                      state.word.word,
                      key: const Key('pron-word'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900),
                    ),
                    Text(
                      l10n.mobileLanguage_attempt('${state.attempt + 1}', '$kPronunciationMaxAttempts'),
                      key: const Key('pron-attempt'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                if (state.rec == RecState.idle && score == null)
                  Text(l10n.mobileLanguage_tapToRecord, textAlign: TextAlign.center),
                if (recording)
                  Text(l10n.mobileLanguage_listening,
                      key: const Key('pron-listening'),
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                if (processing) Text(l10n.mobileLanguage_processing),
                if (state.rec == RecState.error && state.error != null)
                  Text(speechErrorText(l10n, state.error!),
                      key: const Key('pron-error'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppTheme.error)),
                if (score != null) _ScoreBox(score: score),
                const SizedBox(height: 12),
                if (score == null)
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      key: const Key('pron-record'),
                      style: recording
                          ? FilledButton.styleFrom(backgroundColor: AppTheme.error)
                          : null,
                      onPressed: processing ? null : controller.toggleRecording,
                      icon: Icon(recording ? Icons.stop : Icons.mic),
                      label: Text(recording
                          ? l10n.mobileLanguage_stopRecording
                          : l10n.mobileLanguage_record),
                    ),
                  )
                else ...[
                  if (state.canRetry)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        key: const Key('pron-retry'),
                        onPressed: controller.retry,
                        child: Text('🔄 ${l10n.mobileLanguage_retryLeft('${state.retriesLeft}')}'),
                      ),
                    ),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      key: const Key('pron-next'),
                      onPressed: controller.next,
                      child: Text(state.lastWord
                          ? l10n.mobileLanguage_finish
                          : l10n.mobileLanguage_nextWord),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ScoreBox extends StatelessWidget {
  const _ScoreBox({required this.score});

  final PronunciationScore score;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final good = score.graded ? score.score >= 71 : score.recognized;
    final color = good ? AppTheme.success : (score.score >= 41 ? AppTheme.warning : AppTheme.error);
    return Container(
      key: const Key('pron-score'),
      width: double.infinity,
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          if (score.graded) ...[
            Text('${score.score}%',
                key: const Key('pron-score-value'),
                style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: color)),
            Text('${_feedbackEmoji(score.feedback)} ${_feedbackLabel(l10n, score.feedback)}',
                style: TextStyle(fontWeight: FontWeight.w700, color: color)),
          ] else ...[
            Text(
              score.recognized
                  ? l10n.mobileLanguage_recognized
                  : l10n.mobileLanguage_notRecognized,
              key: const Key('pron-score-value'),
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: color),
            ),
            Text(score.recognized
                ? l10n.mobileLanguage_niceHeard
                : l10n.mobileLanguage_didntCatch),
          ],
          if (score.recognizedText.isNotEmpty)
            Text(l10n.mobileLanguage_heard(score.recognizedText),
                style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
