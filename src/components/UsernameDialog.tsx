import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

interface UsernameDialogProps {
  onComplete: (username: string) => void
}

const UsernameDialog: React.FC<UsernameDialogProps> = ({ onComplete }) => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'he'
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Validate and check availability as user types
  useEffect(() => {
    if (!username.trim()) {
      setAvailable(null)
      setError('')
      return
    }

    // Validate format: 3-20 chars, lowercase letters, numbers, underscores
    const isValid = /^[a-z0-9_]{3,20}$/.test(username)
    if (!isValid) {
      setAvailable(null)
      setError(isRtl
        ? 'שם משתמש: 3-20 תווים, אותיות באנגלית קטנות, מספרים או _'
        : 'Username: 3-20 chars, lowercase letters, numbers or _')
      return
    }

    setError('')
    setChecking(true)

    // Debounce the check
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()

      setAvailable(!data)
      setChecking(false)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username, isRtl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!available || !user) return

    setSaving(true)
    setError('')

    const { error: updateErr } = await supabase
      .from('user_profiles')
      .update({ username })
      .eq('id', user.id)

    if (updateErr) {
      if (updateErr.message.includes('unique') || updateErr.message.includes('duplicate')) {
        setError(isRtl ? 'שם משתמש תפוס, נסה אחר' : 'Username taken, try another')
        setAvailable(false)
      } else {
        setError(updateErr.message)
      }
      setSaving(false)
      return
    }

    onComplete(username)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <span className="text-4xl block mb-2">👤</span>
          <h2 className="text-lg font-bold text-gray-900">
            {isRtl ? 'בחר שם משתמש' : 'Choose a username'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isRtl ? 'ככה חברים ימצאו אותך בקהילה' : 'This is how friends will find you'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute top-2.5 left-3 text-gray-400 text-sm">@</span>
            <input
              type="text"
              inputMode="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="your_name"
              maxLength={20}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm pl-8 focus:outline-none focus:ring-2 ${
                available === true ? 'border-green-400 focus:ring-green-300' :
                available === false ? 'border-red-400 focus:ring-red-300' :
                'border-gray-300 focus:ring-[#52b788]'
              }`}
              dir="ltr"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            {/* Status indicator */}
            <div className="absolute top-2.5 right-3">
              {checking && <span className="text-xs text-gray-400">...</span>}
              {!checking && available === true && <span className="text-green-500">✓</span>}
              {!checking && available === false && <span className="text-red-500">✗</span>}
            </div>
          </div>

          {/* Feedback */}
          {error && <p className="text-xs text-red-500">{error}</p>}
          {available === true && !error && (
            <p className="text-xs text-green-600">
              {isRtl ? '✓ זמין!' : '✓ Available!'}
            </p>
          )}
          {available === false && !error && (
            <p className="text-xs text-red-500">
              {isRtl ? '✗ תפוס, נסה שם אחר' : '✗ Taken, try another'}
            </p>
          )}

          <button
            type="submit"
            disabled={!available || saving}
            className="w-full bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40"
          >
            {saving
              ? (isRtl ? 'שומר...' : 'Saving...')
              : (isRtl ? 'אישור' : 'Confirm')
            }
          </button>
        </form>
      </div>
    </div>
  )
}

export default UsernameDialog
