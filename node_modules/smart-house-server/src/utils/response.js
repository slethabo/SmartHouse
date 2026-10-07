/**
 * Helpers that enforce the single response envelope used by every endpoint:
 * `{ success: boolean, message: string, data: any }`.
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {*} data Payload.
 * @param {string} [message]
 * @param {number} [status=200]
 */
function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

/**
 * Send a failure response.
 * @param {import('express').Response} res
 * @param {string} message Plain-language explanation and how to fix it.
 * @param {number} [status=400]
 * @param {*} [data]
 */
function fail(res, message, status = 400, data = null) {
  return res.status(status).json({ success: false, message, data });
}

module.exports = { ok, fail };
