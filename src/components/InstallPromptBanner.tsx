import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { subscribeToPush } from '../lib/push-notifications'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'install-prompt-dismissed'
const NOTIF_DISMISSED_KEY = 'notif-prompt-dismissed'
const LOCATION_DISMISSED_KEY = 'location-prompt-dismissed'

const InstallPromptBanner: React.FC = () => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'he'

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationDone, setLocationDone] = useState(false)

  useEffect(() => {
    const installDismissed = localStorage.getItem(DISMISSED_KEY)

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Show install prompt if not dismissed and not already installed
    if (!installDismissed && !isStandalone) {
      setShowInstall(true)
    }

    // Always check DB for notifications and location (ignore localStorage dismiss)
    if (user) {
      // Check push subscription in DB
      supabase.from('push_subscriptions').select('id').eq('user_id', user.id).limit(1)
        .then(({ data }) => {
          if (!data || data.length === 0) {
            setShowNotif(true)
          }
        })

      // Check location in DB
      supabase.from('user_profiles').select('trees_lat').eq('id', user.id).single()
        .then(({ data }) => {
          if (!data?.trees_lat) {
            setShowLocation(true)
          }
        })
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [user])

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstall(false)
        localStorage.setItem(DISMISSED_KEY, 'true')
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismissInstall = () => {
    setShowInstall(false)
    localStorage.setItem(DISMISSED_KEY, 'true')
  }

  const handleEnableNotifications = async () => {
    try {
      const success = await subscribeToPush()
      if (success) {
        setShowNotif(false)
        localStorage.setItem(NOTIF_DISMISSED_KEY, 'true')
      }
    } catch {
      setShowNotif(false)
      localStorage.setItem(NOTIF_DISMISSED_KEY, 'true')
    }
  }

  const handleDismissNotif = () => {
    setShowNotif(false)
    localStorage.setItem(NOTIF_DISMISSED_KEY, 'true')
  }

  const handleEnableLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        let city = ''
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${i18n.language}`)
          const data = await res.json()
          city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || ''
        } catch { /* ignore */ }
        if (user) {
          await supabase.from('user_profiles').update({
            trees_lat: latitude,
            trees_lng: longitude,
            trees_city: city,
          }).eq('id', user.id)
        }
        setLocating(false)
        setLocationDone(true)
        setTimeout(() => {
          setShowLocation(false)
          localStorage.setItem(LOCATION_DISMISSED_KEY, 'true')
        }, 2000)
      },
      () => {
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const handleDismissLocation = () => {
    setShowLocation(false)
    localStorage.setItem(LOCATION_DISMISSED_KEY, 'true')
  }

  if (!showInstall && !showNotif && !showLocation) return null

  return (
    <div className="space-y-3" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Location prompt */}
      {showLocation && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow relative">
          <button
            onClick={handleDismissLocation}
            className="absolute top-2 left-2 text-gray-300 hover:text-gray-500 text-lg leading-none"
          >
            ×
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-800">
                {isRtl ? 'הגדר מיקום העצים' : 'Set Tree Location'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isRtl ? 'לקבלת התראות מזג אוויר מותאמות אישית' : 'Get personalized weather alerts'}
              </p>
            </div>
            {locationDone ? (
              <span className="text-green-600 font-semibold text-xs">✅</span>
            ) : (
              <button
                onClick={handleEnableLocation}
                disabled={locating}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
              >
                {locating ? '...' : (isRtl ? 'הגדר' : 'Set')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notification prompt */}
      {showNotif && (
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow relative">
          <button
            onClick={handleDismissNotif}
            className="absolute top-2 left-2 text-gray-300 hover:text-gray-500 text-lg leading-none"
          >
            ×
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-800">
                {isRtl ? 'הפעל התראות' : 'Enable Notifications'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isRtl ? 'קבל תזכורות לטיפולים והתראות מזג אוויר' : 'Get care reminders and weather alerts'}
              </p>
            </div>
            <button
              onClick={handleEnableNotifications}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              {isRtl ? 'הפעל' : 'Enable'}
            </button>
          </div>
        </div>
      )}

      {/* Install prompt */}
      {showInstall && (
        <div className="bg-gradient-to-r from-[#2d6a4f] to-[#52b788] rounded-xl p-4 text-white shadow-lg relative">
          <button
            onClick={handleDismissInstall}
            className="absolute top-2 left-2 text-white/60 hover:text-white text-lg leading-none"
          >
            ×
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌿</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {isRtl ? 'הוסף את Bonsai למסך הבית' : 'Add Bonsai to Home Screen'}
              </p>
              <p className="text-xs text-white/80 mt-0.5">
                {isRtl ? 'גישה מהירה ללא דפדפן' : 'Quick access without a browser'}
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="bg-white text-[#2d6a4f] font-semibold text-xs px-3 py-2 rounded-lg hover:bg-green-50 transition-colors flex-shrink-0"
            >
              {isRtl ? 'הוסף' : 'Install'}
            </button>
          </div>
        </div>
      )}

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowIOSGuide(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-4 text-center">
              {isRtl ? '📱 הוספה למסך הבית' : '📱 Add to Home Screen'}
            </h3>
            <ol className="space-y-3 text-sm text-gray-700" dir={isRtl ? 'rtl' : 'ltr'}>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#2d6a4f]">1.</span>
                <span>{isRtl ? 'לחץ על כפתור השיתוף ⎙ בתחתית הדפדפן' : 'Tap the Share button ⎙ at the bottom'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#2d6a4f]">2.</span>
                <span>{isRtl ? 'גלול ובחר "הוסף למסך הבית"' : 'Scroll and select "Add to Home Screen"'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#2d6a4f]">3.</span>
                <span>{isRtl ? 'לחץ "הוסף" בפינה הימנית העליונה' : 'Tap "Add" in the top right corner'}</span>
              </li>
            </ol>
            <button
              onClick={() => { setShowIOSGuide(false); handleDismissInstall() }}
              className="mt-5 w-full bg-[#2d6a4f] text-white py-2.5 rounded-xl font-medium text-sm"
            >
              {isRtl ? 'הבנתי' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstallPromptBanner
