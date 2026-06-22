import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'
import { TREATMENT_TYPES } from '../lib/treatment-validator'

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
  const [formDate, setFormDate] = useState(today())
  const [formType, setFormType] = useState(treatmentType)
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase
        .from('treatment_logs')
        .insert({
          tree_id: treeId,
          user_id: userData.user.id,
          treatment_date: formDate,
          treatment_type: formType,
          notes: formNotes || null,
          photo_id: null,
          status: 'completed',
        })

      if (insertError) throw insertError
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
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
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
