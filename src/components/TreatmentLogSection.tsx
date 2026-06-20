import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTreatments } from '../hooks/useTreatments'
import { useAlertConfigs } from '../hooks/useAlertConfigs'
import { usePhotos } from '../hooks/usePhotos'
import { TREATMENT_TYPES } from '../lib/treatment-validator'
import { requestNotificationPermission, sendLocalNotification } from '../lib/push-notifications'

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

interface Props {
  treeId: string
}

const today = () => new Date().toISOString().split('T')[0]

const TreatmentLogSection: React.FC<Props> = ({ treeId }) => {
  const { t } = useTranslation()
  const { treatments, loading, error, addTreatment, updateTreatment, deleteTreatment } = useTreatments(treeId)
  const { getConfig, setConfig, removeConfig } = useAlertConfigs(treeId)
  const { uploadPhoto, photos: allPhotos } = usePhotos(treeId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(today())
  const [formType, setFormType] = useState<string>(TREATMENT_TYPES[0])
  const [formNotes, setFormNotes] = useState('')
  const [formPhoto, setFormPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editType, setEditType] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editPhoto, setEditPhoto] = useState<File | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  // Reminder panel state: treatmentId -> open/closed
  const [reminderOpenId, setReminderOpenId] = useState<string | null>(null)
  // Per-treatment-type reminder UI state
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderValue, setReminderValue] = useState(7)
  const [reminderUnit, setReminderUnit] = useState<'days' | 'months' | 'years'>('days')
  const [reminderMode, setReminderMode] = useState<'interval' | 'fixed'>('interval')
  const [reminderFixedDate, setReminderFixedDate] = useState('')
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderToast, setReminderToast] = useState<string | null>(null)

  const resetForm = () => {
    setFormDate(today())
    setFormType(TREATMENT_TYPES[0])
    setFormNotes('')
    setFormPhoto(null)
    setSubmitError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      // Upload photo first if attached
      let photoId: string | undefined
      if (formPhoto) {
        const photo = await uploadPhoto(formPhoto, {
          photo_date: formDate,
          caption: `${t(`treatment.${formType}`)} - ${formDate}`,
        })
        photoId = photo.id
      }
      await addTreatment({
        treatment_date: formDate,
        treatment_type: formType,
        notes: formNotes || undefined,
        photo_id: photoId,
      })
      // Save reminder if enabled
      if (reminderEnabled) {
        if (reminderMode === 'fixed') {
          await setConfig(formType, 0, reminderFixedDate)
        } else {
          let totalDays = reminderValue
          if (reminderUnit === 'months') totalDays = reminderValue * 30
          if (reminderUnit === 'years') totalDays = reminderValue * 365
          await setConfig(formType, totalDays, null)
        }
        await requestNotificationPermission()
      }
      resetForm()
      setReminderEnabled(false)
      setShowForm(false)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTreatment(id)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const handleEditStart = (id: string) => {
    const treatment = treatments.find(t => t.id === id)
    if (!treatment) return
    setEditingId(id)
    setEditDate(treatment.treatment_date)
    setEditType(treatment.treatment_type)
    setEditNotes(treatment.notes ?? '')
    setEditError('')
    // Initialize reminder state for this treatment type
    const existing = getConfig(treatment.treatment_type)
    setReminderEnabled(!!existing && (existing.interval_days != null || existing.snoozed_until != null))
    if (existing?.snoozed_until) {
      setReminderMode('fixed')
      setReminderFixedDate(existing.snoozed_until)
      setReminderValue(1)
      setReminderUnit('days')
    } else {
      setReminderMode('interval')
      const days = existing?.interval_days ?? 7
      if (days >= 365 && days % 365 === 0) { setReminderValue(days / 365); setReminderUnit('years') }
      else if (days >= 30 && days % 30 === 0) { setReminderValue(days / 30); setReminderUnit('months') }
      else { setReminderValue(days); setReminderUnit('days') }
      setReminderFixedDate('')
    }
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditPhoto(null)
    setEditError('')
  }

  const handleEditSave = async (id: string) => {
    setEditSubmitting(true)
    setEditError('')
    try {
      // Upload new photo if provided
      let photoId: string | undefined
      if (editPhoto) {
        const photo = await uploadPhoto(editPhoto, {
          photo_date: editDate,
          caption: `${t(`treatment.${editType}`)} - ${editDate}`,
        })
        photoId = photo.id
      }

      await updateTreatment(id, {
        treatment_date: editDate,
        treatment_type: editType,
        notes: editNotes || undefined,
        ...(photoId ? { photo_id: photoId } : {}),
      })
      // Also save reminder config
      if (reminderEnabled) {
        if (reminderMode === 'fixed') {
          await setConfig(editType, 0, reminderFixedDate)
        } else {
          let totalDays = reminderValue
          if (reminderUnit === 'months') totalDays = reminderValue * 30
          if (reminderUnit === 'years') totalDays = reminderValue * 365
          await setConfig(editType, totalDays, null)
        }
      } else {
        await removeConfig(editType)
      }
      setEditingId(null)
      setEditPhoto(null)
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleReminderOpen = (treatmentId: string, treatmentType: string) => {
    const existing = getConfig(treatmentType)
    setReminderEnabled(!!existing && (existing.interval_days != null || existing.snoozed_until != null))
    
    if (existing?.snoozed_until) {
      // Fixed date mode
      setReminderMode('fixed')
      setReminderFixedDate(existing.snoozed_until)
      setReminderValue(1)
      setReminderUnit('days')
    } else {
      setReminderMode('interval')
      const days = existing?.interval_days ?? 7
      // Convert days to best unit
      if (days >= 365 && days % 365 === 0) {
        setReminderValue(days / 365)
        setReminderUnit('years')
      } else if (days >= 30 && days % 30 === 0) {
        setReminderValue(days / 30)
        setReminderUnit('months')
      } else {
        setReminderValue(days)
        setReminderUnit('days')
      }
      setReminderFixedDate('')
    }
    setReminderOpenId(treatmentId)
  }

  const handleReminderClose = () => {
    setReminderOpenId(null)
  }

  const handleReminderSave = async (treatmentType: string) => {
    setReminderSaving(true)
    try {
      if (reminderEnabled) {
        await requestNotificationPermission()
        if (reminderMode === 'fixed') {
          // Save as fixed date using snoozed_until field
          await setConfig(treatmentType, 0, reminderFixedDate)
          sendLocalNotification(
            t('treatment.reminder'),
            `${t('treatment.reminderOnDate')} ${reminderFixedDate}`
          )
        } else {
          // Convert to days
          let totalDays = reminderValue
          if (reminderUnit === 'months') totalDays = reminderValue * 30
          if (reminderUnit === 'years') totalDays = reminderValue * 365
          await setConfig(treatmentType, totalDays, null)
          const unitLabel = t(`treatment.unit_${reminderUnit}`)
          sendLocalNotification(
            t('treatment.reminder'),
            `${t('treatment.reminderEvery')} ${reminderValue} ${unitLabel}`
          )
        }
      } else {
        await removeConfig(treatmentType)
      }
      setReminderOpenId(null)
      setReminderToast(t('treatment.reminderSaved'))
      setTimeout(() => setReminderToast(null), 3000)
    } finally {
      setReminderSaving(false)
    }
  }

  return (
    <div>
      {/* Heading + Add button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#2d6a4f]">
          {t('tabs.treatments')}
        </h2>
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
          className="text-sm bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? t('common.cancel') : t('treatment.addTreatment')}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 space-y-3">
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
            />
          </div>
          {/* Photo attachment */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              📷 {t('treatment.attachPhoto')} <span className="text-gray-400">({t('common.optional')})</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setFormPhoto(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-lg px-3 py-2.5 text-sm text-center transition-colors ${
                formPhoto ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500 hover:border-[#2d6a4f]'
              }`}
            >
              {formPhoto ? `📷 ${formPhoto.name}` : t('photo.dropOrClick')}
            </button>
          </div>
          {/* Reminder settings in add form */}
          <div className="border-t border-green-200 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🔔</span>
              <span className="text-xs font-medium text-gray-700">{t('treatment.reminder')}</span>
              <span className="text-xs text-gray-400">({t('common.optional')})</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                id="add-form-reminder-toggle"
                type="checkbox"
                checked={reminderEnabled}
                onChange={e => setReminderEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-[#2d6a4f]"
              />
              <label htmlFor="add-form-reminder-toggle" className="text-xs text-gray-600">
                {t('treatment.enableReminder')}
              </label>
            </div>
            {reminderEnabled && (
              <div className="space-y-2 ml-6">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReminderMode('interval')}
                    className={`text-xs px-2 py-1 rounded border ${reminderMode === 'interval' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-300 text-gray-600'}`}
                  >
                    {t('treatment.modeInterval')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderMode('fixed')}
                    className={`text-xs px-2 py-1 rounded border ${reminderMode === 'fixed' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-300 text-gray-600'}`}
                  >
                    {t('treatment.modeFixedDate')}
                  </button>
                </div>
                {reminderMode === 'interval' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={reminderValue}
                      onChange={e => setReminderValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-14 border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <select
                      value={reminderUnit}
                      onChange={e => setReminderUnit(e.target.value as 'days' | 'months' | 'years')}
                      className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="days">{t('treatment.unit_days')}</option>
                      <option value="months">{t('treatment.unit_months')}</option>
                      <option value="years">{t('treatment.unit_years')}</option>
                    </select>
                  </div>
                ) : (
                  <input
                    type="date"
                    value={reminderFixedDate}
                    onChange={e => setReminderFixedDate(e.target.value)}
                    min={today()}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                )}
              </div>
            )}
          </div>
          {submitError && (
            <p className="text-xs text-red-600">{submitError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
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
      )}

      {/* Error state */}
      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      )}

      {/* Treatment list */}
      {!loading && treatments.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-6">
          {t('treatment.noTreatments')}
        </p>
      )}

      {!loading && treatments.length > 0 && (
        <ul className="space-y-2">
          {treatments.map(treatment => (
            <li
              key={treatment.id}
              className="bg-gray-50 rounded-xl px-4 py-3"
              onDoubleClick={() => { if (editingId !== treatment.id) handleEditStart(treatment.id) }}
            >
              {editingId === treatment.id ? (
                /* Inline edit form */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('treatment.date')}
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('treatment.type')}
                      </label>
                      <select
                        value={editType}
                        onChange={e => setEditType(e.target.value)}
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
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('tree.notes')} <span className="text-gray-400">({t('common.optional')})</span>
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none"
                    />
                  </div>
                  {/* Photo in edit form */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      📷 {t('treatment.attachPhoto')} <span className="text-gray-400">({t('common.optional')})</span>
                    </label>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setEditPhoto(e.target.files?.[0] ?? null)}
                    />
                    {/* Show current photo if exists */}
                    {treatment.photo_id && !editPhoto && (() => {
                      const existing = allPhotos.find(p => p.id === treatment.photo_id)
                      if (!existing?.public_url) return null
                      return (
                        <div className="mb-2">
                          <img src={existing.public_url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                        </div>
                      )
                    })()}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className={`w-full border-2 border-dashed rounded-lg px-3 py-2 text-xs text-center transition-colors ${
                        editPhoto ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500 hover:border-[#2d6a4f]'
                      }`}
                    >
                      {editPhoto ? `📷 ${editPhoto.name}` : treatment.photo_id ? `📷 ${t('photo.changePhoto')}` : `📷 ${t('treatment.attachPhoto')}`}
                    </button>
                  </div>
                  {editError && (
                    <p className="text-xs text-red-600">{editError}</p>
                  )}
                  {/* Reminder settings inside edit form */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🔔</span>
                      <span className="text-xs font-medium text-gray-700">{t('treatment.reminder')}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        id={`edit-reminder-toggle-${treatment.id}`}
                        type="checkbox"
                        checked={reminderEnabled}
                        onChange={e => setReminderEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#2d6a4f]"
                      />
                      <label htmlFor={`edit-reminder-toggle-${treatment.id}`} className="text-xs text-gray-600">
                        {t('treatment.enableReminder')}
                      </label>
                    </div>
                    {reminderEnabled && (
                      <div className="space-y-2 ml-6">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setReminderMode('interval')}
                            className={`text-xs px-2 py-1 rounded border ${reminderMode === 'interval' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-300 text-gray-600'}`}
                          >
                            {t('treatment.modeInterval')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReminderMode('fixed')}
                            className={`text-xs px-2 py-1 rounded border ${reminderMode === 'fixed' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-300 text-gray-600'}`}
                          >
                            {t('treatment.modeFixedDate')}
                          </button>
                        </div>
                        {reminderMode === 'interval' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={reminderValue}
                              onChange={e => setReminderValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-14 border border-gray-300 rounded px-2 py-1 text-xs"
                            />
                            <select
                              value={reminderUnit}
                              onChange={e => setReminderUnit(e.target.value as 'days' | 'months' | 'years')}
                              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                            >
                              <option value="days">{t('treatment.unit_days')}</option>
                              <option value="months">{t('treatment.unit_months')}</option>
                              <option value="years">{t('treatment.unit_years')}</option>
                            </select>
                          </div>
                        ) : (
                          <input
                            type="date"
                            value={reminderFixedDate}
                            onChange={e => setReminderFixedDate(e.target.value)}
                            min={today()}
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleEditCancel}
                      disabled={editSubmitting}
                      className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditSave(treatment.id)}
                      disabled={editSubmitting}
                      className="text-sm bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {editSubmitting ? t('common.loading') : t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal display row */
                <>
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span className="text-xl mt-0.5 leading-none" aria-hidden="true">
                      {TREATMENT_ICONS[treatment.treatment_type] ?? '📝'}
                    </span>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {t(`treatment.${treatment.treatment_type}`)}
                        </span>
                        <span className="text-xs text-gray-400">{treatment.treatment_date}</span>
                      </div>
                      {treatment.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{treatment.notes}</p>
                      )}
                      {/* Show treatment photo thumbnail */}
                      {treatment.photo_id && (() => {
                        const photo = allPhotos.find(p => p.id === treatment.photo_id)
                        if (!photo?.public_url) return null
                        return (
                          <div className="mt-1.5">
                            <img
                              src={photo.public_url}
                              alt={t('treatment.attachPhoto')}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            />
                          </div>
                        )
                      })()}
                      {/* Show active reminder info */}
                      {(() => {
                        const cfg = getConfig(treatment.treatment_type)
                        if (!cfg) return null
                        if (cfg.snoozed_until) {
                          return (
                            <p className="text-xs text-yellow-600 mt-0.5">
                              🔔 {t('treatment.reminderOnDate')} {cfg.snoozed_until}
                            </p>
                          )
                        }
                        if (cfg.interval_days) {
                          const days = cfg.interval_days
                          let label = ''
                          if (days >= 365 && days % 365 === 0) label = `${days / 365} ${t('treatment.unit_years')}`
                          else if (days >= 30 && days % 30 === 0) label = `${days / 30} ${t('treatment.unit_months')}`
                          else label = `${days} ${t('treatment.unit_days')}`
                          return (
                            <p className="text-xs text-yellow-600 mt-0.5">
                              🔔 {t('treatment.reminderEvery')} {label}
                            </p>
                          )
                        }
                        return null
                      })()}
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Reminder bell */}
                      <button
                        onClick={() => handleReminderOpen(treatment.id, treatment.treatment_type)}
                        className={`p-1 transition-colors ${
                          getConfig(treatment.treatment_type)
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-400 hover:text-yellow-500'
                        }`}
                        aria-label={t('treatment.reminder')}
                        title={t('treatment.reminder')}
                      >
                        🔔
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => handleEditStart(treatment.id)}
                        className="text-gray-400 hover:text-[#2d6a4f] transition-colors p-1"
                        aria-label={t('common.edit')}
                        title={t('common.edit')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setConfirmDeleteId(treatment.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Reminder panel (inline, below the row) */}
                  {reminderOpenId === treatment.id && (
                    <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          id={`reminder-toggle-${treatment.id}`}
                          type="checkbox"
                          checked={reminderEnabled}
                          onChange={e => setReminderEnabled(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#2d6a4f]"
                        />
                        <label htmlFor={`reminder-toggle-${treatment.id}`} className="text-sm text-gray-700">
                          {t('treatment.enableReminder')}
                        </label>
                      </div>
                      {reminderEnabled && (
                        <div className="space-y-3">
                          {/* Mode selector: interval vs fixed date */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setReminderMode('interval')}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                reminderMode === 'interval'
                                  ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {t('treatment.modeInterval')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReminderMode('fixed')}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                reminderMode === 'fixed'
                                  ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {t('treatment.modeFixedDate')}
                            </button>
                          </div>

                          {reminderMode === 'interval' ? (
                            /* Interval: value + unit */
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-gray-600">{t('treatment.reminderEvery')}</span>
                              <input
                                type="number"
                                min={1}
                                value={reminderValue}
                                onChange={e => setReminderValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                              />
                              <select
                                value={reminderUnit}
                                onChange={e => setReminderUnit(e.target.value as 'days' | 'months' | 'years')}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white"
                              >
                                <option value="days">{t('treatment.unit_days')}</option>
                                <option value="months">{t('treatment.unit_months')}</option>
                                <option value="years">{t('treatment.unit_years')}</option>
                              </select>
                            </div>
                          ) : (
                            /* Fixed date with calendar */
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">{t('treatment.reminderOnDate')}</span>
                              <input
                                type="date"
                                value={reminderFixedDate}
                                onChange={e => setReminderFixedDate(e.target.value)}
                                min={today()}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={handleReminderClose}
                          className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReminderSave(treatment.treatment_type)}
                          disabled={reminderSaving || (reminderEnabled && reminderMode === 'fixed' && !reminderFixedDate)}
                          className="text-xs bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                          {reminderSaving ? t('common.loading') : t('common.save')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.confirm')}</h3>
            <p className="text-sm text-gray-600 mb-6">{t('common.deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {t('common.yes')}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.no')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder saved toast */}
      {reminderToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2d6a4f] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          {reminderToast}
        </div>
      )}
    </div>
  )
}

export default TreatmentLogSection
