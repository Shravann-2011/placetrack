const { z } = require('zod');

// Trim + lowercase FIRST, then check the format. (z.email().trim() checks before
// trimming, so "me@x.com " with a trailing space was wrongly rejected; found by a test.)
const emailField = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: emailField,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'), // bcrypt only uses 72 bytes
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };
