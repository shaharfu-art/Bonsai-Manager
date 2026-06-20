import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const isRtl = i18n.language === 'he'

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      // ignore
    }
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <h1 className="text-2xl font-bold text-[#2d6a4f]">{t('settings.title')}</h1>

        {/* Language */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">{t('settings.language')}</h2>
          <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => handleLanguageChange('he')}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                i18n.language === 'he'
                  ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('settings.hebrew')}
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                i18n.language === 'en'
                  ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('settings.english')}
            </button>
          </div>
        </section>

        {/* Profile */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">{t('settings.profile')}</h2>
          <div className="flex items-center gap-3">
            {/* Avatar placeholder */}
            <div className="w-10 h-10 rounded-full bg-[#2d6a4f] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <p className="text-sm text-gray-700 truncate">{user?.email ?? '—'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-4 w-full border border-red-300 text-red-600 hover:bg-red-50 font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {t('auth.logout')}
          </button>
        </section>

        {/* Notifications (placeholder) */}
        <section className="bg-white rounded-2xl shadow p-5 opacity-60">
          <h2 className="text-base font-semibold text-gray-800 mb-3">{t('settings.notifications')}</h2>
          <label className={`flex items-center gap-3 cursor-not-allowed ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="relative inline-flex items-center">
              <input type="checkbox" disabled className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#52b788] transition-colors" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-sm text-gray-600">{t('settings.enableNotifications')}</span>
          </label>
          <p className="text-xs text-gray-400 mt-2">{t('common.pending')}</p>
        </section>
      </div>
    </Layout>
  )
}

export default SettingsPage
