import express from 'express';
import { submitVerification, getVerificationStatus } from '../controllers/driverController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/verify', authenticate, submitVerification);
router.get('/status', authenticate, getVerificationStatus);

export default router;
