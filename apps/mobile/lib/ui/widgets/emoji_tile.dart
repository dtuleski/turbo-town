import 'package:flutter/material.dart';

import '../theme.dart';

/// Square tile showing an emoji. Used for cards, answers and picker items.
class EmojiTile extends StatelessWidget {
  const EmojiTile({
    super.key,
    required this.emoji,
    this.size = 64,
    this.selected = false,
    this.onTap,
    this.semanticLabel,
  });

  final String emoji;
  final double size;
  final bool selected;
  final VoidCallback? onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      button: onTap != null,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppTheme.bgWhite,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? AppTheme.primary : AppTheme.textLight,
              width: selected ? 3 : 1,
            ),
          ),
          child: Text(emoji, style: TextStyle(fontSize: size * 0.5)),
        ),
      ),
    );
  }
}
