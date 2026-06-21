import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export function useOnlineUsers() {
  const { user } = useAuth()
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; email: string }[]>([])

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.entries(state).map(([id, data]) => ({
          id,
          email: (data as unknown as Array<{ email?: string }>)?.[0]?.email ?? '',
        }))
        setOnlineCount(users.length)
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            email: user.email ?? '',
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return { onlineCount, onlineUsers }
}
