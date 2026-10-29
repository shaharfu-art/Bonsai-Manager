import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Layout from '../components/Layout'
import { useUserProfile } from '../hooks/useUserProfile'
import { useAdminData } from '../hooks/useAdminData'
import { useOnlineUsers } from '../hooks/useOnlineUsers'
import { useSpecies } from '../hooks/useSpecies'
import { supabase } from '../lib/supabase-client'
import { calculateLevel } from '../lib/user-level'

// Parse user agent string to show OS icon
function parseUserAgent(ua: string | null): string | null {
  if (!ua) return null
  if (ua.includes('iPhone') || ua.includes('iPad')) return '🍎 iOS'
  if (ua.includes('Android')) return '🤖 Android'
  if (ua.includes('Windows')) return '🪟 Win'
  if (ua.includes('Mac')) return '🍎 Mac'
  if (ua.includes('Linux')) return '🐧 Linux'
  return null
}

// Format a timestamp as relative time ("5m ago" / "לפני 5 דקות")
function formatRelativeTime(iso: string | null, isRtl: boolean): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (isNaN(then)) return '—'
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return isRtl ? 'עכשיו' : 'now'
  if (mins < 60) return isRtl ? `לפני ${mins} דק׳` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return isRtl ? `לפני ${hours} שע׳` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return isRtl ? `לפני ${days} ימים` : `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const AdminPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'he'
  
const navigate = useNavigate()
  
const { isAdmin, loading: profileLoading } = useUserProfile()
  
const { stats, users, loading, error, updateUserRole, updateUserLimits } = useAdminData()
  
const { onlineCount, onlineUsers } = useOnlineUsers()
  
const { species } = useSpecies()
  
const [editingUser, setEditingUser] = useState<string | null>(null)
  
const [editMaxTrees, setEditMaxTrees] = useState(100)
  
const [editingSpecies, setEditingSpecies] = useState<string | null>(null)
  
const [editSpeciesHe, setEditSpeciesHe] = useState('')
  
const [editSpeciesEn, setEditSpeciesEn] = useState('')
  
const [editSpeciesLatin, setEditSpeciesLatin] = useState('')
  
const [speciesFilter, setSpeciesFilter] = useState('')
  const [speciesList, setSpeciesList] = useState<typeof species>([])
  const [userSearch, setUserSearch] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'email' | 'role' | 'plan' | 'trees' | 'friends' | 'city' | 'joined' | 'lastSeen'>('joined')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [viewPhotosUser, setViewPhotosUser] = useState<string | null>(null)
  const [userPhotos, setUserPhotos] = useState<Array<{ id: string; url: string }>>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [viewTreesUser, setViewTreesUser] = useState<string | null>(null)
  const [userTrees, setUserTrees] = useState<Array<{ id: string; custom_name: string; species_free_text: string | null; style: string | null; age_years: number | null; location: string | null; created_at: string; cover_url: string | null }>>([])
  const [loadingTrees, setLoadingTrees] = useState(false)

  // Sync species from hook
  React.useEffect(() => {
    if (species.length > 0 && speciesList.length === 0) setSpeciesList(species)
  }, [species])

  
const filteredAdminSpecies = speciesList.filter(s => {
    if (!speciesFilter) return true
    const q = speciesFilter.toLowerCase()
    return s.name_he.includes(speciesFilter) || s.name_en.toLowerCase().includes(q) || (s.name_latin ?? '').toLowerCase().includes(q)
  })

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true
    const q = userSearch.toLowerCase()
    return (u.display_name ?? '').toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
  })

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const getVal = (u: typeof a): string | number => {
      switch (sortKey) {
        case 'name': return (u.display_name ?? u.full_name ?? '').toLowerCase()
        case 'email': return (u.email ?? '').toLowerCase()
        case 'role': return u.role ?? ''
        case 'plan': return u.plan ?? ''
        case 'trees': return u.tree_count ?? 0
        case 'friends': return u.friends_count ?? 0
        case 'city': return (u.trees_city ?? '').toLowerCase()
        case 'joined': return new Date(u.created_at || 0).getTime()
        case 'lastSeen': return u.last_seen_at ? new Date(u.last_seen_at).getTime() : 0
        default: return 0
      }
    }
    const va = getVal(a), vb = getVal(b)
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })

  const handleViewPhotos = async (userId: string) => {
    setViewPhotosUser(userId)
    setLoadingPhotos(true)
    try {
      const { data } = await supabase.from('photos').select('id, storage_path').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      if (data && data.length > 0) {
        const photos = await Promise.all(data.map(async (p: any) => {
          const { data: signed } = await supabase.storage.from('bonsai-photos').createSignedUrl(p.storage_path, 3600)
          return { id: p.id, url: signed?.signedUrl ?? '' }
        }))
        setUserPhotos(photos.filter(p => p.url))
      } else {
        setUserPhotos([])
      }
    } catch { setUserPhotos([]) }
    finally { setLoadingPhotos(false) }
  }

  const handleViewTrees = async (userId: string) => {
    setViewTreesUser(userId)
    setLoadingTrees(true)
    try {
      const { data } = await supabase.from('trees').select('id, custom_name, species_free_text, style, age_years, location, created_at, cover_photo_id').eq('user_id', userId).order('created_at', { ascending: false })
      if (data && data.length > 0) {
        const trees = await Promise.all(data.map(async (tree: any) => {
          let cover_url: string | null = null
          if (tree.cover_photo_id) {
            const { data: photo } = await supabase.from('photos').select('storage_path').eq('id', tree.cover_photo_id).single()
            if (photo) {
              const { data: signed } = await supabase.storage.from('bonsai-photos').createSignedUrl(photo.storage_path, 3600)
              cover_url = signed?.signedUrl ?? null
            }
          }
          if (!cover_url) {
            const { data: firstPhoto } = await supabase.from('photos').select('storage_path').eq('tree_id', tree.id).limit(1)
            if (firstPhoto && firstPhoto.length > 0) {
              const { data: signed } = await supabase.storage.from('bonsai-photos').createSignedUrl(firstPhoto[0].storage_path, 3600)
              cover_url = signed?.signedUrl ?? null
            }
          }
          return { id: tree.id, custom_name: tree.custom_name, species_free_text: tree.species_free_text, style: tree.style, age_years: tree.age_years, location: tree.location, created_at: tree.created_at, cover_url }
        }))
        setUserTrees(trees)
      } else {
        setUserTrees([])
      }
    } catch { setUserTrees([]) }
    finally { setLoadingTrees(false) }
  }

  
const handleSpeciesEdit = (id: string) => {
    const s = speciesList.find(sp => sp.id === id)
    if (!s) 
return
    setEditingSpecies(id)
    setEditSpeciesHe(s.name_he)
    setEditSpeciesEn(s.name_en)
    setEditSpeciesLatin(s.name_latin ?? '')
  }

  
const handleSpeciesSave = async (id: string) => {
    await supabase.from('species').update({
      name_he: editSpeciesHe,
      name_en: editSpeciesEn,
      name_latin: editSpeciesLatin || null,
    }).eq('id', id)
    setSpeciesList(prev => prev.map(s => s.id === id ? { ...s, name_he: editSpeciesHe, name_en: editSpeciesEn, name_latin: editSpeciesLatin || null } : s))
    setEditingSpecies(null)
  }

  
const handleSpeciesDelete = async (id: string) => {
    await supabase.from('species').delete().eq('id', id)
    setSpeciesList(prev => prev.filter(s => s.id !== id))
  }

  
const [addingSpecies, setAddingSpecies] = useState(false)
  
const [newSpecHe, setNewSpecHe] = useState('')
  
const [newSpecEn, setNewSpecEn] = useState('')
  
const [newSpecLatin, setNewSpecLatin] = useState('')
  
const [newSpecType, setNewSpecType] = useState('temperate')

  
const handleSpeciesAdd = async () => {
    if (!newSpecHe.trim() || !newSpecEn.trim()) 
return
    const { data, error: insertErr } = await supabase.from('species').insert({
      name_he: newSpecHe.trim(),
      name_en: newSpecEn.trim(),
      name_latin: newSpecLatin.trim() || null,
      type: newSpecType,
      is_system: true,
    }).select().single()
    if (!insertErr && data) {
      setSpeciesList(prev => [...prev, data as typeof prev[0]])
      setNewSpecHe('')
      setNewSpecEn('')
      setNewSpecLatin('')
      setAddingSpecies(false)
    }
  }

  // Redirect non-admins
  if (!profileLoading && !isAdmin) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-red-600 text-lg">⛔ {t('admin.noAccess')}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-[#2d6a4f] hover:underline">
            ← {t('nav.dashboard')}
          </button>
        </div>
      </Layout>
    )
  }

  if (loading || profileLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </Layout>
    )
  }

  
const handleExportCSV = () => {
    if (!users.length) 
return
    const headers = ['ID', 'Role', 'Trees', 'Max Trees', 'Created At']
    const rows = users.map(u => [u.id, u.role, u.tree_count, u.max_trees, u.created_at])
    
const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    
const blob = new Blob([csv], { type: 'text/csv' })
    
const url = URL.createObjectURL(blob)
    
const a = document.createElement('a')
    a.href = url
    a.download = `bonsai-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  
