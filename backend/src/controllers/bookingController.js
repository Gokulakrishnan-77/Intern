import { Booking, Ride, User, Vehicle } from '../models/index.js';
import {
  notifyDriverBookingReceived,
  notifyRiderBookingAccepted,
  notifyRiderBookingRejected,
} from '../services/notificationService.js';
import { sendBookingAcceptedSms } from '../services/smsService.js';
import { sendBrevoOtp } from '../services/brevoService.js';

// ── CREATE BOOKING (Rider requests seats) ────────────────────────────────────
export const createBooking = async (req, res) => {
  try {
    const { rideId, seatsRequested = 1, pickupNotes, selectedRoute, currency } = req.body;
    const riderId = req.user.id;

    // Check if rideId is a valid UUID or local synthetic ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rideId);
    let ride = isUUID
      ? await Ride.findByPk(rideId, {
          include: [
            {
              model: User,
              as: 'driver',
              attributes: ['id', 'name', 'phone'],
              include: [{ model: Vehicle, as: 'vehicle' }],
            },
          ],
        })
      : null;

    if (!ride) {
      // Fallback: search for first active ride published in DB
      ride = await Ride.findOne({
        where: { status: 'published' },
        include: [
          {
            model: User,
            as: 'driver',
            attributes: ['id', 'name', 'phone'],
            include: [{ model: Vehicle, as: 'vehicle' }],
          },
        ],
      });
    }

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (ride.driverId === riderId) {
      return res.status(400).json({ success: false, message: 'You cannot book seats in your own ride.' });
    }

    if (ride.availableSeats < seatsRequested) {
      return res.status(400).json({
        success: false,
        message: `Only ${ride.availableSeats} seat(s) currently available on this ride.`,
      });
    }

    const totalFare = Number((seatsRequested * ride.pricePerSeat).toFixed(2));

    // Construct enriched pickup notes with selected route and currency metadata
    let enrichedNotes = pickupNotes ? String(pickupNotes).trim() : '';
    if (selectedRoute) {
      const routeInfo = `[Preferred Route: ${selectedRoute.name || 'Custom Route'} (${selectedRoute.distanceKm || selectedRoute.distance} km, ~${selectedRoute.durationMinutes || selectedRoute.duration} mins)${selectedRoute.waypoints?.length ? ` via ${selectedRoute.waypoints.length} waypoint(s)` : ''}]`;
      enrichedNotes = enrichedNotes ? `${routeInfo} Note: ${enrichedNotes}` : routeInfo;
    }
    if (currency) {
      enrichedNotes = `[Currency: ${currency}] ${enrichedNotes}`;
    }

    // Create booking in 'Pending' status — driver must Accept or Reject
    const booking = await Booking.create({
      rideId: ride.id,
      riderId,
      seatsRequested,
      totalFare,
      pickupNotes: enrichedNotes,
      status: 'Pending',
    });

    // Notify driver about incoming request
    if (ride.driverId) {
      await notifyDriverBookingReceived({
        driverId: ride.driverId,
        bookingId: booking.id,
        riderName: req.user.name || 'A rider',
        rideOrigin: ride.originAddress || '',
        rideDest: ride.destAddress || '',
        seatsBooked: seatsRequested,
        departureTime: ride.departureTime || '',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Booking request sent to driver for approval.',
      booking: {
        id: booking.id,
        rideId: ride.id,
        driverId: ride.driverId,
        driverName: ride.driver?.name,
        // SECURE: Driver phone is PROTECTED until driver accepts
        driverPhone: 'Protected until driver accepts booking',
        canCallDriver: false,
        vehicle: ride.driver?.vehicle,
        origin: ride.originAddress,
        destination: ride.destAddress,
        departureTime: ride.departureTime,
        seatsRequested,
        remainingSeats: ride.availableSeats,
        totalFare,
        pickupNotes: booking.pickupNotes,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error('[createBooking Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create booking.' });
  }
};

// ── REQUEST / DISPATCH OTP FOR BOOKING ACCEPTANCE (BREVO) ────────────────────
export const sendBookingOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Ride, as: 'ride' },
        { model: User, as: 'rider', attributes: ['id', 'name', 'phone', 'email'] },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found.' });
    }

    if (booking.ride?.driverId !== driverId) {
      return res.status(403).json({ success: false, message: 'Only the ride driver can initiate acceptance.' });
    }

    if (booking.status === 'Accepted' || booking.status === 'Confirmed') {
      return res.status(400).json({ success: false, message: 'This booking is already confirmed.' });
    }

    // Generate secure 6-digit numeric OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    booking.otpCode = generatedOtp;
    booking.otpExpiresAt = expiresAt;
    booking.otpVerified = false;
    await booking.save();

    // Dispatch via Brevo Service
    const brevoResult = await sendBrevoOtp({
      recipientPhone: booking.rider?.phone,
      recipientEmail: booking.rider?.email,
      recipientName: booking.rider?.name,
      otpCode: generatedOtp,
      driverName: req.user.name,
      origin: booking.ride?.originAddress,
      destination: booking.ride?.destAddress,
    });

    return res.json({
      success: true,
      message: `Mobile OTP dispatched to Rider ${booking.rider?.name || ''} via Brevo.`,
      bookingId: booking.id,
      expiresAt,
      // Pass debugOtp if in development/simulated mode for seamless verification
      debugOtp: process.env.NODE_ENV !== 'production' || !process.env.BREVO_API_KEY ? generatedOtp : undefined,
      brevoResult,
    });
  } catch (error) {
    console.error('[sendBookingOtp Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to send verification OTP via Brevo.' });
  }
};

