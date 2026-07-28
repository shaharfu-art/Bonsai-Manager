// Script to add new bonsai species to the database
// Run: node scripts/add-species.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually
const envPath = resolve(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const [key, ...val] = line.split('=')
  if (key && val.length) env[key.trim()] = val.join('=').trim()
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
)

const newSpecies = [
  { name_he: 'ברוש ביצות', name_en: 'Bald Cypress', name_latin: 'Taxodium distichum', type: 'deciduous' },
  { name_he: 'פיקוס נריפוליה', name_en: 'Willow Leaf Fig', name_latin: 'Ficus neriifolia', type: 'tropical' },
  { name_he: 'שקמה', name_en: 'Sycamore Fig', name_latin: 'Ficus sycomorus', type: 'tropical' },
  { name_he: 'אוג', name_en: 'Sumac', name_latin: 'Rhus coriaria', type: 'deciduous' },
  { name_he: 'ליגיסטריום', name_en: 'Privet', name_latin: 'Ligustrum sinense', type: 'temperate' },
  { name_he: 'ינבוט', name_en: 'Jujube', name_latin: 'Ziziphus spina-christi', type: 'tropical' },
  { name_he: 'שיטה', name_en: 'Acacia', name_latin: 'Vachellia tortilis', type: 'tropical' },
  { name_he: 'זלקובה', name_en: 'Japanese Zelkova', name_latin: 'Zelkova serrata', type: 'deciduous' },
  { name_he: 'עץ שמן', name_en: 'Chinese Tallow', name_latin: 'Triadica sebifera', type: 'deciduous' },
  { name_he: "ג'יראף", name_en: 'Giraffe Thorn', name_latin: 'Vachellia erioloba', type: 'tropical' },
  { name_he: 'פלפלון', name_en: 'Brazilian Pepper Tree', name_latin: 'Schinus terebinthifolia', type: 'tropical' },
  { name_he: 'מללויקה', name_en: 'Melaleuca', name_latin: 'Melaleuca alternifolia', type: 'tropical' },
  { name_he: 'גודגדן', name_en: 'Hawthorn', name_latin: 'Crataegus monogyna', type: 'deciduous' },
  { name_he: 'פרוקרפוס', name_en: 'Yellowwood', name_latin: 'Podocarpus macrophyllus', type: 'conifer' },
  { name_he: 'מסנס', name_en: 'Mesquite', name_latin: 'Prosopis juliflora', type: 'tropical' },
  { name_he: 'ברוש דליל / אטלנטי', name_en: 'Atlantic Cedar', name_latin: 'Cedrus atlantica', type: 'conifer' },
  { name_he: 'רוזמרין', name_en: 'Rosemary', name_latin: 'Salvia rosmarinus', type: 'temperate' },
]

async function main() {
  console.log('Fetching existing species...')
  const { data: existing, error: fetchErr } = await supabase
    .from('species')
    .select('name_he, name_en, name_latin')

  if (fetchErr) {
    console.error('Failed to fetch existing species:', fetchErr.message)
    process.exit(1)
  }

  const existingNames = new Set([
    ...(existing || []).map(s => s.name_he?.toLowerCase()),
    ...(existing || []).map(s => s.name_en?.toLowerCase()),
    ...(existing || []).map(s => s.name_latin?.toLowerCase()),
  ])

  const toAdd = newSpecies.filter(s => 
    !existingNames.has(s.name_he.toLowerCase()) &&
    !existingNames.has(s.name_en.toLowerCase()) &&
    !existingNames.has(s.name_latin.toLowerCase())
  )

  if (toAdd.length === 0) {
    console.log('No new species to add - all already exist!')
    return
  }

  console.log(`Adding ${toAdd.length} new species (skipping ${newSpecies.length - toAdd.length} duplicates):`)
  toAdd.forEach(s => console.log(`  + ${s.name_he} (${s.name_en}) - ${s.name_latin}`))

  const { data, error } = await supabase
    .from('species')
    .insert(toAdd.map(s => ({ ...s, is_system: true })))
    .select()

  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log(`\n✅ Successfully added ${data.length} species!`)
}

main()
