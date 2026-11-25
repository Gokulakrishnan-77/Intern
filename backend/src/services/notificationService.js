/**
 * Notification Service
 * Central helper for creating notifications without duplicating logic.
 */
import Notification from '../models/Notification.js';

/**
 * Create a notification safely (skips if duplicate eventKey exists).
 */
export async function createNotification({ userId, type, title, message, eventKey = null, metadata = {} }) {
  try {
    // If eventKey supplied, use findOrCreate to prevent duplicate
    if (eventKey) {
      const [notification, created] = await Notification.findOrCreate({
        where: { userId, eventKey },
        defaults: { userId, type, title, message, eventKey, metadata },
      });
      return { notification, created };
    }

    const notification = await Notification.create({ userId, type, title, message, eventKey, metadata });
    return { notification, created: true };
  } catch (err) {
    // Swallow unique constraint errors — duplicate notification is not a critical failure
    if (err.name === 'SequelizeUniqueConstraintError') {
      return { notification: null, created: false };
    }
    console.error('[Notification Service Error]:', err.message);
    return { notification: null, created: false };
  }
}

/**
 * Notify driver — admin approved their application.
 */
export async function notifyDriverApproved(driverId, driverName) {
  return createNotification({
    userId: driverId,
    type: 'approval_approved',
    title: '🎉 Driver Account Approved!',
    message: 'Congratulations! Your driver account has been approved by the admin. You can now start offering rides.',
    eventKey: `approval_approved_${driverId}`,
    metadata: { driverName },
  });
}

/**
 * Notify driver — admin rejected their application.
 */
export async function notifyDriverRejected(driverId, driverName) {
  return createNotification({
    userId: driverId,
    type: 'approval_rejected',
    title: '❌ Driver Application Rejected',
    message: 'Your driver application was not approved at this time. You may resubmit with updated documents.',
    // Allow new rejection notification each time (no de-dupe here — status can change)
    eventKey: null,
    metadata: { driverName },
  });
}

/**
 * Notify driver — a rider requested seats on their ride.
 */
export async function notifyDriverBookingReceived({ driverId, bookingId, riderName, rideOrigin, rideDest, seatsBooked, departureTime }) {
  return createNotification({
    userId: driverId,
    type: 'booking_received',
    title: '🔔 New Booking Request!',
    message: `New booking request! ${riderName} requested ${seatsBooked} seat(s) for your trip (${rideOrigin?.split(',')[0]} → ${rideDest?.split(',')[0]}). Please Accept or Reject.`,
    eventKey: `booking_${bookingId}`,
    metadata: { bookingId, riderName, rideOrigin, rideDest, seatsBooked, departureTime },
  });
}

/**
 * Notify rider — driver accepted their booking.
 */
export async function notifyRiderBookingAccepted({ riderId, bookingId, driverName, driverPhone, rideOrigin, rideDest, departureTime }) {
  return createNotification({
    userId: riderId,
    type: 'booking_accepted',
    title: '✅ Ride Booking Accepted!',
    message: `Congratulations! ${driverName} accepted your booking for ${rideOrigin?.split(',')[0]} → ${rideDest?.split(',')[0]} departing at ${departureTime}. Driver Contact: ${driverPhone}.`,
    eventKey: `booking_accepted_${bookingId}`,
    metadata: { bookingId, driverName, driverPhone, rideOrigin, rideDest, departureTime },
  });
}

/**
 * Notify rider — driver rejected their booking.
 */
export async function notifyRiderBookingRejected({ riderId, bookingId, driverName, rideOrigin, rideDest }) {
  return createNotification({
    userId: riderId,
    type: 'booking_rejected',
    title: '❌ Booking Request Declined',
    message: `Your booking request for ${rideOrigin?.split(',')[0]} → ${rideDest?.split(',')[0]} was declined by ${driverName || 'the driver'}.`,
    eventKey: `booking_rejected_${bookingId}`,
    metadata: { bookingId, driverName, rideOrigin, rideDest },
  });
}

/**
 * Notify user — complaint / issue status update.
 */
export async function notifyComplaintUpdated({ userId, complaintId, newStatus }) {
  return createNotification({
    userId,
    type: 'complaint_update',
    title: `🛡️ Complaint Status: ${newStatus}`,
    message: `Your reported complaint #${complaintId.slice(0, 8)} has been reviewed and marked as "${newStatus}" by Administrator Krish.`,
    eventKey: `complaint_${complaintId}_${newStatus}`,
    metadata: { complaintId, newStatus },
  });
}
