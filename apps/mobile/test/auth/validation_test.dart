import 'package:dashden_mobile/auth/validation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('email', () {
    expect(validateEmail('a@b.co'), isNull);
    expect(validateEmail('  a@b.co '), isNull);
    expect(validateEmail('a@b'), ValidationError.invalidEmail);
    expect(validateEmail('a b@c.com'), ValidationError.invalidEmail);
    expect(validateEmail(''), ValidationError.invalidEmail);
    expect(validateEmail(null), ValidationError.invalidEmail);
  });

  test('username: 3-20 chars, letters digits underscore', () {
    expect(validateUsername('ab'), ValidationError.usernameMin);
    expect(validateUsername('a' * 21), ValidationError.usernameMax);
    expect(validateUsername('bad name'), ValidationError.usernameChars);
    expect(validateUsername('bad-name'), ValidationError.usernameChars);
    expect(validateUsername('good_Name9'), isNull);
    expect(validateUsername('a' * 20), isNull);
    expect(validateUsername('abc'), isNull);
  });

  test('new password rules are checked in the web order', () {
    expect(validateNewPassword('Ab1'), ValidationError.passwordMin);
    expect(validateNewPassword('abcdefg1'), ValidationError.passwordUpper);
    expect(validateNewPassword('ABCDEFG1'), ValidationError.passwordLower);
    expect(validateNewPassword('Abcdefgh'), ValidationError.passwordNumber);
    expect(validateNewPassword('Abcdefg1'), isNull);
  });

  test('login password only needs 8 characters', () {
    expect(validateLoginPassword('short'), ValidationError.passwordMin);
    expect(validateLoginPassword('alllowercase'), isNull);
  });

  test('confirm password must match', () {
    expect(validateConfirmPassword('Abcdefg1', 'Abcdefg2'),
        ValidationError.passwordsMismatch);
    expect(validateConfirmPassword('Abcdefg1', 'Abcdefg1'), isNull);
  });

  test('reset code needs 6 characters; required rejects blanks', () {
    expect(validateResetCode('12345'), ValidationError.codeMin);
    expect(validateResetCode('123456'), isNull);
    expect(validateRequired('  '), ValidationError.required);
    expect(validateRequired('Ana'), isNull);
    expect(validateConfirmationCode(''), ValidationError.required);
  });
}
