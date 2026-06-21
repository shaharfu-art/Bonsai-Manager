import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

type AuthMode = 'login' | 'signup' | 'forgotPassword'

const AuthPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const isRtl = i18n.language === 'he'
  const dir = isRtl ? 'rtl' : 'ltr'

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccessMsg('')
  }

  const switchMode = (newMode: AuthMode) => {
    resetForm()
    setMode(newMode)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/dashboard', { replace: true })
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError(t('auth.passwordsMismatch'))
          setLoading(false)
          return
        }
        await signUp(email, password)
        navigate('/dashboard', { replace: true })
      } else if (mode === 'forgotPassword') {
        await resetPassword(email)
        setSuccessMsg(t('auth.resetPassword') + ' – check your email')
      }
    } catch (err: unknown) {
      let msg = t('common.error')
      if (err instanceof Error && err.message === 'CONFIRM_EMAIL') {
        setSuccessMsg(t('auth.confirmEmail'))
        setLoading(false)
        return
      }
      if (err && typeof err === 'object') {
        if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
          msg = (err as { message: string }).message
        } else if ('error_description' in err) {
          msg = String((err as { error_description: unknown }).error_description)
        } else {
          try { msg = JSON.stringify(err) } catch { /* ignore */ }
          if (msg === '{}' || msg === '[]') msg = t('common.error')
        }
      } else if (typeof err === 'string') {
        msg = err
      }
      if (msg.includes('Invalid login credentials')) setError(t('auth.invalidCredentials'))
      else if (msg.includes('User already registered')) setError(t('auth.alreadyRegistered'))
      else if (msg.includes('Password should be at least')) setError(t('auth.passwordTooShort'))
      else if (msg === '{}' || msg === '[]' || msg === 'null') setError(t('common.error'))
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    try {
      await signInWithGoogle()
      // signInWithOAuth redirects the browser, so if we get here it means something went wrong
    } catch (err: unknown) {
      let msg = t('common.error')
      if (err && typeof err === 'object' && 'message' in err) {
        msg = String((err as { message: unknown }).message)
      }
      setError(msg)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#f0f7f4] px-4"
      dir={dir}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <span className="text-5xl mb-2">🌿</span>
          <h1 className="text-2xl font-bold text-[#2d6a4f]">
            {t('app.name')}
          </h1>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
          {mode === 'login' && t('auth.login')}
          {mode === 'signup' && t('auth.signup')}
          {mode === 'forgotPassword' && t('auth.forgotPassword')}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] focus:border-transparent"
              placeholder={t('auth.email')}
              dir="ltr"
            />
          </div>

          {/* Password (login + signup) */}
          {(mode === 'login' || mode === 'signup') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] focus:border-transparent"
                placeholder={t('auth.password')}
                dir="ltr"
              />
              {mode === 'signup' && (
                <p className="text-xs text-gray-400 mt-1">{t('auth.passwordHint')}</p>
              )}
            </div>
          )}

          {/* Confirm password (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')} (confirm)
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] focus:border-transparent"
                placeholder={t('auth.password')}
                dir="ltr"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          {/* Success message */}
          {successMsg && (
            <p className="text-green-700 text-sm">{successMsg}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? t('common.loading') : (
              <>
                {mode === 'login' && t('auth.login')}
                {mode === 'signup' && t('auth.signup')}
                {mode === 'forgotPassword' && t('auth.resetPassword')}
              </>
            )}
          </button>
        </form>

        {/* Google OAuth (login + signup only) */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="mt-4">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400">
                <span className="px-2 bg-white">or</span>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t('auth.continueWithGoogle')} ({t('auth.comingSoon')})
            </button>
          </div>
        )}

        {/* Mode links */}
        <div className="mt-6 text-center text-sm text-gray-600 space-y-2">
          {mode === 'login' && (
            <>
              <p>
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-[#2d6a4f] font-medium hover:underline"
                >
                  {t('auth.signup')}
                </button>
              </p>
              <p>
                <button
                  type="button"
                  onClick={() => switchMode('forgotPassword')}
                  className="text-[#2d6a4f] font-medium hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p>
              {t('auth.hasAccount')}{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-[#2d6a4f] font-medium hover:underline"
              >
                {t('auth.login')}
              </button>
            </p>
          )}
          {mode === 'forgotPassword' && (
            <p>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-[#2d6a4f] font-medium hover:underline"
              >
                ← {t('auth.login')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthPage
