import { graphqlRequest } from './client';

export interface LanguageWord {
  id: string;
  word: string;
  pronunciation: string;
  correctImageUrl: string;
  distractorImages: string[];
  category: string;
}

export interface LanguageProgress {
  languageCode: string;
  xp: number;
  level: number;
  wordsLearned: number;
  accuracy: number;
  lastPlayed: string;
}

export interface LanguageGameResult {
  gameId: string;
  languageCode: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  difficulty: string;
  category: string;
  timeSpent: number;
  xpGained: number;
}

// Get words for a specific language, category, and difficulty
export async function getLanguageWords(
  languageCode: string,
  category: string,
  difficulty: string,
  count: number
): Promise<LanguageWord[]> {
  const query = `
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
  `;

  const variables = { languageCode, category, difficulty, count };
  const response = await graphqlRequest(query, variables);
  return response.getLanguageWords;
}

// Save language game result
export async function saveLanguageGameResult(gameResult: Omit<LanguageGameResult, 'gameId'>): Promise<LanguageGameResult> {
  const mutation = `
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
  `;

  const variables = { input: gameResult };
  const response = await graphqlRequest(mutation, variables);
  return response.saveLanguageGameResult;
}

// Get user's language learning progress
export async function getUserLanguageProgress(): Promise<LanguageProgress[]> {
  const query = `
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
  `;

  const response = await graphqlRequest(query);
  return response.getUserLanguageProgress;
}

// Get user's progress for a specific language
export async function getLanguageProgressByCode(languageCode: string): Promise<LanguageProgress | null> {
  const query = `
    query GetLanguageProgressByCode($languageCode: String!) {
      getLanguageProgressByCode(languageCode: $languageCode) {
        languageCode
        xp
        level
        wordsLearned
        accuracy
        lastPlayed
      }
    }
  `;

  const variables = { languageCode };
  const response = await graphqlRequest(query, variables);
  return response.getLanguageProgressByCode;
}

// Get user's country from IP (for language restrictions)
export async function getUserCountry(): Promise<string> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || 'US';
  } catch (error) {
    console.error('Failed to get user country:', error);
    return 'US'; // Default fallback
  }
}