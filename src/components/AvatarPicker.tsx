import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'
import { compressImage } from '../lib/photo-utils'

interface AvatarPickerProps {
  currentAvatarUrl: string | null
  onUpdate: (url: string) => void
  onClose: () => void
}

// Pre-made bonsai avatars (emoji on colored background)
const PRESET_AVATARS = [
  { emoji: '🌳', bg: '#2d6a4f' },
  { emoji: '🎋', bg: '#1b4332' },
  { emoji: '🌿', bg: '#40916c' },
  { emoji: '🌸', bg: '#d4a5a5' },
  { emoji: '🍁', bg: '#9c4a1a' },
  { emoji: '🪴', bg: '#3d5a3d' },
  { emoji: '🌲', bg: '#1a3a1a' },
  { emoji: '🍃', bg: '#52b788' },
  { emoji: '🌴', bg: '#6b8e6b' },
  { emoji: '🌵', bg: '#8b7355' },
  { emoji: '🎍', bg: '#4a6741' },
  { emoji: '🌱', bg: '#74c69d' },
]

const AvatarPicker: React.FC<AvatarPickerProps> = ({ currentAvatarUrl, onUpdate, onClose }) => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'he'
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handlePresetSelect = async (emoji: string, bg: string) => {
    if (!user) return
    const avatarValue = `preset:${emoji}:${bg}`
    const { error: updateErr } = await supabase
      .from('user_profiles')
      .update({ avatar_url: avatarValue })
      .eq('id', user.id)

    if (updateErr) {
      setError(updateErr.message)
      return
    }
    onUpdate(avatarValue)
    onClose()
  }

  const handleFileUpload = async (file: File) => {
    if (!user) return
    setUploading(true)
    setError('')

    try {
      const compressed = await compressImage(file)
      const path = `${user.id}/avatar.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('bonsai-photos')
        .upload(path, compressed, { upsert: true })

      if (uploadErr) throw uploadErr

      const { data: signed } = await supabase.storage
        .from('bonsai-photos')
        .createSignedUrl(path, 365 * 24 * 60 * 60)

      if (!signed?.signedUrl) throw new Error('Failed to get URL')

      await supabase
        .from('user_profiles')
        .update({ avatar_url: signed.signedUrl })
        .eq('id', user.id)

      onUpdate(signed.signedUrl)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            👤 {isRtl ? 'בחר תמונת פרופיל' : 'Choose Profile Picture'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Upload options */}
        <div className="flex gap-3 mb-4">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            📁 {isRtl ? 'גלריה' : 'Gallery'}
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            📸 {isRtl ? 'צלם' : 'Camera'}
          </button>
        </div>

        {uploading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#2d6a4f] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {/* Preset avatars */}
        <div>
          <p className="text-xs text-gray-500 mb-2">{isRtl ? 'או בחר אווטאר:' : 'Or choose an avatar:'}</p>
          <div className="grid grid-cols-4 gap-3">
            {PRESET_AVATARS.map(({ emoji, bg }, i) => (
              <button
                key={i}
                onClick={() => handlePresetSelect(emoji, bg)}
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl hover:ring-4 hover:ring-[#52b788]/40 transition-all mx-auto"
                style={{ backgroundColor: bg }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AvatarPicker

// Helper to render avatar from URL (handles preset format)
export function renderAvatar(avatarUrl: string | null, displayName: string | null, size = 'w-10 h-10', textSize = 'text-sm') {
  if (avatarUrl?.startsWith('preset:')) {
    const parts = avatarUrl.split(':')
    const emoji = parts[1] ?? '🌳'
    const bg = parts[2] ?? '#2d6a4f'
    return (
      <div className={`${size} rounded-full flex items-center justify-center`} style={{ backgroundColor: bg }}>
        <span className={textSize === 'text-sm' ? 'text-lg' : textSize === 'text-xs' ? 'text-sm' : 'text-xl'}>{emoji}</span>
      </div>
    )
  }

  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt="" className={`${size} rounded-full object-cover`} />
    )
  }

  return (
    <div className={`${size} rounded-full bg-[#2d6a4f] flex items-center justify-center text-white font-bold ${textSize}`}>
      {(displayName ?? '?').charAt(0).toUpperCase()}
    </div>
  )
}
