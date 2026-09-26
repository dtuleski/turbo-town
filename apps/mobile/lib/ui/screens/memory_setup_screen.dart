import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/constants.dart';

class MemorySetupScreen extends StatefulWidget {
  const MemorySetupScreen({super.key});

  @override
  State<MemorySetupScreen> createState() => _MemorySetupScreenState();
}

class _MemorySetupScreenState extends State<MemorySetupScreen> {
  String _themeId = kGameThemes.first.id;
  Difficulty _difficulty = Difficulty.easy;

  void _play() {
    context.push('/memory-match/play?theme=$_themeId&difficulty=${_difficulty.id}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Memory Match')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Choose a theme',
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
                    theme: t,
                    selected: t.id == _themeId,
                    onTap: () => setState(() => _themeId = t.id),
                  ),
              ],
            ),
            const SizedBox(height: 24),
            Text('Difficulty',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            for (final d in Difficulty.values)
              _DifficultyTile(
                difficulty: d,
                selected: d == _difficulty,
                onTap: () => setState(() => _difficulty = d),
              ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _play,
              child: const Text('Start game'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeTile extends StatelessWidget {
  const _ThemeTile({
    required this.theme,
    required this.selected,
    required this.onTap,
  });

  final GameThemeDef theme;
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
            Text(theme.emoji, style: const TextStyle(fontSize: 32)),
            const SizedBox(height: 6),
            Text(theme.name,
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
    required this.difficulty,
    required this.selected,
    required this.onTap,
  });

  final Difficulty difficulty;
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
                    Row(
                      children: [
                        Text(difficulty.label,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w700)),
                        if (difficulty == Difficulty.superHard) ...[
                          const SizedBox(width: 8),
                          const _PaidBadge(),
                        ],
                      ],
                    ),
                    Text(difficulty.description,
                        style: Theme.of(context).textTheme.bodySmall),
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

class _PaidBadge extends StatelessWidget {
  const _PaidBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.amber.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text('PAID',
          style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Colors.amber.shade900)),
    );
  }
}
