const db = require('../../db/connection');
const { notFound, AppError } = require('../../utils/errors');
const { buildBrief } = require('./consultation');

async function owned(projectId, userId, query = db.query) {
  const { rows } = await query('SELECT * FROM projects WHERE id=$1 AND owner_id=$2', [projectId, userId]);
  if (!rows[0]) throw notFound('Project not found.');
  return rows[0];
}
async function list(userId) {
  const { rows } = await db.query('SELECT * FROM projects WHERE owner_id=$1 ORDER BY created_at DESC, id DESC', [userId]);
  return { items: rows };
}
async function create(userId, title) {
  return db.transaction(async (client) => {
    const { rows } = await client.query('INSERT INTO projects(owner_id,title) VALUES($1,$2) RETURNING *', [userId, title]);
    await client.query('INSERT INTO consultation_drafts(project_id) VALUES($1)', [rows[0].id]);
    return rows[0];
  });
}
async function detail(projectId, userId) {
  const project = await owned(projectId, userId);
  const draft = await db.query('SELECT revision,answers FROM consultation_drafts WHERE project_id=$1', [projectId]);
  const briefs = await db.query('SELECT * FROM design_briefs WHERE project_id=$1 ORDER BY version DESC', [projectId]);
  return { project, draft: draft.rows[0], briefs: briefs.rows };
}
async function save(projectId, userId, { expectedRevision, answers }) {
  await owned(projectId, userId);
  const { rows } = await db.query('UPDATE consultation_drafts SET answers=$1,revision=revision+1,updated_at=NOW() WHERE project_id=$2 AND revision=$3 RETURNING revision,answers', [JSON.stringify(answers), projectId, expectedRevision]);
  if (!rows[0]) throw new AppError('This draft changed. Reload the project before saving again.', 409, { code: 'STALE_REVISION' });
  return rows[0];
}
async function confirm(projectId, userId, { draftRevision }) {
  return db.transaction(async (client) => {
    const query = client.query.bind(client);
    await owned(projectId, userId, query);
    const { rows } = await query('SELECT * FROM consultation_drafts WHERE project_id=$1 FOR UPDATE', [projectId]);
    if (rows[0].revision !== draftRevision) throw new AppError('This draft changed. Reload before confirming.', 409, { code: 'STALE_REVISION' });
    const existing = await query('SELECT * FROM design_briefs WHERE project_id=$1 AND draft_revision=$2', [projectId, draftRevision]);
    if (existing.rows[0]) return existing.rows[0];
    const brief = buildBrief(rows[0].answers);
    const result = await query('INSERT INTO design_briefs(project_id,version,draft_revision,brief) SELECT $1,COALESCE(MAX(version),0)+1,$2,$3 FROM design_briefs WHERE project_id=$1 RETURNING *', [projectId, draftRevision, JSON.stringify(brief)]);
    return result.rows[0];
  });
}
module.exports = { list, create, detail, save, confirm };
