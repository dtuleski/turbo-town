
import 'package:dashden_mobile/api/quest_models.dart';
import 'package:dashden_mobile/game/game_registry.dart';
import 'package:dashden_mobile/quest/quest_launch.dart';
import 'package:dashden_mobile/quest/quest_map_logic.dart';
import 'package:flutter_test/flutter_test.dart';

const _ref = QuestContext(worldId: 'brain-peaks', nodeId: 'bp-01', legIndex: 0);

QuestNodeView node(
  String id, {
  String kind = 'GAME',
  String status = 'AVAILABLE',
  int stars = 0,
  List<LegView> legs = const [LegView(themeId: 'ANIMALS', difficulty: 1)],
}) =>
    QuestNodeView(
      id: id,
      kind: kind,
      status: status,
      stars: stars,
      bestScore: 0,
      thresholds: const [100, 200, 300],
      mapX: 50,
      mapY: 50,
      legs: legs,
    );

QuestWorldView world(List<QuestNodeView> nodes,
        {bool accessible = true, QuestActiveGauntlet? run}) =>
    QuestWorldView(
      id: 'brain-peaks',
      order: 1,
      accessible: accessible,
      totalStars: 0,
      maxStars: 30,
      badges: const [],
      nodes: nodes,
      activeGauntlet: run,
    );

