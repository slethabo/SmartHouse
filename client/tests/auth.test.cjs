const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');
const bundle = buildSync({ entryPoints: [path.join(__dirname, '../src/services/supabaseAuth.js')], bundle: true, platform: 'node', format: 'cjs', write: false });
const compiled = new Module(__filename);
compiled._compile(bundle.outputFiles[0].text, __filename);
const { createSupabaseAuth, safeReturnPath } = compiled.exports;
const ok = (data = {}) => ({ data, error: null });
const user = { id: 'user-1', email: 'home@example.test', user_metadata: { full_name: 'Our Home', role: 'admin' } };
test('signup sends display name but no role and handles email confirmation', async () => {
  let sent;
  const service = createSupabaseAuth({ auth: { getSession: async () => ok({ session: null }), signUp: async (input) => { sent = input; return ok({ user, session: null }); } } }, 'https://house.example');
  const result = await service.register({ fullName: ' Our Home ', email: ' home@example.test ', password: 'Password123', role: 'admin' });
  assert.equal(result.needsConfirmation, true);
  assert.deepEqual(sent.options.data, { full_name: 'Our Home' });
  assert.equal(sent.options.emailRedirectTo, 'https://house.example/auth/callback');
  assert.equal(sent.email, 'home@example.test');
});
test('signup with an immediate session can continue into the app', async () => {
  const session = { user };
  const service = createSupabaseAuth({ auth: { getSession: async () => ok({ session: null }), signUp: async () => ok({ user, session }) } }, 'https://house.example');
  const result = await service.register({ fullName: 'Our Home', email: user.email, password: 'Password123' });
  assert.equal(result.needsConfirmation, false);
  assert.equal(result.session, session);
});
test('older anonymous workspaces link email before setting password to retain project ownership', async () => {
  let sent;
  const service = createSupabaseAuth({ auth: { getSession: async () => ok({ session: { user: { ...user, is_anonymous: true } } }), updateUser: async (...args) => { sent = args; return ok({ user }); } } }, 'https://house.example');
  const result = await service.register({ fullName: 'Our Home', email: user.email, password: 'Password123' });
  assert.equal(result.needsConfirmation, true);
  assert.equal(sent[0].password, undefined);
  assert.equal(sent[1].emailRedirectTo, 'https://house.example/auth/reset');
});
test('login passes credentials to Supabase and gives useful credential errors', async () => {
  let sent;
  const client = { auth: { signInWithPassword: async (input) => { sent = input; return ok({ session: { user } }); } } };
  const service = createSupabaseAuth(client, 'https://house.example');
  assert.equal((await service.login({ email: ' home@example.test ', password: 'Password123' })).user.id, user.id);
  assert.equal(sent.email, user.email);
  client.auth.signInWithPassword = async () => ({ error: { code: 'invalid_credentials', status: 400 } });
  await assert.rejects(service.login({ email: user.email, password: 'wrong' }), /incorrect/);
  client.auth.signInWithPassword = async () => ({ error: { code: 'email_not_confirmed', status: 400 } });
  await assert.rejects(service.login({ email: user.email, password: 'Password123' }), /Confirm your email/);
});
test('identity ignores editable admin metadata and uses the protected database role', async () => {
  let role = 'homeowner';
  const client = { from: (table) => {
    assert.equal(table, 'profiles');
    const query = { select: () => query, eq: (column, value) => { assert.equal(column, 'id'); assert.equal(value, user.id); return query; }, single: async () => ok({ id: user.id, full_name: 'Our Home' }) };
    return query;
  }, rpc: async (name) => { assert.equal(name, 'my_role'); return ok(role); } };
  const service = createSupabaseAuth(client, 'https://house.example');
  assert.equal((await service.identity({ user })).role, 'homeowner');
  role = 'admin';
  assert.equal((await service.identity({ user })).role, 'admin');
  client.rpc = async () => ({ error: { code: '42501' } });
  await assert.rejects(service.identity({ user }), /profile could not be loaded/);
  assert.equal(await service.identity({ user: { ...user, is_anonymous: true } }), null);
});
test('password reset, confirmation resend and logout check SDK errors', async () => {
  const calls = [];
  const client = { auth: {
    resetPasswordForEmail: async (...args) => { calls.push(['reset', ...args]); return ok(); },
    updateUser: async (payload) => { calls.push(['update', payload]); return ok(); },
    resend: async (payload) => { calls.push(['resend', payload]); return ok(); },
    signOut: async (options) => { calls.push(['logout', options]); return ok(); },
  } };
  const service = createSupabaseAuth(client, 'https://house.example');
  assert.match(await service.resetPassword(user.email), /If an account exists/);
  assert.equal(calls[0][2].redirectTo, 'https://house.example/auth/reset');
  await service.updatePassword('NewPassword123');
  await service.resendConfirmation(user.email);
  assert.equal(calls[2][1].type, 'signup');
  await service.logout();
  assert.equal(calls[3][1].scope, 'local');
  client.auth.signOut = async () => ({ error: { status: 503 } });
  await assert.rejects(service.logout(), /could not be completed/);
});
test('post-login navigation permits internal paths and rejects external/looping destinations', () => {
  assert.equal(safeReturnPath('/projects/123?mode=brief'), '/projects/123?mode=brief');
  for (const value of [undefined, 'https://other.example', '//other.example', '/\\other.example', '/login', '/auth/reset']) assert.equal(safeReturnPath(value), '/');
});
