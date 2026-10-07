const { Router } = require('express');
const auth = require('../modules/auth');
const plans = require('../modules/plans');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();
const { browseQuerySchema, idParamSchema } = plans.validators;
const c = plans.controller;

// Public browsing (saved flags appear only when logged in)
router.get('/', validate(browseQuerySchema, 'query'), asyncHandler(c.browse));

// Saved plans (must come before /:id)
router.get('/saved', auth.requireAuth, asyncHandler(c.listSaved));
router.post('/:id/save', auth.requireAuth, validate(idParamSchema, 'params'), asyncHandler(c.save));
router.delete('/:id/save', auth.requireAuth, validate(idParamSchema, 'params'), asyncHandler(c.unsave));

router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(c.detail));

module.exports = router;
