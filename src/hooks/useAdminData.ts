import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-client'

export interface AdminStats {
  totalUsers: number
  totalTrees: number
  totalTreatments: number
  totalPhotos: number
  newUsersThisWeek: number
  treatmentsThisWeek: number
  topSpecies: { name: string; count: number }[]
  treatmentDistribution: { type: string; count: number }[]
  treatmentsTimeline: { date: string; count: number }[]
}

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  created_at: string
  last_sign_in_at: string | null
  role: string
  tree_count: number
  max_trees: number
}

export function useAdminData() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch counts
      const [treesRes, treatmentsRes, photosRes, profilesRes] = await Promise.all([
        supabase.from('trees').select('id, user_id, species_id', { count: 'exact', head: false }),
        supabase.from('treatment_logs').select('id, treatment_date, treatment_type', { count: 'exact', head: false }),
        supabase.from('photos').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*'),
      ])

      const trees = treesRes.data ?? []
      const treatments = treatmentsRes.data ?? []
      const profiles = profilesRes.data ?? []

      // New users this week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const newUsersThisWeek = profiles.filter(p => new Date(p.created_at) > weekAgo).length

      // Treatments this week
      const treatmentsThisWeek = treatments.filter(t => new Date(t.treatment_date) > weekAgo).length

      // Top species
      const speciesCount: Record<string, number> = {}
      for (const tree of trees) {
        const key = tree.species_id ?? 'unknown'
        speciesCount[key] = (speciesCount[key] ?? 0) + 1
      }

      // Fetch species names
      const speciesIds = Object.keys(speciesCount).filter(k => k !== 'unknown')
      let speciesNames: Record<string, string> = {}
      if (speciesIds.length > 0) {
        const { data: speciesData } = await supabase
          .from('species')
          .select('id, name_en')
          .in('id', speciesIds)
        for (const s of speciesData ?? []) {
          speciesNames[s.id] = s.name_en
        }
      }

      const topSpecies = Object.entries(speciesCount)
        .map(([id, count]) => ({ name: speciesNames[id] ?? 'Other', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Treatment distribution by type
      const treatmentTypeCount: Record<string, number> = {}
      for (const t of treatments) {
        const type = (t as { treatment_type?: string }).treatment_type ?? 'other'
        treatmentTypeCount[type] = (treatmentTypeCount[type] ?? 0) + 1
      }
      const treatmentDistribution = Object.entries(treatmentTypeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)

      // Treatments timeline (last 30 days, grouped by day)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dayCountMap: Record<string, number> = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        dayCountMap[d.toISOString().split('T')[0]] = 0
      }
      for (const t of treatments) {
        const date = (t as { treatment_date: string }).treatment_date
        if (date && dayCountMap[date] !== undefined) {
          dayCountMap[date]++
        }
      }
      const treatmentsTimeline = Object.entries(dayCountMap)
        .map(([date, count]) => ({ date, count }))

      // Tree count per user
      const treeCountByUser: Record<string, number> = {}
      for (const tree of trees) {
        treeCountByUser[tree.user_id] = (treeCountByUser[tree.user_id] ?? 0) + 1
      }

      // Build user list from user_profiles (secure, with RLS)
      const { data: viewUsers } = await supabase
        .from('user_profiles')
        .select('*')

      const adminUsers: AdminUser[] = (viewUsers ?? []).map((u: Record<string, unknown>) => ({
        id: u.id as string,
        email: (u.email as string) ?? '',
        full_name: (u.full_name as string) ?? null,
        display_name: (u.display_name as string) ?? null,
        created_at: (u.created_at as string) ?? '',
        last_sign_in_at: null,
        role: (u.role as string) ?? 'user',
        tree_count: treeCountByUser[(u.id as string)] ?? 0,
        max_trees: (u.max_trees as number) ?? 100,
      }))

      setStats({
        totalUsers: profiles.length,
        totalTrees: trees.length,
        totalTreatments: treatments.length,
        totalPhotos: photosRes.count ?? 0,
        newUsersThisWeek,
        treatmentsThisWeek,
        topSpecies,
        treatmentDistribution,
        treatmentsTimeline,
      })

      setUsers(adminUsers)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    }
    return !error
  }

  const updateUserLimits = async (userId: string, maxTrees: number) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ max_trees: maxTrees })
      .eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, max_trees: maxTrees } : u))
    }
    return !error
  }

  return { stats, users, loading, error, updateUserRole, updateUserLimits, refetch: fetchData }
}
