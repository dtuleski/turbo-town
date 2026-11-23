import 'package:flutter/material.dart';

/// Frame for a game's setup page: title bar, scrolling body and a pinned start
/// button. Setup pages put their pickers in [children].
class GameSetupScaffold extends StatelessWidget {
  const GameSetupScaffold({
    super.key,
    required this.title,
    required this.startLabel,
    required this.onStart,
    required this.children,
  });

  final String title;
  final String startLabel;
  final VoidCallback? onStart;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: children,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: FilledButton(
                key: const Key('game-start-button'),
                onPressed: onStart,
                child: Text(startLabel),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
