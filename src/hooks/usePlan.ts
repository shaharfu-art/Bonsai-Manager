import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

export type PlanType = 'free' | 'premium' | 'pro'

export interface PlanInfo {
  plan: PlanType
  maxTrees: number
  planExpiresAt: string | null
  loading: boolean
}

// Plan limits
export const PLAN_LIMITS: Record<PlanType, { maxTrees: number; aiDailyLimit: number }> = {
  free: { maxTrees: 3, aiDailyLimit: 2 },
  premium: { maxTrees: 15, aiDailyLimit: Infinity },
  pro: { maxTrees: 9999, aiDailyLimit: Infinity },
}

// Plan pricing (for display only)
export const PLAN_PRICING = {
  premium: { monthly: 9.90, yearly: 99 },
  pro: { monthly: 16.90, yearly: 169 },
}

const AI_COUNTER_KEY = 'ai-daily-count'

export function usePlan(): PlanInfo {
  const { user } = useAuth()
  const [plan, setPlan] = useState<PlanType>('free')
  const [maxTrees, setMaxTrees] = useState(3)
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    supabase
      .from('user_profiles')
      .select('plan, max_trees, plan_expires_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          // Check if plan expired
          const expired = data.plan_expires_at && new Date(data.plan_expires_at) < new Date()
          if (expired) {
            setPlan('free')
            setMaxTrees(PLAN_LIMITS.free.maxTrees)
          } else {
            const userPlan = (data.plan as PlanType) || 'free'
            setPlan(userPlan)
            setMaxTrees(data.max_trees || PLAN_LIMITS[userPlan].maxTrees)
            setPlanExpiresAt(data.plan_expires_at)
          }
        }
        setLoading(false)
      })
  }, [user])

  return { plan, maxTrees, planExpiresAt, loading }
}

// Check if user can use AI today
export function canUseAI(plan: PlanType): boolean {
  const limit = PLAN_LIMITS[plan].aiDailyLimit
  if (limit === Infinity) return true
  const today = new Date().toISOString().split('T')[0]
  try {
    const stored = JSON.parse(localStorage.getItem(AI_COUNTER_KEY) || '{}')
    if (stored.date !== today) return true
    return (stored.count || 0) < limit
  } catch { return true }
}

// Increment AI usage counter
export function incrementAIUsage(): void {
  const today = new Date().toISOString().split('T')[0]
  try {
    const stored = JSON.parse(localStorage.getItem(AI_COUNTER_KEY) || '{}')
    if (stored.date !== today) {
      localStorage.setItem(AI_COUNTER_KEY, JSON.stringify({ date: today, count: 1 }))
    } else {
      localStorage.setItem(AI_COUNTER_KEY, JSON.stringify({ date: today, count: (stored.count || 0) + 1 }))
    }
  } catch { /* ignore */ }
}

export function getAIUsageRemaining(plan: PlanType): number {
  const limit = PLAN_LIMITS[plan].aiDailyLimit
  if (limit === Infinity) return Infinity
  const today = new Date().toISOString().split('T')[0]
  try {
    const stored = JSON.parse(localStorage.getItem(AI_COUNTER_KEY) || '{}')
    if (stored.date !== today) return limit
    return Math.max(0, limit - (stored.count || 0))
  } catch { return limit }
}
