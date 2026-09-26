import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'cognito_service.dart';
import 'token_storage.dart';

/// Singleton Cognito service.
final cognitoServiceProvider = Provider<CognitoService>((ref) {
  return CognitoService();
});

/// Authentication status.
enum AuthStatus { unknown, authenticated, unauthenticated }

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

  /// Returns true if the account needs email confirmation.
  Future<bool> signUp({
    required String email,
    required String password,
    required String username,
  }) async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final needsConfirmation = await _cognito.signUp(
        email: email,
        password: password,
        username: username,
      );
      state = state.copyWith(isBusy: false);
      return needsConfirmation;
    } on AuthException catch (e) {
      state = state.copyWith(error: e.message, isBusy: false);
      rethrow;
    }
  }

  Future<void> confirmSignUp(String email, String code) async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await _cognito.confirmSignUp(email, code);
      state = state.copyWith(isBusy: false);
    } on AuthException catch (e) {
      state = state.copyWith(error: e.message, isBusy: false);
      rethrow;
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
