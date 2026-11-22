import 'package:flutter/material.dart';

/// "How to Play" box under a setup page's pickers.
class HowToPlayCard extends StatelessWidget {
  const HowToPlayCard({super.key, required this.title, required this.steps});

  final String title;
  final List<String> steps;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              for (final (i, s) in steps.indexed)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('${i + 1}. $s'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