void main() {
  group('buildLaunchPath', () {
    test('memory card theme', () {
      expect(
        buildLaunchPath(const LegView(themeId: 'ANIMALS', difficulty: 1), _ref),
        '/memory-match/play?theme=ANIMALS&difficulty=easy&quest=brain-peaks%3Abp-01%3A0',
      );
    });

    test('difficulty-only games', () {
      final path = buildLaunchPath(
        const LegView(themeId: 'MATH_CHALLENGE', difficulty: 3),
        _ref,
      );
      expect(path, '/math-challenge/play?difficulty=hard&quest=brain-peaks%3Abp-01%3A0');
    });

    test('sequence memory takes an optional page theme', () {
      expect(
        buildLaunchPath(const LegView(themeId: 'SEQUENCE_MEMORY', difficulty: 2), _ref),
        '/sequence-memory/play?difficulty=medium&quest=brain-peaks%3Abp-01%3A0',
      );
      expect(
        buildLaunchPath(
          const LegView(
            themeId: 'SEQUENCE_MEMORY',
            difficulty: 2,
            params: LegParams(pageTheme: 'colors'),
          ),
          _ref,
        ),
        '/sequence-memory/play?difficulty=medium&theme=colors&quest=brain-peaks%3Abp-01%3A0',
      );
    });

    test('pattern recall needs a page theme', () {
      expect(
        buildLaunchPath(const LegView(themeId: 'PATTERN_RECALL', difficulty: 1), _ref),
        isNull,
      );
    });

    test('circuit builder needs a level and difficulty 1-4', () {
      expect(
        buildLaunchPath(
          const LegView(
            themeId: 'CIRCUIT_BUILDER',
            difficulty: 4,
            params: LegParams(levelId: 'series-1'),
          ),
          _ref,
        ),
        '/circuit-builder/play?difficulty=4&level=series-1&quest=brain-peaks%3Abp-01%3A0',
      );
      expect(
        buildLaunchPath(const LegView(themeId: 'CIRCUIT_BUILDER', difficulty: 4), _ref),
        isNull,
      );
      expect(
        buildLaunchPath(
          const LegView(
            themeId: 'CIRCUIT_BUILDER',
            difficulty: 5,
            params: LegParams(levelId: 'x'),
          ),
          _ref,
        ),
        isNull,
      );
    });

    test('unknown theme or difficulty 4 on a name-only game is rejected', () {
      expect(buildLaunchPath(const LegView(themeId: 'NOPE', difficulty: 1), _ref), isNull);
      expect(
        buildLaunchPath(const LegView(themeId: 'GEO_QUIZ', difficulty: 4), _ref),
        isNull,
      );
    });

    test('legs of games with app screens can be played, others cannot', () {
      expect(isLegPlayableInApp(const LegView(themeId: 'FRUITS', difficulty: 1)), isTrue);
      expect(isLegPlayableInApp(const LegView(themeId: 'GEO_QUIZ', difficulty: 1)), isTrue);
      expect(isLegPlayableInApp(const LegView(themeId: 'MATH_CHALLENGE', difficulty: 2)), isTrue);
      expect(isLegPlayableInApp(const LegView(themeId: 'WORD_PUZZLE', difficulty: 3)), isTrue);
      expect(isLegPlayableInApp(const LegView(themeId: 'SEQUENCE_MEMORY', difficulty: 1)), isTrue);
      expect(isLegPlayableInApp(const LegView(themeId: 'MATH_MAZE', difficulty: 2)), isTrue);
      expect(isLegPlayableInApp(const LegView(themeId: 'BUBBLE_POP', difficulty: 3)), isTrue);
      expect(isLegPlayableInApp(const LegView(themeId: 'BOND_AND_BURN', difficulty: 1)), isFalse);
      expect(isLegPlayableInApp(const LegView(themeId: 'NOPE', difficulty: 1)), isFalse);
    });
  });

  test('every launch row points at a registry game', () {
    for (final entry in kQuestLaunchTable.entries) {
      expect(gameById(entry.value.gameId), isNotNull, reason: entry.key);
    }
  });

  group('nextLegPath', () {
    QuestResult result(QuestGauntletResult? g) => QuestResult(
          worldId: 'brain-peaks',
          nodeId: 'bp-boss',
          kind: 'BOSS',
          score: 10,
          thresholds: const [1, 2, 3],
          stars: 0,
          bestStars: 0,
          newlyUnlocked: const [],
          worldCleared: false,
          badgesAwarded: const [],
          gauntlet: g,
        );

    test('points at the next leg while the run is in progress', () {
      final path = nextLegPath(result(const QuestGauntletResult(
        legIndex: 0,
        legsTotal: 2,
        status: 'IN_PROGRESS',
        nextLeg: LegView(themeId: 'FRUITS', difficulty: 2),
      )));
      expect(path, contains('theme=FRUITS'));
      expect(path, contains('quest=brain-peaks%3Abp-boss%3A1'));
    });

    test('is null when the run is done, expired or has no gauntlet', () {
      expect(nextLegPath(null), isNull);
      expect(nextLegPath(result(null)), isNull);
      expect(
        nextLegPath(result(const QuestGauntletResult(
          legIndex: 1,
          legsTotal: 2,
          status: 'COMPLETE',
        ))),
        isNull,
      );
    });
  });

  group('resolveMemorySettings', () {
    test('accepts easy/medium/hard in any case', () {
      final s = resolveMemorySettings({'theme': 'OCEAN', 'difficulty': 'medium'});
      expect(s?.themeId, 'OCEAN');
      expect(s?.difficulty.id, 'MEDIUM');
    });

    test('rejects unknown themes and super hard', () {
      expect(resolveMemorySettings({'theme': 'NOPE', 'difficulty': 'easy'}), isNull);
      expect(resolveMemorySettings({'theme': 'OCEAN', 'difficulty': 'super_hard'}), isNull);
      expect(resolveMemorySettings({'theme': 'OCEAN'}), isNull);
    });
  });

  group('map logic', () {
    test('visual state follows server status and stars', () {
      NodeVisualState st(QuestNodeView n, {bool accessible = true}) =>
          nodeVisualState(n, worldAccessible: accessible);
      expect(st(node('a', status: 'LOCKED')), NodeVisualState.locked);
      expect(st(node('a')), NodeVisualState.available);
      expect(st(node('a', stars: 2)), NodeVisualState.earned2);
      expect(st(node('a', status: 'UNAVAILABLE', stars: 3)), NodeVisualState.unavailable);
      expect(st(node('a'), accessible: false), NodeVisualState.locked);
      expect(st(node('a', kind: 'WEIRD')), NodeVisualState.locked);
      expect(st(node('a', stars: 9)), NodeVisualState.earned3);
    });

    test('frontier is the first available node with the fewest stars', () {
      final w = world([
        node('a', stars: 3),
        node('b', stars: 1),
        node('c', stars: 1),
        node('d', status: 'LOCKED'),
      ]);
      expect(frontierNodeId(w), 'b');
      expect(frontierNodeId(world([node('a', status: 'LOCKED')])), isNull);
    });

    test('completed segments reach the last starred path node; bonus is last', () {
      final nodes = [
        node('a', stars: 1),
        node('b', stars: 2),
        node('c'),
        node('bonus', kind: 'BONUS', stars: 3),
      ];
      expect(completedSegmentCount(nodes), 1);
      expect(orderNodes([nodes[3], nodes[0]]).map((n) => n.id), ['a', 'bonus']);
    });

    test('panel form: paywall wins for a closed world', () {
      expect(panelForm(node('a'), world([], accessible: false)), PanelForm.paywall);
      expect(panelForm(node('a', status: 'LOCKED'), world([])), PanelForm.locked);
      expect(panelForm(node('a', status: 'UNAVAILABLE'), world([])), PanelForm.unavailable);
      expect(panelForm(node('a'), world([])), PanelForm.play);
    });

    test('a boss run in progress resumes at the next leg', () {
      final boss = node('boss', kind: 'BOSS', legs: const [
        LegView(themeId: 'ANIMALS', difficulty: 2),
        LegView(themeId: 'FRUITS', difficulty: 2),
      ]);
      const run = QuestActiveGauntlet(nodeId: 'boss', legsDone: 1, legsTotal: 2);
      final w = world([boss], run: run);
      expect(legToRun(boss, run)?.legIndex, 1);
      expect(isRunInProgress(boss, run), isTrue);
      expect(playPath(boss, w), contains('theme=FRUITS'));
      expect(playPath(boss, w), contains('boss%3A1'));
      expect(legToRun(boss, null)?.legIndex, 0);
    });

    test('playPath is null for locked nodes and closed worlds', () {
      expect(playPath(node('a', status: 'LOCKED'), world([])), isNull);
      expect(playPath(node('a'), world([], accessible: false)), isNull);
    });

    test('phone layout helpers', () {
      expect(phonePosition(5), 15);
      expect(phonePosition(95), 85);
      expect(phonePosition(40), 40);
      expect(phoneRowY(0, 4), 87.5);
      expect(phoneRowY(3, 4), 12.5);
    });

    test('trail segments reflect the control point about the midpoint', () {
      final segs = trailSegments(const [Offset(0, 100), Offset(100, 0)]);
      expect(segs, hasLength(1));
      expect(segs.single.c1, const Offset(0, 50));
      expect(segs.single.mid, const Offset(50, 50));
      expect(segs.single.c2, const Offset(100, 50));
      expect(segs.single.end, const Offset(100, 0));
      expect(trailSegments(const [Offset(1, 1)]), isEmpty);
    });
  });
}
