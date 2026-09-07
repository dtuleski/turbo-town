/**
 * Pronunciation Scoring Utility
 * 
 * Calculates a pronunciation accuracy score (0-100) by comparing
 * the recognized speech text against the expected word using both
 * phonetic similarity and string-level similarity.
 * 
 * Approach:
 * - Phonetic comparison via Double Metaphone algorithm (60% weight)
 * - Levenshtein string similarity (40% weight)
 * - Combined score clamped to 0-100
 */

// ============================================================
// Double Metaphone Implementation (simplified for common languages)
// ============================================================

/**
 * Generate Double Metaphone encoding for a word.
 * Returns [primary, alternate] codes.
 * This is a simplified implementation optimized for the
 * vocabulary words used in language learning (short, common words).
 */
export function doubleMetaphone(word: string): [string, string] {
  if (!word || word.length === 0) return ['', ''];

  const input = word.toUpperCase().trim();
  let primary = '';
  let alternate = '';
  let pos = 0;
  const length = input.length;

  // Helper to get char at position
  const charAt = (p: number): string => (p >= 0 && p < length ? input[p] : '');
  const isVowel = (ch: string): boolean => 'AEIOU'.includes(ch);

  // Skip silent initial letters
  if (['GN', 'KN', 'PN', 'AE', 'WR'].some(prefix => input.startsWith(prefix))) {
    pos = 1;
  }

  // Initial X -> S
  if (charAt(0) === 'X') {
    primary += 'S';
    alternate += 'S';
    pos = 1;
  }

  while (pos < length && (primary.length < 4 || alternate.length < 4)) {
    const ch = charAt(pos);

    // Skip vowels unless at start
    if (isVowel(ch)) {
      if (pos === 0) {
        primary += 'A';
        alternate += 'A';
      }
      pos++;
      continue;
    }

    switch (ch) {
      case 'B':
        primary += 'P';
        alternate += 'P';
        pos += charAt(pos + 1) === 'B' ? 2 : 1;
        break;

      case 'C':
        if (['I', 'E', 'Y'].includes(charAt(pos + 1))) {
          primary += 'S';
          alternate += 'S';
        } else {
          primary += 'K';
          alternate += 'K';
        }
        pos += charAt(pos + 1) === 'C' ? 2 : 1;
        break;

      case 'D':
        if (charAt(pos + 1) === 'G' && ['I', 'E', 'Y'].includes(charAt(pos + 2))) {
          primary += 'J';
          alternate += 'J';
          pos += 3;
        } else {
          primary += 'T';
          alternate += 'T';
          pos += charAt(pos + 1) === 'D' ? 2 : 1;
        }
        break;

      case 'F':
        primary += 'F';
        alternate += 'F';
        pos += charAt(pos + 1) === 'F' ? 2 : 1;
        break;

      case 'G':
        if (charAt(pos + 1) === 'H') {
          if (pos + 2 < length && !isVowel(charAt(pos + 2))) {
            pos += 2;
          } else {
            primary += 'K';
            alternate += 'K';
            pos += 2;
          }
        } else if (['I', 'E', 'Y'].includes(charAt(pos + 1))) {
          primary += 'J';
          alternate += 'K';
          pos += 2;
        } else {
          primary += 'K';
          alternate += 'K';
          pos += charAt(pos + 1) === 'G' ? 2 : 1;
        }
        break;

      case 'H':
        if (isVowel(charAt(pos + 1)) && !isVowel(charAt(pos - 1))) {
          primary += 'H';
          alternate += 'H';
        }
        pos++;
        break;

      case 'J':
        primary += 'J';
        alternate += 'H';
        pos++;
        break;

      case 'K':
        primary += 'K';
        alternate += 'K';
        pos += charAt(pos + 1) === 'K' ? 2 : 1;
        break;

      case 'L':
        primary += 'L';
        alternate += 'L';
        pos += charAt(pos + 1) === 'L' ? 2 : 1;
        break;

      case 'M':
        primary += 'M';
        alternate += 'M';
        pos += charAt(pos + 1) === 'M' ? 2 : 1;
        break;

      case 'N':
        primary += 'N';
        alternate += 'N';
        pos += charAt(pos + 1) === 'N' ? 2 : 1;
        break;

      case 'P':
        if (charAt(pos + 1) === 'H') {
          primary += 'F';
          alternate += 'F';
          pos += 2;
        } else {
          primary += 'P';
          alternate += 'P';
          pos += charAt(pos + 1) === 'P' ? 2 : 1;
        }
        break;

      case 'Q':
        primary += 'K';
        alternate += 'K';
        pos += charAt(pos + 1) === 'Q' ? 2 : 1;
        break;

      case 'R':
        primary += 'R';
        alternate += 'R';
        pos += charAt(pos + 1) === 'R' ? 2 : 1;
        break;

      case 'S':
        if (charAt(pos + 1) === 'H') {
          primary += 'X';
          alternate += 'X';
          pos += 2;
        } else if (charAt(pos + 1) === 'C' && ['I', 'E', 'Y'].includes(charAt(pos + 2))) {
          primary += 'S';
          alternate += 'S';
          pos += 3;
        } else {
          primary += 'S';
          alternate += 'S';
          pos += charAt(pos + 1) === 'S' ? 2 : 1;
        }
        break;

      case 'T':
        if (charAt(pos + 1) === 'H') {
          primary += '0';
          alternate += 'T';
          pos += 2;
        } else {
          primary += 'T';
          alternate += 'T';
          pos += charAt(pos + 1) === 'T' ? 2 : 1;
        }
        break;

      case 'V':
        primary += 'F';
        alternate += 'F';
        pos += charAt(pos + 1) === 'V' ? 2 : 1;
        break;

      case 'W':
      case 'Y':
        if (isVowel(charAt(pos + 1))) {
          primary += ch;
          alternate += ch;
        }
        pos++;
        break;

      case 'X':
        primary += 'KS';
        alternate += 'KS';
        pos += charAt(pos + 1) === 'X' ? 2 : 1;
        break;

      case 'Z':
        primary += 'S';
        alternate += 'S';
        pos += charAt(pos + 1) === 'Z' ? 2 : 1;
        break;

      // Handle accented characters common in European languages
      case '\u00C7': // Ç
      case '\u00E7': // ç
        primary += 'S';
        alternate += 'S';
        pos++;
        break;

      case '\u00D1': // Ñ
      case '\u00F1': // ñ
        primary += 'N';
        alternate += 'N';
        pos++;
        break;

      default:
        pos++;
        break;
    }
  }

  return [primary.slice(0, 4), alternate.slice(0, 4)];
}

