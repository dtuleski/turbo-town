import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/auth_controller.dart';
import '../../auth/validation.dart';
import '../../l10n/gen/app_localizations.dart';
import '../auth_text.dart';
import '../widgets/auth_widgets.dart';

/// Step 2 of password recovery: emailed code + new password.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, this.initialEmail});

  /// Email carried over from the forgot-password screen.
  final String? initialEmail;

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _email =
      TextEditingController(text: widget.initialEmail ?? '');
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

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
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final l10n = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);
    final ok = await ref.read(authControllerProvider.notifier).confirmForgotPassword(
          _email.text.trim(),
          _code.text.trim(),
          _password.text,
        );
    if (!mounted || !ok) return;
    messenger.showSnackBar(
      SnackBar(content: Text(l10n.mobileAuth_passwordResetDone)),
    );
    router.go('/login');
  }

  Future<bool> _resend() async {
    final l10n = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    if (validateEmail(_email.text) != null) {
      messenger.showSnackBar(
        SnackBar(content: Text(l10n.mobileAuth_enterEmailFirst)),
      );
      return false;
    }
    final ok = await ref
        .read(authControllerProvider.notifier)
        .forgotPassword(_email.text.trim());
    if (ok && mounted) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.mobileAuth_codeResent)));
    }
    return ok;
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.mobileAuth_resetTitle)),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      l10n.mobileAuth_resetSubtitle,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    if (widget.initialEmail != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        l10n.mobileAuth_resetCodeSentTo(widget.initialEmail!),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 24),
                    TextFormField(
                      key: const Key('reset-email'),
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
                      key: const Key('reset-code'),
                      controller: _code,
                      keyboardType: TextInputType.number,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      decoration: InputDecoration(
                        labelText: l10n.mobileAuth_resetCode,
                        prefixIcon: const Icon(Icons.pin_outlined),
                      ),
                      validator: fieldValidator(l10n, validateResetCode),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: const Key('reset-password'),
                      controller: _password,
                      obscureText: true,
                      autofillHints: const [AutofillHints.newPassword],
                      decoration: InputDecoration(
                        labelText: l10n.mobileAuth_newPassword,
                        prefixIcon: const Icon(Icons.lock_outline),
                      ),
                      validator: fieldValidator(l10n, validateNewPassword),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: const Key('reset-confirm'),
                      controller: _confirm,
                      obscureText: true,
                      decoration: InputDecoration(
                        labelText: l10n.auth_confirmPassword,
                        prefixIcon: const Icon(Icons.lock_outline),
                      ),
                      validator: fieldValidator(
                          l10n, (v) => validateConfirmPassword(_password.text, v)),
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    AuthErrorText(authErrorText(l10n, auth)),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: auth.isBusy ? null : _submit,
                      child: AuthButtonLabel(
                          busy: auth.isBusy, label: l10n.mobileAuth_resetButton),
                    ),
                    ResendCodeButton(onResend: _resend),
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: Text(l10n.mobileAuth_backToLogin),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
