const { Router } = require('express');
const auth = require('../modules/auth');
const admin = require('../modules/admin');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();
const v = admin.validators;
const c = admin.controller;

// Everything below requires an active admin session.
router.use(auth.requireRole('admin'));

router.get('/stats', asyncHandler(c.stats));

router.get('/users', asyncHandler(c.listUsers));
router.patch('/users/:id/active', validate(v.idParamSchema, 'params'), validate(v.activeSchema), asyncHandler(c.setUserActive));

router.get('/plans', asyncHandler(c.listPlans));
router.post('/plans', validate(v.planSchema), asyncHandler(c.createPlan));
router.put('/plans/:id', validate(v.idParamSchema, 'params'), validate(v.planSchema), asyncHandler(c.updatePlan));
router.patch('/plans/:id/active', validate(v.idParamSchema, 'params'), validate(v.activeSchema), asyncHandler(c.setPlanActive));
router.delete('/plans/:id', validate(v.idParamSchema, 'params'), asyncHandler(c.deletePlan));

router.get('/rates', asyncHandler(c.listRates));
router.put('/rates/:level', validate(v.finishLevelParam, 'params'), validate(v.rateSchema), asyncHandler(c.updateRate));

module.exports = router;
