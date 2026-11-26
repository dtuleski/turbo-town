import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../push/push_controller.dart';

import 'cognito_service.dart';
import 'display_name.dart';
import 'token_storage.dart';

/// Singleton Cognito service.
final cognitoServiceProvider = Provider<CognitoService>((ref) {
  return CognitoService();
});

/// Authentication status.
enum AuthStatus { unknown, authenticated, unauthenticated }

/// Outcome of a sign-up attempt (drives the register screen's next step).
enum SignUpOutcome { needsConfirmation, confirmed, failed }

class AuthState {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.email,
    this.username,
    this.displayName,
    this.error,
    this.errorCode,
    this.isBusy = false,
  });

  final AuthStatus status;
  final String? email;
  final String? username;

  /// Friendly name for the UI. Never a raw `Google_<id>` username.
  final String? displayName;
  final String? error;

  /// Cognito/app error code behind [error], used to pick a localized message.
  final String? errorCode;
  final bool isBusy;

  AuthState copyWith({
    AuthStatus? status,
    String? email,
    String? username,
    String? displayName,
    String? error,
    String? errorCode,
    bool clearError = false,
    bool? isBusy,
  }) {
    return AuthState(
      status: status ?? this.status,
      email: email ?? this.email,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      error: clearError ? null : (error ?? this.error),
      errorCode: clearError ? null : (errorCode ?? this.errorCode),
      isBusy: isBusy ?? this.isBusy,
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._cognito, {Future<void> Function()? beforeSignOut})
      : _beforeSignOut = beforeSignOut,
        super(const AuthState()) {
    _restore();
  }

  final CognitoService _cognito;

  /// Runs while the session is still valid (push device unregister). A
  /// failure there never blocks sign-out.
  final Future<void> Function()? _beforeSignOut;
  TokenStorage get _storage => _cognito.storage;

  /// On launch, try to restore a valid session from secure storage.
  Future<void> _restore() async {
    final token = await _cognito.getValidIdToken();
    if (token != null) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        email: await _storage.email,
        username: await _storage.username,
        displayName: displayNameFromIdToken(await _storage.idToken),
      );
    } else {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> signIn(String username, String password) async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _cognito.signIn(username, password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        email: await _storage.email,
        username: await _storage.username,
        displayName: displayNameFromIdToken(await _storage.idToken),
        isBusy: false,
      );
    } on AuthException catch (e) {
      state = state.copyWith(error: e.message, errorCode: e.code, isBusy: false);
    }
  }

  /// Sign in with Google via the Cognito Hosted UI (OAuth + PKCE).
  Future<void> signInWithGoogle() => _federatedSignIn(_cognito.signInWithGoogle);

  Future<void> signInWithApple() => _federatedSignIn(_cognito.signInWithApple);

  Future<void> _federatedSignIn(Future<AuthTokens> Function() signIn) async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await signIn();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        email: await _storage.email,
        username: await _storage.username,
        displayName: displayNameFromIdToken(await _storage.idToken),
        isBusy: false,
      );
    } on AuthException catch (e) {
      // A user-cancelled flow shouldn't surface as a scary error.
      if (e.code == 'OAUTH_CANCELLED') {
        state = state.copyWith(isBusy: false);
      } else {
        state = state.copyWith(error: e.message, errorCode: e.code, isBusy: false);
      }
    }
  }

  /// Attempt to register a new account.
  ///
  /// Returns a [SignUpOutcome] describing what the UI should do next, rather
  /// than throwing — so the caller never has to guess from a swallowed
  /// exception. On error, [AuthState.error] is also set for display.
  Future<SignUpOutcome> signUp({
    required String email,
    required String password,
    required String username,
    required String givenName,
    required String familyName,
  }) async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final needsConfirmation = await _cognito.signUp(
        email: email,
        password: password,
        username: username,
        givenName: givenName,
        familyName: familyName,
      );
      state = state.copyWith(isBusy: false);
      return needsConfirmation
          ? SignUpOutcome.needsConfirmation
          : SignUpOutcome.confirmed;
    } on AuthException catch (e) {
      // An already-registered-but-unconfirmed account should route the user
      // to the confirmation step, not a dead end. Cognito signals this a few
      // ways on a retried SignUp, so match the codes and the message text.
      final msg = e.message.toLowerCase();
      final isExisting = e.code == 'UsernameExistsException' ||
          e.code == 'UserNotConfirmedException' ||
          msg.contains('not confirmed') ||
          msg.contains('already exists');
      if (isExisting) {
        state = state.copyWith(isBusy: false, clearError: true);
        return SignUpOutcome.needsConfirmation;
      }
      state = state.copyWith(error: e.message, errorCode: e.code, isBusy: false);
      return SignUpOutcome.failed;
    }
  }

  /// Confirm a new account with the emailed code. Returns true on success;
  /// on failure sets [AuthState.error] and returns false (no throw).
  Future<bool> confirmSignUp(String email, String code) async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _cognito.confirmSignUp(email, code);
      state = state.copyWith(isBusy: false);
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(error: e.message, errorCode: e.code, isBusy: false);
      return false;
    }
  }

  /// Email a new sign-up confirmation code. Returns true on success.
  Future<bool> resendSignUpCode(String email) =>
      _run(() => _cognito.resendSignUpCode(email));

  /// Start forgot-password: email a reset code. Returns true on success.
  Future<bool> forgotPassword(String email) =>
      _run(() => _cognito.forgotPassword(email));

  /// Finish forgot-password with the emailed code. Returns true on success.
  Future<bool> confirmForgotPassword(
    String email,
    String code,
    String newPassword,
  ) =>
      _run(() => _cognito.confirmForgotPassword(email, code, newPassword));

  /// Runs [action] with the busy flag; on [AuthException] sets the error and
  /// returns false instead of throwing.
  Future<bool> _run(Future<void> Function() action) async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await action();
      state = state.copyWith(isBusy: false);
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(error: e.message, errorCode: e.code, isBusy: false);
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      await _beforeSignOut?.call();
    } catch (_) {
      // Sign-out goes on.
    }
    await _cognito.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(
    ref.watch(cognitoServiceProvider),
    beforeSignOut: () => ref.read(pushControllerProvider).unregister(),
  );
});
