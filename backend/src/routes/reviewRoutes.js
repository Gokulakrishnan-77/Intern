import express from 'express';
import {
  createReview,
  getRideReviews,
  reportReview,
  getAllReviewsAdmin,
  removeReviewAdmin,
} from '../controllers/reviewController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createReview);
router.get('/ride/:rideId', getRideReviews);
router.post('/:id/report', authenticate, reportReview);

// Admin review moderation
router.get('/admin', authenticate, requireAdmin, getAllReviewsAdmin);
router.put('/admin/:id/remove', authenticate, requireAdmin, removeReviewAdmin);

export default router;
