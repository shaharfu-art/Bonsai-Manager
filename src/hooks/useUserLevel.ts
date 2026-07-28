import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'
import { calculateLevel, type LevelInfo, type UserStats } from '../lib/user-level'

export function useUserLevel(userId?: string) {
  const { user } = useAuth()
  const targetId = userId ?? user?.id
  const [level, setLevel] = useState<LevelInfo | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!targetId) return

    const fetchStats = async () => {
      setLoading(true)
      try {
        const [treesRes, treatmentsRes, friendsRes, postsRes] = await Promise.all([
          supabase.from('trees').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
          supabase.from('treatment_logs').select('id', { count: 'exact', head: true }).eq('user_id', targetId).eq('status', 'completed'),
          supabase.from('friend_requests').select('id', { count: 'exact', head: true }).eq('status', 'accepted').or(`from_user_id.eq.${targetId},to_user_id.eq.${targetId}`),
          supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
        ])

        const userStats: UserStats = {
          trees: treesRes.count ?? 0,
          treatments: treatmentsRes.count ?? 0,
          friends: friendsRes.count ?? 0,
          posts: postsRes.count ?? 0,
        }

        setStats(userStats)
        setLevel(calculateLevel(userStats))
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [targetId])

  return { level, stats, loading }
}
