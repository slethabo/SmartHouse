import questionnaire from '../demo/consultation.json';
import { validateAnswers } from '../demo/validation';

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function abort(signal) { if (signal?.aborted) throw new DOMException('Aborted', 'AbortError'); }
function normalizeBrief(row) {
  return { ...row, brief: { answers: row.answers, siteAreaM2: Number(row.site_width_m) * Number(row.site_depth_m), currency: row.currency, stage: 'schematic prototype' } };
}
/** Translate database failures without displaying credentials or SQL internals. */
async function unwrap(builder, signal) {
  abort(signal);
  const result = await (signal ? builder.abortSignal(signal) : builder);
  abort(signal);
  if (!result.error) return result.data;
  const { code } = result.error;
  if (code === '40001') fail('This draft changed elsewhere. Reload before saving or confirming.', 409);
  if (code === 'PGRST116') fail('Project not found in this cloud workspace.', 404);
  if (['42P01', 'PGRST202', 'PGRST205', '42883'].includes(code)) fail('The SmartHouse database setup is incomplete. Run supabase/schema.sql once in your new Supabase project, then retry.', 503);
  if (code === '42501') fail('Your cloud session does not have access to this project. Check the installed RLS policies.', 403);
  if (code === '22023' || code === '23514') fail('The saved answers could not be confirmed. Check required choices, plot dimensions, budget and room counts.', 400);
  fail('The cloud request could not be completed. Check your connection and try again.', 503);
}

/** Existing screen contract backed by Supabase UUIDs, RLS and revision-aware RPCs. */
export function createSupabaseProjects(client, ensureSession) {
  return async function cloudRequest(path, { method = 'GET', body, signal } = {}) {
    abort(signal);
    if (path === '/consultation/config') return { data: questionnaire, message: 'OK' };
    await ensureSession();
    abort(signal);
    let data;
    let message = 'OK';
    if (path === '/projects') {
      if (method === 'POST') {
        const title = body?.title?.trim();
        if (!title || title.length > 120) fail('Give your project a name of up to 120 characters.');
        // Ownership comes from auth.uid(); never accept owner_id from a caller.
        data = await unwrap(client.from('projects').insert({ title }).select('id,title,created_at,status').single(), signal);
        message = 'Project saved to your cloud workspace.';
      } else if (method === 'GET') {
        data = { items: await unwrap(client.from('projects').select('id,title,created_at,status').eq('status', 'active').order('created_at', { ascending: false }), signal) };
      } else fail('Unsupported project operation.', 405);
    } else {
      const match = path.match(/^\/projects\/([0-9a-f-]{36})(?:\/(consultation|briefs))?$/i);
      if (!match) fail('Project not found in this cloud workspace.', 404);
      const [, id, section] = match;
      if (section === 'consultation' && method === 'PUT') {
        validateAnswers(body?.answers || {});
        data = await unwrap(client.rpc('save_consultation_draft', {
          p_project_id: id, p_expected_revision: body?.expectedRevision, p_answers: body?.answers,
        }), signal);
        message = 'Progress saved to Supabase.';
      } else if (section === 'briefs' && method === 'POST') {
        if (body?.acknowledged !== true) fail('Confirm your answers before creating the concept.');
        const draft = await unwrap(client.from('consultation_drafts').select('*').eq('project_id', id).single(), signal);
        if (draft.revision !== body.draftRevision) fail('This draft changed elsewhere. Reload before confirming.', 409);
        validateAnswers(draft.answers, true);
        data = normalizeBrief(await unwrap(client.rpc('confirm_design_brief', {
          p_project_id: id, p_draft_revision: body.draftRevision, p_acknowledged: true,
        }), signal));
        message = 'Brief confirmed and saved to Supabase.';
      } else if (method === 'GET' && section === 'consultation') {
        data = await unwrap(client.from('consultation_drafts').select('*').eq('project_id', id).single(), signal);
      } else if (method === 'GET' && section === 'briefs') {
        data = { items: (await unwrap(client.from('design_briefs').select('*').eq('project_id', id).order('version', { ascending: false }), signal)).map(normalizeBrief) };
      } else if (method === 'GET' && !section) {
        const project = await unwrap(client.from('projects').select('id,title,created_at,status').eq('id', id).single(), signal);
        const [draft, briefs] = await Promise.all([
          unwrap(client.from('consultation_drafts').select('*').eq('project_id', id).single(), signal),
          unwrap(client.from('design_briefs').select('*').eq('project_id', id).order('version', { ascending: false }), signal),
        ]);
        data = { project, draft, briefs: briefs.map(normalizeBrief) };
      } else fail('Unsupported project operation.', 405);
    }
    return { data, message };
  };
}
