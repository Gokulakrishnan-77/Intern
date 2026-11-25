import { Op } from 'sequelize';
import { Ride, User, Vehicle, Booking } from '../models/index.js';
import { createNotification } from '../services/notificationService.js';

// Haversine formula for server-side proximity check
const haversineKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ── GET RIDES (Rider Search) ─────────────────────────────────────────────────
// Only returns rides with status published/scheduled AND availableSeats > 0
export const getRides = async (req, res) => {
  try {
    const { originLat, originLon, destLat, destLon, vehicleType, toleranceKm = 5 } = req.query;

    const allRides = await Ride.findAll({
      where: {
        status: { [Op.in]: ['published', 'scheduled'] },
        availableSeats: { [Op.gt]: 0 },
      },
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'name', 'rating', 'reliabilityScore', 'verificationStatus'],
          // NOTE: Phone is deliberately EXCLUDED from public search
          include: [{ model: Vehicle, as: 'vehicle' }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Format for frontend
    let formattedRides = allRides.map((r) => {
      const driverVehicle = r.driver?.vehicle;
      return {
        id: r.id,
        routeTitle: r.routeTitle,
        destinationCategory: r.destinationCategory,
        origin: { address: r.originAddress, lat: r.originLat, lon: r.originLon },
        destination: { address: r.destAddress, lat: r.destLat, lon: r.destLon },
        departureTime: r.departureTime,
        availableSeats: r.availableSeats,
        seatsAvailable: r.availableSeats,
        totalSeats: r.totalSeats,
        pricePerSeat: r.pricePerSeat,
        distanceKm: r.distanceKm,
        co2SavedKg: r.co2SavedKg,
        isRecurring: r.isRecurring,
        recurringDays: JSON.parse(r.recurringDays || '[]'),
        status: r.status,
        driver: {
          id: r.driver?.id,
          name: r.driver?.name,
          // SECURE: Driver phone protected until booking confirmed
          phone: 'Available after booking confirmation',
          rating: r.driver?.rating || 4.9,
          reliabilityScore: r.driver?.reliabilityScore || 98,
          verificationStatus: r.driver?.verificationStatus,
          vehicle: {
            type: driverVehicle?.type || 'car',
            make: driverVehicle?.make || 'Toyota',
            model: driverVehicle?.model || 'Standard',
            plateNumber: driverVehicle?.plateNumber || 'KA-PENDING',
            color: driverVehicle?.color || 'Standard',
            seats: driverVehicle?.seats || 4,
            helmetProvided: driverVehicle?.helmetProvided ?? true,
          },
        },
      };
    });

    // Only return rides whose driver is verified
    formattedRides = formattedRides.filter((r) => r.driver.verificationStatus === 'verified');

    // Proximity search
    if (originLat && originLon && destLat && destLon) {
      formattedRides = formattedRides.filter((ride) => {
        const origDist = haversineKm(Number(originLat), Number(originLon), ride.origin.lat, ride.origin.lon);
        const destDist = haversineKm(Number(destLat), Number(destLon), ride.destination.lat, ride.destination.lon);
        return origDist <= Number(toleranceKm) && destDist <= Number(toleranceKm);
      });
    }

    if (vehicleType && vehicleType !== 'all') {
      formattedRides = formattedRides.filter((ride) => ride.driver?.vehicle?.type === vehicleType);
    }

    return res.json({ success: true, count: formattedRides.length, rides: formattedRides });
  } catch (error) {
    console.error('Fetch rides error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch rides from SQL database.' });
  }
};

// ── CREATE RIDE (Driver publishes new ride) ──────────────────────────────────
export const createRide = async (req, res) => {
  try {
    const {
      routeTitle,
      origin,
      destination,
      departureTime,
      availableSeats,
      totalSeats,
      pricePerSeat,
      distanceKm,
      isRecurring,
      recurringDays,
    } = req.body;

    const driverId = req.user.id;

    const originAddr = typeof origin === 'object' ? origin.displayName || origin.address : origin;
    const destAddr = typeof destination === 'object' ? destination.displayName || destination.address : destination;

    const originLat = typeof origin === 'object' && origin.lat ? Number(origin.lat) : 12.985;
    const originLon = typeof origin === 'object' && origin.lon ? Number(origin.lon) : 77.605;

    const destLat = typeof destination === 'object' && destination.lat ? Number(destination.lat) : 12.93;
    const destLon = typeof destination === 'object' && destination.lon ? Number(destination.lon) : 77.625;

    const newRide = await Ride.create({
      driverId,
      routeTitle: routeTitle || `${originAddr?.split(',')[0]} → ${destAddr?.split(',')[0]}`,
      originAddress: originAddr || 'Origin Point',
      originLat,
      originLon,
      destAddress: destAddr || 'Destination Point',
      destLat,
      destLon,
      departureTime: departureTime || '08:30 AM',
      availableSeats: availableSeats || 1,
      totalSeats: totalSeats || availableSeats || 1,
      pricePerSeat: pricePerSeat || 3.5,
      distanceKm: distanceKm || 14.8,
      isRecurring: !!isRecurring,
      recurringDays: JSON.stringify(recurringDays || []),
      status: 'published',
    });

    return res.status(201).json({
      success: true,
      message: 'Commute successfully published. Available to riders.',
      ride: newRide,
    });
  } catch (error) {
    console.error('Publish ride error:', error);
    return res.status(500).json({ success: false, message: 'Failed to publish ride.' });
  }
};

// ── COMPLETE RIDE (Driver marks ride as completed) ───────────────────────────
export const completeRide = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;

    const ride = await Ride.findByPk(id, {
      include: [
        {
          model: Booking,
          as: 'bookings',
          where: { status: ['Accepted', 'Confirmed'] },
          required: false,
        },
      ],
    });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (ride.driverId !== driverId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to complete this ride.' });
    }

    ride.status = 'completed';
    await ride.save();

    // Mark confirmed bookings as Completed
    if (ride.bookings && ride.bookings.length > 0) {
      for (const b of ride.bookings) {
        b.status = 'Completed';
        await b.save();

        // Notify rider to review
        await createNotification({
          userId: b.riderId,
          type: 'ride_completed',
          title: '🏁 Journey Completed!',
          message: `Your ride from ${ride.originAddress?.split(',')[0]} to ${ride.destAddress?.split(',')[0]} is completed. Please share your rating and review!`,
          eventKey: `completed_ride_${ride.id}_${b.id}`,
          metadata: { rideId: ride.id, bookingId: b.id },
        });
      }
    }

    return res.json({
      success: true,
      message: 'Ride successfully completed and moved to Ride History.',
      ride,
    });
  } catch (error) {
    console.error('[completeRide Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete ride.' });
  }
};

// ── GET MY RIDES (Driver ride list & history) ─────────────────────────────────
export const getMyRides = async (req, res) => {
  try {
    const rides = await Ride.findAll({
      where: { driverId: req.user.id },
      include: [
        {
          model: Booking,
          as: 'bookings',
          include: [{ model: User, as: 'rider', attributes: ['id', 'name', 'phone'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, count: rides.length, rides });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch rides.' });
  }
};
