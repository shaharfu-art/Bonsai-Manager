// Supabase Edge Function: ai-insights
// Uses Google Gemini SDK with Auth key (AQ. format)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import { GoogleGenAI } from 'npm:@google/genai'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

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
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { tree_id, language, question, image, weather } = await req.json()
    if (!tree_id) return new Response(JSON.stringify({ error: 'Missing tree_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Fetch tree
    const { data: tree } = await supabase.from('trees').select('*').eq('id', tree_id).eq('user_id', user.id).single()
    if (!tree) return new Response(JSON.stringify({ error: 'Tree not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Fetch species
    let speciesInfo = ''
    if (tree.species_id) {
      const { data: species } = await supabase.from('species').select('name_en, name_latin, type').eq('id', tree.species_id).single()
      if (species) speciesInfo = `Species: ${species.name_en} (${species.name_latin ?? ''}, ${species.type})`
    }

    // Fetch recent treatments
    const { data: treatments } = await supabase.from('treatment_logs').select('treatment_type, treatment_date, notes').eq('tree_id', tree_id).eq('status', 'completed').order('treatment_date', { ascending: false }).limit(10)

    // Fetch light assessments history
    const { data: lightData } = await supabase.from('light_assessments').select('avg_lux, category, assessed_at').eq('tree_id', tree_id).eq('user_id', user.id).order('assessed_at', { ascending: false }).limit(5)
    const lightContext = lightData && lightData.length > 0
      ? `Light measurements:\n${lightData.map((l: any) => `  ${l.assessed_at}: ${l.avg_lux} lux (${l.category})`).join('\n')}`
      : 'No light measurements available'

    // Build weather context string
    const weatherContext = weather ? (() => {
      const c = weather.current
      const wDesc = (code: number) => {
        if (code === 0) return 'clear sky'
        if (code <= 3) return 'partly cloudy'
        if (code <= 48) return 'foggy'
        if (code <= 57) return 'drizzle'
        if (code <= 67) return 'rain'
        if (code <= 77) return 'snow'
        if (code <= 82) return 'heavy rain'
        if (code <= 86) return 'heavy snow'
        if (code >= 95) return 'thunderstorm'
        return 'cloudy'
      }
      const forecastLines = (weather.forecast ?? []).map((d: any) =>
        `  ${d.date}: ${d.tempMin}°–${d.tempMax}°C, ${wDesc(d.weatherCode)}${d.precipitation > 0 ? `, rain ${d.precipitation}mm` : ''}`
      ).join('\n')
      return `Current weather: ${c.temp}°C, ${wDesc(c.weatherCode)}, humidity ${c.humidity}%, wind ${c.windSpeed}km/h
4-day forecast:
${forecastLines}`
    })() : 'Weather data unavailable'

    // Build prompt
    const month = new Date().getMonth() + 1
    const season = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter'
    const fallbackLang = language === 'he' ? 'Hebrew' : 'English'

    const prompt = question
      ? `You are an expert bonsai mentor. The user has a question about their tree.

Tree context:
- Name: ${tree.custom_name}
- ${speciesInfo || `Species: ${tree.species_free_text ?? 'Unknown'}`}
- Age: ${tree.age_years ?? 'Unknown'} years | Style: ${tree.style ?? 'Unknown'} | Location: ${tree.location ?? 'Unknown'}
- Substrate: ${tree.substrate ?? 'Unknown'} | Season: ${season}

Weather:
${weatherContext}

Recent treatments:
${treatments?.map((t: any) => `- ${t.treatment_date}: ${t.treatment_type}`).join('\n') || 'None'}

${lightContext}

User's question: "${question}"

Answer in the same language the user wrote their question in. Be concise, practical, and specific to this tree. Factor in current weather. Use emoji.`
      : `You are an expert bonsai mentor. Based on this tree profile, provide personalized care recommendations.

Tree: ${tree.custom_name}
${speciesInfo || `Species: ${tree.species_free_text ?? 'Unknown'}`}
Age: ${tree.age_years ?? 'Unknown'} years | Style: ${tree.style ?? 'Unknown'} | Location: ${tree.location ?? 'Unknown'}
Pot: ${tree.pot_type ?? 'Unknown'} | Substrate: ${tree.substrate ?? 'Unknown'} | Season: ${season}

Weather:
${weatherContext}

Recent treatments:
${treatments?.map((t: any) => `- ${t.treatment_date}: ${t.treatment_type}${t.notes ? ` (${t.notes})` : ''}`).join('\n') || 'None'}

${lightContext}

Respond in ${fallbackLang}. Structure:
1. **Health Assessment** - Brief assessment
2. **This Week** - 2-3 actionable items based on current + forecast weather
3. **Seasonal Tips** - For ${season}
4. **Warning** - Any concerns based on upcoming weather (or "none")

Keep it concise (max 300 words), practical, with emoji.`

    // Call Gemini via SDK (multimodal if image provided)
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    let contents: any
    if (image && question) {
      // Multimodal: image + text
      contents = [
        { text: prompt },
        { inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.base64 } },
      ]
    } else {
      contents = prompt
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    })

    const aiText = response.text ?? 'No response'

    return new Response(JSON.stringify({ insights: aiText, season }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('AI insights error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
