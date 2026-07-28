import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export interface FriendRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  // Enriched
  from_display_name?: string | null
  from_username?: string | null
  from_avatar_url?: string | null
}

export function useFriends() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<string[]>([]) // accepted friend IDs
  const [pendingReceived, setPendingReceived] = useState<FriendRequest[]>([])
  const [pendingSent, setPendingSent] = useState<string[]>([]) // IDs of users I sent to
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // Fetch all my friend requests (sent + received)
      const { data: allRequests } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)

      const requests = allRequests ?? []

      // Accepted friends (both directions)
      const acceptedIds: string[] = []
      for (const req of requests) {
        if (req.status === 'accepted') {
          acceptedIds.push(req.from_user_id === user.id ? req.to_user_id : req.from_user_id)
        }
      }
      setFriends(acceptedIds)

      // Pending requests I sent
      const sentIds = requests
        .filter(r => r.from_user_id === user.id && r.status === 'pending')
        .map(r => r.to_user_id)
      setPendingSent(sentIds)

      // Pending requests I received
      const received = requests.filter(r => r.to_user_id === user.id && r.status === 'pending')

      // Enrich with profile info
      if (received.length > 0) {
        const fromIds = received.map(r => r.from_user_id)
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', fromIds)

        const enriched: FriendRequest[] = received.map(req => {
          const profile = (profiles ?? []).find(p => p.id === req.from_user_id)
          return {
            ...req,
            from_display_name: profile?.display_name ?? null,
            from_username: profile?.username ?? null,
            from_avatar_url: profile?.avatar_url ?? null,
          }
        })
        setPendingReceived(enriched)
      } else {
        setPendingReceived([])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const isFriend = (userId: string): boolean => friends.includes(userId)
  const hasPendingSent = (userId: string): boolean => pendingSent.includes(userId)

  const sendRequest = async (toUserId: string) => {
    if (!user || toUserId === user.id) return
    await supabase.from('friend_requests').insert({
      from_user_id: user.id,
      to_user_id: toUserId,
    })
    setPendingSent(prev => [...prev, toUserId])

    // Insert in-app notification
    supabase.from('notifications').insert({
      user_id: toUserId,
      type: 'friend_request',
      from_user_id: user.id,
    }).then(() => {})

    // Send push notification (only works in production with HTTPS)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const url = (import.meta as any).env?.VITE_SUPABASE_URL ?? ''
        if (url) {
          fetch(`${url}/functions/v1/friend-request-notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '',
            },
            body: JSON.stringify({ to_user_id: toUserId }),
          }).catch(() => { /* silent — push is optional */ })
        }
      }
    } catch { /* ignore */ }
  }

  const acceptRequest = async (requestId: string, fromUserId: string) => {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId)
    setPendingReceived(prev => prev.filter(r => r.id !== requestId))
    setFriends(prev => [...prev, fromUserId])

    // Insert in-app notification for the requester
    if (user) {
      supabase.from('notifications').insert({
        user_id: fromUserId,
        type: 'friend_accepted',
        from_user_id: user.id,
      }).then(() => {})
    }
  }

  const rejectRequest = async (requestId: string) => {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId)
    setPendingReceived(prev => prev.filter(r => r.id !== requestId))
  }

  const removeFriend = async (friendId: string) => {
    if (!user) return
    // Delete the accepted request (could be in either direction)
    await supabase.from('friend_requests')
      .delete()
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${user.id})`)
    setFriends(prev => prev.filter(id => id !== friendId))
  }

  const cancelRequest = async (toUserId: string) => {
    if (!user) return
    await supabase.from('friend_requests')
      .delete()
      .eq('from_user_id', user.id)
      .eq('to_user_id', toUserId)
      .eq('status', 'pending')
    setPendingSent(prev => prev.filter(id => id !== toUserId))
  }

  return {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    isFriend,
    hasPendingSent,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    cancelRequest,
    refetch: fetchAll,
  }
}

// ─── People You May Know (Friends of Friends) ───────────────
export interface SuggestedUser {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

export function usePeopleYouMayKnow() {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSuggestions = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // 1. Get my friends
      const { data: myRequests } = await supabase
        .from('friend_requests')
        .select('from_user_id, to_user_id, status')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)

      const allRequests = myRequests ?? []

      // My accepted friend IDs
      const myFriendIds: string[] = []
      for (const req of allRequests) {
        if (req.status === 'accepted') {
          myFriendIds.push(req.from_user_id === user.id ? req.to_user_id : req.from_user_id)
        }
      }

      // IDs I already sent pending requests to
      const pendingSentIds = allRequests
        .filter(r => r.from_user_id === user.id && r.status === 'pending')
        .map(r => r.to_user_id)

      // IDs that sent pending requests to me
      const pendingReceivedIds = allRequests
        .filter(r => r.to_user_id === user.id && r.status === 'pending')
        .map(r => r.from_user_id)

      if (myFriendIds.length === 0) {
        setSuggestions([])
        setLoading(false)
        return
      }

      // 2. Get friends of my friends
      const { data: fofRequests } = await supabase
        .from('friend_requests')
        .select('from_user_id, to_user_id')
        .eq('status', 'accepted')
        .or(myFriendIds.map(id => `from_user_id.eq.${id}`).join(',') + ',' + myFriendIds.map(id => `to_user_id.eq.${id}`).join(','))

      // Collect candidate IDs (friends of friends)
      const excludeSet = new Set([user.id, ...myFriendIds, ...pendingSentIds, ...pendingReceivedIds])
      const candidateCounts: Record<string, number> = {}

      for (const req of fofRequests ?? []) {
        const otherId = myFriendIds.includes(req.from_user_id) ? req.to_user_id : req.from_user_id
        if (excludeSet.has(otherId)) continue
        candidateCounts[otherId] = (candidateCounts[otherId] ?? 0) + 1
      }

      // Sort by mutual friend count, take top 5
      const topCandidates = Object.entries(candidateCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id)

      if (topCandidates.length === 0) {
        setSuggestions([])
        setLoading(false)
        return
      }

      // 3. Get profiles
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', topCandidates)

      setSuggestions((profiles ?? []).map(p => ({
        id: p.id,
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
      })))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  return { suggestions, loading, refetch: fetchSuggestions }
}
