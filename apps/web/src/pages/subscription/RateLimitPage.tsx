import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { CREATE_CHECKOUT_SESSION } from '@/api/stripe'
import { gameClient } from '@/api/client'
import { ROUTES } from '@/config/constants'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function RateLimitPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState<string | null>(null)
  const [createCheckout] = useMutation(CREATE_CHECKOUT_SESSION, { client: gameClient })
  const isRateLimited = location.state?.rateLimited === true

  const handleSubscribe = async (tier: 'LIGHT' | 'STANDARD' | 'PREMIUM', priceId: string) => {
    setLoading(tier)
    try {
      const { data, errors } = await createCheckout({
        variables: { input: { tier, priceId } }
      })
      if (errors) { alert(`Error: ${errors[0]?.message}`); setLoading(null); return }
      if (data?.createCheckoutSession?.url) {
        window.location.href = data.createCheckoutSession.url
      } else { alert('Failed to get checkout URL.'); setLoading(null) }
    } catch (error: any) {
      alert(`Failed: ${error?.message || 'Unknown error'}`)
      setLoading(null)
    }
  }

  const plans = [
    {
      name: 'Free', price: '$0', period: 'forever', plays: '3 plays/day',
      features: ['Access to all games', 'Single device', 'Renews every 24 hours'],
      isFree: true,
    },
    {
      name: 'Light', price: '$2.99', period: 'month', plays: '20 plays/day',
      features: ['Access to all games', 'Up to 3 devices', 'Renews every 24 hours', 'Basic statistics'],
      tier: 'LIGHT' as const, priceId: 'price_1TKqGiD1222JoXRHktL151cZ',
    },
    {
      name: 'Standard', price: '$5.99', period: 'month', plays: '100 plays/day',
      features: ['Access to all games', 'Up to 3 devices', 'Renews every 24 hours', 'Detailed statistics', 'Priority support'],
      tier: 'STANDARD' as const, priceId: 'price_1TKqH2D1222JoXRHsRniF5BD', popular: true,
    },
    {
      name: 'Premium', price: '$9.99', period: 'month', plays: '1,000 plays/day',
      features: ['Access to all games', 'Up to 5 devices', '1,000 plays/day', 'Advanced analytics', 'Priority support', 'Early access to new games'],
      tier: 'PREMIUM' as const, priceId: 'price_1TKqHJD1222JoXRHQZBWppLK',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          {isRateLimited ? (
            <>
              <div className="text-6xl mb-4">⏰</div>
              <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">Daily Limit Reached!</h1>
              <p className="text-2xl text-white font-bold drop-shadow">Upgrade to keep playing!</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">💎</div>
              <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">Choose Your Plan</h1>
              <p className="text-2xl text-white font-bold drop-shadow">Upgrade to unlock more plays and features!</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => (
            <div key={plan.name}
              className={`bg-white rounded-3xl shadow-2xl p-6 relative ${plan.popular ? 'ring-4 ring-yellow-400 transform lg:scale-105' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full font-bold text-xs">⭐ POPULAR</span>
                </div>
              )}
              <div className="text-center mb-5">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <div className="mb-3">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 text-sm ml-1">/{plan.period}</span>
                </div>
                <div className="text-lg font-bold text-blue-600">{plan.plays}</div>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              {plan.tier ? (
                <button onClick={() => handleSubscribe(plan.tier!, plan.priceId!)} disabled={loading === plan.tier}
                  className={`w-full py-3 rounded-xl font-bold text-base transition-all ${loading === plan.tier ? 'opacity-50' : ''} ${
                    plan.popular
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                  }`}>
                  {loading === plan.tier ? '...' : `Upgrade to ${plan.name}`}
                </button>
              ) : (
                <button disabled className="w-full py-3 rounded-xl font-bold text-base bg-gray-200 text-gray-500 cursor-not-allowed">
                  Current Plan
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <button onClick={() => navigate(ROUTES.HUB)}
            className="px-8 py-3 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all">
            {t('game.back')}
          </button>
        </div>

        <div className="mt-8 bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-white text-center text-sm">
          <p>💡 Free plays reset every 24 hours. You can change plans at any time.</p>
          <p className="mt-1 opacity-80">If payment doesn't clear, you'll be downgraded to the Free plan.</p>
        </div>
      </div>
    </div>
  )
}
