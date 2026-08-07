import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase-client'

interface Liker {
  user_id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

interface LikersListProps {
  treeId: string
  isRtl: boolean
}

/** Inline likers list (to be placed inside a popup container) */
export const LikersList: React.FC<LikersListProps> = ({ treeId, isRtl }) => {
  const [likers, setLikers] = useState<Liker[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchLikers = async () => {
      const { data } = await supabase
        .from('tree_likes')
        .select('user_id, created_at')
        .eq('tree_id', treeId)
        .order('created_at', { ascending: false })

      if (!data || data.length === 0) {
        setLikers([])
        setLoading(false)
        return
      }

      const userIds = data.map(l => l.user_id)
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds)

      const enriched: Liker[] = data.map(l => {
        const p = (profiles ?? []).find(pr => pr.id === l.user_id)
        return {
          user_id: l.user_id,
          display_name: p?.display_name ?? null,
          username: p?.username ?? null,
          avatar_url: p?.avatar_url ?? null,
        }
      })

      setLikers(enriched)
      setLoading(false)
    }

    fetchLikers()
  }, [treeId])

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (likers.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        {isRtl ? 'אין לייקים עדיין' : 'No likes yet'}
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {likers.map(liker => (
        <li key={liker.user_id}>
          <button
            onClick={() => navigate(`/user/${liker.user_id}`)}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors text-start"
          >
            {liker.avatar_url ? (
              <img
                src={liker.avatar_url}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-sm">
                🌱
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate">
                {liker.display_name || liker.username || (isRtl ? 'משתמש' : 'User')}
              </span>
              {liker.username && liker.display_name && (
                <span className="text-xs text-gray-400 truncate">@{liker.username}</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default LikersList
