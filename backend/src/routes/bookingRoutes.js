import express from 'express';
import { createBooking, getMyBookings, getDriverBookings } from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createBooking);
router.get('/my-bookings', authenticate, getMyBookings);
router.get('/driver-bookings', authenticate, getDriverBookings);

export default router;
