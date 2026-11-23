import '../l10n/gen/app_localizations.dart';
import 'game_meta.dart';
import 'stats_logic.dart';

/// Localized name and description of an achievement. gen-l10n makes one getter
/// per key, so the id lookup is a switch.
({String name, String description}) achievementText(
  AppLocalizations l,
  AchievementDef a,
) {
  final type = a.gameType;
  if (type != null) {
    final game = gameTypeName(l, type);
    return (
      name: l.mobileStats_masterName(game),
      description: l.mobileStats_masterDesc(game),
    );
  }
  switch (a.id) {
    case 'first-game':
      return (name: l.mobileStats_ach_firstGame_name, description: l.mobileStats_ach_firstGame_desc);
    case 'sharp-shooter':
      return (name: l.mobileStats_ach_sharpShooter_name, description: l.mobileStats_ach_sharpShooter_desc);
    case 'speed-demon':
      return (name: l.mobileStats_ach_speedDemon_name, description: l.mobileStats_ach_speedDemon_desc);
    case 'explorer':
      return (name: l.mobileStats_ach_explorer_name, description: l.mobileStats_ach_explorer_desc);
    case 'high-roller':
      return (name: l.mobileStats_ach_highRoller_name, description: l.mobileStats_ach_highRoller_desc);
    case 'on-fire':
      return (name: l.mobileStats_ach_onFire_name, description: l.mobileStats_ach_onFire_desc);
    case 'committed':
      return (name: l.mobileStats_ach_committed_name, description: l.mobileStats_ach_committed_desc);
    case 'veteran':
      return (name: l.mobileStats_ach_veteran_name, description: l.mobileStats_ach_veteran_desc);
    case 'legend':
      return (name: l.mobileStats_ach_legend_name, description: l.mobileStats_ach_legend_desc);
    case 'brain-power':
      return (name: l.mobileStats_ach_brainPower_name, description: l.mobileStats_ach_brainPower_desc);
    case 'perfectionist':
      return (name: l.mobileStats_ach_perfectionist_name, description: l.mobileStats_ach_perfectionist_desc);
    case 'world-traveler':
      return (
        name: l.mobileStats_ach_worldTraveler_name,
        description: l.mobileStats_ach_worldTraveler_desc(kMasterGameTypes.length.toString()),
      );
    case 'elite':
      return (name: l.mobileStats_ach_elite_name, description: l.mobileStats_ach_elite_desc);
    case 'hard-mode':
      return (name: l.mobileStats_ach_hardMode_name, description: l.mobileStats_ach_hardMode_desc);
  }
  return (name: a.id, description: '');
}

String achievementCategoryLabel(AppLocalizations l, AchievementCategory c) {
  switch (c) {
    case AchievementCategory.gettingStarted:
      return l.mobileStats_catGettingStarted;
    case AchievementCategory.dedication:
      return l.mobileStats_catDedication;
    case AchievementCategory.mastery:
      return l.mobileStats_catMastery;
    case AchievementCategory.gameSpecific:
      return l.mobileStats_catGameSpecific;
  }
}

String achievementCategoryIcon(AchievementCategory c) {
  switch (c) {
    case AchievementCategory.gettingStarted:
      return '🚀';
    case AchievementCategory.dedication:
      return '💪';
    case AchievementCategory.mastery:
      return '👑';
    case AchievementCategory.gameSpecific:
      return '🎮';
  }
}

String? achievementProgressText(AppLocalizations l, AchievementResult r) {
  switch (r.progressKind) {
    case ProgressKind.none:
      return null;
    case ProgressKind.count:
      return l.mobileStats_progressCount(r.current.toString(), r.target.toString());
    case ProgressKind.games:
      return l.mobileStats_progressGames(r.current.toString(), r.target.toString());
    case ProgressKind.best:
      return l.mobileStats_progressBest(formatNumber(r.current));
    case ProgressKind.bestPercent:
      return l.mobileStats_progressBest('${r.current}%');
    case ProgressKind.fastest:
      return l.mobileStats_progressFastest(formatDuration(r.current.toDouble()));
  }
}
