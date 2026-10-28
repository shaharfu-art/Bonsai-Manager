import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

// Treatment types we care about (not watering)
const CARE_TYPES = ['fertilizing', 'branch_pruning', 'root_pruning', 'repotting', 'wiring', 'wire_removal']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Auth
    const authHeader = req.headers.get('authorization') || ''
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let isAuthorized = false
    if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
      isAuthorized = true
    }
    if (!isAuthorized && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) isAuthorized = true
    }
    if (!isAuthorized) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // Quiet hours: 22:00-05:30 Israel time
    const israelTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
    const hour = israelTime.getHours()
    const minutes = israelTime.getMinutes()
    const timeValue = hour + minutes / 60
    if (timeValue >= 22 || timeValue < 5.5) {
      return new Response(JSON.stringify({ message: 'Quiet hours', sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Throttle: check if we already sent care insights today
    const today = new Date().toISOString().split('T')[0]

    // Get users with push subscriptions and trees
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, trees_city, last_care_insight_at')
      .not('trees_lat', 'is', null)

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users', sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let totalSent = 0

    for (const user of users) {
      // Throttle: max 1 care insight per week per user
      if (user.last_care_insight_at) {
        const lastSent = new Date(user.last_care_insight_at).getTime()
        const daysSinceLastInsight = (Date.now() - lastSent) / (1000 * 60 * 60 * 24)
        if (daysSinceLastInsight < 7) continue
      }

      // Get user's push subscriptions
      const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user.id)
      if (!subs || subs.length === 0) continue

      // Get user's trees
      const { data: trees } = await supabase
        .from('trees')
        .select('id, custom_name, species_free_text, age_years, style')
        .eq('user_id', user.id)
        .limit(10)

      if (!trees || trees.length === 0) continue

      const treeIds = trees.map(t => t.id)

      // Get last photo date per tree
      const { data: photoData } = await supabase
        .from('photos')
        .select('tree_id, created_at')
        .in('tree_id', treeIds)
        .order('created_at', { ascending: false })

      const lastPhotoMap: Record<string, string> = {}
      for (const p of photoData ?? []) {
        if (!lastPhotoMap[p.tree_id]) lastPhotoMap[p.tree_id] = p.created_at
      }

      // Get treatment history (last 12 months) for care types only
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

      const { data: treatments } = await supabase
        .from('treatment_logs')
        .select('tree_id, treatment_type, treatment_date')
        .in('tree_id', treeIds)
        .in('treatment_type', CARE_TYPES)
        .eq('status', 'completed')
        .gte('treatment_date', twelveMonthsAgo.toISOString().split('T')[0])
        .order('treatment_date', { ascending: false })

      // Build per-tree care summary
      const treeSummaries = trees.map(tree => {
        const treeTreatments = (treatments ?? []).filter(t => t.tree_id === tree.id)
        const lastByType: Record<string, string> = {}
        for (const t of treeTreatments) {
          if (!lastByType[t.treatment_type]) {
            lastByType[t.treatment_type] = t.treatment_date
          }
        }
        return {
          name: tree.custom_name,
          species: tree.species_free_text || 'unknown',
          age: tree.age_years,
          lastFertilizing: lastByType['fertilizing'] || 'never',
          lastBranchPruning: lastByType['branch_pruning'] || 'never',
          lastRootPruning: lastByType['root_pruning'] || 'never',
          lastRepotting: lastByType['repotting'] || 'never',
          lastWiring: lastByType['wiring'] || 'never',
          lastPhoto: lastPhotoMap[tree.id] ? lastPhotoMap[tree.id].split('T')[0] : 'never',
        }
      })

      // Ask Gemini for insight
      const todayFormatted = israelTime.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      const season = getSeasonInIsrael(israelTime.getMonth())

      const prompt = `You are an expert bonsai advisor in Israel. Today is ${todayFormatted}. Season: ${season}. Location: ${user.trees_city || 'Israel'}.

Here is the care history for this grower's trees (excluding watering):
${JSON.stringify(treeSummaries, null, 2)}

Based on the tree species, current season, and care history:
- Is there any tree that NEEDS attention right now (fertilizing, pruning, repotting, wiring) that hasn't been done in too long?
- Consider that in winter (Dec-Feb) most trees are dormant — less pruning/fertilizing needed.
- In spring (Mar-May) it's growth season — pruning and fertilizing are important.
- In summer (Jun-Aug) — fertilizing continues but heavy pruning should wait.
- In autumn (Sep-Nov) — prepare for winter, possible repotting for some species.
- Also check lastPhoto — if a tree hasn't been photographed in 90+ days, suggest documenting progress.

If there is an important insight, write a SHORT push notification in Hebrew (max 140 chars) with actionable advice. Mention the specific tree name and what to do. You can combine care advice with a photo reminder if relevant.
If nothing urgent — respond with exactly: NONE`

      let insight: string | null = null
      try {
        const { GoogleGenAI } = await import('npm:@google/genai')
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
        const text = response.text?.trim() ?? ''
        if (text && text !== 'NONE' && !text.startsWith('NONE')) {
          insight = text.slice(0, 180)
        }
      } catch { /* skip this user */ continue }

      if (!insight) continue

      // Send push
      const pushPayload = JSON.stringify({
        title: '🌱 תובנת טיפול',
        body: insight,
        icon: '/pwa-192x192.png',
        data: { url: '/dashboard' }
      })

      const webPush = await import('npm:web-push@3.6.7')
      webPush.setVapidDetails('mailto:noreply@bonsai-manager.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

      for (const sub of subs) {
        try {
          await webPush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, pushPayload)
          totalSent++
        } catch (e: any) {
          if (e.statusCode === 404 || e.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }

      // Mark last insight sent
      await supabase.from('user_profiles').update({ last_care_insight_at: new Date().toISOString() }).eq('id', user.id)
    }

    return new Response(JSON.stringify({ message: 'Care insights complete', sent: totalSent, usersChecked: users.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

function getSeasonInIsrael(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring (עונת צמיחה)'
  if (month >= 5 && month <= 7) return 'Summer (קיץ חם)'
  if (month >= 8 && month <= 10) return 'Autumn (סתיו)'
  return 'Winter (חורף, שינה)'
}
