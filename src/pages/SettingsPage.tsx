import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-client'
import { subscribeToPush, unsubscribeFromPush } from '../lib/push-notifications'

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

        {/* Notifications */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">{t('settings.notifications')}</h2>
          <NotificationToggle isRtl={isRtl} />
        </section>

        {/* Dark Mode */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">{isRtl ? 'מצב תצוגה' : 'Display Mode'}</h2>
          <DarkModeToggle isRtl={isRtl} />
        </section>

        {/* Location */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">{isRtl ? '📍 מיקום העצים' : '📍 Trees Location'}</h2>
          <LocationSetting isRtl={isRtl} />
        </section>
      </div>
    </Layout>
  )
}

// Notification toggle sub-component
const NotificationToggle: React.FC<{ isRtl: boolean }> = ({ isRtl }) => {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setEnabled('Notification' in window && Notification.permission === 'granted')
  }, [])

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (!enabled) {
        const success = await subscribeToPush()
        setEnabled(success)
      } else {
        await unsubscribeFromPush()
        setEnabled(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <label className={`flex items-center gap-3 cursor-pointer ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={loading}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#52b788] transition-colors" />
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </div>
        <span className="text-sm text-gray-600">{t('settings.enableNotifications')}</span>
      </label>
      {loading && <p className="text-xs text-gray-400 mt-2">{t('common.loading')}</p>}
    </>
  )
}

// Location setting sub-component
const LocationSetting: React.FC<{ isRtl: boolean }> = ({ isRtl }) => {
  const { user } = useAuth()
  const [city, setCity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('user_profiles').select('trees_city').eq('id', user.id).single()
      .then(({ data }) => { setCity(data?.trees_city ?? null); setLoading(false) })
  }, [user])

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) return
    setUpdating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${isRtl ? 'he' : 'en'}`)
          const data = await res.json()
          const cityName = data.address?.city || data.address?.town || data.address?.village || ''
          if (user) {
            await supabase.from('user_profiles').update({ trees_lat: latitude, trees_lng: longitude, trees_city: cityName }).eq('id', user.id)
          }
          setCity(cityName)
        } catch { /* ignore */ }
        setUpdating(false)
      },
      () => { setUpdating(false) },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  if (loading) return <p className="text-xs text-gray-400">...</p>

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-700">{city || (isRtl ? 'לא הוגדר' : 'Not set')}</p>
        {!city && <p className="text-xs text-gray-400">{isRtl ? 'נדרש להתראות מזג אוויר' : 'Required for weather alerts'}</p>}
      </div>
      <button
        onClick={handleUpdateLocation}
        disabled={updating}
        className="text-xs bg-[#2d6a4f] hover:bg-[#245a42] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {updating ? '...' : (isRtl ? '📍 עדכן' : '📍 Update')}
      </button>
    </div>
  )
}

// Dark mode toggle sub-component
const DarkModeToggle: React.FC<{ isRtl: boolean }> = ({ isRtl }) => {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true')

  const handleToggle = () => {
    const newValue = !dark
    setDark(newValue)
    localStorage.setItem('darkMode', String(newValue))
    if (newValue) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <label className={`flex items-center gap-3 cursor-pointer ${isRtl ? 'flex-row-reverse' : ''}`}>
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={dark}
          onChange={handleToggle}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#2d6a4f] transition-colors" />
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
      <span className="text-sm text-gray-600">{isRtl ? '🌙 מצב כהה' : '🌙 Dark Mode'}</span>
    </label>
  )
}

export default SettingsPage
