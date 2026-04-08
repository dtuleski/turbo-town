import { useState, useEffect } from 'react';
import { listAllUsers, updateUserSubscription, AdminUserInfo } from '@/api/admin';
import { adminSetEmailPrefs, adminGetAllEmailPrefs } from '@/api/game';
import { fetchAuthSession } from 'aws-amplify/auth';
import Button from '@/components/common/Button';

const ADMIN_EMAILS = ['diegotuleski@gmail.com', 'benjamintuleski@gmail.com'];

const TIERS = ['FREE', 'LIGHT', 'STANDARD', 'PREMIUM'];

const SubscriptionsPage = () => {
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [emailPrefs, setEmailPrefs] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const session = await fetchAuthSession();
        const email = session.tokens?.idToken?.payload?.email as string;
        if (!ADMIN_EMAILS.includes(email)) {
          setError('Unauthorized: Admin access only');
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        await loadUsers();
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setError('Failed to verify admin access');
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [response, prefs] = await Promise.allSettled([
        listAllUsers({ pageSize: 1000 }),
        adminGetAllEmailPrefs(),
      ]);
      if (response.status === 'fulfilled') setUsers(response.value.users);
      if (prefs.status === 'fulfilled') {
        const map = new Map<string, boolean>();
        prefs.value.forEach(p => map.set(p.userId, p.dailyDigest));
        setEmailPrefs(map);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmail = async (user: AdminUserInfo) => {
    const current = emailPrefs.get(user.userId) || false;
    const newVal = !current;
    try {
      await adminSetEmailPrefs(user.userId, user.email, user.username, newVal);
      setEmailPrefs(prev => { const m = new Map(prev); m.set(user.userId, newVal); return m; });
    } catch (err) {
      console.error('Failed to toggle email:', err);
      alert('Failed to update email preference');
    }
  };

  const handleUpdateSubscription = async (userId: string, tier: string, status: string) => {
    if (!confirm(`Update subscription for user to ${tier} (${status})?`)) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      await updateUserSubscription({ userId, tier, status });
      
      // Update local state
      setUsers(users.map(u => 
        u.userId === userId 
          ? { ...u, tier, rateLimit: { ...u.rateLimit, tier } }
          : u
      ));
      
      alert('Subscription updated successfully!');
    } catch (err) {
      console.error('Failed to update subscription:', err);
      alert('Failed to update subscription');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'ALL' || user.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">{error || 'You do not have permission to access this page.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Subscription Management</h1>
        <p className="text-text-secondary">Manage user subscription tiers and statuses</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Search by email or username
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Filter by tier
            </label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="ALL">All Tiers</option>
              {TIERS.map(tier => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
          <p className="mt-4 text-text-secondary">Loading users...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadUsers} className="mt-4">Retry</Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Current Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Rate Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Games Played
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Email Digest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-text-primary">{user.username}</div>
                      <div className="text-sm text-text-secondary">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.tier === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
                        user.tier === 'STANDARD' ? 'bg-blue-100 text-blue-800' :
                        user.tier === 'LIGHT' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {user.rateLimit.used} / {user.rateLimit.limit}
                      <div className="text-xs text-text-tertiary">
                        {user.rateLimit.remaining} remaining
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {user.gamesPlayed} total
                      <div className="text-xs text-text-tertiary">
                        {user.todayPlays} today
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleEmail(user)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                          emailPrefs.get(user.userId) ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          emailPrefs.get(user.userId) ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <select
                          value={user.tier}
                          onChange={(e) => handleUpdateSubscription(user.userId, e.target.value, 'ACTIVE')}
                          disabled={updatingUserId === user.userId}
                          className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:opacity-50"
                        >
                          {TIERS.map(tier => (
                            <option key={tier} value={tier}>{tier}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary">No users found matching your filters.</p>
            </div>
          )}
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-text-secondary">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
