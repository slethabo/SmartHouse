import catalogue from './plans.json';
import questionnaire from './consultation.json';
import { estimateAllLevels } from './estimator';
import { recommend } from './engine';

const STORAGE_KEY = 'smarthouse.frontend-prototype.v1';
const now = () => new Date().toISOString();
const nextId = (items) => Math.max(0, ...items.map((item) => item.id)) + 1;
function fail(message, status = 400, fields = {}) {
  const error = new Error(message);
  error.status = status; error.fields = fields;
  throw error;
}
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); }
    catch { fail('Saved demo data could not be read. Your browser data has not been overwritten.'); }
  }
  return { projects: [], plans: structuredClone(catalogue), saved: [], rates: { basic: 9500, standard: 12500, premium: 17000 }, lastSearch: null };
}
function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { fail('Your browser could not save this project. Check browser storage permissions or available space.'); }
}
function validate(answers, complete = false) {
  const errors = {};
  for (const q of questionnaire.steps.flatMap((s) => s.questions)) {
    if (q.when && answers[q.when.key] !== q.when.value) continue;
    const value = answers[q.key];
    if (value === undefined || value === '') { if (complete && q.required) errors[q.key] = 'Please answer this question.'; continue; }
    if (q.type === 'number' && (!Number.isFinite(value) || value < q.min || value > q.max || (!['width', 'length'].includes(q.key) && !Number.isInteger(value)))) errors[q.key] = `Enter a number from ${q.min} to ${q.max}.`;
    if (q.options && !q.options.includes(value)) errors[q.key] = 'Choose an available option.';
    if (typeof value === 'string' && value.length > 2000) errors[q.key] = 'Keep this answer under 2,000 characters.';
  }
  if (Object.keys(errors).length) fail('Please check the highlighted answers.', 400, errors);
  if (complete && (answers.shape !== 'Rectangular' || answers.terrain === 'Sloped')) fail('For this prototype, choose a rectangular, flat plot. You can still save your draft.');
}

