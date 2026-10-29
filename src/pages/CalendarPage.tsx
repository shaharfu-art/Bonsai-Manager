import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useAllTreatments, type CalendarTreatment } from '../hooks/useAllTreatments'

const TREATMENT_ICONS: Record<string, string> = {
  watering: '💧', fertilizing: '🌱', branch_pruning: '✂️', root_pruning: '🌿',
  wiring: '🔧', wire_removal: '🔓', repotting: '🪴', pest_treatment: '🐛',
  shading: '⛱️', sun_exposure: '☀️', winter_dormancy: '❄️', other: '📝',
}

type ViewMode = 'week' | 'month' | 'year'

// ─── Date helpers (local, no external deps) ───
const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x }
const addYears = (d: Date, n: number) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x }
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const CalendarPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRtl = i18n.language === 'he'
  const locale = isRtl ? 'he-IL' : 'en-US'

  const { treatments, loading } = useAllTreatments()
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(new Date())

  // Group treatments by date key for fast lookup
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarTreatment[]>()
    for (const t of treatments) {
      const key = t.treatment_date.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [treatments])

  const todayDate = new Date()

  const goPrev = () => setCursor(c => view === 'week' ? addDays(c, -7) : view === 'month' ? addMonths(c, -1) : addYears(c, -1))
  const goNext = () => setCursor(c => view === 'week' ? addDays(c, 7) : view === 'month' ? addMonths(c, 1) : addYears(c, 1))
  const goToday = () => setCursor(new Date())

  // ─── Header title per view ───
  const headerTitle = useMemo(() => {
    if (view === 'year') return String(cursor.getFullYear())
    if (view === 'month') return cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    const ws = startOfWeek(cursor)
    const we = addDays(ws, 6)
    return `${ws.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`
  }, [view, cursor, locale])

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date())
    return Array.from({ length: 7 }, (_, i) => addDays(base, i).toLocaleDateString(locale, { weekday: 'short' }))
  }, [locale])

  return (
    <Layout>
      <div className="max-w-5xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            📅 {isRtl ? 'לוח שנה' : 'Calendar'}
          </h1>
          {/* View switcher */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['week', 'month', 'year'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? 'bg-[#2d6a4f] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {v === 'week' ? (isRtl ? 'שבוע' : 'Week') : v === 'month' ? (isRtl ? 'חודש' : 'Month') : (isRtl ? 'שנה' : 'Year')}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={goPrev} className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-600 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-gray-800">{headerTitle}</span>
            <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-[#2d6a4f] border border-green-200 hover:bg-green-100 font-medium">
              {isRtl ? 'היום' : 'Today'}
            </button>
          </div>
          <button onClick={goNext} className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-600 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} /></svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {view === 'month' && <MonthView cursor={cursor} byDate={byDate} weekdayLabels={weekdayLabels} today={todayDate} onItemClick={(tid) => navigate(`/trees/${tid}`)} isRtl={isRtl} />}
            {view === 'week' && <WeekView cursor={cursor} byDate={byDate} today={todayDate} locale={locale} onItemClick={(tid) => navigate(`/trees/${tid}`)} t={t} />}
            {view === 'year' && <YearView cursor={cursor} byDate={byDate} locale={locale} onMonthClick={(m) => { setCursor(new Date(cursor.getFullYear(), m, 1)); setView('month') }} />}
          </>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 text-xs text-gray-500 justify-center">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> {isRtl ? 'מתוכנן' : 'Scheduled'}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2d6a4f]" /> {isRtl ? 'בוצע' : 'Completed'}</span>
        </div>
      </div>
    </Layout>
  )
}

// ─── Month view ───
const MonthView: React.FC<{
  cursor: Date
  byDate: Map<string, CalendarTreatment[]>
  weekdayLabels: string[]
  today: Date
  onItemClick: (treeId: string) => void
  isRtl: boolean
}> = ({ cursor, byDate, weekdayLabels, today, onItemClick }) => {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1)
  const gridStart = startOfWeek(firstDay)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {weekdayLabels.map((w, i) => (
          <div key={i} className="py-2 text-center text-[11px] font-semibold text-gray-500">{w}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === month
          const items = byDate.get(toKey(day)) ?? []
          const isToday = sameDay(day, today)
          return (
            <div key={i} className={`min-h-[76px] border-b border-r border-gray-50 p-1 ${inMonth ? 'bg-white' : 'bg-gray-50/50'}`}>
              <div className={`text-[11px] mb-0.5 flex items-center justify-center w-5 h-5 rounded-full ${isToday ? 'bg-[#2d6a4f] text-white font-bold' : inMonth ? 'text-gray-600' : 'text-gray-300'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map(it => (
                  <button
                    key={it.id}
                    onClick={() => onItemClick(it.tree_id)}
                    className={`w-full text-[9px] leading-tight px-1 py-0.5 rounded truncate text-right flex items-center gap-0.5 ${it.status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-[#2d6a4f]'}`}
                    title={`${TREATMENT_ICONS[it.treatment_type] ?? ''} ${it.tree_name}`}
                  >
                    <span>{TREATMENT_ICONS[it.treatment_type] ?? '📝'}</span>
                    <span className="truncate">{it.tree_name}</span>
                  </button>
                ))}
                {items.length > 3 && (
                  <div className="text-[9px] text-gray-400 text-center">+{items.length - 3}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week view ───
const WeekView: React.FC<{
  cursor: Date
  byDate: Map<string, CalendarTreatment[]>
  today: Date
  locale: string
  onItemClick: (treeId: string) => void
  t: (k: string) => string
}> = ({ cursor, byDate, today, locale, onItemClick, t }) => {
  const ws = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))

  return (
    <div className="space-y-2">
      {days.map((day, i) => {
        const items = byDate.get(toKey(day)) ?? []
        const isToday = sameDay(day, today)
        return (
          <div key={i} className={`bg-white rounded-xl shadow-sm border p-3 ${isToday ? 'border-[#2d6a4f] ring-1 ring-[#2d6a4f]/20' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${isToday ? 'text-[#2d6a4f]' : 'text-gray-700'}`}>
                {day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
              {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-[#2d6a4f] font-medium">{locale.startsWith('he') ? 'היום' : 'Today'}</span>}
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-gray-300">—</p>
            ) : (
              <div className="space-y-1.5">
                {items.map(it => (
                  <button
                    key={it.id}
                    onClick={() => onItemClick(it.tree_id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm ${it.status === 'pending' ? 'bg-amber-50 hover:bg-amber-100' : 'bg-green-50 hover:bg-green-100'}`}
                  >
                    <span className="text-base">{TREATMENT_ICONS[it.treatment_type] ?? '📝'}</span>
                    <span className="font-medium text-gray-800">{it.tree_name}</span>
                    <span className="text-gray-500 text-xs">· {t(`treatment.${it.treatment_type}`)}</span>
                    {it.status === 'pending' && <span className="ml-auto text-[10px] text-amber-700">🔔</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Year view ───
const YearView: React.FC<{
  cursor: Date
  byDate: Map<string, CalendarTreatment[]>
  locale: string
  onMonthClick: (month: number) => void
}> = ({ cursor, byDate, locale, onMonthClick }) => {
  const year = cursor.getFullYear()
  // Count items per month
  const counts = useMemo(() => {
    const arr = Array(12).fill(0)
    for (const [key, items] of byDate) {
      const d = new Date(key)
      if (d.getFullYear() === year) arr[d.getMonth()] += items.length
    }
    return arr
  }, [byDate, year])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, m) => {
        const monthName = new Date(year, m, 1).toLocaleDateString(locale, { month: 'long' })
        const count = counts[m]
        return (
          <button
            key={m}
            onClick={() => onMonthClick(m)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:border-[#2d6a4f] hover:shadow-md transition-all"
          >
            <div className="text-sm font-semibold text-gray-700 mb-1">{monthName}</div>
            {count > 0 ? (
              <div className="inline-flex items-center gap-1 text-xs text-[#2d6a4f] bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
                {count}
              </div>
            ) : (
              <div className="text-xs text-gray-300">—</div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default CalendarPage
