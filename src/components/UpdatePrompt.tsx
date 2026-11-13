import React from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_EVERY_MS = 60 * 60 * 1000 // hourly

/**
 * Tells the user a new version is ready and only applies it when they agree.
 * The new service worker waits (no skipWaiting) until the user taps "Update".
 */
const UpdatePrompt: React.FC = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'he'

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => {
        if (!navigator.onLine) return
        Promise.resolve(registration.update()).catch(() => {})
      }
      // Periodic check + check whenever the app comes back to the foreground
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="alert"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between gap-3 bg-[#2d6a4f] text-white px-4 py-2.5 shadow-lg"
    >
      <span className="text-sm font-medium">
        {isRtl ? '🌿 יש גרסה חדשה של האפליקציה' : '🌿 A new version is available'}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-xs font-semibold bg-white text-[#2d6a4f] px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
        >
          {isRtl ? 'עדכן עכשיו' : 'Update now'}
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-xs text-white/80 hover:text-white px-2 py-1.5"
        >
          {isRtl ? 'אחר כך' : 'Later'}
        </button>
      </div>
    </div>
  )
}

export default UpdatePrompt
