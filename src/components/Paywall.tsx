import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { isPlayBillingAvailable, getPlayProducts, purchaseSubscription, PLAY_PRODUCT_IDS, type PlayProduct } from '../lib/play-billing'
import { supabase } from '../lib/supabase-client'

interface Props {
  reason: 'trees' | 'ai'
  onClose: () => void
}

const Paywall: React.FC<Props> = ({ reason, onClose }) => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'he'
  const isTWA = isPlayBillingAvailable()

  const [products, setProducts] = useState<PlayProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(isTWA)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load Google Play products if in TWA
  useEffect(() => {
    if (!isTWA) return
    getPlayProducts([PLAY_PRODUCT_IDS.PREMIUM_MONTHLY, PLAY_PRODUCT_IDS.PRO_MONTHLY])
      .then(setProducts)
      .catch(() => setError(isRtl ? 'שגיאה בטעינת מוצרים' : 'Failed to load products'))
      .finally(() => setLoadingProducts(false))
  }, [isTWA])

  const handlePlayPurchase = async (productId: string) => {
    if (!user) return
    setPurchasing(true)
    setError(null)

    try {
      const purchaseToken = await purchaseSubscription(productId)
      if (!purchaseToken) {
        setPurchasing(false)
        return // User cancelled
      }

      // Send to backend for verification and plan activation
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const url = (import.meta.env.VITE_SUPABASE_URL as string).trim()
      const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim()

      const res = await fetch(`${url}/functions/v1/verify-play-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ purchaseToken, productId }),
      })

      const result = await res.json()
      if (result.success) {
        onClose()
        // Reload page to reflect new plan
        window.location.reload()
      } else {
        setError(result.error || (isRtl ? 'שגיאה באימות הרכישה' : 'Purchase verification failed'))
      }
    } catch (err: any) {
      setError(err.message || (isRtl ? 'שגיאה ברכישה' : 'Purchase failed'))
    } finally {
      setPurchasing(false)
    }
  }

  // TWA — Google Play Billing UI
  if (isTWA) {
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

          {/* Products */}
          <div className="px-5 py-5 space-y-4">
            {loadingProducts ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#2d6a4f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">
                {error || (isRtl ? 'מנויים יהיו זמינים בקרוב' : 'Subscriptions coming soon')}
              </p>
            ) : (
              products.map((product, idx) => (
                <div key={product.itemId} className={`rounded-xl p-4 ${idx === 0 ? 'border-2 border-[#52b788] relative' : 'border border-gray-200'}`}>
                  {idx === 0 && (
                    <span className="absolute -top-2.5 right-4 bg-[#52b788] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {isRtl ? 'מומלץ' : 'POPULAR'}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className={`text-base font-bold ${idx === 0 ? 'text-[#2d6a4f]' : 'text-gray-800'}`}>
                      {product.title}
                    </h3>
                    <span className="text-lg font-bold text-gray-900">{product.formattedPrice}</span>
                    <span className="text-xs text-gray-500">/{isRtl ? 'חודש' : 'mo'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{product.description}</p>
                  <button
                    onClick={() => handlePlayPurchase(product.itemId)}
                    disabled={purchasing}
                    className={`w-full font-semibold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 ${
                      idx === 0
                        ? 'bg-[#2d6a4f] hover:bg-[#245a42] text-white'
                        : 'bg-gray-800 hover:bg-gray-900 text-white'
                    }`}
                  >
                    {purchasing ? '...' : (isRtl ? 'שדרג עכשיו' : 'Upgrade now')}
                  </button>
                </div>
              ))
            )}

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button onClick={onClose} className="w-full text-gray-400 text-xs py-2 hover:text-gray-600">
              {isRtl ? 'לא עכשיו' : 'Not now'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Web/iOS — show "download from store" message (no Morning anymore)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-[#2d6a4f] to-[#52b788] px-6 py-6 text-center text-white">
          <span className="text-4xl block mb-2">{reason === 'trees' ? '🌳' : '🤖'}</span>
          <h2 className="text-lg font-bold mb-1">
            {reason === 'trees'
              ? (isRtl ? 'הגעת למגבלת העצים' : 'Tree limit reached')
              : (isRtl ? 'ניצלת את השאילתות היומיות' : 'Daily AI queries used up')
            }
          </h2>
        </div>
        <div className="px-6 py-6 text-center space-y-4">
          <p className="text-sm text-gray-600">
            {isRtl
              ? 'כדי לשדרג, הורידו את האפליקציה מהחנות:'
              : 'To upgrade, download the app from the store:'}
          </p>
          <a
            href="https://play.google.com/store/apps/details?id=com.yutakabonsai.twa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {isRtl ? '📱 הורד מ-Google Play' : '📱 Get on Google Play'}
          </a>
          <button onClick={onClose} className="block w-full text-gray-400 text-xs py-2 hover:text-gray-600">
            {isRtl ? 'לא עכשיו' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Paywall
