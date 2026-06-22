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
  /** Multiple photo IDs (up to 2) linked via photos.treatment_log_id */
  photo_ids: string[]
  status: 'pending' | 'completed'
  created_at: string
}

interface AddTreatmentInput {
  treatment_date: string
  treatment_type: string
  notes?: string
  photo_id?: string
  photo_ids?: string[]
  status?: 'pending' | 'completed'
}

interface UseTreatmentsResult {
  treatments: TreatmentLog[]
  loading: boolean
  error: string | null
  addTreatment: (input: AddTreatmentInput) => Promise<TreatmentLog>
  updateTreatment: (id: string, input: Partial<AddTreatmentInput>) => Promise<TreatmentLog>
  deleteTreatment: (id: string) => Promise<void>
  completeTreatment: (id: string) => Promise<TreatmentLog>
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

      // For each treatment, fetch linked photos via treatment_log_id
      const treatmentIds = (data ?? []).map((r: Record<string, unknown>) => r.id as string)
      const photosMap: Record<string, string[]> = {}

      if (treatmentIds.length > 0) {
        const { data: photoRows } = await supabase
          .from('photos')
          .select('id, treatment_log_id')
          .in('treatment_log_id', treatmentIds)

        if (photoRows) {
          for (const row of photoRows) {
            const tid = row.treatment_log_id as string
            if (!photosMap[tid]) photosMap[tid] = []
            photosMap[tid].push(row.id)
          }
        }
      }

      const enriched = (data ?? []).map((row: Record<string, unknown>) => {
        const tid = row.id as string
        const linkedPhotos = photosMap[tid] ?? []
        const legacyPhotoId = row.photo_id as string | null
        const allPhotoIds = legacyPhotoId && !linkedPhotos.includes(legacyPhotoId)
          ? [legacyPhotoId, ...linkedPhotos]
          : linkedPhotos.length > 0 ? linkedPhotos : (legacyPhotoId ? [legacyPhotoId] : [])
        return { ...row, photo_ids: allPhotoIds, status: (row.status as string) ?? 'completed' }
      }) as TreatmentLog[]

      // Sort: pending first, then by date descending
      enriched.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1
        return new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime()
      })

      setTreatments(enriched)
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

    const status = input.status ?? 'completed'
    const optimisticId = `temp-${Date.now()}`
    const optimistic: TreatmentLog = {
      id: optimisticId,
      tree_id: treeId,
      user_id: userData.user.id,
      treatment_date: input.treatment_date,
      treatment_type: input.treatment_type,
      notes: input.notes ?? null,
      photo_id: input.photo_id ?? null,
      photo_ids: input.photo_ids ?? (input.photo_id ? [input.photo_id] : []),
      status,
      created_at: new Date().toISOString(),
    }

    setTreatments(prev => {
      const updated = [optimistic, ...prev]
      updated.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1
        return new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime()
      })
      return updated
    })

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
          status,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const newTreatment = { ...(data as TreatmentLog), photo_ids: input.photo_ids ?? (input.photo_id ? [input.photo_id] : []) }
      setTreatments(prev => prev.map(t => t.id === optimisticId ? newTreatment : t))
      return newTreatment
    } catch (err) {
      setTreatments(prev => prev.filter(t => t.id !== optimisticId))
      throw err
    }
  }, [treeId])

  const completeTreatment = useCallback(async (id: string): Promise<TreatmentLog> => {
    const today = new Date().toISOString().split('T')[0]
    const previous = treatments.find(t => t.id === id)

    // Optimistic update
    setTreatments(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, status: 'completed' as const, treatment_date: today } : t)
      updated.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1
        return new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime()
      })
      return updated
    })

    try {
      const { data, error: updateError } = await supabase
        .from('treatment_logs')
        .update({ status: 'completed', treatment_date: today })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const completed = { ...(data as TreatmentLog), photo_ids: previous?.photo_ids ?? [] }

      // If there's a recurring alert config for this treatment type, create next pending
      if (previous) {
        const { data: configs } = await supabase
          .from('alert_configs')
          .select('*')
          .eq('tree_id', treeId)
          .eq('treatment_type', previous.treatment_type)
          .single()

        if (configs && configs.interval_days && configs.interval_days > 0) {
          const nextDate = new Date()
          nextDate.setDate(nextDate.getDate() + configs.interval_days)
          const nextDateStr = nextDate.toISOString().split('T')[0]

          const { data: userData } = await supabase.auth.getUser()
          if (userData.user) {
            const { data: newPending } = await supabase
              .from('treatment_logs')
              .insert({
                tree_id: treeId,
                user_id: userData.user.id,
                treatment_date: nextDateStr,
                treatment_type: previous.treatment_type,
                notes: null,
                photo_id: null,
                status: 'pending',
              })
              .select()
              .single()

            if (newPending) {
              const pendingTreatment = { ...(newPending as TreatmentLog), photo_ids: [] }
              setTreatments(prev => {
                const updated = [...prev.map(t => t.id === id ? completed : t), pendingTreatment]
                updated.sort((a, b) => {
                  if (a.status === 'pending' && b.status !== 'pending') return -1
                  if (a.status !== 'pending' && b.status === 'pending') return 1
                  return new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime()
                })
                return updated
              })
              return completed
            }
          }
        }
      }

      setTreatments(prev => prev.map(t => t.id === id ? completed : t))
      return completed
    } catch (err) {
      if (previous) {
        setTreatments(prev => prev.map(t => t.id === id ? previous : t))
      }
      throw err
    }
  }, [treatments, treeId])

  const updateTreatment = useCallback(async (id: string, input: Partial<AddTreatmentInput>): Promise<TreatmentLog> => {
    const previous = treatments.find(t => t.id === id)

    setTreatments(prev =>
      prev.map(t => t.id === id ? {
        ...t,
        ...input,
        notes: input.notes ?? t.notes,
        photo_id: input.photo_id ?? t.photo_id,
        photo_ids: input.photo_ids ?? t.photo_ids,
      } : t)
    )

    try {
      // Strip client-only fields before sending to DB
      const { photo_ids: _stripPhotoIds, ...dbInput } = input
      const { data, error: updateError } = await supabase
        .from('treatment_logs')
        .update(dbInput)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const updated = { ...(data as TreatmentLog), photo_ids: input.photo_ids ?? previous?.photo_ids ?? [] }
      setTreatments(prev => prev.map(t => t.id === id ? updated : t))
      return updated
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

  return { treatments, loading, error, addTreatment, updateTreatment, deleteTreatment, completeTreatment }
}
