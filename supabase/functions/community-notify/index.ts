// Edge Function: community-notify
// Sends push notification to all friends when a user shares a tree to the community
// Called from the client after sharing a tree

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''

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

    const { user_id, tree_name } = await req.json()
    if (!user_id || !tree_name) {
      return new Response(JSON.stringify({ error: 'Missing user_id or tree_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user's display name
    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('display_name, username')
      .eq('id', user_id)
      .single()

    const senderName = senderProfile?.display_name ?? senderProfile?.username ?? 'משתמש'

    // Find all friends of the user (from friend_requests WHERE status='accepted')
    const { data: friendRequests } = await supabase
      .from('friend_requests')
      .select('from_user_id, to_user_id')
      .eq('status', 'accepted')
      .or(`from_user_id.eq.${user_id},to_user_id.eq.${user_id}`)

    if (!friendRequests || friendRequests.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No friends to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract friend IDs
    const friendIds = friendRequests.map(req =>
      req.from_user_id === user_id ? req.to_user_id : req.from_user_id
    )

    // Get push subscriptions for all friends
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', friendIds)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No push subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send push notification to each friend
    let sentCount = 0

    for (const sub of subscriptions) {
      try {
        const payload = JSON.stringify({
          title: '🌳 עץ חדש בקהילה!',
          body: `🌳 ${senderName} שיתף עץ חדש: ${tree_name}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: {
            url: '/community',
          },
        })

        if (VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY) {
          // Use web-push for proper VAPID signing
          const webPush = await import('npm:web-push@3.6.7')
          webPush.setVapidDetails(
            'mailto:bonsai@example.com',
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
          )

          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          }

          const result = await webPush.sendNotification(pushSubscription, payload)
          if (result.statusCode >= 200 && result.statusCode < 300) {
            sentCount++
          } else if (result.statusCode === 410) {
            // Subscription expired — remove it
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        } else {
          // Fallback: simple fetch (without VAPID)
          const subscription = typeof sub.subscription === 'string'
            ? JSON.parse(sub.subscription)
            : { endpoint: sub.endpoint }

          const pushRes = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': '86400',
            },
            body: payload,
          })

          if (pushRes.ok) {
            sentCount++
          } else if (pushRes.status === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      } catch (err) {
        console.warn('Push send error:', err)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount, total: friendIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Community notify error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
