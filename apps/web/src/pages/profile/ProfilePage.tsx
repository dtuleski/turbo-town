import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getEmailPrefs, setEmailPrefs } from '@/api/game'

const ProfilePage = () => {
  const { user } = useAuth()
  const [dailyDigest, setDailyDigest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const prefs = await getEmailPrefs()
        setDailyDigest(prefs.dailyDigest || false)
      } catch { /* no prefs yet */ }
      setLoading(false)
    }
    load()
  }, [])

  const toggleDigest = async () => {
    setSaving(true)
    try {
      const newVal = !dailyDigest
      await setEmailPrefs(newVal)
      setDailyDigest(newVal)
    } catch (err) {
      console.error('Failed to update email prefs:', err)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Profile</h1>
      
      <div className="card">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold">{user?.username}</h2>
          <p className="text-text-secondary">{user?.email}</p>
        </div>

        <div className="border-t pt-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Account Tier</label>
              <div className="text-lg font-medium">{user?.tier}</div>
            </div>
            <div>
              <label className="text-sm text-text-secondary">Member Since</label>
              <div className="text-lg font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Preferences */}
      <div className="card mt-6">
        <h3 className="text-xl font-bold mb-4">📧 Email Preferences</h3>
        <div className="flex items-center justify-between p-4 bg-card-hover rounded-lg">
          <div>
            <div className="font-medium">Daily Digest</div>
            <div className="text-sm text-text-secondary">Get daily leaderboard highlights and game updates</div>
          </div>
          <button
            onClick={toggleDigest}
            disabled={loading || saving}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
              dailyDigest ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            } ${loading || saving ? 'opacity-50' : 'cursor-pointer'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
              dailyDigest ? 'translate-x-7' : 'translate-x-0'
            }`} />
          </button>
        </div>
        {dailyDigest && (
          <p className="text-sm text-green-500 mt-2 px-1">✓ You'll receive daily updates at 8pm EST</p>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
