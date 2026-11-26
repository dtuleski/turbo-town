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

/// Launch table (web `CHALLENGE_LAUNCH_TABLE`): server theme id -> play
/// route, for the games with an app challenge mode.
const Map<String, String> kChallengeLaunchTable = {
  'CODE_A_BOT': '/code-a-bot/play',
  'SUDOKU': '/sudoku/play',
  'MATH_CHALLENGE': '/math-challenge/play',
  'MATH_MAZE': '/math-maze/play',
  'WORD_PUZZLE': '/word-puzzle/play',
  'HANGMAN': '/hangman/play',
};

/// The play path of [challenge]: `<route>?difficulty=medium&challenge=<day>`
/// (web `buildChallengeUrl`). Null for a theme without an app challenge mode
/// or an invalid day.
String? buildChallengePath(DailyChallengeView challenge) {
  final route = kChallengeLaunchTable[challenge.themeId];
  if (route == null || !isChallengeDay(challenge.day)) return null;
  return Uri(path: route, queryParameters: {'difficulty': 'medium', 'challenge': challenge.day}).toString();
}

/// The results screen of [day] (the digest push route).
String challengeResultsPath(String day) => Uri(path: '/challenge/results', queryParameters: {'day': day}).toString();
