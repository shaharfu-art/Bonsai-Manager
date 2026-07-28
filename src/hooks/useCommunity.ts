import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export interface CommunityPost {
  id: string
  user_id: string
  tree_id: string | null
  photo_id: string | null
  text: string | null
  likes_count: number
  comments_count: number
  created_at: string
  // Joined data
  user_display_name: string | null
  user_avatar_url: string | null
  tree_name: string | null
  tree_species: string | null
  tree_age_years: number | null
  tree_style: string | null
  tree_location: string | null
  tree_photos: string[]
  photo_url: string | null
  liked_by_me: boolean
}

export interface CommunityComment {
  id: string
  post_id: string
  user_id: string
  text: string
  likes_count: number
  created_at: string
  user_display_name: string | null
  user_avatar_url: string | null
  liked_by_me: boolean
}

export function useCommunityFeed(mode: 'explore' | 'following' = 'explore') {
  const { user } = useAuth()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (mode === 'following') {
        // Get list of users I follow
        const { data: follows } = await supabase
          .from('community_follows')
          .select('following_id')
          .eq('follower_id', user.id)
        
        const followingIds = (follows ?? []).map(f => f.following_id)
        if (followingIds.length === 0) {
          setPosts([])
          setLoading(false)
          return
        }
        query = query.in('user_id', followingIds)
      }

      const { data: rawPosts, error: fetchErr } = await query
      if (fetchErr) throw fetchErr

      if (!rawPosts || rawPosts.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      // Get unique user IDs and tree IDs
      const userIds = [...new Set(rawPosts.map(p => p.user_id))]
      const treeIds = [...new Set(rawPosts.filter(p => p.tree_id).map(p => p.tree_id!))]
      const photoIds = [...new Set(rawPosts.filter(p => p.photo_id).map(p => p.photo_id!))]

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds)

      // Fetch trees
      let treesMap: Record<string, { custom_name: string; species_free_text: string | null; age_years: number | null; style: string | null; location: string | null }> = {}
      if (treeIds.length > 0) {
        const { data: trees } = await supabase
          .from('trees')
          .select('id, custom_name, species_free_text, age_years, style, location')
          .in('id', treeIds)
        for (const t of trees ?? []) {
          treesMap[t.id] = { custom_name: t.custom_name, species_free_text: t.species_free_text, age_years: t.age_years, style: t.style, location: t.location }
        }
      }

      // Fetch ALL photos for each tree (for carousel)
      let treePhotosMap: Record<string, string[]> = {}
      if (treeIds.length > 0) {
        const { data: treePhotos } = await supabase
          .from('photos')
          .select('id, tree_id, storage_path')
          .in('tree_id', treeIds)
          .order('created_at', { ascending: false })

        if (treePhotos && treePhotos.length > 0) {
          // Sign all photo URLs
          for (const photo of treePhotos) {
            const { data: signed } = await supabase.storage
              .from('bonsai-photos')
              .createSignedUrl(photo.storage_path, 86400)
            if (signed?.signedUrl) {
              if (!treePhotosMap[photo.tree_id]) treePhotosMap[photo.tree_id] = []
              treePhotosMap[photo.tree_id].push(signed.signedUrl)
            }
          }
        }
      }

      // Fetch photo URLs
      let photosMap: Record<string, string> = {}
      if (photoIds.length > 0) {
        const { data: photos } = await supabase
          .from('photos')
          .select('id, storage_path')
          .in('id', photoIds)
        
        for (const photo of photos ?? []) {
          const { data: signed } = await supabase.storage
            .from('bonsai-photos')
            .createSignedUrl(photo.storage_path, 86400)
          if (signed?.signedUrl) photosMap[photo.id] = signed.signedUrl
        }
      }

      // Check which posts I liked
      const { data: myLikes } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', rawPosts.map(p => p.id))
      
      const likedPostIds = new Set((myLikes ?? []).map(l => l.post_id))

      // Enrich posts
      const enriched: CommunityPost[] = rawPosts.map(post => {
        const profile = (profiles ?? []).find(p => p.id === post.user_id)
        const tree = post.tree_id ? treesMap[post.tree_id] : null
        return {
          ...post,
          user_display_name: profile?.display_name ?? profile?.username ?? null,
          user_avatar_url: profile?.avatar_url ?? null,
          tree_name: tree?.custom_name ?? null,
          tree_species: tree?.species_free_text ?? null,
          tree_age_years: tree?.age_years ?? null,
          tree_style: tree?.style ?? null,
          tree_location: tree?.location ?? null,
          tree_photos: post.tree_id ? (treePhotosMap[post.tree_id] ?? []) : [],
          photo_url: post.photo_id ? photosMap[post.photo_id] ?? null : null,
          liked_by_me: likedPostIds.has(post.id),
        }
      })

      setPosts(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [user, mode])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const toggleLike = async (postId: string) => {
    if (!user) return
    const post = posts.find(p => p.id === postId)
    if (!post) return

    if (post.liked_by_me) {
      // Unlike
      await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      await supabase.from('community_posts').update({ likes_count: Math.max(0, post.likes_count - 1) }).eq('id', postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: false, likes_count: Math.max(0, p.likes_count - 1) } : p))
    } else {
      // Like
      await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id })
      await supabase.from('community_posts').update({ likes_count: post.likes_count + 1 }).eq('id', postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: true, likes_count: p.likes_count + 1 } : p))
    }
  }

  return { posts, loading, error, refetch: fetchPosts, toggleLike }
}

