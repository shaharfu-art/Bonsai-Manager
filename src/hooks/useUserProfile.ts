import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export interface UserProfile {
  id: string
  role: 'admin' | 'user'
  max_trees: number
  max_photos_per_tree: number
  created_at: string
  updated_at: string
}

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data as UserProfile | null)
        setLoading(false)
      })
  }, [user])

  const isAdmin = profile?.role === 'admin'

  return { profile, loading, isAdmin }
}
