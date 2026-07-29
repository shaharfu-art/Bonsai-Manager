import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PLAN_PRICING } from '../hooks/usePlan'

const PricingPage: React.FC = () => {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const isRtl = i18n.language === 'he'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f7f4] to-white">
      {/* Header */}
      <div className="text-center pt-12 pb-8 px-6">
        <span className="text-5xl block mb-3">🌳</span>
        <h1 className="text-3xl font-bold text-[#2d6a4f] mb-2">YUTAKA Tree Manager</h1>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          {isRtl
            ? 'נהל את אוסף הבונסאי שלך בקלות — תיעוד, תזכורות, תחזית מזג אוויר ויועץ AI'
            : 'Manage your bonsai collection with ease — documentation, reminders, weather forecasts & AI advisor'}
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Free */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Free</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">₪0</p>
            <p className="text-xs text-gray-500 mb-5">{isRtl ? 'לתמיד' : 'forever'}</p>
            <ul className="space-y-2 flex-1">
              <PlanFeature text={isRtl ? '3 עצים' : '3 trees'} />
              <PlanFeature text={isRtl ? '2 שאילתות AI ביום' : '2 AI queries/day'} />
              <PlanFeature text={isRtl ? 'תיעוד טיפולים ותמונות' : 'Treatment & photo log'} />
              <PlanFeature text={isRtl ? 'תזכורות טיפולים' : 'Care reminders'} />
              <PlanFeature text={isRtl ? 'תחזית מזג אוויר' : 'Weather forecast'} />
            </ul>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full border-2 border-[#2d6a4f] text-[#2d6a4f] font-semibold py-3 rounded-xl hover:bg-green-50 transition-colors"
            >
              {isRtl ? 'התחל בחינם' : 'Start Free'}
            </button>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-[#52b788] relative flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#52b788] text-white text-xs font-bold px-3 py-1 rounded-full">
              {isRtl ? 'מומלץ' : 'POPULAR'}
            </span>
            <h3 className="text-lg font-bold text-[#2d6a4f] mb-1">Premium</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">₪{PLAN_PRICING.premium.monthly}<span className="text-sm font-normal text-gray-500">/{isRtl ? 'חודש' : 'mo'}</span></p>
            <p className="text-xs text-gray-500 mb-5">{isRtl ? `או ₪${PLAN_PRICING.premium.yearly}/שנה` : `or ₪${PLAN_PRICING.premium.yearly}/year`}</p>
            <ul className="space-y-2 flex-1">
              <PlanFeature text={isRtl ? '15 עצים' : '15 trees'} highlight />
              <PlanFeature text={isRtl ? 'AI ללא הגבלה' : 'Unlimited AI'} highlight />
              <PlanFeature text={isRtl ? 'תיעוד טיפולים ותמונות' : 'Treatment & photo log'} />
              <PlanFeature text={isRtl ? 'תזכורות טיפולים' : 'Care reminders'} />
              <PlanFeature text={isRtl ? 'תחזית מזג אוויר' : 'Weather forecast'} />
              <PlanFeature text={isRtl ? 'שיתוף תמונות' : 'Photo sharing'} />
            </ul>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {isRtl ? 'התחל עכשיו' : 'Get Started'}
            </button>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Pro</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">₪{PLAN_PRICING.pro.monthly}<span className="text-sm font-normal text-gray-500">/{isRtl ? 'חודש' : 'mo'}</span></p>
            <p className="text-xs text-gray-500 mb-5">{isRtl ? `או ₪${PLAN_PRICING.pro.yearly}/שנה` : `or ₪${PLAN_PRICING.pro.yearly}/year`}</p>
            <ul className="space-y-2 flex-1">
              <PlanFeature text={isRtl ? 'עצים ללא הגבלה' : 'Unlimited trees'} highlight />
              <PlanFeature text={isRtl ? 'AI ללא הגבלה' : 'Unlimited AI'} highlight />
              <PlanFeature text={isRtl ? 'תיעוד טיפולים ותמונות' : 'Treatment & photo log'} />
              <PlanFeature text={isRtl ? 'תזכורות טיפולים' : 'Care reminders'} />
              <PlanFeature text={isRtl ? 'תחזית מזג אוויר' : 'Weather forecast'} />
              <PlanFeature text={isRtl ? 'שיתוף תמונות' : 'Photo sharing'} />
              <PlanFeature text={isRtl ? 'למשתלות ומאמנים' : 'For nurseries & trainers'} />
            </ul>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full border-2 border-gray-800 text-gray-800 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {isRtl ? 'התחל עכשיו' : 'Get Started'}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          {isRtl
            ? 'ניתן לבטל בכל עת. ללא התחייבות.'
            : 'Cancel anytime. No commitment.'}
        </p>
      </div>
    </div>
  )
}

const PlanFeature: React.FC<{ text: string; highlight?: boolean }> = ({ text, highlight }) => (
  <li className={`flex items-center gap-2 text-sm ${highlight ? 'text-[#2d6a4f] font-medium' : 'text-gray-600'}`}>
    <span className="text-green-500 flex-shrink-0">✓</span>
    {text}
  </li>
)

export default PricingPage
