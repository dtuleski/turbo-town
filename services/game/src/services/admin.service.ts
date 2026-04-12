import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
const cognitoClient = new CognitoIdentityProviderClient({});

const GAMES_TABLE = process.env.GAMES_TABLE_NAME!;
const RATE_LIMITS_TABLE = process.env.RATE_LIMITS_TABLE_NAME!;
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE_NAME!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

interface AdminUserInfo {
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

interface AdminAnalytics {
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

export class AdminService {
  /**
   * Get comprehensive admin analytics
   */
  async getAdminAnalytics(): Promise<AdminAnalytics> {
    console.log('AdminService: Starting getAdminAnalytics');
    
    const [
      allGames,
      allRateLimits,
      allSubscriptions,
      cognitoUsers
    ] = await Promise.all([
      this.getAllGames(),
      this.getAllRateLimits(),
      this.getAllSubscriptions(),
      this.getCognitoUsers()
    ]);

    console.log('AdminService: Data retrieved:', {
      gamesCount: allGames.length,
      rateLimitsCount: allRateLimits.length,
      subscriptionsCount: allSubscriptions.length,
      cognitoUsersCount: cognitoUsers.length
    });

    // Calculate date ranges
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log('AdminService: Date ranges:', { today, weekAgo, monthAgo });

    // Filter games by time period
    const gamesToday = allGames.filter((g: any) => g.startedAt?.startsWith(today));
    const gamesThisWeek = allGames.filter((g: any) => g.startedAt >= weekAgo);
    const gamesThisMonth = allGames.filter((g: any) => g.startedAt >= monthAgo);

    console.log('AdminService: Filtered games:', {
      gamesToday: gamesToday.length,
      gamesThisWeek: gamesThisWeek.length,
      gamesThisMonth: gamesThisMonth.length
    });

    // Calculate DAU (unique users today)
    const dauUsers = new Set(gamesToday.map((g: any) => g.userId));
    const dau = dauUsers.size;

    // Calculate MAU estimate (unique users this month)
    const mauUsers = new Set(gamesThisMonth.map((g: any) => g.userId));
    const mau = mauUsers.size;

    // Total users
    const totalUsers = cognitoUsers.length;

    console.log('AdminService: Calculated metrics:', {
      totalUsers,
      dau,
      mau,
      totalGamesPlayed: allGames.length
    });

    // Games per user
    const gamesPerUser: Record<string, number> = {};
    allGames.forEach((game: any) => {
      gamesPerUser[game.userId] = (gamesPerUser[game.userId] || 0) + 1;
    });

    const avgGamesPerUser = totalUsers > 0 
      ? Object.values(gamesPerUser).reduce((sum, count) => sum + count, 0) / totalUsers 
      : 0;

    // Users by tier
    const tierCounts: Record<string, number> = { FREE: 0, LIGHT: 0, BASIC: 0, STANDARD: 0, PREMIUM: 0 };
    const tierGames: Record<string, number[]> = { FREE: [], LIGHT: [], BASIC: [], STANDARD: [], PREMIUM: [] };
    
    // Map subscriptions
    const userTiers: Record<string, string> = {};
    allSubscriptions.forEach((sub: any) => {
      userTiers[sub.userId] = sub.tier || 'FREE';
    });

    // Count users by tier and games
    cognitoUsers.forEach((user: any) => {
      const tier = userTiers[user.userId] || 'FREE';
      const normalizedTier = this.normalizeTier(tier);
      tierCounts[normalizedTier]++;
      
      const userGames = gamesPerUser[user.userId] || 0;
      tierGames[normalizedTier].push(userGames);
    });

    const usersByTier = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
      avgGamesPerUser: tierGames[tier].length > 0
        ? tierGames[tier].reduce((sum, g) => sum + g, 0) / tierGames[tier].length
        : 0,
      totalRevenue: this.calculateTierRevenue(tier, count)
    }));

    // Conversion rate (paid users / total users)
    const paidUsers = tierCounts.BASIC + tierCounts.STANDARD + tierCounts.PREMIUM;
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

    // Recent activity
    const recentActivity = {
      last24Hours: this.calculateActivityPeriod(gamesToday),
      last7Days: this.calculateActivityPeriod(gamesThisWeek),
      last30Days: this.calculateActivityPeriod(gamesThisMonth)
    };

