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

const CREATE_LANGUAGE_WORD = gql`
  mutation CreateLanguageWord($input: CreateLanguageWordInput!) {
    createLanguageWord(input: $input) {
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

const DELETE_LANGUAGE_WORD = gql`
  mutation DeleteLanguageWord($wordId: String!) {
    deleteLanguageWord(wordId: $wordId) {
      success
      wordId
    }
  }
`;

const UPDATE_USER_SUBSCRIPTION = gql`
  mutation UpdateUserSubscription($input: UpdateUserSubscriptionInput!) {
    updateUserSubscription(input: $input) {
      userId
      tier
      status
    }
  }
`;

export const getAdminAnalytics = async (): Promise<AdminAnalytics> => {
  try {
    console.log('Starting GraphQL query for admin analytics...');
    
    const { data } = await gameClient.query({
      query: GET_ADMIN_ANALYTICS,
      fetchPolicy: 'network-only', // Always fetch fresh data
      errorPolicy: 'all', // Return partial data even if there are errors
    });

    console.log('Raw GraphQL response:', JSON.stringify(data, null, 2));

    if (!data || !data.getAdminAnalytics) {
      throw new Error('No data received from GraphQL query');
    }

    const analytics = data.getAdminAnalytics;
    console.log('Processed analytics:', analytics);
    
    return analytics;
  } catch (error) {
    console.error('Failed to fetch admin analytics:', error);
    
    // Return default structure if query fails
    return {
      overview: {
        totalUsers: 0,
        dau: 0,
        mau: 0,
        totalGamesPlayed: 0,
        totalGamesToday: 0,
        totalGamesThisWeek: 0,
        totalGamesThisMonth: 0,
        avgGamesPerUser: 0,
        conversionRate: 0,
      },
      usersByTier: [],
      recentActivity: {
        last24Hours: { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 },
        last7Days: { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 },
        last30Days: { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 },
      },
      topUsers: [],
    };
  }
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

export const updateUserSubscription = async (input: {
  userId: string;
  tier: string;
  status: string;
}): Promise<{ userId: string; tier: string; status: string }> => {
  const { data } = await gameClient.mutate({
    mutation: UPDATE_USER_SUBSCRIPTION,
    variables: { input },
  });

  return data.updateUserSubscription;
};

export const createLanguageWord = async (input: {
  category: string;
  difficulty: string;
  languageCode: string;
  translations: Record<string, { word: string; pronunciation: string }>;
  imageUrl: string;
  distractorImages: string[];
}): Promise<LanguageWordAdmin> => {
  const { data } = await gameClient.mutate({
    mutation: CREATE_LANGUAGE_WORD,
    variables: { input },
  });

  return data.createLanguageWord;
};

export const deleteLanguageWord = async (wordId: string): Promise<{ success: boolean; wordId: string }> => {
  const { data } = await gameClient.mutate({
    mutation: DELETE_LANGUAGE_WORD,
    variables: { wordId },
  });

  return data.deleteLanguageWord;
};
