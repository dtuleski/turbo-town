import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/circuit/circuit_controller.dart';
import 'package:dashden_mobile/game/circuit/engine/engine.dart';
import 'package:dashden_mobile/game/circuit/geometry.dart';
import 'package:dashden_mobile/game/circuit/state.dart';
import 'package:dashden_mobile/game/framework/game_session.dart';
import 'package:dashden_mobile/l10n/gen/app_localizations_en.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

const CircuitArgs _cb01 = (levelId: 'cb-01-closed-circuit', quest: null);
const String _play = '/circuit-builder/play?difficulty=1&level=cb-01-closed-circuit';

CircuitBoardState _state(RouterHarness h, [CircuitArgs args = _cb01]) =>
    h.container.read(circuitControllerProvider(args));

/// Scene point to screen point, through the viewer's pan and zoom.
Offset _screen(WidgetTester tester, Offset scene) {
  final finder = find.byKey(const Key('circuit-viewer'));
  final viewer = tester.widget<InteractiveViewer>(finder);
  final m = viewer.transformationController!.value;
  return tester.getTopLeft(finder) + MatrixUtils.transformPoint(m, scene);
}

CircuitViewport _viewport(CircuitBoardState s) =>
    CircuitViewport.forGrid(s.builder.layout.gridSize);

Future<void> _place(WidgetTester tester, RouterHarness h, ElementKind kind, int col, int row,
    [CircuitArgs args = _cb01]) async {
  // Tapping the armed kind again would disarm it.
  if (_state(h, args).armedKind != kind) {
    await tester.tap(find.byKey(Key('circuit-tray-${kind.id}')));
    await tester.pump();
  }
  final v = _viewport(_state(h, args));
  await tester.tapAt(_screen(tester, cellToPoint(GridCell(col, row), v)));
  await tester.pump();
}

Future<void> _wire(WidgetTester tester, RouterHarness h, String a, String b,
    [CircuitArgs args = _cb01]) async {
  Offset terminal(String t) {
    final parts = t.split(':');
    final s = _state(h, args);
    final e = elementById(s.builder, parts[0])!;
    return _screen(tester, terminalAnchor(e, int.parse(parts[1]), _viewport(s)));
  }

  await tester.tapAt(terminal(a));
  await tester.pump();
  await tester.tapAt(terminal(b));
  await tester.pump();
}

/// Builds the cb-01 solution: battery - resistor - LED in a loop.
Future<void> _buildCb01(WidgetTester tester, RouterHarness h) async {
  await _place(tester, h, ElementKind.battery, 1, 2);
  await _place(tester, h, ElementKind.resistor, 3, 2);
  await _place(tester, h, ElementKind.led, 5, 2);
  await _wire(tester, h, 'e1:0', 'e2:0');
  await _wire(tester, h, 'e2:1', 'e3:0');
  await _wire(tester, h, 'e3:1', 'e1:1');
}

