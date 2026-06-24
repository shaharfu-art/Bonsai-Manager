import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useTrees } from '../hooks/useTrees'
import { useSpecies } from '../hooks/useSpecies'
import { supabase } from '../lib/supabase-client'
import type { Tree } from '../hooks/useTrees'

const STYLES = [
  'formal_upright',
  'informal_upright',
  'slanting',
  'cascade',
  'semi_cascade',
  'literati',
  'forest',
  'rock_over_roots',
  'other',
] as const

const ORIGINS = ['collected', 'nursery', 'seed', 'cutting'] as const
const LOCATIONS = ['indoors', 'outdoors', 'greenhouse'] as const

const today = new Date().toISOString().split('T')[0]

const AddTreePage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { createTree, updateTree } = useTrees()
  const { species, loading: speciesLoading } = useSpecies()

  const isRtl = i18n.language === 'he'

  // Edit mode: if navigated with state.editTree
  const editTree = (location.state as { editTree?: Tree } | null)?.editTree ?? null
  const isEditMode = !!editTree

  const [customName, setCustomName] = useState(editTree?.custom_name ?? '')
  const [speciesId, setSpeciesId] = useState(editTree?.species_id ?? '')
  const [speciesFreeText, setSpeciesFreeText] = useState(editTree?.species_free_text ?? '')
  const [speciesSearch, setSpeciesSearch] = useState('')
  const [speciesDropdownOpen, setSpeciesDropdownOpen] = useState(false)
  const [style, setStyle] = useState(editTree?.style ?? '')
  const [ageYears, setAgeYears] = useState(editTree?.age_years != null ? String(editTree.age_years) : '')
  const [origin, setOrigin] = useState(editTree?.origin ?? '')
  const [potType, setPotType] = useState(editTree?.pot_type ?? '')
  const [potSize, setPotSize] = useState(editTree?.pot_size ?? '')
  const [location2, setLocation2] = useState(editTree?.location ?? '')
  const [dateAdded, setDateAdded] = useState(editTree?.date_added ?? today)
  const [notes, setNotes] = useState(editTree?.notes ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // New species form state
  const [newSpeciesHe, setNewSpeciesHe] = useState('')
  const [newSpeciesEn, setNewSpeciesEn] = useState('')
  const [newSpeciesLatin, setNewSpeciesLatin] = useState('')
  const [newSpeciesType, setNewSpeciesType] = useState('tropical')

  const filteredSpecies = species.filter((s) => {
    const q = speciesSearch.toLowerCase()
    return (
      s.name_en.toLowerCase().includes(q) ||
      s.name_he.includes(speciesSearch) ||
      (s.name_latin ?? '').toLowerCase().includes(q)
    )
  })

  const isOther = speciesId === 'other'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!customName.trim()) {
      setError(t('tree.name') + ' ' + t('common.required'))
      return
    }

    setSubmitting(true)
    try {
      const treeData = {
        custom_name: customName.trim(),
        species_id: speciesId && speciesId !== 'other' ? speciesId : null,
        species_free_text: isOther ? speciesFreeText.trim() || null : null,
        style: style || null,
        age_years: ageYears ? parseInt(ageYears, 10) : null,
        origin: origin || null,
        pot_type: potType.trim() || null,
        pot_size: potSize.trim() || null,
        location: location2 || null,
        date_added: dateAdded || null,
        notes: notes.trim() || null,
      }

      if (isEditMode && editTree) {
        await updateTree({ id: editTree.id, ...treeData })
        navigate(`/trees/${editTree.id}`, { replace: true })
      } else {
        const tree = await createTree(treeData)
        navigate(`/trees/${tree.id}`, { replace: true })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className={`flex items-center gap-3 mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={t('common.back')}
          >
            <svg className={`w-6 h-6 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[#2d6a4f]">
            {isEditMode ? t('common.edit') : t('nav.addTree')}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-5">
          {/* Tree name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tree.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              placeholder={t('tree.name')}
            />
          </div>

          {/* Species - searchable dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tree.species')}
            </label>
            <input
              type="text"
              value={speciesSearch}
              onChange={(e) => { setSpeciesSearch(e.target.value); setSpeciesId('') }}
              onFocus={() => setSpeciesDropdownOpen(true)}
              placeholder={
                speciesId && speciesId !== 'other'
                  ? (species.find(s => s.id === speciesId)?.[isRtl ? 'name_he' : 'name_en'] ?? '')
                  : `${t('tree.species')}...`
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
            {speciesId && speciesId !== 'other' && !speciesSearch && (
              <div className="absolute top-[calc(100%-2px)] right-2 -translate-y-full text-xs text-green-600 pointer-events-none">
                ✓
              </div>
            )}
            {speciesDropdownOpen && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredSpecies.length === 0 && !speciesLoading && (
                  <li className="px-3 py-2 text-xs text-gray-400">{t('tree.noTrees')}</li>
                )}
                {filteredSpecies.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => { setSpeciesId(s.id); setSpeciesSearch(''); setSpeciesDropdownOpen(false) }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-green-50 ${speciesId === s.id ? 'bg-green-50 font-medium' : ''}`}
                  >
                    {isRtl ? s.name_he : s.name_en}
                    {s.name_latin && <span className="text-xs text-gray-400 ml-1">({s.name_latin})</span>}
                  </li>
                ))}
                <li
                  onClick={() => { setSpeciesId('other'); setSpeciesSearch(''); setSpeciesDropdownOpen(false) }}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-t border-gray-100 text-gray-500"
                >
                  ✏️ {t('style.other')}
                </li>
              </ul>
            )}
            {/* Close dropdown when clicking outside */}
            {speciesDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setSpeciesDropdownOpen(false)} />
            )}
          </div>

          {/* Species free text (when "other") */}
          {isOther && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tree.species')} ({t('style.other')})
              </label>
              <input
                type="text"
                value={speciesFreeText}
                onChange={(e) => setSpeciesFreeText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
                placeholder={t('tree.species')}
              />
            </div>
          )}

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tree.style')}
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            >
              <option value="">— {t('tree.style')} —</option>
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {t(`style.${s}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Age + Origin in a row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tree.age')} <span className="text-gray-400 text-xs">({t('common.optional')})</span>
              </label>
              <input
                type="number"
                min={0}
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tree.origin')}
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              >
                <option value="">— {t('tree.origin')} —</option>
                {ORIGINS.map((o) => (
                  <option key={o} value={o}>
                    {t(`origin.${o}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pot type + size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tree.potType')} <span className="text-gray-400 text-xs">({t('common.optional')})</span>
              </label>
              <input
                type="text"
                value={potType}
                onChange={(e) => setPotType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
                placeholder={t('tree.potType')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tree.potSize')} <span className="text-gray-400 text-xs">({t('common.optional')})</span>
              </label>
              <input
                type="text"
                value={potSize}
                onChange={(e) => setPotSize(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
                placeholder={t('tree.potSize')}
              />
            </div>
          </div>

          {/* Location + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tree.location')}
              </label>
              <select
                value={location2}
                onChange={(e) => setLocation2(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              >
                <option value="">— {t('tree.location')} —</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {t(`location.${l}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tree.dateAdded')}
              </label>
              <input
                type="date"
                value={dateAdded}
                onChange={(e) => setDateAdded(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tree.notes')} <span className="text-gray-400 text-xs">({t('common.optional')})</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] resize-none"
              placeholder={t('tree.notes')}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          {/* Actions */}
          <div className={`flex gap-3 pt-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? t('common.loading') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default AddTreePage
