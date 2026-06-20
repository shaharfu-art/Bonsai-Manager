import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export interface Tree {
  id: string
  user_id: string
  custom_name: string
  species_id: string | null
  species_free_text: string | null
  style: string | null
  age_years: number | null
  origin: string | null
  pot_type: string | null
  pot_size: string | null
  location: string | null
  date_added: string | null
  notes: string | null
  cover_photo_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateTreeInput {
  custom_name: string
  species_id?: string | null
  species_free_text?: string | null
  style?: string | null
  age_years?: number | null
  origin?: string | null
  pot_type?: string | null
  pot_size?: string | null
  location?: string | null
  date_added?: string | null
  notes?: string | null
}

export interface UpdateTreeInput extends Partial<CreateTreeInput> {
  id: string
}

interface UseTreesResult {
  trees: Tree[]
  loading: boolean
  error: string | null
  createTree: (input: CreateTreeInput) => Promise<Tree>
  updateTree: (input: UpdateTreeInput) => Promise<Tree>
  deleteTree: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useTrees(): UseTreesResult {
  const { user } = useAuth()
  const [trees, setTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrees = useCallback(async () => {
    if (!user) {
      setTrees([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('trees')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setTrees(data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trees')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTrees()
  }, [fetchTrees])

  const createTree = useCallback(async (input: CreateTreeInput): Promise<Tree> => {
    if (!user) throw new Error('Not authenticated')

    const newTree: CreateTreeInput & { user_id: string } = {
      ...input,
      user_id: user.id,
    }

    // Optimistic update placeholder
    const optimisticId = `temp-${Date.now()}`
    const optimisticTree: Tree = {
      id: optimisticId,
      user_id: user.id,
      custom_name: input.custom_name,
      species_id: input.species_id ?? null,
      species_free_text: input.species_free_text ?? null,
      style: input.style ?? null,
      age_years: input.age_years ?? null,
      origin: input.origin ?? null,
      pot_type: input.pot_type ?? null,
      pot_size: input.pot_size ?? null,
      location: input.location ?? null,
      date_added: input.date_added ?? null,
      notes: input.notes ?? null,
      cover_photo_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setTrees((prev) => [optimisticTree, ...prev])

    try {
      const { data, error: insertError } = await supabase
        .from('trees')
        .insert(newTree)
        .select()
        .single()

      if (insertError) throw insertError

      setTrees((prev) =>
        prev.map((t) => (t.id === optimisticId ? (data as Tree) : t))
      )
      return data as Tree
    } catch (err) {
      // Roll back optimistic update
      setTrees((prev) => prev.filter((t) => t.id !== optimisticId))
      throw err
    }
  }, [user])

  const updateTree = useCallback(async (input: UpdateTreeInput): Promise<Tree> => {
    const { id, ...fields } = input

    // Optimistic update
    setTrees((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...fields, updated_at: new Date().toISOString() } : t
      )
    )

    try {
      const { data, error: updateError } = await supabase
        .from('trees')
        .update(fields)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setTrees((prev) =>
        prev.map((t) => (t.id === id ? (data as Tree) : t))
      )
      return data as Tree
    } catch (err) {
      // Refetch to restore correct state
      await fetchTrees()
      throw err
    }
  }, [fetchTrees])

  const deleteTree = useCallback(async (id: string): Promise<void> => {
    // Optimistic delete
    setTrees((prev) => prev.filter((t) => t.id !== id))

    try {
      const { error: deleteError } = await supabase
        .from('trees')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    } catch (err) {
      // Restore on error
      await fetchTrees()
      throw err
    }
  }, [fetchTrees])

  return {
    trees,
    loading,
    error,
    createTree,
    updateTree,
    deleteTree,
    refetch: fetchTrees,
  }
}
