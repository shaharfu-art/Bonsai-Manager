import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

interface Announcement {
  id: string
  title: string
  body: string
  type: 'info' | 'warning' | 'success'
  target: 'all' | 'free' | 'premium' | 'specific'
  target_users: string[]
  created_at: string
}

const DISMISSED_KEY = 'dismissed-announcements'

const AnnouncementBanner: React.FC = () => {
  const { user } = useAuth()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchAnnouncement = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!data || data.length === 0) return

      // Filter by target
      const dismissed = (() => {
        try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]') }
        catch { return [] }
      })()

      // TODO: get user role from profile for 'free'/'premium' targeting
      const applicable = data.find((a: Announcement) => {
        if (dismissed.includes(a.id)) return false
        if (a.target === 'all') return true
        if (a.target === 'specific') return a.target_users?.includes(user.id)
        // For free/premium, show to all for now (until subscription is implemented)
        return true
      })

      if (applicable) setAnnouncement(applicable as Announcement)
    }

    fetchAnnouncement()
  }, [user])

  const handleDismiss = () => {
    if (!announcement) return
    try {
      const dismissed = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')
      dismissed.push(announcement.id)
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
    } catch { /* ignore */ }
    setAnnouncement(null)
  }

  if (!announcement) return null

  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  }

  const icons = { info: 'ℹ️', warning: '⚠️', success: '✅' }

  return (
    <div className={`${colors[announcement.type]} border rounded-xl p-4 relative`}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 left-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
        aria-label="dismiss"
      >
        ×
      </button>
      <div className="flex items-start gap-2 pr-2">
        <span className="text-lg flex-shrink-0">{icons[announcement.type]}</span>
        <div>
          <p className="text-sm font-semibold">{announcement.title}</p>
          <p className="text-xs mt-0.5 opacity-80">{announcement.body}</p>
        </div>
      </div>
    </div>
  )
}

export default AnnouncementBanner
