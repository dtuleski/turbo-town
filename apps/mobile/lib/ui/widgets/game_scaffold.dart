import 'package:flutter/material.dart';

/// Standard page frame for game screens: app bar, safe area, padded body.
class GameScaffold extends StatelessWidget {
  const GameScaffold({
    super.key,
    required this.title,
    required this.body,
    this.actions,
    this.padding = const EdgeInsets.all(16),
  });

  final String title;
  final Widget body;
  final List<Widget>? actions;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions),
      body: SafeArea(child: Padding(padding: padding, child: body)),
    );
  }
}
