/**
 * Data access for administration: users and house plan writes.
 */
const db = require('../../db/connection');

const USER_COLUMNS = 'id, full_name, email, role, is_active, created_at';

async function listUsers() {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC, id DESC`);
  return rows;
}

async function setUserActive(id, isActive) {
  const { rows } = await db.query(
    `UPDATE users SET is_active = $2 WHERE id = $1 RETURNING ${USER_COLUMNS}`,
    [id, isActive]
  );
  return rows[0] || null;
}

async function countActiveAdmins() {
  const { rows } = await db.query(
    "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND is_active = TRUE"
  );
  return rows[0].count;
}

const PLAN_RETURNING = `
  id, name, description, bedrooms, bathrooms::float8 AS bathrooms, floors,
  floor_area_m2::float8 AS floor_area_m2, footprint_m2::float8 AS footprint_m2,
  min_plot_size_m2::float8 AS min_plot_size_m2, style, image_url, is_active,
  created_by, created_at, updated_at`;

async function createPlan(p, createdBy) {
  const { rows } = await db.query(
    `INSERT INTO house_plans
       (name, description, bedrooms, bathrooms, floors, floor_area_m2, footprint_m2,
        min_plot_size_m2, style, image_url, is_active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING ${PLAN_RETURNING}`,
    [
      p.name, p.description, p.bedrooms, p.bathrooms, p.floors, p.floor_area_m2,
      p.footprint_m2, p.min_plot_size_m2, p.style, p.image_url, p.is_active, createdBy,
    ]
  );
  return rows[0];
}

async function updatePlan(id, p) {
  const { rows } = await db.query(
    `UPDATE house_plans SET
       name = $2, description = $3, bedrooms = $4, bathrooms = $5, floors = $6,
       floor_area_m2 = $7, footprint_m2 = $8, min_plot_size_m2 = $9, style = $10,
       image_url = $11, is_active = $12, updated_at = NOW()
     WHERE id = $1
     RETURNING ${PLAN_RETURNING}`,
    [
      id, p.name, p.description, p.bedrooms, p.bathrooms, p.floors, p.floor_area_m2,
      p.footprint_m2, p.min_plot_size_m2, p.style, p.image_url, p.is_active,
    ]
  );
  return rows[0] || null;
}

async function setPlanActive(id, isActive) {
  const { rows } = await db.query(
    `UPDATE house_plans SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING ${PLAN_RETURNING}`,
    [id, isActive]
  );
  return rows[0] || null;
}

async function deletePlan(id) {
  const { rowCount } = await db.query('DELETE FROM house_plans WHERE id = $1', [id]);
  return rowCount > 0;
}

async function stats() {
  const { rows } = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM users WHERE is_active) AS active_users,
      (SELECT COUNT(*)::int FROM house_plans) AS plans,
      (SELECT COUNT(*)::int FROM house_plans WHERE is_active) AS active_plans,
      (SELECT COUNT(*)::int FROM user_searches) AS searches,
      (SELECT COUNT(*)::int FROM saved_plans) AS saved_plans`);
  return rows[0];
}

module.exports = {
  listUsers, setUserActive, countActiveAdmins,
  createPlan, updatePlan, setPlanActive, deletePlan, stats,
};
