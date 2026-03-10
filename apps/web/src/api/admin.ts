import { gameClient } from './client';
import { gql } from '@apollo/client';

export interface AdminUserInfo {
  userId: string;
  email: string;
  username: string;
  tier: string;
  gamesPlayed: number;
  lastActive?: string;
  createdAt: string;
  todayPlays: number;
  rateLimit: {
    tier: string;
    limit: number;
    used: number;
    remaining: number;
    resetAt: string;
  };
}

export interface AdminAnalytics {
  overview: {
    totalUsers: number;
    dau: number;
    mau: number;
    totalGamesPlayed: number;
    totalGamesToday: number;
    totalGamesThisWeek: number;
    totalGamesThisMonth: number;
    avgGamesPerUser: number;
    conversionRate: number;
  };
  usersByTier: Array<{
    tier: string;
    count: number;
    percentage: number;
    avgGamesPerUser: number;
    totalRevenue: number;
  }>;
  recentActivity: {
    last24Hours: { uniqueUsers: number; totalGames: number; avgGamesPerUser: number };
    last7Days: { uniqueUsers: number; totalGames: number; avgGamesPerUser: number };
    last30Days: { uniqueUsers: number; totalGames: number; avgGamesPerUser: number };
  };
  topUsers: Array<{
    userId: string;
    username: string;
    email: string;
    tier: string;
    gamesPlayed: number;
    lastActive: string;
  }>;
}

export interface LanguageWordAdmin {
  wordId: string;
  category: string;
  difficulty: string;
  languageCode: string;
  imageUrl: string;
  distractorImages: string[];
  translations: {
    en?: { word: string; pronunciation: string };
    es?: { word: string; pronunciation: string };
    fr?: { word: string; pronunciation: string };
    de?: { word: string; pronunciation: string };
    it?: { word: string; pronunciation: string };
    pt?: { word: string; pronunciation: string };
  };
  createdAt: string;
  updatedAt: string;
}

const GET_ADMIN_ANALYTICS = gql`
  query GetAdminAnalytics {
    getAdminAnalytics {
      overview {
        totalUsers
        dau
        mau
        totalGamesPlayed
        totalGamesToday
        totalGamesThisWeek
        totalGamesThisMonth
        avgGamesPerUser
        conversionRate
      }
      usersByTier {
        tier
        count
        percentage
        avgGamesPerUser
        totalRevenue
      }
      recentActivity {
        last24Hours {
          uniqueUsers
          totalGames
          avgGamesPerUser
        }
        last7Days {
          uniqueUsers
          totalGames
          avgGamesPerUser
        }
        last30Days {
          uniqueUsers
          totalGames
          avgGamesPerUser
        }
      }
      topUsers {
        userId
        username
        email
        tier
        gamesPlayed
        lastActive
      }
    }
  }
`;

const LIST_ALL_USERS = gql`
  query ListAllUsers($input: ListUsersInput) {
    listAllUsers(input: $input) {
      users {
        userId
        email
        username
        tier
        gamesPlayed
        lastActive
        createdAt
        todayPlays
        rateLimit {
          tier
          limit
          used
          remaining
          resetAt
        }
      }
      pagination {
        total
        page
        pageSize
        hasMore
      }
    }
  }
`;

const GET_ALL_LANGUAGE_WORDS = gql`
  query GetAllLanguageWords {
    getAllLanguageWords {
      wordId
      category
      difficulty
      languageCode
      imageUrl
      distractorImages
      translations {
        en {
          word
          pronunciation
        }
        es {
          word
          pronunciation
        }
        fr {
          word
          pronunciation
        }
        de {
          word
          pronunciation
        }
        it {
          word
          pronunciation
        }
        pt {
          word
          pronunciation
        }
      }
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_LANGUAGE_WORD = gql`
  mutation UpdateLanguageWord($input: UpdateLanguageWordInput!) {
    updateLanguageWord(input: $input) {
      wordId
      category
      difficulty
      languageCode
      imageUrl
      distractorImages
      translations {
        en {
          word
          pronunciation
        }
        es {
          word
          pronunciation
        }
        fr {
          word
          pronunciation
        }
        de {
          word
          pronunciation
        }
        it {
          word
          pronunciation
        }
        pt {
          word
          pronunciation
        }
      }
      createdAt
      updatedAt
    }
  }
`;

export const getAdminAnalytics = async (): Promise<AdminAnalytics> => {
  const { data } = await gameClient.query({
    query: GET_ADMIN_ANALYTICS,
    fetchPolicy: 'network-only', // Always fetch fresh data
  });

  return data.getAdminAnalytics;
};

export const listAllUsers = async (input?: {
  page?: number;
  pageSize?: number;
  tier?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<{
  users: AdminUserInfo[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}> => {
  const { data } = await gameClient.query({
    query: LIST_ALL_USERS,
    variables: { input },
    fetchPolicy: 'network-only',
  });

  return data.listAllUsers;
};

export const getAllLanguageWords = async (): Promise<LanguageWordAdmin[]> => {
  const { data } = await gameClient.query({
    query: GET_ALL_LANGUAGE_WORDS,
    fetchPolicy: 'network-only',
  });

  return data.getAllLanguageWords;
};

export const updateLanguageWord = async (input: {
  wordId: string;
  imageUrl?: string;
  distractorImages?: string[];
  translations?: {
    en?: { word: string; pronunciation: string };
    es?: { word: string; pronunciation: string };
    fr?: { word: string; pronunciation: string };
    de?: { word: string; pronunciation: string };
    it?: { word: string; pronunciation: string };
    pt?: { word: string; pronunciation: string };
  };
}): Promise<LanguageWordAdmin> => {
  const { data } = await gameClient.mutate({
    mutation: UPDATE_LANGUAGE_WORD,
    variables: { input },
  });

  return data.updateLanguageWord;
};
