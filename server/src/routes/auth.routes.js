const express = require('express');
const validate = require('../middleware/validate');
const protect = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { registerSchema, loginSchema, updateMeSchema } = require('../validators/auth.schema');
const auth = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', protect, auth.me);
router.patch('/me', protect, validate(updateMeSchema), auth.updateMe);
router.post('/me/test-email', protect, authLimiter, auth.sendTestEmail); // limited: it sends real email

module.exports = router;
