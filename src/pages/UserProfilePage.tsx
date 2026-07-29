import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'
import { useFriends } from '../hooks/useFriends'
import { useUserLevel } from '../hooks/useUserLevel'
import AvatarPicker, { renderAvatar } from '../components/AvatarPicker'

interface UserProfile {
  id: string
  display_name: string | null
  username: string | null
  bio: string | null
  avatar_url: string | null
  is_public: boolean
}

interface PublicTree {
  id: string
  custom_name: string
  species_free_text: string | null
  cover_photo_url: string | null
  age_years: number | null
  style: string | null
  location: string | null
  likes_count: number
}

const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'he'
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFriend, hasPendingSent, sendRequest, removeFriend, cancelRequest } = useFriends()
  const { level } = useUserLevel(id)

  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [trees, setTrees] = useState<PublicTree[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [totalTreesCount, setTotalTreesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isOwnProfile = user?.id === id

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    const fetchProfile = async () => {
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, display_name, bio, avatar_url, is_public')
          .eq('id', id)
          .single()

        if (profileError) throw profileError
        setProfile(profileData)

        // Fetch trees (all for own profile or friends, public only for others)
        let treesQuery = supabase
          .from('trees')
          .select('id, custom_name, species_free_text, cover_photo_id, age_years, style, location, likes_count')
          .eq('user_id', id)

        if (id !== user?.id) {
          // Check if we're friends — if so show all, otherwise public only
          const { data: friendCheck } = await supabase
            .from('friend_requests')
            .select('id')
            .eq('status', 'accepted')
            .or(`and(from_user_id.eq.${user?.id},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${user?.id})`)
            .limit(1)

          if (!friendCheck || friendCheck.length === 0) {
            treesQuery = treesQuery.eq('is_public', true)
          }
        }

        const { data: treesData } = await treesQuery

        // Count ALL trees for stats (regardless of public/friends status)
        const { count: allTreesCount } = await supabase
          .from('trees')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', id)
        setTotalTreesCount(allTreesCount ?? 0)

        // Get cover photo URLs for trees
        const treesWithPhotos: PublicTree[] = []
        for (const tree of treesData ?? []) {
          let coverUrl: string | null = null
          if (tree.cover_photo_id) {
            const { data: photo } = await supabase
              .from('photos')
              .select('storage_path')
              .eq('id', tree.cover_photo_id)
              .single()
            if (photo) {
              const { data: signed } = await supabase.storage
                .from('bonsai-photos')
                .createSignedUrl(photo.storage_path, 86400)
              if (signed?.signedUrl) coverUrl = signed.signedUrl
            }
          }
          // If no cover_photo_id, try to get the first photo marked as cover
          if (!coverUrl) {
            const { data: coverPhotos } = await supabase
              .from('photos')
              .select('storage_path')
              .eq('tree_id', tree.id)
              .eq('is_cover', true)
              .limit(1)
            if (coverPhotos && coverPhotos.length > 0) {
              const { data: signed } = await supabase.storage
                .from('bonsai-photos')
                .createSignedUrl(coverPhotos[0].storage_path, 86400)
              if (signed?.signedUrl) coverUrl = signed.signedUrl
            }
          }
          treesWithPhotos.push({
            id: tree.id,
            custom_name: tree.custom_name,
            species_free_text: tree.species_free_text,
            cover_photo_url: coverUrl,
            age_years: tree.age_years ?? null,
            style: tree.style ?? null,
            location: tree.location ?? null,
            likes_count: tree.likes_count ?? 0,
          })
        }
        setTrees(treesWithPhotos)

        // Fetch friends count (accepted requests in both directions)
        const { count: friendsCount } = await supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .or(`from_user_id.eq.${id},to_user_id.eq.${id}`)
        setFollowersCount(friendsCount ?? 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : (isRtl ? 'שגיאה בטעינה' : 'Failed to load'))
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [id, isRtl])

  const handleFriendAction = async () => {
    if (!id) return
    if (isFriend(id)) {
      await removeFriend(id)
      setFollowersCount(prev => Math.max(0, prev - 1))
    } else if (hasPendingSent(id)) {
      // Cancel pending request
      await cancelRequest(id)
    } else {
      await sendRequest(id)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="flex items-center gap-4 p-6 bg-white rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-gray-200" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-48" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-32 bg-gray-100 rounded-xl" />
            <div className="h-32 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-red-600 text-sm mb-4">{error || (isRtl ? 'משתמש לא נמצא' : 'User not found')}</p>
          <button onClick={() => navigate('/community')} className="text-[#2d6a4f] hover:underline text-sm">
            ← {isRtl ? 'חזרה לקהילה' : 'Back to Community'}
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Profile header */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {isOwnProfile ? (
                <button onClick={() => setShowAvatarPicker(true)} className="w-16 h-16 rounded-full flex-shrink-0 relative group">
                  {renderAvatar(profile.avatar_url, profile.display_name, 'w-16 h-16', 'text-xl')}
                  <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm">📷</span>
                  </div>
                </button>
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#2d6a4f] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (profile.display_name ?? '?').charAt(0).toUpperCase()
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {level && <span className="mr-1">{level.icon}</span>}
                {profile.display_name ?? (isRtl ? 'משתמש' : 'User')}
              </h1>
              {profile.username && (
                <p className="text-xs text-gray-400">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="text-sm text-gray-600 mt-0.5">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-[#2d6a4f]">{totalTreesCount}</p>
              <p className="text-[11px] text-gray-500">{isRtl ? 'עצים' : 'Trees'}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#2d6a4f]">{followersCount}</p>
              <p className="text-[11px] text-gray-500">{isRtl ? 'חברים' : 'Friends'}</p>
            </div>
            {/* Friend action button */}
            {!isOwnProfile && (
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleFriendAction}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isFriend(id!)
                      ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
                      : hasPendingSent(id!)
                      ? 'bg-amber-50 text-amber-600 hover:bg-red-50 hover:text-red-500'
                      : 'bg-[#2d6a4f] text-white hover:bg-[#245a42]'
                  }`}
                >
                  {isFriend(id!)
                    ? (isRtl ? 'חברים ✓' : 'Friends ✓')
                    : hasPendingSent(id!)
                    ? (isRtl ? 'ממתין לאישור ⏳' : 'Pending ⏳')
                    : (isRtl ? 'הצע חברות 🤝' : 'Add Friend 🤝')
                  }
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trees — only visible to friends or self */}
        {(isOwnProfile || isFriend(id!)) ? (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              🌳 {isRtl ? 'העצים' : 'Trees'} ({trees.length})
            </h2>
            {trees.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <p className="text-sm text-gray-400">
                  {isRtl ? 'אין עצים עדיין' : 'No trees yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {trees.map(tree => (
                  <FriendTreeCard key={tree.id} tree={tree} isRtl={isRtl} userId={user?.id ?? null} treeOwnerId={id!} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <span className="text-3xl block mb-2">🔒</span>
            <p className="text-sm text-gray-500">
              {isRtl ? 'הוסף כחבר כדי לראות את העצים' : 'Add as friend to see their trees'}
            </p>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate('/community')}
          className="text-sm text-[#2d6a4f] hover:underline"
        >
          ← {isRtl ? 'חזרה לקהילה' : 'Back to Community'}
        </button>

        {/* Avatar picker (own profile only) */}
        {showAvatarPicker && isOwnProfile && (
          <AvatarPicker
            currentAvatarUrl={profile.avatar_url}
            onUpdate={(url) => { setProfile(prev => prev ? { ...prev, avatar_url: url } : prev); setShowAvatarPicker(false) }}
            onClose={() => setShowAvatarPicker(false)}
          />
        )}
      </div>
    </Layout>
  )
}

// ─── FriendTreeCard (with ID card info + likes/comments + lightbox) ───
const FriendTreeCard: React.FC<{ tree: PublicTree; isRtl: boolean; userId: string | null; treeOwnerId: string }> = ({ tree, isRtl, userId, treeOwnerId }) => {
  const [likes, setLikes] = useState(tree.likes_count)
  const [likedByMe, setLikedByMe] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentsCount, setCommentsCount] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('tree_likes').select('tree_id').eq('tree_id', tree.id).eq('user_id', userId).maybeSingle()
      .then(({ data }) => setLikedByMe(!!data))
    supabase.from('tree_comments').select('*', { count: 'exact', head: true }).eq('tree_id', tree.id)
      .then(({ count }) => setCommentsCount(count ?? 0))
  }, [tree.id, userId])

  const handleToggleLike = async () => {
    if (!userId) return
    if (likedByMe) {
      await supabase.from('tree_likes').delete().eq('tree_id', tree.id).eq('user_id', userId)
      await supabase.from('trees').update({ likes_count: Math.max(0, likes - 1) }).eq('id', tree.id)
      setLikes(prev => Math.max(0, prev - 1))
      setLikedByMe(false)
    } else {
      await supabase.from('tree_likes').insert({ tree_id: tree.id, user_id: userId })
      await supabase.from('trees').update({ likes_count: likes + 1 }).eq('id', tree.id)
      setLikes(prev => prev + 1)
      setLikedByMe(true)
      if (treeOwnerId !== userId) {
        supabase.from('notifications').insert({ user_id: treeOwnerId, type: 'like', from_user_id: userId, tree_id: tree.id }).then(() => {})
      }
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {/* Photo */}
        <div
          className="aspect-[4/3] bg-gray-100 relative cursor-pointer"
          onDoubleClick={() => tree.cover_photo_url && setLightboxOpen(true)}
        >
          {tree.cover_photo_url ? (
            <img src={tree.cover_photo_url} alt={tree.custom_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">🌳</div>
          )}
        </div>

        {/* Tree info (ID card) */}
        <div className="p-4 space-y-2">
          <h3 className="text-base font-bold text-[#2d6a4f]">🪪 {tree.custom_name}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {tree.species_free_text && <span className="text-xs text-gray-600">🌳 {tree.species_free_text}</span>}
            {tree.age_years && <span className="text-xs text-gray-600">🗓️ {tree.age_years} {isRtl ? 'שנים' : 'yrs'}</span>}
            {tree.style && <span className="text-xs text-gray-600">✨ {tree.style}</span>}
            {tree.location && <span className="text-xs text-gray-600">📍 {tree.location}</span>}
          </div>

          {/* Likes + Comments */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1 text-sm font-medium transition-colors ${likedByMe ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
            >
              {likedByMe ? '❤️' : '🤍'} {likes > 0 && likes}
            </button>
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-[#2d6a4f] transition-colors"
            >
              💬 {commentsCount > 0 && commentsCount}
            </button>
          </div>
        </div>
      </div>

      {/* Comments popup */}
      {showComments && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4" onClick={() => setShowComments(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">💬 {isRtl ? 'תגובות' : 'Comments'} — {tree.custom_name}</h3>
              <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <InlineComments treeId={tree.id} isRtl={isRtl} onCountChange={setCommentsCount} treeOwnerId={treeOwnerId} />
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && tree.cover_photo_url && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <img src={tree.cover_photo_url} alt={tree.custom_name} className="max-w-full max-h-full object-contain" />
          <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-white text-2xl bg-black/50 w-10 h-10 rounded-full flex items-center justify-center">×</button>
        </div>
      )}
    </>
  )
}

// ─── InlineComments (for friend tree card popup) ────────
const InlineComments: React.FC<{ treeId: string; isRtl: boolean; onCountChange?: (c: number) => void; treeOwnerId?: string }> = ({ treeId, isRtl, onCountChange, treeOwnerId }) => {
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; text: string; created_at: string; name: string | null; avatar: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [longPressId, setLongPressId] = useState<string | null>(null)
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    supabase.from('tree_comments').select('*').eq('tree_id', treeId).order('created_at', { ascending: true })
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setComments([]); setLoading(false); return }
        const userIds = [...new Set(data.map(c => c.user_id))]
        const { data: profiles } = await supabase.from('user_profiles').select('id, display_name, username, avatar_url').in('id', userIds)
        setComments(data.map(c => {
          const p = (profiles ?? []).find(pr => pr.id === c.user_id)
          return { ...c, name: p?.display_name ?? p?.username ?? null, avatar: p?.avatar_url ?? null }
        }))
        setLoading(false)
      })
  }, [treeId])

  useEffect(() => { if (onCountChange) onCountChange(comments.length) }, [comments.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return
    setSubmitting(true)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setSubmitting(false); return }

    const { data } = await supabase.from('tree_comments').insert({ tree_id: treeId, user_id: userData.user.id, text: newComment.trim() }).select().single()
    if (data) {
      const { data: myProfile } = await supabase.from('user_profiles').select('display_name, username, avatar_url').eq('id', userData.user.id).single()
      setComments(prev => [...prev, { ...data, name: myProfile?.display_name ?? myProfile?.username ?? null, avatar: myProfile?.avatar_url ?? null }])
    }
    setNewComment('')
    setSubmitting(false)
  }

  const handleLongPressStart = (commentId: string, commentUserId: string) => {
    if (user?.id !== commentUserId && user?.id !== treeOwnerId) return
    longPressTimer.current = setTimeout(() => setLongPressId(commentId), 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  const handleDelete = async (commentId: string) => {
    await supabase.from('tree_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
    setLongPressId(null)
  }

  if (loading) return <div className="animate-pulse h-10 bg-gray-100 rounded" />

  return (
    <div className="space-y-3">
      {comments.length === 0 && <p className="text-xs text-gray-400 text-center">{isRtl ? 'אין תגובות' : 'No comments'}</p>}
      {comments.map(c => (
        <div
          key={c.id}
          className="flex items-start gap-2 relative"
          onTouchStart={() => handleLongPressStart(c.id, c.user_id)}
          onTouchEnd={handleLongPressEnd}
          onTouchCancel={handleLongPressEnd}
          onContextMenu={(e) => { if (user?.id === c.user_id || user?.id === treeOwnerId) { e.preventDefault(); setLongPressId(c.id) } }}
        >
          <button
            onClick={() => navigate(`/user/${c.user_id}`)}
            className="w-6 h-6 rounded-full bg-[#2d6a4f] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
          >
            {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : (c.name ?? '?').charAt(0).toUpperCase()}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs"><span className="font-medium text-gray-800">{c.name ?? (isRtl ? 'משתמש' : 'User')}</span></p>
            <p className="text-xs text-gray-600">{c.text}</p>
          </div>
          {/* Delete popup */}
          {longPressId === c.id && (
            <div className="absolute top-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 px-1">
              <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors">
                🗑️ {isRtl ? 'מחק' : 'Delete'}
              </button>
              <button onClick={() => setLongPressId(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 rounded transition-colors">
                ✕ {isRtl ? 'ביטול' : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      ))}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={isRtl ? 'הוסף תגובה...' : 'Add comment...'} className="flex-1 border border-gray-200 rounded-full px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#2d6a4f]/30" maxLength={300} />
        <button type="submit" disabled={!newComment.trim() || submitting} className="bg-[#2d6a4f] text-white text-xs px-3 py-1.5 rounded-full disabled:opacity-40">{isRtl ? 'שלח' : 'Send'}</button>
      </form>
    </div>
  )
}

export default UserProfilePage
