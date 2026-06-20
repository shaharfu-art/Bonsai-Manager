/**
 * migrate.mjs – runs combined-migration.sql against Supabase
 * Uses the Management API SQL endpoint with service role key
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://olfpjnirpoygayvcbfxg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZnBqbmlycG95Z2F5dmNiZnhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg2MTEzMSwiZXhwIjoyMDk3NDM3MTMxfQ.O7kVlp1LhkQ4YOiFFb21NH_FoAYkrPSJCY7XxF2mP4c';
const PROJECT_REF = 'olfpjnirpoygayvcbfxg';

const sqlPath = join(__dirname, '..', 'supabase', 'combined-migration.sql');
const sql = readFileSync(sqlPath, 'utf8');

console.log('Running migrations against Supabase...');
console.log(`Project: ${PROJECT_REF}`);
console.log('');

// Use Supabase Management API to run SQL
const response = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  }
);

if (response.ok) {
  const result = await response.json();
  console.log('✅ Migrations completed successfully!');
  console.log(JSON.stringify(result, null, 2));
} else {
  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(text);
  
  // Try alternative: run via pg REST endpoint
  console.log('\nTrying alternative endpoint...');
  const resp2 = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/query`,
    {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    }
  );
  console.log(`Alt status: ${resp2.status}`);
  console.log(await resp2.text());
}
