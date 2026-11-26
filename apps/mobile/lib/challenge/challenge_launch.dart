import '../api/challenge_models.dart';
import '../api/quest_models.dart';

/// Where a failed challenge start or an unusable challenge sends the player
/// (web `CHALLENGE_FAILED_URL`; the app hub is `/`).
const String kChallengeFailedPath = '/?challengeFailed=1';

/// The day of a play route's `challenge=<YYYY-MM-DD>` parameter, or null.
/// A valid `quest` parameter wins, so the challenge is ignored next to it
/// (business rule BR-W5). The app does not check that the day is today: the
/// server does.
String? parseChallengeParam(Map<String, String> query) {
  if (QuestContext.parse(query['quest']) != null) return null;
  final raw = query['challenge'];
  return isChallengeDay(raw) ? raw : null;
}

/// The content of [challenge] when it is the challenge of [day] for the game
/// with content type [C], else null (web `selectChallengeContent`).
C? selectChallengeContent<C extends ChallengeContent>(DailyChallengeView? challenge, String day) {
  if (challenge == null || challenge.day != day) return null;
  final content = challenge.content;
  if (content is! C || content.kind != challenge.gameId) return null;
  return content;
}

const Map<int, String> _difficultyNames = {1: 'easy', 2: 'medium', 3: 'hard'};

/// Screen difficulty name for a challenge difficulty number (2 = medium).
String challengeDifficultyName(int difficulty) => _difficultyNames[difficulty] ?? 'medium';
