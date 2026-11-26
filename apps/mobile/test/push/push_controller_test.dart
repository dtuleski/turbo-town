import 'package:dashden_mobile/api/feature_providers.dart';
import 'package:dashden_mobile/auth/auth_controller.dart';
import 'package:dashden_mobile/auth/cognito_service.dart';
import 'package:dashden_mobile/auth/token_storage.dart';
import 'package:dashden_mobile/push/push_controller.dart';
import 'package:dashden_mobile/ui/screens/challenge_results_screen.dart';
import 'package:dashden_mobile/ui/screens/hub_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fake_push.dart';
import '../helpers/fake_stats_apis.dart';
import '../helpers/pump_app.dart';
import '../helpers/pump_router.dart';

/// A screen with a button that runs the soft-ask.
class _AskHost extends StatelessWidget {
  const _AskHost({required this.push, this.digestOn});

  final PushController push;
  final bool? digestOn;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            key: const Key('ask'),
            onPressed: () => push.maybeSoftAsk(context, digestOn: digestOn),
            child: const Text('ask'),
          ),
        ),
      );
}

Future<void> _ask(WidgetTester tester, PushController push, {bool? digestOn}) async {
  await pumpApp(tester, _AskHost(push: push, digestOn: digestOn));
  await tester.tap(find.byKey(const Key('ask')));
  await tester.pumpAndSettle();
}

Future<bool?> _shownFlag() async => (await SharedPreferences.getInstance()).getBool(kSoftAskShownKey);

class _FakeCognito implements CognitoService {
  _FakeCognito(this.log);

  final List<String> log;

  @override
  Future<String?> getValidIdToken() async => null;

  @override
  TokenStorage get storage => throw UnimplementedError();

  @override
  Future<void> signOut() async => log.add('cognito.signOut');

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('pushTapRoute', () {
    test('accepts the hub and a results day only', () {
      expect(pushTapRoute('/'), '/');
      expect(pushTapRoute('/challenge/results?day=2026-11-25'), '/challenge/results?day=2026-11-25');
      expect(pushTapRoute('/challenge/results?day=2026-02-30'), isNull);
      expect(pushTapRoute('/challenge/results?day=2026-11-25&x=1'), isNull);
      expect(pushTapRoute('/profile'), isNull);
      expect(pushTapRoute('https://example.com/'), isNull);
      expect(pushTapRoute(null), isNull);
      expect(pushTapRoute(3), isNull);
    });
  });

