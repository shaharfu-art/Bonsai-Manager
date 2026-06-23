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

  // 3. Get all trees for names + cover photos
    const { data: trees } = await supabase.from('trees').select('id, custom_name, user_id')
    const treeMap = new Map((trees ?? []).map(t => [t.id, t]))

    // Get cover photos directly (is_cover = true or first photo per tree)
    const treeIds = (trees ?? []).map(t => t.id)
    const coverPhotoMap = new Map<string, string>()
    if (treeIds.length > 0) {
      const { data: coverPhotos } = await supabase
        .from('photos')
        .select('tree_id, storage_path, is_cover')
        .in('tree_id', treeIds)
        .order('is_cover', { ascending: false })
        .order('created_at', { ascending: false })

      if (coverPhotos) {
        // Pick the first photo per tree (is_cover=true first, then newest)
        const seen = new Set<string>()
        for (const photo of coverPhotos) {
          if (seen.has(photo.tree_id)) continue
          seen.add(photo.tree_id)
          // Create signed URL
          const { data: signedData } = await supabase.storage
            .from('bonsai-photos')
            .createSignedUrl(photo.storage_path, 3600)
          if (signedData?.signedUrl) {
            coverPhotoMap.set(photo.tree_id, signedData.signedUrl)
          }
        }
      }
    }

    // 4. Compute who needs notifications
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const notifications: Array<{ user_id: string; tree_id: string; treatment_type: string; url: string; image: string | null; config_id: string }> = []

    // Treatment type translations
    const treatmentNames: Record<string, Record<string, string>> = {
      he: {
        watering: 'השקיה', fertilizing: 'דישון', branch_pruning: 'גיזום ענפים',
        root_pruning: 'גיזום שורשים', wiring: 'עיצוב / חיווט', wire_removal: 'הסרת חיווט',
        repotting: 'שתילה מחדש', pest_treatment: 'טיפול במזיקים', shading: 'הצללה',
        sun_exposure: 'חשיפה לשמש', winter_dormancy: 'מנוחת חורף', other: 'אחר',
      },
      en: {
        watering: 'Watering', fertilizing: 'Fertilizing', branch_pruning: 'Branch Pruning',
        root_pruning: 'Root Pruning', wiring: 'Wiring', wire_removal: 'Wire Removal',
        repotting: 'Repotting', pest_treatment: 'Pest Treatment', shading: 'Shading',
        sun_exposure: 'Sun Exposure', winter_dormancy: 'Winter Dormancy', other: 'Other',
      },
    }
    const dueText: Record<string, string> = { he: 'הגיע הזמן!', en: 'is due!' }

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
        const treeImage = coverPhotoMap.get(config.tree_id) ?? null
        // Skip if treatment was done today
        const lastLogToday = (logs ?? []).find(
          l => l.tree_id === config.tree_id && l.treatment_type === config.treatment_type && l.treatment_date === todayStr
        )
        if (lastLogToday) continue

        // Throttle: only send push again after 2 days since last push
        if (config.last_push_sent_at) {
          const lastPush = new Date(config.last_push_sent_at)
          const daysSinceLastPush = (today.getTime() - lastPush.getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceLastPush < 2) continue
        }

        notifications.push({
          user_id: config.user_id,
          tree_id: config.tree_id,
          treatment_type: config.treatment_type,
          url: `/trees/${config.tree_id}`,
          image: treeImage,
          config_id: config.id,
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
      const tree = treeMap.get(notif.tree_id)
      const treeName = tree?.custom_name ?? ''
      let pushSentForThisNotif = false

      for (const sub of userSubs) {
        try {
          const lang = sub.language === 'en' ? 'en' : 'he'
          const treatmentLabel = treatmentNames[lang]?.[notif.treatment_type] ?? notif.treatment_type
          const body = lang === 'he'
            ? `${treatmentLabel} — ${dueText.he}`
            : `${treatmentLabel} ${dueText.en}`

          const pushPayload = JSON.stringify({
            title: `🌿 ${treeName}`,
            body,
            url: notif.url,
            icon: notif.image || '/favicon.svg',
            image: notif.image,
          })

          const response = await sendWebPush(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
          )

          if (response.ok) {
            sentCount++
            pushSentForThisNotif = true
          } else if (response.status === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        } catch (err) {
          console.error('Push send error:', err)
        }
      }

      // Update last_push_sent_at so we don't spam again for 2 days
      if (pushSentForThisNotif) {
        await supabase
          .from('alert_configs')
          .update({ last_push_sent_at: new Date().toISOString() })
          .eq('id', notif.config_id)
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
