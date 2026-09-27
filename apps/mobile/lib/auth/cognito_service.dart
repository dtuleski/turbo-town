import 'dart:convert';
import 'dart:math';

import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:http/http.dart' as http;

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
  ///
  /// This pool uses email as the sign-in identifier. Emails are
  /// case-insensitive, but Cognito matches the stored (lowercased) value, so
  /// we normalize an email identifier to lowercase to avoid spurious
  /// "incorrect username or password" errors when the user varies the case.
  Future<AuthTokens> signIn(String username, String password) async {
    final identifier = _normalizeIdentifier(username);
    final cognitoUser = CognitoUser(identifier, _pool);
    final authDetails = AuthenticationDetails(
      username: identifier,
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

  /// Sign in with Google via the Cognito Hosted UI (OAuth authorization-code
  /// flow with PKCE). Opens an in-app browser tab to the Hosted UI, captures
  /// the redirect to [Env.oauthRedirectUri], exchanges the code for tokens,
  /// and stores them — matching the web app's federated login.
  Future<AuthTokens> signInWithGoogle() async {
    // 1. PKCE: generate a code verifier + S256 challenge.
    final codeVerifier = _generateCodeVerifier();
    final codeChallenge = _codeChallengeS256(codeVerifier);

    // 2. Build the Hosted UI authorize URL (force the Google IdP).
    final authorizeUrl = Uri.parse('${Env.hostedUiBaseUrl}/oauth2/authorize').replace(
      queryParameters: {
        'response_type': 'code',
        'client_id': Env.cognitoClientId,
        'redirect_uri': Env.oauthRedirectUri,
        'scope': Env.oauthScopes.join(' '),
        'identity_provider': 'Google',
        'code_challenge': codeChallenge,
        'code_challenge_method': 'S256',
      },
    );

    // 3. Launch the browser and wait for the redirect back to our scheme.
    String resultUrl;
    try {
      resultUrl = await FlutterWebAuth2.authenticate(
        url: authorizeUrl.toString(),
        callbackUrlScheme: Env.oauthRedirectScheme,
      );
    } catch (e) {
      throw AuthException('Google sign-in was cancelled or failed.', code: 'OAUTH_CANCELLED');
    }

    // 4. Extract the authorization code from the redirect.
    final returned = Uri.parse(resultUrl);
    final error = returned.queryParameters['error'];
    if (error != null) {
      throw AuthException(
        returned.queryParameters['error_description'] ?? 'Google sign-in failed: $error',
        code: 'OAUTH_ERROR',
      );
    }
    final code = returned.queryParameters['code'];
    if (code == null || code.isEmpty) {
      throw AuthException('Google sign-in failed: no authorization code returned.');
    }

    // 5. Exchange the code for tokens at the token endpoint (PKCE, no secret).
    final tokenResponse = await http.post(
      Uri.parse('${Env.hostedUiBaseUrl}/oauth2/token'),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {
        'grant_type': 'authorization_code',
        'client_id': Env.cognitoClientId,
        'code': code,
        'redirect_uri': Env.oauthRedirectUri,
        'code_verifier': codeVerifier,
      },
    );

    if (tokenResponse.statusCode != 200) {
      throw AuthException(
        'Token exchange failed (${tokenResponse.statusCode}).',
        code: 'TOKEN_EXCHANGE_FAILED',
      );
    }

    final tokens = json.decode(tokenResponse.body) as Map<String, dynamic>;
    final idToken = tokens['id_token'] as String?;
    final accessToken = tokens['access_token'] as String?;
    final refreshToken = tokens['refresh_token'] as String?;

    if (idToken == null || accessToken == null) {
      throw AuthException('Google sign-in failed: missing tokens in response.');
    }

    // 6. Pull email/username from the ID token claims for display.
    final claims = _decodeJwtPayload(idToken);
    final email = claims['email'] as String?;
    final username = (claims['preferred_username'] ??
        claims['cognito:username'] ??
        email) as String?;

    await _storage.saveSession(
      idToken: idToken,
      accessToken: accessToken,
      refreshToken: refreshToken,
      email: email,
      username: username,
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
    required String givenName,
    required String familyName,
  }) async {
    // Store the email lowercased so sign-in works regardless of typed case.
    final normalizedEmail = email.trim().toLowerCase();
    try {
      final data = await _pool.signUp(
        normalizedEmail,
        password,
        userAttributes: [
          AttributeArg(name: 'email', value: normalizedEmail),
          AttributeArg(name: 'preferred_username', value: username),
          AttributeArg(name: 'given_name', value: givenName),
          AttributeArg(name: 'family_name', value: familyName),
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
  bool _isExpired(String jwt) {
    try {
      final payload = _decodeJwtPayload(jwt);
      final exp = (payload['exp'] as num?)?.toInt();
      if (exp == null) return true;
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      return now >= (exp - 30);
    } catch (_) {
      return true;
    }
  }

  /// Decode the payload segment of a JWT into a claims map.
  /// Decodes directly to avoid depending on internal package types.
  Map<String, dynamic> _decodeJwtPayload(String jwt) {
    final parts = jwt.split('.');
    if (parts.length != 3) {
      throw const FormatException('Invalid JWT');
    }
    final payloadJson = utf8.decode(
      base64Url.decode(base64Url.normalize(parts[1])),
    );
    return json.decode(payloadJson) as Map<String, dynamic>;
  }

  /// Normalize a sign-in identifier. Emails are case-insensitive, so if the
  /// identifier looks like an email we lowercase it (this pool signs in by
  /// email). A non-email username is returned trimmed but case-preserved.
  String _normalizeIdentifier(String raw) {
    final trimmed = raw.trim();
    return trimmed.contains('@') ? trimmed.toLowerCase() : trimmed;
  }

  /// Generate a high-entropy PKCE code verifier (RFC 7636): 43-128 chars from
  /// the unreserved set. We use 32 random bytes -> base64url (43 chars).
  String _generateCodeVerifier() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    return base64Url.encode(bytes).replaceAll('=', '');
  }

  /// S256 code challenge = base64url(SHA256(verifier)), no padding.
  String _codeChallengeS256(String verifier) {
    final digest = sha256.convert(ascii.encode(verifier));
    return base64Url.encode(digest.bytes).replaceAll('=', '');
  }
}
