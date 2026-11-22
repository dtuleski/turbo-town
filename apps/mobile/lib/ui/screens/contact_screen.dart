import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/feature_providers.dart';
import '../../api/stats_models.dart';
import '../../auth/auth_controller.dart';
import '../../l10n/gen/app_localizations.dart';

enum _Status { idle, sending, sent, error }

/// Bug report, feature request or question sent to the DashDen team.
class ContactScreen extends ConsumerStatefulWidget {
  const ContactScreen({super.key});

  @override
  ConsumerState<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends ConsumerState<ContactScreen> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  ContactType _type = ContactType.bug;
  _Status _status = _Status.idle;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  bool get _canSend =>
      _subject.text.trim().isNotEmpty &&
      _message.text.trim().isNotEmpty &&
      _status != _Status.sending;

  Future<void> _send() async {
    setState(() => _status = _Status.sending);
    try {
      await ref.read(profileApiProvider).submitContactForm(
            type: _type,
            subject: _subject.text.trim(),
            message: _message.text.trim(),
          );
      if (mounted) setState(() => _status = _Status.sent);
    } catch (_) {
      if (mounted) setState(() => _status = _Status.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_status == _Status.sent) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.setup_contact_title)),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('✅', style: TextStyle(fontSize: 64)),
                const SizedBox(height: 12),
                Text(l10n.setup_contact_sentTitle,
                    key: const Key('contact-sent'),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(l10n.setup_contact_sentMsg, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  key: const Key('contact-back'),
                  onPressed: () => context.go('/'),
                  child: Text(l10n.setup_contact_backToGames),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final username = ref.watch(authControllerProvider).username;
    final labels = {
      ContactType.bug: ('🐛', l10n.setup_contact_bugReport),
      ContactType.feature: ('💡', l10n.setup_contact_featureRequest),
      ContactType.question: ('❓', l10n.setup_contact_question),
      ContactType.other: ('📩', l10n.setup_contact_other),
    };
    return Scaffold(
      appBar: AppBar(title: Text('📬 ${l10n.setup_contact_title}')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(l10n.setup_contact_subtitle),
            const SizedBox(height: 16),
            Text(l10n.setup_contact_whatsAbout,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final e in labels.entries)
                  ChoiceChip(
                    key: Key('contact-type-${e.key.name}'),
                    selected: _type == e.key,
                    label: Text('${e.value.$1} ${e.value.$2}'),
                    onSelected: (_) => setState(() => _type = e.key),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Text('${l10n.setup_contact_from} ${username ?? l10n.common_player}'),
            const SizedBox(height: 12),
            TextField(
              key: const Key('contact-subject'),
              controller: _subject,
              maxLength: 200,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                labelText: l10n.setup_contact_subject,
                hintText: l10n.setup_contact_subjectPlaceholder,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('contact-message'),
              controller: _message,
              maxLength: 5000,
              minLines: 5,
              maxLines: 8,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                labelText: l10n.setup_contact_message,
                hintText: l10n.setup_contact_messagePlaceholder,
                alignLabelWithHint: true,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('contact-send'),
              onPressed: _canSend ? _send : null,
              child: Text(_status == _Status.sending
                  ? l10n.setup_contact_sending
                  : l10n.setup_contact_send),
            ),
            if (_status == _Status.error)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  l10n.setup_contact_errorMsg,
                  key: const Key('contact-error'),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
