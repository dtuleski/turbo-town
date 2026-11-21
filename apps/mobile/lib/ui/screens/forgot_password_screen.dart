import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/auth_controller.dart';
import '../../auth/validation.dart';
import '../../l10n/gen/app_localizations.dart';
import '../auth_text.dart';
import '../widgets/auth_widgets.dart';

/// Step 1 of password recovery: ask Cognito to email a reset code, then go to
/// the reset screen with the email filled in.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();

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
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final email = _email.text.trim();
    final ok =
        await ref.read(authControllerProvider.notifier).forgotPassword(email);
    if (!mounted || !ok) return;
    context.pushReplacement(
      Uri(path: '/reset-password', queryParameters: {'email': email}).toString(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.auth_forgotPassword)),
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
                      l10n.mobileAuth_forgotSubtitle,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      key: const Key('forgot-email'),
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: InputDecoration(
                        labelText: l10n.auth_email,
                        prefixIcon: const Icon(Icons.email_outlined),
                      ),
                      validator: fieldValidator(l10n, validateEmail),
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    AuthErrorText(authErrorText(l10n, auth)),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: auth.isBusy ? null : _submit,
                      child: AuthButtonLabel(
                          busy: auth.isBusy, label: l10n.mobileAuth_sendResetCode),
                    ),
                    TextButton(
                      onPressed: () {
                        final email = _email.text.trim();
                        if (validateEmail(email) != null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(l10n.mobileAuth_enterEmailFirst)),
                          );
                          return;
                        }
                        context.pushReplacement(Uri(
                            path: '/reset-password',
                            queryParameters: {'email': email}).toString());
                      },
                      child: Text(l10n.mobileAuth_haveResetCode),
                    ),
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
