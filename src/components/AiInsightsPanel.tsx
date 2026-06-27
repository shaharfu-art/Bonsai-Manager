import React, { useState, useRef } from 'react'
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
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; text: string; imageUrl?: string }>>([])
  const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }
  // Cache helpers
  const CACHE_KEY = `ai-insights-${treeId}`
  const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

  const getCachedInsights = (): string | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const { text, timestamp } = JSON.parse(raw)
      if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }
      return text
    } catch {
      return null
    }
  }

  const setCacheInsights = (text: string) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ text, timestamp: Date.now() }))
    } catch { /* ignore quota errors */ }
  }

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY)
  }

  const fetchInsights = async (userQuestion?: string, skipCache = false, imageData?: { base64: string; mimeType: string } | null) => {
    // For initial insights (no question), check cache first
    if (!userQuestion && !skipCache) {
      const cached = getCachedInsights()
      if (cached) {
        setInsights(cached)
        scrollToBottom()
        return
      }
    }

    setLoading(true)
    setError('')
    if (!userQuestion) setInsights(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const url = (import.meta.env.VITE_SUPABASE_URL as string).trim()
      const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim()

      const body: Record<string, unknown> = { tree_id: treeId, language: i18n.language, question: userQuestion }
      if (imageData) {
        body.image = { base64: imageData.base64, mimeType: imageData.mimeType }
      }

      const response = await fetch(`${url}/functions/v1/ai-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${response.status}`)
      }

      const data = await response.json()
      if (userQuestion) {
        setChatHistory(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'user' && last.text === userQuestion) {
            return [...prev, { role: 'ai', text: data.insights }]
          }
          return [...prev, { role: 'user', text: userQuestion }, { role: 'ai', text: data.insights }]
        })
        scrollToBottom()
      } else {
        setInsights(data.insights)
        setCacheInsights(data.insights)
        scrollToBottom()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleAsk = () => {
    if (!question.trim() && !attachedImage) return
    const q = question.trim()
    const img = attachedImage
    setQuestion('')
    setAttachedImage(null)
    setChatHistory(prev => [...prev, { role: 'user', text: q || (i18n.language === 'he' ? '📷 תמונה' : '📷 Image'), imageUrl: img?.preview }])
    scrollToBottom()
    fetchInsights(q || (i18n.language === 'he' ? 'מה אתה רואה בתמונה? תן המלצות.' : 'What do you see in this image? Give recommendations.'), false, img)
  }

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // result format: "data:<mimeType>;base64,<data>"
      const [header, base64] = result.split(',')
      const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/jpeg'
      setAttachedImage({ base64, mimeType, preview: result })
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be selected again
    if (imageInputRef.current) imageInputRef.current.value = ''
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
              onClick={() => { clearCache(); fetchInsights(undefined, true) }}
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {loading && !insights && (
            <div className="flex items-center justify-center py-10">
              <div className="w-10 h-10 border-[3px] border-purple-600 border-t-transparent rounded-full animate-spin" />
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
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="" className="w-32 h-32 object-cover rounded-lg mb-1" />
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {/* Typing indicator when waiting for AI response */}
              {loading && chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user' && (
                <div>
                  <div className="inline-flex items-center bg-gray-100 rounded-xl px-4 py-2.5">
                    <div className="w-5 h-5 border-[2px] border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Question input */}
        <div className="px-4 py-3 border-t border-gray-100">
          {/* Attached image preview */}
          {attachedImage && (
            <div className="mb-2 relative inline-block">
              <img src={attachedImage.preview} alt="" className="w-16 h-16 object-cover rounded-lg border border-purple-200" />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none shadow-sm"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageAttach}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={loading || !!attachedImage}
              className="border border-gray-300 hover:border-purple-400 text-gray-500 hover:text-purple-600 px-2 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
              title={i18n.language === 'he' ? 'צרף תמונה' : 'Attach image'}
            >
              📷
            </button>
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
              disabled={loading || (!question.trim() && !attachedImage)}
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
