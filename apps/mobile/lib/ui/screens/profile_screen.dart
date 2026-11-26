import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../subscription/subscription_controller.dart';
import '../../api/feature_providers.dart';
import '../../api/game_providers.dart';
import '../../auth/auth_controller.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../l10n/language_picker.dart';
import '../widgets/section_card.dart';

/// Account tier from the rate-limit lookup; null when it fails. It is shown
/// as plain text: no price, upgrade button or store link.
final accountTierProvider = FutureProvider.autoDispose<String?>((ref) async {
  try {
    final can = await ref.watch(gameApiProvider).canStartGame();
    return can.rateLimit?.tier;
  } catch (_) {
    return null;
  }
});

String _tierText(String tier) =>
    tier.isEmpty ? tier : tier[0].toUpperCase() + tier.substring(1).toLowerCase();

/// Account details, daily-digest email toggle, language, contact and sign out.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _loading = true;
  bool _saving = false;
  bool _digest = false;
  bool _loadFailed = false;
  bool _saveFailed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadFailed = false;
    });
    try {
      final prefs = await ref.read(profileApiProvider).getEmailPrefs();
      if (!mounted) return;
      setState(() {
        _digest = prefs.dailyDigest;
        _loading = false;
      });
    } catch (_) {
      // Web treats a missing record as "no prefs yet" and shows the switch off.
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadFailed = true;
      });
    }
  }

  Future<void> _toggle(bool value) async {
    setState(() {
      _saving = true;
      _saveFailed = false;
    });
    try {
      final prefs = await ref.read(profileApiProvider).setEmailPrefs(value);
      if (!mounted) return;
      setState(() => _digest = prefs.dailyDigest);
    } catch (_) {
      if (!mounted) return;
      setState(() => _saveFailed = true);
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = ref.watch(authControllerProvider);
    final tier = ref.watch(accountTierProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.profile_title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            SectionCard(
              child: Column(
                children: [
                  const Text('👤', style: TextStyle(fontSize: 56)),
                  const SizedBox(height: 8),
                  Text(
                    auth.displayName ?? auth.username ?? l10n.common_player,
                    key: const Key('profile-name'),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  if (auth.email != null)
                    Text(auth.email!, key: const Key('profile-email')),
                  const Divider(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l10n.profile_accountTier),
                      Text(
                        tier.valueOrNull == null ? '—' : _tierText(tier.valueOrNull!),
                        key: const Key('profile-tier'),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  if (ref.watch(storeSubscriptionsEnabledProvider))
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        key: const Key('profile-plans'),
                        onPressed: () => context.push('/subscription'),
                        child: Text(l10n.mobileSub_viewPlans),
                      ),
                    ),
                ],
              ),
            ),
            SectionCard(
              title: '📧 ${l10n.profile_emailPrefs}',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SwitchListTile(
                    key: const Key('digest-switch'),
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.profile_dailyDigest),
                    subtitle: Text(l10n.profile_dailyDigestDesc),
                    value: _digest,
                    onChanged: _loading || _saving ? null : _toggle,
                  ),
                  if (_digest)
                    Text(l10n.profile_dailyDigestOn,
                        style: const TextStyle(color: Colors.green)),
                  if (_loadFailed)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(l10n.mobileStats_prefsLoadFailed,
                                key: const Key('prefs-load-failed')),
                          ),
                          TextButton(
                            onPressed: _load,
                            child: Text(l10n.common_tryAgain),
                          ),
                        ],
                      ),
                    ),
                  if (_saveFailed)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        l10n.mobileStats_prefsSaveFailed,
                        key: const Key('prefs-save-failed'),
                        style: TextStyle(color: Theme.of(context).colorScheme.error),
                      ),
                    ),
                ],
              ),
            ),
            SectionCard(
              child: Row(
                children: [
                  Expanded(child: Text('🌐 ${l10n.mobileStats_language}')),
                  const LanguagePicker(),
                ],
              ),
            ),
            Card(
              child: ListTile(
                key: const Key('profile-contact'),
                leading: const Text('📬', style: TextStyle(fontSize: 24)),
                title: Text(l10n.nav_contact),
                subtitle: Text(l10n.mobileStats_contactDesc),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/contact'),
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              key: const Key('profile-sign-out'),
              icon: const Icon(Icons.logout),
              label: Text(l10n.mobileStats_signOut),
              onPressed: () => ref.read(authControllerProvider.notifier).signOut(),
            ),
          ],
        ),
      ),
    );
  }
}
