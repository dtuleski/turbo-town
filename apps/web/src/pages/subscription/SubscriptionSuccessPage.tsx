import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import Button from '@/components/common/Button'

const SubscriptionSuccessPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-400 to-teal-400 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to DashDen!</h1>
        <p className="text-gray-600 mb-6">
          Your subscription is now active. Enjoy unlimited games and premium features!
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate(ROUTES.HUB)}>
            Start Playing
          </Button>
          <Button variant="secondary" onClick={() => navigate(ROUTES.SUBSCRIPTION)}>
            View Plan
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionSuccessPage
