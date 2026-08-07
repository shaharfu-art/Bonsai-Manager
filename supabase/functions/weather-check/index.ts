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

const THRESHOLDS = { heatwave: 35, extreme_heat: 38, frost: 5, strong_wind: 30, heavy_rain: 30, dry_east_wind_humidity: 30, haze_humidity: 25, haze_temp: 35 }
const TEST_THRESHOLDS = { heatwave: 20, extreme_heat: 25, frost: 15, strong_wind: 5, heavy_rain: 1, dry_east_wind_humidity: 80, haze_humidity: 80, haze_temp: 20 }

interface WeatherAlert { type: string; day: string; value: number; unit: string }

function checkAlerts(daily: any, t: typeof THRESHOLDS): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const dates = daily.time ?? []
  const maxT = daily.temperature_2m_max ?? []
  const minT = daily.temperature_2m_min ?? []
  const wind = daily.wind_speed_10m_max ?? []
  const windDir = daily.wind_direction_10m_dominant ?? []
  const rain = daily.precipitation_sum ?? []
  const humidity = daily.relative_humidity_2m_mean ?? []
  for (let i = 0; i < Math.min(dates.length, 3); i++) {
    const roundedMax = Math.round(maxT[i])
    const roundedMin = Math.round(minT[i])
    const roundedWind = Math.round(wind[i])
    const roundedRain = Math.round(rain[i])
    const roundedHumidity = Math.round(humidity[i] ?? 0)
    if (roundedMax >= t.extreme_heat) alerts.push({ type: 'extreme_heat', day: dates[i], value: roundedMax, unit: '°C' })
    else if (roundedMax >= t.heatwave) alerts.push({ type: 'heatwave', day: dates[i], value: roundedMax, unit: '°C' })
    if (roundedMin <= t.frost) alerts.push({ type: 'frost', day: dates[i], value: roundedMin, unit: '°C' })
    if (roundedWind >= t.strong_wind) alerts.push({ type: 'strong_wind', day: dates[i], value: roundedWind, unit: 'km/h' })
    if (roundedRain >= t.heavy_rain) alerts.push({ type: 'heavy_rain', day: dates[i], value: roundedRain, unit: 'mm' })
    // Dry east wind: direction 45-135° + low humidity
    const dir = windDir[i] ?? 0
    if (dir >= 45 && dir <= 135 && roundedHumidity <= t.dry_east_wind_humidity) {
      alerts.push({ type: 'dry_east_wind', day: dates[i], value: roundedHumidity, unit: '% לחות' })
    }
    // Haze/Sharav: very low humidity + high temp
    if (roundedHumidity <= t.haze_humidity && roundedMax >= t.haze_temp) {
      alerts.push({ type: 'haze', day: dates[i], value: roundedHumidity, unit: '% לחות' })
    }
  }
  return alerts
}

function alertEmoji(type: string): string {
  const map: Record<string, string> = { extreme_heat: '🔥', heatwave: '☀️', frost: '🥶', strong_wind: '💨', heavy_rain: '🌧️', dry_east_wind: '🏜️', haze: '🌫️' }
  return map[type] ?? '⚠️'
}

