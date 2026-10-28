import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'
import {
  isLightMeterSupported,
  measureWithCamera,
  measureWithSensor,
  getCurrentPeriod,
  categorizeLux,
  categoryLabel,
  categoryEmoji,
} from '../lib/light-meter'

interface LightMeterTabProps {
  treeId: string
}

interface Reading {
  period: 'morning' | 'noon' | 'evening'
  lux: number
  measuredAt: string
}

interface Assessment {
  avgLux: number
  category: string
  assessedAt: string
  aiRecommendation: string | null
}

const LightMeterTab: React.FC<LightMeterTabProps> = ({ treeId }) => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'he'

  const [measuring, setMeasuring] = useState(false)
  const [todayReadings, setTodayReadings] = useState<Reading[]>([])
  const [lastAssessment, setLastAssessment] = useState<Assessment | null>(null)
  const [history, setHistory] = useState<Assessment[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const support = isLightMeterSupported()

  // Load today's readings and last assessment
  useEffect(() => {
    if (!user || !treeId) return
    const today = new Date().toISOString().split('T')[0]

    // Get today's readings
    supabase
      .from('light_readings')
      .select('period, lux_value, measured_at, session_id')
      .eq('tree_id', treeId)
      .eq('user_id', user.id)
      .gte('measured_at', today + 'T00:00:00')
      .order('measured_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSessionId(data[0].session_id)
          setTodayReadings(data.map(r => ({ period: r.period, lux: r.lux_value, measuredAt: r.measured_at })))
        } else {
          setSessionId(crypto.randomUUID())
        }
      })

    // Get last assessment
    supabase
      .from('light_assessments')
      .select('avg_lux, category, assessed_at, ai_recommendation')
      .eq('tree_id', treeId)
      .eq('user_id', user.id)
      .order('assessed_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLastAssessment({
            avgLux: data[0].avg_lux,
            category: data[0].category,
            assessedAt: data[0].assessed_at,
            aiRecommendation: data[0].ai_recommendation,
          })
          setHistory(data.map(d => ({
            avgLux: d.avg_lux,
            category: d.category,
            assessedAt: d.assessed_at,
            aiRecommendation: d.ai_recommendation,
          })))
        }
      })
  }, [user, treeId])

  const handleMeasure = async () => {
    if (!user) return
    setMeasuring(true)
    setError(null)

    try {
      let lux: number
      if (support.method === 'sensor') {
        lux = await measureWithSensor()
      } else {
        lux = await measureWithCamera()
      }

      const period = getCurrentPeriod()

      // Save reading
      await supabase.from('light_readings').insert({
        tree_id: treeId,
        user_id: user.id,
        session_id: sessionId,
        period,
        lux_value: lux,
        method: support.method,
      })

      const newReading: Reading = { period, lux, measuredAt: new Date().toISOString() }
      const updatedReadings = [...todayReadings.filter(r => r.period !== period), newReading]
      setTodayReadings(updatedReadings)

      // If we have all 3 periods, create assessment
      const periods = updatedReadings.map(r => r.period)
      if (periods.includes('morning') && periods.includes('noon') && periods.includes('evening')) {
        const luxValues = updatedReadings.map(r => r.lux)
        const avg = Math.round(luxValues.reduce((a, b) => a + b, 0) / luxValues.length)
        const category = categorizeLux(avg)

        await supabase.from('light_assessments').upsert({
          tree_id: treeId,
          user_id: user.id,
          session_id: sessionId,
          avg_lux: avg,
          max_lux: Math.max(...luxValues),
          min_lux: Math.min(...luxValues),
          category,
          assessed_at: new Date().toISOString().split('T')[0],
        }, { onConflict: 'session_id' })

        setLastAssessment({ avgLux: avg, category, assessedAt: new Date().toISOString().split('T')[0], aiRecommendation: null })
      }
    } catch (err: any) {
      setError(err.message || (isRtl ? 'שגיאה במדידה' : 'Measurement failed'))
    } finally {
      setMeasuring(false)
    }
  }

  // Device not supported
  if (!support.supported) {
    return (
      <div className="text-center py-8 space-y-3">
        <span className="text-4xl">📱</span>
        <p className="text-sm text-gray-600">
          {isRtl
            ? 'המכשיר שלך לא תומך במדידת אור. נדרש טלפון עם מצלמה או חיישן אור.'
            : 'Your device does not support light measurement. A phone with a camera or light sensor is required.'}
        </p>
      </div>
    )
  }

  const periodLabels = {
    morning: isRtl ? 'בוקר' : 'Morning',
    noon: isRtl ? 'צהריים' : 'Noon',
    evening: isRtl ? 'ערב' : 'Evening',
  }

  const periodDone = (p: string) => todayReadings.some(r => r.period === p)
  const currentPeriod = getCurrentPeriod()

  return (
    <div className="space-y-5">
      {/* Measurement slots */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          {isRtl ? '☀️ מדידת אור — היום' : '☀️ Light Measurement — Today'}
        </h3>
        <div className="flex gap-2 mb-4">
          {(['morning', 'noon', 'evening'] as const).map(p => {
            const done = periodDone(p)
            const reading = todayReadings.find(r => r.period === p)
            return (
              <div
                key={p}
                className={`flex-1 rounded-xl p-3 text-center border ${
                  done ? 'bg-green-50 border-green-200' : p === currentPeriod ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <p className="text-xs font-medium text-gray-600">{periodLabels[p]}</p>
                {done ? (
                  <p className="text-sm font-bold text-green-700 mt-1">
                    {reading!.lux.toLocaleString()} lux
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">—</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Measure button */}
        <button
          onClick={handleMeasure}
          disabled={measuring}
          className="w-full bg-[#2d6a4f] hover:bg-[#245a42] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {measuring
            ? (isRtl ? '🔍 מודד...' : '🔍 Measuring...')
            : (isRtl ? `📷 מדוד עכשיו (${periodLabels[currentPeriod]})` : `📷 Measure Now (${periodLabels[currentPeriod]})`)}
        </button>

        {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}

        <p className="text-[10px] text-gray-400 text-center mt-2">
          {isRtl
            ? `שיטת מדידה: ${support.method === 'sensor' ? 'חיישן אור' : 'מצלמה'} • מדוד 3 פעמים ביום לתוצאה מדויקת`
            : `Method: ${support.method === 'sensor' ? 'Light sensor' : 'Camera'} • Measure 3 times daily for accuracy`}
        </p>
      </div>

      {/* Last assessment */}
      {lastAssessment && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            {isRtl ? '📊 הערכה אחרונה' : '📊 Latest Assessment'}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{categoryEmoji(lastAssessment.category)}</span>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {categoryLabel(lastAssessment.category, isRtl)}
              </p>
              <p className="text-xs text-gray-500">
                {isRtl ? 'ממוצע' : 'Average'}: {lastAssessment.avgLux.toLocaleString()} lux • {lastAssessment.assessedAt}
              </p>
            </div>
          </div>
          {lastAssessment.aiRecommendation && (
            <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs text-green-800">🤖 {lastAssessment.aiRecommendation}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!lastAssessment && todayReadings.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            {isRtl
              ? 'בצע 3 מדידות (בוקר, צהריים, ערב) כדי לקבל הערכת אור מלאה'
              : 'Take 3 measurements (morning, noon, evening) for a full light assessment'}
          </p>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            {isRtl ? '📅 היסטוריית מדידות' : '📅 Measurement History'}
          </h3>
          <div className="space-y-2">
            {history.slice(1).map((h, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-lg">{categoryEmoji(h.category)}</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">{categoryLabel(h.category, isRtl)}</p>
                  <p className="text-[10px] text-gray-400">{h.avgLux.toLocaleString()} lux • {h.assessedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help button */}
      <button
        onClick={() => setShowHelp(true)}
        className="w-full text-center text-xs text-[#2d6a4f] hover:underline py-2"
      >
        ℹ️ {isRtl ? 'איך למדוד נכון?' : 'How to measure correctly?'}
      </button>

      {/* Help popup */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">ℹ️ {isRtl ? 'מדריך מדידת אור' : 'Light Measurement Guide'}</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{isRtl ? '📷 איך למדוד' : '📷 How to measure'}</h4>
                <ul className="space-y-1 text-xs">
                  <li>• {isRtl ? 'עמוד ליד העץ, כוון את המצלמה כלפי מעלה' : 'Stand near the tree, point camera upward'}</li>
                  <li>• {isRtl ? 'אל תצלם ישירות לתוך השמש' : "Don't point directly at the sun"}</li>
                  <li>• {isRtl ? 'מדוד 3 פעמים ביום: בוקר (6-10), צהריים (10-15), ערב (15-20)' : 'Measure 3 times: morning (6-10), noon (10-15), evening (15-20)'}</li>
                  <li>• {isRtl ? 'מדוד מאותו מקום בדיוק כל פעם' : 'Measure from the same spot each time'}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{isRtl ? '☀️ ערכים ומשמעות' : '☀️ Values & meaning'}</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>🌑 {isRtl ? 'צל עמוק' : 'Deep shade'}</span><span className="text-gray-400">&lt;500 lux</span></div>
                  <div className="flex justify-between"><span>🌥️ {isRtl ? 'צל' : 'Shade'}</span><span className="text-gray-400">500-2,000</span></div>
                  <div className="flex justify-between"><span>⛅ {isRtl ? 'צל חלקי' : 'Partial shade'}</span><span className="text-gray-400">2,000-10,000</span></div>
                  <div className="flex justify-between"><span>🌤️ {isRtl ? 'אור בהיר עקיף' : 'Bright indirect'}</span><span className="text-gray-400">10,000-25,000</span></div>
                  <div className="flex justify-between"><span>☀️ {isRtl ? 'שמש ישירה' : 'Direct sun'}</span><span className="text-gray-400">25,000-50,000</span></div>
                  <div className="flex justify-between"><span>🔆 {isRtl ? 'שמש מלאה' : 'Full sun'}</span><span className="text-gray-400">&gt;50,000</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{isRtl ? '🌳 מה מתאים לבונסאי' : '🌳 What suits bonsai'}</h4>
                <ul className="space-y-1 text-xs">
                  <li>• {isRtl ? 'ערער, אורן — שמש מלאה 6+ שעות (35,000+)' : 'Juniper, Pine — full sun 6+ hours (35,000+)'}</li>
                  <li>• {isRtl ? 'זית, בוגנוויליה — שמש ישירה 5-6 שעות (25,000-50,000)' : 'Olive, Bougainvillea — direct sun 5-6 hrs (25,000-50,000)'}</li>
                  <li>• {isRtl ? 'אדר, בוקסוס — שמש בוקר + צל אחה"צ (10,000-30,000)' : 'Maple, Boxwood — morning sun + afternoon shade (10,000-30,000)'}</li>
                  <li>• {isRtl ? 'אזליה — צל חלקי, לא שמש ישירה בקיץ (5,000-15,000)' : 'Azalea — partial shade, no direct summer sun (5,000-15,000)'}</li>
                  <li>• {isRtl ? 'פיקוס (פנים) — אור בהיר עקיף 10+ שעות (1,500-10,000)' : 'Ficus (indoor) — bright indirect 10+ hrs (1,500-10,000)'}</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  {isRtl
                    ? '💡 הדיוק תלוי בטלפון. טלפונים חדשים (2022+) מדויקים יותר. התוצאות הן הערכה — לא מדידה מעבדתית.'
                    : '💡 Accuracy depends on your phone. Newer phones (2022+) are more accurate. Results are estimates, not lab measurements.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LightMeterTab
