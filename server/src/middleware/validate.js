/**
 * Validate `req.body`, `req.query` or `req.params` against a Zod schema and
 * put the sanitised result on `req.validated`.
 */
const { badRequest } = require('../utils/errors');

/**
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} [source='body']
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      const first = result.error.issues[0]?.message || 'Please check the form and try again.';
      return next(badRequest(first, { fields: fieldErrors }));
    }
    req.validated = result.data;
    next();
  };
}

module.exports = validate;
