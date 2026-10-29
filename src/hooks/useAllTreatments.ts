import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export interface CalendarTreatment {
  id: string
  tree_id: string
  tree_name: string
  treatment_date: string
  treatment_type: string
  notes: string | null
  status: 'pending' | 'completed'
}

interface UseAllTreatmentsResult {
  treatments: CalendarTreatment[]
  loading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetches ALL treatment logs for the current user across every tree.
 * Used by the calendar view. Read-only.
 */
export function useAllTreatments(): UseAllTreatmentsResult {
  const { user } = useAuth()
  const [treatments, setTreatments] = useState<CalendarTreatment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      // Fetch all trees for this user to map names
      const { data: trees, error: treesErr } = await supabase
        .from('trees')
        .select('id, custom_name, species_free_text')
        .eq('user_id', user.id)

      if (treesErr) throw treesErr

      const treeNameMap = new Map<string, string>(
        (trees ?? []).map(t => [
          t.id as string,
          (t.custom_name as string) || (t.species_free_text as string) || '',
        ])
      )

      const treeIds = (trees ?? []).map(t => t.id as string)
      if (treeIds.length === 0) {
        setTreatments([])
        setLoading(false)
        return
      }

      // Fetch all treatment logs across those trees
      const { data: logs, error: logsErr } = await supabase
        .from('treatment_logs')
        .select('id, tree_id, treatment_date, treatment_type, notes, status')
        .in('tree_id', treeIds)
        .order('treatment_date', { ascending: true })

      if (logsErr) throw logsErr

      const mapped: CalendarTreatment[] = (logs ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        tree_id: row.tree_id as string,
        tree_name: treeNameMap.get(row.tree_id as string) ?? '',
        treatment_date: row.treatment_date as string,
        treatment_type: row.treatment_type as string,
        notes: (row.notes as string) ?? null,
        status: ((row.status as string) ?? 'completed') as 'pending' | 'completed',
      }))

      setTreatments(mapped)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch treatments')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { treatments, loading, error, refresh: fetchAll }
}
