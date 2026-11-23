import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import 'package:dashden_mobile/auth/cognito_service.dart';
import 'package:dashden_mobile/auth/token_storage.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

/// Records Cognito API calls and replays canned errors, so no network is used.
class FakeCognitoClient extends Client {
  FakeCognitoClient() : super(region: 'us-east-1');

  final List<({String operation, Map<String, dynamic> params})> calls = [];
  final Map<String, CognitoClientException> errors = {};

  @override
  Future<dynamic> request(String operation, Map<String, dynamic> params,
      {String? endpoint, String? service}) async {
    calls.add((operation: operation, params: params));
    final error = errors[operation];
    if (error != null) throw error;
    return <String, dynamic>{};
  }
}

void main() {
  late FakeCognitoClient client;
  late CognitoService service;
  late TokenStorage storage;

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    storage = TokenStorage();
    client = FakeCognitoClient();
    service = CognitoService(
      storage: storage,
      pool: CognitoUserPool('us-east-1_TEST', 'client123', customClient: client),
    );
  });

  test('forgotPassword sends the lowercased email', () async {
    await service.forgotPassword('  User@Example.COM ');
    expect(client.calls.single.operation, 'ForgotPassword');
    expect(client.calls.single.params['Username'], 'user@example.com');
    expect(client.calls.single.params['ClientId'], 'client123');
  });

  test('forgotPassword treats an unknown user as success', () async {
    client.errors['ForgotPassword'] =
        CognitoClientException('nope', code: 'UserNotFoundException');
    await service.forgotPassword('who@example.com');
  });

  test('forgotPassword surfaces other errors with their code', () async {
    client.errors['ForgotPassword'] =
        CognitoClientException('slow down', code: 'LimitExceededException');
    expect(
      service.forgotPassword('a@b.co'),
      throwsA(isA<AuthException>()
          .having((e) => e.code, 'code', 'LimitExceededException')),
    );
  });

  test('confirmForgotPassword sends code and new password', () async {
    await service.confirmForgotPassword('A@b.co', '123456', 'NewPass1');
    final call = client.calls.single;
    expect(call.operation, 'ConfirmForgotPassword');
    expect(call.params['Username'], 'a@b.co');
    expect(call.params['ConfirmationCode'], '123456');
    expect(call.params['Password'], 'NewPass1');
  });

  test('confirmForgotPassword maps a wrong code', () async {
    client.errors['ConfirmForgotPassword'] =
        CognitoClientException('bad', code: 'CodeMismatchException');
    expect(
      service.confirmForgotPassword('a@b.co', '000000', 'NewPass1'),
      throwsA(isA<AuthException>()
          .having((e) => e.code, 'code', 'CodeMismatchException')),
    );
  });

  test('confirmSignUp and resendSignUpCode hit the right operations', () async {
    await service.confirmSignUp('A@b.co', '123456');
    await service.resendSignUpCode('A@b.co');
    expect(client.calls.map((c) => c.operation),
        ['ConfirmSignUp', 'ResendConfirmationCode']);
    expect(client.calls.every((c) => c.params['Username'] == 'a@b.co'), isTrue);
    expect(client.calls.first.params['ConfirmationCode'], '123456');
  });

  test('resendSignUpCode reports Cognito errors', () async {
    client.errors['ResendConfirmationCode'] =
        CognitoClientException('x', code: 'LimitExceededException');
    expect(service.resendSignUpCode('a@b.co'), throwsA(isA<AuthException>()));
  });

  test('signOut revokes all sessions then clears local tokens', () async {
    await storage.saveSession(idToken: 'id', accessToken: 'access-token');
    await service.signOut();
    expect(client.calls.single.operation, 'GlobalSignOut');
    expect(client.calls.single.params['AccessToken'], 'access-token');
    expect(await storage.idToken, isNull);
    expect(await storage.accessToken, isNull);
  });

  test('signOut still clears local tokens when the revoke fails', () async {
    await storage.saveSession(idToken: 'id', accessToken: 'access-token');
    client.errors['GlobalSignOut'] =
        CognitoClientException('expired', code: 'NotAuthorizedException');
    await service.signOut();
    expect(await storage.idToken, isNull);
  });

  test('signOut with no stored session makes no network call', () async {
    await service.signOut();
    expect(client.calls, isEmpty);
  });
}
