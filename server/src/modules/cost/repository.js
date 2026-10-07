/**
 * Data access for cost_rates. Parameterised SQL only.
 */
const db = require('../../db/connection');

/**
 * @returns {Promise<Array<{id:number,finish_level:string,rate_per_m2:number,updated_at:string}>>}
 */
async function findAll() {
  const { rows } = await db.query(
    `SELECT id, finish_level, rate_per_m2::float8 AS rate_per_m2, updated_at
       FROM cost_rates
      ORDER BY rate_per_m2 ASC`
  );
  return rows;
}

/**
 * Update the rate for one finish level.
 * @param {string} finishLevel
 * @param {number} ratePerM2
 * @returns {Promise<object|null>} The updated row or null if not found.
 */
async function updateRate(finishLevel, ratePerM2) {
  const { rows } = await db.query(
    `UPDATE cost_rates
        SET rate_per_m2 = $2, updated_at = NOW()
      WHERE finish_level = $1
  RETURNING id, finish_level, rate_per_m2::float8 AS rate_per_m2, updated_at`,
    [finishLevel, ratePerM2]
  );
  return rows[0] || null;
}

module.exports = { findAll, updateRate };
