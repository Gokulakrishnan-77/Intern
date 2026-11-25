import { Booking, Ride, User, Vehicle } from '../models/index.js';

export const createBooking = async (req, res) => {
  try {
    const { rideId, seatsRequested = 1, pickupNotes } = req.body;
    const riderId = req.user.id;

    const ride = await Ride.findByPk(rideId, {
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'name', 'phone'],
          include: [{ model: Vehicle, as: 'vehicle' }],
        },
      ],
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (ride.availableSeats < seatsRequested) {
      return res.status(400).json({
        success: false,
        message: `Only ${ride.availableSeats} seat(s) available on this ride.`,
      });
    }

    const totalFare = Number((seatsRequested * ride.pricePerSeat).toFixed(2));

    const booking = await Booking.create({
      rideId,
      riderId,
      seatsRequested,
      totalFare,
      pickupNotes: pickupNotes || '',
      status: 'Confirmed',
    });

    // Decrement available seats in SQL
    ride.availableSeats = Math.max(0, (ride.availableSeats || 1) - seatsRequested);
    await ride.save();

    return res.status(201).json({
      success: true,
      message: 'Seat successfully reserved in SQL database.',
      remainingSeats: ride.availableSeats,
      booking: {
        id: booking.id,
        rideId: ride.id,
        driverId: ride.driverId,
        driverName: ride.driver?.name,
        driverPhone: ride.driver?.phone,
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
    console.error('Booking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create booking in SQL database.' });
  }
};

export const getDriverBookings = async (req, res) => {
  try {
    const driverId = req.user.id;
    const bookings = await Booking.findAll({
      include: [
        {
          model: Ride,
          as: 'ride',
          where: { driverId },
          attributes: ['id', 'routeTitle', 'originAddress', 'destAddress', 'departureTime', 'availableSeats', 'totalSeats'],
        },
        {
          model: User,
          as: 'rider',
          attributes: ['id', 'name', 'phone', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatted = bookings.map((b) => ({
      id: b.id,
      rideId: b.rideId,
      riderName: b.rider?.name || 'Commuter',
      riderPhone: b.rider?.phone || 'Contact via app',
      riderEmail: b.rider?.email || '',
      origin: b.ride?.originAddress,
      destination: b.ride?.destAddress,
      departureTime: b.ride?.departureTime,
      availableSeats: b.ride?.availableSeats,
      totalSeats: b.ride?.totalSeats,
      seatsBooked: b.seatsRequested,
      totalFare: b.totalFare,
      pickupNotes: b.pickupNotes,
      status: b.status,
      bookedAt: b.createdAt,
      message: `🔔 Rider ${b.rider?.name || 'A commuter'} has confirmed ${b.seatsRequested} seat(s) for your trip (${b.ride?.originAddress?.split(',')[0]} → ${b.ride?.destAddress?.split(',')[0]}). Remaining vacant seats: ${b.ride?.availableSeats}.`,
    }));

    return res.json({ success: true, count: formatted.length, bookings: formatted });
  } catch (error) {
    console.error('Fetch driver bookings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch driver bookings.' });
  }
};

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
              attributes: ['name', 'phone', 'rating'],
              include: [{ model: Vehicle, as: 'vehicle' }],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatted = bookings.map((b) => ({
      id: b.id,
      rideId: b.rideId,
      driverName: b.ride?.driver?.name,
      driverPhone: b.ride?.driver?.phone,
      vehicle: b.ride?.driver?.vehicle,
      origin: b.ride?.originAddress,
      destination: b.ride?.destAddress,
      departureTime: b.ride?.departureTime,
      seatsRequested: b.seatsRequested,
      totalFare: b.totalFare,
      pickupNotes: b.pickupNotes,
      status: b.status,
      bookedAt: b.createdAt,
    }));

    return res.json({ success: true, count: formatted.length, bookings: formatted });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
  }
};
