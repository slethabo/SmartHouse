/**
 * Zod schemas for auth payloads. Strings are trimmed; emails lower-cased.
 */
const { z } = require('zod');

const email = z
  .string({ required_error: 'Email address is required.' })
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address, for example name@example.com.')
  .max(254, 'Email address is too long.');

const password = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

const registerSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required.' })
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(120, 'Full name must be 120 characters or fewer.')
    .regex(/^[\p{L}\p{M}' .-]+$/u, 'Full name may only contain letters, spaces, apostrophes and hyphens.'),
  email,
  password,
});

const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.'),
});

module.exports = { registerSchema, loginSchema, passwordRule: password };
