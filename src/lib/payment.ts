// Payment utilities for Morning (Green Invoice) integration
// This module handles checkout URL generation and subscription management

import { supabase } from './supabase-client'

// Morning payment links (hosted checkout)
const PAYMENT_LINKS: Record<string, string> = {
  premium_monthly: 'https://mrng.to/WQgspu2NJy',
  premium_yearly: 'https://mrng.to/MfgWMKVcpm',
  pro_monthly: 'https://mrng.to/cHa48tQq5c',
  pro_yearly: 'https://mrng.to/Jyy7SUbjlL',
}

export interface CheckoutOptions {
  plan: 'premium_monthly' | 'premium_yearly' | 'pro_monthly' | 'pro_yearly'
  userEmail: string
  userId: string
  successUrl?: string
  cancelUrl?: string
}

/**
 * Get the Morning payment link for a specific plan.
 * Morning hosted checkout handles card input, 3DS, invoicing, etc.
 */
export function getCheckoutUrl(options: CheckoutOptions): string | null {
  const url = PAYMENT_LINKS[options.plan]
  if (!url) {
    console.warn(`No payment link configured for plan: ${options.plan}`)
    return null
  }
  return url
}

/**
 * Check subscription status from user_profiles
 */
export async function getSubscriptionStatus(userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('plan, plan_expires_at, payment_provider, payment_customer_id')
    .eq('id', userId)
    .single()

  if (!data) return { active: false, plan: 'free' as const, expiresAt: null }

  const expired = data.plan_expires_at && new Date(data.plan_expires_at) < new Date()
  
  return {
    active: data.plan === 'premium' || data.plan === 'pro' && !expired,
    plan: (expired ? 'free' : data.plan) as 'free' | 'premium' | 'pro',
    expiresAt: data.plan_expires_at,
    provider: data.payment_provider,
    customerId: data.payment_customer_id,
  }
}

/**
 * For testing/development: manually activate a plan for a user
 * (Remove this in production or restrict to admin)
 */
export async function devActivatePremium(userId: string, days = 30, plan: 'premium' | 'pro' = 'premium', maxTrees = 15) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)

  const { error } = await supabase
    .from('user_profiles')
    .update({
      plan,
      max_trees: maxTrees,
      plan_expires_at: expiresAt.toISOString(),
      payment_provider: 'dev-manual',
    })
    .eq('id', userId)

  return { success: !error, error: error?.message }
}

/**
 * Cancel subscription — in Morning this is done via their dashboard or API.
 * We just mark it locally. The actual cancellation webhook will confirm.
 */
export async function requestCancelSubscription(userId: string) {
  // For Morning: cancellation is managed on their side
  // User contacts support via WhatsApp to cancel
  
  const { error } = await supabase
    .from('user_profiles')
    .update({})
    .eq('id', userId)

  return { success: !error, error: error?.message }
}
