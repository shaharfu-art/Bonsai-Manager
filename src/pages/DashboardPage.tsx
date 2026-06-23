import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useTrees } from '../hooks/useTrees'
import { useSpecies } from '../hooks/useSpecies'
import { supabase } from '../lib/supabase-client'
import type { Tree } from '../hooks/useTrees'
import { subscribeToPush } from '../lib/push-notifications'

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

// ─── Skeleton card ─────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl shadow animate-pulse overflow-hidden">
    <div className="h-36 bg-gray-200" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  </div>
)

// ─── Tree card ─────────────────────────────────────────────
interface TreeCardProps {
  tree: Tree
  speciesName: string
  coverPhotoUrl?: string | null
  alertCount?: number
  onClick: () => void
}

const TreeCard: React.FC<TreeCardProps> = ({ tree, speciesName, coverPhotoUrl, alertCount, onClick }) => {
  const { t } = useTranslation()

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden text-left w-full focus:outline-none focus:ring-2 focus:ring-[#52b788] relative"
    >
      {/* Alert badge */}
      {alertCount != null && alertCount > 0 && (
        <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
          {alertCount}
        </span>
      )}
      {/* Cover image / placeholder */}
      <div className="h-36 bg-gradient-to-br from-[#2d6a4f] to-[#52b788] flex items-center justify-center overflow-hidden">
        {coverPhotoUrl ? (
          <img src={coverPhotoUrl} alt={tree.custom_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl" role="img" aria-label="bonsai">🌿</span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-900 truncate">{tree.custom_name}</h3>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {speciesName || tree.species_free_text || '—'}
        </p>
        {tree.date_added && (
          <p className="text-xs text-gray-400 mt-1">
            {t('tree.dateAdded')}: {tree.date_added}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Tree list row ──────────────────────────────────────────
interface TreeRowProps {
  tree: Tree
  speciesName: string
  coverPhotoUrl?: string | null
  alertCount?: number
  onClick: () => void
}

const TreeRow: React.FC<TreeRowProps> = ({ tree, speciesName, coverPhotoUrl, alertCount, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-4 flex items-center gap-4 w-full text-left focus:outline-none focus:ring-2 focus:ring-[#52b788]"
  >
    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
      {coverPhotoUrl ? (
        <img src={coverPhotoUrl} alt={tree.custom_name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#2d6a4f] to-[#52b788] flex items-center justify-center">
          <span className="text-2xl" role="img" aria-label="bonsai">🌿</span>
        </div>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-gray-900 truncate">{tree.custom_name}</p>
      <p className="text-xs text-gray-500 truncate">
        {speciesName || tree.species_free_text || '—'}
      </p>
    </div>
    {alertCount != null && alertCount > 0 && (
      <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
        {alertCount}
      </span>
    )}
    {tree.date_added && (
      <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
        {tree.date_added}
      </p>
    )}
  </button>
)

// ─── Main component ─────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { trees, loading, error } = useTrees()
  const { getSpeciesById } = useSpecies()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [coverPhotos, setCoverPhotos] = useState<Record<string, string>>({})
  const [pendingTreatments, setPendingTreatments] = useState<Array<{
    id: string
    tree_id: string
    tree_name: string
    treatment_type: string
    treatment_date: string
  }>>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [alerts, setAlerts] = useState<Array<{
    tree_id: string
    tree_name: string
    treatment_type: string
    status: 'due' | 'upcoming'
    due_date: string
  }>>([])
  const [alertsLoading, setAlertsLoading] = useState(true)

  const isRtl = i18n.language === 'he'

  // Fetch cover photos for all trees
  useEffect(() => {
    if (trees.length === 0) return
    const treeIds = trees.map(t => t.id)
    supabase
      .from('photos')
      .select('tree_id, storage_path')
      .in('tree_id', treeIds)
      .eq('is_cover', true)
      .then(async ({ data }) => {
        if (!data || data.length === 0) return
        const urls: Record<string, string> = {}
        await Promise.all(
          data.map(async (photo) => {
            const { data: signed } = await supabase.storage
              .from('bonsai-photos')
              .createSignedUrl(photo.storage_path, 3600)
            if (signed?.signedUrl) urls[photo.tree_id] = signed.signedUrl
          })
        )
        setCoverPhotos(urls)
      })
  }, [trees])

  // Fetch pending treatments
  useEffect(() => {
    if (trees.length === 0) { setPendingLoading(false); return }
    const treeIds = trees.map(t => t.id)
    supabase
      .from('treatment_logs')
      .select('id, tree_id, treatment_type, treatment_date')
      .in('tree_id', treeIds)
      .eq('status', 'pending')
      .order('treatment_date', { ascending: true })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) {
          console.warn('Failed to fetch pending treatments:', fetchErr.message)
          setPendingLoading(false)
          return
        }
        const pending = (data ?? []).map(row => ({
          id: row.id,
          tree_id: row.tree_id,
          tree_name: trees.find(t => t.id === row.tree_id)?.custom_name ?? '',
          treatment_type: row.treatment_type,
          treatment_date: row.treatment_date,
        }))
        setPendingTreatments(pending)
        setPendingLoading(false)
      })
      .catch(() => setPendingLoading(false))
  }, [trees])

  // Subscribe to push notifications (once, if permission granted)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToPush()
    }
  }, [])

  // Calculate stats
  const totalTrees = trees.length

  // Fetch alert configs and treatment logs to compute alerts
  useEffect(() => {
    if (trees.length === 0) { setAlertsLoading(false); return }
    const treeIds = trees.map(t => t.id)

    supabase.auth.getUser().then(({ data: userData }) => {
      const userId = userData.user?.id
      if (!userId) { setAlertsLoading(false); return }

      Promise.all([
        supabase.from('alert_configs').select('*').in('tree_id', treeIds).eq('user_id', userId),
        supabase.from('treatment_logs').select('tree_id, treatment_type, treatment_date').in('tree_id', treeIds).eq('user_id', userId).order('treatment_date', { ascending: false }),
      ]).then(([configsRes, logsRes]) => {
      const configs = configsRes.data ?? []
      const logs = logsRes.data ?? []
      const today = new Date()
      const computed: typeof alerts = []

      for (const config of configs) {
        if (config.is_manual_only) continue

        // Fixed date alert
        if (config.snoozed_until) {
          const dueDate = new Date(config.snoozed_until)
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const treeName = trees.find(t => t.id === config.tree_id)?.custom_name ?? ''
          if (diffDays <= 0) {
            computed.push({ tree_id: config.tree_id, tree_name: treeName, treatment_type: config.treatment_type, status: 'due', due_date: config.snoozed_until })
          } else if (diffDays <= 30) {
            computed.push({ tree_id: config.tree_id, tree_name: treeName, treatment_type: config.treatment_type, status: 'upcoming', due_date: config.snoozed_until })
          }
          continue
        }

        if (!config.interval_days || config.interval_days <= 0) continue

        // Interval-based alert
        const lastLog = logs.find(l => l.tree_id === config.tree_id && l.treatment_type === config.treatment_type)
        const lastDate = lastLog ? new Date(lastLog.treatment_date) : new Date(0)
        const nextDue = new Date(lastDate.getTime() + config.interval_days * 24 * 60 * 60 * 1000)
        const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const treeName = trees.find(t => t.id === config.tree_id)?.custom_name ?? ''
        const dueDateStr = nextDue.toISOString().split('T')[0]

        if (diffDays <= 0) {
          computed.push({ tree_id: config.tree_id, tree_name: treeName, treatment_type: config.treatment_type, status: 'due', due_date: dueDateStr })
        } else if (diffDays <= 30) {
          computed.push({ tree_id: config.tree_id, tree_name: treeName, treatment_type: config.treatment_type, status: 'upcoming', due_date: dueDateStr })
        }
      }

      // Sort: due first, then upcoming by date
      computed.sort((a, b) => {
        if (a.status === 'due' && b.status !== 'due') return -1
        if (a.status !== 'due' && b.status === 'due') return 1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })

      setAlerts(computed)
      setAlertsLoading(false)
    })
    })
  }, [trees])

  const pendingAlerts = alerts.length

  // Filter trees by search
  const filteredTrees = useMemo(() => {
    if (!searchQuery.trim()) return trees
    const q = searchQuery.toLowerCase()
    return trees.filter(
      (t) =>
        t.custom_name.toLowerCase().includes(q) ||
        (t.species_free_text ?? '').toLowerCase().includes(q) ||
        (t.species_id ? (getSpeciesById(t.species_id)?.name_en ?? '').toLowerCase().includes(q) : false) ||
        (t.species_id ? (getSpeciesById(t.species_id)?.name_he ?? '').includes(q) : false)
    )
  }, [trees, searchQuery, getSpeciesById])

  const getSpeciesName = (tree: Tree): string => {
    if (tree.species_id) {
      const s = getSpeciesById(tree.species_id)
      if (s) return isRtl ? s.name_he : s.name_en
    }
    return tree.species_free_text ?? ''
  }

  // Count alerts per tree
  const alertCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const alert of alerts) {
      map[alert.tree_id] = (map[alert.tree_id] ?? 0) + 1
    }
    return map
  }, [alerts])

  // Click on an alert → navigate to tree with pre-filled treatment form
  const handleAlertClick = (alert: { tree_id: string; treatment_type: string }) => {
    navigate(`/trees/${alert.tree_id}`, { state: { openTreatment: alert.treatment_type } })
  }

  // Dismiss an alert → delete the alert_config to stop the recurring cycle
  const handleAlertDismiss = async (e: React.MouseEvent, alert: { tree_id: string; treatment_type: string }) => {
    e.stopPropagation()
    const { error: deleteErr } = await supabase
      .from('alert_configs')
      .delete()
      .eq('tree_id', alert.tree_id)
      .eq('treatment_type', alert.treatment_type)

    if (!deleteErr) {
      setAlerts(prev => prev.filter(a => !(a.tree_id === alert.tree_id && a.treatment_type === alert.treatment_type)))
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-3xl font-bold text-[#2d6a4f]">{totalTrees}</p>
            <p className="text-sm text-gray-500 mt-1">{t('dashboard.totalTrees')}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className={`text-3xl font-bold ${pendingAlerts > 0 ? 'text-amber-500' : 'text-green-500'}`}>{pendingAlerts}</p>
            <p className="text-sm text-gray-500 mt-1">{t('dashboard.pendingAlerts')}</p>
          </div>
        </div>

        {/* Pending treatments + alerts combined at the top */}
        {!pendingLoading && !alertsLoading && (pendingTreatments.length > 0 || alerts.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-amber-800 mb-3">
              🔔 {t('dashboard.openAlerts')} ({pendingTreatments.length + alerts.length})
            </h2>
            <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
              {/* Pending treatments */}
              {pendingTreatments.map(pt => (
                <li
                  key={pt.id}
                  className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm cursor-pointer hover:bg-green-50 transition-colors"
                  onClick={() => navigate(`/trees/${pt.tree_id}`, { state: { openTreatment: pt.treatment_type } })}
                >
                  <span className="text-lg" aria-hidden="true">
                    {TREATMENT_ICONS[pt.treatment_type] ?? '📝'}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">
                    {t('treatment.pending')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{pt.tree_name}</p>
                    <p className="text-xs text-gray-500">{t(`treatment.${pt.treatment_type}`)}</p>
                  </div>
                  <span className="text-xs text-amber-700 font-medium flex-shrink-0">
                    {pt.treatment_date}
                  </span>
                </li>
              ))}
              {/* Alerts */}
              {alerts.map((alert, idx) => (
                <li
                  key={`alert-${alert.tree_id}-${alert.treatment_type}-${idx}`}
                  className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm cursor-pointer hover:bg-green-50 transition-colors"
                  onClick={() => handleAlertClick(alert)}
                >
                  <span className="text-lg" aria-hidden="true">
                    {TREATMENT_ICONS[alert.treatment_type] ?? '📝'}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    alert.status === 'due' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {alert.status === 'due' ? t('alert.due') : t('alert.upcoming')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{alert.tree_name}</p>
                    <p className="text-xs text-gray-500">{t(`treatment.${alert.treatment_type}`)}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{alert.due_date}</span>
                  <button
                    onClick={(e) => handleAlertDismiss(e, alert)}
                    className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-0.5"
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trees section */}
        <div className="space-y-4">
            {/* Search + view toggle */}
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="relative flex-1">
            <svg
              className={`absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dashboard.searchPlaceholder')}
              className={`w-full border border-gray-300 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Grid / List toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-[#2d6a4f] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} transition-colors`}
              title={t('dashboard.gridView')}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-[#2d6a4f] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} transition-colors`}
              title={t('dashboard.listView')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && trees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-7xl mb-4" role="img" aria-label="bonsai">🌳</span>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              {t('tree.noTrees')}
            </h2>
            <button
              onClick={() => navigate('/trees/new')}
              className="mt-4 bg-[#2d6a4f] hover:bg-[#245a42] text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              {t('tree.addFirst')}
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && !error && trees.length > 0 && filteredTrees.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <p>{t('tree.noTrees')}</p>
          </div>
        )}

        {/* Grid view */}
        {!loading && !error && filteredTrees.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTrees.map((tree) => (
              <TreeCard
                key={tree.id}
                tree={tree}
                speciesName={getSpeciesName(tree)}
                coverPhotoUrl={coverPhotos[tree.id]}
                alertCount={alertCountMap[tree.id]}
                onClick={() => navigate(`/trees/${tree.id}`)}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {!loading && !error && filteredTrees.length > 0 && viewMode === 'list' && (
          <div className="space-y-3">
            {filteredTrees.map((tree) => (
              <TreeRow
                key={tree.id}
                tree={tree}
                speciesName={getSpeciesName(tree)}
                coverPhotoUrl={coverPhotos[tree.id]}
                alertCount={alertCountMap[tree.id]}
                onClick={() => navigate(`/trees/${tree.id}`)}
              />
            ))}
          </div>
        )}

        {/* FAB for mobile */}
        <button
          onClick={() => navigate('/trees/new')}
          className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#2d6a4f] hover:bg-[#245a42] text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors z-50"
          aria-label={t('nav.addTree')}
        >
          +
        </button>
        </div>
      </div>

    </Layout>
  )
}

export default DashboardPage