function alertTitle(type: string): string {
  const map: Record<string, string> = { extreme_heat: 'התראת חמסין קיצוני!', heatwave: 'התראת חום', frost: 'התראת כפור!', strong_wind: 'רוחות חזקות', heavy_rain: 'גשם כבד צפוי', dry_east_wind: 'רוח מזרחית יבשה', haze: 'אובך ושרב' }
  return map[type] ?? 'התראת מזג אוויר'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Auth: check secret from header OR query param
    const authHeader = req.headers.get('authorization') || ''
    const url = new URL(req.url)
    const secretParam = url.searchParams.get('secret') || ''
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    let isAuthorized = false
    // Cron secret via header or URL param
    if (CRON_SECRET && (authHeader === `Bearer ${CRON_SECRET}` || secretParam === CRON_SECRET)) {
      isAuthorized = true
    }
    // Authenticated user (from app)
    if (!isAuthorized && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) isAuthorized = true
    }
    if (!isAuthorized) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // Parse body
    let testMode = false
    try { const body = await req.json(); testMode = body?.test === true } catch {}

    // Quiet hours: don't send between 22:00-05:30 Israel time (unless test mode)
    if (!testMode) {
      const israelTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
      const hour = israelTime.getHours()
      const minutes = israelTime.getMinutes()
      const timeValue = hour + minutes / 60 // e.g. 5.5 = 05:30
      if (timeValue >= 22 || timeValue < 5.5) {
        return new Response(JSON.stringify({ message: 'Quiet hours (22:00-05:30 Israel time)', sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }
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
        `https://api.open-meteo.com/v1/forecast?latitude=${user.trees_lat}&longitude=${user.trees_lng}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,precipitation_sum,relative_humidity_2m_mean&timezone=auto&forecast_days=3`
      )
      const weatherData = await weatherRes.json()
      const alerts = checkAlerts(weatherData.daily, thresholds)

      if (alerts.length === 0) continue

      // Throttle: max 1 weather push per 24h per alert TYPE per user
      const { data: lastPushData } = await supabase
        .from('user_profiles')
        .select('last_weather_push_at, last_weather_push_types')
        .eq('id', user.id)
        .single()
      
      const lastPushTime = lastPushData?.last_weather_push_at ? new Date(lastPushData.last_weather_push_at).getTime() : 0
      const lastPushTypes: string[] = lastPushData?.last_weather_push_types ?? []
      const hoursSinceLastPush = (Date.now() - lastPushTime) / (1000 * 60 * 60)
      
      // Filter out alert types that were already sent in last 24h
      let newAlerts = alerts
      if (hoursSinceLastPush < 24) {
        newAlerts = alerts.filter(a => !lastPushTypes.includes(a.type))
      }
      if (newAlerts.length === 0) continue
      
      // Use newAlerts for the push message
      const alertsToSend = newAlerts

      // Get user's trees
      const { data: trees } = await supabase.from('trees').select('custom_name, species_free_text').eq('user_id', user.id).limit(5)
      const treeNames = (trees ?? []).map(t => t.custom_name || t.species_free_text || '').filter(Boolean).join(', ')

      // Get recent treatments (last 3 days)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const { data: recentTreatments } = await supabase
        .from('treatment_logs')
        .select('treatment_type, treatment_date')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('treatment_date', threeDaysAgo.toISOString().split('T')[0])
        .order('treatment_date', { ascending: false })
        .limit(10)
      const recentActivity = (recentTreatments ?? []).map(t => `${t.treatment_type} (${t.treatment_date})`).join(', ')

      // Get push subscriptions
      const { data: subs, error: subsErr } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user.id)
      if (!subs || subs.length === 0) {
        continue
      }

      // Generate recommendation with Gemini
      const alertSummary = alertsToSend.map(a => `${alertEmoji(a.type)} ${a.day}: ${a.value}${a.unit}`).join(', ')
      let recommendation = `${alertEmoji(alertsToSend[0].type)} ${alertTitle(alertsToSend[0].type)} — ${alertsToSend[0].value}${alertsToSend[0].unit}. הגן על העצים!`

      try {
        const { GoogleGenAI } = await import('npm:@google/genai')
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
        const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
        const prompt = `You are a bonsai expert. Today is ${today}. Weather alerts for the next 3 days: ${alertSummary}. Trees: ${treeNames || 'bonsai trees'}. Recent care activities: ${recentActivity || 'none in last 3 days'}. Write a SHORT push notification (max 120 chars) in Hebrew with actionable advice. Mention the correct days (tomorrow, day after, etc.) - NOT "today" unless the alert is actually for today. Include emoji.`
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
        if (response.text) recommendation = response.text.slice(0, 180)
      } catch { /* use fallback */ }

      // Send push
      const pushPayload = JSON.stringify({
        title: `${alertEmoji(alertsToSend[0].type)} ${alertTitle(alertsToSend[0].type)}`,
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

      // Mark last push time and types sent
      const sentTypes = [...new Set([...(hoursSinceLastPush < 24 ? lastPushTypes : []), ...alertsToSend.map(a => a.type)])]
      await supabase.from('user_profiles').update({ last_weather_push_at: new Date().toISOString(), last_weather_push_types: sentTypes }).eq('id', user.id)
    }

    return new Response(JSON.stringify({ message: 'Weather check complete', sent: totalSent, usersChecked: users.length, testMode }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
