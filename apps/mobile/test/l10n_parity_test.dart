import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _load(String locale) =>
    jsonDecode(File('lib/l10n/app_$locale.arb').readAsStringSync())
        as Map<String, dynamic>;

Set<String> _keys(Map<String, dynamic> arb) =>
    arb.keys.where((k) => !k.startsWith('@')).toSet();

Set<String> _placeholders(String message) => RegExp(r'\{([A-Za-z_]\w*)\}')
    .allMatches(message.replaceAll("''", ''))
    .map((m) => m.group(1)!)
    .toSet();

void main() {
  final en = _load('en');
  for (final locale in ['es', 'pt']) {
    test('$locale has exactly the same keys as en', () {
      final other = _load(locale);
      expect(_keys(other).difference(_keys(en)), isEmpty,
          reason: 'extra keys in $locale');
      expect(_keys(en).difference(_keys(other)), isEmpty,
          reason: 'keys missing in $locale');
    });

    test('$locale messages use the same placeholders as en', () {
      final other = _load(locale);
      for (final key in _keys(en)) {
        expect(
          _placeholders(other[key] as String),
          _placeholders(en[key] as String),
          reason: 'placeholders differ for $key in $locale',
        );
      }
    });
  }
}
