import 'dart:math';

/// Pronunciation scoring. Direct port of apps/web
/// `utils/pronunciationScoring.ts`: Double Metaphone (60%) plus Levenshtein
/// similarity (40%), then a confidence-aware curve.

// ── Double Metaphone (simplified, as on web) ─────────────────────────────────

/// [primary, alternate] codes of [word].
///
/// Like the JavaScript original, a position past the end reads as an empty
/// string and `'AEIOU'.contains('')` is true, so a trailing W or Y is kept.
(String, String) doubleMetaphone(String word) {
  if (word.isEmpty) return ('', '');
  // JavaScript upper-cases ß to SS; Dart leaves it, so do it here.
  final input = word.replaceAll('ß', 'ss').toUpperCase().trim();
  final primary = StringBuffer();
  final alternate = StringBuffer();
  var pos = 0;
  final length = input.length;

  String charAt(int p) => (p >= 0 && p < length) ? input[p] : '';
  bool isVowel(String ch) => 'AEIOU'.contains(ch);
  bool soft(String ch) => ch == 'I' || ch == 'E' || ch == 'Y';
  void add(String p, [String? a]) {
    primary.write(p);
    alternate.write(a ?? p);
  }

  if (const ['GN', 'KN', 'PN', 'AE', 'WR'].any(input.startsWith)) pos = 1;
  if (charAt(0) == 'X') {
    add('S');
    pos = 1;
  }

  while (pos < length && (primary.length < 4 || alternate.length < 4)) {
    final ch = charAt(pos);
    if (isVowel(ch)) {
      if (pos == 0) add('A');
      pos++;
      continue;
    }
    switch (ch) {
      case 'B':
        add('P');
        pos += charAt(pos + 1) == 'B' ? 2 : 1;
      case 'C':
        add(soft(charAt(pos + 1)) ? 'S' : 'K');
        pos += charAt(pos + 1) == 'C' ? 2 : 1;
      case 'D':
        if (charAt(pos + 1) == 'G' && soft(charAt(pos + 2))) {
          add('J');
          pos += 3;
        } else {
          add('T');
          pos += charAt(pos + 1) == 'D' ? 2 : 1;
        }
      case 'F':
        add('F');
        pos += charAt(pos + 1) == 'F' ? 2 : 1;
      case 'G':
        if (charAt(pos + 1) == 'H') {
          if (pos + 2 < length && !isVowel(charAt(pos + 2))) {
            pos += 2;
          } else {
            add('K');
            pos += 2;
          }
        } else if (soft(charAt(pos + 1))) {
          add('J', 'K');
          pos += 2;
        } else {
          add('K');
          pos += charAt(pos + 1) == 'G' ? 2 : 1;
        }
      case 'H':
        if (isVowel(charAt(pos + 1)) && !isVowel(charAt(pos - 1))) add('H');
        pos++;
      case 'J':
        add('J', 'H');
        pos++;
      case 'K':
        add('K');
        pos += charAt(pos + 1) == 'K' ? 2 : 1;
      case 'L':
        add('L');
        pos += charAt(pos + 1) == 'L' ? 2 : 1;
      case 'M':
        add('M');
        pos += charAt(pos + 1) == 'M' ? 2 : 1;
      case 'N':
        add('N');
        pos += charAt(pos + 1) == 'N' ? 2 : 1;
      case 'P':
        if (charAt(pos + 1) == 'H') {
          add('F');
          pos += 2;
        } else {
          add('P');
          pos += charAt(pos + 1) == 'P' ? 2 : 1;
        }
      case 'Q':
        add('K');
        pos += charAt(pos + 1) == 'Q' ? 2 : 1;
      case 'R':
        add('R');
        pos += charAt(pos + 1) == 'R' ? 2 : 1;
      case 'S':
        if (charAt(pos + 1) == 'H') {
          add('X');
          pos += 2;
        } else if (charAt(pos + 1) == 'C' && soft(charAt(pos + 2))) {
          add('S');
          pos += 3;
        } else {
          add('S');
          pos += charAt(pos + 1) == 'S' ? 2 : 1;
        }
      case 'T':
        if (charAt(pos + 1) == 'H') {
          add('0', 'T');
          pos += 2;
        } else {
          add('T');
          pos += charAt(pos + 1) == 'T' ? 2 : 1;
        }
      case 'V':
        add('F');
        pos += charAt(pos + 1) == 'V' ? 2 : 1;
      case 'W':
      case 'Y':
        if (isVowel(charAt(pos + 1))) add(ch);
        pos++;
      case 'X':
        add('KS');
        pos += charAt(pos + 1) == 'X' ? 2 : 1;
      case 'Z':
        add('S');
        pos += charAt(pos + 1) == 'Z' ? 2 : 1;
      case 'Ç':
        add('S');
        pos++;
      case 'Ñ':
        add('N');
        pos++;
      default:
        pos++;
    }
  }
  String cut(StringBuffer b) {
    final s = b.toString();
    return s.length > 4 ? s.substring(0, 4) : s;
  }

  return (cut(primary), cut(alternate));
}

// ── Levenshtein ──────────────────────────────────────────────────────────────

