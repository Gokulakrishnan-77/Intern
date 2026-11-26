import express from 'express';
import {
  createBooking,
  acceptBooking,
  sendBookingOtp,
  verifyBookingOtp,
  rejectBooking,
  cancelBooking,
  getMyBookings,
  getDriverBookings,
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createBooking);
router.post('/:id/send-otp', authenticate, sendBookingOtp);
router.post('/:id/verify-otp', authenticate, verifyBookingOtp);
router.put('/:id/accept', authenticate, acceptBooking);
router.put('/:id/reject', authenticate, rejectBooking);
router.put('/:id/cancel', authenticate, cancelBooking);
router.get('/my-bookings', authenticate, getMyBookings);
router.get('/driver-bookings', authenticate, getDriverBookings);

export default router;
