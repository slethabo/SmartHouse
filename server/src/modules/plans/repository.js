/**
 * Data access for house plans (read side) and saved plans.
 */
const db = require('../../db/connection');

const PLAN_COLUMNS = `
  p.id, p.name, p.description, p.bedrooms, p.bathrooms::float8 AS bathrooms, p.floors,
  p.floor_area_m2::float8 AS floor_area_m2, p.footprint_m2::float8 AS footprint_m2,
  p.min_plot_size_m2::float8 AS min_plot_size_m2, p.style, p.image_url, p.is_active,
  p.created_by, p.created_at, p.updated_at`;

/**
 * Search plans with optional filters. Builds a parameterised WHERE clause.
 * @param {{search?:string,bedrooms?:number,floors?:number,style?:string,maxArea?:number,activeOnly?:boolean}} f
 */
async function search(f = {}) {
  const where = [];
  const params = [];
  // Push one value and replace every "?" in the clause with its $n placeholder.
  const add = (clause, value) => {
    params.push(value);
    where.push(clause.replace(/\?/g, `$${params.length}`));
  };

  if (f.activeOnly !== false) where.push('p.is_active = TRUE');
  if (f.search) add('(p.name ILIKE ? OR p.description ILIKE ? OR p.style ILIKE ?)', `%${f.search}%`);
  if (f.bedrooms) add('p.bedrooms >= ?', f.bedrooms);
  if (f.floors) add('p.floors = ?', f.floors);
  if (f.style) add('LOWER(p.style) = LOWER(?)', f.style);
  if (f.maxArea) add('p.floor_area_m2 <= ?', f.maxArea);

  const sql = `SELECT ${PLAN_COLUMNS} FROM house_plans p
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY p.floor_area_m2 ASC, p.id ASC`;
  const { rows } = await db.query(sql, params);
  return rows;
}

/**
 * @param {number} id
 */
async function findById(id) {
  const { rows } = await db.query(`SELECT ${PLAN_COLUMNS} FROM house_plans p WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

/** Distinct styles of active plans (for filter dropdowns). */
async function listStyles() {
  const { rows } = await db.query(
    'SELECT DISTINCT style FROM house_plans WHERE is_active = TRUE ORDER BY style'
  );
  return rows.map((r) => r.style);
}

/** Plan ids the user has saved. */
async function savedIdsForUser(userId) {
  const { rows } = await db.query('SELECT plan_id FROM saved_plans WHERE user_id = $1', [userId]);
  return rows.map((r) => r.plan_id);
}

/** Saved plans (full rows) for the user, newest first. */
async function listSaved(userId) {
  const { rows } = await db.query(
    `SELECT ${PLAN_COLUMNS}, s.created_at AS saved_at
       FROM saved_plans s
       JOIN house_plans p ON p.id = s.plan_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC`,
    [userId]
  );
  return rows;
}

/** Save a plan; silently ignores duplicates. */
async function save(userId, planId) {
  await db.query(
    'INSERT INTO saved_plans (user_id, plan_id) VALUES ($1, $2) ON CONFLICT (user_id, plan_id) DO NOTHING',
    [userId, planId]
  );
}

/** Remove a saved plan. Returns true if a row was deleted. */
async function unsave(userId, planId) {
  const { rowCount } = await db.query('DELETE FROM saved_plans WHERE user_id = $1 AND plan_id = $2', [
    userId,
    planId,
  ]);
  return rowCount > 0;
}

module.exports = { search, findById, listStyles, savedIdsForUser, listSaved, save, unsave };
