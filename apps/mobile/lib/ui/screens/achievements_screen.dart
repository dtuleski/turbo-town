import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../api/feature_providers.dart';
import '../../l10n/gen/app_localizations.dart';
import '../../stats/game_meta.dart';
import '../../stats/stats_logic.dart';
import '../../stats/stats_text.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';

/// Achievements computed on the device from the score history, as on web.
class AchievementsScreen extends ConsumerStatefulWidget {
  const AchievementsScreen({super.key});

  @override
  ConsumerState<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends ConsumerState<AchievementsScreen> {
  AchievementCategory? _category;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final history = ref.watch(scoreHistoryProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.nav_achievements)),
      body: SafeArea(
        child: history.when(
          loading: () => LoadingView(message: l10n.common_loading),
          error: (_, __) => ErrorView(
            message: l10n.mobileStats_historyLoadFailed,
            retryLabel: l10n.common_tryAgain,
            onRetry: () => ref.invalidate(scoreHistoryProvider),
          ),
          data: (data) {
            final results = [for (final a in kAchievements) (a, a.check(data))];
            final unlocked = results.where((r) => r.$2.unlocked).length;
            final total = results.length;
            final pct = (unlocked / total * 100).round();
            final locale = Localizations.localeOf(context).toString();
            final dateFmt = DateFormat.yMd(locale);
            final shownCats = _category == null
                ? AchievementCategory.values
                : [_category!];

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(l10n.mobileStats_overallProgress,
                                  style: const TextStyle(fontWeight: FontWeight.w700)),
                            ),
                            Text(
                              l10n.mobileStats_unlockedCount('$unlocked', '$total'),
                              key: const Key('ach-unlocked'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        LinearProgressIndicator(
                          value: unlocked / total,
                          minHeight: 10,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('🏅 ${l10n.mobileStats_earnedCount('$unlocked')}'),
                            Text('$pct%'),
                            Text(l10n.mobileStats_remainingCount('${total - unlocked}')),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(
                  height: 48,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          key: const Key('ach-cat-all'),
                          selected: _category == null,
                          label: Text(l10n.mobileStats_all),
                          onSelected: (_) => setState(() => _category = null),
                        ),
                      ),
                      for (final c in AchievementCategory.values)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            key: Key('ach-cat-${c.name}'),
                            selected: _category == c,
                            label: Text(
                              '${achievementCategoryIcon(c)} ${achievementCategoryLabel(l10n, c)} '
                              '(${results.where((r) => r.$1.category == c && r.$2.unlocked).length}'
                              '/${results.where((r) => r.$1.category == c).length})',
                            ),
                            onSelected: (_) => setState(() => _category = c),
                          ),
                        ),
                    ],
                  ),
                ),
                for (final cat in shownCats) ...[
                  Padding(
                    padding: const EdgeInsets.only(top: 12, bottom: 8),
                    child: Text(
                      '${achievementCategoryIcon(cat)} ${achievementCategoryLabel(l10n, cat)}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                  ),
                  for (final r in results.where((r) => r.$1.category == cat))
                    _AchievementTile(
                      def: r.$1,
                      result: r.$2,
                      dateText: r.$2.date == null
                          ? null
                          : dateFmt.format(r.$2.date!.toLocal()),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _AchievementTile extends StatelessWidget {
  const _AchievementTile({
    required this.def,
    required this.result,
    required this.dateText,
  });

  final AchievementDef def;
  final AchievementResult result;
  final String? dateText;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final text = achievementText(l10n, def);
    final icon = def.gameType != null ? gameTypeMeta(def.gameType!).icon : def.icon;
    final progress = achievementProgressText(l10n, result);
    return Opacity(
      opacity: result.unlocked ? 1 : 0.55,
      child: Card(
        key: Key('ach-${def.id}'),
        child: ListTile(
          leading: Text(icon, style: const TextStyle(fontSize: 28)),
          title: Row(
            children: [
              Flexible(
                child: Text(text.name,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                    overflow: TextOverflow.ellipsis),
              ),
              if (result.unlocked)
                const Padding(
                  padding: EdgeInsets.only(left: 6),
                  child: Icon(Icons.check_circle, size: 16, color: Colors.green),
                ),
            ],
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(text.description),
              if (result.unlocked && dateText != null)
                Text(l10n.mobileStats_earnedOn(dateText!)),
              if (!result.unlocked && progress != null) Text(progress),
            ],
          ),
        ),
      ),
    );
  }
}
