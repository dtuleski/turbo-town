import 'dart:async';

import 'package:flutter/services.dart';

/// Name of the iOS method channel (ios/Runner/AppDelegate.swift `PushBridge`).
const String kPushChannelName = 'app.dashden/push';

/// Dart side of the push bridge (M5). Every call fails soft: without the
/// native side (Android, tests) or on a native error it returns false or null
/// and never throws.
class PushChannel {
  PushChannel({MethodChannel? channel}) : _channel = channel ?? const MethodChannel(kPushChannelName) {
    _channel.setMethodCallHandler(_onCall);
  }

  final MethodChannel _channel;
  final StreamController<Map<String, dynamic>> _taps = StreamController.broadcast();

  /// Notification taps while the app runs (payload with a `route`).
  Stream<Map<String, dynamic>> get taps => _taps.stream;

  /// Shows the iOS permission prompt (only once per install; later calls
  /// answer at once). True when notifications are allowed.
  Future<bool> requestPermission() async => await _invoke('requestPermission') == true;

  /// The APNs token as hex, or null without permission or on any failure.
  Future<String?> deviceToken() async {
    final token = await _invoke('getToken');
    return token is String && token.isNotEmpty ? token : null;
  }

  /// The device's IANA time zone (`America/New_York`), or null.
  Future<String?> timeZone() async {
    final zone = await _invoke('getTimeZone');
    return zone is String && zone.isNotEmpty ? zone : null;
  }

  /// The tap that launched the app, once; also tells the native side that
  /// later taps can be sent as events.
  Future<Map<String, dynamic>?> takeLaunchTap() async => _payload(await _invoke('takeLaunchTap'));

  Future<Object?> _invoke(String method) async {
    try {
      return await _channel.invokeMethod<Object?>(method);
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }

  Future<Object?> _onCall(MethodCall call) async {
    if (call.method == 'onTap') {
      final payload = _payload(call.arguments);
      if (payload != null) _taps.add(payload);
    }
    return null;
  }

  static Map<String, dynamic>? _payload(Object? raw) {
    if (raw is! Map) return null;
    return {
      for (final e in raw.entries)
        if (e.key is String) e.key as String: e.value,
    };
  }
}
