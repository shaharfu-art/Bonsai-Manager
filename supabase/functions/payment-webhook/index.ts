// Supabase Edge Function: payment-webhook
// Receives webhooks from Morning (Green Invoice) when payment events occur
// Docs: https://www.greeninvoice.co.il/api-docs

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MORNING_WEBHOOK_SECRET = Deno.env.get('MORNING_WEBHOOK_SECRET') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-webhook-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Webhook calls don't have our auth - verify by secret instead
    const webhookSecret = req.headers.get('x-webhook-secret') ?? ''
    if (MORNING_WEBHOOK_SECRET && webhookSecret !== MORNING_WEBHOOK_SECRET) {
      // Also check body for secret field
      const body = await req.json()
      if (body.secret !== MORNING_WEBHOOK_SECRET) {
        console.error('Invalid webhook secret')
        return new Response(JSON.stringify({ error: 'Invalid secret' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // Process with already-parsed body
      return await processWebhook(body)
    }

    const body = await req.json()
    return await processWebhook(body)
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function processWebhook(body: any) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log('Webhook received:', JSON.stringify(body, null, 2))

  // Morning webhook format — the body IS the payload directly
  // Morning sends: { id, type, number, channel, productId, client: { ... }, ... }
  // Or wrapped: { event, data: { ... } }
  const eventType = body.event ?? body.type ?? body.channel ?? ''
  const payload = body.data ?? body

  // Determine event type from Morning's format
  // Morning type codes: 300=invoice, 305=receipt, 320=credit_invoice, 400=receipt_invoice
  // channel: "recurring-charge" means successful recurring payment
  const isPaymentSuccess = 
    body.channel === 'recurring-charge' || 
    eventType === 'payment.success' || 
    eventType === 'subscription.created' ||
    body.type === 400 || body.type === 305

  // Extract user email or customer ID to find our user
  // Morning format: { payer: { email, name, phone }, channel, total, productId, ... }
  const customerEmail = payload.payer?.email ?? payload.customer?.email ?? payload.email ?? payload.client?.emails?.[0] ?? payload.client?.email ?? ''
  const customerId = payload.payer?.id ?? payload.customer?.id ?? payload.customer_id ?? payload.client?.id ?? ''
  const subscriptionId = payload.subscription?.id ?? payload.subscription_id ?? payload.id ?? ''

  const effectiveEmail = customerEmail

  if (!effectiveEmail && !customerId) {
    console.warn('No customer identifier in webhook payload')
    console.log('FULL BODY:', JSON.stringify(body))
    return new Response(JSON.stringify({ ok: true, message: 'No customer identifier' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Find user by email or payment_customer_id
  let userId: string | null = null

  if (customerId) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('payment_customer_id', customerId)
      .single()
    if (data) userId = data.id
  }

  if (!userId && effectiveEmail) {
    // Look up by email in user_profiles
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', effectiveEmail)
      .single()
    if (data) userId = data.id
  }

  if (!userId && effectiveEmail) {
    // Fallback: look up by auth email (admin API)
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email === effectiveEmail)
    if (authUser) userId = authUser.id
  }

  if (!userId) {
    console.warn(`User not found for email=${customerEmail} customerId=${customerId}`)
    return new Response(JSON.stringify({ ok: true, message: 'User not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Handle event
  if (isPaymentSuccess) {
    // Determine plan from product/price info in payload
    const productId = payload.productId ?? payload.product_id ?? payload.plan_id ?? payload.item_id ?? ''
    const amount = payload.total ?? payload.amount ?? payload.totalAmount ?? 0
    
    // Determine plan based on amount or product ID
    // Premium: ₪9.90/month or ₪99/year
    // Pro: ₪16.90/month or ₪169/year
    let userPlan: 'premium' | 'pro' = 'premium'
    let maxTrees = 15
    
    if (amount >= 16 || amount >= 169 || (typeof productId === 'string' && productId.includes('pro'))) {
      userPlan = 'pro'
      maxTrees = 9999
    }

    // Activate for 35 days (grace period for monthly billing)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 35)
    
    await supabase.from('user_profiles').update({
      plan: userPlan,
      max_trees: maxTrees,
      plan_expires_at: expiresAt.toISOString(),
      payment_provider: 'morning',
      payment_customer_id: customerId || subscriptionId || payload.id || '',
    }).eq('id', userId)

    // Log the payment
    try {
      await supabase.from('payment_logs').insert({
        user_id: userId,
        event_type: body.channel ?? eventType ?? 'payment.success',
        amount: amount,
        currency: payload.currency ?? 'ILS',
        provider_transaction_id: payload.id ?? '',
        raw_payload: body,
      })
    } catch { /* ignore */ }

    console.log(`✅ User ${userId} upgraded to ${userPlan}`)
  } else {
    // Handle other events
    switch (String(eventType)) {
      case 'payment.failed': {
        console.warn(`⚠️ Payment failed for user ${userId}`)
        try {
          await supabase.from('payment_logs').insert({
            user_id: userId,
            event_type: 'payment.failed',
            amount: payload.amount ?? 0,
            currency: payload.currency ?? 'ILS',
            provider_transaction_id: payload.id ?? '',
            raw_payload: body,
          })
        } catch { /* ignore */ }
        break
      }

      case 'subscription.cancelled':
      case 'subscription.expired': {
        await supabase.from('user_profiles').update({
          plan_expires_at: new Date().toISOString(),
        }).eq('id', userId)

        try {
          await supabase.from('payment_logs').insert({
            user_id: userId,
            event_type: String(eventType),
            amount: 0,
            currency: 'ILS',
            provider_transaction_id: payload.id ?? '',
            raw_payload: body,
          })
        } catch { /* ignore */ }

        console.log(`❌ User ${userId} subscription ended`)
        break
      }

      default:
        console.log(`Unhandled event type: ${eventType}`)
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