int levenshteinDistance(String a, String b) {
  if (a.isEmpty) return b.length;
  if (b.isEmpty) return a.length;
  var prev = List<int>.generate(b.length + 1, (j) => j);
  for (var i = 1; i <= a.length; i++) {
    final row = List<int>.filled(b.length + 1, 0);
    row[0] = i;
    for (var j = 1; j <= b.length; j++) {
      final cost = a[i - 1] == b[j - 1] ? 0 : 1;
      row[j] = min(min(prev[j] + 1, row[j - 1] + 1), prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[b.length];
}

/// 1 for identical text, 0 for nothing in common (case-insensitive).
double stringSimilarity(String a, String b) {
  if (a == b) return 1;
  if (a.isEmpty || b.isEmpty) return 0;
  final distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return 1 - distance / max(a.length, b.length);
}

// ── Script detection ─────────────────────────────────────────────────────────

const String _accented = 'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüýÿ';
const String _plain = 'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy';

String _stripAccents(String s) {
  final out = StringBuffer();
  for (final r in s.runes) {
    final ch = String.fromCharCode(r);
    final i = _accented.indexOf(ch);
    if (i >= 0) {
      out.write(_plain[i]);
    } else if (r >= 0x300 && r <= 0x36f) {
      // combining accent: dropped
    } else {
      out.write(ch);
    }
  }
  return out.toString();
}

/// True for words in the Latin alphabet (A-Z plus common accents). Greek,
/// Cyrillic and others are false.
bool isLatinScript(String word) {
  final stripped = _stripAccents(word).toLowerCase();
  final hasLatin = RegExp('[a-z]').hasMatch(stripped);
  final letters = stripped.replaceAll(RegExp(r'[^\p{L}]', unicode: true), '');
  final hasNonLatinLetter = RegExp(r'[^\x00-\x7f]').hasMatch(letters);
  return hasLatin && !hasNonLatinLetter;
}

/// Phonetic similarity from 0 to 1. Non-Latin scripts fall back to string
/// similarity because Double Metaphone only knows Latin letters.
double phoneticSimilarity(String expected, String spoken) {
  if (!isLatinScript(expected) || !isLatinScript(spoken)) {
    return stringSimilarity(expected, spoken);
  }
  final (ep, ea) = doubleMetaphone(expected);
  final (sp, sa) = doubleMetaphone(spoken);
  if (ep.isEmpty || sp.isEmpty) return stringSimilarity(expected, spoken);
  return [
    stringSimilarity(ep, sp),
    stringSimilarity(ep, sa),
    stringSimilarity(ea, sp),
    stringSimilarity(ea, sa),
  ].reduce(max);
}

// ── Scoring ──────────────────────────────────────────────────────────────────

enum PronunciationFeedback { tryAgain, goodEffort, great, perfect }

/// Feedback band for a 0-100 [score].
PronunciationFeedback getFeedback(num score) {
  if (score >= 91) return PronunciationFeedback.perfect;
  if (score >= 71) return PronunciationFeedback.great;
  if (score >= 41) return PronunciationFeedback.goodEffort;
  return PronunciationFeedback.tryAgain;
}

enum Strictness { normal, strict }

class PronunciationScore {
  const PronunciationScore({
    required this.score,
    required this.graded,
    required this.recognized,
    required this.phoneticScore,
    required this.stringScore,
    required this.recognizedText,
    required this.feedback,
  });

  /// Final score 0-100.
  final int score;

  /// True when recognition confidence was usable, so [score] is an accuracy
  /// grade. False means recognition-only: 100 if the word was heard, else 0.
  final bool graded;

  /// The recognizer heard (about) the right word.
  final bool recognized;
  final double phoneticScore;
  final double stringScore;
  final String recognizedText;
  final PronunciationFeedback feedback;
}

PronunciationScore calculatePronunciationScore(
  String expectedWord,
  String recognizedText, {
  double? confidence,
  Strictness strictness = Strictness.normal,
}) {
  if (recognizedText.trim().isEmpty) {
    return const PronunciationScore(
      score: 0,
      graded: false,
      recognized: false,
      phoneticScore: 0,
      stringScore: 0,
      recognizedText: '',
      feedback: PronunciationFeedback.tryAgain,
    );
  }
  final expected = expectedWord.toLowerCase().trim();
  final spoken = recognizedText.toLowerCase().trim();
  final stringScore = stringSimilarity(expected, spoken);
  final phoneticScore = phoneticSimilarity(expected, spoken);
  final wordMatch = phoneticScore * 0.6 + stringScore * 0.4;
  final strict = strictness == Strictness.strict;
  final confUsable = confidence != null && confidence > 0.3;
  double combined;
  double exponent;
  if (confUsable) {
    final wordWeight = strict ? 0.55 : 0.65;
    combined = wordMatch * wordWeight + confidence * (1 - wordWeight);
    exponent = strict ? 1.6 : 1.25;
  } else {
    combined = wordMatch;
    exponent = strict ? 1.3 : 1.1;
  }
  combined = pow(combined, exponent).toDouble();
  if (wordMatch < 0.5) combined = min(combined, wordMatch);
  final recognized = wordMatch >= 0.5;
  final int score;
  if (confUsable) {
    score = (max(0.0, min(100.0, combined * 100))).round();
  } else {
    score = recognized ? 100 : 0;
  }
  return PronunciationScore(
    score: score,
    graded: confUsable,
    recognized: recognized,
    phoneticScore: phoneticScore,
    stringScore: stringScore,
    recognizedText: spoken,
    feedback: getFeedback(score),
  );
}

/// Locale ids for speech recognition and speech output.
const Map<String, String> kSpeechLocales = {
  'en': 'en-US',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'it': 'it-IT',
  'de': 'de-DE',
  'pt': 'pt-BR',
  'el': 'el-GR',
};

/// Languages where recognition may be less accurate.
const Set<String> kLowAccuracyLanguages = {'el', 'pt'};
