import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../auth/auth_controller.dart';
import '../../auth/validation.dart';
import '../../config/env.dart';
import '../../config/feature_flags.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../subscription/store_products.dart';
import '../auth_text.dart';
import '../theme.dart';
import '../widgets/auth_widgets.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Drop an error left over from another auth screen.
    Future.microtask(() {
      if (mounted) ref.read(authControllerProvider.notifier).clearError();
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref
        .read(authControllerProvider.notifier)
        .signIn(_email.text.trim(), _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
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
                    _Logo(),
                    const SizedBox(height: 8),
                    Text(
                      l10n.auth_welcomeBack,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      key: const Key('login-email'),
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.username],
                      decoration: InputDecoration(
                        labelText: l10n.auth_email,
                        prefixIcon: const Icon(Icons.person_outline),
                      ),
                      validator: fieldValidator(l10n, validateEmail),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: const Key('login-password'),
                      controller: _password,
                      obscureText: true,
                      autofillHints: const [AutofillHints.password],
                      decoration: InputDecoration(
                        labelText: l10n.auth_password,
                        prefixIcon: const Icon(Icons.lock_outline),
                      ),
                      validator: fieldValidator(l10n, validateLoginPassword),
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: TextButton(
                        onPressed: () => context.push('/forgot-password'),
                        child: Text(l10n.auth_forgotPassword),
                      ),
                    ),
                    AuthErrorText(authErrorText(l10n, auth)),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: auth.isBusy ? null : _submit,
                      child: AuthButtonLabel(
                          busy: auth.isBusy, label: l10n.auth_login),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Expanded(child: Divider()),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text(l10n.auth_or,
                              style: Theme.of(context).textTheme.bodySmall),
                        ),
                        const Expanded(child: Divider()),
                      ],
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: auth.isBusy
                          ? null
                          : () => ref
                              .read(authControllerProvider.notifier)
                              .signInWithGoogle(),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      icon: const Text('G',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w800)),
                      label: Text(l10n.auth_continueWithGoogle),
                    ),
                    if (kSignInWithAppleEnabled) ...[
                      const SizedBox(height: 12),
                      // Apple's style: black button, white Apple logo and label.
                      FilledButton.icon(
                        key: const Key('login-apple'),
                        onPressed: auth.isBusy
                            ? null
                            : () => ref
                                .read(authControllerProvider.notifier)
                                .signInWithApple(),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        icon: const Icon(Icons.apple, size: 22),
                        label: Text(l10n.auth_continueWithApple),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(
                      l10n.auth_socialConsent,
                      key: const Key('login-social-consent'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Wrap(
                      alignment: WrapAlignment.center,
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
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.push('/register'),
                      child: Text(
                          '${l10n.auth_dontHaveAccount} ${l10n.auth_signUp}'),
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

class _Logo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            gradient: AppTheme.brandGradient,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(Icons.grid_view_rounded, color: Colors.white, size: 40),
        ),
        const SizedBox(height: 12),
        Text(Env.appName,
            style: Theme.of(context)
                .textTheme
                .headlineMedium
                ?.copyWith(fontWeight: FontWeight.w800)),
      ],
    );
  }
}
