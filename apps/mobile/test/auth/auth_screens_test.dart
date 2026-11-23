import 'package:dashden_mobile/auth/auth_controller.dart';
import 'package:dashden_mobile/l10n/gen/app_localizations.dart';
import 'package:dashden_mobile/ui/screens/forgot_password_screen.dart';
import 'package:dashden_mobile/ui/screens/login_screen.dart';
import 'package:dashden_mobile/ui/screens/register_screen.dart';
import 'package:dashden_mobile/ui/screens/reset_password_screen.dart';
import 'package:dashden_mobile/ui/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fake_auth_controller.dart';

/// Fake that records calls and can be told to fail with an error code.
class RecordingAuth extends FakeAuthController {
  RecordingAuth() : super(const AuthState(status: AuthStatus.unauthenticated));

  final List<String> calls = [];
  String? failWith;
  SignUpOutcome signUpOutcome = SignUpOutcome.needsConfirmation;

  bool _result(String call) {
    calls.add(call);
    if (failWith != null) {
      state = state.copyWith(error: 'raw english', errorCode: failWith);
      return false;
    }
    return true;
  }

  @override
  Future<void> signIn(String username, String password) async {
    calls.add('signIn:$username');
  }

  @override
  Future<SignUpOutcome> signUp({
    required String email,
    required String password,
    required String username,
    required String givenName,
    required String familyName,
  }) async {
    calls.add('signUp:$email:$username:$givenName:$familyName');
    return signUpOutcome;
  }

  @override
  Future<bool> confirmSignUp(String email, String code) async =>
      _result('confirmSignUp:$email:$code');

  @override
  Future<bool> resendSignUpCode(String email) async =>
      _result('resendSignUpCode:$email');

  @override
  Future<bool> forgotPassword(String email) async =>
      _result('forgotPassword:$email');

  @override
  Future<bool> confirmForgotPassword(
          String email, String code, String newPassword) async =>
      _result('confirmForgotPassword:$email:$code:$newPassword');
}

/// Mounts the auth routes the way the real router does, starting at [start].
Future<RecordingAuth> pumpAuth(
  WidgetTester tester, {
  String start = '/login',
  Locale locale = const Locale('en'),
}) async {
  SharedPreferences.setMockInitialValues({});
  final auth = RecordingAuth();
  final router = GoRouter(initialLocation: start, routes: [
    GoRoute(path: '/', builder: (_, __) => const Scaffold(body: Text('HOME'))),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    GoRoute(
        path: '/forgot-password',
        builder: (_, __) => const ForgotPasswordScreen()),
    GoRoute(
      path: '/reset-password',
      builder: (_, s) =>
          ResetPasswordScreen(initialEmail: s.uri.queryParameters['email']),
    ),
  ]);
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(ProviderScope(
    overrides: [authControllerProvider.overrideWith((ref) => auth)],
    child: MaterialApp.router(
      theme: AppTheme.light(),
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: router,
    ),
  ));
  await tester.pumpAndSettle();
  return auth;
}

AppLocalizations l10nOf(WidgetTester tester) =>
    AppLocalizations.of(tester.element(find.byType(Scaffold).first));

Future<void> enter(WidgetTester tester, String key, String text) async {
  await tester.enterText(find.byKey(Key(key)), text);
}

