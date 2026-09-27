import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'cognito_service.dart';
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
    this.error,
    this.isBusy = false,
  });

  final AuthStatus status;
  final String? email;
  final String? username;
  final String? error;
  final bool isBusy;

  AuthState copyWith({
    AuthStatus? status,
    String? email,
    String? username,
    String? error,
    bool clearError = false,
    bool? isBusy,
  }) {
    return AuthState(
      status: status ?? this.status,
      email: email ?? this.email,
      username: username ?? this.username,
      error: clearError ? null : (error ?? this.error),
      isBusy: isBusy ?? this.isBusy,
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._cognito) : super(const AuthState()) {
    _restore();
  }

  final CognitoService _cognito;
  TokenStorage get _storage => _cognito.storage;

  /// On launch, try to restore a valid session from secure storage.
  Future<void> _restore() async {
    final token = await _cognito.getValidIdToken();
    if (token != null) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        email: await _storage.email,
        username: await _storage.username,
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
        isBusy: false,
      );
    } on AuthException catch (e) {
      state = state.copyWith(error: e.message, isBusy: false);
    }
  }

  /// Sign in with Google via the Cognito Hosted UI (OAuth + PKCE).
  Future<void> signInWithGoogle() async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _cognito.signInWithGoogle();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        email: await _storage.email,
        username: await _storage.username,
        isBusy: false,
      );
    } on AuthException catch (e) {
      // A user-cancelled flow shouldn't surface as a scary error.
      if (e.code == 'OAUTH_CANCELLED') {
        state = state.copyWith(isBusy: false);
      } else {
        state = state.copyWith(error: e.message, isBusy: false);
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
      // An already-registered account that hasn't been confirmed yet should
      // route the user to the confirmation step, not a dead end. Cognito can
      // signal this a few different ways when SignUp is retried:
      //   - UsernameExistsException (account already created)
      //   - UserNotConfirmedException / a "not confirmed" message
      // Match on both the code and the message text so any of these variants
      // lands the user on the code-entry form.
      final msg = e.message.toLowerCase();
      final isExisting = e.code == 'UsernameExistsException' ||
          e.code == 'UserNotConfirmedException' ||
          msg.contains('not confirmed') ||
          msg.contains('already exists');
      if (isExisting) {
        state = state.copyWith(isBusy: false, clearError: true);
        return SignUpOutcome.needsConfirmation;
      }
      state = state.copyWith(error: e.message, isBusy: false);
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
      state = state.copyWith(error: e.message, isBusy: false);
      return false;
    }
  }

  Future<void> signOut() async {
    await _cognito.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(cognitoServiceProvider));
});
