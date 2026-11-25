import { Op } from 'sequelize';
import { Review, User, Ride, Booking } from '../models/index.js';

// ── CREATE REVIEW (Rider or Driver submits feedback) ─────────────────────────
export const createReview = async (req, res) => {
  try {
    const { rideId, bookingId, targetUserId, rating, comment } = req.body;
    const reviewerId = req.user.id;
    const reviewerRole = req.user.role || 'rider';

    if (!rideId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Ride ID, rating, and comment are required.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars.' });
    }

    // Verify ride
    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    // Determine target user if not specified
    let targetUser = null;
    if (targetUserId) {
      targetUser = await User.findByPk(targetUserId);
    } else if (reviewerRole === 'rider') {
      targetUser = await User.findByPk(ride.driverId);
    }

    if (!targetUser) {
      return res.status(400).json({ success: false, message: 'Target user for review not found.' });
    }

    // Check duplicate review
    const existing = await Review.findOne({
      where: {
        rideId,
        reviewerId,
        targetUserId: targetUser.id,
      },
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already submitted a review for this journey.' });
    }

    const review = await Review.create({
      rideId,
      bookingId: bookingId || null,
      reviewerId,
      reviewerName: req.user.name,
      reviewerRole,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      rating: Number(rating),
      comment: comment.trim(),
      status: 'Active',
    });

    // Recalculate target user's average rating
    const allUserReviews = await Review.findAll({
      where: { targetUserId: targetUser.id, status: 'Active' },
      attributes: ['rating'],
    });

    if (allUserReviews.length > 0) {
      const avgRating =
        allUserReviews.reduce((sum, r) => sum + r.rating, 0) / allUserReviews.length;
      targetUser.rating = Number(avgRating.toFixed(1));
      targetUser.ratingsCount = allUserReviews.length;
      await targetUser.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Thank you for your feedback!',
      review,
    });
  } catch (error) {
    console.error('[createReview Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

// ── GET REVIEWS FOR A RIDE OR DRIVER ─────────────────────────────────────────
export const getRideReviews = async (req, res) => {
  try {
    const { rideId } = req.params;
    const reviews = await Review.findAll({
      where: { rideId, status: 'Active' },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
};

// ── REPORT INAPPROPRIATE REVIEW ──────────────────────────────────────────────
export const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    review.isReported = true;
    review.reportReason = reason || 'Reported by user as inappropriate or spam.';
    await review.save();

    return res.json({
      success: true,
      message: 'Review reported for administrative moderation by Administrator Krish.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to report review.' });
  }
};

// ── ADMIN: GET ALL REVIEWS (With Filtering & Search) ─────────────────────────
export const getAllReviewsAdmin = async (req, res) => {
  try {
    const { filter = 'all', search = '' } = req.query;

    const where = {};

    if (filter === 'driver') {
      where.reviewerRole = 'driver';
    } else if (filter === 'rider') {
      where.reviewerRole = 'rider';
    } else if (filter === 'reported') {
      where.isReported = true;
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { comment: { [Op.iLike]: `%${search.trim()}%` } },
        { reviewerName: { [Op.iLike]: `%${search.trim()}%` } },
        { targetUserName: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    const reviews = await Review.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error('[getAllReviewsAdmin Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
};

// ── ADMIN: REMOVE / HIDE INAPPROPRIATE REVIEW ────────────────────────────────
export const removeReviewAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A mandatory removal reason must be recorded for admin audit trail.',
      });
    }

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    review.status = 'Removed';
    review.removalReason = reason.trim();
    review.removedBy = req.user.name || 'Administrator Krish';
    review.removedAt = new Date();
    await review.save();

    // Recompute user's average rating without this removed review
    const targetUser = await User.findByPk(review.targetUserId);
    if (targetUser) {
      const activeReviews = await Review.findAll({
        where: { targetUserId: targetUser.id, status: 'Active' },
        attributes: ['rating'],
      });
      if (activeReviews.length > 0) {
        const avg = activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length;
        targetUser.rating = Number(avg.toFixed(1));
        targetUser.ratingsCount = activeReviews.length;
      } else {
        targetUser.rating = 5.0;
        targetUser.ratingsCount = 0;
      }
      await targetUser.save();
    }

    return res.json({
      success: true,
      message: `Review #${review.id.slice(0, 8)} removed successfully by Administrator Krish. Reason logged.`,
      review,
    });
  } catch (error) {
    console.error('[removeReviewAdmin Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove review.' });
  }
};
