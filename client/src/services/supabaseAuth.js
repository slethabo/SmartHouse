/** Supabase owns credentials. Roles come only from the protected my_role RPC. */
function check(result) {
  if (!result.error) return result.data;
  const { code, status } = result.error;
  const messages = {
    invalid_credentials: 'The email address or password is incorrect.',
    email_not_confirmed: 'Confirm your email using the link in your inbox, then log in.',
    weak_password: 'Use a stronger password with at least 8 characters, a letter and a number.',
    user_already_exists: 'An account could not be created. Try logging in or resetting your password.',
    signup_disabled: 'Account registration is currently disabled in Supabase.',
    email_provider_disabled: 'Enable the Email provider in Supabase Authentication settings.',
    over_email_send_rate_limit: 'Too many email requests. Please wait before trying again.',
    over_request_rate_limit: 'Too many attempts. Please wait before trying again.',
    same_password: 'Choose a different password from your current one.',
    manual_linking_disabled: 'Linking an older anonymous workspace requires manual linking to be enabled in Supabase Auth settings.',
  };
  const failure = new Error(messages[code] || (status === 400 ? 'Check your account details and try again.' : 'The authentication request could not be completed. Check your connection and try again.'));
  failure.status = status || 503;
  throw failure;
}

export function safeReturnPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/^\/(login|register|auth)(\/|\?|$)/.test(value) ? value : '/';
}

export function createSupabaseAuth(client, origin) {
  return {
    async restore() { return check(await client.auth.getSession()).session; },
    async identity(session) {
      if (!session || session.user.is_anonymous) return null;
      const [profileResult, roleResult] = await Promise.all([
        client.from('profiles').select('id,full_name').eq('id', session.user.id).single(),
        client.rpc('my_role'),
      ]);
      if (profileResult.error || roleResult.error) throw new Error('Your account profile could not be loaded. Check the SmartHouse schema and policies, then try again.');
      return { id: session.user.id, email: session.user.email,
        full_name: profileResult.data.full_name || session.user.user_metadata?.full_name || session.user.email,
        role: roleResult.data === 'admin' ? 'admin' : 'homeowner' };
    },
    async login({ email, password }) {
      return check(await client.auth.signInWithPassword({ email: email.trim(), password })).session;
    },
    async register({ fullName, email, password }) {
      const session = check(await client.auth.getSession()).session;
      if (session?.user.is_anonymous) {
        // Preserve older project ownership: verify email before setting a password.
        check(await client.auth.updateUser({ email: email.trim(), data: { full_name: fullName.trim() } }, { emailRedirectTo: `${origin}/auth/reset` }));
        return { needsConfirmation: true, message: 'Check your email to confirm your address, then choose a password. Your existing projects will stay with this account.' };
      }
      const data = check(await client.auth.signUp({ email: email.trim(), password,
        options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${origin}/auth/callback` } }));
      return { session: data.session, needsConfirmation: !data.session,
        message: data.session ? 'Your account is ready.' : 'Check your email and follow the confirmation link before logging in.' };
    },
    async logout() { check(await client.auth.signOut({ scope: 'local' })); },
    async resendConfirmation(email) {
      check(await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${origin}/auth/callback` } }));
      return 'If your account needs confirmation, a new link has been sent. Check your inbox.';
    },
    async resetPassword(email) {
      check(await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}/auth/reset` }));
      return 'If an account exists for that address, a password reset link has been sent. Check your inbox.';
    },
    async updatePassword(password) { check(await client.auth.updateUser({ password })); },
  };
}
