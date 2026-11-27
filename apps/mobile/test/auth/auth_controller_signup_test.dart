import 'package:dashden_mobile/auth/auth_controller.dart';
import 'package:dashden_mobile/auth/cognito_service.dart';
import 'package:dashden_mobile/auth/token_storage.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeCognito implements CognitoService {
  _FakeCognito(this.signUpError, {this.resendError});
  final AuthException? signUpError;
  final AuthException? resendError;
  int resends = 0;

  @override
  Future<void> resendSignUpCode(String email) async {
    resends++;
    if (resendError != null) throw resendError!;
  }

  @override
  Future<String?> getValidIdToken() async => null;

  @override
  TokenStorage get storage => throw UnimplementedError();

  @override
  Future<bool> signUp({
    required String email,
    required String password,
    required String username,
    required String givenName,
    required String familyName,
  }) async {
    if (signUpError != null) throw signUpError!;
    return true;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<SignUpOutcome> _signUp(AuthException? error, {AuthException? resendError}) async {
  final controller = AuthController(_FakeCognito(error, resendError: resendError));
  await Future<void>.delayed(Duration.zero);
  return controller.signUp(
    email: 'a@b.co',
    password: 'Passw0rd!',
    username: 'ana_s',
    givenName: 'Ana',
    familyName: 'Silva',
  );
}

void main() {
  test('a fresh sign-up needs confirmation', () async {
    expect(await _signUp(null), SignUpOutcome.needsConfirmation);
  });

  final retryVariants = <String, AuthException>{
    'UsernameExistsException':
        AuthException('exists', code: 'UsernameExistsException'),
    'UserNotConfirmedException':
        AuthException('x', code: 'UserNotConfirmedException'),
    'message "User is not confirmed."': AuthException('User is not confirmed.'),
    'message "An account with the given email already exists."':
        AuthException('An account with the given email already exists.'),
  };
  for (final entry in retryVariants.entries) {
    test('a retried sign-up routes to confirmation on ${entry.key}', () async {
      expect(await _signUp(entry.value), SignUpOutcome.needsConfirmation);
    });
  }

  test('an already confirmed email fails with "account exists" instead of waiting for a code', () async {
    final cognito = _FakeCognito(
      AuthException('exists', code: 'UsernameExistsException'),
      resendError: AuthException('User is already confirmed.', code: 'InvalidParameterException'),
    );
    final controller = AuthController(cognito);
    await Future<void>.delayed(Duration.zero);
    final outcome = await controller.signUp(
      email: 'a@b.co', password: 'Passw0rd!', username: 'ana_s', givenName: 'Ana', familyName: 'Silva');
    expect(outcome, SignUpOutcome.failed);
    expect(controller.state.errorCode, 'UsernameExistsException');
    expect(cognito.resends, 1);
  });

  test('an unconfirmed retry still routes to confirmation when the resend fails for another reason', () async {
    expect(
      await _signUp(AuthException('exists', code: 'UsernameExistsException'),
          resendError: AuthException('Too many requests', code: 'LimitExceededException')),
      SignUpOutcome.needsConfirmation,
    );
  });

  test('an unrelated sign-up error still fails', () async {
    expect(
      await _signUp(AuthException('Password too weak',
          code: 'InvalidPasswordException')),
      SignUpOutcome.failed,
    );
  });
}