// ============================================================
// Levenshtein Distance
// ============================================================

/**
 * Calculate Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits.
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix: number[][] = [];

  for (let i = 0; i <= aLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[aLen][bLen];
}

/**
 * Calculate normalized string similarity (0 to 1).
 * 1 = identical, 0 = completely different.
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

// ============================================================
// Phonetic Similarity
// ============================================================

/**
 * Calculate phonetic similarity between two words using Double Metaphone.
 * Returns a value from 0 to 1.
 */
export function phoneticSimilarity(expected: string, spoken: string): number {
  const [expectedPrimary, expectedAlt] = doubleMetaphone(expected);
  const [spokenPrimary, spokenAlt] = doubleMetaphone(spoken);

  if (!expectedPrimary || !spokenPrimary) return 0;

  // Check all combinations for best match
  const similarities = [
    stringSimilarity(expectedPrimary, spokenPrimary),
    stringSimilarity(expectedPrimary, spokenAlt),
    stringSimilarity(expectedAlt, spokenPrimary),
    stringSimilarity(expectedAlt, spokenAlt),
  ];

  return Math.max(...similarities);
}

// ============================================================
// Main Scoring Function
// ============================================================

export interface PronunciationScore {
  /** Final score 0-100 */
  score: number;
  /** Phonetic similarity component (0-1) */
  phoneticScore: number;
  /** String similarity component (0-1) */
  stringScore: number;
  /** The text that was recognized */
  recognizedText: string;
  /** Feedback label based on score thresholds */
  feedback: PronunciationFeedback;
}