return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#2d6a4f]">🔧 {t('admin.title')}</h1>
          <button
            onClick={handleExportCSV}
            className="text-sm border border-[#2d6a4f] text-[#2d6a4f] px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          >
            📥 {t('admin.exportCSV')}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={t('admin.totalUsers')} value={stats.totalUsers} color="text-blue-600" />
            <StatCard label={t('admin.totalTrees')} value={stats.totalTrees} color="text-[#2d6a4f]" />
            <StatCard label={t('admin.totalTreatments')} value={stats.totalTreatments} color="text-amber-600" />
            <StatCard label={t('admin.totalPhotos')} value={stats.totalPhotos} color="text-purple-600" />
            <StatCard label={t('admin.newUsersWeek')} value={stats.newUsersThisWeek} color="text-green-600" />
            <StatCard label={t('admin.treatmentsWeek')} value={stats.treatmentsThisWeek} color="text-orange-600" />
            <StatCard label={t('admin.onlineNow')} value={onlineCount} color="text-emerald-500" />
          </div>
        )}

        {/* Top species */}
        {stats && stats.topSpecies.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('admin.topSpecies')}</h2>
            <div className="space-y-2">
              {stats.topSpecies.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-[#52b788] h-full rounded-full"
                      style={{ width: `${(s.count / (stats.topSpecies[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 w-24 truncate">{s.name}</span>
                  <span className="text-xs font-bold text-gray-500 w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treatment distribution */}
        {stats && stats.treatmentDistribution.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Timeline chart */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('admin.treatmentTimeline')}</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.treatmentsTimeline}>
                  <defs>
                    <linearGradient id="colorTreatments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val: string) => val.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label: string) => label}
                    formatter={(value: number) => [value, t('admin.totalTreatments')]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2d6a4f"
                    fillOpacity={1}
                    fill="url(#colorTreatments)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution bar chart */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('admin.treatmentDist')}</h2>
              <div className="space-y-2">
                {stats.treatmentDistribution.map((td, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${(td.count / (stats.treatmentDistribution[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-700 w-28 truncate">{t(`treatment.${td.type}`)}</span>
                    <span className="text-xs font-bold text-gray-500 w-8 text-right">{td.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-700">{t('admin.users')} ({filteredUsers.length})</h2>
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="🔍 Search by name or email..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-[#52b788]"
            />
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <SortHeader label={t('admin.name')} col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label={t('auth.email')} col="email" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label={t('admin.role')} col="role" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Plan" col="plan" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="text-left px-4 py-2 text-xs text-gray-500">Level</th>
                  <SortHeader label={t('admin.trees')} col="trees" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Friends" col="friends" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="City" col="city" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label={t('admin.joined')} col="joined" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label={t('admin.lastSeen')} col="lastSeen" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.status')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map(user => {
                  const isOnline = onlineUsers.some(o => o.id === user.id)
                  const osInfo = parseUserAgent(user.last_user_agent)
                  return (
                  <tr key={user.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-700 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#2d6a4f] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (user.display_name || user.full_name || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        {user.display_name || user.full_name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 truncate max-w-[160px]">{user.email || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.plan === 'pro' ? 'bg-gray-800 text-white' : user.plan === 'premium' ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {(() => {
                        const lvl = calculateLevel({ trees: user.tree_count, treatments: 0, friends: user.friends_count, posts: 0 })
                        return <span title={lvl.nameEn}>{lvl.icon} {lvl.name}</span>
                      })()}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700">{user.tree_count}/{user.max_trees}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{user.friends_count}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{user.trees_city || '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-xs text-gray-500" title={user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : ''}>{formatRelativeTime(user.last_seen_at, isRtl)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} title={isOnline ? 'Online' : 'Offline'} />
                        {osInfo && <span className="text-[10px] text-gray-400" title={user.last_user_agent || ''}>{osInfo}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewTrees(user.id)}
                          className="text-[10px] text-green-600 border border-green-200 px-2 py-0.5 rounded hover:bg-green-50"
                          title="View trees"
                        >
                          🌳
                        </button>
                        <button
                          onClick={() => handleViewPhotos(user.id)}
                          className="text-[10px] text-blue-500 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-50"
                          title="View photos"
                        >
                          📷
                        </button>
                        <button
                          onClick={() => { setEditingUser(user.id); setEditMaxTrees(user.max_trees) }}
                          className="text-[10px] text-gray-500 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-100"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          className="text-[10px] text-purple-600 border border-purple-200 px-2 py-0.5 rounded hover:bg-purple-50"
                        >
                          {user.role === 'admin' ? '👤' : '👑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {/* Species Management */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-700">🌿 {t('tree.species')} ({speciesList.length})</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={speciesFilter}
                onChange={e => setSpeciesFilter(e.target.value)}
                placeholder={t('dashboard.searchPlaceholder')}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-[#52b788]"
              />
              <button
                onClick={() => setAddingSpecies(true)}
                className="text-xs bg-[#2d6a4f] text-white px-2.5 py-1 rounded-lg hover:bg-[#245a42]"
              >
                + {t('common.add')}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('species.nameHe')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('species.nameEn')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('species.nameLatin')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {addingSpecies && (
                  <tr className="border-t border-green-100 bg-green-50">
                    <td className="px-4 py-2">
                      <input value={newSpecHe} onChange={e => setNewSpecHe(e.target.value)} placeholder={t('species.nameHe')} className="border rounded px-1 py-0.5 text-xs w-full" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={newSpecEn} onChange={e => setNewSpecEn(e.target.value)} placeholder={t('species.nameEn')} className="border rounded px-1 py-0.5 text-xs w-full" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={newSpecLatin} onChange={e => setNewSpecLatin(e.target.value)} placeholder={t('species.nameLatin')} className="border rounded px-1 py-0.5 text-xs w-full" />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={handleSpeciesAdd} className="text-[10px] bg-[#2d6a4f] text-white px-2 py-0.5 rounded">✓</button>
                        <button onClick={() => setAddingSpecies(false)} className="text-[10px] text-gray-500 border px-2 py-0.5 rounded">✕</button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredAdminSpecies.map(s => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                    {editingSpecies === s.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input value={editSpeciesHe} onChange={e => setEditSpeciesHe(e.target.value)} className="border rounded px-1 py-0.5 text-xs w-full" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editSpeciesEn} onChange={e => setEditSpeciesEn(e.target.value)} className="border rounded px-1 py-0.5 text-xs w-full" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editSpeciesLatin} onChange={e => setEditSpeciesLatin(e.target.value)} className="border rounded px-1 py-0.5 text-xs w-full" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => handleSpeciesSave(s.id)} className="text-[10px] bg-[#2d6a4f] text-white px-2 py-0.5 rounded">✓</button>
                            <button onClick={() => setEditingSpecies(null)} className="text-[10px] text-gray-500 border px-2 py-0.5 rounded">✕</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 text-xs text-gray-700">{s.name_he}</td>
                        <td className="px-4 py-2 text-xs text-gray-700">{s.name_en}</td>
                        <td className="px-4 py-2 text-xs text-gray-400 italic">{s.name_latin ?? '—'}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => handleSpeciesEdit(s.id)} className="text-[10px] text-gray-500 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-100">✏️</button>
                            <button onClick={() => handleSpeciesDelete(s.id)} className="text-[10px] text-red-500 border border-red-200 px-2 py-0.5 rounded hover:bg-red-50">🗑️</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Photo viewer modal */}
      {viewPhotosUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={() => setViewPhotosUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">📷 User Photos</h3>
              <button onClick={() => setViewPhotosUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {loadingPhotos ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#2d6a4f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userPhotos.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No photos</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {userPhotos.map(p => (
                  <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={p.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trees browser modal */}
      {viewTreesUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={() => setViewTreesUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">🌳 User Trees ({userTrees.length})</h3>
              <button onClick={() => setViewTreesUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {loadingTrees ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#2d6a4f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userTrees.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No trees</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userTrees.map(tree => (
                  <div key={tree.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    {/* Cover photo */}
                    <div className="aspect-[16/10] bg-gray-100">
                      {tree.cover_url ? (
                        <img src={tree.cover_url} alt={tree.custom_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🌳</div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <h4 className="text-sm font-bold text-[#2d6a4f]">{tree.custom_name}</h4>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {tree.species_free_text && <span>🌿 {tree.species_free_text}</span>}
                        {tree.style && <span>✨ {tree.style}</span>}
                        {tree.age_years && <span>🗓️ {tree.age_years} yrs</span>}
                        {tree.location && <span>📍 {tree.location}</span>}
                      </div>
                      <p className="text-[10px] text-gray-400">Added: {new Date(tree.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit user limits modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">✏️ Edit Tree Limit</h3>
            <div className="flex items-center gap-2 mb-4">
              <label className="text-xs text-gray-500">Max trees:</label>
              <input
                type="number"
                value={editMaxTrees}
                onChange={e => setEditMaxTrees(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-[#52b788]"
                min={1}
                max={9999}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => { await updateUserLimits(editingUser, editMaxTrees); setEditingUser(null) }}
                className="flex-1 bg-[#2d6a4f] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#245a42]"
              >
                Save
              </button>
              <button onClick={() => setEditingUser(null)} className="flex-1 border border-gray-300 text-gray-600 text-xs py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

// Stat card component
const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="bg-white rounded-xl shadow p-4 text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
)

// Sortable table header
type SortCol = 'name' | 'email' | 'role' | 'plan' | 'trees' | 'friends' | 'city' | 'joined' | 'lastSeen'
const SortHeader: React.FC<{
  label: string
  col: SortCol
  sortKey: SortCol
  sortDir: 'asc' | 'desc'
  onSort: (col: SortCol) => void
}> = ({ label, col, sortKey, sortDir, onSort }) => {
  const active = sortKey === col
  return (
    <th className="text-left px-4 py-2 text-xs text-gray-500 select-none">
      <button
        onClick={() => onSort(col)}
        className={`flex items-center gap-1 hover:text-gray-800 transition-colors ${active ? 'text-[#2d6a4f] font-semibold' : ''}`}
      >
        {label}
        <span className="text-[9px] leading-none">
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  )
}


export default AdminPage
