import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export interface FeedTree {
  id: string
  user_id: string
  custom_name: string
  species_free_text: string | null
  age_years: number | null
  style: string | null
  location: string | null
  likes_count: number
  created_at: string
  // Joined
  owner_name: string | null
  owner_username: string | null
  owner_avatar_url: string | null
  first_photo_url: string | null  // oldest photo (before)
  last_photo_url: string | null   // newest photo (after)
  photo_count: number
  liked_by_me: boolean
}

export interface TreeComment {
  id: string
  tree_id: string
  user_id: string
  text: string
  created_at: string
  // Joined
  user_display_name: string | null
  user_avatar_url: string | null
}

export function useTreeFeed() {
  const { user } = useAuth()
  const [trees, setTrees] = useState<FeedTree[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrees = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // Get my friends list first
      const { data: myRequests } = await supabase
        .from('friend_requests')
        .select('from_user_id, to_user_id')
        .eq('status', 'accepted')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)

      const friendIds: string[] = []
      for (const req of myRequests ?? []) {
        friendIds.push(req.from_user_id === user.id ? req.to_user_id : req.from_user_id)
      }

      if (friendIds.length === 0) {
        setTrees([])
        setLoading(false)
        return
      }

      // Fetch all trees from friends (not just public)
      const { data: rawTrees, error: fetchErr } = await supabase
        .from('trees')
        .select('id, user_id, custom_name, species_free_text, age_years, style, location, likes_count, created_at')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(30)

      if (fetchErr) throw fetchErr
      if (!rawTrees || rawTrees.length === 0) {
        setTrees([])
        setLoading(false)
        return
      }

      // Unique owner IDs
      const ownerIds = [...new Set(rawTrees.map(t => t.user_id))]
      const treeIds = rawTrees.map(t => t.id)

      // Fetch owner profiles
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', ownerIds)

      // Fetch first and last photo for each tree
      // Get all photos for these trees ordered by created_at
      const { data: allPhotos } = await supabase
        .from('photos')
        .select('id, tree_id, storage_path, created_at')
        .in('tree_id', treeIds)
        .order('created_at', { ascending: true })

      // Build maps: first photo (oldest) and last photo (newest) per tree + count
      const firstPhotoMap: Record<string, string> = {}
      const lastPhotoMap: Record<string, string> = {}
      const photoCountMap: Record<string, number> = {}

      for (const photo of allPhotos ?? []) {
        if (!photoCountMap[photo.tree_id]) {
          photoCountMap[photo.tree_id] = 0
          firstPhotoMap[photo.tree_id] = photo.storage_path
        }
        photoCountMap[photo.tree_id]++
        lastPhotoMap[photo.tree_id] = photo.storage_path
      }

      // Sign URLs for first and last photos (deduplicate paths)
      const pathsToSign = new Set<string>()
      for (const treeId of treeIds) {
        if (firstPhotoMap[treeId]) pathsToSign.add(firstPhotoMap[treeId])
        if (lastPhotoMap[treeId]) pathsToSign.add(lastPhotoMap[treeId])
      }

      const signedUrlMap: Record<string, string> = {}
      const pathArray = [...pathsToSign]
      // Sign in batches of 10
      for (let i = 0; i < pathArray.length; i += 10) {
        const batch = pathArray.slice(i, i + 10)
        const results = await Promise.all(
          batch.map(path =>
            supabase.storage.from('bonsai-photos').createSignedUrl(path, 86400)
          )
        )
        for (let j = 0; j < results.length; j++) {
          const { data } = results[j]
          if (data?.signedUrl) {
            signedUrlMap[batch[j]] = data.signedUrl
          }
        }
      }

      // Check which trees I liked
      const { data: myLikes } = await supabase
        .from('tree_likes')
        .select('tree_id')
        .eq('user_id', user.id)
        .in('tree_id', treeIds)

      const likedTreeIds = new Set((myLikes ?? []).map(l => l.tree_id))

      // Enrich
      const enriched: FeedTree[] = rawTrees.map(tree => {
        const profile = (profiles ?? []).find(p => p.id === tree.user_id)
        const firstPath = firstPhotoMap[tree.id]
        const lastPath = lastPhotoMap[tree.id]
        return {
          ...tree,
          owner_name: profile?.display_name ?? profile?.username ?? null,
          owner_username: profile?.username ?? null,
          owner_avatar_url: profile?.avatar_url ?? null,
          first_photo_url: firstPath ? signedUrlMap[firstPath] ?? null : null,
          last_photo_url: lastPath ? signedUrlMap[lastPath] ?? null : null,
          photo_count: photoCountMap[tree.id] ?? 0,
          liked_by_me: likedTreeIds.has(tree.id),
        }
      })

      setTrees(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTrees()
  }, [fetchTrees])

  const toggleTreeLike = async (treeId: string) => {
    if (!user) return
    const tree = trees.find(t => t.id === treeId)
    if (!tree) return

    if (tree.liked_by_me) {
      // Unlike
      await supabase.from('tree_likes').delete().eq('tree_id', treeId).eq('user_id', user.id)
      await supabase.from('trees').update({ likes_count: Math.max(0, tree.likes_count - 1) }).eq('id', treeId)
      setTrees(prev => prev.map(t => t.id === treeId ? { ...t, liked_by_me: false, likes_count: Math.max(0, t.likes_count - 1) } : t))
    } else {
      // Like
      await supabase.from('tree_likes').insert({ tree_id: treeId, user_id: user.id })
      await supabase.from('trees').update({ likes_count: tree.likes_count + 1 }).eq('id', treeId)
      setTrees(prev => prev.map(t => t.id === treeId ? { ...t, liked_by_me: true, likes_count: t.likes_count + 1 } : t))

      // Insert notification (don't notify yourself)
      if (tree.user_id !== user.id) {
        supabase.from('notifications').insert({
          user_id: tree.user_id,
          type: 'like',
          from_user_id: user.id,
          tree_id: treeId,
        }).then(() => {})
      }
    }
  }

  return { trees, loading, error, refetch: fetchTrees, toggleTreeLike }
}

