import 'package:dashden_mobile/auth/auth_controller.dart';
import 'package:dashden_mobile/auth/cognito_service.dart';
import 'package:dashden_mobile/auth/token_storage.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeCognito implements CognitoService {
  _FakeCognito(this.signUpError);
  final AuthException? signUpError;

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

Future<SignUpOutcome> _signUp(AuthException? error) async {
  final controller = AuthController(_FakeCognito(error));
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

  test('an unrelated sign-up error still fails', () async {
    expect(
      await _signUp(AuthException('Password too weak',
          code: 'InvalidPasswordException')),
      SignUpOutcome.failed,
    );
  });
}
