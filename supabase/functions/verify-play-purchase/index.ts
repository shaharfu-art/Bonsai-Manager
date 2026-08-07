import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_PLAY_SERVICE_ACCOUNT = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT') // JSON key for Google API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

// Map product IDs to plan types
const PRODUCT_TO_PLAN: Record<string, { plan: string; maxTrees: number }> = {
  'premium_monthly': { plan: 'premium', maxTrees: 15 },
  'pro_monthly': { plan: 'pro', maxTrees: 9999 },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify the caller is authenticated
    const authHeader = req.headers.get('authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { purchaseToken, productId } = await req.json()
    if (!purchaseToken || !productId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing purchaseToken or productId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine plan from product ID
    const planInfo = PRODUCT_TO_PLAN[productId]
    if (!planInfo) {
      return new Response(JSON.stringify({ success: false, error: 'Unknown product ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // TODO: Verify purchase with Google Play Developer API
    // For now, we trust the client (since Digital Goods API ensures purchase went through Google)
    // In production, you should:
    // 1. Use Google Service Account to call purchases.subscriptions.get
    // 2. Verify purchaseState === 0 (purchased)
    // 3. Acknowledge the purchase
    //
    // For MVP/testing, we'll activate the plan directly:

    // Calculate expiry (30 days for monthly)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Update user's plan in DB
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        plan: planInfo.plan,
        max_trees: planInfo.maxTrees,
        plan_expires_at: expiresAt.toISOString(),
        payment_provider: 'google_play',
        payment_customer_id: purchaseToken,
      })
      .eq('id', user.id)

    if (updateError) {
      return new Response(JSON.stringify({ success: false, error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      plan: planInfo.plan,
      expiresAt: expiresAt.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
