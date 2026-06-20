import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'

export interface Species {
  id: string
  name_he: string
  name_en: string
  name_latin: string | null
  type: string
  is_system: boolean
  created_at: string
}

interface UseSpeciesResult {
  species: Species[]
  loading: boolean
  error: string | null
  getSpeciesById: (id: string) => Species | undefined
  getSpeciesByName: (name: string) => Species | undefined
}

// Simple module-level cache so the species list is only fetched once per session
let cachedSpecies: Species[] | null = null

export function useSpecies(): UseSpeciesResult {
  const [species, setSpecies] = useState<Species[]>(cachedSpecies ?? [])
  const [loading, setLoading] = useState(cachedSpecies === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedSpecies !== null) {
      setSpecies(cachedSpecies)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('species')
      .select('id, name_he, name_en, name_latin, type, is_system, created_at')
      .order('name_en', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
        } else {
          cachedSpecies = (data ?? []) as Species[]
          setSpecies(cachedSpecies)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const getSpeciesById = useCallback(
    (id: string) => species.find((s) => s.id === id),
    [species]
  )

  const getSpeciesByName = useCallback(
    (name: string) =>
      species.find(
        (s) =>
          s.name_en.toLowerCase() === name.toLowerCase() ||
          s.name_he === name
      ),
    [species]
  )

  return { species, loading, error, getSpeciesById, getSpeciesByName }
}