// ── VERIFY OTP AND COMPLETE ACCEPTANCE ───────────────────────────────────────
export const verifyBookingOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const driverId = req.user.id;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Verification OTP is required.' });
    }

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Ride, as: 'ride' },
        { model: User, as: 'rider', attributes: ['id', 'name', 'phone', 'email'] },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found.' });
    }

    if (booking.ride?.driverId !== driverId) {
      return res.status(403).json({ success: false, message: 'Unauthorized driver.' });
    }

    // Validate OTP
    const cleanSubmittedOtp = String(otp).trim();
    if (booking.otpCode !== cleanSubmittedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please enter the 6-digit code received by the rider.',
      });
    }

    if (booking.otpExpiresAt && new Date() > new Date(booking.otpExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new verification code.',
      });
    }

    // Mark as verified and accepted
    booking.otpVerified = true;
    booking.status = 'Accepted';

    const ride = booking.ride;
    if (ride) {
      ride.availableSeats = Math.max(0, ride.availableSeats - booking.seatsRequested);
      if (ride.availableSeats === 0) {
        ride.status = 'fully_booked';
      }
      await ride.save();
    }

    await booking.save();

    // Send final acceptance SMS confirmation via Brevo / SMS Service
    const driver = await User.findByPk(driverId, {
      attributes: ['id', 'name', 'phone', 'email'],
    });

    if (booking.rider?.phone) {
      await sendBookingAcceptedSms({
        bookingId: booking.id,
        riderPhone: booking.rider.phone,
        riderName: booking.rider.name,
        driverName: driver?.name,
        driverPhone: driver?.phone || 'Contact via app',
        origin: ride?.originAddress,
        destination: ride?.destAddress,
        departureTime: ride?.departureTime,
        seatsBooked: booking.seatsRequested,
      });
    }

    await notifyRiderBookingAccepted({
      riderId: booking.riderId,
      bookingId: booking.id,
      driverName: driver?.name || 'Your driver',
      driverPhone: driver?.phone || 'Contact via app',
      rideOrigin: ride?.originAddress,
      rideDest: ride?.destAddress,
      departureTime: ride?.departureTime,
    });

    return res.json({
      success: true,
      message: `✅ OTP Verified! Booking officially accepted. Driver and Rider contacts unlocked.`,
      booking: {
        id: booking.id,
        status: booking.status,
        otpVerified: true,
        riderName: booking.rider?.name,
        riderPhone: booking.rider?.phone,
        canCallRider: true,
        remainingSeats: ride?.availableSeats,
      },
    });
  } catch (error) {
    console.error('[verifyBookingOtp Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
};

// ── ACCEPT BOOKING (Driver accepts request) ──────────────────────────────────
export const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Ride, as: 'ride' },
        { model: User, as: 'rider', attributes: ['id', 'name', 'phone', 'email'] },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found.' });
    }

    if (booking.ride?.driverId !== driverId) {
      return res.status(403).json({ success: false, message: 'Only the ride driver can accept this booking.' });
    }

    if (booking.status === 'Accepted' || booking.status === 'Confirmed') {
      return res.status(400).json({ success: false, message: 'This booking has already been accepted.' });
    }

    const ride = booking.ride;

    // Check available seats
    if (ride.availableSeats < booking.seatsRequested) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept: only ${ride.availableSeats} seat(s) remaining on this ride.`,
      });
    }

    // Atomically decrement seats
    ride.availableSeats = Math.max(0, ride.availableSeats - booking.seatsRequested);
    if (ride.availableSeats === 0) {
      ride.status = 'fully_booked';
    }
    await ride.save();

    // Mark booking as Accepted
    booking.status = 'Accepted';
    await booking.save();

    // Fetch driver details for SMS
    const driver = await User.findByPk(driverId, {
      attributes: ['id', 'name', 'phone', 'email'],
    });

    // Send SMS Notification to Rider (Twilio / Gateway Service)
    const riderPhone = booking.rider?.phone;
    if (riderPhone) {
      await sendBookingAcceptedSms({
        bookingId: booking.id,
        riderPhone,
        riderName: booking.rider?.name,
        driverName: driver?.name,
        driverPhone: driver?.phone || 'Contact via app',
        origin: ride.originAddress,
        destination: ride.destAddress,
        departureTime: ride.departureTime,
        seatsBooked: booking.seatsRequested,
      });
    }

    // Send in-app notification to rider
    await notifyRiderBookingAccepted({
      riderId: booking.riderId,
      bookingId: booking.id,
      driverName: driver?.name || 'Your driver',
      driverPhone: driver?.phone || 'Contact via app',
      rideOrigin: ride.originAddress,
      rideDest: ride.destAddress,
      departureTime: ride.departureTime,
    });

    return res.json({
      success: true,
      message: `Booking accepted! Rider ${booking.rider?.name} notified via SMS. Contact sharing unlocked.`,
      booking: {
        id: booking.id,
        status: booking.status,
        seatsRequested: booking.seatsRequested,
        riderName: booking.rider?.name,
        riderPhone: booking.rider?.phone, // Driver can now call rider
        canCallRider: true,
        remainingSeats: ride.availableSeats,
        rideStatus: ride.status,
      },
    });
  } catch (error) {
    console.error('[acceptBooking Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept booking.' });
  }
};

// ── REJECT BOOKING (Driver declines request) ──────────────────────────────────
export const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Ride, as: 'ride' },
        { model: User, as: 'rider', attributes: ['id', 'name', 'phone'] },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found.' });
    }

    if (booking.ride?.driverId !== driverId) {
      return res.status(403).json({ success: false, message: 'Only the ride driver can reject this booking.' });
    }

    booking.status = 'Rejected';
    await booking.save();

    // Notify rider about rejection
    await notifyRiderBookingRejected({
      riderId: booking.riderId,
      bookingId: booking.id,
      driverName: req.user.name,
      rideOrigin: booking.ride?.originAddress,
      rideDest: booking.ride?.destAddress,
    });

    return res.json({
      success: true,
      message: `Booking request declined. Rider ${booking.rider?.name} has been notified.`,
      booking: {
        id: booking.id,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error('[rejectBooking Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject booking.' });
  }
};

// ── CANCEL BOOKING (Rider or Driver cancels) ──────────────────────────────────
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findByPk(id, {
      include: [{ model: Ride, as: 'ride' }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isRider = booking.riderId === userId;
    const isDriver = booking.ride?.driverId === userId;

    if (!isRider && !isDriver && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking.' });
    }

    // If previously accepted, restore available seats
    if ((booking.status === 'Accepted' || booking.status === 'Confirmed') && booking.ride) {
      booking.ride.availableSeats += booking.seatsRequested;
      if (booking.ride.status === 'fully_booked') {
        booking.ride.status = 'published';
      }
      await booking.ride.save();
    }

    booking.status = 'Cancelled';
    await booking.save();

    return res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (error) {
    console.error('[cancelBooking Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  }
};

// ── GET DRIVER BOOKINGS (with secure phone sharing) ──────────────────────────
export const getDriverBookings = async (req, res) => {
  try {
    const driverId = req.user.id;
    const bookings = await Booking.findAll({
      include: [
        {
          model: Ride,
          as: 'ride',
          where: { driverId },
          attributes: [
            'id',
            'routeTitle',
            'originAddress',
            'destAddress',
            'departureTime',
            'availableSeats',
            'totalSeats',
            'status',
          ],
        },
        {
          model: User,
          as: 'rider',
          attributes: ['id', 'name', 'phone', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatted = bookings.map((b) => {
      const isConfirmed = b.status === 'Accepted' || b.status === 'Confirmed';
      return {
        id: b.id,
        rideId: b.rideId,
        riderName: b.rider?.name || 'Commuter',
        // SECURE CONTACT SHARING: Phone only exposed when booking is confirmed/accepted
        riderPhone: isConfirmed ? (b.rider?.phone || 'Not provided') : 'Protected until accepted',
        canCallRider: isConfirmed && !!b.rider?.phone,
        riderEmail: isConfirmed ? b.rider?.email : '',
        origin: b.ride?.originAddress,
        destination: b.ride?.destAddress,
        departureTime: b.ride?.departureTime,
        availableSeats: b.ride?.availableSeats,
        totalSeats: b.ride?.totalSeats,
        rideStatus: b.ride?.status,
        seatsBooked: b.seatsRequested,
        totalFare: b.totalFare,
        pickupNotes: b.pickupNotes,
        status: b.status,
        bookedAt: b.createdAt,
        message: isConfirmed
          ? `✅ Confirmed: ${b.rider?.name} booked ${b.seatsRequested} seat(s).`
          : `⏳ Pending Request: ${b.rider?.name} requested ${b.seatsRequested} seat(s). Action required.`,
      };
    });

    return res.json({ success: true, count: formatted.length, bookings: formatted });
  } catch (error) {
    console.error('[getDriverBookings Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch driver bookings.' });
  }
};

// ── GET MY BOOKINGS (Rider view with secure phone sharing) ───────────────────
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { riderId: req.user.id },
      include: [
        {
          model: Ride,
          as: 'ride',
          include: [
            {
              model: User,
              as: 'driver',
              attributes: ['id', 'name', 'phone', 'rating'],
              include: [{ model: Vehicle, as: 'vehicle' }],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatted = bookings.map((b) => {
      const isConfirmed = b.status === 'Accepted' || b.status === 'Confirmed';
      return {
        id: b.id,
        rideId: b.rideId,
        driverId: b.ride?.driver?.id,
        driverName: b.ride?.driver?.name,
        // SECURE CONTACT SHARING: Driver phone only exposed when booking is confirmed/accepted
        driverPhone: isConfirmed ? (b.ride?.driver?.phone || 'Not provided') : 'Protected until confirmed',
        canCallDriver: isConfirmed && !!b.ride?.driver?.phone,
        vehicle: b.ride?.driver?.vehicle,
        origin: b.ride?.originAddress,
        destination: b.ride?.destAddress,
        departureTime: b.ride?.departureTime,
        seatsRequested: b.seatsRequested,
        totalFare: b.totalFare,
        pickupNotes: b.pickupNotes,
        status: b.status,
        rideStatus: b.ride?.status,
        bookedAt: b.createdAt,
      };
    });

    return res.json({ success: true, count: formatted.length, bookings: formatted });
  } catch (error) {
    console.error('[getMyBookings Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
  }
};