  group('soft-ask', () {
    testWidgets('nothing is shown when the toggle is off', (tester) async {
      final channel = FakePushChannel();
      final api = FakeProfileApi(digest: false);
      await _ask(tester, fakePushController(channel: channel, api: api));
      expect(find.byKey(const Key('push-soft-ask')), findsNothing);
      expect(await _shownFlag(), isNull);
      expect(channel.calls, isEmpty);
    });

    testWidgets('Not now records the flag and never opens the iOS prompt', (tester) async {
      final channel = FakePushChannel();
      final api = FakeProfileApi(digest: true);
      await _ask(tester, fakePushController(channel: channel, api: api));
      expect(find.byKey(const Key('push-soft-ask')), findsOneWidget);
      expect(find.textContaining('morning summary'), findsOneWidget);
      expect(find.textContaining('at noon'), findsOneWidget);
      expect(channel.calls, isEmpty, reason: 'no iOS prompt before an answer');
      await tester.tap(find.byKey(const Key('push-soft-ask-not-now')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('push-soft-ask')), findsNothing);
      expect(await _shownFlag(), isTrue);
      expect(channel.calls, isNot(contains('requestPermission')));
      expect(api.registrations, isEmpty);
      expect(api.saves, isEmpty, reason: 'the toggle is never changed');
    });

    testWidgets('Allow opens the iOS prompt and registers the device (sandbox build)', (tester) async {
      final channel = FakePushChannel();
      final api = FakeProfileApi(digest: true);
      await _ask(tester, fakePushController(channel: channel, api: api, language: 'pt'));
      await tester.tap(find.byKey(const Key('push-soft-ask-allow')));
      await tester.pumpAndSettle();
      expect(channel.calls.first, 'requestPermission');
      expect(api.registrations, hasLength(1));
      final r = api.registrations.single;
      expect(r.token, kTestPushToken);
      expect(r.environment, 'sandbox');
      expect(r.timeZone, 'America/Chicago');
      expect(r.language, 'pt');
      expect(await _shownFlag(), isTrue);
    });

    testWidgets('a release build registers for production', (tester) async {
      final channel = FakePushChannel();
      final api = FakeProfileApi(digest: true);
      await _ask(tester, fakePushController(channel: channel, api: api, release: true));
      await tester.tap(find.byKey(const Key('push-soft-ask-allow')));
      await tester.pumpAndSettle();
      expect(api.registrations.single.environment, 'production');
    });

    testWidgets('a denied iOS prompt registers nothing', (tester) async {
      final channel = FakePushChannel(grant: false);
      final api = FakeProfileApi(digest: true);
      await _ask(tester, fakePushController(channel: channel, api: api));
      await tester.tap(find.byKey(const Key('push-soft-ask-allow')));
      await tester.pumpAndSettle();
      expect(channel.calls, ['requestPermission']);
      expect(api.registrations, isEmpty);
    });

    testWidgets('it is shown once per device', (tester) async {
      final channel = FakePushChannel();
      final api = FakeProfileApi(digest: true);
      final push = fakePushController(channel: channel, api: api);
      await _ask(tester, push);
      await tester.tap(find.byKey(const Key('push-soft-ask-not-now')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('ask')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('push-soft-ask')), findsNothing);
    });

    testWidgets('the Profile path passes the toggle and skips the server read', (tester) async {
      final channel = FakePushChannel();
      final api = FakeProfileApi(digest: false, failLoad: true);
      await _ask(tester, fakePushController(channel: channel, api: api), digestOn: true);
      expect(find.byKey(const Key('push-soft-ask')), findsOneWidget);
    });

    testWidgets('a failed toggle read shows nothing', (tester) async {
      final channel = FakePushChannel();
      final api = FakeProfileApi(digest: true, failLoad: true);
      await _ask(tester, fakePushController(channel: channel, api: api));
      expect(find.byKey(const Key('push-soft-ask')), findsNothing);
      expect(await _shownFlag(), isNull);
    });

    testWidgets('nothing happens where push is not supported (Android)', (tester) async {
      final channel = FakePushChannel();
      final api = FakeProfileApi(digest: true);
      await _ask(tester, fakePushController(channel: channel, api: api, supported: false));
      expect(find.byKey(const Key('push-soft-ask')), findsNothing);
      expect(channel.calls, isEmpty);
    });
  });

