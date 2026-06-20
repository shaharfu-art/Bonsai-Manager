import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-client'

export interface AlertConfig {
  id: string
  tree_id: string
  user_id: string
  treatment_type: string
  interval_days: number | null
  is_manual_only: boolean
  snoozed_until: string | null
}

export function useAlertConfigs(treeId: string) {
  const [configs, setConfigs] = useState<AlertConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!treeId) return
    supabase
      .from('alert_configs')
      .select('*')
      .eq('tree_id', treeId)
      .then(({ data }) => {
        setConfigs(data ?? [])
        setLoading(false)
      })
  }, [treeId])

  const getConfig = useCallback((treatmentType: string) => {
    return configs.find(c => c.treatment_type === treatmentType) ?? null
  }, [configs])

  const setConfig = useCallback(async (treatmentType: string, intervalDays: number, fixedDate?: string | null) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const updatePayload = fixedDate
      ? { interval_days: null, snoozed_until: fixedDate, is_manual_only: false }
      : { interval_days: intervalDays, snoozed_until: null, is_manual_only: false }

    const existing = configs.find(c => c.treatment_type === treatmentType)
    if (existing) {
      const { data } = await supabase
        .from('alert_configs')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setConfigs(prev => prev.map(c => c.id === existing.id ? data as AlertConfig : c))
    } else {
      const { data } = await supabase
        .from('alert_configs')
        .insert({
          tree_id: treeId,
          user_id: userData.user.id,
          treatment_type: treatmentType,
          ...updatePayload,
        })
        .select()
        .single()
      if (data) setConfigs(prev => [...prev, data as AlertConfig])
    }
  }, [configs, treeId])

  const removeConfig = useCallback(async (treatmentType: string) => {
    const existing = configs.find(c => c.treatment_type === treatmentType)
    if (!existing) return
    await supabase.from('alert_configs').delete().eq('id', existing.id)
    setConfigs(prev => prev.filter(c => c.treatment_type !== treatmentType))
  }, [configs])

  return { configs, loading, getConfig, setConfig, removeConfig }
}