export function useCommunityPost() {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const createPost = async (opts: { treeId: string; photoId?: string; text?: string }) => {
    if (!user) throw new Error('Not authenticated')
    setSubmitting(true)
    try {
      // Mark tree as public
      await supabase.from('trees').update({ is_public: true }).eq('id', opts.treeId)

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          tree_id: opts.treeId,
          photo_id: opts.photoId ?? null,
          text: opts.text ?? null,
        })
        .select()
        .single()

      if (error) throw error

      // Notify friends about the new shared tree (push notification)
      try {
        const { data: treeData } = await supabase
          .from('trees')
          .select('custom_name')
          .eq('id', opts.treeId)
          .single()

        const treeName = treeData?.custom_name ?? ''

        const { data: { session } } = await supabase.auth.getSession()
        if (session && treeName) {
          const url = (import.meta as any).env?.VITE_SUPABASE_URL ?? ''
          if (url) {
            fetch(`${url}/functions/v1/community-notify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '',
              },
              body: JSON.stringify({ user_id: user.id, tree_name: treeName }),
            }).catch(() => { /* silent — push is optional */ })
          }
        }
      } catch { /* ignore — notification is best-effort */ }

      return data
    } finally {
      setSubmitting(false)
    }
  }

  return { createPost, submitting }
}

// ─── Comments Hook ──────────────────────────────────────────
export function useComments(postId: string) {
  const { user } = useAuth()
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchComments = useCallback(async () => {
    if (!postId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        setComments([])
        setLoading(false)
        return
      }

      // Fetch user profiles for comments
      const userIds = [...new Set(data.map(c => c.user_id))]
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds)

      // Check which comments current user liked
      let likedCommentIds = new Set<string>()
      if (user) {
        const { data: myCommentLikes } = await supabase
          .from('community_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', data.map(c => c.id))
        likedCommentIds = new Set((myCommentLikes ?? []).map(l => l.comment_id))
      }

      const enriched: CommunityComment[] = data.map(comment => {
        const profile = (profiles ?? []).find(p => p.id === comment.user_id)
        return {
          ...comment,
          likes_count: comment.likes_count ?? 0,
          user_display_name: profile?.display_name ?? profile?.username ?? null,
          user_avatar_url: profile?.avatar_url ?? null,
          liked_by_me: likedCommentIds.has(comment.id),
        }
      })

      setComments(enriched)
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [postId, user])

  const addComment = async (text: string) => {
    if (!user || !postId || !text.trim()) return
    const { data, error } = await supabase
      .from('community_comments')
      .insert({ post_id: postId, user_id: user.id, text: text.trim() })
      .select()
      .single()

    if (error) throw error

    // Update post comments_count
    await supabase.rpc('increment_comments_count', { p_post_id: postId }).catch(() => {
      // Fallback: manual increment
      supabase.from('community_posts')
        .select('comments_count')
        .eq('id', postId)
        .single()
        .then(({ data: post }) => {
          if (post) {
            supabase.from('community_posts')
              .update({ comments_count: (post.comments_count ?? 0) + 1 })
              .eq('id', postId)
          }
        })
    })

    // Add to local state
    const newComment: CommunityComment = {
      ...data,
      likes_count: 0,
      user_display_name: null,
      user_avatar_url: null,
      liked_by_me: false,
    }
    // Get current user's profile info
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()
    
    if (myProfile) {
      newComment.user_display_name = myProfile.display_name
      newComment.user_avatar_url = myProfile.avatar_url
    }

    setComments(prev => [...prev, newComment])
    return data
  }

  const toggleCommentLike = async (commentId: string) => {
    if (!user) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return

    if (comment.liked_by_me) {
      // Unlike
      await supabase.from('community_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
      await supabase.from('community_comments').update({ likes_count: Math.max(0, comment.likes_count - 1) }).eq('id', commentId)
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, liked_by_me: false, likes_count: Math.max(0, c.likes_count - 1) } : c))
    } else {
      // Like
      await supabase.from('community_comment_likes').insert({ comment_id: commentId, user_id: user.id })
      await supabase.from('community_comments').update({ likes_count: comment.likes_count + 1 }).eq('id', commentId)
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, liked_by_me: true, likes_count: c.likes_count + 1 } : c))
    }
  }

  return { comments, loading, fetchComments, addComment, toggleCommentLike }
}

// ─── Follows Hook ───────────────────────────────────────────
export function useFollows() {
  const { user } = useAuth()
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchFollowing = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('community_follows')
        .select('following_id')
        .eq('follower_id', user.id)
      
      setFollowingIds(new Set((data ?? []).map(f => f.following_id)))
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchFollowing()
  }, [fetchFollowing])

  const isFollowing = (userId: string): boolean => {
    return followingIds.has(userId)
  }

  const followUser = async (targetUserId: string) => {
    if (!user || targetUserId === user.id) return
    await supabase.from('community_follows').insert({
      follower_id: user.id,
      following_id: targetUserId,
    })
    setFollowingIds(prev => new Set([...prev, targetUserId]))
  }

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return
    await supabase.from('community_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
    setFollowingIds(prev => {
      const next = new Set(prev)
      next.delete(targetUserId)
      return next
    })
  }

  const getFollowersCount = async (userId: string): Promise<number> => {
    const { count } = await supabase
      .from('community_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
    return count ?? 0
  }

  const getFollowingCount = async (userId: string): Promise<number> => {
    const { count } = await supabase
      .from('community_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)
    return count ?? 0
  }

  return { followingIds, loading, isFollowing, followUser, unfollowUser, getFollowersCount, getFollowingCount, refetch: fetchFollowing }
}
