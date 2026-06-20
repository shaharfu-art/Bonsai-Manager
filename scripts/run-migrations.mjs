/**
 * run-migrations.mjs
 * Runs all SQL migrations against Supabase using the management API.
 * Usage: node scripts/run-migrations.mjs
 *
 * Requires: SUPABASE_DB_PASSWORD env var  OR  direct connection string.
 * We use the Supabase REST /rest/v1/rpc endpoint via the anon key for DDL
 * that is allowed from service role. Since anon key cannot run DDL,
 * we use the Supabase "SQL over HTTP" endpoint available on all projects.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://glnorjgrfwcumrzcqslb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nQ2oZewRYxHfJZoCx8cfeA_whu-PFeF';

// Supabase exposes a SQL-over-HTTP endpoint for service role only.
// The anon key cannot run DDL. We need the SERVICE ROLE key.
// This script will guide the user to get it.

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  Bonsai Manager – Database Migration Runner');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('To run migrations, Supabase needs the SERVICE ROLE key');
console.log('(not the anon/publishable key).');
console.log('');
console.log('The service role key can be found at:');
console.log('  Supabase Dashboard → Settings → API → service_role (secret)');
console.log('');

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.log('❌  SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
  console.log('');
  console.log('Run this script with:');
  console.log('  set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.log('  node scripts/run-migrations.mjs');
  console.log('');
  process.exit(1);
}

const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
const migrations = [
  '001_create_species.sql',
  '002_create_trees.sql',
  '003_create_treatment_logs.sql',
  '004_create_photos.sql',
  '005_create_alert_configs.sql',
];
const seedFile = join(__dirname, '..', 'supabase', 'seed.sql');

async function runSQL(sql, label) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    // Try the pg endpoint
    const resp2 = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!resp2.ok) {
      const text = await resp2.text();
      console.error(`❌  ${label}: HTTP ${resp2.status}`);
      console.error('    ', text.substring(0, 300));
      return false;
    }
  }

  console.log(`✅  ${label}`);
  return true;
}

// Actually, Supabase doesn't expose a public SQL endpoint via anon/service key REST.
// The correct approach is to use the Supabase Management API with a personal access token,
// or to provide the SQL to copy-paste.
// Let's generate a single combined SQL file for easy copy-paste into the SQL editor.

console.log('');
console.log('Generating combined migration SQL file...');
console.log('');

let combined = '-- Bonsai Manager: Combined Migration + Seed\n';
combined += '-- Generated: ' + new Date().toISOString() + '\n';
combined += '-- Copy and paste this entire file into Supabase SQL Editor and click Run\n\n';

for (const file of migrations) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  combined += `-- ════════════════════════════════════════\n`;
  combined += `-- Migration: ${file}\n`;
  combined += `-- ════════════════════════════════════════\n\n`;
  combined += sql + '\n\n';
}

const seed = readFileSync(seedFile, 'utf8');
combined += `-- ════════════════════════════════════════\n`;
combined += `-- Seed Data: 10 Bonsai Species\n`;
combined += `-- ════════════════════════════════════════\n\n`;
combined += seed;

const outputPath = join(__dirname, '..', 'supabase', 'combined-migration.sql');
import { writeFileSync } from 'fs';
writeFileSync(outputPath, combined, 'utf8');

console.log(`✅  Combined SQL file created:`);
console.log(`    ${outputPath}`);
console.log('');
console.log('Next step:');
console.log('  1. Open Supabase Dashboard → SQL Editor');
console.log('  2. Click "New query"');
console.log('  3. Copy-paste the content of: supabase/combined-migration.sql');
console.log('  4. Click "Run"');
console.log('');
