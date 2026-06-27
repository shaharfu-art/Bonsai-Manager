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

    const { tree_id, language } = await req.json()
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

    // Build prompt
    const month = new Date().getMonth() + 1
    const season = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter'
    const lang = language === 'he' ? 'Hebrew' : 'English'

    const prompt = `You are an expert bonsai mentor. Based on this tree profile, provide personalized care recommendations.

Tree: ${tree.custom_name}
${speciesInfo || `Species: ${tree.species_free_text ?? 'Unknown'}`}
Age: ${tree.age_years ?? 'Unknown'} years | Style: ${tree.style ?? 'Unknown'} | Location: ${tree.location ?? 'Unknown'}
Pot: ${tree.pot_type ?? 'Unknown'} | Substrate: ${tree.substrate ?? 'Unknown'} | Season: ${season}

Recent treatments:
${treatments?.map((t: any) => `- ${t.treatment_date}: ${t.treatment_type}${t.notes ? ` (${t.notes})` : ''}`).join('\n') || 'None'}

Respond in ${lang}. Structure:
1. **Health Assessment** - Brief assessment
2. **This Week** - 2-3 actionable items
3. **Seasonal Tips** - For ${season}
4. **Warning** - Any concerns (or "none")

Keep it concise (max 250 words), practical, with emoji.`

    // Call Gemini via SDK
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
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
