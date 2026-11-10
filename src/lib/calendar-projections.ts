export interface CalendarTreatment {
  id: string
  tree_id: string
  tree_name: string
  treatment_date: string
  treatment_type: string
  notes: string | null
  /**
   * pending   - scheduled one-off row in treatment_logs
   * completed - done
   * projected - expected occurrence computed from a recurrence/fixed-date config (alert_configs)
   */
  status: 'pending' | 'completed' | 'projected'
}

export interface AlertConfigRow {
  id: string
  tree_id: string
  treatment_type: string
  interval_days: number | null
  snoozed_until: string | null
  is_manual_only: boolean
}

// How far ahead recurring configs are projected, and a safety cap per config
export const PROJECTION_DAYS = 365
export const MAX_PROJECTIONS_PER_CONFIG = 60

// ─── Local-date helpers (avoid UTC shifts from toISOString) ───
const pad = (n: number) => String(n).padStart(2, '0')
export const fmtLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseLocal = (s: string) => {
  const [y, m, d] = s.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const day = (s: string) => s.split('T')[0]

/**
 * Builds the expected future occurrences for every recurrence / fixed-date config.
 * Mirrors how the dashboard and the push cron compute due dates:
 *   next due = last completed date + interval_days   (interval mode)
 *   next due = snoozed_until                          (fixed-date mode)
 *
 * `now` is injectable for testing.
 */
export function buildProjections(
  configs: AlertConfigRow[],
  logs: CalendarTreatment[],
  treeNames: Map<string, string>,
  now: Date = new Date()
): CalendarTreatment[] {
  const today = parseLocal(fmtLocal(now))
  const todayStr = fmtLocal(today)
  const horizon = addDays(today, PROJECTION_DAYS)
  const out: CalendarTreatment[] = []

  for (const cfg of configs) {
    if (cfg.is_manual_only) continue
    if (!treeNames.has(cfg.tree_id)) continue

    const treeName = treeNames.get(cfg.tree_id) ?? ''
    const sameType = logs.filter(l => l.tree_id === cfg.tree_id && l.treatment_type === cfg.treatment_type)
    const pending = sameType.filter(l => l.status === 'pending')

    const make = (date: Date, i: number): CalendarTreatment => ({
      id: `proj-${cfg.id}-${i}`,
      tree_id: cfg.tree_id,
      tree_name: treeName,
      treatment_date: fmtLocal(date),
      treatment_type: cfg.treatment_type,
      notes: null,
      status: 'projected',
    })

    // Fixed-date reminder: a single occurrence
    if (cfg.snoozed_until) {
      const dateStr = day(cfg.snoozed_until)
      if (pending.some(p => day(p.treatment_date) === dateStr)) continue

      if (dateStr >= todayStr) {
        out.push(make(parseLocal(dateStr), 0))
      } else {
        // Overdue: show it today unless something of this type was done since
        const doneSince = sameType.some(
          l => l.status === 'completed' && day(l.treatment_date) >= dateStr && day(l.treatment_date) <= todayStr
        )
        if (!doneSince) out.push(make(today, 0))
      }
      continue
    }

    // Recurring reminder
    const interval = cfg.interval_days
    if (!interval || interval <= 0) continue

    let next: Date
    if (pending.length > 0) {
      // A scheduled row already represents the upcoming occurrence; project the cycles after the latest one
      const latestPending = pending.map(p => day(p.treatment_date)).sort().pop()!
      next = addDays(parseLocal(latestPending), interval)
    } else {
      const lastDone = sameType
        .filter(l => l.status === 'completed' && day(l.treatment_date) <= todayStr)
        .map(l => day(l.treatment_date))
        .sort()
        .pop()
      next = lastDone ? addDays(parseLocal(lastDone), interval) : today
      if (next < today) next = today // overdue: surface it today
    }

    let i = 0
    while (next <= horizon && i < MAX_PROJECTIONS_PER_CONFIG) {
      out.push(make(next, i))
      next = addDays(next, interval)
      i++
    }
  }

  return out
}
