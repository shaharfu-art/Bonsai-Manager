import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'

export interface TreatmentLog {
  id: string
  tree_id: string
  user_id: string
  treatment_date: string
  treatment_type: string
  notes: string | null
  photo_id: string | null
  created_at: string
}

interface AddTreatmentInput {
  treatment_date: string
  treatment_type: string
  notes?: string
  photo_id?: string
}

interface UseTreatmentsResult {
  treatments: TreatmentLog[]
  loading: boolean
  error: string | null
  addTreatment: (input: AddTreatmentInput) => Promise<TreatmentLog>
  updateTreatment: (id: string, input: Partial<AddTreatmentInput>) => Promise<TreatmentLog>
  deleteTreatment: (id: string) => Promise<void>
}

export function useTreatments(treeId: string): UseTreatmentsResult {
  const [treatments, setTreatments] = useState<TreatmentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTreatments = useCallback(async () => {
    if (!treeId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('treatment_logs')
        .select('*')
        .eq('tree_id', treeId)
        .order('treatment_date', { ascending: false })

      if (fetchError) throw fetchError
      setTreatments(data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch treatments')
    } finally {
      setLoading(false)
    }
  }, [treeId])

  useEffect(() => {
    fetchTreatments()
  }, [fetchTreatments])

  const addTreatment = useCallback(async (input: AddTreatmentInput): Promise<TreatmentLog> => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error('Not authenticated')

    const optimisticId = `temp-${Date.now()}`
    const optimistic: TreatmentLog = {
      id: optimisticId,
      tree_id: treeId,
      user_id: userData.user.id,
      treatment_date: input.treatment_date,
      treatment_type: input.treatment_type,
      notes: input.notes ?? null,
      photo_id: input.photo_id ?? null,
      created_at: new Date().toISOString(),
    }

    setTreatments(prev => [optimistic, ...prev])

    try {
      const { data, error: insertError } = await supabase
        .from('treatment_logs')
        .insert({
          tree_id: treeId,
          user_id: userData.user.id,
          treatment_date: input.treatment_date,
          treatment_type: input.treatment_type,
          notes: input.notes ?? null,
          photo_id: input.photo_id ?? null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setTreatments(prev => prev.map(t => t.id === optimisticId ? (data as TreatmentLog) : t))
      return data as TreatmentLog
    } catch (err) {
      setTreatments(prev => prev.filter(t => t.id !== optimisticId))
      throw err
    }
  }, [treeId])

  const updateTreatment = useCallback(async (id: string, input: Partial<AddTreatmentInput>): Promise<TreatmentLog> => {
    const previous = treatments.find(t => t.id === id)

    setTreatments(prev =>
      prev.map(t => t.id === id ? { ...t, ...input, notes: input.notes ?? t.notes, photo_id: input.photo_id ?? t.photo_id } : t)
    )

    try {
      const { data, error: updateError } = await supabase
        .from('treatment_logs')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setTreatments(prev => prev.map(t => t.id === id ? (data as TreatmentLog) : t))
      return data as TreatmentLog
    } catch (err) {
      if (previous) {
        setTreatments(prev => prev.map(t => t.id === id ? previous : t))
      }
      throw err
    }
  }, [treatments])

  const deleteTreatment = useCallback(async (id: string): Promise<void> => {
    const previous = treatments.find(t => t.id === id)
    setTreatments(prev => prev.filter(t => t.id !== id))

    try {
      const { error: deleteError } = await supabase
        .from('treatment_logs')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    } catch (err) {
      if (previous) {
        setTreatments(prev => [...prev, previous].sort(
          (a, b) => new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime()
        ))
      }
      throw err
    }
  }, [treatments])

  return { treatments, loading, error, addTreatment, updateTreatment, deleteTreatment }
}
