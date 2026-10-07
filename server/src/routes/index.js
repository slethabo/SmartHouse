const { Router } = require('express');
const db = require('../db/connection');
const cost = require('../modules/cost');
const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');

const router = Router();

/** Liveness + database probe. */
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const dbOk = await db.ping();
    const payload = { status: dbOk ? 'ok' : 'degraded', database: dbOk ? 'up' : 'down', uptime_s: Math.round(process.uptime()) };
    return dbOk ? ok(res, payload) : fail(res, 'Database is not reachable.', 503, payload);
  })
);

/** Public: current rates, used by the help drawer and estimate labels. */
router.get(
  '/rates',
  asyncHandler(async (_req, res) => ok(res, { items: await cost.listRates() }))
);

router.use('/auth', require('./auth.routes'));
router.use('/recommendations', require('./recommendation.routes'));
router.use('/plans', require('./plans.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