export type PronunciationFeedback = 'try-again' | 'good-effort' | 'great' | 'perfect';

export interface FeedbackConfig {
  label: string;
  color: string;
  bgColor: string;
  emoji: string;
}

export const FEEDBACK_CONFIG: Record<PronunciationFeedback, FeedbackConfig> = {
  'try-again': {
    label: 'Try Again',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    emoji: '🔄',
  },
  'good-effort': {
    label: 'Good Effort',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    emoji: '👍',
  },
  'great': {
    label: 'Great!',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    emoji: '🌟',
  },
  'perfect': {
    label: 'Perfect!',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    emoji: '🏆',
  },
};

/**
 * Get feedback category based on score.
 */
export function getFeedback(score: number): PronunciationFeedback {
  if (score >= 91) return 'perfect';
  if (score >= 71) return 'great';
  if (score >= 41) return 'good-effort';
  return 'try-again';
}

/**
 * Calculate pronunciation score by comparing recognized speech to expected word.
 * 
 * @param expectedWord - The word the player should have said
 * @param recognizedText - The text recognized by Web Speech API
 * @param confidence - Optional confidence value from Speech API (0-1)
 * @returns PronunciationScore with score 0-100, components, and feedback
 */
export function calculatePronunciationScore(
  expectedWord: string,
  recognizedText: string,
  confidence?: number
): PronunciationScore {
  if (!recognizedText || recognizedText.trim().length === 0) {
    return {
      score: 0,
      phoneticScore: 0,
      stringScore: 0,
      recognizedText: '',
      feedback: 'try-again',
    };
  }

  const expected = expectedWord.toLowerCase().trim();
  const spoken = recognizedText.toLowerCase().trim();

  // Handle multi-word recognition (pick the word closest to expected)
  const spokenWords = spoken.split(/\s+/);
  let bestString = 0;
  let bestPhonetic = 0;
  let bestWord = spoken;

  for (const word of spokenWords) {
    const s = stringSimilarity(expected, word);
    const p = phoneticSimilarity(expected, word);
    const combined = p * 0.6 + s * 0.4;
    const currentBest = bestPhonetic * 0.6 + bestString * 0.4;
    if (combined > currentBest) {
      bestString = s;
      bestPhonetic = p;
      bestWord = word;
    }
  }

  // Also check the full recognized text as-is (for single-word matches)
  const fullString = stringSimilarity(expected, spoken);
  const fullPhonetic = phoneticSimilarity(expected, spoken);
  if (fullPhonetic * 0.6 + fullString * 0.4 > bestPhonetic * 0.6 + bestString * 0.4) {
    bestString = fullString;
    bestPhonetic = fullPhonetic;
    bestWord = spoken;
  }

  // Combine scores: 60% phonetic, 40% string
  let rawScore = (bestPhonetic * 0.6 + bestString * 0.4) * 100;

  // Apply confidence boost if available (slight bonus for high-confidence results)
  if (confidence !== undefined && confidence > 0) {
    rawScore = rawScore * (0.85 + confidence * 0.15);
  }

  // Exact match bonus
  if (expected === bestWord) {
    rawScore = 100;
  }

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  return {
    score,
    phoneticScore: bestPhonetic,
    stringScore: bestString,
    recognizedText: bestWord,
    feedback: getFeedback(score),
  };
}

/**
 * BCP 47 language codes for Web Speech API.
 * Maps our internal language codes to proper speech recognition locale.
 */
export const SPEECH_RECOGNITION_LOCALES: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
  pt: 'pt-BR',
  el: 'el-GR',
};

/**
 * Languages with potentially lower recognition accuracy.
 */
export const LOW_ACCURACY_LANGUAGES = new Set(['el', 'pt']);

/**
 * Check if the browser supports Speech Recognition.
 */
export function isSpeechRecognitionSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}
