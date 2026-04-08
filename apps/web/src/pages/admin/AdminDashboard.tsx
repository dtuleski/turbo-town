import { useState, useEffect } from 'react';
import { getAdminAnalytics, listAllUsers, AdminAnalytics, AdminUserInfo } from '@/api/admin';
import { getReviewStats, ReviewStats } from '@/api/game';
import { fetchAuthSession } from 'aws-amplify/auth';
import Button from '@/components/common/Button';
import { useNavigate } from 'react-router-dom';
import { useAdminGuard } from '@/hooks/useAdminGuard';

// Direct API call to bypass GraphQL parsing issues
const fetchAdminAnalyticsDirect = async (): Promise<AdminAnalytics> => {
  try {
    // Get auth token from Amplify
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    
    if (!token) {
      throw new Error('No auth token available');
    }

    console.log('Making direct API call with token:', token.substring(0, 50) + '...');

    const response = await fetch('https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/game/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
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
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Direct API response:', JSON.stringify(result, null, 2));

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL error');
    }

    const overview = result.data?.getAdminAnalytics?.overview;
    console.log('Overview data received:', overview);
    console.log('Total users:', overview?.totalUsers);
    console.log('DAU:', overview?.dau);
    console.log('Total games played:', overview?.totalGamesPlayed);

    // Return with fallback data for missing fields
    return {
      overview: overview || {
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
      usersByTier: [
        { tier: 'FREE', count: 0, percentage: 0, avgGamesPerUser: 0, totalRevenue: 0 },
        { tier: 'BASIC', count: 0, percentage: 0, avgGamesPerUser: 0, totalRevenue: 0 },
        { tier: 'PREMIUM', count: 0, percentage: 0, avgGamesPerUser: 0, totalRevenue: 0 }
      ],
      recentActivity: {
        last24Hours: { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 },
        last7Days: { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 },
        last30Days: { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 },
      },
      topUsers: [],
    };
  } catch (error) {
    console.error('Direct API call failed:', error);
    throw error;
  }
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const isAdmin = useAdminGuard();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 50, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [filterTier, setFilterTier] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [reviewStats, setReviewStats] = useState<{ perGame: ReviewStats[]; overall: ReviewStats } | null>(null);

  useEffect(() => {
    if (isAdmin === true) {
      loadData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, filterTier, sortBy, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching admin analytics...');
      
      // Try direct API call first to bypass Apollo Client parsing issues
      try {
        const data = await fetchAdminAnalyticsDirect();
        console.log('Direct API analytics data:', data);
        console.log('Setting analytics state with:', {
          totalUsers: data.overview.totalUsers,
          dau: data.overview.dau,
          totalGamesPlayed: data.overview.totalGamesPlayed
        });
        setAnalytics(data);
        
        // Load review stats
        try {
          const reviews = await getReviewStats();
          setReviewStats(reviews);
        } catch (e) {
          console.warn('Failed to load review stats:', e);
        }
        
        return;
      } catch (directError) {
        console.warn('Direct API call failed, trying Apollo Client:', directError);
      }
      
      // Fallback to Apollo Client
      const data = await getAdminAnalytics();
      console.log('Apollo Client analytics data:', data);
      setAnalytics(data);
      
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics');
      
      // Set fallback data so dashboard doesn't show zeros
      setAnalytics({
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
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await listAllUsers({
        page: pagination.page,
        pageSize: pagination.pageSize,
        tier: filterTier || undefined,
        sortBy,
        sortOrder: 'desc',
      });
      
      console.log('Users data received:', data);
      
      if (data && data.users && data.pagination) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        console.error('Invalid users data structure:', data);
        setUsers([]);
        setPagination({ total: 0, page: 1, pageSize: 50, hasMore: false });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      console.error('Failed to load users:', err);
      setUsers([]);
      setPagination({ total: 0, page: 1, pageSize: 50, hasMore: false });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <Button onClick={() => window.location.href = '/'}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">DashDen Analytics & User Management</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Users ({analytics?.overview?.totalUsers || 0})
            </button>
            <button
              onClick={() => window.location.href = '/admin/language-maintenance'}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
            >
              🌐 Language Data
            </button>
            <button
              onClick={() => window.location.href = '/admin/subscriptions'}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
            >
              💎 Subscriptions
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Users"
                value={analytics.overview?.totalUsers || 0}
                icon="👥"
                color="blue"
              />
              <MetricCard
                title="DAU"
                value={analytics.overview?.dau || 0}
                subtitle="Daily Active Users"
                icon="📈"
                color="green"
              />
              <MetricCard
                title="MAU"
                value={analytics.overview?.mau || 0}
                subtitle="Monthly Active Users"
                icon="📊"
                color="purple"
              />
              <MetricCard
                title="Conversion Rate"
                value={`${(analytics.overview?.conversionRate || 0).toFixed(1)}%`}
                subtitle="Free → Paid"
                icon="💰"
                color="yellow"
              />
            </div>

            {/* Games Played */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Games"
                value={analytics.overview?.totalGamesPlayed || 0}
                icon="🎮"
                color="indigo"
              />
              <MetricCard
                title="Today"
                value={analytics.overview?.totalGamesToday || 0}
                icon="📅"
                color="blue"
              />
              <MetricCard
                title="This Week"
                value={analytics.overview?.totalGamesThisWeek || 0}
                icon="📆"
                color="green"
              />
              <MetricCard
                title="This Month"
                value={analytics.overview?.totalGamesThisMonth || 0}
                icon="🗓️"
                color="purple"
              />
            </div>

            {/* Users by Tier */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Users by Subscription Tier</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(analytics.usersByTier || []).map((tier) => (
                  <div key={tier.tier} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{tier.tier}</h3>
                      <span className="text-2xl">
                        {tier.tier === 'FREE' ? '🆓' : tier.tier === 'BASIC' ? '💎' : '👑'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Users:</span>
                        <span className="font-semibold">{tier.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Percentage:</span>
                        <span className="font-semibold">{tier.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Games:</span>
                        <span className="font-semibold">{tier.avgGamesPerUser.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(tier.totalRevenue)}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ActivityCard
                  title="Last 24 Hours"
                  data={analytics.recentActivity?.last24Hours || { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 }}
                />
                <ActivityCard
                  title="Last 7 Days"
                  data={analytics.recentActivity?.last7Days || { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 }}
                />
                <ActivityCard
                  title="Last 30 Days"
                  data={analytics.recentActivity?.last30Days || { uniqueUsers: 0, totalGames: 0, avgGamesPerUser: 0 }}
                />
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">🏆 Top 10 Users</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Games Played</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(analytics.topUsers || []).map((user, index) => (
                      <tr key={user.userId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <TierBadge tier={user.tier} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-blue">
                          {user.gamesPlayed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.lastActive)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Game Ratings */}
            {reviewStats && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">⭐ Game Ratings</h2>
                {/* Overall */}
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">Overall Average Rating</div>
                      <div className="text-3xl font-bold text-yellow-600">
                        {reviewStats.overall.averageRating > 0 ? reviewStats.overall.averageRating.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl">{'⭐'.repeat(Math.round(reviewStats.overall.averageRating))}</div>
                      <div className="text-sm text-gray-500">{reviewStats.overall.totalReviews} review{reviewStats.overall.totalReviews !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>
                {/* Per game */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviewStats.perGame.map(game => {
                    const GAME_ICONS: Record<string, string> = {
                      MEMORY_MATCH: '🃏', MATH_CHALLENGE: '🧮', WORD_PUZZLE: '🔤',
                      LANGUAGE_LEARNING: '🌍', SUDOKU: '9️⃣', JIGSAW_PUZZLE: '🧩',
                      BUBBLE_POP: '🫧', SEQUENCE_MEMORY: '🧠', CODE_A_BOT: '🤖',
                      GEO_QUIZ: '🌍', HISTORY_QUIZ: '📜', CIVICS_QUIZ: '🇺🇸', COLOR_BY_NUMBER: '🎨', HANGMAN: '🪢', TIC_TAC_TOE: '❌',
                    };
                    const GAME_NAMES: Record<string, string> = {
                      MEMORY_MATCH: 'Memory Match', MATH_CHALLENGE: 'Math Challenge', WORD_PUZZLE: 'Word Puzzle',
                      LANGUAGE_LEARNING: 'Language', SUDOKU: 'Sudoku', JIGSAW_PUZZLE: 'Jigsaw Puzzle',
                      BUBBLE_POP: 'Bubble Pop', SEQUENCE_MEMORY: 'Sequence Memory', CODE_A_BOT: 'Code-a-Bot',
                      GEO_QUIZ: 'Geo Quiz', HISTORY_QUIZ: 'History Quiz', CIVICS_QUIZ: 'Civics Quiz', COLOR_BY_NUMBER: 'Color by Number', HANGMAN: 'Hangman', TIC_TAC_TOE: 'Tic Tac Toe',
                    };
                    return (
                      <div key={game.gameType} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{GAME_ICONS[game.gameType] || '🎮'}</span>
                          <span className="font-semibold">{GAME_NAMES[game.gameType] || game.gameType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <span key={s} className={`text-lg ${s <= Math.round(game.averageRating) ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                            ))}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-lg">{game.averageRating > 0 ? game.averageRating.toFixed(1) : '—'}</span>
                            <span className="text-xs text-gray-500 ml-1">({game.totalReviews})</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Tier</label>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Tiers</option>
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="createdAt">Join Date</option>
                  <option value="gamesPlayed">Games Played</option>
                  <option value="lastActive">Last Active</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadUsers} disabled={loading}>
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Games</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Today</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate Limit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <TierBadge tier={user.tier} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-blue">
                          {user.gamesPlayed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.todayPlays}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={user.rateLimit.remaining === 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                            {user.rateLimit.used}/{user.rateLimit.limit}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.lastActive)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {users.length} of {pagination.total} users
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={!pagination.hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</div>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

const ActivityCard = ({
  title,
  data,
}: {
  title: string;
  data: { uniqueUsers: number; totalGames: number; avgGamesPerUser: number };
}) => {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Users:</span>
          <span className="font-semibold">{data.uniqueUsers}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Games:</span>
          <span className="font-semibold">{data.totalGames}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Avg/User:</span>
          <span className="font-semibold">{data.avgGamesPerUser.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

const TierBadge = ({ tier }: { tier: string }) => {
  const colors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-800',
    BASIC: 'bg-blue-100 text-blue-800',
    LIGHT: 'bg-blue-100 text-blue-800',
    PREMIUM: 'bg-purple-100 text-purple-800',
    STANDARD: 'bg-purple-100 text-purple-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[tier] || colors.FREE}`}>
      {tier}
    </span>
  );
};

export default AdminDashboard;
