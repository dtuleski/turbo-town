import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Locales shipped with the app. Mirrors apps/web `src/i18n.ts` resources.
const List<Locale> kSupportedLocales = [
  Locale('en'),
  Locale('es'),
  Locale('pt'),
];

const String kLocalePrefKey = 'dashden_locale';
const Locale kFallbackLocale = Locale('en');

/// Picks the locale like the web detector (`localStorage`, then `navigator`,
/// fallback `en`): the saved choice, else the first device language that is
/// supported, else English. Region codes are ignored (`pt_BR` -> `pt`).
Locale resolveLocale({String? saved, List<Locale> device = const []}) {
  Locale? match(String? code) {
    if (code == null) return null;
    final lang = code.split(RegExp('[-_]')).first.toLowerCase();
    for (final l in kSupportedLocales) {
      if (l.languageCode == lang) return l;
    }
    return null;
  }

  final fromSaved = match(saved);
  if (fromSaved != null) return fromSaved;
  for (final d in device) {
    final m = match(d.languageCode);
    if (m != null) return m;
  }
  return kFallbackLocale;
}

/// Current app locale, persisted with shared_preferences.
class LocaleController extends StateNotifier<Locale> {
  LocaleController({SharedPreferences? prefs, List<Locale>? deviceLocales})
      : super(kFallbackLocale) {
    _init(prefs, deviceLocales);
  }

  SharedPreferences? _prefs;

  Future<void> _init(SharedPreferences? prefs, List<Locale>? device) async {
    _prefs = prefs ?? await SharedPreferences.getInstance();
    if (!mounted) return;
    state = resolveLocale(
      saved: _prefs!.getString(kLocalePrefKey),
      device: device ?? PlatformDispatcher.instance.locales,
    );
  }

  Future<void> setLocale(Locale locale) async {
    state = resolveLocale(saved: locale.languageCode);
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs!.setString(kLocalePrefKey, state.languageCode);
  }
}

final localeControllerProvider =
    StateNotifierProvider<LocaleController, Locale>((ref) {
  return LocaleController();
});
