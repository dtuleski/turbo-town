import 'dart:async';

import 'package:flutter/material.dart';

import '../../l10n/gen/app_localizations.dart';

/// Red error line shown under an auth form.
class AuthErrorText extends StatelessWidget {
  const AuthErrorText(this.message, {super.key});

  final String? message;

  @override
  Widget build(BuildContext context) {
    if (message == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Text(
        message!,
        key: const Key('auth-error'),
        style: TextStyle(color: Theme.of(context).colorScheme.error),
      ),
    );
  }
}

/// Button label that swaps to a spinner while an auth call is running.
class AuthButtonLabel extends StatelessWidget {
  const AuthButtonLabel({super.key, required this.busy, required this.label});

  final bool busy;
  final String label;

  @override
  Widget build(BuildContext context) {
    if (!busy) return Text(label);
    return const SizedBox(
      height: 22,
      width: 22,
      child: CircularProgressIndicator(strokeWidth: 2),
    );
  }
}

/// "Resend code" text button with a 60 second cooldown after each send,
/// matching the web register page. [onResend] returns true when a code was
/// sent, which starts the cooldown.
class ResendCodeButton extends StatefulWidget {
  const ResendCodeButton({
    super.key,
    required this.onResend,
    this.cooldownSeconds = 60,
  });

  final Future<bool> Function() onResend;
  final int cooldownSeconds;

  @override
  State<ResendCodeButton> createState() => _ResendCodeButtonState();
}

class _ResendCodeButtonState extends State<ResendCodeButton> {
  Timer? _timer;
  int _remaining = 0;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _resend() async {
    final sent = await widget.onResend();
    if (!mounted || !sent) return;
    setState(() => _remaining = widget.cooldownSeconds);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() => _remaining--);
      if (_remaining <= 0) t.cancel();
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return TextButton(
      onPressed: _remaining > 0 ? null : _resend,
      child: Text(
        _remaining > 0
            ? l10n.mobileAuth_resendCodeIn(_remaining.toString())
            : l10n.mobileAuth_resendCode,
      ),
    );
  }
}
