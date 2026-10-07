const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../modules/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();

// Slow down brute-force attempts on login/register.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.', data: null },
});

router.post('/register', authLimiter, validate(auth.validators.registerSchema), asyncHandler(auth.controller.register));
router.post('/login', authLimiter, validate(auth.validators.loginSchema), asyncHandler(auth.controller.login));
router.post('/logout', asyncHandler(auth.controller.logout));
router.get('/me', asyncHandler(auth.controller.me));

module.exports = router;
