import 'dart:io';

import 'package:dashden_mobile/config/paid_games.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('kPaidGameThemeIds matches packages/shared paid-games.ts', () {
    final file = File('../../packages/shared/src/constants/paid-games.ts');
    final source = file.readAsStringSync();
    final block = RegExp(r'Object\.freeze\(\[(.*?)\]\)', dotAll: true)
        .firstMatch(source);
    expect(block, isNotNull, reason: 'could not find the frozen id list');
    final ids = RegExp(r"'([A-Z_]+)'")
        .allMatches(block!.group(1)!)
        .map((m) => m.group(1)!)
        .toList();
    expect(ids, isNotEmpty);
    expect(kPaidGameThemeIds, ids);
  });
}
