import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/challenge_models.dart';
import '../api/feature_providers.dart';
import '../api/profile_api.dart';
import '../auth/auth_controller.dart';
import '../l10n/gen/app_localizations.dart';
import '../l10n/locale_controller.dart';
import '../ui/router.dart';
import 'push_channel.dart';

/// shared_preferences flag: the permission explanation was shown on this
/// device (plan Q10). Set when it is shown, whatever the answer.
const String kSoftAskShownKey = 'push.softAskShown';

/// The tap routes the app follows (FR-DC-23): the hub for the challenge push,
/// a day's results for the digest push. Null for anything else.
String? pushTapRoute(Object? route) {
  if (route == '/') return '/';
  if (route is! String) return null;
  final match = RegExp(r'^/challenge/results\?day=(\d{4}-\d{2}-\d{2})$').firstMatch(route);
  if (match == null || !isChallengeDay(match.group(1))) return null;
  return route;
}

/// Push controller (M6): the soft-ask, device registration, sign-out
/// unregister, notification settings sync and tap routing. Nothing here
/// throws; every failure leaves the app as it was.
class PushController {
  PushController({
    required PushChannel channel,
    required ProfileApi Function() api,
    required void Function(String location) navigate,
    required String Function() language,
    bool? supported,
    bool release = kReleaseMode,
    Future<SharedPreferences> Function()? prefs,
    this.timeout = const Duration(seconds: 15),
  })  : _channel = channel,
        _api = api,
        _navigate = navigate,
        _language = language,
        _supported = supported ?? (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS),
        _release = release,
        _prefs = prefs ?? SharedPreferences.getInstance;

  final PushChannel _channel;
  final ProfileApi Function() _api;
  final void Function(String location) _navigate;
  final String Function() _language;
  final bool _supported;
  final bool _release;
  final Future<SharedPreferences> Function() _prefs;

  /// Limit for each channel or network call.
  final Duration timeout;

  bool _asking = false;
  String? _token;
  String? _savedSettings;
  String? _registered;

  /// Push is built for iOS only (FR-DC-3).
  bool get supported => _supported;

  /// APNs environment of this build: release builds are signed for production.
  String get environment => _release ? 'production' : 'sandbox';

  /// Shows the explanation when it was never shown on this device and the
  /// daily toggle is on ([digestOn], else read from the server). "Allow"
  /// opens the iOS prompt and registers the device; "Not now" only records
  /// that it was shown. The toggle is never changed here.
  Future<void> maybeSoftAsk(BuildContext context, {bool? digestOn}) async {
    if (!_supported || _asking) return;
    _asking = true;
    try {
      final prefs = await _prefs();
      if (prefs.getBool(kSoftAskShownKey) == true) return;
      final on = digestOn ?? await _digestOn();
      if (!on || !context.mounted) return;
      await prefs.setBool(kSoftAskShownKey, true);
      if (!context.mounted) return;
      final allow = await showDialog<bool>(
        context: context,
        builder: (_) => const PushSoftAskDialog(),
      );
      if (allow != true) return;
      if (await _channel.requestPermission().timeout(const Duration(minutes: 5))) {
        await registerIfAllowed();
      }
    } catch (_) {
      // Fail soft: the explanation can show again only if the flag was not saved.
    } finally {
      _asking = false;
    }
  }

  Future<bool> _digestOn() async {
    try {
      return (await _api().getEmailPrefs().timeout(timeout)).dailyDigest;
    } catch (_) {
      return false;
    }
  }

  /// Registers this device when iOS already allows notifications. Never
  /// shows a prompt. True when the server stored the device.
  Future<bool> registerIfAllowed() async {
    if (!_supported) return false;
    try {
      final token = await _channel.deviceToken().timeout(timeout);
      if (token == null) return false;
      final zone = await _channel.timeZone().timeout(timeout);
      final language = challengeLanguage(_language());
      final key = '$token|$environment|$zone|$language';
      if (_registered == key) return true;
      final ok = await _api()
          .registerPushDevice(token: token, environment: environment, timeZone: zone, language: language)
          .timeout(timeout);
      _token = token;
      if (ok) _registered = key;
      return ok;
    } catch (_) {
      return false;
    }
  }

