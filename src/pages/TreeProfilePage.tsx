import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase-client'
import { useSpecies } from '../hooks/useSpecies'
import { usePhotos } from '../hooks/usePhotos'
import { useAlertConfigs } from '../hooks/useAlertConfigs'
import { TREATMENT_TYPES } from '../lib/treatment-validator'
import type { Tree } from '../hooks/useTrees'
import TreatmentLogSection from '../components/TreatmentLogSection'
import PhotoTimelineSection from '../components/PhotoTimelineSection'

// ─── Section heading ────────────────────────────────────────
const SectionHeading: React.FC<{ title: string }> = ({ title }) => (
  <h2 className="text-base font-semibold text-[#2d6a4f] border-b border-green-100 pb-1 mb-3">
    {title}
  </h2>
)

// ─── Info field ─────────────────────────────────────────────
const InfoField: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => (
  <div>
    <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
    <dd className="text-sm text-gray-900 mt-0.5 font-medium">{value || '—'}</dd>
  </div>
)

// ─── Delete confirmation dialog ─────────────────────────────
interface DeleteDialogProps {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ onConfirm, onCancel, loading }) => {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.confirm')}</h3>
        <p className="text-sm text-gray-600 mb-6">{t('common.deleteConfirm')}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? t('common.loading') : t('common.yes')}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('common.no')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────
const TreeProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { getSpeciesById } = useSpecies()
  const { photos, setCoverPhoto, uploadPhoto } = usePhotos(id ?? '')

  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'treatments' | 'photos' | 'alerts'>('treatments')
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const coverUploadRef = useRef<HTMLInputElement>(null)
  const [coverUploading, setCoverUploading] = useState(false)

  // If navigated from alert click, get the treatment type to pre-fill
  const openTreatmentType = (location.state as { openTreatment?: string } | null)?.openTreatment ?? null

  const isRtl = i18n.language === 'he'

  // Get current cover photo
  const coverPhoto = photos.find(p => p.is_cover) ?? photos[0] ?? null

  const handleSetCoverFromPicker = async (photoId: string) => {
    await setCoverPhoto(photoId)
    setShowCoverPicker(false)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setCoverUploading(true)
    try {
      await uploadPhoto(file, {
        photo_date: new Date().toISOString().split('T')[0],
        caption: tree?.custom_name ?? '',
      })
    } catch (err) {
      console.error('Cover upload failed:', err)
    } finally {
      setCoverUploading(false)
      if (coverUploadRef.current) coverUploadRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setError('')

    supabase
      .from('trees')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setTree(data as Tree)
        }
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      const { error: deleteError } = await supabase
        .from('trees')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const speciesName = tree?.species_id
    ? (() => {
        const s = getSpeciesById(tree.species_id!)
        return s ? (isRtl ? s.name_he : s.name_en) : null
      })()
    : null

  const displaySpecies = speciesName || tree?.species_free_text

  // ── Loading ──
  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  // ── Error ──
  if (error || !tree) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-red-600 text-sm mb-4">{error || t('common.error')}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[#2d6a4f] hover:underline text-sm"
          >
            ← {t('nav.dashboard')}
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Cover / Hero */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-[#2d6a4f] to-[#52b788] rounded-2xl shadow flex items-center justify-center overflow-hidden">
          {coverPhoto?.public_url ? (
            <img src={coverPhoto.public_url} alt={tree.custom_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl" role="img" aria-label="bonsai">🌿</span>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-5 py-3">
            <h1 className="text-white text-2xl font-bold drop-shadow">{tree.custom_name}</h1>
            {displaySpecies && (
              <p className="text-green-200 text-sm">{displaySpecies}</p>
            )}
            {tree.style && (
              <p className="text-green-300 text-xs">{t(`style.${tree.style}`)}</p>
            )}
          </div>
          {/* Change cover photo button */}
          {photos.length > 0 && (
            <button
              onClick={() => setShowCoverPicker(true)}
              className="absolute top-3 right-3 bg-white/80 hover:bg-white w-8 h-8 rounded-full shadow flex items-center justify-center text-lg transition-colors"
              title={t('photo.changeCover')}
            >
              📷
            </button>
          )}
          {/* Upload first photo button (when no photos) */}
          {photos.length === 0 && (
            <>
              <input
                ref={coverUploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
              <button
                onClick={() => coverUploadRef.current?.click()}
                disabled={coverUploading}
                className="absolute top-3 right-3 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full shadow flex items-center gap-1 text-xs font-medium text-[#2d6a4f] transition-colors disabled:opacity-50"
                title={t('photo.addPhoto')}
              >
                📷 {coverUploading ? t('common.loading') : t('photo.addPhoto')}
              </button>
            </>
          )}
        </div>

        {/* Cover photo picker dialog */}
        {showCoverPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('photo.chooseCover')}</h3>
                <button
                  onClick={() => setShowCoverPicker(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => handleSetCoverFromPicker(photo.id)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors relative ${
                      photo.is_cover ? 'border-yellow-400' : 'border-transparent hover:border-[#52b788]'
                    }`}
                  >
                    {photo.public_url ? (
                      <img src={photo.public_url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl">🖼️</div>
                    )}
                    {photo.is_cover && (
                      <span className="absolute top-1 right-1 text-sm">⭐</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ID Card - תעודת זהות */}
        <div className="bg-white rounded-xl shadow p-4 -mt-6 relative z-10 mx-4">
          <h2 className="text-sm font-bold text-[#2d6a4f] mb-2">🪪 {tree.custom_name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displaySpecies && (
              <p className="text-xs text-gray-600">🌳 {displaySpecies}</p>
            )}
            {tree.age_years && (
              <p className="text-xs text-gray-600">🗓️ {tree.age_years} {t('tree.age').replace('(שנים)', '').replace('(years)', '').trim()}</p>
            )}
            {tree.style && (
              <p className="text-xs text-gray-600">✨ {t(`style.${tree.style}`)}</p>
            )}
            {tree.location && (
              <p className="text-xs text-gray-600">📍 {t(`location.${tree.location}`)}</p>
            )}
            {tree.pot_type && (
              <p className="text-xs text-gray-600">🪴 {tree.pot_type}</p>
            )}
            {tree.substrate && (
              <p className="text-xs text-gray-600">🧱 {tree.substrate}</p>
            )}
            {tree.date_added && (
              <p className="text-xs text-gray-600">📅 {tree.date_added}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate(`/trees/new`, { state: { editTree: tree } })}
            className="flex items-center gap-1.5 bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {t('common.edit')}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('common.delete')}
          </button>
        </div>

        {/* Info grid */}
        <div className="bg-white rounded-2xl shadow p-5">
          <SectionHeading title={t('tree.name')} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {displaySpecies && (
              <InfoField label={t('tree.species')} value={displaySpecies} />
            )}
            {tree.style && (
              <InfoField label={t('tree.style')} value={t(`style.${tree.style}`)} />
            )}
            {tree.age_years != null && (
              <InfoField label={t('tree.age')} value={String(tree.age_years)} />
            )}
            {tree.origin && (
              <InfoField label={t('tree.origin')} value={t(`origin.${tree.origin}`)} />
            )}
            {tree.pot_type && (
              <InfoField label={t('tree.potType')} value={tree.pot_type} />
            )}
            {tree.pot_size && (
              <InfoField label={t('tree.potSize')} value={tree.pot_size} />
            )}
            {tree.location && (
              <InfoField label={t('tree.location')} value={t(`location.${tree.location}`)} />
            )}
            {tree.date_added && (
              <InfoField label={t('tree.dateAdded')} value={tree.date_added} />
            )}
          </dl>
        </div>

        {/* Notes */}
        {tree.notes && (
          <div className="bg-white rounded-2xl shadow p-5">
            <SectionHeading title={t('tree.notes')} />
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{tree.notes}</p>
          </div>
        )}

        {/* Tabs: Treatment Log | Photos | Alerts */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b border-gray-100">
            {(['treatments', 'photos', 'alerts'] as const).map((tab) => {
              const labels: Record<typeof tab, string> = {
                treatments: t('tabs.treatments'),
                photos: t('tabs.photos'),
                alerts: t('tabs.alerts'),
              }
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-[#2d6a4f] border-b-2 border-[#2d6a4f]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {labels[tab]}
                </button>
              )
            })}
          </div>
          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'treatments' && <TreatmentLogSection treeId={id!} initialTreatmentType={openTreatmentType} />}
            {activeTab === 'photos' && (
              <PhotoTimelineSection
                treeId={id!}
                onCoverPhotoChange={(_photoId) => {
                  // Could update tree cover photo here if needed
                }}
              />
            )}
            {activeTab === 'alerts' && (
              <AlertsTabContent treeId={id!} />
            )}
          </div>
        </div>

      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <DeleteDialog
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          loading={deleting}
        />
      )}
    </Layout>
  )
}

// ─── Alerts Tab Content ──────────────────────────────────────
const TREATMENT_ICONS: Record<string, string> = {
  watering: '💧', fertilizing: '🌱', branch_pruning: '✂️', root_pruning: '🌿',
  wiring: '🔧', wire_removal: '🔓', repotting: '🪴', pest_treatment: '🐛',
  shading: '⛱️', sun_exposure: '☀️', winter_dormancy: '❄️', other: '📝',
}

const AlertsTabContent: React.FC<{ treeId: string }> = ({ treeId }) => {
  const { t } = useTranslation()
  const { configs, loading, getConfig, setConfig, removeConfig } = useAlertConfigs(treeId)
  const [lastTreatments, setLastTreatments] = useState<Record<string, string>>({})
  const [editingType, setEditingType] = useState<string | null>(null)
  const [editValue, setEditValue] = useState(7)
  const [editUnit, setEditUnit] = useState<'days' | 'months' | 'years'>('days')
  const [editMode, setEditMode] = useState<'interval' | 'fixed'>('interval')
  const [editFixedDate, setEditFixedDate] = useState('')

  useEffect(() => {
    supabase
      .from('treatment_logs')
      .select('treatment_type, treatment_date')
      .eq('tree_id', treeId)
      .order('treatment_date', { ascending: false })
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const row of data ?? []) {
          if (!map[row.treatment_type]) map[row.treatment_type] = row.treatment_date
        }
        setLastTreatments(map)
      })
  }, [treeId])

  const handleEdit = (type: string) => {
    const cfg = getConfig(type)
    if (cfg?.snoozed_until) {
      setEditMode('fixed')
      setEditFixedDate(cfg.snoozed_until)
      setEditValue(1); setEditUnit('days')
    } else {
      setEditMode('interval')
      const days = cfg?.interval_days ?? 7
      if (days >= 365 && days % 365 === 0) { setEditValue(days / 365); setEditUnit('years') }
      else if (days >= 30 && days % 30 === 0) { setEditValue(days / 30); setEditUnit('months') }
      else { setEditValue(days); setEditUnit('days') }
      setEditFixedDate('')
    }
    setEditingType(type)
  }

  const handleSave = async (type: string) => {
    if (editMode === 'fixed') {
      await setConfig(type, 0, editFixedDate)
    } else {
      let totalDays = editValue
      if (editUnit === 'months') totalDays = editValue * 30
      if (editUnit === 'years') totalDays = editValue * 365
      await setConfig(type, totalDays, null)
    }
    setEditingType(null)
  }

  const handleRemove = async (type: string) => {
    await removeConfig(type)
    setEditingType(null)
  }

  const today = new Date()

  const getAlertStatus = (type: string): { status: 'due' | 'upcoming' | 'ok' | 'none'; dueDate: string } => {
    const cfg = getConfig(type)
    if (!cfg) return { status: 'none', dueDate: '' }
    if (cfg.snoozed_until) {
      const d = new Date(cfg.snoozed_until)
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000*60*60*24))
      if (diff <= 0) return { status: 'due', dueDate: cfg.snoozed_until }
      if (diff <= 30) return { status: 'upcoming', dueDate: cfg.snoozed_until }
      return { status: 'ok', dueDate: cfg.snoozed_until }
    }
    if (!cfg.interval_days || cfg.interval_days <= 0) return { status: 'none', dueDate: '' }
    const last = lastTreatments[type]
    const lastDate = last ? new Date(last) : new Date(0)
    const next = new Date(lastDate.getTime() + cfg.interval_days * 24*60*60*1000)
    const diff = Math.ceil((next.getTime() - today.getTime()) / (1000*60*60*24))
    const dueStr = next.toISOString().split('T')[0]
    if (diff <= 0) return { status: 'due', dueDate: dueStr }
    if (diff <= 30) return { status: 'upcoming', dueDate: dueStr }
    return { status: 'ok', dueDate: dueStr }
  }

  if (loading) return <div className="animate-pulse space-y-2">{[0,1,2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}</div>

  const configuredTypes = configs.map(c => c.treatment_type)
  const unconfiguredTypes = TREATMENT_TYPES.filter(t => !configuredTypes.includes(t))

  return (
    <div className="space-y-4">
      {/* Configured alerts */}
      {configs.length === 0 && unconfiguredTypes.length === TREATMENT_TYPES.length && (
        <p className="text-center text-gray-400 text-sm py-4">{t('alert.noAlerts')}</p>
      )}

      {configs.length > 0 && (
        <div className="space-y-2">
          {configs.map(cfg => {
            const { status, dueDate } = getAlertStatus(cfg.treatment_type)
            return (
              <div key={cfg.id} className="bg-gray-50 rounded-xl px-4 py-3">
                {editingType === cfg.treatment_type ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <span>{TREATMENT_ICONS[cfg.treatment_type] ?? '📝'}</span>
                      {t(`treatment.${cfg.treatment_type}`)}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditMode('interval')} className={`text-xs px-2 py-1 rounded border ${editMode === 'interval' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-300 text-gray-600'}`}>{t('treatment.modeInterval')}</button>
                      <button type="button" onClick={() => setEditMode('fixed')} className={`text-xs px-2 py-1 rounded border ${editMode === 'fixed' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-300 text-gray-600'}`}>{t('treatment.modeFixedDate')}</button>
                    </div>
                    {editMode === 'interval' ? (
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} value={editValue} onChange={e => setEditValue(Math.max(1, parseInt(e.target.value,10)||1))} className="w-14 border border-gray-300 rounded px-2 py-1 text-xs" />
                        <select value={editUnit} onChange={e => setEditUnit(e.target.value as 'days'|'months'|'years')} className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                          <option value="days">{t('treatment.unit_days')}</option>
                          <option value="months">{t('treatment.unit_months')}</option>
                          <option value="years">{t('treatment.unit_years')}</option>
                        </select>
                      </div>
                    ) : (
                      <input type="date" value={editFixedDate} onChange={e => setEditFixedDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs" />
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(cfg.treatment_type)} className="text-xs bg-[#2d6a4f] text-white px-3 py-1 rounded">{t('common.save')}</button>
                      <button onClick={() => handleRemove(cfg.treatment_type)} className="text-xs text-red-600 border border-red-200 px-3 py-1 rounded">{t('common.delete')}</button>
                      <button onClick={() => setEditingType(null)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1 rounded">{t('common.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{TREATMENT_ICONS[cfg.treatment_type] ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{t(`treatment.${cfg.treatment_type}`)}</p>
                      <p className="text-xs text-gray-500">
                        {cfg.snoozed_until
                          ? `${t('treatment.reminderOnDate')} ${cfg.snoozed_until}`
                          : cfg.interval_days
                            ? (() => {
                                const d = cfg.interval_days!
                                if (d >= 365 && d % 365 === 0) return `${t('treatment.reminderEvery')} ${d/365} ${t('treatment.unit_years')}`
                                if (d >= 30 && d % 30 === 0) return `${t('treatment.reminderEvery')} ${d/30} ${t('treatment.unit_months')}`
                                return `${t('treatment.reminderEvery')} ${d} ${t('treatment.unit_days')}`
                              })()
                            : t('alert.manualOnly')
                        }
                      </p>
                      {dueDate && (
                        <p className="text-xs text-gray-400">{t('treatment.date')}: {dueDate}</p>
                      )}
                    </div>
                    {status !== 'none' && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        status === 'due' ? 'bg-red-100 text-red-700' : status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {status === 'due' ? t('alert.due') : status === 'upcoming' ? t('alert.upcoming') : t('alert.ok')}
                      </span>
                    )}
                    <button onClick={() => handleEdit(cfg.treatment_type)} className="text-gray-400 hover:text-[#2d6a4f] p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add new alert for unconfigured types */}
      {unconfiguredTypes.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">{t('treatment.enableReminder')}:</p>
          <div className="flex flex-wrap gap-2">
            {unconfiguredTypes.map(type => (
              <button
                key={type}
                onClick={() => handleEdit(type)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-green-50 hover:border-[#2d6a4f] transition-colors text-gray-600"
              >
                {TREATMENT_ICONS[type]} {t(`treatment.${type}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New alert form for unconfigured type */}
      {editingType && !configs.find(c => c.treatment_type === editingType) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <span>{TREATMENT_ICONS[editingType] ?? '📝'}</span>
            {t(`treatment.${editingType}`)}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditMode('interval')} className={`text-xs px-2 py-1 rounded border ${editMode === 'interval' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-300 text-gray-600'}`}>{t('treatment.modeInterval')}</button>
            <button type="button" onClick={() => setEditMode('fixed')} className={`text-xs px-2 py-1 rounded border ${editMode === 'fixed' ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-300 text-gray-600'}`}>{t('treatment.modeFixedDate')}</button>
          </div>
          {editMode === 'interval' ? (
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={editValue} onChange={e => setEditValue(Math.max(1, parseInt(e.target.value,10)||1))} className="w-14 border border-gray-300 rounded px-2 py-1 text-xs" />
              <select value={editUnit} onChange={e => setEditUnit(e.target.value as 'days'|'months'|'years')} className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                <option value="days">{t('treatment.unit_days')}</option>
                <option value="months">{t('treatment.unit_months')}</option>
                <option value="years">{t('treatment.unit_years')}</option>
              </select>
            </div>
          ) : (
            <input type="date" value={editFixedDate} onChange={e => setEditFixedDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs" />
          )}
          <div className="flex gap-2">
            <button onClick={() => handleSave(editingType)} className="text-xs bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg">{t('common.save')}</button>
            <button onClick={() => setEditingType(null)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TreeProfilePage