/** Local demo operations only. No network, API server, or database is used. */
export async function prototypeRequest(path, { method = 'GET', body, query = {}, signal } = {}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const state = load();
  let data;
  let message = 'OK';
  let changed = false;
  const projectMatch = path.match(/^\/projects\/(\d+)(?:\/(consultation|briefs))?$/);
  const planMatch = path.match(/^\/(?:admin\/)?plans\/(\d+)(?:\/(save|active))?$/);
  const enriched = (p) => ({ ...p, is_saved: state.saved.includes(p.id), cost: estimateAllLevels(p.floor_area_m2, state.rates) });
  if (path === '/consultation/config') data = questionnaire;
  else if (path === '/projects') {
    if (method === 'POST') {
      const title = body?.title?.trim();
      if (!title || title.length > 120) fail('Give your project a name of up to 120 characters.');
      const project = { id: nextId(state.projects), title, created_at: now(), draft: { revision: 0, answers: {} }, briefs: [] };
      state.projects.unshift(project); data = { id: project.id, title, created_at: project.created_at }; changed = true; message = 'Project created.';
    } else data = { items: state.projects.map(({ id, title, created_at }) => ({ id, title, created_at })) };
  } else if (projectMatch) {
    const project = state.projects.find((p) => p.id === Number(projectMatch[1]));
    if (!project) fail('Project not found in this browser.', 404);
    const section = projectMatch[2];
    if (section === 'consultation' && method === 'PUT') {
      if (body.expectedRevision !== project.draft.revision) fail('This draft changed in another tab. Reload before saving.', 409);
      validate(body.answers);
      project.draft = { revision: project.draft.revision + 1, answers: body.answers };
      data = project.draft; changed = true; message = 'Progress saved on this device.';
    } else if (section === 'briefs' && method === 'POST') {
      if (body.draftRevision !== project.draft.revision) fail('This draft changed. Reload before confirming.', 409);
      if (!body.acknowledged) fail('Confirm your answers before creating the concept.');
      validate(project.draft.answers, true);
      const existing = project.briefs.find((b) => b.draft_revision === body.draftRevision);
      if (existing) data = existing;
      else {
        const answers = Object.fromEntries(questionnaire.steps.flatMap((s) => s.questions).filter((q) => (!q.when || project.draft.answers[q.when.key] === q.when.value) && project.draft.answers[q.key] !== undefined).map((q) => [q.key, project.draft.answers[q.key]]));
        const brief = { id: nextId(project.briefs), project_id: project.id, version: nextId(project.briefs), draft_revision: body.draftRevision, confirmed_at: now(), brief: { answers, siteAreaM2: answers.width * answers.length, currency: 'ZAR', stage: 'schematic prototype' } };
        project.briefs.unshift(brief); data = brief; changed = true;
      }
      message = 'Brief confirmed.';
    } else if (section === 'consultation') data = project.draft;
    else if (section === 'briefs') data = { items: project.briefs };
    else data = { project: { id: project.id, title: project.title, created_at: project.created_at }, draft: project.draft, briefs: project.briefs };
  } else if (path === '/plans' || path === '/admin/plans') {
    if (method === 'POST') {
      data = { ...body, id: nextId(state.plans), is_active: true, created_at: now() }; state.plans.push(data); changed = true; message = 'Demo design added.';
    } else {
      const items = state.plans.filter((p) => (path.startsWith('/admin') || p.is_active) && (!query.search || `${p.name} ${p.description}`.toLowerCase().includes(query.search.toLowerCase())) && (!query.bedrooms || p.bedrooms >= Number(query.bedrooms)) && (!query.floors || p.floors === Number(query.floors)) && (!query.style || p.style === query.style) && (!query.maxArea || p.floor_area_m2 <= Number(query.maxArea)));
      data = { items: items.map(enriched), styles: [...new Set(state.plans.map((p) => p.style))] };
    }
  } else if (path === '/plans/saved') data = { items: state.plans.filter((p) => state.saved.includes(p.id) && p.is_active).map(enriched) };
  else if (planMatch) {
    const id = Number(planMatch[1]); const plan = state.plans.find((p) => p.id === id);
    if (!plan) fail('This demo design is unavailable.', 404);
    if (planMatch[2] === 'save') {
      state.saved = state.saved.filter((p) => p !== id); if (method === 'POST') state.saved.push(id);
      data = { plan_id: id, is_saved: method === 'POST' }; changed = true; message = method === 'POST' ? 'Design saved.' : 'Design removed from saved list.';
    } else if (method === 'DELETE') { state.plans = state.plans.filter((p) => p.id !== id); state.saved = state.saved.filter((p) => p !== id); data = { id }; changed = true; message = 'Demo design deleted.'; }
    else if (method === 'PUT' || method === 'PATCH') { Object.assign(plan, body, { id }); data = plan; changed = true; message = 'Demo design updated.'; }
    else data = { ...enriched(plan), estimate: estimateAllLevels(plan.floor_area_m2, state.rates) };
  } else if (path === '/rates' || path === '/admin/rates') data = { items: Object.entries(state.rates).map(([finish_level, rate_per_m2]) => ({ finish_level, rate_per_m2 })) };
  else if (path.startsWith('/admin/rates/') && method === 'PUT') {
    const level = path.split('/').pop(); const rate = Number(body.rate_per_m2);
    if (!Object.hasOwn(state.rates, level) || !Number.isFinite(rate) || rate <= 0) fail('Enter a positive demo rate.');
    state.rates[level] = rate; data = { finish_level: level, rate_per_m2: rate }; changed = true; message = 'Demo rate updated.';
  } else if (path === '/recommendations/last-search') data = state.lastSearch;
  else if (path === '/recommendations') {
    data = recommend(body, state.plans, state.rates, { estimateAllLevels, maxCoverage: .5 });
    state.lastSearch = { plot_size_m2: body.plotSizeM2, budget: body.budget, created_at: now() }; changed = true;
  } else if (path === '/admin/stats') data = { users: 0, plans: state.plans.length, active_plans: state.plans.filter((p) => p.is_active).length, searches: state.lastSearch ? 1 : 0 };
  else if (path === '/admin/users') data = { items: [] };
  else fail('This action is not part of the frontend prototype.', 404);
  if (changed) persist(state);
  return { data: structuredClone(data), message };
}
