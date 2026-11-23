import 'dart:math';

import '../data/quiz_data.dart';

/// One multiple-choice question for the shared quiz engine.
class QuizQuestion {
  const QuizQuestion({
    required this.prompt,
    required this.correctAnswer,
    required this.options,
    this.promptEmoji,
    this.imageUrl,
    this.funFact,
    this.hint1,
    this.hint2,
    this.silhouette = false,
    this.label,
  });

  final String prompt;
  final String? promptEmoji;
  final String? imageUrl;
  final String correctAnswer;
  final List<String> options;
  final String? funFact;

  /// Shown after 5 seconds.
  final String? hint1;

  /// Shown after 10 seconds.
  final String? hint2;

  /// True when [prompt] is a country name to draw as a silhouette.
  final bool silhouette;

  /// Small caption above the prompt (the civics subcategory).
  final String? label;
}

List<T> _shuffle<T>(List<T> items, Random rng) => [...items]..shuffle(rng);

List<T> _pickRandom<T>(List<T> items, int count, Random rng, [List<T> exclude = const []]) {
  final filtered = items.where((e) => !exclude.contains(e)).toList();
  return _shuffle(filtered, rng).take(count).toList();
}

T _any<T>(List<T> items, Random rng) => items[rng.nextInt(items.length)];

// ── Geography (web utils/geoQuizData.ts) ─────────────────────────────────────

enum GeoMode { capitals, flags, states, silhouettes, continents }

GeoMode? geoModeFromId(String? id) {
  for (final m in GeoMode.values) {
    if (m.name == id) return m;
  }
  return null;
}

/// Modes a difficulty offers (web `DIFFICULTY_MODES`).
const Map<String, List<GeoMode>> kGeoDifficultyModes = {
  'easy': [GeoMode.capitals, GeoMode.flags, GeoMode.continents],
  'medium': [GeoMode.states],
  'hard': [GeoMode.silhouettes],
};

const List<String> _allContinents = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Central America',
  'Oceania',
];

QuizQuestion generateCapitalQuestion(List<Country> countries, Random rng) {
  final country = _any(countries, rng);
  final wrong = _pickRandom(countries.map((c) => c.capital).toList(), 3, rng, [country.capital]);
  return QuizQuestion(
    prompt: 'What is the capital of ${country.name}?',
    promptEmoji: country.flag,
    correctAnswer: country.capital,
    options: _shuffle([country.capital, ...wrong], rng),
    funFact: country.funFact,
    hint1: "It's in ${country.continent}",
    hint2: 'Starts with "${country.capital[0]}"',
  );
}

QuizQuestion generateFlagQuestion(List<Country> countries, Random rng) {
  final country = _any(countries, rng);
  final wrong = _pickRandom(countries.map((c) => c.name).toList(), 3, rng, [country.name]);
  return QuizQuestion(
    prompt: 'Which country has this flag?',
    promptEmoji: country.flag,
    correctAnswer: country.name,
    options: _shuffle([country.name, ...wrong], rng),
    funFact: country.funFact,
    hint1: "It's in ${country.continent}",
    hint2: 'Capital: ${country.capital}',
  );
}

QuizQuestion generateContinentQuestion(List<Country> countries, Random rng) {
  final country = _any(countries, rng);
  final wrong = _pickRandom(_allContinents, 3, rng, [country.continent]);
  return QuizQuestion(
    prompt: 'Which continent is ${country.name} in?',
    promptEmoji: country.flag,
    correctAnswer: country.continent,
    options: _shuffle([country.continent, ...wrong], rng),
    funFact: country.funFact,
    hint1: 'Capital: ${country.capital}',
    hint2: 'Starts with "${country.continent[0]}"',
  );
}

QuizQuestion generateStateQuestion(List<StateProvince> states, Random rng) {
  final state = _any(states, rng);
  final sameCountry = states.where((s) => s.country == state.country).toList();
  final wrong = _pickRandom(sameCountry.map((s) => s.capital).toList(), 3, rng, [state.capital]);
  // Not enough in the same country: fill from every state.
  var guard = 0;
  while (wrong.length < 3 && guard++ < 500) {
    final extra = _any(states, rng);
    if (extra.capital != state.capital && !wrong.contains(extra.capital)) {
      wrong.add(extra.capital);
    }
  }
  return QuizQuestion(
    prompt: 'What is the capital of ${state.name}?',
    promptEmoji: state.countryFlag,
    correctAnswer: state.capital,
    options: _shuffle([state.capital, ...wrong.take(3)], rng),
    funFact: '${state.name} is in ${state.country}',
    hint1: "It's in ${state.country} ${state.countryFlag}",
    hint2: 'Starts with "${state.capital[0]}"',
  );
}