    // Top users
    const topUsers = Object.entries(gamesPerUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, gamesPlayed]) => {
        const user = cognitoUsers.find((u: any) => u.userId === userId);
        const rateLimit = allRateLimits.find((r: any) => r.userId === userId);
        return {
          userId,
          username: user?.username || 'Unknown',
          email: user?.email || 'Unknown',
          tier: userTiers[userId] || 'FREE',
          gamesPlayed,
          lastActive: rateLimit?.updatedAt || user?.createdAt || new Date().toISOString()
        };
      });

    return {
      overview: {
        totalUsers,
        dau,
        mau,
        totalGamesPlayed: allGames.length,
        totalGamesToday: gamesToday.length,
        totalGamesThisWeek: gamesThisWeek.length,
        totalGamesThisMonth: gamesThisMonth.length,
        avgGamesPerUser,
        conversionRate
      },
      usersByTier,
      recentActivity,
      topUsers
    };
  }

  /**
   * List all users with their stats
   */
  async listAllUsers(input?: {
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
  }> {
    const page = input?.page || 1;
    const pageSize = Math.min(input?.pageSize || 50, 100);

    const [allGames, allRateLimits, allSubscriptions, cognitoUsers] = await Promise.all([
      this.getAllGames(),
      this.getAllRateLimits(),
      this.getAllSubscriptions(),
      this.getCognitoUsers()
    ]);

    const today = new Date().toISOString().split('T')[0];

    // Build user info
    const users: AdminUserInfo[] = cognitoUsers.map((user: any) => {
      const userGames = allGames.filter((g: any) => g.userId === user.userId);
      const rateLimit = allRateLimits.find((r: any) => r.userId === user.userId);
      const subscription = allSubscriptions.find((s: any) => s.userId === user.userId);
      
      const tier = subscription?.tier || 'FREE';
      const todayGames = userGames.filter((g: any) => g.startedAt?.startsWith(today));
      const lastGame = userGames.sort((a: any, b: any) => 
        (b.startedAt || '').localeCompare(a.startedAt || '')
      )[0];

      const tierLimits: Record<string, number> = {
        FREE: 3,
        LIGHT: 20,
        BASIC: 20,
        STANDARD: 100,
        PREMIUM: 1000
      };

      const limit = tierLimits[tier] || 3;
      const used = rateLimit?.count || 0;

      return {
        userId: user.userId,
        email: user.email,
        username: user.username,
        tier,
        gamesPlayed: userGames.length,
        lastActive: lastGame?.startedAt || rateLimit?.updatedAt || user.createdAt,
        createdAt: user.createdAt,
        todayPlays: todayGames.length,
        rateLimit: {
          tier,
          limit,
          used,
          remaining: Math.max(0, limit - used),
          resetAt: rateLimit?.resetAt || new Date().toISOString()
        }
      };
    });

    // Filter by tier if specified
    let filteredUsers = input?.tier
      ? users.filter(u => u.tier === input.tier)
      : users;

    // Sort
    const sortBy = input?.sortBy || 'createdAt';
    const sortOrder = input?.sortOrder || 'desc';
    
    filteredUsers.sort((a, b) => {
      let aVal: any = a[sortBy as keyof AdminUserInfo];
      let bVal: any = b[sortBy as keyof AdminUserInfo];
      
      if (sortBy === 'lastActive') {
        aVal = a.lastActive || '';
        bVal = b.lastActive || '';
      }
      
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const total = filteredUsers.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: endIndex < total
      }
    };
  }

  // Helper methods

  private async getAllGames() {
    console.log('AdminService: Querying games table:', GAMES_TABLE);
    const result = await docClient.send(
      new ScanCommand({
        TableName: GAMES_TABLE,
        ProjectionExpression: 'userId,gameId,startedAt,completedAt,themeId'
      })
    );
    console.log('AdminService: Games query result:', {
      count: result.Items?.length || 0,
      scannedCount: result.ScannedCount,
      items: result.Items?.slice(0, 3) // Log first 3 items for debugging
    });
    return result.Items || [];
  }

  private async getAllRateLimits() {
    console.log('AdminService: Querying rate limits table:', RATE_LIMITS_TABLE);
    const result = await docClient.send(
      new ScanCommand({
        TableName: RATE_LIMITS_TABLE,
        ProjectionExpression: 'userId,tier,#count,resetAt,updatedAt',
        ExpressionAttributeNames: { '#count': 'count' }
      })
    );
    console.log('AdminService: Rate limits query result:', {
      count: result.Items?.length || 0,
      scannedCount: result.ScannedCount
    });
    return result.Items || [];
  }

  private async getAllSubscriptions() {
    console.log('AdminService: Querying subscriptions table:', SUBSCRIPTIONS_TABLE);
    const result = await docClient.send(
      new ScanCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        ProjectionExpression: 'userId,tier,#status',
        ExpressionAttributeNames: { '#status': 'status' }
      })
    );
    console.log('AdminService: Subscriptions query result:', {
      count: result.Items?.length || 0,
      scannedCount: result.ScannedCount
    });
    return result.Items || [];
  }

  private async getCognitoUsers() {
    console.log('AdminService: Querying Cognito user pool:', USER_POOL_ID);
    const result = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60
      })
    );

    console.log('AdminService: Cognito users query result:', {
      count: result.Users?.length || 0
    });

    return (result.Users || []).map((user: any) => ({
      userId: user.Username || '',
      email: user.Attributes?.find((a: any) => a.Name === 'email')?.Value || '',
      username: user.Attributes?.find((a: any) => a.Name === 'preferred_username')?.Value || 
                user.Attributes?.find((a: any) => a.Name === 'name')?.Value || 
                'Unknown',
      createdAt: user.UserCreateDate?.toISOString() || new Date().toISOString()
    }));
  }

  private calculateActivityPeriod(games: any[]) {
    const uniqueUsers = new Set(games.map((g: any) => g.userId));
    const totalGames = games.length;
    const avgGamesPerUser = uniqueUsers.size > 0 ? totalGames / uniqueUsers.size : 0;

    return {
      uniqueUsers: uniqueUsers.size,
      totalGames,
      avgGamesPerUser
    };
  }

  private normalizeTier(tier: string): string {
    const tierMap: Record<string, string> = {
      FREE: 'FREE',
      LIGHT: 'BASIC',
      BASIC: 'BASIC',
      STANDARD: 'PREMIUM',
      PREMIUM: 'PREMIUM'
    };
    return tierMap[tier] || 'FREE';
  }

  private calculateTierRevenue(tier: string, count: number): number {
    const prices: Record<string, number> = {
      FREE: 0,
      BASIC: 1.99,
      PREMIUM: 9.99
    };
    return (prices[tier] || 0) * count;
  }
}
