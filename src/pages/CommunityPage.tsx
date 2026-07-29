import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import UsernameDialog from '../components/UsernameDialog'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-client'
import { useFriends, usePeopleYouMayKnow } from '../hooks/useFriends'
import type { SuggestedUser } from '../hooks/useFriends'

const CommunityPage: React.FC = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'he'
  const { friends, pendingReceived, acceptRequest, rejectRequest, sendRequest } = useFriends()
  const { suggestions: peopleYouMayKnow, loading: suggestionsLoading } = usePeopleYouMayKnow()
  const { user } = useAuth()
  const [inviteCopied, setInviteCopied] = useState(false)
  const [showUsernameDialog, setShowUsernameDialog] = useState(false)
  const [hasUsername, setHasUsername] = useState<boolean | null>(null)

  // Check if user has a username
  useEffect(() => {
    if (!user) return
    supabase.from('user_profiles').select('username').eq('id', user.id).single()
      .then(({ data }) => {
        const has = !!(data?.username)
        setHasUsername(has)
        if (!has) setShowUsernameDialog(true)
      })
  }, [user])

  const handleInvite = async () => {
    const inviteUrl = `${window.location.origin}/invite/${user?.id ?? ''}`
    const shareData = {
      title: isRtl ? 'הצטרף לקהילת בונסאי YUTAKA' : 'Join YUTAKA Bonsai Community',
      text: isRtl ? 'בוא לשתף ולגלות עצי בונסאי!' : 'Come share and discover bonsai trees!',
      url: inviteUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(inviteUrl)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    }
  }

  return (
    <Layout>
      {/* Username dialog (shows if no username set) */}
      {showUsernameDialog && (
        <UsernameDialog onComplete={() => { setHasUsername(true); setShowUsernameDialog(false) }} />
      )}

      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#2d6a4f]">🌿 {isRtl ? 'קהילה' : 'Community'}</h1>
          <button
            onClick={handleInvite}
            className="text-xs bg-[#2d6a4f] hover:bg-[#245a42] text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            {inviteCopied
              ? (isRtl ? '✓ הועתק!' : '✓ Copied!')
              : (isRtl ? 'הזמן חבר 🔗' : 'Invite 🔗')
            }
          </button>
        </div>

        {/* Search */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">🔍 {isRtl ? 'חפש חבר' : 'Find a Friend'}</h2>
          <UserSearch isRtl={isRtl} />
        </div>

        {/* Pending friend requests */}
        {pendingReceived.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-700">🤝 {isRtl ? 'בקשות חברות' : 'Friend Requests'}</h2>
            {pendingReceived.map(req => (
              <div key={req.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2d6a4f] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {req.from_avatar_url ? (
                    <img src={req.from_avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (req.from_display_name ?? '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {req.from_display_name ?? (isRtl ? 'משתמש' : 'User')}
                  </p>
                  {req.from_username && <p className="text-xs text-gray-400">@{req.from_username}</p>}
                  <p className="text-[10px] text-amber-600 mt-0.5">{isRtl ? 'מבקש חברות' : 'Wants to be friends'}</p>
                </div>
                <button
                  onClick={() => acceptRequest(req.id, req.from_user_id)}
                  className="bg-[#2d6a4f] hover:bg-[#245a42] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {isRtl ? 'אשר ✓' : 'Accept'}
                </button>
                <button
                  onClick={() => rejectRequest(req.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">👥 {isRtl ? 'חברים' : 'Friends'} ({friends.length})</h2>
          <FriendsList friends={friends} isRtl={isRtl} />
        </div>

        {/* People You May Know */}
        <PeopleYouMayKnow suggestions={peopleYouMayKnow} loading={suggestionsLoading} isRtl={isRtl} onSendRequest={sendRequest} />
      </div>
    </Layout>
  )
}

// ─── FriendsList ───────────────────────────────────────────
const FriendsList: React.FC<{ friends: string[]; isRtl: boolean }> = ({ friends, isRtl }) => {
  const [profiles, setProfiles] = useState<Array<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }>>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (friends.length === 0) { setLoadingProfiles(false); return }
    supabase.from('user_profiles').select('id, display_name, username, avatar_url').in('id', friends)
      .then(({ data }) => { setProfiles(data ?? []); setLoadingProfiles(false) })
  }, [friends])

  if (loadingProfiles) {
    return <div className="space-y-2 animate-pulse">{[0, 1, 2].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}</div>
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-5xl block mb-3">👥</span>
        <p className="text-sm text-gray-500">{isRtl ? 'עדיין אין חברים. חפש וגלה אנשים!' : 'No friends yet. Search and discover people!'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {profiles.map(friend => (
        <button
          key={friend.id}
          onClick={() => navigate(`/user/${friend.id}`)}
          className="bg-white rounded-xl shadow p-3 flex items-center gap-3 w-full text-left hover:bg-green-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-[#2d6a4f] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              (friend.display_name ?? '?').charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{friend.display_name ?? (isRtl ? 'חבר' : 'Friend')}</p>
            {friend.username && <p className="text-xs text-gray-400">@{friend.username}</p>}
          </div>
          <span className="text-xs text-green-600 flex-shrink-0 mr-auto">✓ {isRtl ? 'חברים' : 'Friends'}</span>
        </button>
      ))}
    </div>
  )
}

// ─── UserSearch ────────────────────────────────────────────
const UserSearch: React.FC<{ isRtl: boolean }> = ({ isRtl }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null; email?: string | null }>>([])
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }

    setSearching(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const searchTerm = query.replace('@', '').toLowerCase()

      const { data } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, avatar_url, email')
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(8)

      setResults(data ?? [])
      setSearching(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  return (
    <div className="relative">
      <div className="relative">
        <svg className="absolute top-2.5 left-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={isRtl ? 'חפש לפי @username או שם...' : 'Search by @username or name...'}
          className="w-full border border-gray-300 rounded-xl py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] pl-9 pr-3"
          dir="ltr"
        />
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map(user => (
            <button
              key={user.id}
              onClick={() => { navigate(`/user/${user.id}`); setQuery(''); setResults([]) }}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-green-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#2d6a4f] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  (user.display_name ?? user.username ?? user.email ?? '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user.display_name ?? user.username ?? user.email ?? '—'}</p>
                {user.username && <p className="text-xs text-gray-400">@{user.username}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {searching && query.length >= 2 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-center">
          <span className="text-xs text-gray-400">{isRtl ? 'מחפש...' : 'Searching...'}</span>
        </div>
      )}

      {!searching && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-center">
          <span className="text-xs text-gray-400">{isRtl ? 'לא נמצאו תוצאות' : 'No results'}</span>
        </div>
      )}
    </div>
  )
}

// ─── PeopleYouMayKnow ────────────────────────────────────
interface PeopleYouMayKnowProps {
  suggestions: SuggestedUser[]
  loading: boolean
  isRtl: boolean
  onSendRequest: (userId: string) => void
}

const PeopleYouMayKnow: React.FC<PeopleYouMayKnowProps> = ({ suggestions, loading, isRtl, onSendRequest }) => {
  const navigate = useNavigate()
  const [sentIds, setSentIds] = useState<string[]>([])

  if (loading) return null
  if (suggestions.length === 0) return null

  const handleSendRequest = (userId: string) => {
    onSendRequest(userId)
    setSentIds(prev => [...prev, userId])
  }

  return (
    <div className="space-y-2 pt-4 border-t border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700">
        👥 {isRtl ? 'אנשים שאולי אתה מכיר' : 'People you may know'}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {suggestions.map(person => (
          <div
            key={person.id}
            className="flex-shrink-0 w-28 bg-white rounded-xl shadow p-3 flex flex-col items-center gap-2 text-center"
          >
            <button
              onClick={() => navigate(`/user/${person.id}`)}
              className="w-12 h-12 rounded-full bg-[#2d6a4f] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 hover:ring-2 hover:ring-[#2d6a4f]/30 transition-all"
            >
              {person.avatar_url ? (
                <img src={person.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                (person.display_name ?? '?').charAt(0).toUpperCase()
              )}
            </button>
            <p className="text-xs font-medium text-gray-800 truncate w-full">
              {person.display_name ?? person.username ?? (isRtl ? 'משתמש' : 'User')}
            </p>
            {sentIds.includes(person.id) ? (
              <span className="text-[10px] text-green-600 font-medium">
                {isRtl ? '✓ נשלח' : '✓ Sent'}
              </span>
            ) : (
              <button
                onClick={() => handleSendRequest(person.id)}
                className="text-[10px] bg-[#2d6a4f] hover:bg-[#245a42] text-white px-2 py-1 rounded-md transition-colors font-medium"
              >
                {isRtl ? 'הצע חברות' : 'Add Friend'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CommunityPage
