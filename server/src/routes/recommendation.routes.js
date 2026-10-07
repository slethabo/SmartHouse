const { Router } = require('express');
const { z } = require('zod');
const auth = require('../modules/auth');
const recommendation = require('../modules/recommendation');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { ok } = require('../utils/response');

const router = Router();

const optionalInt = (max) =>
  z.preprocess((v) => (v === '' || v === undefined || v === null ? undefined : Number(v)), z.number().int().min(1).max(max).optional());

const recommendSchema = z.object({
  plotSizeM2: z.coerce.number({ invalid_type_error: 'Plot size must be a number.' }).positive('Plot size must be greater than zero (in m²).').max(1000000, 'Plot size is too large.'),
  budget: z.coerce.number({ invalid_type_error: 'Budget must be a number.' }).positive('Budget must be greater than zero (in Rand).').max(1e10, 'Budget is too large.'),
  filters: z
    .object({
      bedrooms: optionalInt(20),
      floors: optionalInt(5),
      style: z.string().trim().max(60).optional(),
    })
    .partial()
    .optional()
    .default({}),
  limit: optionalInt(50),
});

router.use(auth.requireAuth);

router.post(
  '/',
  validate(recommendSchema),
  asyncHandler(async (req, res) => {
    const result = await recommendation.recommendForUser(req.user.id, req.validated);
    const message = result.matches.length
      ? `Found ${result.matches.length} design${result.matches.length === 1 ? '' : 's'} for you.`
      : result.noMatch.message;
    return ok(res, result, message);
  })
);

router.get(
  '/last-search',
  asyncHandler(async (req, res) => {
    return ok(res, await recommendation.getLastSearch(req.user.id));
  })
);

module.exports = router;
