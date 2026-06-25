// Supabase Edge Function: ai-insights
// Returns AI-powered care recommendations for a specific tree

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    // Get authorization header to identify user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } })

    // Get tree_id from request body
    const { tree_id, language } = await req.json()
    if (!tree_id) return new Response('Missing tree_id', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } })

    // Fetch tree data
    const { data: tree } = await supabase
      .from('trees')
      .select('*')
      .eq('id', tree_id)
      .eq('user_id', user.id)
      .single()

    if (!tree) return new Response('Tree not found', { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } })

    // Fetch species info
    let speciesInfo = ''
    if (tree.species_id) {
      const { data: species } = await supabase
        .from('species')
        .select('name_en, name_he, name_latin, type, seasonal_care_rules')
        .eq('id', tree.species_id)
        .single()
      if (species) {
        speciesInfo = `Species: ${species.name_en} (${species.name_latin ?? ''}, type: ${species.type})`
        if (species.seasonal_care_rules) {
          speciesInfo += `\nSeasonal care rules: ${JSON.stringify(species.seasonal_care_rules)}`
        }
      }
    }

    // Fetch recent treatments (last 10)
    const { data: treatments } = await supabase
      .from('treatment_logs')
      .select('treatment_type, treatment_date, notes, status')
      .eq('tree_id', tree_id)
      .eq('status', 'completed')
      .order('treatment_date', { ascending: false })
      .limit(10)

    // Fetch alert configs
    const { data: alerts } = await supabase
      .from('alert_configs')
      .select('treatment_type, interval_days')
      .eq('tree_id', tree_id)

    // Determine current season
    const month = new Date().getMonth() + 1
    const season = month >= 3 && month <= 5 ? 'spring'
      : month >= 6 && month <= 8 ? 'summer'
      : month >= 9 && month <= 11 ? 'autumn'
      : 'winter'

    // Build context for Gemini
    const context = `
Tree Profile:
- Name: ${tree.custom_name}
- ${speciesInfo || `Species: ${tree.species_free_text ?? 'Unknown'}`}
- Age: ${tree.age_years ?? 'Unknown'} years
- Style: ${tree.style ?? 'Unknown'}
- Location: ${tree.location ?? 'Unknown'}
- Pot type: ${tree.pot_type ?? 'Unknown'}
- Substrate: ${tree.substrate ?? 'Unknown'}
- Current season: ${season}
- Date added to collection: ${tree.date_added ?? 'Unknown'}

Recent treatments (last 10):
${treatments?.map(t => `- ${t.treatment_date}: ${t.treatment_type}${t.notes ? ` (${t.notes})` : ''}`).join('\n') || 'None recorded'}

Active recurring schedules:
${alerts?.map(a => `- ${a.treatment_type}: every ${a.interval_days} days`).join('\n') || 'None configured'}
`

    const lang = language === 'he' ? 'Hebrew' : 'English'

    const prompt = `You are an expert bonsai mentor and botanical advisor. Based on the following tree profile and care history, provide personalized care recommendations.

${context}

Respond in ${lang}. Structure your response as:
1. **Current Health Assessment** - Brief assessment based on care patterns
2. **Immediate Recommendations** - What should be done this week (2-3 actionable items)
3. **Seasonal Tips** - Specific advice for the current ${season} season
4. **Warning** - Any concerns or risks you notice (or say "none" if all looks good)

Keep the response concise (max 300 words), practical, and specific to this tree's species and conditions. Use emoji for visual appeal.`

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      console.error('Gemini API error:', errText)
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const geminiData = await geminiResponse.json()
    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    return new Response(JSON.stringify({ insights: aiText, season, generated_at: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
