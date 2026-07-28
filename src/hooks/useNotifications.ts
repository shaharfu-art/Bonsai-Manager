import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export interface Notification {
  id: string
  user_id: string
  type: 'like' | 'comment' | 'friend_accepted' | 'friend_request'
  from_user_id: string | null
  tree_id: string | null
  text: string | null
  read: boolean
  created_at: string
  // Enriched
  from_display_name: string | null
  from_avatar_url: string | null
  tree_name: string | null
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      if (!data || data.length === 0) {
        setNotifications([])
        setLoading(false)
        return
      }

      // Collect unique from_user_ids and tree_ids for enrichment
      const fromUserIds = [...new Set(data.filter(n => n.from_user_id).map(n => n.from_user_id!))]
      const treeIds = [...new Set(data.filter(n => n.tree_id).map(n => n.tree_id!))]

      // Fetch from_user profiles
      let profilesMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
      if (fromUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', fromUserIds)

        for (const p of profiles ?? []) {
          profilesMap[p.id] = {
            display_name: p.display_name ?? p.username ?? null,
            avatar_url: p.avatar_url ?? null,
          }
        }
      }

      // Fetch tree names
      let treeNamesMap: Record<string, string> = {}
      if (treeIds.length > 0) {
        const { data: trees } = await supabase
          .from('trees')
          .select('id, custom_name')
          .in('id', treeIds)

        for (const t of trees ?? []) {
          treeNamesMap[t.id] = t.custom_name
        }
      }

      // Enrich notifications
      const enriched: Notification[] = data.map(n => ({
        ...n,
        from_display_name: n.from_user_id ? profilesMap[n.from_user_id]?.display_name ?? null : null,
        from_avatar_url: n.from_user_id ? profilesMap[n.from_user_id]?.avatar_url ?? null : null,
        tree_name: n.tree_id ? treeNamesMap[n.tree_id] ?? null : null,
      }))

      setNotifications(enriched)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return { notifications, unreadCount, markAsRead, markAllRead, loading, refetch: fetchNotifications }
}