QuizQuestion generateSilhouetteQuestion(
  List<Country> countries,
  Map<String, String> silhouettes,
  Random rng,
) {
  final withShape = countries.where((c) => silhouettes.containsKey(c.name)).toList();
  final pool = withShape.isNotEmpty ? withShape : countries;
  final country = _any(pool, rng);
  final wrong = _pickRandom(pool.map((c) => c.name).toList(), 3, rng, [country.name]);
  var guard = 0;
  while (wrong.length < 3 && guard++ < 500) {
    final extra = _any(countries, rng);
    if (extra.name != country.name && !wrong.contains(extra.name)) wrong.add(extra.name);
  }
  return QuizQuestion(
    prompt: country.name,
    promptEmoji: '🗺',
    correctAnswer: country.name,
    options: _shuffle([country.name, ...wrong.take(3)], rng),
    funFact: country.funFact,
    hint1: "It's in ${country.continent}",
    hint2: 'Capital: ${country.capital}',
    silhouette: true,
  );
}

List<QuizQuestion> generateGeoQuestions(GeoMode mode, int count, Random rng, [GeoData? data]) {
  final d = data ?? geoData;
  final out = <QuizQuestion>[];
  final used = <String>{};
  for (var i = 0; i < count; i++) {
    late QuizQuestion q;
    var attempts = 0;
    do {
      q = switch (mode) {
        GeoMode.capitals => generateCapitalQuestion(d.countries, rng),
        GeoMode.flags => generateFlagQuestion(d.countries, rng),
        GeoMode.continents => generateContinentQuestion(d.countries, rng),
        GeoMode.states => generateStateQuestion(d.states, rng),
        GeoMode.silhouettes => generateSilhouetteQuestion(d.countries, d.silhouettes, rng),
      };
      attempts++;
    } while (used.contains(q.prompt) && attempts < 30);
    used.add(q.prompt);
    out.add(q);
  }
  return out;
}

// ── History (web utils/historyQuizData.ts) ───────────────────────────────────

enum HistoryMode { nameEvent, whenHappened, whoSaid }

/// Id used in routes, same strings as web.
String historyModeId(HistoryMode m) => switch (m) {
      HistoryMode.nameEvent => 'name-event',
      HistoryMode.whenHappened => 'when-happened',
      HistoryMode.whoSaid => 'who-said',
    };

HistoryMode? historyModeFromId(String? id) {
  for (final m in HistoryMode.values) {
    if (historyModeId(m) == id) return m;
  }
  return null;
}

const Map<String, List<HistoryMode>> kHistoryDifficultyModes = {
  'easy': [HistoryMode.nameEvent],
  'medium': [HistoryMode.nameEvent, HistoryMode.whenHappened],
  'hard': [HistoryMode.nameEvent, HistoryMode.whenHappened, HistoryMode.whoSaid],
};

/// Events for a difficulty: easy = easy only, medium = easy + medium, hard = all.
List<HistoryEvent> historyEventsForDifficulty(String difficulty, [List<HistoryEvent>? all]) {
  final events = all ?? historyEvents;
  if (difficulty == 'easy') return events.where((e) => e.difficulty == 'easy').toList();
  if (difficulty == 'medium') return events.where((e) => e.difficulty != 'hard').toList();
  return events;
}

String _yearLabel(int year) => year < 0 ? '${year.abs()} BC' : '$year';

String _decadeLabel(int year) {
  final decade = (year / 10).floor() * 10;
  return year < 0 ? '${decade.abs()}s BC' : '${decade}s';
}

QuizQuestion generateNameEventQuestion(List<HistoryEvent> events, Random rng) {
  final event = _any(events, rng);
  final wrong = _pickRandom(events.map((e) => e.event).toList(), 3, rng, [event.event]);
  return QuizQuestion(
    prompt: '"${event.quote}"',
    promptEmoji: event.emoji,
    imageUrl: event.imageUrl,
    correctAnswer: event.event,
    options: _shuffle([event.event, ...wrong], rng),
    funFact: event.funFact,
    hint1: event.person != null ? 'Said by ${event.person}' : 'From the ${event.era} era',
    hint2: 'Year: ${_yearLabel(event.year)}',
  );
}

