import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'locale_controller.dart';

const Map<String, String> _languageNames = {
  'en': 'English',
  'es': 'Español',
  'pt': 'Português',
};

/// Dropdown to choose the app language; the choice is persisted.
class LanguagePicker extends ConsumerWidget {
  const LanguagePicker({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(localeControllerProvider);
    return DropdownButton<String>(
      key: const Key('language-picker'),
      value: current.languageCode,
      underline: const SizedBox.shrink(),
      items: [
        for (final l in kSupportedLocales)
          DropdownMenuItem(
            value: l.languageCode,
            child: Text(_languageNames[l.languageCode] ?? l.languageCode),
          ),
      ],
      onChanged: (code) {
        if (code == null) return;
        ref.read(localeControllerProvider.notifier).setLocale(Locale(code));
      },
    );
  }
}
