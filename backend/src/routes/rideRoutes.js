import express from 'express';
import { getRides, createRide, getMyRides, completeRide } from '../controllers/rideController.js';
import { authenticate, requireVerifiedDriver } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getRides);
router.post('/', authenticate, requireVerifiedDriver, createRide);
router.get('/my-rides', authenticate, getMyRides);
router.put('/:id/complete', authenticate, completeRide);

export default router;