  /// Removes this device from the signed-in user before sign-out. Never
  /// throws, so a failure here cannot block sign-out.
  Future<void> unregister() async {
    final token = _token;
    _token = null;
    _registered = null;
    _savedSettings = null;
    if (!_supported) return;
    try {
      final current = token ?? await _channel.deviceToken().timeout(const Duration(seconds: 3));
      if (current == null) return;
      await _api().unregisterPushDevice(current).timeout(timeout);
    } catch (_) {
      // The server also removes devices Apple reports as invalid.
    }
  }

  /// Saves the time zone (iOS only) and the app language, once per change
  /// (web `useNotificationSettingsSync`).
  Future<void> syncSettings() async {
    try {
      final zone = _supported ? await _channel.timeZone().timeout(timeout) : null;
      final language = challengeLanguage(_language());
      final key = '$zone|$language';
      if (_savedSettings == key) return;
      await _api().saveNotificationSettings(timeZone: zone, language: language).timeout(timeout);
      _savedSettings = key;
    } catch (_) {
      // Tried again on the next resume.
    }
  }

  /// After sign-in, at launch with a saved session and on every resume.
  Future<void> onSignedIn() async {
    await syncSettings();
    await registerIfAllowed();
  }

  /// Opens the screen named by a notification tap; unknown routes are ignored.
  void handleTap(Map<String, dynamic> payload) {
    final route = pushTapRoute(payload['route']);
    if (route != null) _navigate(route);
  }
}

/// The permission explanation (FR-DC-4): names the morning summary and the
/// noon challenge. Pops true for "Allow", false for "Not now".
class PushSoftAskDialog extends StatelessWidget {
  const PushSoftAskDialog({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AlertDialog(
      key: const Key('push-soft-ask'),
      title: Text(l10n.push_softAsk_title),
      content: Text(l10n.push_softAsk_body),
      actions: [
        TextButton(
          key: const Key('push-soft-ask-not-now'),
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(l10n.push_softAsk_notNow),
        ),
        FilledButton(
          key: const Key('push-soft-ask-allow'),
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(l10n.push_softAsk_allow),
        ),
      ],
    );
  }
}

final pushChannelProvider = Provider<PushChannel>((ref) => PushChannel());

/// One controller for the app run. Dependencies are read when used, so the
/// router (which watches the auth state) is not a dependency of the auth
/// controller that calls [PushController.unregister].
final Provider<PushController> pushControllerProvider = Provider<PushController>((ref) {
  return PushController(
    channel: ref.read(pushChannelProvider),
    api: () => ref.read(profileApiProvider),
    language: () => ref.read(localeControllerProvider).languageCode,
    navigate: (location) {
      // After the frame, so a router rebuilt for a new auth state is in place.
      SchedulerBinding.instance.addPostFrameCallback((_) => ref.read(routerProvider).go(location));
      SchedulerBinding.instance.scheduleFrame();
    },
  );
});

/// While signed in: saves the settings and registers the device now and on
/// every resume, and routes notification taps (also the one that launched
/// the app). Watched by the app root.
final pushSessionProvider = Provider<void>((ref) {
  final status = ref.watch(authControllerProvider.select((s) => s.status));
  if (status != AuthStatus.authenticated) return;
  final push = ref.read(pushControllerProvider);
  final channel = ref.read(pushChannelProvider);
  unawaited(push.onSignedIn());
  final resume = AppLifecycleListener(onResume: () => unawaited(push.onSignedIn()));
  final taps = channel.taps.listen(push.handleTap);
  if (push.supported) {
    unawaited(channel.takeLaunchTap().then((tap) {
      if (tap != null) push.handleTap(tap);
    }));
  }
  ref.onDispose(() {
    resume.dispose();
    unawaited(taps.cancel());
  });
});
