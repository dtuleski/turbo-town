import 'dart:ui';

import '../api/quest_models.dart';
import 'quest_launch.dart';

/// Pure Quest Map view logic. Port of apps/web `utils/questMap.ts`. The server
/// decides statuses, stars and access; this only maps them to what is drawn.
enum NodeVisualState { locked, available, earned1, earned2, earned3, unavailable }

const Set<String> _knownKinds = {'GAME', 'BOSS', 'BONUS'};
const Set<String> _knownStatuses = {'LOCKED', 'AVAILABLE', 'UNAVAILABLE'};

bool _isKnown(QuestNodeView n) =>
    _knownKinds.contains(n.kind) && _knownStatuses.contains(n.status);

/// Stars to draw under a node (0 to 3); unavailable nodes show none.
int shownStars(QuestNodeView n) {
  if (n.status == 'UNAVAILABLE') return 0;
  return n.stars.clamp(0, 3);
}

NodeVisualState nodeVisualState(QuestNodeView n, {required bool worldAccessible}) {
  if (!worldAccessible || !_isKnown(n)) return NodeVisualState.locked;
  if (n.status == 'LOCKED') return NodeVisualState.locked;
  if (n.status == 'UNAVAILABLE') return NodeVisualState.unavailable;
  switch (shownStars(n)) {
    case 1:
      return NodeVisualState.earned1;
    case 2:
      return NodeVisualState.earned2;
    case 3:
      return NodeVisualState.earned3;
    default:
      return NodeVisualState.available;
  }
}

/// A non-colour cue per state, so state is not shown by colour alone.
String nodeIcon(NodeVisualState s) {
  switch (s) {
    case NodeVisualState.locked:
      return '🔒';
    case NodeVisualState.available:
      return '▶';
    case NodeVisualState.unavailable:
      return '⊘';
    case NodeVisualState.earned1:
      return '★';
    case NodeVisualState.earned2:
      return '★★';
    case NodeVisualState.earned3:
      return '★★★';
  }
}

/// Lane x on phones, keeping a node inside the lane.
double phonePosition(double x) => x.clamp(15, 85).toDouble();

bool canLaunch(QuestNodeView n, QuestWorldView w) =>
    w.accessible && _isKnown(n) && n.status == 'AVAILABLE';

/// Path nodes (bonus excluded), in order.
List<QuestNodeView> pathNodes(List<QuestNodeView> nodes) =>
    nodes.where((n) => n.kind != 'BONUS').toList();

/// Nodes in order: path nodes, bonus last.
List<QuestNodeView> orderNodes(List<QuestNodeView> nodes) => [
      ...pathNodes(nodes),
      ...nodes.where((n) => n.kind == 'BONUS'),
    ];

/// Segments drawn as completed: up to the last path node with stars > 0.
int completedSegmentCount(List<QuestNodeView> nodes) {
  final path = pathNodes(nodes);
  var last = -1;
  for (var i = 0; i < path.length; i++) {
    if (shownStars(path[i]) > 0) last = i;
  }
  return last < 0 ? 0 : last;
}

/// First AVAILABLE node with the lowest stars, in path order.
String? frontierNodeId(QuestWorldView w) {
  QuestNodeView? best;
  for (final n in w.nodes) {
    if (!canLaunch(n, w)) continue;
    if (best == null || shownStars(n) < shownStars(best)) best = n;
  }
  return best?.id;
}

/// Vertical (phone) row centre in a 0-100 box, row 0 at the bottom.
double phoneRowY(int index, int rows) =>
    100 - ((index + 0.5) * 100) / (rows < 1 ? 1 : rows);

bool _isActiveRun(QuestNodeView n, QuestActiveGauntlet? run) =>
    n.kind == 'BOSS' && run != null && run.nodeId == n.id && run.legsDone < n.legs.length;

bool isRunInProgress(QuestNodeView n, QuestActiveGauntlet? run) => _isActiveRun(n, run);

({LegView leg, int legIndex})? legToRun(QuestNodeView n, QuestActiveGauntlet? run) {
  if (n.legs.isEmpty) return null;
  if (_isActiveRun(n, run)) {
    return (leg: n.legs[run!.legsDone], legIndex: run.legsDone);
  }
  return (leg: n.legs[0], legIndex: 0);
}

/// Route for the node's next leg, or null when it cannot be played from here.
String? playPath(QuestNodeView n, QuestWorldView w) {
  if (!canLaunch(n, w)) return null;
  final run = legToRun(n, w.activeGauntlet);
  if (run == null) return null;
  return buildLaunchPath(
    run.leg,
    QuestContext(worldId: w.id, nodeId: n.id, legIndex: run.legIndex),
  );
}

enum PanelForm { play, locked, paywall, unavailable }

/// Which node panel form to show. Paywall wins for an inaccessible world.
PanelForm panelForm(QuestNodeView n, QuestWorldView w) {
  if (!w.accessible) return PanelForm.paywall;
  final state = nodeVisualState(n, worldAccessible: true);
  if (state == NodeVisualState.unavailable) return PanelForm.unavailable;
  if (state == NodeVisualState.locked) return PanelForm.locked;
  return PanelForm.play;
}

/// Points of a smooth winding trail, as segments for a [Path]. Port of web
/// `buildPathD`: per pair a quadratic segment to the midpoint with the control
/// point above the start, then the reflected segment to the end, so tangents at
/// nodes are vertical.
class TrailSegment {
  const TrailSegment(this.c1, this.mid, this.c2, this.end);
  final Offset c1;
  final Offset mid;
  final Offset c2;
  final Offset end;
}

List<TrailSegment> trailSegments(List<Offset> points) {
  final out = <TrailSegment>[];
  for (var i = 1; i < points.length; i++) {
    final a = points[i - 1];
    final b = points[i];
    final mx = (a.dx + b.dx) / 2;
    final my = (a.dy + b.dy) / 2;
    final c1 = Offset(a.dx, my);
    // `T` reflects the previous control point about the current point.
    final c2 = Offset(2 * mx - c1.dx, 2 * my - c1.dy);
    out.add(TrailSegment(c1, Offset(mx, my), c2, b));
  }
  return out;
}
