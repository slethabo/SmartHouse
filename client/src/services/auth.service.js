import { getSupabase } from './supabaseClient';
import { createSupabaseAuth } from './supabaseAuth';

function service() {
  const client = getSupabase();
  if (!client) throw new Error('Account authentication requires Supabase. Configure the project .env and restart Vite.');
  return createSupabaseAuth(client, window.location.origin);
}

export const authService = {
  restore: () => service().restore(),
  identity: (session) => service().identity(session),
  login: (payload) => service().login(payload),
  register: (payload) => service().register(payload),
  logout: () => service().logout(),
  resendConfirmation: (email) => service().resendConfirmation(email),
  resetPassword: (email) => service().resetPassword(email),
  updatePassword: (password) => service().updatePassword(password),
};
