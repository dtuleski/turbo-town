import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../auth/auth_controller.dart';
import '../../auth/validation.dart';
import '../../subscription/store_products.dart';
import '../../l10n/gen/app_localizations.dart';
import '../auth_text.dart';
import '../widgets/auth_widgets.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _givenName = TextEditingController();
  final _familyName = TextEditingController();
  final _code = TextEditingController();
  final _codeFormKey = GlobalKey<FormState>();
  bool _awaitingConfirmation = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (mounted) ref.read(authControllerProvider.notifier).clearError();
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _username.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _givenName.dispose();
    _familyName.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    final outcome = await ref.read(authControllerProvider.notifier).signUp(
          email: _email.text.trim(),
          password: _password.text,
          username: _username.text.trim(),
          givenName: _givenName.text.trim(),
          familyName: _familyName.text.trim(),
        );
    if (!mounted) return;
    switch (outcome) {
      case SignUpOutcome.needsConfirmation:
        setState(() => _awaitingConfirmation = true);
      case SignUpOutcome.confirmed:
        // Auto-confirmed: sign in directly.
        await ref
            .read(authControllerProvider.notifier)
            .signIn(_email.text.trim(), _password.text);
      case SignUpOutcome.failed:
        // Error is shown via auth state; stay on the form.
        break;
    }
  }

  Future<void> _confirm() async {
    if (!_codeFormKey.currentState!.validate()) return;
    final ok = await ref
        .read(authControllerProvider.notifier)
        .confirmSignUp(_email.text.trim(), _code.text.trim());
    if (!mounted || !ok) return;
    // Sign in with the credentials just entered. If this screen was reached
    // through "Already have a code?" the password may be empty; sign-in then
    // fails with an error and the user can sign in from the login screen.
    await ref
        .read(authControllerProvider.notifier)
        .signIn(_email.text.trim(), _password.text);
  }

  Future<bool> _resend() => ref
      .read(authControllerProvider.notifier)
      .resendSignUpCode(_email.text.trim())
      .then((ok) {
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(AppLocalizations.of(context).mobileAuth_codeResent)));
    }
    return ok;
  });

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(_awaitingConfirmation
            ? l10n.auth_confirmEmail
            : l10n.auth_createAccount),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: _awaitingConfirmation
                  ? _confirmForm(context, l10n, auth)
                  : _registerForm(context, l10n, auth),
            ),
          ),
        ),
      ),
    );
  }

  Widget _registerForm(
      BuildContext context, AppLocalizations l10n, AuthState auth) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          TextFormField(
            key: const Key('register-email'),
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: l10n.auth_email,
              prefixIcon: const Icon(Icons.email_outlined),
            ),
            validator: fieldValidator(l10n, validateEmail),
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('register-first-name'),
            controller: _givenName,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: l10n.mobileAuth_firstName,
              prefixIcon: const Icon(Icons.badge_outlined),
            ),
            validator: fieldValidator(l10n, validateRequired),
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('register-last-name'),
            controller: _familyName,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: l10n.mobileAuth_lastName,
              prefixIcon: const Icon(Icons.badge_outlined),
            ),
            validator: fieldValidator(l10n, validateRequired),
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('register-username'),
            controller: _username,
            decoration: InputDecoration(
              labelText: l10n.auth_username,
              prefixIcon: const Icon(Icons.person_outline),
            ),
            validator: fieldValidator(l10n, validateUsername),
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('register-password'),
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(
              labelText: l10n.auth_password,
              prefixIcon: const Icon(Icons.lock_outline),
            ),
            validator: fieldValidator(l10n, validateNewPassword),
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('register-confirm-password'),
            controller: _confirmPassword,
            obscureText: true,
            decoration: InputDecoration(
              labelText: l10n.auth_confirmPassword,
              prefixIcon: const Icon(Icons.lock_outline),
            ),
            validator: fieldValidator(
                l10n, (v) => validateConfirmPassword(_password.text, v)),
          ),
          const SizedBox(height: 12),
          // Accounts are for adults (parents and guardians); see the Terms of Service.
          FormField<bool>(
            key: const Key('register-adult'),
            initialValue: false,
            validator: (v) => v == true ? null : l10n.auth_adultRequired,
            builder: (field) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CheckboxListTile(
                  key: const Key('register-adult-checkbox'),
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: field.value ?? false,
                  onChanged: (v) => field.didChange(v ?? false),
                  title: Text(l10n.auth_adultConfirm, style: const TextStyle(fontSize: 14)),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    TextButton(
                      onPressed: () => launchUrl(Uri.parse(kServiceTermsUrl), mode: LaunchMode.inAppBrowserView),
                      child: Text(l10n.profile_terms),
                    ),
                    TextButton(
                      onPressed: () => launchUrl(Uri.parse(kPrivacyPolicyUrl), mode: LaunchMode.inAppBrowserView),
                      child: Text(l10n.profile_privacy),
                    ),
                  ],
                ),
                if (field.hasError)
                  Text(field.errorText!,
                      key: const Key('register-adult-error'),
                      style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
              ],
            ),
          ),
          AuthErrorText(authErrorText(l10n, auth)),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: auth.isBusy ? null : _register,
            child: AuthButtonLabel(
                busy: auth.isBusy, label: l10n.auth_createAccount),
          ),
          TextButton(
            onPressed: () {
              // Escape hatch: if an account was already created (e.g. a prior
              // attempt), let the user jump straight to entering their code.
              if (validateEmail(_email.text) == null) {
                setState(() => _awaitingConfirmation = true);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.mobileAuth_enterEmailFirst)),
                );
              }
            },
            child: Text(l10n.mobileAuth_haveResetCode),
          ),
          TextButton(
            onPressed: () => context.pop(),
            child: Text(l10n.mobileAuth_backToLogin),
          ),
        ],
      ),
    );
  }

  Widget _confirmForm(
      BuildContext context, AppLocalizations l10n, AuthState auth) {
    return Form(
      key: _codeFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l10n.auth_sentCodeTo(_email.text.trim()),
              style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          TextFormField(
            key: const Key('register-code'),
            controller: _code,
            keyboardType: TextInputType.number,
            autofillHints: const [AutofillHints.oneTimeCode],
            decoration: InputDecoration(
              labelText: l10n.auth_confirmationCode,
              prefixIcon: const Icon(Icons.pin_outlined),
            ),
            validator: fieldValidator(l10n, validateConfirmationCode),
          ),
          AuthErrorText(authErrorText(l10n, auth)),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: auth.isBusy ? null : _confirm,
            child: AuthButtonLabel(
                busy: auth.isBusy, label: l10n.auth_confirmEmailBtn),
          ),
          ResendCodeButton(onResend: _resend),
          TextButton(
            onPressed: auth.isBusy
                ? null
                : () {
                    ref.read(authControllerProvider.notifier).clearError();
                    setState(() => _awaitingConfirmation = false);
                  },
            child: Text(l10n.auth_backToRegistration),
          ),
        ],
      ),
    );
  }
}
