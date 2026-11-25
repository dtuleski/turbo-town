import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:dashden_mobile/auth/display_name.dart';

String _jwt(Map<String, dynamic> claims) {
  String enc(Object o) => base64Url.encode(utf8.encode(json.encode(o))).replaceAll('=', '');
  return '${enc({'alg': 'none'})}.${enc(claims)}.sig';
}

void main() {
  group('displayNameFromClaims', () {
    test('Google user: uses name, never the Google_ username', () {
      expect(
        displayNameFromClaims({
          'cognito:username': 'Google_106845269312397681840',
          'preferred_username': 'Google_106845269312397681840',
          'name': 'Diego Tuleski',
          'email': 'diego@example.com',
        }),
        'Diego Tuleski',
      );
    });

    test('Google user without name falls back to given_name then email prefix', () {
      expect(
        displayNameFromClaims({
          'cognito:username': 'Google_1',
          'given_name': 'Diego',
        }),
        'Diego',
      );
      expect(
        displayNameFromClaims({
          'cognito:username': 'Google_1',
          'email': 'diego@example.com',
        }),
        'diego',
      );
    });

    test('email/password user keeps their chosen username', () {
      expect(
        displayNameFromClaims({
          'preferred_username': 'benji',
          'given_name': 'Benjamin',
          'name': 'Other',
        }),
        'benji',
      );
    });

    test('returns null when nothing usable', () {
      expect(displayNameFromClaims({'cognito:username': 'Google_1'}), isNull);
    });
  });

  group('displayNameFromIdToken', () {
    test('decodes the token payload', () {
      expect(
        displayNameFromIdToken(_jwt({'name': 'Ana', 'cognito:username': 'Google_9'})),
        'Ana',
      );
    });

    test('null and malformed tokens give null', () {
      expect(displayNameFromIdToken(null), isNull);
      expect(displayNameFromIdToken('not-a-jwt'), isNull);
      expect(displayNameFromIdToken('a.!!!.c'), isNull);
    });
  });
}
