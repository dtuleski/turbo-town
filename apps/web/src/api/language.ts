import { gameClient } from './client';
import { gql } from '@apollo/client';

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

// GraphQL Queries and Mutations
const GET_LANGUAGE_WORDS = gql`
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

const SAVE_LANGUAGE_GAME_RESULT = gql`
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

const GET_USER_LANGUAGE_PROGRESS = gql`
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

// Get words for a specific language, category, and difficulty
export async function getLanguageWords(
  languageCode: string,
  category: string,
  difficulty: string,
  count: number
): Promise<LanguageWord[]> {
  const { data } = await gameClient.query({
    query: GET_LANGUAGE_WORDS,
    variables: { languageCode, category, difficulty, count },
    fetchPolicy: 'network-only',
  });
  return data.getLanguageWords;
}

// Save language game result
export async function saveLanguageGameResult(gameResult: Omit<LanguageGameResult, 'gameId'>): Promise<LanguageGameResult> {
  const { data } = await gameClient.mutate({
    mutation: SAVE_LANGUAGE_GAME_RESULT,
    variables: { input: gameResult },
  });
  return data.saveLanguageGameResult;
}

// Get user's language learning progress
export async function getUserLanguageProgress(): Promise<LanguageProgress[]> {
  const { data } = await gameClient.query({
    query: GET_USER_LANGUAGE_PROGRESS,
    fetchPolicy: 'network-only',
  });
  return data.getUserLanguageProgress;
}

// Get user's progress for a specific language
export async function getLanguageProgressByCode(languageCode: string): Promise<LanguageProgress | null> {
  const GET_LANGUAGE_PROGRESS_BY_CODE = gql`
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

  const { data } = await gameClient.query({
    query: GET_LANGUAGE_PROGRESS_BY_CODE,
    variables: { languageCode },
    fetchPolicy: 'network-only',
  });
  return data.getLanguageProgressByCode;
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