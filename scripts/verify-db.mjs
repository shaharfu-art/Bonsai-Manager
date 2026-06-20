/**
 * verify-db.mjs – checks that all tables and seed data exist
 */
const SUPABASE_URL = 'https://olfpjnirpoygayvcbfxg.supabase.co';
const ANON_KEY = 'sb_publishable_rrq1jyllJVS4ZuVBLwtZQg_iBko4PZL';

const tables = ['species', 'trees', 'treatment_logs', 'photos', 'alert_configs'];

console.log('Verifying Supabase tables...\n');

for (const table of tables) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer': 'count=exact',
    },
  });
  const count = res.headers.get('content-range');
  const status = res.status;
  if (status === 200 || status === 206) {
    console.log(`✅  ${table} – OK (${count ?? 'accessible'})`);
  } else {
    const body = await res.text();
    console.log(`❌  ${table} – ${status}: ${body.substring(0, 100)}`);
  }
}

// Check species seed data
const speciesRes = await fetch(`${SUPABASE_URL}/rest/v1/species?select=name_he,name_en`, {
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
  },
});
const species = await speciesRes.json();
console.log(`\n🌿  Species in DB: ${Array.isArray(species) ? species.length : 0}`);
if (Array.isArray(species)) {
  species.forEach(s => console.log(`    - ${s.name_he} / ${s.name_en}`));
}
