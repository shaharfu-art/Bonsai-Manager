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

const THRESHOLDS = { heatwave: 37, extreme_heat: 40, frost: 3, strong_wind: 50, heavy_rain: 30 }
const TEST_THRESHOLDS = { heatwave: 20, extreme_heat: 25, frost: 15, strong_wind: 5, heavy_rain: 1 }

interface WeatherAlert { type: string; day: string; value: number; unit: string }

function checkAlerts(daily: any, t: typeof THRESHOLDS): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const dates = daily.time ?? []
  const maxT = daily.temperature_2m_max ?? []
  const minT = daily.temperature_2m_min ?? []
  const wind = daily.wind_speed_10m_max ?? []
  const rain = daily.precipitation_sum ?? []
  for (let i = 0; i < Math.min(dates.length, 3); i++) {
    if (maxT[i] >= t.extreme_heat) alerts.push({ type: 'extreme_heat', day: dates[i], value: Math.round(maxT[i]), unit: '°C' })
    else if (maxT[i] >= t.heatwave) alerts.push({ type: 'heatwave', day: dates[i], value: Math.round(maxT[i]), unit: '°C' })
    if (minT[i] <= t.frost) alerts.push({ type: 'frost', day: dates[i], value: Math.round(minT[i]), unit: '°C' })
    if (wind[i] >= t.strong_wind) alerts.push({ type: 'strong_wind', day: dates[i], value: Math.round(wind[i]), unit: 'km/h' })
    if (rain[i] >= t.heavy_rain) alerts.push({ type: 'heavy_rain', day: dates[i], value: Math.round(rain[i]), unit: 'mm' })
  }
  return alerts
}

function alertEmoji(type: string): string {
  const map: Record<string, string> = { extreme_heat: '🔥', heatwave: '☀️', frost: '🥶', strong_wind: '💨', heavy_rain: '🌧️' }
  return map[type] ?? '⚠️'
}

function alertTitle(type: string): string {
  const map: Record<string, string> = { extreme_heat: 'התראת חמסין קיצוני!', heatwave: 'התראת חום', frost: 'התראת כפור!', strong_wind: 'רוחות חזקות', heavy_rain: 'גשם כבד צפוי' }
  return map[type] ?? 'התראת מזג אוויר'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Auth
    const authHeader = req.headers.get('authorization') || ''
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    let isAuthorized = false
    if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
      isAuthorized = true
    } else if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) isAuthorized = true
    }
    if (!isAuthorized) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // Parse body
    let testMode = false
    try { const body = await req.json(); testMode = body?.test === true } catch {}
    const thresholds = testMode ? TEST_THRESHOLDS : THRESHOLDS

    // Get users with location
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, trees_lat, trees_lng, trees_city')
      .not('trees_lat', 'is', null)

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with location', sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let totalSent = 0

    for (const user of users) {
      // Fetch 3-day forecast
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${user.trees_lat}&longitude=${user.trees_lng}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum&timezone=auto&forecast_days=3`
      )
      const weatherData = await weatherRes.json()
      const alerts = checkAlerts(weatherData.daily, thresholds)

      if (alerts.length === 0) continue

      // Get user's trees
      const { data: trees } = await supabase.from('trees').select('custom_name, species_free_text').eq('user_id', user.id).limit(5)
      const treeNames = (trees ?? []).map(t => t.custom_name || t.species_free_text || '').filter(Boolean).join(', ')

      // Get push subscriptions
      const { data: subs, error: subsErr } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user.id)
      if (!subs || subs.length === 0) {
        // Debug: return info about why no push was sent
        return new Response(JSON.stringify({ 
          message: 'No push subscriptions found', 
          sent: 0, 
          usersChecked: users.length, 
          testMode,
          debug: { userId: user.id, subsErr: subsErr?.message, subsCount: subs?.length ?? 0, alertsFound: alerts.length }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Generate recommendation with Gemini
      const alertSummary = alerts.map(a => `${alertEmoji(a.type)} ${a.day}: ${a.value}${a.unit}`).join(', ')
      let recommendation = `${alertEmoji(alerts[0].type)} ${alertTitle(alerts[0].type)} — ${alerts[0].value}${alerts[0].unit}. הגן על העצים!`

      try {
        const { GoogleGenAI } = await import('npm:@google/genai')
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
        const prompt = `You are a bonsai expert. Weather forecast: ${alertSummary}. Trees: ${treeNames || 'bonsai trees'}. Write a SHORT push notification (max 120 chars) in Hebrew with actionable advice. Include emoji.`
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
        if (response.text) recommendation = response.text.slice(0, 180)
      } catch { /* use fallback */ }

      // Send push
      const pushPayload = JSON.stringify({
        title: `${alertEmoji(alerts[0].type)} ${alertTitle(alerts[0].type)}`,
        body: recommendation,
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
    }

    return new Response(JSON.stringify({ message: 'Weather check complete', sent: totalSent, usersChecked: users.length, testMode }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
