import 'dart:convert';

import 'civics_data.g.dart';
import 'geo_data.g.dart';
import 'hangman_data.g.dart';
import 'history_data.g.dart';
import 'word_puzzle_data.g.dart';

/// Typed access to the web quiz data. The raw JSON sits in the `*.g.dart`
/// files written by `tools/export_quiz_data.mjs`; each table is parsed once.

class Country {
  const Country({
    required this.name,
    required this.capital,
    required this.flag,
    required this.continent,
    required this.funFact,
  });

  final String name;
  final String capital;
  final String flag;
  final String continent;
  final String funFact;

  factory Country.fromJson(Map<String, dynamic> j) => Country(
        name: j['name'] as String,
        capital: j['capital'] as String,
        flag: j['flag'] as String,
        continent: j['continent'] as String,
        funFact: j['funFact'] as String,
      );
}

class StateProvince {
  const StateProvince({
    required this.name,
    required this.capital,
    required this.country,
    required this.countryFlag,
  });

  final String name;
  final String capital;
  final String country;
  final String countryFlag;

  factory StateProvince.fromJson(Map<String, dynamic> j) => StateProvince(
        name: j['name'] as String,
        capital: j['capital'] as String,
        country: j['country'] as String,
        countryFlag: j['countryFlag'] as String,
      );
}

class GeoData {
  const GeoData({
    required this.countries,
    required this.states,
    required this.silhouettes,
  });

  final List<Country> countries;
  final List<StateProvince> states;

  /// Country name to SVG path data (viewBox 0 0 2000 1001).
  final Map<String, String> silhouettes;
}

class HistoryEvent {
  const HistoryEvent({
    required this.id,
    required this.quote,
    required this.event,
    required this.year,
    required this.era,
    required this.category,
    required this.emoji,
    required this.funFact,
    required this.difficulty,
    this.person,
    this.imageUrl,
  });

  final int id;
  final String quote;
  final String event;
  final int year;
  final String? person;
  final String era;
  final String category;
  final String emoji;
  final String funFact;
  final String? imageUrl;

  /// `easy`, `medium` or `hard`.
  final String difficulty;

  factory HistoryEvent.fromJson(Map<String, dynamic> j) => HistoryEvent(
        id: (j['id'] as num).toInt(),
        quote: j['quote'] as String,
        event: j['event'] as String,
        year: (j['year'] as num).toInt(),
        person: j['person'] as String?,
        era: j['era'] as String,
        category: j['category'] as String,
        emoji: j['emoji'] as String,
        funFact: j['funFact'] as String,
        imageUrl: j['imageUrl'] as String?,
        difficulty: j['difficulty'] as String,
      );
}

class CivicsQuestion {
  const CivicsQuestion({
    required this.id,
    required this.question,
    required this.correctAnswers,
    required this.distractors,
    required this.category,
    required this.subcategory,
    required this.emoji,
    this.funFact,
  });

  final int id;
  final String question;
  final List<String> correctAnswers;
  final List<String> distractors;

  /// `government`, `history` or `civics`.
  final String category;
  final String subcategory;
  final String emoji;
  final String? funFact;

  factory CivicsQuestion.fromJson(Map<String, dynamic> j) => CivicsQuestion(
        id: (j['id'] as num).toInt(),
        question: j['question'] as String,
        correctAnswers: List<String>.from(j['correctAnswers'] as List),
        distractors: List<String>.from(j['distractors'] as List? ?? const []),
        category: j['category'] as String,
        subcategory: j['subcategory'] as String,
        emoji: j['emoji'] as String,
        funFact: j['funFact'] as String?,
      );
}

class HangmanWord {
  const HangmanWord({
    required this.word,
    required this.hint,
    required this.category,
  });

  final String word;
  final String hint;
  final String category;

  factory HangmanWord.fromJson(Map<String, dynamic> j) => HangmanWord(
        word: j['word'] as String,
        hint: j['hint'] as String,
        category: j['category'] as String,
      );
}

GeoData? _geo;
List<HistoryEvent>? _history;
List<CivicsQuestion>? _civics;
Map<String, Map<String, List<HangmanWord>>>? _hangman;
Map<String, Map<String, List<String>>>? _wordPuzzle;

GeoData get geoData => _geo ??= _parseGeo();
List<HistoryEvent> get historyEvents => _history ??= _parseHistory();
List<CivicsQuestion> get civicsQuestions => _civics ??= _parseCivics();

/// Hangman words by language (`en`, `es`, `pt`) and difficulty.
Map<String, Map<String, List<HangmanWord>>> get hangmanWords =>
    _hangman ??= _parseHangman();

/// Word Puzzle lists by language and difficulty.
Map<String, Map<String, List<String>>> get wordPuzzleLists =>
    _wordPuzzle ??= _parseWordPuzzle();

List<Map<String, dynamic>> _maps(Object? list) =>
    (list as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();

GeoData _parseGeo() {
  final j = jsonDecode(kGeoDataJson) as Map<String, dynamic>;
  return GeoData(
    countries: _maps(j['countries']).map(Country.fromJson).toList(),
    states: _maps(j['states']).map(StateProvince.fromJson).toList(),
    silhouettes: Map<String, String>.from(j['silhouettes'] as Map),
  );
}

List<HistoryEvent> _parseHistory() {
  final j = jsonDecode(kHistoryDataJson) as Map<String, dynamic>;
  return _maps(j['events']).map(HistoryEvent.fromJson).toList();
}

List<CivicsQuestion> _parseCivics() {
  final j = jsonDecode(kCivicsDataJson) as Map<String, dynamic>;
  return _maps(j['questions']).map(CivicsQuestion.fromJson).toList();
}

Map<String, Map<String, List<HangmanWord>>> _parseHangman() {
  final j = jsonDecode(kHangmanDataJson) as Map<String, dynamic>;
  return {
    for (final lang in j.entries)
      lang.key: {
        for (final d in (lang.value as Map).entries)
          d.key as String: _maps(d.value).map(HangmanWord.fromJson).toList(),
      },
  };
}

Map<String, Map<String, List<String>>> _parseWordPuzzle() {
  final j = jsonDecode(kWordPuzzleDataJson) as Map<String, dynamic>;
  return {
    for (final lang in j.entries)
      lang.key: {
        for (final d in (lang.value as Map).entries)
          d.key as String: List<String>.from(d.value as List),
      },
  };
}
