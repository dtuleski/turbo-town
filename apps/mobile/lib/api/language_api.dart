import 'package:graphql_flutter/graphql_flutter.dart';

import 'api_errors.dart';

/// Language Learning calls on the game service. Documents mirror apps/web
/// `src/api/language.ts`.

class LanguageWord {
  const LanguageWord({
    required this.id,
    required this.word,
    required this.pronunciation,
    required this.correctImageUrl,
    required this.distractorImages,
    required this.category,
  });

  final String id;
  final String word;
  final String pronunciation;
  final String correctImageUrl;
  final List<String> distractorImages;
  final String category;

  factory LanguageWord.fromJson(Map<String, dynamic> json) => LanguageWord(
        id: json['id'] as String,
        word: json['word'] as String,
        pronunciation: (json['pronunciation'] as String?) ?? '',
        correctImageUrl: (json['correctImageUrl'] as String?) ?? '',
        distractorImages: [
          for (final d in (json['distractorImages'] as List?) ?? const [])
            if (d != null) d as String,
        ],
        category: (json['category'] as String?) ?? '',
      );
}

class LanguageProgress {
  const LanguageProgress({
    required this.languageCode,
    required this.xp,
    required this.level,
    required this.wordsLearned,
    required this.accuracy,
    this.lastPlayed,
  });

  final String languageCode;
  final int xp;
  final int level;
  final int wordsLearned;
  final double accuracy;
  final String? lastPlayed;

  factory LanguageProgress.fromJson(Map<String, dynamic> json) => LanguageProgress(
        languageCode: json['languageCode'] as String,
        xp: (json['xp'] as num?)?.toInt() ?? 0,
        level: (json['level'] as num?)?.toInt() ?? 1,
        wordsLearned: (json['wordsLearned'] as num?)?.toInt() ?? 0,
        accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
        lastPlayed: json['lastPlayed'] as String?,
      );
}

class LanguageGameResult {
  const LanguageGameResult({
    required this.gameId,
    required this.languageCode,
    required this.score,
    required this.correctAnswers,
    required this.totalQuestions,
    required this.difficulty,
    required this.category,
    required this.timeSpent,
    required this.xpGained,
  });

  final String gameId;
  final String languageCode;
  final int score;
  final int correctAnswers;
  final int totalQuestions;
  final String difficulty;
  final String category;
  final int timeSpent;
  final int xpGained;

  factory LanguageGameResult.fromJson(Map<String, dynamic> json) => LanguageGameResult(
        gameId: json['gameId'] as String,
        languageCode: json['languageCode'] as String,
        score: (json['score'] as num).toInt(),
        correctAnswers: (json['correctAnswers'] as num).toInt(),
        totalQuestions: (json['totalQuestions'] as num).toInt(),
        difficulty: json['difficulty'] as String,
        category: json['category'] as String,
        timeSpent: (json['timeSpent'] as num).toInt(),
        xpGained: (json['xpGained'] as num).toInt(),
      );
}

class LanguageApi {
  LanguageApi(this._client);

  final GraphQLClient _client;

  static const String _wordsQuery = r'''
    query GetLanguageWords($languageCode: String!, $category: String!, $difficulty: String!, $count: Int!) {
      getLanguageWords(languageCode: $languageCode, category: $category, difficulty: $difficulty, count: $count) {
        id
        word
        pronunciation
        correctImageUrl
        distractorImages
        category
      }
    }
  ''';

  static const String _saveMutation = r'''
    mutation SaveLanguageGameResult($input: LanguageGameResultInput!) {
      saveLanguageGameResult(input: $input) {
        gameId
        languageCode
        score
        correctAnswers
        totalQuestions
        difficulty
        category
        timeSpent
        xpGained
      }
    }
  ''';

  static const String _progressQuery = r'''
    query GetUserLanguageProgress {
      getUserLanguageProgress {
        languageCode
        xp
        level
        wordsLearned
        accuracy
        lastPlayed
      }
    }
  ''';

  Future<List<LanguageWord>> getLanguageWords({
    required String languageCode,
    required String category,
    required String difficulty,
    required int count,
  }) async {
    final result = await _client.query(QueryOptions(
      document: gql(_wordsQuery),
      variables: {
        'languageCode': languageCode,
        'category': category,
        'difficulty': difficulty,
        'count': count,
      },
      fetchPolicy: FetchPolicy.networkOnly,
    ));
    throwIfGraphQLError(result);
    final list = result.data?['getLanguageWords'] as List?;
    return [
      for (final w in list ?? const []) LanguageWord.fromJson(Map<String, dynamic>.from(w as Map)),
    ];
  }

  /// Not called by the screens (web does not call it either); kept so the
  /// client matches the web API module.
  Future<LanguageGameResult> saveLanguageGameResult(Map<String, dynamic> input) async {
    final result = await _client.mutate(MutationOptions(
      document: gql(_saveMutation),
      variables: {'input': input},
      fetchPolicy: FetchPolicy.noCache,
    ));
    throwIfGraphQLError(result);
    return LanguageGameResult.fromJson(
      Map<String, dynamic>.from(result.data!['saveLanguageGameResult'] as Map),
    );
  }

  Future<List<LanguageProgress>> getUserLanguageProgress() async {
    final result = await _client.query(QueryOptions(
      document: gql(_progressQuery),
      fetchPolicy: FetchPolicy.networkOnly,
    ));
    throwIfGraphQLError(result);
    final list = result.data?['getUserLanguageProgress'] as List?;
    return [
      for (final p in list ?? const [])
        LanguageProgress.fromJson(Map<String, dynamic>.from(p as Map)),
    ];
  }
}