// ─── Tree Comments Hook ─────────────────────────────────────
export function useTreeComments(treeId: string) {
  const { user } = useAuth()
  const [comments, setComments] = useState<TreeComment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchComments = useCallback(async () => {
    if (!treeId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tree_comments')
        .select('*')
        .eq('tree_id', treeId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!data || data.length === 0) {
        setComments([])
        setLoading(false)
        return
      }

      // Fetch user profiles
      const userIds = [...new Set(data.map(c => c.user_id))]
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds)

      const enriched: TreeComment[] = data.map(comment => {
        const profile = (profiles ?? []).find(p => p.id === comment.user_id)
        return {
          ...comment,
          user_display_name: profile?.display_name ?? profile?.username ?? null,
          user_avatar_url: profile?.avatar_url ?? null,
        }
      })

      setComments(enriched)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [treeId])

  const addComment = async (text: string) => {
    if (!user || !treeId || !text.trim()) return
    const { data, error } = await supabase
      .from('tree_comments')
      .insert({ tree_id: treeId, user_id: user.id, text: text.trim() })
      .select()
      .single()

    if (error) throw error

    // Get current user profile for local state
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()

    const newComment: TreeComment = {
      ...data,
      user_display_name: myProfile?.display_name ?? null,
      user_avatar_url: myProfile?.avatar_url ?? null,
    }

    setComments(prev => [...prev, newComment])

    // Insert notification for tree owner (don't notify yourself)
    try {
      const { data: treeData } = await supabase
        .from('trees')
        .select('user_id')
        .eq('id', treeId)
        .single()

      if (treeData && treeData.user_id !== user.id) {
        supabase.from('notifications').insert({
          user_id: treeData.user_id,
          type: 'comment',
          from_user_id: user.id,
          tree_id: treeId,
          text: text.trim().slice(0, 100),
        }).then(() => {})
      }
    } catch { /* silent */ }

    return data
  }

  const deleteComment = async (commentId: string) => {
    if (!user) return
    // Only the comment author or tree owner can delete
    const { error } = await supabase
      .from('tree_comments')
      .delete()
      .eq('id', commentId)
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
  }

  return { comments, loading, fetchComments, addComment, deleteComment }
}
