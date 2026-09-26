import 'dart:convert';

import 'package:amazon_cognito_identity_dart_2/cognito.dart';

import '../config/env.dart';
import 'token_storage.dart';

/// Result of a successful sign-in.
class AuthTokens {
  const AuthTokens({
    required this.idToken,
    required this.accessToken,
    this.refreshToken,
  });

  final String idToken;
  final String accessToken;
  final String? refreshToken;
}

/// Thin error type so the UI can show friendly messages.
class AuthException implements Exception {
  AuthException(this.message, {this.code});
  final String message;
  final String? code;

  @override
  String toString() => message;
}

/// Pure-Dart Cognito auth wrapper.
///
/// Mirrors how the web app authenticates: after sign-in we keep the Cognito
/// **ID token**, which is what the API Gateway JWT authorizer validates and
/// whose claims (email, preferred_username) the game service reads.
class CognitoService {
  CognitoService({TokenStorage? storage})
      : _storage = storage ?? TokenStorage(),
        _pool = CognitoUserPool(Env.cognitoUserPoolId, Env.cognitoClientId);

  final TokenStorage _storage;
  final CognitoUserPool _pool;

  /// Sign in with username/email + password (SRP flow).
  Future<AuthTokens> signIn(String username, String password) async {
    final cognitoUser = CognitoUser(username, _pool);
    final authDetails = AuthenticationDetails(
      username: username,
      password: password,
    );

    CognitoUserSession? session;
    try {
      session = await cognitoUser.authenticateUser(authDetails);
    } on CognitoUserNewPasswordRequiredException {
      throw AuthException(
        'A new password is required for this account. Please reset it on the web.',
        code: 'NEW_PASSWORD_REQUIRED',
      );
    } on CognitoUserConfirmationNecessaryException {
      throw AuthException(
        'Please confirm your account first (check your email for a code).',
        code: 'USER_UNCONFIRMED',
      );
    } on CognitoClientException catch (e) {
      throw AuthException(e.message ?? 'Sign-in failed', code: e.code);
    } catch (e) {
      throw AuthException('Sign-in failed: $e');
    }

    if (session == null) {
      throw AuthException('Sign-in failed: no session returned');
    }

    final idToken = session.getIdToken().getJwtToken();
    final accessToken = session.getAccessToken().getJwtToken();
    final refreshToken = session.getRefreshToken()?.getToken();

    if (idToken == null || accessToken == null) {
      throw AuthException('Sign-in failed: missing tokens');
    }

    // Pull email/username from the ID token claims for display.
    final claims = session.getIdToken().payload;
    final email = claims['email'] as String?;
    final preferredUsername = (claims['preferred_username'] ??
        claims['cognito:username'] ??
        username) as String?;

    await _storage.saveSession(
      idToken: idToken,
      accessToken: accessToken,
      refreshToken: refreshToken,
      email: email,
      username: preferredUsername,
    );

    return AuthTokens(
      idToken: idToken,
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  /// Register a new account. Returns true if a confirmation code is required.
  Future<bool> signUp({
    required String email,
    required String password,
    required String username,
  }) async {
    try {
      final data = await _pool.signUp(
        email,
        password,
        userAttributes: [
          AttributeArg(name: 'email', value: email),
          AttributeArg(name: 'preferred_username', value: username),
        ],
      );
      return !(data.userConfirmed ?? false);
    } on CognitoClientException catch (e) {
      throw AuthException(e.message ?? 'Sign-up failed', code: e.code);
    } catch (e) {
      throw AuthException('Sign-up failed: $e');
    }
  }

  /// Confirm a new account with the emailed code.
  Future<void> confirmSignUp(String email, String code) async {
    final cognitoUser = CognitoUser(email, _pool);
    try {
      await cognitoUser.confirmRegistration(code);
    } on CognitoClientException catch (e) {
      throw AuthException(e.message ?? 'Confirmation failed', code: e.code);
    } catch (e) {
      throw AuthException('Confirmation failed: $e');
    }
  }

  /// Return a valid ID token, refreshing via the stored refresh token if
  /// the cached one is expired. Returns null if the user must re-authenticate.
  Future<String?> getValidIdToken() async {
    final cached = await _storage.idToken;
    if (cached != null && !_isExpired(cached)) {
      return cached;
    }

    final username = await _storage.username;
    final refreshToken = await _storage.refreshToken;
    if (username == null || refreshToken == null) {
      return null;
    }

    try {
      final cognitoUser = CognitoUser(username, _pool);
      final session = await cognitoUser.refreshSession(
        CognitoRefreshToken(refreshToken),
      );
      final idToken = session?.getIdToken().getJwtToken();
      final accessToken = session?.getAccessToken().getJwtToken();
      if (idToken != null && accessToken != null) {
        await _storage.saveSession(
          idToken: idToken,
          accessToken: accessToken,
          refreshToken: session?.getRefreshToken()?.getToken() ?? refreshToken,
          email: await _storage.email,
          username: username,
        );
        return idToken;
      }
    } catch (_) {
      // Refresh failed — caller should treat as signed out.
    }
    return null;
  }

  Future<void> signOut() => _storage.clear();

  TokenStorage get storage => _storage;

  /// Decode the JWT `exp` claim and check expiry (with a 30s safety margin).
  /// Decodes the payload segment directly to avoid depending on internal
  /// package types.
  bool _isExpired(String jwt) {
    try {
      final parts = jwt.split('.');
      if (parts.length != 3) return true;
      final payloadJson = utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      );
      final payload = json.decode(payloadJson) as Map<String, dynamic>;
      final exp = (payload['exp'] as num?)?.toInt();
      if (exp == null) return true;
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      return now >= (exp - 30);
    } catch (_) {
      return true;
    }
  }
}
