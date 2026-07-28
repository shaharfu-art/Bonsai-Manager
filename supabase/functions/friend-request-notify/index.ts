// Edge Function: friend-request-notify
// Sends push notification when a friend request is received

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify caller
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { to_user_id } = await req.json()
    if (!to_user_id) {
      return new Response(JSON.stringify({ error: 'Missing to_user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get sender's name
    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    const senderName = senderProfile?.display_name ?? senderProfile?.username ?? 'משתמש'

    // Get recipient's push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', to_user_id)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No push subscription' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send push notification using web-push with VAPID
    const webPush = await import('npm:web-push@3.6.7')
    webPush.setVapidDetails(
      'mailto:bonsai@example.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )

    const payload = JSON.stringify({
      title: '🤝 הצעת חברות חדשה!',
      body: `${senderName} רוצה להיות חבר שלך`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      url: '/community',
    })

    let sentCount = 0
    for (const sub of subscriptions) {
      try {
        const result = await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )

        if (result.statusCode >= 200 && result.statusCode < 300) {
          sentCount++
        } else if (result.statusCode === 410) {
          // Subscription expired, clean up
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      } catch (err) {
        console.warn('Push send error:', err)
        // If it's a 410, delete the subscription
        if ((err as any)?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Friend request notify error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
