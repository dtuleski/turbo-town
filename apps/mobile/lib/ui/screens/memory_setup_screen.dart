import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/constants.dart';
import '../../game/framework/game_setup_scaffold.dart';
import '../../l10n/game_text.dart';
import '../../l10n/gen/app_localizations.dart';
import '../memory_text.dart';

class MemorySetupScreen extends StatefulWidget {
  const MemorySetupScreen({super.key});

  @override
  State<MemorySetupScreen> createState() => _MemorySetupScreenState();
}

class _MemorySetupScreenState extends State<MemorySetupScreen> {
  String _themeId = kGameThemes.first.id;
  Difficulty _difficulty = Difficulty.easy;

  void _play() {
    context.push(Uri(
      path: '/memory-match/play',
      queryParameters: {'theme': _themeId, 'difficulty': _difficulty.id},
    ).toString());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return GameSetupScaffold(
      title: gameTitle(l10n, 'memory-match') ?? 'Memory Match',
      startLabel: l10n.setup_memoryMatch_startGame,
      onStart: _play,
      children: [
        Text(l10n.setup_memoryMatch_chooseTheme,
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 3,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.95,
          children: [
            for (final t in kGameThemes)
              _ThemeTile(
                key: Key('theme-${t.id}'),
                emoji: t.emoji,
                name: memoryThemeName(l10n, t.id),
                selected: t.id == _themeId,
                onTap: () => setState(() => _themeId = t.id),
              ),
          ],
        ),
        const SizedBox(height: 24),
        Text(l10n.setup_memoryMatch_chooseDifficulty,
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        for (final d in Difficulty.values)
          _DifficultyTile(
            key: Key('difficulty-${d.id}'),
            label: memoryDifficultyLabel(l10n, d),
            description: memoryDifficultyDescription(l10n, d),
            selected: d == _difficulty,
            onTap: () => setState(() => _difficulty = d),
          ),
      ],
    );
  }
}

class _ThemeTile extends StatelessWidget {
  const _ThemeTile({
    super.key,
    required this.emoji,
    required this.name,
    required this.selected,
    required this.onTap,
  });

  final String emoji;
  final String name;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: selected ? scheme.primaryContainer : scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? scheme.primary : Colors.transparent,
            width: 2,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 32)),
            const SizedBox(height: 6),
            Text(name,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _DifficultyTile extends StatelessWidget {
  const _DifficultyTile({
    super.key,
    required this.label,
    required this.description,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String description;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: selected ? scheme.primaryContainer : scheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? scheme.primary : Colors.transparent,
              width: 2,
            ),
          ),
          child: Row(
            children: [
              Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off,
                  color: selected ? scheme.primary : scheme.outline),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                    Text(description, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
