import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { CREATE_CHECKOUT_SESSION } from '@/api/stripe'
import { gameClient } from '@/api/client'
import { ROUTES } from '@/config/constants'
import { useState } from 'react'

export default function RateLimitPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState<string | null>(null)
  
  const [createCheckout] = useMutation(CREATE_CHECKOUT_SESSION, { client: gameClient })
  
  // Check if user came from rate limit error or just browsing plans
  const isRateLimited = location.state?.rateLimited === true

  const handleSubscribe = async (tier: 'BASIC' | 'PREMIUM') => {
    setLoading(tier)
    try {
      const priceId = tier === 'BASIC' 
        ? 'price_1T8TJYD1222JoXRH79EkciO2'  // $1.99
        : 'price_1T8TK0D1222JoXRHR0kLMCl5'  // $5.99

      console.log('Starting checkout:', { tier, priceId })

      const { data, errors } = await createCheckout({
        variables: { 
          input: { 
            tier,
            priceId 
          } 
        }
      })

      console.log('Checkout response:', { data, errors })

      if (errors) {
        console.error('GraphQL errors:', errors)
        alert(`Checkout error: ${errors[0]?.message || 'Unknown error'}`)
        setLoading(null)
        return
      }

      if (data?.createCheckoutSession?.url) {
        console.log('Redirecting to:', data.createCheckoutSession.url)
        // Redirect to Stripe checkout
        window.location.href = data.createCheckoutSession.url
      } else {
        console.error('No checkout URL in response:', data)
        alert('Failed to get checkout URL. Please try again.')
        setLoading(null)
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      const errorMessage = error?.message || error?.graphQLErrors?.[0]?.message || 'Unknown error'
      alert(`Failed to start checkout: ${errorMessage}`)
      setLoading(null)
    }
  }

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      plays: '3 plays/day',
      features: ['Access to all games', 'Basic statistics', 'Single device'],
      current: false, // Will be determined dynamically in real implementation
    },
    {
      name: 'Basic',
      price: '$1.99',
      period: 'per month',
      plays: '20 plays/day',
      features: ['Access to all games', 'Detailed statistics', 'Up to 3 devices', 'Priority support'],
      popular: true,
      tier: 'BASIC' as const,
    },
    {
      name: 'Premium',
      price: '$5.99',
      period: 'per month',
      plays: 'Unlimited plays',
      features: [
        'Access to all games',
        'Advanced analytics',
        'Up to 3 devices',
        'Priority support',
        'Early access to new games',
        'Ad-free experience',
      ],
      tier: 'PREMIUM' as const,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          {isRateLimited ? (
            <>
              <div className="text-6xl mb-4">⏰</div>
              <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                Daily Limit Reached!
              </h1>
              <p className="text-2xl text-white font-bold drop-shadow">
                You've used all your free plays for today. Upgrade to keep playing!
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">💎</div>
              <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                Choose Your Plan
              </h1>
              <p className="text-2xl text-white font-bold drop-shadow">
                Upgrade to unlock more plays and premium features!
              </p>
            </>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`
                bg-white rounded-3xl shadow-2xl p-8 relative
                ${plan.popular ? 'ring-4 ring-yellow-400 transform scale-105' : ''}
              `}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full font-bold text-sm">
                    ⭐ MOST POPULAR
                  </span>
                </div>
              )}

              {plan.current && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gray-400 text-white px-6 py-2 rounded-full font-bold text-sm">
                    CURRENT PLAN
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-3xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-5xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">/{plan.period}</span>
                </div>
                <div className="text-xl font-bold text-blue-600 mb-4">{plan.plays}</div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 text-xl">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {!plan.current && plan.tier && (
                <button
                  onClick={() => handleSubscribe(plan.tier!)}
                  disabled={loading === plan.tier}
                  className={`
                    w-full py-4 rounded-2xl font-bold text-lg transition-all
                    ${loading === plan.tier ? 'opacity-50 cursor-wait' : ''}
                    ${
                      plan.popular
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                    }
                  `}
                >
                  {loading === plan.tier ? 'Loading...' : `Upgrade to ${plan.name}`}
                </button>
              )}

              {!plan.current && !plan.tier && (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-lg bg-gray-200 text-gray-500 cursor-not-allowed"
                >
                  Free Plan
                </button>
              )}

              {plan.current && (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-lg bg-gray-200 text-gray-500 cursor-not-allowed"
                >
                  Current Plan
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => navigate(ROUTES.HUB)}
            className="px-8 py-3 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all"
          >
            ← Back to Games
          </button>
        </div>

        {/* Info */}
        <div className="mt-12 bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-white text-center">
          <p className="text-lg">
            💡 Your free plays reset every day at midnight UTC
          </p>
          <p className="text-sm mt-2 opacity-80">
            All plans support up to 3 devices per account
          </p>
        </div>
      </div>
    </div>
  )
}
