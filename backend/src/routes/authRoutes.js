import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRegister, validateLogin, loginRateLimiter } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', loginRateLimiter, validateLogin, login);
router.get('/me', authenticate, getMe);

export default router;
