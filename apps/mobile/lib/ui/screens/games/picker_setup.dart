import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../game/framework/game_setup_scaffold.dart';
import '../../widgets/choice_tile.dart';

class SetupOption {
  const SetupOption(this.id, this.label, {this.emoji, this.description});
  final String id;
  final String label;
  final String? emoji;
  final String? description;
}

/// One pick-one list on a setup page (difficulty, theme, picture...).
class SetupGroup {
  const SetupGroup(this.id, this.heading, this.options);

  /// Used in widget keys (`<id>-<option id>`) and in the route builder map.
  final String id;
  final String heading;
  final List<SetupOption> options;
}

/// Setup page made of pick-one groups and a start button. The button is
/// disabled until every group has a selection. Shared by the board games.
class PickerSetupScreen extends StatefulWidget {
  const PickerSetupScreen({
    super.key,
    required this.title,
    required this.groups,
    required this.startLabel,
    required this.selectLabel,
    required this.buildRoute,
    this.subtitle,
    this.notice,
    this.footer,
  });

  final String title;
  final String? subtitle;

  /// Small note under the subtitle (for example "English only").
  final String? notice;
  final List<SetupGroup> groups;
  final String startLabel;

  /// Button text while something is still unselected.
  final String selectLabel;

  /// Play route from the selections (`{difficulty: easy, ...}`).
  final String Function(Map<String, String> selected) buildRoute;
  final List<Widget>? footer;

  @override
  State<PickerSetupScreen> createState() => _PickerSetupScreenState();
}

class _PickerSetupScreenState extends State<PickerSetupScreen> {
  final Map<String, String> _selected = {};

  bool get _ready => widget.groups.every((g) => _selected.containsKey(g.id));

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return GameSetupScaffold(
      title: widget.title,
      startLabel: _ready ? widget.startLabel : widget.selectLabel,
      onStart: _ready ? () => context.push(widget.buildRoute(_selected)) : null,
      children: [
        if (widget.subtitle != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(widget.subtitle!, textAlign: TextAlign.center, style: text.titleMedium),
          ),
        if (widget.notice != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(widget.notice!, textAlign: TextAlign.center, style: text.bodySmall),
          ),
        for (final g in widget.groups) ...[
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 12),
            child: Text(g.heading, style: text.titleMedium),
          ),
          for (final o in g.options)
            ChoiceTile(
              key: Key('${g.id}-${o.id}'),
              emoji: o.emoji,
              label: o.label,
              description: o.description,
              selected: _selected[g.id] == o.id,
              onTap: () => setState(() => _selected[g.id] = o.id),
            ),
        ],
        ...?widget.footer,
      ],
    );
  }
}
