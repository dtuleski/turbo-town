import 'package:dashden_mobile/auth/auth_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// [AuthController] stand-in with a fixed state and no Cognito access.
///
/// Use it with `authControllerProvider.overrideWith((ref) => FakeAuthController(...))`.
class FakeAuthController extends StateNotifier<AuthState>
    implements AuthController {
  FakeAuthController([AuthState? initial])
      : super(
          initial ??
              const AuthState(
                status: AuthStatus.authenticated,
                email: 'test@dashden.app',
                username: 'tester',
              ),
        );

  @override
  Future<void> signIn(String username, String password) async {
    state = state.copyWith(status: AuthStatus.authenticated);
  }

  @override
  Future<void> signInWithGoogle() async {
    state = state.copyWith(status: AuthStatus.authenticated);
  }

  @override
  Future<SignUpOutcome> signUp({
    required String email,
    required String password,
    required String username,
    required String givenName,
    required String familyName,
  }) async =>
      SignUpOutcome.needsConfirmation;

  @override
  Future<bool> confirmSignUp(String email, String code) async => true;

  @override
  Future<bool> resendSignUpCode(String email) async => true;

  @override
  Future<bool> forgotPassword(String email) async => true;

  @override
  Future<bool> confirmForgotPassword(
    String email,
    String code,
    String newPassword,
  ) async =>
      true;

  @override
  Future<void> signOut() async {
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  @override
  void clearError() => state = state.copyWith(clearError: true);
}