Future<void> tapText(WidgetTester tester, String text) async {
  final finder = find.ancestor(
      of: find.text(text), matching: find.bySubtype<ButtonStyleButton>());
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  for (final code in ['en', 'es', 'pt']) {
    testWidgets('auth screens render in $code', (tester) async {
      await pumpAuth(tester, locale: Locale(code));
      var l10n = l10nOf(tester);
      expect(find.text(l10n.auth_welcomeBack), findsOneWidget);
      expect(find.text(l10n.auth_forgotPassword), findsOneWidget);
      expect(find.text(l10n.auth_login), findsOneWidget);
      expect(find.text(l10n.auth_continueWithGoogle), findsOneWidget);

      await tapText(tester, l10n.auth_forgotPassword);
      expect(find.text(l10n.mobileAuth_forgotSubtitle), findsOneWidget);
      expect(find.text(l10n.mobileAuth_sendResetCode), findsOneWidget);

      await enter(tester, 'forgot-email', 'a@b.co');
      await tapText(tester, l10n.mobileAuth_sendResetCode);
      expect(find.text(l10n.mobileAuth_resetSubtitle), findsOneWidget);
      expect(find.text(l10n.mobileAuth_resetCode), findsOneWidget);
      expect(find.text(l10n.mobileAuth_resetButton), findsNWidgets(2)); // title + button

      await tester.pumpWidget(const SizedBox());
      await pumpAuth(tester, start: '/register', locale: Locale(code));
      l10n = l10nOf(tester);
      expect(find.text(l10n.mobileAuth_firstName), findsOneWidget);
      expect(find.text(l10n.auth_confirmPassword), findsOneWidget);
      expect(find.text(l10n.auth_createAccount), findsWidgets);
    });
  }

  group('login', () {
    testWidgets('shows validation errors and does not sign in', (tester) async {
      final auth = await pumpAuth(tester);
      final l10n = l10nOf(tester);
      await enter(tester, 'login-email', 'nope');
      await enter(tester, 'login-password', 'short');
      await tapText(tester, l10n.auth_login);
      expect(find.text(l10n.mobileAuth_invalidEmail), findsOneWidget);
      expect(find.text(l10n.mobileAuth_passwordMin), findsOneWidget);
      expect(auth.calls, isEmpty);
    });

    testWidgets('valid input signs in with the typed email', (tester) async {
      final auth = await pumpAuth(tester);
      final l10n = l10nOf(tester);
      await enter(tester, 'login-email', 'a@b.co');
      await enter(tester, 'login-password', 'password1');
      await tapText(tester, l10n.auth_login);
      expect(auth.calls, ['signIn:a@b.co']);
    });

    testWidgets('shows a localized message for an auth error', (tester) async {
      final auth = await pumpAuth(tester, locale: const Locale('es'));
      final l10n = l10nOf(tester);
      auth.state =
          auth.state.copyWith(error: 'Incorrect username or password.', errorCode: 'NotAuthorizedException');
      await tester.pump();
      expect(find.text(l10n.auth_invalidCredentials), findsOneWidget);
      expect(find.text('Incorrect username or password.'), findsNothing);
    });
  });

  group('forgot password', () {
    testWidgets('invalid email shows an error and sends nothing', (tester) async {
      final auth = await pumpAuth(tester, start: '/forgot-password');
      final l10n = l10nOf(tester);
      await enter(tester, 'forgot-email', 'bad');
      await tapText(tester, l10n.mobileAuth_sendResetCode);
      expect(find.text(l10n.mobileAuth_invalidEmail), findsOneWidget);
      expect(auth.calls, isEmpty);
    });

    testWidgets('success goes to reset with the email prefilled', (tester) async {
      final auth = await pumpAuth(tester, start: '/forgot-password');
      final l10n = l10nOf(tester);
      await enter(tester, 'forgot-email', 'a@b.co');
      await tapText(tester, l10n.mobileAuth_sendResetCode);
      expect(auth.calls, ['forgotPassword:a@b.co']);
      expect(find.byType(ResetPasswordScreen), findsOneWidget);
      expect(find.text('a@b.co'), findsWidgets);
    });

    testWidgets('error stays on the screen with a localized message',
        (tester) async {
      final auth = await pumpAuth(tester, start: '/forgot-password');
      final l10n = l10nOf(tester);
      auth.failWith = 'LimitExceededException';
      await enter(tester, 'forgot-email', 'a@b.co');
      await tapText(tester, l10n.mobileAuth_sendResetCode);
      expect(find.byType(ForgotPasswordScreen), findsOneWidget);
      expect(find.text(l10n.mobileAuth_errTooMany), findsOneWidget);
    });
  });

  group('reset password', () {
    Future<RecordingAuth> open(WidgetTester tester) =>
        pumpAuth(tester, start: '/reset-password?email=a%40b.co');

    testWidgets('validates code, password rules and confirmation',
        (tester) async {
      final auth = await open(tester);
      final l10n = l10nOf(tester);
      await enter(tester, 'reset-code', '123');
      await enter(tester, 'reset-password', 'lowercase1');
      await enter(tester, 'reset-confirm', 'different');
      await tapText(tester, l10n.mobileAuth_resetButton);
      expect(find.text(l10n.mobileAuth_codeMin), findsOneWidget);
      expect(find.text(l10n.mobileAuth_passwordUpper), findsOneWidget);
      expect(find.text(l10n.mobileAuth_passwordsMismatch), findsOneWidget);
      expect(auth.calls, isEmpty);
    });

    testWidgets('success returns to login with a confirmation message',
        (tester) async {
      final auth = await open(tester);
      final l10n = l10nOf(tester);
      await enter(tester, 'reset-code', '123456');
      await enter(tester, 'reset-password', 'NewPass1x');
      await enter(tester, 'reset-confirm', 'NewPass1x');
      await tapText(tester, l10n.mobileAuth_resetButton);
      expect(auth.calls, ['confirmForgotPassword:a@b.co:123456:NewPass1x']);
      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.text(l10n.mobileAuth_passwordResetDone), findsOneWidget);
    });

    testWidgets('wrong code shows a localized error and stays', (tester) async {
      final auth = await open(tester);
      final l10n = l10nOf(tester);
      auth.failWith = 'CodeMismatchException';
      await enter(tester, 'reset-code', '000000');
      await enter(tester, 'reset-password', 'NewPass1x');
      await enter(tester, 'reset-confirm', 'NewPass1x');
      await tapText(tester, l10n.mobileAuth_resetButton);
      expect(find.byType(ResetPasswordScreen), findsOneWidget);
      expect(find.text(l10n.mobileAuth_errCodeMismatch), findsOneWidget);
    });

    testWidgets('resend sends a new code, then counts down', (tester) async {
      final auth = await open(tester);
      final l10n = l10nOf(tester);
      await tapText(tester, l10n.mobileAuth_resendCode);
      expect(auth.calls, ['forgotPassword:a@b.co']);
      expect(find.text(l10n.mobileAuth_resendCodeIn('60')), findsOneWidget);
      await tester.pump(const Duration(seconds: 1));
      expect(find.text(l10n.mobileAuth_resendCodeIn('59')), findsOneWidget);
      await tester.pump(const Duration(seconds: 59));
      expect(find.text(l10n.mobileAuth_resendCode), findsOneWidget);
    });
  });

  group('register', () {
    Future<void> fillValid(WidgetTester tester) async {
      await enter(tester, 'register-email', 'a@b.co');
      await enter(tester, 'register-first-name', 'Ana');
      await enter(tester, 'register-last-name', 'Silva');
      await enter(tester, 'register-username', 'ana_s');
      await enter(tester, 'register-password', 'Passw0rdx');
      await enter(tester, 'register-confirm-password', 'Passw0rdx');
    }

    testWidgets('applies the web validation rules', (tester) async {
      final auth = await pumpAuth(tester, start: '/register');
      final l10n = l10nOf(tester);
      await enter(tester, 'register-email', 'bad');
      await enter(tester, 'register-username', 'a b');
      await enter(tester, 'register-password', 'abc');
      await enter(tester, 'register-confirm-password', 'xyz');
      await tester.tap(find.widgetWithText(FilledButton, l10n.auth_createAccount));
      await tester.pumpAndSettle();
      expect(find.text(l10n.mobileAuth_invalidEmail), findsOneWidget);
      expect(find.text(l10n.mobileAuth_required), findsNWidgets(2));
      expect(find.text(l10n.mobileAuth_usernameChars), findsOneWidget);
      expect(find.text(l10n.mobileAuth_passwordMin), findsOneWidget);
      expect(find.text(l10n.mobileAuth_passwordsMismatch), findsOneWidget);
      expect(auth.calls, isEmpty);
    });

    testWidgets('confirmation step: code, resend, confirm and sign in',
        (tester) async {
      final auth = await pumpAuth(tester, start: '/register');
      final l10n = l10nOf(tester);
      await fillValid(tester);
      await tester.tap(find.widgetWithText(FilledButton, l10n.auth_createAccount));
      await tester.pumpAndSettle();
      expect(auth.calls.single, 'signUp:a@b.co:ana_s:Ana:Silva');
      expect(find.text(l10n.auth_sentCodeTo('a@b.co')), findsOneWidget);

      await tapText(tester, l10n.mobileAuth_resendCode);
      expect(auth.calls.last, 'resendSignUpCode:a@b.co');

      await tester.tap(find.widgetWithText(FilledButton, l10n.auth_confirmEmailBtn));
      await tester.pumpAndSettle();
      expect(find.text(l10n.mobileAuth_required), findsOneWidget);

      await enter(tester, 'register-code', '123456');
      await tester.tap(find.widgetWithText(FilledButton, l10n.auth_confirmEmailBtn));
      await tester.pumpAndSettle();
      expect(auth.calls.sublist(auth.calls.length - 2),
          ['confirmSignUp:a@b.co:123456', 'signIn:a@b.co']);
    });

    testWidgets('wrong confirmation code shows a localized error',
        (tester) async {
      final auth = await pumpAuth(tester, start: '/register', locale: const Locale('pt'));
      final l10n = l10nOf(tester);
      await fillValid(tester);
      await tester.tap(find.widgetWithText(FilledButton, l10n.auth_createAccount));
      await tester.pumpAndSettle();
      auth.failWith = 'CodeMismatchException';
      await enter(tester, 'register-code', '000000');
      await tester.tap(find.widgetWithText(FilledButton, l10n.auth_confirmEmailBtn));
      await tester.pumpAndSettle();
      expect(find.text(l10n.mobileAuth_errCodeMismatch), findsOneWidget);
      expect(auth.calls.where((c) => c.startsWith('signIn')), isEmpty);
    });
  });
}
