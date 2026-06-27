import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'

interface AiInsightsPanelProps {
  treeId: string
}

const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({ treeId }) => {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([])

  const fetchInsights = async (userQuestion?: string) => {
    setLoading(true)
    setError('')
    if (!userQuestion) setInsights(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const url = (import.meta.env.VITE_SUPABASE_URL as string).trim()
      const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim()

      const response = await fetch(`${url}/functions/v1/ai-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ tree_id: treeId, language: i18n.language, question: userQuestion }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${response.status}`)
      }

      const data = await response.json()
      if (userQuestion) {
        setChatHistory(prev => [...prev, { role: 'user', text: userQuestion }, { role: 'ai', text: data.insights }])
      } else {
        setInsights(data.insights)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleAsk = () => {
    if (!question.trim()) return
    const q = question.trim()
    setQuestion('')
    fetchInsights(q)
  }

  const handleOpen = () => {
    setOpen(true)
    if (!insights && !loading && chatHistory.length === 0) fetchInsights()
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

          {/* Chat history */}
          {chatHistory.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-700'
                  }`} dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {/* Typing indicator when waiting for AI response */}
              {loading && chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user' && (
                <div>
                  <div className="inline-block bg-gray-100 rounded-xl px-4 py-2">
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Question input */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAsk() }}
              placeholder={i18n.language === 'he' ? 'שאל את היועץ...' : 'Ask the mentor...'}
              disabled={loading}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
              dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AiInsightsPanel
