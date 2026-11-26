import 'dart:async';

import 'package:dashden_mobile/api/profile_api.dart';
import 'package:dashden_mobile/push/push_channel.dart';
import 'package:dashden_mobile/push/push_controller.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A 64-character hex APNs token.
const String kTestPushToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/// [PushChannel] stand-in answering like the iOS side, with a call log.
class FakePushChannel extends PushChannel {
  FakePushChannel({this.grant = true, this.token = kTestPushToken, this.zone = 'America/Chicago'})
      : super(channel: const MethodChannel('test/fake-push'));

  bool grant;
  String? token;
  String? zone;
  Map<String, dynamic>? launchTap;
  final List<String> calls = [];
  final StreamController<Map<String, dynamic>> tapEvents = StreamController.broadcast();

  @override
  Stream<Map<String, dynamic>> get taps => tapEvents.stream;

  @override
  Future<bool> requestPermission() async {
    calls.add('requestPermission');
    return grant;
  }

  @override
  Future<String?> deviceToken() async {
    calls.add('getToken');
    return grant ? token : null;
  }

  @override
  Future<String?> timeZone() async {
    calls.add('getTimeZone');
    return zone;
  }

  @override
  Future<Map<String, dynamic>?> takeLaunchTap() async {
    calls.add('takeLaunchTap');
    final tap = launchTap;
    launchTap = null;
    return tap;
  }
}

/// A supported (iOS) controller over fakes; [navigations] logs tap routes.
PushController fakePushController({
  required PushChannel channel,
  required ProfileApi api,
  List<String>? navigations,
  String language = 'en',
  bool supported = true,
  bool release = false,
}) =>
    PushController(
      channel: channel,
      api: () => api,
      navigate: (location) => navigations?.add(location),
      language: () => language,
      supported: supported,
      release: release,
      prefs: SharedPreferences.getInstance,
      timeout: const Duration(seconds: 2),
    );
