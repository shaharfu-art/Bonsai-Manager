import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getCheckoutUrl } from '../lib/payment'
import { PLAN_PRICING } from '../hooks/usePlan'

interface Props {
  reason: 'trees' | 'ai'
  onClose: () => void
}

const Paywall: React.FC<Props> = ({ reason, onClose }) => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'he'

  const handleUpgrade = (plan: 'premium' | 'pro', billing: 'monthly' | 'yearly') => {
    if (!user?.email || !user?.id) {
      alert(isRtl ? 'יש להתחבר תחילה' : 'Please sign in first')
      return
    }

    const url = getCheckoutUrl({
      plan: `${plan}_${billing}` as 'premium_monthly' | 'premium_yearly' | 'pro_monthly' | 'pro_yearly',
      userEmail: user.email,
      userId: user.id,
    })

    if (url) {
      window.open(url, '_blank')
    } else {
      alert(isRtl ? 'מערכת התשלום תחובר בקרוב!' : 'Payment system coming soon!')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2d6a4f] to-[#52b788] px-6 py-6 text-center text-white">
          <span className="text-4xl block mb-2">{reason === 'trees' ? '🌳' : '🤖'}</span>
          <h2 className="text-lg font-bold mb-1">
            {reason === 'trees'
              ? (isRtl ? 'הגעת למגבלת העצים' : 'Tree limit reached')
              : (isRtl ? 'ניצלת את השאילתות היומיות' : 'Daily AI queries used up')
            }
          </h2>
          <p className="text-sm text-white/80">
            {isRtl ? 'שדרג כדי להמשיך לגדול 🌱' : 'Upgrade to keep growing 🌱'}
          </p>
        </div>

        {/* Plans comparison */}
        <div className="px-5 py-5 space-y-4">

          {/* Premium Plan */}
          <div className="border-2 border-[#52b788] rounded-xl p-4 relative">
            <span className="absolute -top-2.5 right-4 bg-[#52b788] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {isRtl ? 'מומלץ' : 'POPULAR'}
            </span>
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-base font-bold text-[#2d6a4f]">Premium</h3>
              <span className="text-lg font-bold text-gray-900">₪{PLAN_PRICING.premium.monthly}</span>
              <span className="text-xs text-gray-500">/{isRtl ? 'חודש' : 'mo'}</span>
            </div>
            <ul className="space-y-1 mb-3">
              <li className="text-xs text-gray-600">✓ {isRtl ? '15 עצים' : '15 trees'}</li>
              <li className="text-xs text-gray-600">✓ {isRtl ? 'AI ללא הגבלה' : 'Unlimited AI'}</li>
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => handleUpgrade('premium', 'monthly')}
                className="flex-1 bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                {isRtl ? 'חודשי' : 'Monthly'}
              </button>
              <button
                onClick={() => handleUpgrade('premium', 'yearly')}
                className="flex-1 border border-[#2d6a4f] text-[#2d6a4f] font-medium py-2 rounded-lg hover:bg-green-50 transition-colors text-xs"
              >
                ₪{PLAN_PRICING.premium.yearly}/{isRtl ? 'שנה' : 'yr'} 💰
              </button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-base font-bold text-gray-800">Pro</h3>
              <span className="text-lg font-bold text-gray-900">₪{PLAN_PRICING.pro.monthly}</span>
              <span className="text-xs text-gray-500">/{isRtl ? 'חודש' : 'mo'}</span>
            </div>
            <ul className="space-y-1 mb-3">
              <li className="text-xs text-gray-600">✓ {isRtl ? 'עצים ללא הגבלה' : 'Unlimited trees'}</li>
              <li className="text-xs text-gray-600">✓ {isRtl ? 'AI ללא הגבלה' : 'Unlimited AI'}</li>
              <li className="text-xs text-gray-600">✓ {isRtl ? 'למשתלות ומאמנים' : 'For nurseries & trainers'}</li>
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => handleUpgrade('pro', 'monthly')}
                className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                {isRtl ? 'חודשי' : 'Monthly'}
              </button>
              <button
                onClick={() => handleUpgrade('pro', 'yearly')}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors text-xs"
              >
                ₪{PLAN_PRICING.pro.yearly}/{isRtl ? 'שנה' : 'yr'} 💰
              </button>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full text-gray-400 text-xs py-2 hover:text-gray-600"
          >
            {isRtl ? 'לא עכשיו' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Paywall
