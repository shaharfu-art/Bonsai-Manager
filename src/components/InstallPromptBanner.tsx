import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { subscribeToPush } from '../lib/push-notifications'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'install-prompt-dismissed'
const NOTIF_DISMISSED_KEY = 'notif-prompt-dismissed'

const InstallPromptBanner: React.FC = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'he'

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    const installDismissed = localStorage.getItem(DISMISSED_KEY)
    const notifDismissed = localStorage.getItem(NOTIF_DISMISSED_KEY)

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Show install prompt if not dismissed and not already installed
    if (!installDismissed && !isStandalone) {
      setShowInstall(true)
    }

    // Show notification prompt if not dismissed and permission not already granted
    if (!notifDismissed && 'Notification' in window && Notification.permission === 'default') {
      setShowNotif(true)
    }

    // Listen for beforeinstallprompt (Chrome/Edge/Android)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

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
      // permission denied or error
      setShowNotif(false)
      localStorage.setItem(NOTIF_DISMISSED_KEY, 'true')
    }
  }

  const handleDismissNotif = () => {
    setShowNotif(false)
    localStorage.setItem(NOTIF_DISMISSED_KEY, 'true')
  }

  if (!showInstall && !showNotif) return null

  return (
    <div className="space-y-3" dir={isRtl ? 'rtl' : 'ltr'}>
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
                {isRtl ? 'קבל תזכורות לטיפולים בעציצים' : 'Get reminders for tree care'}
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
