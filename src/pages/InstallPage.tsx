import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import OnboardingWizard from '../components/OnboardingWizard'

const INSTALL_DONE_KEY = 'install-completed'

const InstallPage: React.FC = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'he'
  const [done, setDone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(ios)
    if (ios) {
      window.location.href = '/'
    }
  }, [])

  const handleDone = () => {
    localStorage.setItem(INSTALL_DONE_KEY, '1')
    setDone(true)
  }

  if (isIOS) {
    return (
      <div className="min-h-screen bg-[#1a3d2b] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#1a3d2b] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-6xl mb-4">✅</span>
        <h1 className="text-2xl font-bold text-white mb-2">
          {isRtl ? 'ההתקנה הושלמה!' : 'Installation Complete!'}
        </h1>
        <p className="text-white/70 text-sm mb-6 max-w-xs">
          {isRtl
            ? 'חפש את YUTAKA ברשימת האפליקציות שלך ופתח מהאייקון'
            : 'Find YUTAKA in your app list and open from the icon'}
        </p>
        <div className="bg-white/10 rounded-xl p-4 max-w-xs w-full">
          <p className="text-white/60 text-xs">
            {isRtl ? 'או גלוש ישירות ל:' : 'Or browse directly to:'}
          </p>
          <a href="/" className="text-white font-medium text-sm underline mt-1 block">
            yutakabonsai.com
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a3d2b] flex items-center justify-center">
      <OnboardingWizard forceShow onComplete={handleDone} />
    </div>
  )
}

export default InstallPage
