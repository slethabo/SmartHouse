import { createClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './supabaseConfig';
import { createSessionManager } from './supabaseSession';

let client;
let sessionManager;
export function getCloudConfig() { return readSupabaseConfig(import.meta.env); }
export function usesSupabase() { return Boolean(getCloudConfig()); }
export function getSupabase() {
  const config = getCloudConfig();
  if (!config) return null;
  if (!client) {
    client = createClient(config.url, config.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    sessionManager = createSessionManager(client);
  }
  return client;
}
export async function ensureCloudSession() {
  getSupabase();
  if (!sessionManager) return null;
  return sessionManager();
}
