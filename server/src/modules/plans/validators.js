const { z } = require('zod');

/** Optional positive integer from a query string. */
const optionalInt = (max) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(1).max(max).optional()
  );

const browseQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  bedrooms: optionalInt(20),
  floors: optionalInt(5),
  style: z.string().trim().max(60).optional(),
  maxArea: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive().max(100000).optional()
  ),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Invalid plan id.' }),
});

module.exports = { browseQuerySchema, idParamSchema };
