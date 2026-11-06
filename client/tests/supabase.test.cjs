const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');
const bundle = buildSync({ stdin: { contents: 'export * from "./supabaseConfig.js"; export * from "./supabaseSession.js"; export * from "./supabaseProjects.js";', resolveDir: path.join(__dirname, '../src/services'), sourcefile: 'supabase-test-entry.js' }, bundle: true, platform: 'node', format: 'cjs', write: false });
const compiled = new Module(__filename);
compiled._compile(bundle.outputFiles[0].text, __filename);
const { readSupabaseConfig, createSessionManager, createSupabaseProjects } = compiled.exports;
const id = '11111111-1111-4111-8111-111111111111';
const answers = { location: 'Demo', width: 20, length: 30, access: 'South', budget: 1500000, finish: 'Basic', budgetIncludes: ['Labour', 'Materials'], occupants: 4, bedrooms: 3, bathrooms: 2, workFromHome: 'No', guests: 'Rarely', kitchen: 'Open plan', style: 'Modern', privacy: 'No preference', accessibility: 'None stated' };
function fakeClient(responses) {
  const calls = [];
  const client = {};
  function builder(kind, name, args) {
    const call = { kind, name, args, steps: [] };
    calls.push(call);
    const result = responses.shift();
    assert.ok(result, `Unexpected ${kind} ${name}`);
    const chain = { then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
    for (const method of ['select', 'insert', 'eq', 'order', 'single', 'abortSignal']) chain[method] = (...values) => { call.steps.push([method, ...values]); return chain; };
    return chain;
  }
  client.from = (name) => builder('from', name);
  client.rpc = (name, args) => builder('rpc', name, args);
  return { client, calls };
}
const ok = (data) => ({ data, error: null });

test('configuration loads public keys, supports local mode and rejects partial/privileged configuration', () => {
  assert.equal(readSupabaseConfig({}), null);
  assert.equal(readSupabaseConfig({ VITE_DATA_SOURCE: 'local', VITE_SUPABASE_URL: 'wrong' }), null);
  assert.deepEqual(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://demo.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo' }), { url: 'https://demo.supabase.co', key: 'sb_publishable_demo' });
  for (const env of [
    { VITE_DATA_SOURCE: 'supabase' },
    { VITE_SUPABASE_URL: 'https://demo.supabase.co' },
    { VITE_SUPABASE_URL: 'http://demo.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo' },
    { VITE_SUPABASE_URL: 'https://demo.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_bad' },
    { VITE_SUPABASE_URL: 'https://demo.supabase.co', VITE_SUPABASE_ANON_KEY: `e30.${Buffer.from('{"role":"service_role"}').toString('base64url')}.signature` },
  ]) assert.throws(() => readSupabaseConfig(env));
});
test('parallel requests share session restore without creating anonymous accounts', async () => {
  let restores = 0;
  const session = { user: { id } };
  const client = { auth: { getSession: async () => { restores++; return ok({ session }); } } };
  const ensure = createSessionManager(client);
  assert.deepEqual(await Promise.all([ensure(), ensure(), ensure()]), [session, session, session]);
  assert.equal(restores, 1);
});
test('missing and anonymous sessions require login and can recover after account sign-in', async () => {
  const client = { auth: { getSession: async () => ok({ session: null }) } };
  const ensure = createSessionManager(client);
  await assert.rejects(ensure(), (e) => e.status === 401);
  client.auth.getSession = async () => ok({ session: { user: { id, is_anonymous: true } } });
  await assert.rejects(ensure(), (e) => e.status === 401);
  client.auth.getSession = async () => ok({ session: { user: { id } } });
  assert.equal((await ensure()).user.id, id);
});
test('cloud project create lets auth.uid assign ownership and lists only active projects', async () => {
  const project = { id, title: 'Our home' };
  const { client, calls } = fakeClient([ok(project), ok([project])]);
  let sessions = 0;
  const request = createSupabaseProjects(client, async () => { sessions++; });
  assert.deepEqual((await request('/projects', { method: 'POST', body: { title: ' Our home ', owner_id: 'attacker' } })).data, project);
  assert.deepEqual(calls[0].steps.find(([step]) => step === 'insert')[1], { title: 'Our home' });
  assert.deepEqual((await request('/projects')).data.items, [project]);
  assert.ok(calls[1].steps.some(([step, key, value]) => step === 'eq' && key === 'status' && value === 'active'));
  assert.equal(sessions, 2);
});
test('draft saves use the revision RPC and conflicts never report success', async () => {
  const { client, calls } = fakeClient([ok({ revision: 2, answers }), { error: { code: '40001' } }]);
  const request = createSupabaseProjects(client, async () => {});
  const options = { method: 'PUT', body: { expectedRevision: 1, answers } };
  assert.equal((await request(`/projects/${id}/consultation`, options)).data.revision, 2);
  assert.deepEqual(calls[0].args, { p_project_id: id, p_expected_revision: 1, p_answers: answers });
  await assert.rejects(request(`/projects/${id}/consultation`, options), (error) => error.status === 409);
  assert.ok(calls.every((call) => call.kind === 'rpc'));
});
test('confirm RPC keeps UUIDs and maps stored briefs to the existing concept view', async () => {
  const row = { id: '22222222-2222-4222-8222-222222222222', project_id: id, version: 1, answers, site_width_m: '20', site_depth_m: '30', currency: 'ZAR' };
  const { client, calls } = fakeClient([ok({ revision: 1, answers }), ok(row), ok({ id, title: 'Our home' }), ok({ revision: 1, answers }), ok([row])]);
  const request = createSupabaseProjects(client, async () => {});
  const result = await request(`/projects/${id}/briefs`, { method: 'POST', body: { draftRevision: 1, acknowledged: true } });
  assert.deepEqual(result.data.brief.answers, answers);
  assert.equal(result.data.brief.siteAreaM2, 600);
  assert.equal(calls[1].name, 'confirm_design_brief');
  assert.equal(calls[1].args.p_draft_revision, 1);
  const reopened = (await request(`/projects/${id}`)).data;
  assert.equal(reopened.briefs[0].id, row.id);
});
test('invalid and stale confirmations stop before calling the confirming RPC', async () => {
  const { client, calls } = fakeClient([ok({ revision: 2, answers }), ok({ revision: 1, answers: {} })]);
  const request = createSupabaseProjects(client, async () => {});
  await assert.rejects(request(`/projects/${id}/briefs`, { method: 'POST', body: { draftRevision: 1, acknowledged: false } }), /Confirm your answers/);
  await assert.rejects(request(`/projects/${id}/briefs`, { method: 'POST', body: { draftRevision: 1, acknowledged: true } }), (e) => e.status === 409);
  await assert.rejects(request(`/projects/${id}/briefs`, { method: 'POST', body: { draftRevision: 1, acknowledged: true } }), /highlighted/);
  assert.ok(calls.every((call) => call.kind !== 'rpc'));
});
test('abort, schema failures and ownership denials remain visible', async () => {
  const { client, calls } = fakeClient([{ error: { code: 'PGRST205' } }, { error: { code: '42501' } }]);
  const request = createSupabaseProjects(client, async () => {});
  await assert.rejects(request('/projects'), /setup is incomplete/);
  await assert.rejects(request('/projects'), (e) => e.status === 403);
  await assert.rejects(request('/projects', { signal: AbortSignal.abort() }), (e) => e.name === 'AbortError');
  assert.equal(calls.length, 2);
});
