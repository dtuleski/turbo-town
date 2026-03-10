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
        last24Hours: {
            uniqueUsers: number;
            totalGames: number;
            avgGamesPerUser: number;
        };
        last7Days: {
            uniqueUsers: number;
            totalGames: number;
            avgGamesPerUser: number;
        };
        last30Days: {
            uniqueUsers: number;
            totalGames: number;
            avgGamesPerUser: number;
        };
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
export declare class AdminService {
    /**
     * Get comprehensive admin analytics
     */
    getAdminAnalytics(): Promise<AdminAnalytics>;
    /**
     * List all users with their stats
     */
    listAllUsers(input?: {
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
    }>;
    private getAllGames;
    private getAllRateLimits;
    private getAllSubscriptions;
    private getCognitoUsers;
    private calculateActivityPeriod;
    private normalizeTier;
    private calculateTierRevenue;
}
export {};
//# sourceMappingURL=admin.service.d.ts.map