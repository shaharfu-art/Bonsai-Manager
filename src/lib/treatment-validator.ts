export const TREATMENT_TYPES = [
  'watering', 'fertilizing', 'branch_pruning', 'root_pruning',
  'wiring', 'wire_removal', 'repotting', 'pest_treatment',
  'shading', 'sun_exposure', 'winter_dormancy', 'other'
] as const

export type TreatmentType = typeof TREATMENT_TYPES[number]

export function validateTreatmentType(value: string): value is TreatmentType {
  return TREATMENT_TYPES.includes(value as TreatmentType)
}

export function normalizeTreatmentNotes(notes: string | null | undefined): string {
  if (!notes) return ''
  return notes.trim()
}
