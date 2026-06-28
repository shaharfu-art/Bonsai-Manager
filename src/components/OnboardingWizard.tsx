import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { subscribeToPush } from '../lib/push-notifications'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const WIZARD_DONE_KEY = 'onboarding-wizard-done'

const OnboardingWizard: React.FC = () => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'he'

  const [show, setShow] = useState(false)
  const [checkDone, setCheckDone] = useState(false)
  const [step, setStep] = useState(0) // 0=install, 1=notifications, 2=location
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationDone, setLocationDone] = useState(false)
  const [cityName, setCityName] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    if (!user) return

    const checkShouldShow = async () => {
      // Quick localStorage check first for fast UX
      if (localStorage.getItem(WIZARD_DONE_KEY)) {
        console.log('[Wizard] localStorage says done, skipping')
        setCheckDone(true)
        return
      }
      // Check DB
      console.log('[Wizard] Checking DB for user:', user.id)
      const { data, error } = await supabase.from('user_profiles').select('trees_lat').eq('id', user.id).single()
      console.log('[Wizard] DB result:', { data, error: error?.message })
      
      if (error || !data || data.trees_lat === null || data.trees_lat === undefined) {
        // Location not set — show wizard
        console.log('[Wizard] Showing wizard')
        setShow(true)
      } else {
        // Location exists — mark as done
        console.log('[Wizard] Location exists, hiding')
        localStorage.setItem(WIZARD_DONE_KEY, 'true')
      }
      setCheckDone(true)
    }

    checkShouldShow()

    // Check if already standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    if (isStandalone) setStep(1)

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)

    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [user])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    }
    setStep(1)
  }

  const handleNotifications = async () => {
    try { await subscribeToPush() } catch { /* ignore */ }
    setStep(2)
  }

  const handleGPS = () => {
    if (!navigator.geolocation) { setShowManual(true); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        // Reverse geocode with Nominatim (free, no key)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${i18n.language}`)
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || ''
          setCityName(city)
          // Save to DB
          if (user) {
            await supabase.from('user_profiles').update({
              trees_lat: latitude,
              trees_lng: longitude,
              trees_city: city,
            }).eq('id', user.id)
          }
          setLocationDone(true)
        } catch {
          setCityName(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
          if (user) {
            await supabase.from('user_profiles').update({
              trees_lat: latitude,
              trees_lng: longitude,
            }).eq('id', user.id)
          }
          setLocationDone(true)
        }
        setLocating(false)
      },
      () => {
        setLocating(false)
        setShowManual(true)
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const handleManualSave = async () => {
    if (!manualCity.trim()) return
    // Use Nominatim to geocode city name
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualCity)}&format=json&limit=1`)
      const data = await res.json()
      if (data.length > 0) {
        const { lat, lon } = data[0]
        if (user) {
          await supabase.from('user_profiles').update({
            trees_lat: parseFloat(lat),
            trees_lng: parseFloat(lon),
            trees_city: manualCity.trim(),
          }).eq('id', user.id)
        }
      }
    } catch { /* ignore geocode error, just save name */ }
    setCityName(manualCity.trim())
    setLocationDone(true)
    setShowManual(false)
  }

  const handleFinish = () => {
    localStorage.setItem(WIZARD_DONE_KEY, 'true')
    setShow(false)
  }

  const handleSkip = () => {
    if (step < 2) { setStep(step + 1) }
    else { handleFinish() }
  }

  if (!show || !checkDone) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-5 pb-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-[#2d6a4f]' : i < step ? 'bg-[#52b788]' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="px-6 py-5">
          {/* Step 0: Install */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <span className="text-5xl">📱</span>
              <h2 className="text-lg font-bold text-gray-900">
                {isRtl ? 'התקן את האפליקציה' : 'Install the App'}
              </h2>
              <p className="text-sm text-gray-500">
                {isRtl ? 'הוסף למסך הבית לגישה מהירה' : 'Add to home screen for quick access'}
              </p>
              {isIOS ? (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 text-right space-y-1">
                  <p>1. {isRtl ? 'לחץ על כפתור השיתוף ⎙' : 'Tap the Share button ⎙'}</p>
                  <p>2. {isRtl ? 'בחר "הוסף למסך הבית"' : 'Select "Add to Home Screen"'}</p>
                </div>
              ) : null}
              <button onClick={handleInstall} className="w-full bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-3 rounded-xl transition-colors">
                {isRtl ? '🌿 הוסף למסך הבית' : '🌿 Add to Home Screen'}
              </button>
            </div>
          )}

          {/* Step 1: Notifications */}
          {step === 1 && (
            <div className="text-center space-y-4">
              <span className="text-5xl">🔔</span>
              <h2 className="text-lg font-bold text-gray-900">
                {isRtl ? 'הפעל התראות' : 'Enable Notifications'}
              </h2>
              <p className="text-sm text-gray-500">
                {isRtl ? 'קבל תזכורות לטיפולים והתראות מזג אוויר' : 'Get care reminders and weather alerts'}
              </p>
              <button onClick={handleNotifications} className="w-full bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-3 rounded-xl transition-colors">
                {isRtl ? '🔔 הפעל התראות' : '🔔 Enable Notifications'}
              </button>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="text-center space-y-4">
              <span className="text-5xl">📍</span>
              <h2 className="text-lg font-bold text-gray-900">
                {isRtl ? 'איפה העצים שלך?' : 'Where are your trees?'}
              </h2>
              <p className="text-sm text-gray-500">
                {isRtl ? 'נשתמש במיקום לשליחת התראות מזג אוויר' : "We'll use this for weather alerts"}
              </p>

              {locationDone ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-green-800">✅ {cityName || (isRtl ? 'מיקום נשמר' : 'Location saved')}</p>
                </div>
              ) : showManual ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={manualCity}
                    onChange={e => setManualCity(e.target.value)}
                    placeholder={isRtl ? 'שם העיר...' : 'City name...'}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2d6a4f] focus:outline-none"
                    dir={isRtl ? 'rtl' : 'ltr'}
                  />
                  <button onClick={handleManualSave} disabled={!manualCity.trim()} className="w-full bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-40">
                    {isRtl ? 'שמור' : 'Save'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={handleGPS} disabled={locating} className="w-full bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
                    {locating
                      ? (isRtl ? '🔍 מאתר...' : '🔍 Locating...')
                      : (isRtl ? '📍 השתמש במיקום הנוכחי' : '📍 Use Current Location')}
                  </button>
                  <button onClick={() => setShowManual(true)} className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                    {isRtl ? 'או הזן ידנית' : 'Or enter manually'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Skip / Finish button */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            {step === 2 && locationDone ? (
              <button onClick={handleFinish} className="w-full text-sm font-medium text-[#2d6a4f] hover:text-[#245a42] py-2">
                {isRtl ? '✓ סיום' : '✓ Done'}
              </button>
            ) : (
              <button onClick={handleSkip} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                {isRtl ? 'דלג →' : 'Skip →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
