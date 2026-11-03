import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from '../client/src/services/supabaseConfig.js';
import { createSessionManager } from '../client/src/services/supabaseSession.js';

// Reads the same root .env files as Vite. Never logs connection values or tokens.
const root = fileURLToPath(new URL('../', import.meta.url));
try {
  const config = readSupabaseConfig({ ...loadEnv('development', root, 'VITE_'), VITE_DATA_SOURCE: 'supabase' });
  const client = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) },
  });
  const response = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Supabase rejected the project URL or public key. Check the saved .env values.');
  const settings = await response.json();
  if (settings.external?.email === false) throw new Error('Enable the Email provider in Supabase Authentication settings.');
  console.log('PASS Supabase connection and Email authentication settings');
  const credentials = loadEnv('development', root, 'SUPABASE_TEST_');
  if (!credentials.SUPABASE_TEST_EMAIL || !credentials.SUPABASE_TEST_PASSWORD) {
    console.log('Account/table checks require SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD in the ignored .env. No account was created.');
    process.exit(0);
  }
  const { error: loginError } = await client.auth.signInWithPassword({ email: credentials.SUPABASE_TEST_EMAIL, password: credentials.SUPABASE_TEST_PASSWORD });
  if (loginError) throw new Error('The connection check account could not log in. Check its credentials and email confirmation.');
  await createSessionManager(client)();
  console.log('PASS account sign-in');
  for (const table of ['projects', 'consultation_drafts', 'design_briefs', 'pricing_releases']) {
    const { error } = await client.from(table).select('*').limit(1);
    if (error) throw new Error(`Could not read ${table}. Check schema.sql installation and RLS policies.`);
    console.log(`PASS ${table} access`);
  }
  await client.auth.signOut({ scope: 'local' });
  console.log('Connection check completed. No accounts or project records were created or changed.');
} catch (error) {
  console.error('Supabase check failed:', error.message);
  process.exitCode = 1;
}
