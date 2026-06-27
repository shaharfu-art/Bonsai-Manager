import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase-client'
import { useSpecies } from '../hooks/useSpecies'
import { usePhotos } from '../hooks/usePhotos'
import { useAlertConfigs } from '../hooks/useAlertConfigs'
import { useTreatments } from '../hooks/useTreatments'
import { TREATMENT_TYPES } from '../lib/treatment-validator'
import type { Tree } from '../hooks/useTrees'
import TreatmentLogSection from '../components/TreatmentLogSection'
import PhotoTimelineSection from '../components/PhotoTimelineSection'
import AiInsightsPanel from '../components/AiInsightsPanel'

// ─── Three-dots menu ────────────────────────────────────────
const MoreMenu: React.FC<{ onEdit: () => void; onDelete: () => void; onRecurring?: () => void }> = ({ onEdit, onDelete, onRecurring }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-[#2d6a4f] hover:bg-[#245a42] text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors text-lg font-bold shadow-sm"
      >
        ⋮
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-9 left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-36">
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full text-right px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ✏️ {t('common.edit')}
            </button>
            {onRecurring && (
              <button
                onClick={() => { setOpen(false); onRecurring() }}
                className="w-full text-right px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ⚙️ {t('treatment.reminder')}
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="w-full text-right px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              🗑️ {t('common.delete')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Delete confirmation dialog ─────────────────────────────
const DeleteDialog: React.FC<{ treeName: string; onConfirm: () => void; onCancel: () => void; loading: boolean }> = ({ treeName, onConfirm, onCancel, loading }) => {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🗑️ {t('common.confirm')}</h3>
        <p className="text-sm text-gray-600 mb-6" dir="rtl">
          האם אתה בטוח שברצונך למחוק את <strong>{treeName}</strong>? פעולה זו תמחק לצמיתות את כל היסטוריית הטיפולים והתמונות.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? t('common.loading') : t('common.delete')}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Smart ID Card ──────────────────────────────────────────
interface IDCardProps {
  tree: Tree
  displaySpecies: string | null
  onSave: (updates: Partial<Tree>) => Promise<void>
  onEdit: () => void
  onDelete: () => void
  onRecurring: () => void
}

const SmartIDCard: React.FC<IDCardProps> = ({ tree, displaySpecies, onSave, onEdit, onDelete, onRecurring }) => {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'he'
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [ageYears, setAgeYears] = useState(tree.age_years?.toString() ?? '')
  const [style, setStyle] = useState(tree.style ?? '')
  const [location, setLocation] = useState(tree.location ?? '')
  const [potType, setPotType] = useState(tree.pot_type ?? '')
  const [substrate, setSubstrate] = useState(tree.substrate ?? '')

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      age_years: ageYears ? parseInt(ageYears, 10) : null,
      style: style || null,
      location: location || null,
      pot_type: potType || null,
      substrate: substrate || null,
    } as Partial<Tree>)
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => {
    setAgeYears(tree.age_years?.toString() ?? '')
    setStyle(tree.style ?? '')
    setLocation(tree.location ?? '')
    setPotType(tree.pot_type ?? '')
    setSubstrate(tree.substrate ?? '')
    setEditing(false)
  }

  const styles = ['formal_upright','informal_upright','slanting','cascade','semi_cascade','literati','forest','rock_over_roots','other']
  const locations = ['indoors','outdoors','greenhouse']

  return (
    <div
      className="bg-white rounded-2xl shadow-md p-5 -mt-8 relative z-10"
      onDoubleClick={() => !editing && setEditing(true)}
    >
      {/* More menu - top left */}
      {!editing && (
        <div className="absolute top-3 left-3">
          <MoreMenu onEdit={onEdit} onDelete={onDelete} onRecurring={onRecurring} />
        </div>
      )}

      <h2 className="text-lg font-bold text-[#2d6a4f] mb-4">🪪 {tree.custom_name}</h2>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">{t('tree.age')}</label>
              <input type="number" value={ageYears} onChange={e => setAgeYears(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">{t('tree.style')}</label>
              <select value={style} onChange={e => setStyle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                <option value="">—</option>
                {styles.map(s => <option key={s} value={s}>{t(`style.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">{t('tree.location')}</label>
              <select value={location} onChange={e => setLocation(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                <option value="">—</option>
                {locations.map(l => <option key={l} value={l}>{t(`location.${l}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">{t('tree.potType')}</label>
              <input type="text" value={potType} onChange={e => setPotType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-500 mb-0.5 block">{t('tree.substrate')}</label>
              <input type="text" value={substrate} onChange={e => setSubstrate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#2d6a4f] hover:bg-[#245a42] text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60">
              {saving ? t('common.loading') : t('common.save')}
            </button>
            <button onClick={handleCancel} className="flex-1 border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
          {displaySpecies && <p className="text-sm text-gray-700 font-medium">🌳 {displaySpecies}</p>}
          {tree.age_years && <p className="text-sm text-gray-700 font-medium">🗓️ {tree.age_years} {isRtl ? 'שנים' : 'years'}</p>}
          {tree.style && <p className="text-sm text-gray-700 font-medium">✨ {t(`style.${tree.style}`)}</p>}
          {tree.location && <p className="text-sm text-gray-700 font-medium">📍 {t(`location.${tree.location}`)}</p>}
          {tree.pot_type && <p className="text-sm text-gray-700 font-medium">🪴 {tree.pot_type}</p>}
          {tree.substrate && <p className="text-sm text-gray-700 font-medium">🧱 {tree.substrate}</p>}
          {tree.date_added && <p className="text-sm text-gray-700 font-medium">📅 {tree.date_added}</p>}
          {!displaySpecies && !tree.age_years && !tree.style && !tree.location && (
            <p className="text-xs text-gray-400 col-span-2">{t('common.edit')} ✏️</p>
          )}
        </div>
      )}
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
  const [activeTab, setActiveTab] = useState<'treatments' | 'photos'>('treatments')
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [showRecurringSettings, setShowRecurringSettings] = useState(false)
  const coverUploadRef = useRef<HTMLInputElement>(null)
  const [coverUploading, setCoverUploading] = useState(false)

  const openTreatmentType = (location.state as { openTreatment?: string } | null)?.openTreatment ?? null
  const isRtl = i18n.language === 'he'
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
      await uploadPhoto(file, { photo_date: new Date().toISOString().split('T')[0], caption: tree?.custom_name ?? '' })
    } catch (err) { console.error('Cover upload failed:', err) }
    finally { setCoverUploading(false); if (coverUploadRef.current) coverUploadRef.current.value = '' }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true); setError('')
    supabase.from('trees').select('*').eq('id', id).single().then(({ data, error: fetchError }) => {
      if (fetchError) setError(fetchError.message)
      else setTree(data as Tree)
      setLoading(false)
    })
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      const { error: deleteError } = await supabase.from('trees').delete().eq('id', id)
      if (deleteError) throw deleteError
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setDeleting(false); setShowDeleteDialog(false)
    }
  }

  const handleUpdateTree = async (updates: Partial<Tree>) => {
    if (!id) return
    const { data } = await supabase.from('trees').update(updates).eq('id', id).select().single()
    if (data) setTree(data as Tree)
  }

  const speciesName = tree?.species_id ? (() => { const s = getSpeciesById(tree.species_id!); return s ? (isRtl ? s.name_he : s.name_en) : null })() : null
  const displaySpecies = speciesName || tree?.species_free_text || null

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-56 bg-gray-200 rounded-2xl" />
          <div className="h-24 bg-gray-100 rounded-2xl mx-3" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      </Layout>
    )
  }

  if (error || !tree) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-red-600 text-sm mb-4">{error || t('common.error')}</p>
          <button onClick={() => navigate('/dashboard')} className="text-[#2d6a4f] hover:underline text-sm">← {t('nav.dashboard')}</button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* Cover / Hero with name overlay */}
        <div className="relative h-56 sm:h-72 bg-gradient-to-br from-[#2d6a4f] to-[#52b788] rounded-2xl shadow-lg flex items-end overflow-hidden">
          {coverPhoto?.public_url ? (
            <img src={coverPhoto.public_url} alt={tree.custom_name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-8xl opacity-30">🌿</span>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Tree name */}
          <h1 className="relative z-10 text-white text-2xl font-bold px-5 pb-12 drop-shadow-lg">{tree.custom_name}</h1>

          {/* Top-right actions */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {photos.length > 0 && (
              <button onClick={() => setShowCoverPicker(true)} className="bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors">📷</button>
            )}
            {photos.length === 0 && (
              <>
                <input ref={coverUploadRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                <button onClick={() => coverUploadRef.current?.click()} disabled={coverUploading} className="bg-black/30 hover:bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors disabled:opacity-50">
                  📷 {coverUploading ? '...' : t('photo.addPhoto')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Smart ID Card */}
        <SmartIDCard tree={tree} displaySpecies={displaySpecies} onSave={handleUpdateTree} onEdit={() => navigate('/trees/new', { state: { editTree: tree } })} onDelete={() => setShowDeleteDialog(true)} onRecurring={() => setShowRecurringSettings(true)} />

        {/* Cover photo picker */}
        {showCoverPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('photo.chooseCover')}</h3>
                <button onClick={() => setShowCoverPicker(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map(photo => (
                  <button key={photo.id} onClick={() => handleSetCoverFromPicker(photo.id)} className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors relative ${photo.is_cover ? 'border-yellow-400' : 'border-transparent hover:border-[#52b788]'}`}>
                    {photo.public_url ? <img src={photo.public_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl">🖼️</div>}
                    {photo.is_cover && <span className="absolute top-1 right-1 text-sm">⭐</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Due alerts - outside the card for full width */}
        {activeTab === 'treatments' && <TreeAlertsBanner treeId={id!} onMarkDone={(type) => { setActiveTab('treatments') }} />}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['treatments', 'photos'] as const).map((tab) => {
              const labels = { treatments: t('tabs.treatments'), photos: t('tabs.photos') }
              return (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'text-[#2d6a4f] border-b-2 border-[#2d6a4f]' : 'text-gray-500 hover:text-gray-700'}`}>
                  {labels[tab]}
                </button>
              )
            })}
          </div>
          <div className="p-5">
            {activeTab === 'treatments' && <TreatmentLogSection treeId={id!} initialTreatmentType={openTreatmentType} hideAlertsBanner />}
            {activeTab === 'photos' && <PhotoTimelineSection treeId={id!} onCoverPhotoChange={() => {}} />}
          </div>
        </div>
      </div>

      {/* Recurring settings modal */}
      {showRecurringSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowRecurringSettings(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#2d6a4f]">⚙️ {t('treatment.reminder')}</h3>
              <button onClick={() => setShowRecurringSettings(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <AlertsTabContent treeId={id!} />
          </div>
        </div>
      )}

      {showDeleteDialog && <DeleteDialog treeName={tree.custom_name} onConfirm={handleDelete} onCancel={() => setShowDeleteDialog(false)} loading={deleting} />}

      {/* AI Insights floating button */}
      <AiInsightsPanel treeId={id!} />
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
    supabase.from('treatment_logs').select('treatment_type, treatment_date').eq('tree_id', treeId).order('treatment_date', { ascending: false })
      .then(({ data }) => { const map: Record<string, string> = {}; for (const row of data ?? []) { if (!map[row.treatment_type]) map[row.treatment_type] = row.treatment_date }; setLastTreatments(map) })
  }, [treeId])

  const handleEdit = (type: string) => {
    const cfg = getConfig(type)
    if (cfg?.snoozed_until) { setEditMode('fixed'); setEditFixedDate(cfg.snoozed_until); setEditValue(1); setEditUnit('days') }
    else { setEditMode('interval'); const days = cfg?.interval_days ?? 7; if (days >= 365 && days % 365 === 0) { setEditValue(days/365); setEditUnit('years') } else if (days >= 30 && days % 30 === 0) { setEditValue(days/30); setEditUnit('months') } else { setEditValue(days); setEditUnit('days') }; setEditFixedDate('') }
    setEditingType(type)
  }

  const handleSave = async (type: string) => {
    if (editMode === 'fixed') { await setConfig(type, 0, editFixedDate) }
    else { let totalDays = editValue; if (editUnit === 'months') totalDays = editValue * 30; if (editUnit === 'years') totalDays = editValue * 365; await setConfig(type, totalDays, null) }
    setEditingType(null)
  }

  const handleRemove = async (type: string) => { await removeConfig(type); setEditingType(null) }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const getAlertStatus = (type: string): { status: 'due' | 'upcoming' | 'ok' | 'none'; dueDate: string } => {
    const cfg = getConfig(type); if (!cfg) return { status: 'none', dueDate: '' }
    // If treatment was done today, it's OK (fulfilled)
    if (lastTreatments[type] === todayStr) return { status: 'ok', dueDate: '' }
    if (cfg.snoozed_until) { const d = new Date(cfg.snoozed_until); const diff = Math.ceil((d.getTime()-today.getTime())/(1000*60*60*24)); if (diff<=0) return{status:'due',dueDate:cfg.snoozed_until}; if (diff<=30) return{status:'upcoming',dueDate:cfg.snoozed_until}; return{status:'ok',dueDate:cfg.snoozed_until} }
    if (!cfg.interval_days||cfg.interval_days<=0) return{status:'none',dueDate:''}
    const last=lastTreatments[type]; const lastDate=last?new Date(last):new Date(0); const next=new Date(lastDate.getTime()+cfg.interval_days*24*60*60*1000); const diff=Math.ceil((next.getTime()-today.getTime())/(1000*60*60*24)); const dueStr=next.toISOString().split('T')[0]
    if(diff<=0) return{status:'due',dueDate:dueStr}; if(diff<=30) return{status:'upcoming',dueDate:dueStr}; return{status:'ok',dueDate:dueStr}
  }

  if (loading) return <div className="animate-pulse space-y-2">{[0,1,2].map(i=><div key={i} className="h-10 bg-gray-100 rounded-lg"/>)}</div>

  const configuredTypes = configs.map(c => c.treatment_type)
  const unconfiguredTypes = TREATMENT_TYPES.filter(t => !configuredTypes.includes(t))

  return (
    <div className="space-y-4">
      {configs.length === 0 && <p className="text-center text-gray-400 text-sm py-4">{t('alert.noAlerts')}</p>}
      {configs.map(cfg => {
        const { status, dueDate } = getAlertStatus(cfg.treatment_type)
        return (
          <div key={cfg.id} className="bg-gray-50 rounded-xl px-4 py-3">
            {editingType === cfg.treatment_type ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{TREATMENT_ICONS[cfg.treatment_type]} {t(`treatment.${cfg.treatment_type}`)}</p>
                <div className="flex gap-2">
                  <button onClick={()=>setEditMode('interval')} className={`text-xs px-2 py-1 rounded border ${editMode==='interval'?'bg-[#2d6a4f] text-white border-[#2d6a4f]':'border-gray-300'}`}>{t('treatment.modeInterval')}</button>
                  <button onClick={()=>setEditMode('fixed')} className={`text-xs px-2 py-1 rounded border ${editMode==='fixed'?'bg-[#2d6a4f] text-white border-[#2d6a4f]':'border-gray-300'}`}>{t('treatment.modeFixedDate')}</button>
                </div>
                {editMode==='interval'?(<div className="flex gap-2"><input type="number" min={1} value={editValue} onChange={e=>setEditValue(Math.max(1,parseInt(e.target.value,10)||1))} className="w-14 border rounded px-2 py-1 text-xs"/><select value={editUnit} onChange={e=>setEditUnit(e.target.value as any)} className="border rounded px-2 py-1 text-xs bg-white"><option value="days">{t('treatment.unit_days')}</option><option value="months">{t('treatment.unit_months')}</option><option value="years">{t('treatment.unit_years')}</option></select></div>):(<input type="date" value={editFixedDate} onChange={e=>setEditFixedDate(e.target.value)} className="border rounded px-2 py-1 text-xs"/>)}
                <div className="flex gap-2">
                  <button onClick={()=>handleSave(cfg.treatment_type)} className="text-xs bg-[#2d6a4f] text-white px-3 py-1 rounded">{t('common.save')}</button>
                  <button onClick={()=>handleRemove(cfg.treatment_type)} className="text-xs text-red-600 border border-red-200 px-3 py-1 rounded">{t('common.delete')}</button>
                  <button onClick={()=>setEditingType(null)} className="text-xs text-gray-500 border px-3 py-1 rounded">{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-lg">{TREATMENT_ICONS[cfg.treatment_type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{t(`treatment.${cfg.treatment_type}`)}</p>
                  <p className="text-xs text-gray-500">{cfg.snoozed_until?`${t('treatment.reminderOnDate')} ${cfg.snoozed_until}`:cfg.interval_days?(()=>{const d=cfg.interval_days!;if(d>=365&&d%365===0)return`${t('treatment.reminderEvery')} ${d/365} ${t('treatment.unit_years')}`;if(d>=30&&d%30===0)return`${t('treatment.reminderEvery')} ${d/30} ${t('treatment.unit_months')}`;return`${t('treatment.reminderEvery')} ${d} ${t('treatment.unit_days')}`})():t('alert.manualOnly')}</p>
                </div>
                {status!=='none'&&<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${status==='due'?'bg-red-100 text-red-700':status==='upcoming'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{status==='due'?t('alert.due'):status==='upcoming'?t('alert.upcoming'):t('alert.ok')}</span>}
                <button onClick={()=>handleEdit(cfg.treatment_type)} className="text-gray-400 hover:text-[#2d6a4f] p-1">✏️</button>
              </div>
            )}
          </div>
        )
      })}
      {unconfiguredTypes.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">{t('treatment.enableReminder')}:</p>
          <div className="flex flex-wrap gap-2">
            {unconfiguredTypes.map(type => (<button key={type} onClick={()=>handleEdit(type)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-green-50 hover:border-[#2d6a4f] transition-colors text-gray-600">{TREATMENT_ICONS[type]} {t(`treatment.${type}`)}</button>))}
          </div>
        </div>
      )}
      {editingType && !configs.find(c=>c.treatment_type===editingType) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">{TREATMENT_ICONS[editingType]} {t(`treatment.${editingType}`)}</p>
          <div className="flex gap-2">
            <button onClick={()=>setEditMode('interval')} className={`text-xs px-2 py-1 rounded border ${editMode==='interval'?'bg-[#2d6a4f] text-white border-[#2d6a4f]':'border-gray-300'}`}>{t('treatment.modeInterval')}</button>
            <button onClick={()=>setEditMode('fixed')} className={`text-xs px-2 py-1 rounded border ${editMode==='fixed'?'bg-[#2d6a4f] text-white border-[#2d6a4f]':'border-gray-300'}`}>{t('treatment.modeFixedDate')}</button>
          </div>
          {editMode==='interval'?(<div className="flex gap-2"><input type="number" min={1} value={editValue} onChange={e=>setEditValue(Math.max(1,parseInt(e.target.value,10)||1))} className="w-14 border rounded px-2 py-1 text-xs"/><select value={editUnit} onChange={e=>setEditUnit(e.target.value as any)} className="border rounded px-2 py-1 text-xs bg-white"><option value="days">{t('treatment.unit_days')}</option><option value="months">{t('treatment.unit_months')}</option><option value="years">{t('treatment.unit_years')}</option></select></div>):(<input type="date" value={editFixedDate} onChange={e=>setEditFixedDate(e.target.value)} className="border rounded px-2 py-1 text-xs"/>)}
          <div className="flex gap-2">
            <button onClick={()=>handleSave(editingType)} className="text-xs bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg">{t('common.save')}</button>
            <button onClick={()=>setEditingType(null)} className="text-xs text-gray-500 border px-3 py-1.5 rounded-lg">{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tree Alerts Banner (same style as dashboard) ────────────
const TreeAlertsBanner: React.FC<{ treeId: string; onMarkDone?: (type: string) => void }> = ({ treeId }) => {
  const { t } = useTranslation()
  const { getConfig } = useAlertConfigs(treeId)
  const { treatments } = useTreatments(treeId)
  const navigate = useNavigate()

  const todayDate = new Date()
  const todayStr = todayDate.toISOString().split('T')[0]

  const dueAlerts: { type: string; dueDate: string; status: 'due' | 'upcoming' }[] = []

  for (const type of TREATMENT_TYPES) {
    const cfg = getConfig(type)
    if (!cfg) continue
    const doneToday = treatments.find(tr => tr.treatment_type === type && tr.treatment_date === todayStr && tr.status === 'completed')
    if (doneToday) continue

    if (cfg.snoozed_until) {
      const d = new Date(cfg.snoozed_until)
      const diff = Math.ceil((d.getTime() - todayDate.getTime()) / (1000*60*60*24))
      if (diff <= 0) dueAlerts.push({ type, dueDate: cfg.snoozed_until, status: 'due' })
      else if (diff <= 3) dueAlerts.push({ type, dueDate: cfg.snoozed_until, status: 'upcoming' })
    } else if (cfg.interval_days && cfg.interval_days > 0) {
      const lastLog = treatments.filter(tr => tr.treatment_type === type && tr.status === 'completed').sort((a,b) => b.treatment_date.localeCompare(a.treatment_date))[0]
      const lastDate = lastLog ? new Date(lastLog.treatment_date) : new Date(0)
      const next = new Date(lastDate.getTime() + cfg.interval_days * 24*60*60*1000)
      const diff = Math.ceil((next.getTime() - todayDate.getTime()) / (1000*60*60*24))
      const dueStr = next.toISOString().split('T')[0]
      if (diff <= 0) dueAlerts.push({ type, dueDate: dueStr, status: 'due' })
      else if (diff <= 3) dueAlerts.push({ type, dueDate: dueStr, status: 'upcoming' })
    }
  }

  if (dueAlerts.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-amber-800 mb-3">
        🔔 {t('treatment.reminder')} ({dueAlerts.length})
      </h2>
      <ul className="space-y-2">
        {dueAlerts.map(alert => (
          <li
            key={alert.type}
            className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm cursor-pointer hover:bg-green-50 transition-colors"
            onClick={() => navigate(`/trees/${treeId}`, { state: { openTreatment: alert.type } })}
          >
            <span className="text-lg">{TREATMENT_ICONS[alert.type] ?? '📝'}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
              alert.status === 'due' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {alert.status === 'due' ? t('alert.due') : t('alert.upcoming')}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{t(`treatment.${alert.type}`)}</p>
              <p className="text-xs text-gray-500">{alert.dueDate}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/trees/${treeId}`, { state: { openTreatment: alert.type } }) }}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 ${
                alert.status === 'due'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              ✓ {t('treatment.markDone')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TreeProfilePage
