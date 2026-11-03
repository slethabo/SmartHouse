/** Read only public browser configuration; privileged keys never belong here. */
export function readSupabaseConfig(env = {}) {
  const mode = env.VITE_DATA_SOURCE || 'auto';
  if (!['auto', 'local', 'supabase'].includes(mode)) throw new Error('VITE_DATA_SOURCE must be local or supabase.');
  if (mode === 'local') return null;
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim();
  if (!url && !key && mode === 'auto') return null;
  if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the project .env file, then restart Vite.');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('VITE_SUPABASE_URL must be your Supabase project URL.'); }
  if (!['https:', 'http:'].includes(parsed.protocol) || (parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('Use an HTTPS Supabase project URL, or HTTP for local development.');
  }
  if (key.startsWith('sb_secret_')) throw new Error('Use a Supabase publishable key in Vite, never a secret or service-role key.');
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'service_role') throw new Error('Use the anon key, never a service-role key, in Vite.');
    } catch (error) {
      if (error.message.includes('service-role')) throw error;
      throw new Error('The Supabase anon key is not a valid JWT. Copy the publishable or anon key from Supabase.');
    }
  } else if (!key.startsWith('sb_publishable_')) {
    throw new Error('Use the publishable or legacy anon key from Supabase, not a database password.');
  }
  return { url: parsed.origin, key };
}
