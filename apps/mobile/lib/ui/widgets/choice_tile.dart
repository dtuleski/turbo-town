import 'package:flutter/material.dart';

/// Selectable card used by setup pages (difficulty, mode, topic).
class ChoiceTile extends StatelessWidget {
  const ChoiceTile({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.emoji,
    this.description,
    this.enabled = true,
    this.badge,
  });

  final String label;
  final String? emoji;
  final String? description;
  final bool selected;
  final bool enabled;
  final VoidCallback? onTap;

  /// Small tag on the right (for example a lock note).
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Opacity(
        opacity: enabled ? 1 : 0.55,
        child: InkWell(
          onTap: enabled ? onTap : null,
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
                if (emoji != null) ...[
                  Text(emoji!, style: const TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      if (description != null)
                        Text(description!, style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                if (badge != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: Text(badge!, style: Theme.of(context).textTheme.labelSmall),
                  ),
                if (selected) Icon(Icons.check_circle, color: scheme.primary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
