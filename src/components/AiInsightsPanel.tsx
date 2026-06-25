import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'

interface AiInsightsPanelProps {
  treeId: string
}

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string || '').trim()

const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({ treeId }) => {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchInsights = async () => {
    setLoading(true)
    setError('')
    setInsights(null)
    try {
      // Fetch tree data directly
      const { data: tree } = await supabase.from('trees').select('*').eq('id', treeId).single()
      if (!tree) throw new Error('Tree not found')

      // Fetch species
      let speciesInfo = ''
      if (tree.species_id) {
        const { data: species } = await supabase.from('species').select('name_en, name_he, name_latin, type').eq('id', tree.species_id).single()
        if (species) speciesInfo = `Species: ${species.name_en} (${species.name_latin ?? ''}, ${species.type})`
      }

      // Fetch recent treatments
      const { data: treatments } = await supabase.from('treatment_logs').select('treatment_type, treatment_date, notes').eq('tree_id', treeId).eq('status', 'completed').order('treatment_date', { ascending: false }).limit(10)

      // Build context
      const month = new Date().getMonth() + 1
      const season = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter'
      const lang = i18n.language === 'he' ? 'Hebrew' : 'English'

      const prompt = `You are an expert bonsai mentor. Based on this tree profile, provide personalized care recommendations.

Tree: ${tree.custom_name}
${speciesInfo || `Species: ${tree.species_free_text ?? 'Unknown'}`}
Age: ${tree.age_years ?? 'Unknown'} years | Style: ${tree.style ?? 'Unknown'} | Location: ${tree.location ?? 'Unknown'}
Pot: ${tree.pot_type ?? 'Unknown'} | Substrate: ${tree.substrate ?? 'Unknown'} | Season: ${season}

Recent treatments:
${treatments?.map(t => `- ${t.treatment_date}: ${t.treatment_type}${t.notes ? ` (${t.notes})` : ''}`).join('\n') || 'None'}

Respond in ${lang}. Structure:
1. **Health Assessment** - Brief assessment
2. **This Week** - 2-3 actionable items
3. **Seasonal Tips** - For ${season}
4. **Warning** - Any concerns (or "none")

Keep it concise (max 250 words), practical, with emoji.`

      // Call Gemini directly
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }),
        }
      )

      if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
      const data = await response.json()
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response'
      setInsights(aiText)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    if (!insights && !loading) fetchInsights()
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 right-6 bg-purple-600 hover:bg-purple-700 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl transition-colors z-40"
        title={t('common.edit')}
      >
        🤖
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4" onClick={() => setOpen(false)}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="text-base font-semibold text-purple-700">AI Mentor</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="text-xs text-purple-600 hover:text-purple-800 border border-purple-200 px-2 py-1 rounded-lg disabled:opacity-50"
            >
              🔄
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">מנתח את העץ שלך...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {insights && !loading && (
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap" dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
              {insights.split('\n').map((line, i) => {
                // Bold headers (markdown-like)
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <h4 key={i} className="text-sm font-bold text-purple-800 mt-3 mb-1">{line.replace(/\*\*/g, '')}</h4>
                }
                if (line.match(/^\d+\.\s*\*\*/)) {
                  const clean = line.replace(/\*\*/g, '')
                  return <h4 key={i} className="text-sm font-bold text-purple-800 mt-3 mb-1">{clean}</h4>
                }
                if (line.startsWith('- ') || line.startsWith('• ')) {
                  return <p key={i} className="text-xs text-gray-600 mr-3 mb-1">{line}</p>
                }
                if (line.trim() === '') return <br key={i} />
                return <p key={i} className="text-xs text-gray-700 mb-1">{line}</p>
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AiInsightsPanel
