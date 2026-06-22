import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'
import { TREATMENT_TYPES } from '../lib/treatment-validator'
import { isImageSizeValid } from '../lib/photo-utils'

const TREATMENT_ICONS: Record<string, string> = {
  watering: '💧',
  fertilizing: '🌱',
  branch_pruning: '✂️',
  root_pruning: '🌿',
  wiring: '🔧',
  wire_removal: '🔓',
  repotting: '🪴',
  pest_treatment: '🐛',
  shading: '⛱️',
  sun_exposure: '☀️',
  winter_dormancy: '❄️',
  other: '📝',
}

interface QuickTreatmentDialogProps {
  treeId: string
  treeName: string
  treatmentType: string
  onClose: () => void
  onSaved: () => void
}

const today = () => new Date().toISOString().split('T')[0]

const QuickTreatmentDialog: React.FC<QuickTreatmentDialogProps> = ({
  treeId,
  treeName,
  treatmentType,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formDate, setFormDate] = useState(today())
  const [formType, setFormType] = useState(treatmentType)
  const [formNotes, setFormNotes] = useState('')
  const [formPhotos, setFormPhotos] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw new Error('Not authenticated')
      const userId = userData.user.id

      // 1. Create the treatment log
      const { data: treatmentData, error: insertError } = await supabase
        .from('treatment_logs')
        .insert({
          tree_id: treeId,
          user_id: userId,
          treatment_date: formDate,
          treatment_type: formType,
          notes: formNotes || null,
          photo_id: null,
          status: 'completed',
        })
        .select()
        .single()

      if (insertError) throw insertError
      const treatmentId = treatmentData.id

      // 2. Upload photos (up to 2)
      for (const file of formPhotos.slice(0, 2)) {
        if (!isImageSizeValid(file)) continue
        const uuid = crypto.randomUUID()
        const storagePath = `${userId}/${treeId}/${uuid}.jpg`

        const { error: uploadErr } = await supabase.storage
          .from('bonsai-photos')
          .upload(storagePath, file)
        if (uploadErr) continue

        const { data: signedData } = await supabase.storage
          .from('bonsai-photos')
          .createSignedUrl(storagePath, 3600)

        await supabase.from('photos').insert({
          tree_id: treeId,
          user_id: userId,
          storage_path: storagePath,
          public_url: signedData?.signedUrl ?? null,
          photo_date: formDate,
          caption: `${t(`treatment.${formType}`)} - ${formDate}`,
          is_cover: false,
          treatment_log_id: treatmentId,
        })
      }

      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#2d6a4f]">
              {TREATMENT_ICONS[treatmentType] ?? '📝'} {t(`treatment.${treatmentType}`)}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{treeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label={t('common.cancel')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('treatment.date')}
              </label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('treatment.type')}
              </label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white"
              >
                {TREATMENT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {TREATMENT_ICONS[type]} {t(`treatment.${type}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('tree.notes')} <span className="text-gray-400">({t('common.optional')})</span>
            </label>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
              autoFocus
            />
          </div>

          {/* Photo attachment (up to 2) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              📷 {t('treatment.attachPhotos')} <span className="text-gray-400">({t('common.optional')})</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? []).slice(0, 2 - formPhotos.length)
                setFormPhotos(prev => [...prev, ...files].slice(0, 2))
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={formPhotos.length >= 2}
              className={`w-full border-2 border-dashed rounded-lg px-3 py-2 text-sm text-center transition-colors ${
                formPhotos.length > 0 ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500 hover:border-[#2d6a4f]'
              } disabled:opacity-50`}
            >
              {formPhotos.length > 0
                ? `📷 ${t('treatment.photosAttached', { count: formPhotos.length })}`
                : t('photo.dropOrClick')}
            </button>
            {formPhotos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {formPhotos.map((file, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none shadow-sm"
                      aria-label={t('common.delete')}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="text-sm bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuickTreatmentDialog
