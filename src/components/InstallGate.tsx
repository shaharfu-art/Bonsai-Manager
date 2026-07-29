import React, { useState, useEffect, useRef } from 'react'

interface Props {
  onDone: () => void
}

const InstallGate: React.FC<Props> = ({ onDone }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [installing, setInstalling] = useState(false)
  const promptRef = useRef<any>(null)

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    if (isStandalone) {
      onDone()
      return
    }

    // Check if already dismissed this session
    if (sessionStorage.getItem('install-gate-dismissed')) {
      onDone()
      return
    }

    // Detect iOS
    const ua = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    setIsIOS(isiOS)

    // Listen for beforeinstallprompt (Android/Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault()
      promptRef.current = e
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [onDone])

  const handleInstall = async () => {
    if (promptRef.current) {
      setInstalling(true)
      promptRef.current.prompt()
      const result = await promptRef.current.userChoice
      if (result.outcome === 'accepted') {
        sessionStorage.setItem('install-gate-dismissed', '1')
        onDone()
      }
      setInstalling(false)
    }
  }

  const handleSkip = () => {
    sessionStorage.setItem('install-gate-dismissed', '1')
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[9998] bg-[#1a3d2b] flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <img
        src="/splash.png"
        alt="YUTAKA"
        className="w-40 h-40 object-contain mb-6 rounded-2xl"
      />

      <h1 className="text-white text-xl font-bold mb-2">YUTAKA Bonsai</h1>
      <p className="text-white/70 text-sm mb-8 max-w-xs">
        התקן את האפליקציה למסך הבית לגישה מהירה וחוויה מלאה
      </p>

      {isIOS ? (
        /* iOS instructions */
        <div className="bg-white/10 backdrop-blur rounded-xl p-5 max-w-xs w-full mb-6">
          <p className="text-white text-sm mb-3 font-medium">להתקנה ב-iPhone:</p>
          <div className="space-y-2 text-white/80 text-xs text-right">
            <p>1. לחץ על כפתור השיתוף <span className="inline-block px-1.5 py-0.5 bg-white/20 rounded">⬆️</span></p>
            <p>2. גלול ובחר <strong>"Add to Home Screen"</strong></p>
            <p>3. לחץ <strong>"Add"</strong></p>
          </div>
        </div>
      ) : deferredPrompt ? (
        /* Android/Chrome install button */
        <button
          onClick={handleInstall}
          disabled={installing}
          className="bg-white text-[#2d6a4f] font-bold text-base px-8 py-3.5 rounded-xl shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-60 mb-6"
        >
          {installing ? '...' : '📲 התקן עכשיו'}
        </button>
      ) : (
        /* Fallback - no prompt available yet */
        <div className="bg-white/10 backdrop-blur rounded-xl p-5 max-w-xs w-full mb-6">
          <p className="text-white/80 text-sm">
            פתח בדפדפן Chrome ולחץ על תפריט ⋮ → "Add to Home screen"
          </p>
        </div>
      )}

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="text-white/40 text-xs hover:text-white/70 transition-colors"
      >
        דלג והמשך לאפליקציה →
      </button>
    </div>
  )
}

export default InstallGate
