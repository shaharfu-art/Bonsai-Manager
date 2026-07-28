import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-client'
import WeatherWidget from './WeatherWidget'
import { renderAvatar } from './AvatarPicker'
import { useNotifications } from '../hooks/useNotifications'

interface LayoutProps {
  children: React.ReactNode
}


const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation()
  
const { user } = useAuth()
  
const navigate = useNavigate()

  
const isRtl = i18n.language === 'he'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
const [displayName, setDisplayName] = useState<string | null>(null)
  
const [showMenu, setShowMenu] = useState(false)
  
const { unreadCount } = useNotifications()

  useEffect(() => {
    if (!user) 
return
    supabase.from('user_profiles').select('avatar_url, display_name, username').eq('id', user.id).single()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url ?? null)
        setDisplayName(data?.display_name ?? data?.username ?? null)
      })
  }, [user])

  
return (
    <div className="min-h-screen bg-[#f0f7f4] overflow-x-hidden" dir="ltr">
      {/* Top navigation bar */}
      <nav className="bg-[#2d6a4f] text-white shadow-md">
        <div className="w-full px-3 h-14 flex items-center justify-between">
          {/* Left side: Avatar + Bell + Weather */}
          <div className="flex items-center gap-2">
            {/* Avatar with dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 rounded-full overflow-hidden hover:ring-2 hover:ring-white/50 transition-all flex-shrink-0"
              >
                {renderAvatar(avatarUrl, displayName, 'w-9 h-9', 'text-sm')}
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute top-10 left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-44">
                    <button
                      onClick={() => { setShowMenu(false); navigate('/community') }}
                      className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      👥 {isRtl ? 'קהילה' : 'Community'}
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); navigate(`/user/${user?.id}`) }}
                      className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      👤 {isRtl ? 'פרופיל' : 'Profile'}
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); navigate('/settings') }}
                      className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      ⚙️ {isRtl ? 'הגדרות' : 'Settings'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Notifications bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative text-green-100 hover:text-white transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Weather widget */}
            <WeatherWidget />
          </div>

          {/* Right side: Logo */}
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 font-bold text-sm sm:text-lg hover:text-green-200 transition-colors flex-shrink-0"
          >
            <span>Tree Manager</span>
            <span>🌿</span>
          </Link>
        </div>
      </nav>

      {/* Page content */}
      <main className="w-full px-4 py-6 mx-auto" style={{ maxWidth: '100%' }}>
        {children}
      </main>
    </div>
  )
}


export default Layout
