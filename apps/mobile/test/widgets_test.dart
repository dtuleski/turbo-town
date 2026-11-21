import 'package:dashden_mobile/l10n/gen/app_localizations.dart';
import 'package:dashden_mobile/l10n/language_picker.dart';
import 'package:dashden_mobile/ui/widgets/emoji_tile.dart';
import 'package:dashden_mobile/ui/widgets/error_view.dart';
import 'package:dashden_mobile/ui/widgets/game_scaffold.dart';
import 'package:dashden_mobile/ui/widgets/loading_view.dart';
import 'package:dashden_mobile/ui/widgets/stat_chip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/pump_app.dart';

void main() {
  testWidgets('shared widgets render inside GameScaffold', (tester) async {
    var retried = false;
    await pumpApp(
      tester,
      GameScaffold(
        title: 'Title',
        body: Column(
          children: [
            const StatChip(label: 'Time', value: '12s'),
            EmojiTile(emoji: '🐶', onTap: () {}),
            const Expanded(child: LoadingView(message: 'Loading')),
            Expanded(
              child: ErrorView(
                message: 'Oops',
                retryLabel: 'Retry',
                onRetry: () => retried = true,
              ),
            ),
          ],
        ),
      ),
    );
    expect(find.text('Title'), findsOneWidget);
    expect(find.text('12s'), findsOneWidget);
    expect(find.text('🐶'), findsOneWidget);
    expect(find.text('Loading'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    expect(retried, isTrue);
  });

  testWidgets('pumpApp provides AppLocalizations for the requested locale',
      (tester) async {
    late AppLocalizations l10n;
    await pumpApp(
      tester,
      Builder(builder: (context) {
        l10n = AppLocalizations.of(context);
        return const Scaffold(body: LanguagePicker());
      }),
      locale: const Locale('es'),
    );
    expect(l10n.localeName, 'es');
    expect(find.text('Español'), findsOneWidget);
  });
}
