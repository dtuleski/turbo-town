import { useAuth } from '@/context/AuthContext'

const ProfilePage = () => {
  const { user } = useAuth()

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
    </div>
  )
}

export default ProfilePage
