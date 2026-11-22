import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/quest_models.dart';
import '../../game/framework/game_session.dart';
import '../../game/hub_providers.dart';
import '../../l10n/game_text.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../quest/quest_launch.dart';
import '../../quest/quest_map_logic.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';

const double _rowHeight = 96;
const double _nodeSize = 56;

String _nodeName(AppLocalizations l10n, QuestNodeView n) =>
    questNodeName(l10n, n.id) ?? n.id;

String _formatReset(String? iso) {
  final d = iso == null ? null : DateTime.tryParse(iso)?.toLocal();
  if (d == null) return '';
  return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

/// Quest Map: worlds as winding trails of nodes. All unlock and star logic
/// comes from the server (`getQuestProgress`).
class QuestMapScreen extends ConsumerStatefulWidget {
  const QuestMapScreen({super.key, this.startFailed});

  /// `quest` or `rate` when a quest start was rejected and the player was sent
  /// back here (web `?startFailed=`).
  final String? startFailed;

  @override
  ConsumerState<QuestMapScreen> createState() => _QuestMapScreenState();
}

class _QuestMapScreenState extends ConsumerState<QuestMapScreen> {
  late final Set<String> _justUnlocked;
  late final Set<String> _justEarned;
  final ScrollController _scroll = ScrollController();
  bool _scrolled = false;
  final Map<String, GlobalKey> _keys = {};

  @override
  void initState() {
    super.initState();
    // Unlocks from the game just finished show once, then the result is cleared.
    final result = ref.read(questResultProvider);
    _justUnlocked = {...?result?.newlyUnlocked};
    _justEarned = {
      for (final id in result?.badgesAwarded ?? const <String>[])
        '${result?.worldId}:$id',
    };
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(questResultProvider.notifier).state = null;
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToFrontier(QuestProgressView data, Map<String, GlobalKey> keys) {
    if (_scrolled) return;
    _scrolled = true;
    final worlds = [...data.worlds]..sort((a, b) => a.order.compareTo(b.order));
    for (final w in worlds) {
      final id = frontierNodeId(w);
      if (id == null) continue;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final ctx = keys[id]?.currentContext;
        if (ctx != null && mounted) {
          Scrollable.ensureVisible(ctx, alignment: 0.5);
        }
      });
      return;
    }
  }

  Future<void> _openNode(
    QuestWorldView world,
    QuestNodeView node,
    QuestProgressView data,
  ) async {
    final path = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _NodePanel(node: node, world: world, rateLimit: data.rateLimit),
    );
    if (path == null || !mounted) return;
    await context.push(path);
    if (mounted) ref.invalidate(questProgressProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final progress = ref.watch(questProgressProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.quest_title)),
      body: SafeArea(
        child: progress.when(
          loading: () => LoadingView(message: l10n.quest_loading),
          error: (_, __) => ErrorView(
            message: l10n.quest_error_title,
            retryLabel: l10n.quest_error_retry,
            onRetry: () => ref.invalidate(questProgressProvider),
          ),
          data: (data) {
            _scrollToFrontier(data, _keys);
            final worlds = [...data.worlds]..sort((a, b) => a.order.compareTo(b.order));
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(questProgressProvider);
                await ref.read(questProgressProvider.future);
              },
              child: ListView(
                controller: _scroll,
                padding: const EdgeInsets.all(16),
                children: [
                  Text(l10n.quest_subtitle),
                  const SizedBox(height: 8),
                  _PlaysLeft(rateLimit: data.rateLimit),
                  if (widget.startFailed == 'quest')
                    Container(
                      key: const Key('quest-notice'),
                      margin: const EdgeInsets.only(top: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade400),
                      ),
                      child: Text(l10n.quest_notice_questUnavailable),
                    ),
                  for (final world in worlds)
                    _WorldSection(
                      world: world,
                      justUnlocked: _justUnlocked,
                      justEarned: _justEarned,
                      keys: _keys,
                      onSelect: (node) => _openNode(world, node, data),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _PlaysLeft extends StatelessWidget {
  const _PlaysLeft({required this.rateLimit});

  final QuestRateLimitView rateLimit;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final limit = rateLimit.limit < 0 ? 0 : rateLimit.limit;
    final used = rateLimit.used.clamp(0, limit);
    final remaining = rateLimit.remaining < 0 ? 0 : rateLimit.remaining;
    final reset = _formatReset(rateLimit.resetAt);
    return Column(
      key: const Key('plays-left'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.quest_playsLeft('$remaining'),
            style: const TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: limit > 0 ? used / limit : 0,
            minHeight: 10,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '${l10n.quest_playsUsed('$used', '$limit')}'
          '${reset.isEmpty ? '' : ' · ${l10n.quest_resetsAt(reset)}'}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _WorldSection extends StatelessWidget {
  const _WorldSection({
    required this.world,
    required this.justUnlocked,
    required this.justEarned,
    required this.keys,
    required this.onSelect,
  });

  final QuestWorldView world;
  final Set<String> justUnlocked;
  final Set<String> justEarned;
  final Map<String, GlobalKey> keys;
  final void Function(QuestNodeView) onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final name = questWorldName(l10n, world.id) ?? world.id;
    return Column(
      key: Key('world-${world.id}'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(name,
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w900)),
            ),
            Text('★ ${l10n.quest_worldStars('${world.totalStars}', '${world.maxStars}')}',
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
        if (!world.accessible)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Container(
              key: Key('world-locked-${world.id}'),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('🔒 ${l10n.mobileGame_worldLockedApp}'),
            ),
          ),
        const SizedBox(height: 8),
        _BadgeShelf(world: world, justEarned: justEarned),
        const SizedBox(height: 8),
        _WorldPath(
          world: world,
          justUnlocked: justUnlocked,
          keys: keys,
          onSelect: onSelect,
        ),
      ],
    );
  }
}

class _BadgeShelf extends StatelessWidget {
  const _BadgeShelf({required this.world, required this.justEarned});

  final QuestWorldView world;
  final Set<String> justEarned;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    const ids = ['WORLD_CLEARED', 'WORLD_MASTERED'];
    String badgeName(String id) => id == 'WORLD_CLEARED'
        ? l10n.quest_badges_WORLD_CLEARED_name
        : l10n.quest_badges_WORLD_MASTERED_name;
    return Wrap(
      spacing: 8,
      children: [
        for (final id in ids)
          Chip(
            key: Key('badge-${world.id}-$id'),
            avatar: Text(world.badges.contains(id) ? '🏅' : '🔒'),
            label: Text(
              '${badgeName(id)} · '
              '${world.badges.contains(id) ? l10n.quest_badges_earned : l10n.quest_badges_locked}'
              '${justEarned.contains('${world.id}:$id') ? ' · ${l10n.quest_badges_new}' : ''}',
            ),
          ),
      ],
    );
  }
}

class _WorldPath extends StatelessWidget {
  const _WorldPath({
    required this.world,
    required this.justUnlocked,
    required this.keys,
    required this.onSelect,
  });

  final QuestWorldView world;
  final Set<String> justUnlocked;
  final Map<String, GlobalKey> keys;
  final void Function(QuestNodeView) onSelect;

  @override
  Widget build(BuildContext context) {
    final ordered = orderNodes(world.nodes);
    final path = pathNodes(world.nodes);
    final rows = ordered.length;
    final height = rows * _rowHeight;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        Offset at(QuestNodeView n, int index) => Offset(
              phonePosition(n.mapX) / 100 * width,
              phoneRowY(index, rows) / 100 * height,
            );
        final points = [for (var i = 0; i < path.length; i++) at(path[i], i)];
        QuestNodeView? bonus;
        for (final n in ordered) {
          if (n.kind == 'BONUS') bonus = n;
        }
        final bonusLink = bonus != null && path.isNotEmpty
            ? (points.last, at(bonus, rows - 1))
            : null;
        return SizedBox(
          height: height,
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _TrailPainter(
                    points: points,
                    done: completedSegmentCount(world.nodes),
                    bonusLink: bonusLink,
                    locked: !world.accessible,
                  ),
                ),
              ),
              for (var i = 0; i < ordered.length; i++)
                Positioned(
                  left: at(ordered[i], i).dx - _nodeSize / 2,
                  top: at(ordered[i], i).dy - _nodeSize / 2,
                  child: _NodeButton(
                    key: keys.putIfAbsent(ordered[i].id, GlobalKey.new),
                    node: ordered[i],
                    world: world,
                    isNew: justUnlocked.contains(ordered[i].id),
                    onTap: () => onSelect(ordered[i]),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _TrailPainter extends CustomPainter {
  _TrailPainter({
    required this.points,
    required this.done,
    required this.bonusLink,
    required this.locked,
  });

  final List<Offset> points;
  final int done;
  final (Offset, Offset)? bonusLink;
  final bool locked;

  Path _pathFor(List<Offset> pts) {
    final p = Path();
    if (pts.isEmpty) return p;
    p.moveTo(pts.first.dx, pts.first.dy);
    for (final s in trailSegments(pts)) {
      p.quadraticBezierTo(s.c1.dx, s.c1.dy, s.mid.dx, s.mid.dy);
      p.quadraticBezierTo(s.c2.dx, s.c2.dy, s.end.dx, s.end.dy);
    }
    return p;
  }

  @override
  void paint(Canvas canvas, Size size) {
    Paint stroke(Color c, double w) => Paint()
      ..color = c
      ..style = PaintingStyle.stroke
      ..strokeWidth = w
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final base = locked ? Colors.grey.shade400 : const Color(0xFFD6B98C);
    final outline = locked ? Colors.grey.shade600 : const Color(0xFF8A6A3B);
    final full = _pathFor(points);
    canvas.drawPath(full, stroke(outline, 14));
    canvas.drawPath(full, stroke(base, 9));
    if (done > 0) {
      final part = _pathFor(points.take(done + 1).toList());
      canvas.drawPath(part, stroke(const Color(0xFF166534), 14));
      canvas.drawPath(part, stroke(const Color(0xFF4ADE80), 9));
    }
    final link = bonusLink;
    if (link != null) {
      canvas.drawPath(_pathFor([link.$1, link.$2]), stroke(outline, 4));
    }
  }

  @override
  bool shouldRepaint(_TrailPainter old) =>
      old.points != points ||
      old.done != done ||
      old.bonusLink != bonusLink ||
      old.locked != locked;
}

Color _stateColor(NodeVisualState s) {
  switch (s) {
    case NodeVisualState.locked:
      return Colors.grey.shade400;
    case NodeVisualState.unavailable:
      return Colors.blueGrey.shade200;
    case NodeVisualState.available:
      return const Color(0xFF7C3AED);
    case NodeVisualState.earned1:
    case NodeVisualState.earned2:
    case NodeVisualState.earned3:
      return const Color(0xFFF59E0B);
  }
}

class _NodeButton extends StatelessWidget {
  const _NodeButton({
    super.key,
    required this.node,
    required this.world,
    required this.isNew,
    required this.onTap,
  });

  final QuestNodeView node;
  final QuestWorldView world;
  final bool isNew;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = nodeVisualState(node, worldAccessible: world.accessible);
    final name = _nodeName(l10n, node);
    final label = switch (state) {
      NodeVisualState.locked => l10n.quest_node_aria_locked(name),
      NodeVisualState.available => l10n.quest_node_aria_available(name),
      NodeVisualState.unavailable => l10n.quest_node_aria_unavailable(name),
      _ => l10n.quest_node_aria_earned(name, '${shownStars(node)}'),
    };
    final tags = [
      if (node.kind == 'BOSS') l10n.quest_node_boss,
      if (node.kind == 'BONUS') l10n.quest_node_bonus,
      if (isNew) l10n.quest_node_new,
    ];
    return SizedBox(
      width: _nodeSize,
      child: Semantics(
        label: label,
        button: true,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Material(
              color: _stateColor(state),
              shape: CircleBorder(
                side: BorderSide(
                  color: node.kind == 'BOSS' ? Colors.red.shade700 : Colors.white,
                  width: 3,
                ),
              ),
              elevation: 3,
              child: InkWell(
                key: Key('node-${node.id}'),
                customBorder: const CircleBorder(),
                onTap: onTap,
                child: SizedBox(
                  width: _nodeSize,
                  height: _nodeSize,
                  child: Center(
                    child: Text(
                      nodeIcon(state),
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ),
                ),
              ),
            ),
            if (tags.isNotEmpty)
              Text(tags.join(' · '),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

/// Bottom sheet for one node. Pops with the game route when the player taps
/// play.
class _NodePanel extends StatelessWidget {
  const _NodePanel({
    required this.node,
    required this.world,
    required this.rateLimit,
  });

  final QuestNodeView node;
  final QuestWorldView world;
  final QuestRateLimitView rateLimit;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final form = panelForm(node, world);
    final stars = shownStars(node);
    final run = world.activeGauntlet;
    final inRun = isRunInProgress(node, run);
    final playLabel = inRun
        ? l10n.quest_panel_continue
        : (stars > 0 ? l10n.quest_panel_replay : l10n.quest_panel_play);
    final path = form == PanelForm.play ? playPath(node, world) : null;
    final toRun = legToRun(node, run);
    final inApp = toRun != null && isLegPlayableInApp(toRun.leg);
    final goals = [
      l10n.quest_panel_goal1,
      l10n.quest_panel_goal2,
      l10n.quest_panel_goal3,
    ];
    return SafeArea(
      child: SingleChildScrollView(
        key: const Key('node-panel'),
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_nodeName(l10n, node),
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            Text('${'★' * stars}${'☆' * (3 - stars)}',
                style: const TextStyle(fontSize: 22, color: Colors.amber)),
            if (node.bestScore > 0) Text(l10n.quest_panel_best('${node.bestScore}')),
            const SizedBox(height: 12),
            Text(l10n.quest_panel_goals,
                style: const TextStyle(fontWeight: FontWeight.w800)),
            for (var i = 0; i < node.thresholds.length && i < 3; i++)
              Text('${goals[i]}: ${l10n.quest_panel_points('${node.thresholds[i]}')}'
                  '${node.bestScore >= node.thresholds[i] ? ' ✓' : ''}'),
            if (node.legs.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(l10n.quest_panel_legs,
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              for (var i = 0; i < node.legs.length; i++)
                Text(
                  '${node.legs.length > 1 ? '${l10n.quest_panel_legOf('${i + 1}', '${node.legs.length}')}: ' : ''}'
                  '${questGameName(l10n, node.legs[i].themeId) ?? node.legs[i].themeId}',
                ),
            ],
            if (inRun)
              Text(l10n.quest_panel_runInProgress(
                '${run!.legsDone}',
                '${run.legsTotal}',
                _formatReset(run.expiresAt),
              )),
            const SizedBox(height: 16),
            switch (form) {
              PanelForm.play => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (rateLimit.remaining <= 0)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(l10n.quest_panel_noPlaysLeft),
                      ),
                    if (path != null && !inApp)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          l10n.mobileGame_questNodePlayUnavailable,
                          key: const Key('node-not-in-app'),
                        ),
                      ),
                    FilledButton(
                      key: const Key('node-play'),
                      onPressed:
                          path != null && inApp ? () => Navigator.of(context).pop(path) : null,
                      child: Text(playLabel),
                    ),
                  ],
                ),
              PanelForm.locked => Text(node.kind == 'BONUS'
                  ? l10n.quest_panel_bonusLocked
                  : l10n.quest_panel_locked),
              PanelForm.unavailable => Text(l10n.quest_panel_unavailable),
              PanelForm.paywall => Text(l10n.mobileGame_worldLockedApp),
            },
          ],
        ),
      ),
    );
  }
}
