import express from 'express';
import {
  createBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  getMyBookings,
  getDriverBookings,
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createBooking);
router.put('/:id/accept', authenticate, acceptBooking);
router.put('/:id/reject', authenticate, rejectBooking);
router.put('/:id/cancel', authenticate, cancelBooking);
router.get('/my-bookings', authenticate, getMyBookings);
router.get('/driver-bookings', authenticate, getDriverBookings);

export default router;