  group('registration and settings', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('registerIfAllowed never prompts and needs a token', () async {
      final channel = FakePushChannel(grant: false);
      final api = FakeProfileApi();
      final push = fakePushController(channel: channel, api: api);
      expect(await push.registerIfAllowed(), isFalse);
      expect(channel.calls, ['getToken']);
      expect(api.registrations, isEmpty);
    });

    test('onSignedIn saves zone and language once and registers once per change', () async {
      final channel = FakePushChannel();
      final api = FakeProfileApi();
      final push = fakePushController(channel: channel, api: api, language: 'es');
      await push.onSignedIn();
      await push.onSignedIn();
      expect(api.settingsSaves, [(timeZone: 'America/Chicago', language: 'es')]);
      expect(api.registrations, hasLength(1));
      channel.zone = 'Europe/Lisbon';
      await push.onSignedIn();
      expect(api.settingsSaves.last, (timeZone: 'Europe/Lisbon', language: 'es'));
      expect(api.registrations.last.timeZone, 'Europe/Lisbon');
    });

    test('without push support only the language is saved', () async {
      final channel = FakePushChannel();
      final api = FakeProfileApi();
      final push = fakePushController(channel: channel, api: api, supported: false, language: 'pt');
      await push.onSignedIn();
      expect(api.settingsSaves, [(timeZone: null, language: 'pt')]);
      expect(api.registrations, isEmpty);
      expect(channel.calls, isEmpty);
    });

    test('a failed save is tried again on the next call and never throws', () async {
      final channel = FakePushChannel();
      final api = FakeProfileApi()..failPush = true;
      final push = fakePushController(channel: channel, api: api);
      await push.onSignedIn();
      api.failPush = false;
      await push.onSignedIn();
      expect(api.settingsSaves, hasLength(1));
      expect(api.registrations, hasLength(1));
    });

    test('unregister removes the registered token; a failure does not throw', () async {
      final channel = FakePushChannel();
      final api = FakeProfileApi();
      final push = fakePushController(channel: channel, api: api);
      await push.registerIfAllowed();
      await push.unregister();
      expect(api.unregistrations, [kTestPushToken]);
      api.failPush = true;
      await expectLater(push.unregister(), completes);
    });
  });

  group('sign-out', () {
    test('signOut unregisters the device before clearing the session', () async {
      final log = <String>[];
      final channel = FakePushChannel();
      final api = FakeProfileApi();
      final container = ProviderContainer(overrides: [
        cognitoServiceProvider.overrideWithValue(_FakeCognito(log)),
        pushChannelProvider.overrideWithValue(channel),
        profileApiProvider.overrideWithValue(api),
        pushControllerProvider.overrideWith(
          (ref) => fakePushController(channel: channel, api: _LoggingProfileApi(api, log)),
        ),
      ]);
      addTearDown(container.dispose);
      await container.read(authControllerProvider.notifier).signOut();
      expect(log, ['unregister', 'cognito.signOut']);
      expect(api.unregistrations, [kTestPushToken]);
      expect(container.read(authControllerProvider).status, AuthStatus.unauthenticated);
    });

    test('a failing unregister does not block sign-out', () async {
      final log = <String>[];
      final controller = AuthController(
        _FakeCognito(log),
        beforeSignOut: () async => throw StateError('network'),
      );
      await controller.signOut();
      expect(log, ['cognito.signOut']);
      expect(controller.state.status, AuthStatus.unauthenticated);
    });
  });

  group('tap routing', () {
    testWidgets("route '/' opens the hub and a results route the results screen", (tester) async {
      useTallSurface(tester);
      final h = await pumpRouterApp(
        tester,
        location: '/profile',
        overrides: featureOverrides(),
      );
      final push = h.container.read(pushControllerProvider);
      // The tap navigates after a frame; the router then parses the route.
      Future<void> settle() async {
        await tester.pump();
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
      }

      push.handleTap({'route': '/challenge/results?day=2026-11-25'});
      await settle();
      expect(find.byType(ChallengeResultsScreen), findsOneWidget);
      expect(h.router.routeInformationProvider.value.uri.toString(), '/challenge/results?day=2026-11-25');

      push.handleTap({'route': '/'});
      await settle();
      expect(find.byType(HubScreen), findsOneWidget);
      expect(find.byType(ChallengeResultsScreen), findsNothing);

      push.handleTap({'route': '/somewhere-else'});
      await settle();
      expect(find.byType(HubScreen), findsOneWidget);
    });
  });
}

/// Logs `unregister` when the device is removed.
class _LoggingProfileApi extends FakeProfileApi {
  _LoggingProfileApi(this.inner, this.log);

  final FakeProfileApi inner;
  final List<String> log;

  @override
  Future<bool> unregisterPushDevice(String token) {
    log.add('unregister');
    return inner.unregisterPushDevice(token);
  }
}
