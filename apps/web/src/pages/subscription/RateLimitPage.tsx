import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { CREATE_CHECKOUT_SESSION, CREATE_PORTAL_SESSION, CHANGE_PLAN } from '@/api/stripe'
import { gameClient } from '@/api/client'
import { ROUTES } from '@/config/constants'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { canStartGame } from '@/api/game'

export default function RateLimitPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState<string | null>(null)
  const [currentTier, setCurrentTier] = useState<string>('FREE')
  const [createCheckout] = useMutation(CREATE_CHECKOUT_SESSION, { client: gameClient })
  const [createPortal] = useMutation(CREATE_PORTAL_SESSION, { client: gameClient })
  const [changePlan] = useMutation(CHANGE_PLAN, { client: gameClient })
  const isRateLimited = location.state?.rateLimited === true
  const isPremiumRequired = location.state?.premiumRequired === true

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const result = await canStartGame()
        if (result?.rateLimit?.tier) {
          setCurrentTier(result.rateLimit.tier)
        }
      } catch (err) {
        console.error('Failed to fetch current tier:', err)
      }
    }
    fetchTier()
  }, [])

  // Tier hierarchy for determining upgrade vs downgrade
  const TIER_ORDER: Record<string, number> = { FREE: 0, LIGHT: 1, STANDARD: 2, PREMIUM: 3 }

  const handleSubscribe = async (tier: 'LIGHT' | 'STANDARD' | 'PREMIUM', priceId: string) => {
    const isUpgrade = TIER_ORDER[tier] > TIER_ORDER[currentTier]

    // Confirmation dialog
    if (currentTier !== 'FREE') {
      const action = isUpgrade ? 'Upgrade' : 'Downgrade'
      const priceMap: Record<string, string> = { LIGHT: '$2.99', STANDARD: '$5.99', PREMIUM: '$9.99' }
      const msg = isUpgrade
        ? `${action} to ${tier} (${priceMap[tier]}/month)? You'll be redirected to complete payment.`
        : `${action} to ${tier} (${priceMap[tier]}/month)? Your plan will change immediately.`
      if (!confirm(msg)) return
    }

    setLoading(tier)
    try {
      // UPGRADES: Always go through Stripe Checkout (requires payment)
      // DOWNGRADES from paid plan: Use changePlan (no payment needed, Stripe handles credit)
      if (currentTier !== 'FREE' && !isUpgrade) {
        // Downgrade only — use changePlan
        try {
          const { data, errors } = await changePlan({ variables: { input: { tier } } })
          if (errors) {
            const errMsg = errors[0]?.message || ''
            if (!errMsg.includes('SUBSCRIPTION_NOT_ACTIVE') && !errMsg.includes('not found') && !errMsg.includes('No active subscription')) {
              alert(`Error: ${errMsg}`); setLoading(null); return
            }
          } else if (data?.changePlan?.success) {
            setCurrentTier(tier); setLoading(null); return
          }
        } catch (changeErr: any) {
          const errMsg = changeErr?.message || ''
          if (!errMsg.includes('SUBSCRIPTION_NOT_ACTIVE') && !errMsg.includes('not found') && !errMsg.includes('No active subscription')) {
            alert(`Failed: ${errMsg}`); setLoading(null); return
          }
        }
      }
      // UPGRADES and FREE→paid: Always go through Stripe Checkout
      const { data, errors } = await createCheckout({ variables: { input: { tier, priceId } } })
      if (errors) { alert(`Error: ${errors[0]?.message}`); setLoading(null); return }
      if (data?.createCheckoutSession?.url) {
        window.location.href = data.createCheckoutSession.url
      } else { alert('Failed to get checkout URL.'); setLoading(null) }
    } catch (error: any) {
      alert(`Failed: ${error?.message || 'Unknown error'}`)
      setLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setLoading('FREE')
    try {
      const { data, errors } = await createPortal()
      if (errors) {
        alert('To downgrade, please contact support or manage from your Stripe account.')
        setLoading(null); return
      }
      if (data?.createPortalSession?.url) {
        window.location.href = data.createPortalSession.url
      } else {
        alert('To downgrade, please contact support or manage from your Stripe account.')
        setLoading(null)
      }
    } catch {
      alert('To downgrade, please contact support or manage from your Stripe account.')
      setLoading(null)
    }
  }

  const plans = [
    { tierKey: 'free', price: '$0', plays: 3, tier: 'FREE' as const },
    { tierKey: 'light', price: '$2.99', plays: 20, tier: 'LIGHT' as const, priceId: 'price_1Tla6fD1JApM7NxilsPnWDmq' },
    { tierKey: 'standard', price: '$5.99', plays: 100, tier: 'STANDARD' as const, priceId: 'price_1Tla6gD1JApM7NxiAv5siMlb', popular: true },
    { tierKey: 'premium', price: '$9.99', plays: 1000, tier: 'PREMIUM' as const, priceId: 'price_1Tla6fD1JApM7NxiNhbaOCG8' },
  ]

  const tierRank: Record<string, number> = { FREE: 0, LIGHT: 1, STANDARD: 2, PREMIUM: 3 }
  const isUpgrade = (planTier: string) => tierRank[planTier] > tierRank[currentTier]
  const getButtonLabel = (planName: string, planTier: string) => {
    return isUpgrade(planTier)
      ? t('subscription.upgradeTo', { plan: planName })
      : t('subscription.downgradeTo', { plan: planName })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          {isRateLimited ? (
            <>
              <div className="text-6xl mb-4">⏰</div>
              <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{t('subscription.rateLimitTitle')}</h1>
              <p className="text-2xl text-white font-bold drop-shadow">{t('subscription.rateLimitSubtitle')}</p>
            </>
          ) : isPremiumRequired ? (
            <>
              <div className="text-6xl mb-4">👑</div>
              <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{t('subscription.premiumTitle')}</h1>
              <p className="text-2xl text-white font-bold drop-shadow">{t('subscription.premiumSubtitle')}</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">💎</div>
              <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{t('subscription.title')}</h1>
              <p className="text-2xl text-white font-bold drop-shadow">{t('subscription.subtitle')}</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => {
            const planName = t(`subscription.plans.${plan.tierKey}.name`)
            const features = t(`subscription.plans.${plan.tierKey}.features`, { returnObjects: true }) as string[]
            const period = plan.tier === 'FREE' ? t('subscription.forever') : t('subscription.perMonth')

            return (
              <div key={plan.tier}
                className={`bg-white rounded-3xl shadow-2xl p-6 relative ${plan.popular ? 'ring-4 ring-yellow-400 transform lg:scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full font-bold text-xs">⭐ {t('subscription.popular')}</span>
                  </div>
                )}
                <div className="text-center mb-5">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{planName}</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 text-sm ml-1">/{period}</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">{t('subscription.playsPerDay', { count: plan.plays })}</div>
                </div>
                <ul className="space-y-2 mb-6">
                  {Array.isArray(features) && features.map((f, i) => (
                    <li key={i} className="flex items-start text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.tier === currentTier ? (
                  <button disabled className="w-full py-3 rounded-xl font-bold text-base bg-gray-200 text-gray-500 cursor-not-allowed">
                    {t('subscription.currentPlan')}
                  </button>
                ) : plan.priceId ? (
                  <button onClick={() => handleSubscribe(plan.tier as 'LIGHT' | 'STANDARD' | 'PREMIUM', plan.priceId!)} disabled={loading === plan.tier}
                    className={`w-full py-3 rounded-xl font-bold text-base transition-all ${loading === plan.tier ? 'opacity-50' : ''} ${
                      isUpgrade(plan.tier)
                        ? plan.popular
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}>
                    {loading === plan.tier ? '...' : getButtonLabel(planName, plan.tier)}
                  </button>
                ) : currentTier !== 'FREE' ? (
                  <button onClick={handleManageSubscription} disabled={loading === 'FREE'}
                    className={`w-full py-3 rounded-xl font-bold text-base transition-all bg-gray-600 text-white hover:bg-gray-700 ${loading === 'FREE' ? 'opacity-50' : ''}`}>
                    {loading === 'FREE' ? '...' : t('subscription.downgradeToFree')}
                  </button>
                ) : (
                  <button disabled className="w-full py-3 rounded-xl font-bold text-base bg-gray-200 text-gray-500 cursor-not-allowed">
                    {t('subscription.currentPlan')}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <button onClick={() => navigate(ROUTES.HUB)}
            className="px-8 py-3 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all">
            ← {t('game.back')}
          </button>
        </div>

        <div className="mt-8 bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-white text-center text-sm">
          <p>💡 {t('subscription.footer')}</p>
          <p className="mt-1 opacity-80">{t('subscription.footerPayment')}</p>
        </div>
      </div>
    </div>
  )
}
