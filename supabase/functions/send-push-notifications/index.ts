// Supabase Edge Function: send-push-notifications
// Triggered by cron-job.org daily at 8:00 AM
// Checks for due/upcoming treatments and sends Web Push notifications

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

serve(async (req) => {
  // Verify the request is from our cron job
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // 1. Get all alert configs
    const { data: configs, error: configErr } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('is_manual_only', false)

    if (configErr) throw configErr
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No alert configs' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Get latest treatment per tree+type
    const { data: logs } = await supabase
      .from('treatment_logs')
      .select('tree_id, treatment_type, treatment_date, user_id')
      .order('treatment_date', { ascending: false })

    // 3. Get all trees for names
    const { data: trees } = await supabase.from('trees').select('id, custom_name, user_id')
    const treeMap = new Map((trees ?? []).map(t => [t.id, t]))

    // 4. Compute who needs notifications
    const today = new Date()
    const notifications: Array<{ user_id: string; title: string; body: string; url: string }> = []

    for (const config of configs) {
      const tree = treeMap.get(config.tree_id)
      if (!tree) continue

      let isDue = false

      if (config.snoozed_until) {
        const dueDate = new Date(config.snoozed_until)
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        isDue = diffDays <= 0
      } else if (config.interval_days && config.interval_days > 0) {
        const lastLog = (logs ?? []).find(
          l => l.tree_id === config.tree_id && l.treatment_type === config.treatment_type && l.user_id === config.user_id
        )
        const lastDate = lastLog ? new Date(lastLog.treatment_date) : new Date(0)
        const nextDue = new Date(lastDate.getTime() + config.interval_days * 24 * 60 * 60 * 1000)
        const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        isDue = diffDays <= 0
      }

      if (isDue) {
        notifications.push({
          user_id: config.user_id,
          title: `🌿 ${tree.custom_name}`,
          body: `${config.treatment_type} is due!`,
          url: `/trees/${config.tree_id}`,
        })
      }
    }

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No due alerts' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 5. Get push subscriptions for affected users
    const userIds = [...new Set(notifications.map(n => n.user_id))]
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push subscriptions' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 6. Send Web Push notifications
    let sentCount = 0
    for (const notif of notifications) {
      const userSubs = subscriptions.filter(s => s.user_id === notif.user_id)
      for (const sub of userSubs) {
        try {
          const pushPayload = JSON.stringify({
            title: notif.title,
            body: notif.body,
            url: notif.url,
            icon: '/favicon.svg',
          })

          // Use web-push compatible approach with crypto
          const response = await sendWebPush(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
          )

          if (response.ok) {
            sentCount++
          } else if (response.status === 410) {
            // Subscription expired, remove it
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        } catch (err) {
          console.error('Push send error:', err)
        }
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, total: notifications.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Minimal Web Push sender using Deno crypto APIs
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  // For proper Web Push encryption we need the web-push library
  // In Deno Edge Functions, we use the npm: specifier
  const webPush = await import('npm:web-push@3.6.7')

  webPush.setVapidDetails(
    'mailto:bonsai@example.com',
    vapidPublicKey,
    vapidPrivateKey
  )

  const result = await webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    payload
  )

  return new Response(null, { status: result.statusCode })
}