void main() {
  testWidgets('setup lists the levels by difficulty and starts the chosen one', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(tester, location: '/circuit-builder/setup', api: api);
    expect(find.text('Circuit Builder'), findsWidgets);
    expect(find.byKey(const Key('circuit-level-cb-01-closed-circuit')), findsOneWidget);
    expect(find.byKey(const Key('circuit-level-cb-02-switch-control')), findsOneWidget);
    expect(find.byKey(const Key('circuit-level-cb-03-series-loop')), findsNothing);

    await tester.tap(find.byKey(const Key('circuit-difficulty-3')));
    await tester.pump();
    expect(find.byKey(const Key('circuit-level-cb-05-series-vs-parallel')), findsOneWidget);
    await tester.tap(find.byKey(const Key('circuit-level-cb-06-short-circuit-recovery')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('game-start-button')));
    await settleStart(tester);
    expect(api.calls, contains('startGame:CIRCUIT_BUILDER:3'));
    expect(find.byKey(const Key('circuit-title')), findsOneWidget);
    expect(find.byKey(const Key('circuit-canvas')), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('build the cb-01 circuit by touch: the server gets the circuit and returns the score',
      (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    int? sentTime;
    int? sentAttempts;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      sentTime = time;
      sentAttempts = attempts;
      return serverResult(7300);
    });
    final h = await pumpRouterApp(tester, location: '/circuit-builder/setup', api: api);
    await chooseAndStart(tester, ['circuit-level-cb-01-closed-circuit']);
    expect(api.calls, contains('startGame:CIRCUIT_BUILDER:1'));
    expect(find.byKey(const Key('circuit-goal')), findsOneWidget);

    // Parts and wires, one tap each.
    await _place(tester, h, ElementKind.battery, 1, 2);
    expect(_state(h).builder.layout.elements.single.id, 'e1');
    expect(find.text('0 left'), findsNothing);
    expect(find.text('None left'), findsOneWidget, reason: 'the only battery is used');
    await _place(tester, h, ElementKind.resistor, 3, 2);
    await _place(tester, h, ElementKind.led, 5, 2);
    expect(_state(h).builder.layout.elements.map((e) => e.kind.id), ['battery', 'resistor', 'led']);
    expect(_state(h).result!.closedPathExists, isFalse);
    expect(find.byKey(const Key('circuit-status')).evaluate().isNotEmpty, isTrue);

    await _wire(tester, h, 'e1:0', 'e2:0');
    expect(_state(h).builder.layout.connections, hasLength(1));
    await _wire(tester, h, 'e2:1', 'e3:0');
    await _wire(tester, h, 'e3:1', 'e1:1');
    expect(_state(h).builder.layout.connections, hasLength(3));
    expect(_state(h).result!.faults, isEmpty);
    expect(find.text('Current is flowing'), findsOneWidget);
    expect(find.byKey(const Key('circuit-role-state-headlight')).evaluate().isNotEmpty, isTrue);
    expect(tester.widget<Text>(find.byKey(const Key('circuit-role-state-headlight'))).data, 'On');

    // The circuit must stay solved for the settle delay before it is sent.
    expect(api.calls.where((c) => c.startsWith('completeGame')), isEmpty);
    await tester.pump(const Duration(milliseconds: 500));
    expect(api.calls.where((c) => c.startsWith('completeGame')), isEmpty);
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls.where((c) => c.startsWith('completeGame')), hasLength(1));

    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('7300'), findsOneWidget);
    expect(find.byKey(const Key('circuit-learn')), findsOneWidget);
    expect(find.byKey(const Key('circuit-next-level')), findsOneWidget);
    expect(sentAttempts, 1);
    expect(sentTime, 2, reason: 'floored to the difficulty minimum');
    expect(sent!.keys, ['circuitSubmission']);
    final sub = sent!['circuitSubmission'] as Map<String, dynamic>;
    expect(sub['levelId'], 'cb-01-closed-circuit');
    expect(sub['faultCount'], 0);
    expect(sub['environment'], {'sourceVoltage': 9.0, 'lightLevel': 1.0});
    final layout = sub['layout'] as Map<String, dynamic>;
    expect((layout['elements'] as List).map((e) => (e as Map)['kind']),
        ['battery', 'resistor', 'led']);
    expect((layout['connections'] as List).map((c) => '${(c as Map)['from']}>${c['to']}'),
        ['e1:0>e2:0', 'e2:1>e3:0', 'e3:1>e1:1']);

    // The next level opens in place of this one.
    await tester.tap(find.byKey(const Key('circuit-next-level')));
    await settleStart(tester);
    expect(api.calls.where((c) => c.startsWith('startGame')), hasLength(2));
    expect(tester.widget<Text>(find.byKey(const Key('circuit-title'))).data,
        AppLocalizationsEn().circuitBuilder_level_cb_02_switch_control_title);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a short circuit blows the fuse, names the fault and counts once per blow',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    final h = await pumpRouterApp(tester, location: _play, api: api);
    await settleStart(tester);
    await _place(tester, h, ElementKind.battery, 1, 2);
    await _place(tester, h, ElementKind.wire, 3, 2);
    await _wire(tester, h, 'e1:0', 'e2:0');
    await _wire(tester, h, 'e2:1', 'e1:1');
    expect(_state(h).builder.fuseBlown, isTrue);
    expect(_state(h).builder.faultCount, 1);
    expect(find.byKey(const Key('circuit-fuse')), findsOneWidget);
    expect(find.text('Short circuit'), findsOneWidget);
    expect(find.byKey(const Key('circuit-fault-help')), findsOneWidget);
    expect(find.text('No current is flowing'), findsOneWidget, reason: 'a blown fuse de-energizes');

    // Resetting with the short still wired blows it again: a new fault event.
    await tester.tap(find.byKey(const Key('circuit-reset-fuse')));
    await tester.pump();
    expect(_state(h).builder.fuseBlown, isTrue);
    expect(_state(h).builder.faultCount, 2);

    // Remove the wire and reset: the circuit is safe again.
    await tester.tap(find.byKey(const Key('circuit-viewer')), warnIfMissed: false);
    final v = _viewport(_state(h));
    await tester.tapAt(_screen(tester, cellToPoint(const GridCell(3, 2), v)));
    await tester.pump();
    expect(_state(h).selectedElementId, 'e2');
    await tester.tap(find.byKey(const Key('circuit-remove')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('circuit-reset-fuse')));
    await tester.pump();
    expect(_state(h).builder.fuseBlown, isFalse);
    expect(_state(h).builder.faultCount, 2);
    expect(api.calls.where((c) => c.startsWith('completeGame')), isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('refusals say why and a wire can be removed by tapping it', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: _play);
    await settleStart(tester);
    await _place(tester, h, ElementKind.battery, 1, 2);
    // Same cell again: occupied.
    await _place(tester, h, ElementKind.led, 1, 2);
    expect(find.text('Something is already there'), findsOneWidget);
    // A different part elsewhere clears the message.
    await _place(tester, h, ElementKind.led, 4, 2);
    expect(find.byKey(const Key('circuit-rejection')), findsNothing);
    await _wire(tester, h, 'e1:0', 'e2:0');
    expect(_state(h).builder.layout.connections, hasLength(1));
    // Tap the middle of the wire.
    final s = _state(h);
    final v = _viewport(s);
    final a = terminalAnchor(elementById(s.builder, 'e1')!, 0, v);
    final b = terminalAnchor(elementById(s.builder, 'e2')!, 0, v);
    // Disarm first so the tap is not read as a placement.
    await tester.tap(find.byKey(const Key('circuit-tray-led')));
    await tester.pump();
    await tester.tapAt(_screen(tester, (a + b) / 2));
    await tester.pump();
    expect(_state(h).builder.layout.connections, isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a switch toggles when tapped and a polarized part can be flipped', (tester) async {
    useTallSurface(tester);
    const args = (levelId: 'cb-02-switch-control', quest: null);
    final h = await pumpRouterApp(tester,
        location: '/circuit-builder/play?difficulty=1&level=cb-02-switch-control');
    await settleStart(tester);
    final v = _viewport(_state(h, args));
    expect(_state(h, args).builder.switches['pre-switch'], SwitchState.closed);
    await tester.tapAt(_screen(tester, cellToPoint(const GridCell(3, 2), v)));
    await tester.pump();
    expect(_state(h, args).builder.switches['pre-switch'], SwitchState.open);
    await tester.tapAt(_screen(tester, cellToPoint(const GridCell(3, 2), v)));
    await tester.pump();
    expect(_state(h, args).builder.switches['pre-switch'], SwitchState.closed);

    await _place(tester, h, ElementKind.led, 6, 4, args);
    await _wire(tester, h, 'e1:0', 'pre-switch:0', args);
    await tester.tap(find.byKey(const Key('circuit-tray-led')));
    await tester.pump();
    expect(_state(h, args).armedKind, isNull, reason: 'second tap on the armed kind disarms it');
    await tester.tapAt(_screen(tester, cellToPoint(const GridCell(6, 4), v)));
    await tester.pump();
    expect(find.byKey(const Key('circuit-flip')), findsOneWidget);
    expect(_state(h, args).builder.layout.connections.single.from, 'e1:0');
    await tester.tap(find.byKey(const Key('circuit-flip')));
    await tester.pump();
    expect(_state(h, args).builder.layout.connections.single.from, 'e1:1',
        reason: 'the wire moved to the other end of the LED');
    // The pre-placed switch is locked: it can be toggled, not removed.
    await tester.tapAt(_screen(tester, cellToPoint(const GridCell(3, 2), v)));
    await tester.pump();
    await tester.tap(find.byKey(const Key('circuit-remove')));
    await tester.pump();
    expect(find.text('That component cannot be moved'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('touch and hold a part, then drag it to another cell; wires follow it',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: _play);
    await settleStart(tester);
    await _place(tester, h, ElementKind.battery, 1, 2);
    await _place(tester, h, ElementKind.led, 4, 2);
    await _wire(tester, h, 'e1:0', 'e2:0');
    final v = _viewport(_state(h));
    final gesture =
        await tester.startGesture(_screen(tester, cellToPoint(const GridCell(4, 2), v)));
    await tester.pump(const Duration(milliseconds: 700));
    await gesture.moveTo(_screen(tester, cellToPoint(const GridCell(6, 4), v)));
    await tester.pump();
    await gesture.up();
    await tester.pump();
    final led = elementById(_state(h).builder, 'e2')!;
    expect((led.position.col, led.position.row), (6, 4));
    expect(_state(h).builder.layout.connections, hasLength(1),
        reason: 'moving rearranges the picture, not the circuit');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the server refusing a circuit keeps the round going and sends again after a change',
      (tester) async {
    useTallSurface(tester);
    var calls = 0;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      calls++;
      if (calls == 1) {
        throw GameApiException('The circuit could not be verified.', code: 'VALIDATION_ERROR');
      }
      return serverResult(4100);
    });
    final h = await pumpRouterApp(tester, location: _play, api: api);
    await settleStart(tester);
    await _buildCb01(tester, h);
    await tester.pump(const Duration(milliseconds: 800));
    await tester.pump(const Duration(milliseconds: 100));
    expect(calls, 1);
    expect(find.byKey(const Key('circuit-rejected')), findsOneWidget);
    expect(find.byKey(const Key('result-score')), findsNothing);
    expect(h.container.read(gameSessionProvider(circuitSessionArgs(_cb01))).phase,
        SessionPhase.playing);

    // The same circuit is not sent again on its own.
    await tester.pump(const Duration(seconds: 3));
    expect(calls, 1);

    // Changing it (here the supply voltage) lets it be sent again.
    h.container.read(circuitControllerProvider(_cb01).notifier).setVoltage(7);
    await tester.pump();
    expect(find.byKey(const Key('circuit-rejected')), findsNothing,
        reason: 'the notice was about the old circuit');
    await tester.pump(const Duration(milliseconds: 800));
    await tester.pump(const Duration(milliseconds: 100));
    expect(calls, 2);
    expect(find.text('4100'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('an unreachable server shows a retry that sends the same circuit', (tester) async {
    useTallSurface(tester);
    var calls = 0;
    final seen = <Object?>[];
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      calls++;
      seen.add(extra!['circuitSubmission']);
      if (calls == 1) throw GameApiException('Network error.', code: 'NETWORK_ERROR');
      return serverResult(2500);
    });
    final h = await pumpRouterApp(tester, location: _play, api: api);
    await settleStart(tester);
    await _buildCb01(tester, h);
    await tester.pump(const Duration(milliseconds: 800));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('circuit-submit-failed')), findsOneWidget);
    expect(find.byKey(const Key('circuit-rejected')), findsNothing);
    await tester.tap(find.byKey(const Key('circuit-retry')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(calls, 2);
    expect(seen[1], seen[0], reason: 'the retry sends the circuit that was solved');
    expect(find.text('2500'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('breaking a solved circuit before the settle delay cancels the submission',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    final h = await pumpRouterApp(tester, location: _play, api: api);
    await settleStart(tester);
    await _buildCb01(tester, h);
    await tester.pump(const Duration(milliseconds: 300));
    final v = _viewport(_state(h));
    // Remove the LED.
    await tester.tap(find.byKey(const Key('circuit-tray-led')));
    await tester.pump();
    await tester.tapAt(_screen(tester, cellToPoint(const GridCell(5, 2), v)));
    await tester.pump();
    await tester.tap(find.byKey(const Key('circuit-remove')));
    await tester.pump();
    await tester.pump(const Duration(seconds: 2));
    expect(api.calls.where((c) => c.startsWith('completeGame')), isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
      'numeric disclosure follows the level: no digits at tier 1, values at tier 3',
      (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: _play);
    await settleStart(tester);
    expect(find.text('Supply voltage'), findsOneWidget, reason: 'no digits in the label at tier 1');
    expect(find.byKey(const Key('circuit-readout-supply')), findsNothing);
    await tester.pumpWidget(const SizedBox());

    await pumpRouterApp(tester,
        location: '/circuit-builder/play?difficulty=3&level=cb-06-short-circuit-recovery');
    await settleStart(tester);
    expect(find.text('Supply voltage: 9 V'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the sandbox starts no game, has no goal and cannot be submitted', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    final h = await pumpRouterApp(tester, location: '/circuit-builder/setup', api: api);
    await tester.tap(find.byKey(const Key('circuit-sandbox')), warnIfMissed: false);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byKey(const Key('circuit-sandbox-badge')), findsOneWidget);
    expect(find.byKey(const Key('circuit-goal')), findsNothing);
    expect(api.calls.where((c) => c.startsWith('startGame')), isEmpty);
    // Every kind is on offer with eight of each.
    expect(find.byKey(const Key('circuit-tray-solar')), findsOneWidget);
    expect(find.byKey(const Key('circuit-tray-switch')), findsOneWidget);
    expect(find.text('8 left'), findsNWidgets(8));
    // A circuit that would solve a guided level does nothing here.
    final ctrl = h.container.read(sandboxControllerProvider.notifier);
    ctrl.armKind(ElementKind.battery);
    ctrl.tapCell(const GridCell(1, 1));
    expect(h.container.read(sandboxControllerProvider).builder.layout.elements, hasLength(1));
    await tester.pump(const Duration(seconds: 2));
    expect(api.calls.where((c) => c.startsWith('completeGame')), isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context and an unknown level goes back to setup',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location:
          '/circuit-builder/play?difficulty=1&level=cb-01-closed-circuit&quest=brain-peaks:bp-10:0',
      api: api,
    );
    await settleStart(tester);
    expect(api.calls, contains('startGame:CIRCUIT_BUILDER:1:brain-peaks:bp-10:0'));
    await tester.pumpWidget(const SizedBox());

    final api2 = FakeGameApi();
    // The level's own difficulty must match the one in the URL.
    await pumpRouterApp(tester,
        location: '/circuit-builder/play?difficulty=2&level=cb-01-closed-circuit', api: api2);
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byKey(const Key('circuit-level-cb-01-closed-circuit')), findsOneWidget);
    expect(api2.calls.where((c) => c.startsWith('startGame')), isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a paywall answer shows the neutral not-available page', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(onStartGame: (theme, difficulty, quest) async {
      throw GameApiException('This game requires a paid subscription', code: 'AUTHZ_TIER_REQUIRED');
    });
    await pumpRouterApp(tester, location: _play, api: api);
    await settleStart(tester);
    expect(find.text('Not available in the app yet'), findsWidgets);
    expect(find.byKey(const Key('circuit-canvas')), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });

  for (final size in const [Size(320, 568), Size(375, 667)]) {
    for (final lang in const ['en', 'es', 'pt']) {
      testWidgets('the board fits ${size.width.toInt()}x${size.height.toInt()} in $lang',
          (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        await pumpRouterApp(tester, location: _play, locale: Locale(lang));
        await settleStart(tester);
        expect(find.byKey(const Key('circuit-canvas')), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      });
    }
  }
}