QuizQuestion generateWhenHappenedQuestion(List<HistoryEvent> events, Random rng) {
  final event = _any(events, rng);
  final correct = _decadeLabel(event.year);
  final wrong = <String>[];
  for (final offset in _shuffle(const [-300, -100, -50, 50, 100, 300], rng)) {
    final decade = _decadeLabel(event.year + offset);
    if (decade != correct && !wrong.contains(decade)) wrong.add(decade);
    if (wrong.length >= 3) break;
  }
  return QuizQuestion(
    prompt: 'When did this happen?\n"${event.quote}"',
    promptEmoji: event.emoji,
    imageUrl: event.imageUrl,
    correctAnswer: correct,
    options: _shuffle([correct, ...wrong.take(3)], rng),
    funFact: event.funFact,
    hint1: 'Event: ${event.event}',
    hint2: event.person != null ? 'By ${event.person}' : null,
  );
}

QuizQuestion generateWhoSaidQuestion(List<HistoryEvent> events, Random rng) {
  final withPerson = events.where((e) => e.person != null).toList();
  final event = _any(withPerson, rng);
  final wrong = _pickRandom(withPerson.map((e) => e.person!).toList(), 3, rng, [event.person!]);
  return QuizQuestion(
    prompt: 'Who said this?\n"${event.quote}"',
    promptEmoji: event.emoji,
    imageUrl: event.imageUrl,
    correctAnswer: event.person!,
    options: _shuffle([event.person!, ...wrong], rng),
    funFact: event.funFact,
    hint1: 'Event: ${event.event}',
    hint2: 'Year: ${_yearLabel(event.year)}',
  );
}

List<QuizQuestion> generateHistoryQuestions(
  HistoryMode mode,
  String difficulty,
  int count,
  Random rng, [
  List<HistoryEvent>? data,
]) {
  final events = historyEventsForDifficulty(difficulty, data);
  final out = <QuizQuestion>[];
  final used = <String>{};
  for (var i = 0; i < count; i++) {
    late QuizQuestion q;
    var attempts = 0;
    do {
      q = switch (mode) {
        HistoryMode.nameEvent => generateNameEventQuestion(events, rng),
        HistoryMode.whenHappened => generateWhenHappenedQuestion(events, rng),
        HistoryMode.whoSaid => generateWhoSaidQuestion(events, rng),
      };
      attempts++;
    } while (used.contains(q.correctAnswer) && attempts < 30);
    used.add(q.correctAnswer);
    out.add(q);
  }
  return out;
}

// ── Civics (web utils/civicsQuizData.ts) ─────────────────────────────────────

enum CivicsCategory { all, government, history, civics }

CivicsCategory? civicsCategoryFromId(String? id) {
  for (final c in CivicsCategory.values) {
    if (c.name == id) return c;
  }
  return null;
}

/// Civics quiz levels: question count per level (web setup page).
const Map<String, int> kCivicsLevelQuestions = {'easy': 6, 'medium': 10, 'hard': 20};

/// Questions a category can supply (web does not cap the round; mobile does).
int civicsPoolSize(CivicsCategory category, [List<CivicsQuestion>? data]) {
  final all = data ?? civicsQuestions;
  if (category == CivicsCategory.all) return all.length;
  return all.where((q) => q.category == category.name).length;
}

List<QuizQuestion> generateCivicsQuestions(
  CivicsCategory category,
  int count,
  Random rng, [
  List<CivicsQuestion>? data,
]) {
  final all = data ?? civicsQuestions;
  final pool = category == CivicsCategory.all
      ? all
      : all.where((q) => q.category == category.name).toList();
  return _shuffle(pool, rng).take(count).map((q) {
    final correct = _any(q.correctAnswers, rng);
    final wrongs = _shuffle(
      q.distractors.where((w) => !q.correctAnswers.contains(w)).toList(),
      rng,
    ).take(3).toList();
    return QuizQuestion(
      prompt: q.question,
      promptEmoji: q.emoji,
      correctAnswer: correct,
      options: _shuffle([correct, ...wrongs], rng),
      funFact: q.funFact,
      label: q.subcategory,
    );
  }).toList();
}
