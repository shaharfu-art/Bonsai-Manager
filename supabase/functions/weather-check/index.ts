// Supabase Edge Function: weather-check
// Runs via cron every 6 hours. Checks 3-day forecast for extreme weather.
// If found: uses Gemini to generate personalized recommendations per user's trees,
// then sends push notification.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import { GoogleGenAI } from 'npm:@google/genai'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

// Web Push imports
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Weather alert thresholds
const THRESHOLDS = {
  heatwave: 37,       // °C
  extreme_heat: 40,   // °C
  frost: 3,           // °C
  strong_wind: 50,    // km/h
  heavy_rain: 30,     // mm/day
}

// Test mode thresholds (lower, for simulation)
const TEST_THRESHOLDS = {
  heatwave: 20,       // °C
  extreme_heat: 25,   // °C
  frost: 15,          // °C
  strong_wind: 5,     // km/h
  heavy_rain: 1,      // mm/day
}

interface WeatherAlert {
  type: 'heatwave' | 'extreme_heat' | 'frost' | 'strong_wind' | 'heavy_rain'
  day: string
  value: number
  unit: string
}

function checkForecastForAlerts(daily: any, thresholds: typeof THRESHOLDS): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const dates = daily.time ?? []
  const maxTemps = daily.temperature_2m_max ?? []
  const minTemps = daily.temperature_2m_min ?? []
  const maxWinds = daily.wind_speed_10m_max ?? []
  const precipitation = daily.precipitation_sum ?? []

  for (let i = 0; i < Math.min(dates.length, 3); i++) {
    const date = dates[i]
    if (maxTemps[i] >= thresholds.extreme_heat) {
      alerts.push({ type: 'extreme_heat', day: date, value: Math.round(maxTemps[i]), unit: '°C' })
    } else if (maxTemps[i] >= thresholds.heatwave) {
      alerts.push({ type: 'heatwave', day: date, value: Math.round(maxTemps[i]), unit: '°C' })
    }
    if (minTemps[i] <= thresholds.frost) {
      alerts.push({ type: 'frost', day: date, value: Math.round(minTemps[i]), unit: '°C' })
    }
    if (maxWinds[i] >= thresholds.strong_wind) {
      alerts.push({ type: 'strong_wind', day: date, value: Math.round(maxWinds[i]), unit: 'km/h' })
    }
    if (precipitation[i] >= thresholds.heavy_rain) {
      alerts.push({ type: 'heavy_rain', day: date, value: Math.round(precipitation[i]), unit: 'mm' })
    }
  }
  return alerts
}

function alertEmoji(type: string): string {
  switch (type) {
    case 'extreme_heat': return '🔥'
    case 'heatwave': return '☀️'
    case 'frost': return '🥶'
    case 'strong_wind': return '💨'
    case 'heavy_rain': return '🌧️'
    default: return '⚠️'
  }
}

function alertTitle(type: string, he: boolean): string {
  switch (type) {
    case 'extreme_heat': return he ? 'התראת חמסין קיצוני!' : 'Extreme Heat Alert!'
    case 'heatwave': return he ? 'התראת חום' : 'Heat Warning'
    case 'frost': return he ? 'התראת כפור!' : 'Frost Alert!'
    case 'strong_wind': return he ? 'רוחות חזקות' : 'Strong Wind Warning'
    case 'heavy_rain': return he ? 'גשם כבד צפוי' : 'Heavy Rain Expected'
    default: return he ? 'התראת מזג אוויר' : 'Weather Alert'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Auth: allow cron secret OR authenticated user (for manual trigger from app)
  const authHeader = req.headers.get('authorization') || ''
  const apiKey = req.headers.get('apikey') || ''
  
  let isAuthorized = false
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    isAuthorized = true
  } else if (authHeader.startsWith('Bearer ') && apiKey) {
    // Verify user token via Supabase
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) isAuthorized = true
  }

  if (!isAuthorized) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Check if test mode
  let testMode = false
  try {
    const body = await req.json()
    testMode = body?.test === true
  } catch { /* no body */ }

  const activeThresholds = testMode ? TEST_THRESHOLDS : THRESHOLDS

  // Setup web-push
  webpush.setVapidDetails('mailto:noreply@bonsai-manager.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  try {
    // 1. Get all users with location set
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, trees_lat, trees_lng, trees_city')
      .not('trees_lat', 'is', null)

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with location', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    let totalSent = 0

    // Group users by approximate location (round to 0.5 degree) to avoid duplicate API calls
    const locationGroups = new Map<string, typeof users>()
    for (const user of users) {
      const key = `${Math.round(user.trees_lat * 2) / 2},${Math.round(user.trees_lng * 2) / 2}`
      if (!locationGroups.has(key)) locationGroups.set(key, [])
      locationGroups.get(key)!.push(user)
    }

    for (const [locKey, groupUsers] of locationGroups) {
      const [lat, lng] = locKey.split(',').map(Number)

      // 2. Fetch 3-day forecast from Open-Meteo
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum&timezone=auto&forecast_days=3`
      )
      const weatherData = await weatherRes.json()
      const alerts = checkForecastForAlerts(weatherData.daily, activeThresholds)

      if (alerts.length === 0) continue

      // 3. For each user in this location group
      for (const user of groupUsers) {
        // Get user's trees species
        const { data: trees } = await supabase
          .from('trees')
          .select('custom_name, species_free_text')
          .eq('user_id', user.id)
          .limit(5)

        const treeNames = (trees ?? []).map(t => t.custom_name || t.species_free_text || '').filter(Boolean).join(', ')

        // Get user's push subscriptions
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', user.id)

        if (!subs || subs.length === 0) continue

        // Determine language (default Hebrew)
        const lang = 'he'
        const isHe = true

        // 4. Use Gemini to generate recommendation
        const alertSummary = alerts.map(a => `${alertEmoji(a.type)} ${a.day}: ${a.value}${a.unit}`).join('\n')
        const prompt = `You are a bonsai care expert. Based on this weather forecast for the next 3 days:
${alertSummary}

The user has these trees: ${treeNames || 'various bonsai trees'}

Write a SHORT push notification message (max 150 chars) in Hebrew with specific actionable advice for protecting their bonsai trees. Include emoji. Be urgent but helpful.`

        let recommendation: string
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          })
          recommendation = response.text?.slice(0, 200) ?? ''
        } catch {
          // Fallback if Gemini fails
          const mainAlert = alerts[0]
          recommendation = isHe
            ? `${alertEmoji(mainAlert.type)} ${alertTitle(mainAlert.type, true)} — ${mainAlert.value}${mainAlert.unit} ב-${mainAlert.day}. הגן על העצים שלך!`
            : `${alertEmoji(mainAlert.type)} ${alertTitle(mainAlert.type, false)} — ${mainAlert.value}${mainAlert.unit} on ${mainAlert.day}. Protect your trees!`
        }

        // 5. Send push to all user subscriptions
        const mainAlert = alerts[0]
        const pushPayload = JSON.stringify({
          title: `${alertEmoji(mainAlert.type)} ${alertTitle(mainAlert.type, isHe)}`,
          body: recommendation,
          icon: '/pwa-192x192.png',
          data: { url: '/dashboard' }
        })

        for (const sub of subs) {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, pushPayload)
            totalSent++
          } catch (pushErr: any) {
            // Remove invalid subscription
            if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Weather check complete', sent: totalSent, usersChecked: users.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Weather check error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
