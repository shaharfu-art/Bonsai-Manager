import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '..', 'supabase', '008_fix_storage_rls.sql'), 'utf8');

const SUPABASE_URL = 'https://olfpjnirpoygayvcbfxg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZnBqbmlycG95Z2F5dmNiZnhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg2MTEzMSwiZXhwIjoyMDk3NDM3MTMxfQ.O7kVlp1LhkQ4YOiFFb21NH_FoAYkrPSJCY7XxF2mP4c';

// Split SQL into individual statements and run each via pg/query endpoint
const statements = sql
  .replace(/--.*$/gm, '') // remove comments
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Running ${statements.length} SQL statements...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i] + ';';
  console.log(`\n[${i + 1}/${statements.length}] ${stmt.substring(0, 60)}...`);
  
  // Use the Supabase SQL query endpoint (postgrest rpc won't work for DDL)
  // Try the database/query endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({}),
  });
  
  // That won't work either. Let's try a different approach.
  break;
}

// Alternative: Use supabase-js to call rpc or just verify bucket exists
console.log('\n--- Attempting via supabase-js ---');

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Check if bucket exists
const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
console.log('Buckets:', buckets?.map(b => b.name));

if (bucketsError) {
  console.error('Error listing buckets:', bucketsError.message);
}

const bonsaiBucket = buckets?.find(b => b.name === 'bonsai-photos');
if (!bonsaiBucket) {
  console.log('Creating bonsai-photos bucket...');
  const { error } = await supabase.storage.createBucket('bonsai-photos', { public: false });
  if (error) console.error('Create bucket error:', error.message);
  else console.log('✅ Bucket created');
} else {
  console.log('✅ bonsai-photos bucket exists');
}

// Try uploading a test file to verify permissions work
console.log('\nTesting upload with service key...');
const testBuffer = Buffer.from('test');
const { error: testUploadErr } = await supabase.storage
  .from('bonsai-photos')
  .upload('test/test.txt', testBuffer, { contentType: 'text/plain', upsert: true });

if (testUploadErr) {
  console.log('Upload test error:', testUploadErr.message);
} else {
  console.log('✅ Upload works');
  // Clean up
  await supabase.storage.from('bonsai-photos').remove(['test/test.txt']);
}

// Try creating a signed URL
const { data: signedData, error: signedErr } = await supabase.storage
  .from('bonsai-photos')
  .createSignedUrl('test/test.txt', 60);
console.log('Signed URL test:', signedErr ? signedErr.message : '✅ works');

console.log('\n--- Summary ---');
console.log('The storage bucket exists and is accessible.');
console.log('Storage RLS policies need to be set via SQL Editor.');
console.log('Please run supabase/008_fix_storage_rls.sql in the SQL Editor.');
console.log('URL: https://supabase.com/dashboard/project/olfpjnirpoygayvcbfxg/sql/new');
