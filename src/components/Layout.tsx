import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const isRtl = i18n.language === 'he'

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f7f4]" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top navigation bar */}
      <nav className="bg-[#2d6a4f] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left group (or right in RTL): logo + nav links */}
          <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            {/* App logo */}
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 font-bold text-lg hover:text-green-200 transition-colors"
            >
              <span>🌿</span>
              <span>Bonsai</span>
            </Link>

            {/* Dashboard link */}
            <Link
              to="/dashboard"
              className="text-sm text-green-100 hover:text-white transition-colors hidden sm:block"
            >
              {t('nav.dashboard')}
            </Link>
          </div>

          {/* Right group (or left in RTL): actions + user */}
          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            {/* Settings link */}
            <Link
              to="/settings"
              className="text-green-100 hover:text-white transition-colors"
              title={t('nav.settings')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>

            {/* User email (truncated) */}
            {user?.email && (
              <span className="hidden md:block text-xs text-green-200 max-w-[140px] truncate">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

export default Layout
