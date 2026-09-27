import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/auth_controller.dart';

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
  final _givenName = TextEditingController();
  final _familyName = TextEditingController();
  final _code = TextEditingController();

  bool _awaitingConfirmation = false;

  @override
  void dispose() {
    _email.dispose();
    _username.dispose();
    _password.dispose();
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
        // Auto-confirmed — sign in directly.
        await ref
            .read(authControllerProvider.notifier)
            .signIn(_email.text.trim(), _password.text);
      case SignUpOutcome.failed:
        // Error is shown via auth state; stay on the form.
        break;
    }
  }

  Future<void> _confirm() async {
    if (_code.text.trim().isEmpty) return;
    final ok = await ref
        .read(authControllerProvider.notifier)
        .confirmSignUp(_email.text.trim(), _code.text.trim());
    if (!mounted || !ok) return;
    // After confirmation, sign in.
    await ref
        .read(authControllerProvider.notifier)
        .signIn(_email.text.trim(), _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(_awaitingConfirmation ? 'Confirm account' : 'Create account')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: _awaitingConfirmation
                  ? _confirmForm(context, auth)
                  : _registerForm(context, auth),
            ),
          ),
        ),
      ),
    );
  }

  Widget _registerForm(BuildContext context, AuthState auth) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined),
            ),
            validator: (v) => (v != null && v.contains('@')) ? null : 'Enter a valid email',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _givenName,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'First name',
              prefixIcon: Icon(Icons.badge_outlined),
            ),
            validator: (v) =>
                (v != null && v.trim().isNotEmpty) ? null : 'Required',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _familyName,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Last name',
              prefixIcon: Icon(Icons.badge_outlined),
            ),
            validator: (v) =>
                (v != null && v.trim().isNotEmpty) ? null : 'Required',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _username,
            decoration: const InputDecoration(
              labelText: 'Username',
              prefixIcon: Icon(Icons.person_outline),
            ),
            validator: (v) =>
                (v != null && v.trim().length >= 3) ? null : 'At least 3 characters',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Password',
              prefixIcon: Icon(Icons.lock_outline),
            ),
            validator: (v) =>
                (v != null && v.length >= 8) ? null : 'At least 8 characters',
          ),
          if (auth.error != null) ...[
            const SizedBox(height: 16),
            Text(auth.error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: auth.isBusy ? null : _register,
            child: auth.isBusy
                ? const SizedBox(
                    height: 22, width: 22,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Create account'),
          ),
          TextButton(
            onPressed: () {
              // Escape hatch: if an account was already created (e.g. a prior
              // attempt), let the user jump straight to entering their code.
              if (_email.text.trim().contains('@')) {
                setState(() => _awaitingConfirmation = true);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Enter your email above first, then tap this.'),
                  ),
                );
              }
            },
            child: const Text('Already have a code? Enter it'),
          ),
          TextButton(
            onPressed: () => context.pop(),
            child: const Text('Back to sign in'),
          ),
        ],
      ),
    );
  }

  Widget _confirmForm(BuildContext context, AuthState auth) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('We sent a confirmation code to ${_email.text.trim()}.',
            style: Theme.of(context).textTheme.bodyLarge),
        const SizedBox(height: 16),
        TextField(
          controller: _code,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Confirmation code',
            prefixIcon: Icon(Icons.pin_outlined),
          ),
        ),
        if (auth.error != null) ...[
          const SizedBox(height: 16),
          Text(auth.error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
        const SizedBox(height: 24),
        FilledButton(
          onPressed: auth.isBusy ? null : _confirm,
          child: auth.isBusy
              ? const SizedBox(
                  height: 22, width: 22,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Confirm & sign in'),
        ),
        TextButton(
          onPressed: auth.isBusy
              ? null
              : () {
                  ref.read(authControllerProvider.notifier).clearError();
                  setState(() => _awaitingConfirmation = false);
                },
          child: const Text('Back'),
        ),
      ],
    );
  }
}
