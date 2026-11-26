import 'package:dashden_mobile/push/push_channel.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel(kPushChannelName);
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  test('every call returns safely without the native side', () async {
    final push = PushChannel();
    expect(await push.requestPermission(), isFalse);
    expect(await push.deviceToken(), isNull);
    expect(await push.timeZone(), isNull);
    expect(await push.takeLaunchTap(), isNull);
  });

  test('a native error is a soft failure', () async {
    messenger.setMockMethodCallHandler(channel, (call) async {
      throw PlatformException(code: 'boom');
    });
    final push = PushChannel();
    expect(await push.requestPermission(), isFalse);
    expect(await push.deviceToken(), isNull);
    expect(await push.timeZone(), isNull);
    expect(await push.takeLaunchTap(), isNull);
  });

  test('answers from the native side are passed through', () async {
    final calls = <String>[];
    messenger.setMockMethodCallHandler(channel, (call) async {
      calls.add(call.method);
      return switch (call.method) {
        'requestPermission' => true,
        'getToken' => 'abcd' * 16,
        'getTimeZone' => 'America/New_York',
        'takeLaunchTap' => {'route': '/'},
        _ => null,
      };
    });
    final push = PushChannel();
    expect(await push.requestPermission(), isTrue);
    expect(await push.deviceToken(), 'abcd' * 16);
    expect(await push.timeZone(), 'America/New_York');
    expect(await push.takeLaunchTap(), {'route': '/'});
    expect(calls, ['requestPermission', 'getToken', 'getTimeZone', 'takeLaunchTap']);
  });

  test('wrong answer types read as nothing', () async {
    messenger.setMockMethodCallHandler(channel, (call) async => 42);
    final push = PushChannel();
    expect(await push.requestPermission(), isFalse);
    expect(await push.deviceToken(), isNull);
    expect(await push.timeZone(), isNull);
    expect(await push.takeLaunchTap(), isNull);
  });

  test('onTap events from the native side reach the taps stream', () async {
    final push = PushChannel();
    final received = <Map<String, dynamic>>[];
    final sub = push.taps.listen(received.add);
    await messenger.handlePlatformMessage(
      kPushChannelName,
      const StandardMethodCodec().encodeMethodCall(
        const MethodCall('onTap', {'route': '/challenge/results?day=2026-11-25'}),
      ),
      (_) {},
    );
    await Future<void>.delayed(Duration.zero);
    expect(received, [
      {'route': '/challenge/results?day=2026-11-25'},
    ]);
    await sub.cancel();
  });
}
