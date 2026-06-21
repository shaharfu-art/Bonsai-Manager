import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Layout from '../components/Layout'
import { useUserProfile } from '../hooks/useUserProfile'
import { useAdminData } from '../hooks/useAdminData'
import { useOnlineUsers } from '../hooks/useOnlineUsers'

const AdminPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin, loading: profileLoading } = useUserProfile()
  const { stats, users, loading, error, updateUserRole, updateUserLimits } = useAdminData()
  const { onlineCount, onlineUsers } = useOnlineUsers()
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editMaxTrees, setEditMaxTrees] = useState(100)

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
    if (!users.length) return
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
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">{t('admin.users')} ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.name')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('auth.email')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.role')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.trees')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.joined')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.status')}</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const isOnline = onlineUsers.some(o => o.id === user.id)
                  return (
                  <tr key={user.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-700 font-medium">{user.display_name || user.full_name || '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-600 truncate max-w-[160px]">{user.email || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700">{user.tree_count}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} title={isOnline ? 'Online' : 'Offline'} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {editingUser === user.id ? (
                          <>
                            <button
                              onClick={async () => { await updateUserLimits(user.id, editMaxTrees); setEditingUser(null) }}
                              className="text-[10px] bg-[#2d6a4f] text-white px-2 py-0.5 rounded"
                            >
                              ✓
                            </button>
                            <button onClick={() => setEditingUser(null)} className="text-[10px] text-gray-500 border px-2 py-0.5 rounded">✕</button>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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

export default AdminPage
