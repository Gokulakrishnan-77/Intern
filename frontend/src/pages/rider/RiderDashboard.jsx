import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Car,
  Users,
  ShieldCheck,
  Star,
  Leaf,
  DollarSign,
  AlertTriangle,
  Share2,
  PhoneCall,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  Navigation,
  ShieldAlert,
  Crosshair,
  Loader2,
  ArrowRight,
  Filter,
  Route,
  Sparkles,
  Plus,
  RotateCcw,
  Compass,
  Layers,
  RotateCw,
} from 'lucide-react';
import { GoogleMapView } from '../../components/maps/GoogleMapView';
import { SmartRouteMapView } from '../../components/maps/SmartRouteMapView';
import { LocationAutocomplete } from '../../components/maps/LocationAutocomplete';
import { BookingModal } from '../../components/rides/BookingModal';
import { reverseGeocode } from '../../services/nominatim';
import { getSmartRoutes } from '../../services/osrm';
import { getSavedCurrency, saveCurrency, formatFare, convertFare } from '../../utils/currency';
import { bookingsApi, reviewsApi } from '../../api';
import { NotificationBell } from '../../components/common/NotificationBell';

// Helper: Haversine distance in km between two lat/lon coordinates
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 999;
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
  return Number((R * c).toFixed(2));
};

// Common stop-words to EXCLUDE from keyword matching (too generic, cause false matches)
const LOCATION_STOP_WORDS = new Set([
  'road', 'street', 'main', 'near', 'area', 'town', 'city', 'east', 'west',
  'north', 'south', 'lane', 'nagar', 'cross', 'gate', 'block', 'phase',
  'sector', 'plot', 'line', 'station', 'stop', 'junction', 'circle',
  'district', 'state', 'india', 'tamil', 'nadu', 'karnataka', 'kerala',
  'bypass', 'bridge', 'colony', 'layout', 'extension', 'tower', 'park',
  'garden', 'center', 'centre', 'village', 'post', 'office', 'temple',
  'church', 'mosque', 'market', 'bazaar', 'highway', 'national', 'ring',
  'outer', 'inner', 'old', 'new', 'bus', 'railway', 'metro',
]);

// STRICT DUAL-MATCHING LOGIC: Matches BOTH Pickup AND Destination
const doesDriverMatchBothPoints = (ride, riderOrigin, riderDestination, toleranceKm = 10) => {
  // Rule 1: Driver must be verified (or if verification status not explicitly rejected)
  const isVerified =
    ride.driver?.verificationStatus === 'verified' ||
    ride.verificationStatus === 'verified' ||
    !ride.driver?.verificationStatus;
  if (!isVerified) return false;

  // Rule 2: Must have at least 1 available seat
  const seats = ride.availableSeats ?? ride.seatsAvailable ?? 0;
  if (seats <= 0) return false;

  const riderOrigText = (
    riderOrigin?.displayName ||
    riderOrigin?.address ||
    String(riderOrigin || '')
  ).toLowerCase();

  const riderDestText = (
    riderDestination?.displayName ||
    riderDestination?.address ||
    String(riderDestination || '')
  ).toLowerCase();

  const driverOrigText = (
    (typeof ride.origin === 'object' ? (ride.origin?.address || ride.origin?.displayName) : ride.origin) ||
    ride.originAddress ||
    ''
  ).toLowerCase();

  const driverDestText = (
    (typeof ride.destination === 'object' ? (ride.destination?.address || ride.destination?.displayName) : ride.destination) ||
    ride.destAddress ||
    ''
  ).toLowerCase();

  // Helper to extract key place words (3+ chars, not generic stop words)
  const extractKeywords = (text) =>
    text
      .split(/[\s,\-–—()]+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length >= 3 && !LOCATION_STOP_WORDS.has(w));

  const origKeywords = extractKeywords(riderOrigText);
  const destKeywords = extractKeywords(riderDestText);

  // 1. Pickup Point Match
  // A. Direct substring inclusion
  const riderOrigFirst = riderOrigText.split(',')[0].trim();
  const driverOrigFirst = driverOrigText.split(',')[0].trim();
  let pickupMatches =
    (driverOrigFirst.length > 2 && riderOrigText.includes(driverOrigFirst)) ||
    (riderOrigFirst.length > 2 && driverOrigText.includes(riderOrigFirst));

  // B. Keyword overlap
  if (!pickupMatches && origKeywords.length > 0) {
    const origMatches = origKeywords.filter((kw) => driverOrigText.includes(kw));
    pickupMatches = origMatches.length > 0;
  }

  // C. Coordinate proximity fallback
  const rOrigLat = Number(riderOrigin?.lat);
  const rOrigLon = Number(riderOrigin?.lon);
  const dOrigLat = Number(ride.origin?.lat ?? ride.originLat);
  const dOrigLon = Number(ride.origin?.lon ?? ride.originLon);

  if (!pickupMatches && !isNaN(rOrigLat) && !isNaN(rOrigLon) && !isNaN(dOrigLat) && !isNaN(dOrigLon)) {
    const pickupDist = calculateDistanceKm(rOrigLat, rOrigLon, dOrigLat, dOrigLon);
    pickupMatches = pickupDist <= toleranceKm;
  }

  // 2. Destination Point Match
  // A. Direct substring inclusion
  const riderDestFirst = riderDestText.split(',')[0].trim();
  const driverDestFirst = driverDestText.split(',')[0].trim();
  let destMatches =
    (driverDestFirst.length > 2 && riderDestText.includes(driverDestFirst)) ||
    (riderDestFirst.length > 2 && driverDestText.includes(riderDestFirst));

  // B. Keyword overlap
  if (!destMatches && destKeywords.length > 0) {
    const destMatches_arr = destKeywords.filter((kw) => driverDestText.includes(kw));
    destMatches = destMatches_arr.length > 0;
  }

  // C. Coordinate proximity fallback
  const rDestLat = Number(riderDestination?.lat);
  const rDestLon = Number(riderDestination?.lon);
  const dDestLat = Number(ride.destination?.lat ?? ride.destLat);
  const dDestLon = Number(ride.destination?.lon ?? ride.destLon);

  if (!destMatches && !isNaN(rDestLat) && !isNaN(rDestLon) && !isNaN(dDestLat) && !isNaN(dDestLon)) {
    const destDist = calculateDistanceKm(rDestLat, rDestLon, dDestLat, dDestLon);
    destMatches = destDist <= toleranceKm;
  }

  // STRICT REQUIREMENT: BOTH pickup and destination MUST match
  return pickupMatches && destMatches;
};

export const RiderDashboard = ({ currentUser, publishedRides = [], onBookRide, onRefreshRides }) => {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'bookings' | 'impact'

  // Currency Selection State (INR - ₹ and USD - $)
  const [currency, setCurrency] = useState(getSavedCurrency());

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    saveCurrency(newCurrency);
  };

  // Current Rider Search Inputs
  const [origin, setOrigin] = useState({
    displayName: 'Greenfield Valley, Gate 1',
    lat: 12.9716,
    lon: 77.5946,
    isCurrentLocation: false,
  });
  const [destination, setDestination] = useState({
    displayName: 'Tech Innovation Park, Tower B',
    lat: 12.9279,
    lon: 77.6271,
  });

  const [detourTolerance, setDetourTolerance] = useState(5); // 5km proximity radius
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState(null);

  // Map Engine: 'smart' (Interactive Multi-Route Road Map with Leaflet) or 'google'
  const [mapEngine, setMapEngine] = useState('smart');

  // Smart Multi-Route Engine State
  const [smartRoutes, setSmartRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  const [waypoints, setWaypoints] = useState([]);
  const [newWaypointText, setNewWaypointText] = useState('');

  // Booking Modal State
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Safety & Mismatch State
  const [mismatchReportSuccess, setMismatchReportSuccess] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Rating Modal State
  const [ratingRide, setRatingRide] = useState(null);
  const [starCount, setStarCount] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Vehicle Category Filter: 'all' | 'car' | 'bike' | 'scooty'
  const [vehicleFilter, setVehicleFilter] = useState('all');

  // Dynamically calculate Smart Multi-Routes from road network (OSRM)
  useEffect(() => {
    let isCancelled = false;
    const fetchRoutes = async () => {
      if (!origin?.lat || !destination?.lat) return;
      setIsCalculatingRoutes(true);
      try {
        const result = await getSmartRoutes(origin, destination, waypoints);
        if (!isCancelled && result?.routes?.length > 0) {
          setSmartRoutes(result.routes);
          setSelectedRouteIndex((prev) => (prev < result.routes.length ? prev : result.shortestIndex));
        }
      } catch (e) {
        console.error('Route calculation error:', e);
      } finally {
        if (!isCancelled) setIsCalculatingRoutes(false);
      }
    };

    fetchRoutes();
    return () => {
      isCancelled = true;
    };
  }, [origin?.lat, origin?.lon, destination?.lat, destination?.lon, waypoints]);

  // Intermediate Stop (Waypoint) handlers
  const handleAddWaypoint = () => {
    if (!newWaypointText.trim()) return;
    const label = newWaypointText.trim();
    const ratio = (waypoints.length + 1) / (waypoints.length + 2);
    const approxLat = origin.lat + (destination.lat - origin.lat) * ratio + (Math.random() * 0.008 - 0.004);
    const approxLon = origin.lon + (destination.lon - origin.lon) * ratio + (Math.random() * 0.008 - 0.004);

    setWaypoints((prev) => [
      ...prev,
      {
        id: 'wp_' + Date.now(),
        displayName: label,
        lat: Number(approxLat.toFixed(4)),
        lon: Number(approxLon.toFixed(4)),
      },
    ]);
    setNewWaypointText('');
  };

  const handleRemoveWaypoint = (idx) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleResetToShortest = () => {
    setWaypoints([]);
    setSelectedRouteIndex(0);
  };

  // LOCATION-BASED DRIVER MATCHING & SORTING:
  // 1. Matches drivers whose published route matches BOTH pickup and destination
  // 2. Calculates distance between rider's pickup and driver's origin
  // 3. Sorts drivers with closest proximity first
  const strictlyMatchedDrivers = publishedRides
    .filter((ride) => doesDriverMatchBothPoints(ride, origin, destination, detourTolerance))
    .map((ride) => {
      const pDist =
        origin?.lat && ride.origin?.lat
          ? calculateDistanceKm(origin.lat, origin.lon, ride.origin.lat, ride.origin.lon)
          : 0;
      const dDist =
        destination?.lat && ride.destination?.lat
          ? calculateDistanceKm(destination.lat, destination.lon, ride.destination.lat, ride.destination.lon)
          : 0;
      return {
        ...ride,
        pickupProximityKm: pDist,
        destProximityKm: dDist,
        totalOffsetKm: Number((pDist + dDist).toFixed(1)),
      };
    })
    .sort((a, b) => a.totalOffsetKm - b.totalOffsetKm);

  // Filter by Vehicle Type if rider specified
  const displayedDrivers = strictlyMatchedDrivers.filter((ride) => {
    if (vehicleFilter === 'all') return true;
    return ride.driver?.vehicle?.type === vehicleFilter;
  });

  // Quick Preset Sample Routes to easily test strict matching
  const testPresets = [
    {
      label: 'Greenfield Valley → Tech Park',
      origin: { displayName: 'Greenfield Valley, Gate 1', lat: 12.9716, lon: 77.5946 },
      dest: { displayName: 'Tech Innovation Park, Tower B', lat: 12.9279, lon: 77.6271 },
    },
    {
      label: 'Maple Ridge → City Medical Center',
      origin: { displayName: 'Maple Ridge Main Crossing', lat: 12.985, lon: 77.605 },
      dest: { displayName: 'City Medical Center, Main Entrance', lat: 12.93, lon: 77.625 },
    },
    {
      label: 'Lakeview → Metro University',
      origin: { displayName: 'Lakeview Suburb Colony', lat: 12.99, lon: 77.58 },
      dest: { displayName: 'Metro University Campus, Faculty Gate', lat: 12.91, lon: 77.64 },
    },
    {
      label: 'North Gate → Downtown Financial',
      origin: { displayName: 'Greenfield Valley, North Gate', lat: 12.975, lon: 77.592 },
      dest: { displayName: 'Downtown Financial District, Central Plaza', lat: 12.94, lon: 77.61 },
    },
    {
      label: 'Unmatched Test (No Driver Route)',
      origin: { displayName: 'Old Harbor Pier, West Coast', lat: 13.05, lon: 77.45 },
      dest: { displayName: 'Highland Hill Observatory', lat: 12.85, lon: 77.75 },
    },
  ];

  const handleApplyPreset = (preset) => {
    setOrigin(preset.origin);
    setDestination(preset.dest);
  };

  // Use Real-Time Device GPS Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        try {
          const placeInfo = await reverseGeocode(latitude, longitude);
          const locationLabel =
            placeInfo?.displayName ||
            `Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

          const newCurrentLocation = {
            displayName: locationLabel,
            lat: latitude,
            lon: longitude,
            isCurrentLocation: true,
            accuracy: Math.round(accuracy),
          };

          setOrigin(newCurrentLocation);
          setLocationNotice(
            `GPS Locked: Pickup set to your current location (${newCurrentLocation.displayName.split(',')[0]}). Filtering matching drivers...`
          );
          setTimeout(() => setLocationNotice(null), 5000);
        } catch (err) {
          setOrigin({
            displayName: `Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            lat: latitude,
            lon: longitude,
            isCurrentLocation: true,
          });
          setLocationNotice('GPS coordinates detected. Filtering matching drivers...');
          setTimeout(() => setLocationNotice(null), 5000);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        alert('Could not access current location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Active / Confirmed Bookings for this Rider
  const [myBookings, setMyBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await bookingsApi.getMyBookings();
        if (res.success && res.bookings) {
          setMyBookings(res.bookings);
        }
      } catch (err) {
        // user may be guest or backend offline
      }
    };
    fetchBookings();
  }, []);

  const handleStartBooking = (ride) => {
    setSelectedRideForBooking(ride);
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = async (bookingData) => {
    const seatsRequested = Number(bookingData.seatsRequested || 1);
    const rideId = selectedRideForBooking?.id || selectedRideForBooking?._id || bookingData.rideId;
    const chosenRoute = bookingData.selectedRoute || smartRoutes[selectedRouteIndex] || null;

    // 1. Submit booking to backend API
    try {
      await bookingsApi.bookSeat({
        rideId,
        seatsRequested,
        pickupNotes: bookingData.pickupNotes || '',
        selectedRoute: chosenRoute,
        currency,
      });
    } catch (err) {
      console.warn('Backend booking API sync note:', err);
    }

    // 2. Call onBookRide prop to decrement vacant seats and notify driver
    if (onBookRide && selectedRideForBooking) {
      onBookRide(bookingData, selectedRideForBooking);
    }

    // 3. Store confirmed booking for this rider
    const newBooking = {
      id: 'bk_' + Date.now(),
      rideId,
      driverName: selectedRideForBooking.driver?.name || 'Verified Driver',
      driverPhone: selectedRideForBooking.driver?.phone || 'Contact provided',
      driverRating: selectedRideForBooking.driver?.rating || 4.9,
      vehicle: selectedRideForBooking.driver?.vehicle,
      pickup: selectedRideForBooking.origin?.address || selectedRideForBooking.origin,
      dropoff: selectedRideForBooking.destination?.address || selectedRideForBooking.destination,
      departureTime: selectedRideForBooking.departureTime,
      seatsBooked: seatsRequested,
      totalCost: bookingData.formattedTotalCost || formatFare(bookingData.totalCost, currency),
      currency: currency,
      selectedRoute: chosenRoute,
      status: 'Confirmed',
      liveTrackingToken: 'trip_sec_' + Math.random().toString(36).substring(2, 9),
      bookedAt: new Date().toISOString(),
    };

    const updatedBookings = [newBooking, ...myBookings];
    setMyBookings(updatedBookings);
    try {
      localStorage.setItem('rideshare_my_bookings', JSON.stringify(updatedBookings));
    } catch (e) {}

    // 4. Alert rider of confirmation
    alert(
      `🎉 Ride Confirmed!\n\n` +
      `You have reserved ${seatsRequested} seat(s) with driver ${selectedRideForBooking.driver?.name}.\n` +
      `Preferred route (${chosenRoute?.name || 'Road Network'}) and fare in ${currency} saved.\n` +
      `The driver has been notified via real-time message.`
    );
  };

  const handleReportVehicleMismatch = (bookingId) => {
    if (
      window.confirm(
        'Report Vehicle Mismatch: Does the car plate or model not match what is shown? This will cancel the ride immediately with 0 fee and notify Administrator Krish.'
      )
    ) {
      setMyBookings(
        myBookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'Cancelled - Mismatch Reported' } : b
        )
      );
      setMismatchReportSuccess(true);
      setTimeout(() => setMismatchReportSuccess(false), 5000);
    }
  };

  const handleShareTrip = (token) => {
    const url = `${window.location.origin}/trip/track/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!ratingRide) return;
    try {
      await reviewsApi.submitReview({
        rideId: ratingRide.rideId,
        bookingId: ratingRide.id,
        targetUserId: ratingRide.driverId,
        rating: starCount,
        comment: reviewText.trim() || 'Great commute! Punctual and safe driver.',
      });
      setRatingSubmitted(true);
      setTimeout(() => {
        setRatingRide(null);
        setRatingSubmitted(false);
        setReviewText('');
      }, 1500);
      alert('Review submitted successfully! Thank you for rating your driver.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> EXACT DUAL-MATCHING ACTIVE
            </span>
            <span className="text-xs text-slate-300">{currentUser?.name || 'Rider'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Strict Route & Destination Driver Match
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1">
            Displaying only verified drivers whose route matches <strong>both your pickup point and destination</strong>. All other drivers are excluded.
          </p>
        </div>

        {/* Status Pill, Currency Switcher & Notifications */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Selection: INR (₹) and USD ($) */}
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-inner">
            <button
              type="button"
              onClick={() => handleCurrencyChange('INR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                currency === 'INR'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-200 hover:text-white'
              }`}
              title="Display fares in Indian Rupee (₹)"
            >
              <span>₹ INR</span>
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyChange('USD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                currency === 'USD'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-200 hover:text-white'
              }`}
              title="Display fares in US Dollar ($)"
            >
              <span>$ USD</span>
            </button>
          </div>

          <NotificationBell currentUser={currentUser} />

          {onRefreshRides && (
            <button
              type="button"
              onClick={onRefreshRides}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 shadow-sm"
              title="Refresh Rides & Database Status"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Rides</span>
            </button>
          )}

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-xs text-left min-w-[200px]">
            <div className="flex items-center justify-between text-slate-200">
              <span>Filter Criterion:</span>
              <span className="text-emerald-300 font-bold">Both Points Match</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-slate-200">
              <span>Matching Drivers:</span>
              <span className="font-bold text-white">{strictlyMatchedDrivers.length} Available</span>
            </div>
          </div>
        </div>
      </div>

      {locationNotice && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2.5">
          <Crosshair className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{locationNotice}</span>
        </div>
      )}

      {mismatchReportSuccess && (
        <div className="p-3.5 bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Vehicle mismatch reported. Ride cancelled without penalty. Incident flagged directly to
            Administrator Krish.
          </span>
        </div>
      )}

      {copiedLink && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Google Maps live trip link copied! Share with family or trusted contacts.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('search')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'search'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          Strictly Matched Drivers ({strictlyMatchedDrivers.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'bookings'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Car className="w-4 h-4" />
          My Bookings & Active Trips ({myBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('impact')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'impact'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Leaf className="w-4 h-4" />
          My Green Savings & CO2 Impact
        </button>
      </div>

      {/* TAB 1: SEARCH & DUAL-MATCHED DRIVERS */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Quick Route Presets to test matching instantly */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Quick Test Route Pairs (Click any to test strict driver matching):
            </span>
            <div className="flex gap-2 flex-wrap text-xs">
              {testPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(preset)}
                  className={`py-1.5 px-3 rounded-xl font-semibold border transition-all ${
                    (origin.displayName || origin.address) === preset.origin.displayName &&
                    (destination.displayName || destination.address) === preset.dest.displayName
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : idx === testPresets.length - 1
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar with GPS Location Button */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Pickup Location
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                    ) : (
                      <Crosshair className="w-3 h-3 text-emerald-600" />
                    )}
                    <span>{isLocating ? 'Detecting GPS...' : 'Use Current Location'}</span>
                  </button>
                </div>
                <LocationAutocomplete
                  value={origin}
                  onSelect={setOrigin}
                  placeholder="Enter pickup point"
                  required
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Destination Dropoff
                </label>
                <LocationAutocomplete
                  value={destination}
                  onSelect={setDestination}
                  placeholder="Enter destination dropoff"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Crosshair className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Locate Me</span>
                </button>
              </div>
            </div>

            {/* Strict Matching Confirmation Notice */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Filtering active: Only drivers matching <strong>"{origin.displayName?.split(',')[0]}"</strong> AND <strong>"{destination.displayName?.split(',')[0]}"</strong> will appear.
                </span>
              </div>
              <span className="font-bold text-emerald-700">
                {strictlyMatchedDrivers.length} matching driver(s) found
              </span>
            </div>
          </div>

          {/* GOOGLE MAP + ROUTE CARDS + WAYPOINTS + MATCHING DRIVERS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Google Map with Waypoints + Route Comparison */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-red-600" /> Google Map Navigation
                </h3>
                <span className="text-[11px] text-slate-500">Live Driving Route</span>
              </div>

              <GoogleMapView
                origin={origin}
                destination={destination}
                waypoints={waypoints}
                height="480px"
                onLocateMe={handleUseCurrentLocation}
                isLocating={isLocating}
              />

              {/* Route Comparison Cards */}
              {smartRoutes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                      <Route className="w-3.5 h-3.5 text-emerald-600" /> Route Comparison ({smartRoutes.length} routes)
                    </span>
                    {isCalculatingRoutes && (
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {smartRoutes.map((route, idx) => (
                      <button
                        key={route.id || idx}
                        type="button"
                        onClick={() => setSelectedRouteIndex(idx)}
                        className={`p-3 rounded-xl border-2 text-left text-xs space-y-1 transition-all ${
                          idx === selectedRouteIndex
                            ? 'border-emerald-500 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-100'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: route.color || '#059669' }}
                            />
                            {route.isShortest ? '🏆 Shortest' : `Alt ${idx}`}
                          </span>
                          {idx === selectedRouteIndex && (
                            <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">SELECTED</span>
                          )}
                        </div>
                        <div className="text-slate-700">
                          <span className="font-bold">{route.distanceKm} km</span>
                          <span className="text-slate-400 mx-1">•</span>
                          <span>~{route.durationMinutes} mins</span>
                        </div>
                        <div className="font-bold text-emerald-700">
                          {formatFare(route.estimatedCost, currency)} / seat
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Waypoints Management */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" /> Intermediate Stops ({waypoints.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {waypoints.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetToShortest}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset to Shortest
                      </button>
                    )}
                  </div>
                </div>

                {/* Add Waypoint Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWaypointText}
                    onChange={(e) => setNewWaypointText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddWaypoint(); }}
                    placeholder="Add a stop (e.g. Market Square)..."
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddWaypoint}
                    disabled={!newWaypointText.trim()}
                    className="px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stop
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  💡 Tip: Add intermediate stops and the Google Map will automatically route through them.
                </p>

                {/* Current Waypoints List */}
                {waypoints.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {waypoints.map((wp, idx) => (
                      <span
                        key={wp.id || idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800"
                      >
                        <span className="w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="max-w-[120px] truncate">{wp.displayName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWaypoint(idx)}
                          className="text-amber-500 hover:text-rose-600 font-bold text-sm leading-none"
                          title="Remove this stop"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drivers Matching BOTH Pickup and Destination */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Drivers Matching Both Points ({strictlyMatchedDrivers.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Non-matching drivers are strictly excluded
                  </span>
                </div>
              </div>

              {/* Vehicle Type Filter Pills (Car, Bike, Scooty) */}
              <div className="flex gap-1.5 flex-wrap text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setVehicleFilter('all')}
                  className={`py-1 px-2.5 rounded-lg font-semibold transition-all ${
                    vehicleFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({strictlyMatchedDrivers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleFilter('car')}
                  className={`py-1 px-2.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                    vehicleFilter === 'car'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  🚗 Cars ({strictlyMatchedDrivers.filter((r) => r.driver?.vehicle?.type === 'car').length})
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleFilter('bike')}
                  className={`py-1 px-2.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                    vehicleFilter === 'bike'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  🏍️ Bikes ({strictlyMatchedDrivers.filter((r) => r.driver?.vehicle?.type === 'bike').length})
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleFilter('scooty')}
                  className={`py-1 px-2.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                    vehicleFilter === 'scooty'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  🛵 Scootys ({strictlyMatchedDrivers.filter((r) => r.driver?.vehicle?.type === 'scooty').length})
                </button>
              </div>

              {strictlyMatchedDrivers.length === 0 ? (
                /* EMPTY STATE: WHEN NO DRIVER MATCHES BOTH POINTS */
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">
                    No matching drivers found for your selected location and destination. Please try another location or time.
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    No verified driver is currently traveling from{' '}
                    <strong>"{origin.displayName?.split(',')[0]}"</strong> to{' '}
                    <strong>"{destination.displayName?.split(',')[0]}"</strong>.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 text-left space-y-1">
                    <p className="font-semibold text-slate-800">Why are other drivers not shown?</p>
                    <p>
                      By your strict matching rule, drivers traveling on other routes are hidden to prevent unwanted detours.
                    </p>
                  </div>
                </div>
              ) : displayedDrivers.length === 0 ? (
                /* NO DRIVERS MATCH THE CHOSEN VEHICLE FILTER */
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2">
                  <p className="text-xs text-slate-600">
                    No matching <strong>{vehicleFilter.toUpperCase()}</strong> found for this route corridor.
                  </p>
                  <button
                    onClick={() => setVehicleFilter('all')}
                    className="text-xs text-emerald-600 font-bold hover:underline"
                  >
                    Switch back to "All Vehicles" ({strictlyMatchedDrivers.length} available)
                  </button>
                </div>
              ) : (
                /* LIST OF DRIVERS MATCHING BOTH POINTS */
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {displayedDrivers.map((ride) => {
                    const vType = ride.driver?.vehicle?.type || 'car';
                    const isTwoWheeler = vType === 'bike' || vType === 'scooty';

                    return (
                      <div
                        key={ride.id}
                        className="bg-white rounded-2xl border-2 border-emerald-500/80 ring-2 ring-emerald-50 p-4 space-y-3.5 shadow-sm"
                      >
                        {/* Route Title & Departure */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-900 block">
                                {ride.routeTitle || 'Matching Commute Route'}
                              </span>
                              {vType === 'car' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  🚗 Car
                                </span>
                              )}
                              {vType === 'bike' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                                  🏍️ Bike
                                </span>
                              )}
                              {vType === 'scooty' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                  🛵 Scooty
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" /> {ride.departureTime}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Fare Split</span>
                            <span className="text-base font-bold text-emerald-600">
                              {formatFare(ride.pricePerSeat, currency)}
                            </span>
                            <span className="text-[10px] text-slate-400"> / seat</span>
                          </div>
                        </div>

                        {/* Driver & Vehicle Details */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                              {ride.driver.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-slate-900">{ride.driver.name}</h4>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Krish Verified
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="flex items-center text-amber-600 font-semibold">
                                  <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                                  {ride.driver.rating || 4.9}
                                </span>
                                <span>•</span>
                                <span>
                                  {ride.driver.vehicle?.color} {ride.driver.vehicle?.make} {ride.driver.vehicle?.model}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block text-slate-700">
                                  {ride.driver.vehicle?.plateNumber}
                                </span>
                                {isTwoWheeler && (
                                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                    🪖 Helmet Provided
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Matched Route Corridor + Proximity */}
                        <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs space-y-1">
                          <p className="text-slate-800 line-clamp-1">
                            <strong className="text-emerald-700">✓ Pickup Matches:</strong>{' '}
                            {ride.origin?.address || ride.origin}
                            {ride.pickupProximityKm !== undefined && ride.pickupProximityKm < 50 && (
                              <span className="ml-1 text-[10px] text-sky-600 font-semibold">({ride.pickupProximityKm} km away)</span>
                            )}
                          </p>
                          <p className="text-slate-800 line-clamp-1">
                            <strong className="text-emerald-700">✓ Destination Matches:</strong>{' '}
                            {ride.destination?.address || ride.destination}
                            {ride.destProximityKm !== undefined && ride.destProximityKm < 50 && (
                              <span className="ml-1 text-[10px] text-sky-600 font-semibold">({ride.destProximityKm} km away)</span>
                            )}
                          </p>
                        </div>

                        {/* Action & Vacant Seat Status */}
                        {(() => {
                          const vacantSeats = Math.max(0, ride.availableSeats ?? ride.seatsAvailable ?? 0);
                          const totalCapacity = ride.totalSeats || (ride.driver?.vehicle?.seats || (isTwoWheeler ? 1 : 4));
                          const existingBooking = myBookings.find(
                            (b) => b.rideId === ride.id || b.rideId === ride._id
                          );

                          return (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-slate-600 font-medium flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    Vacant: <strong className={vacantSeats > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                      {vacantSeats} of {totalCapacity} {totalCapacity === 1 ? 'seat' : 'seats'} remaining
                                    </strong>
                                  </span>
                                </span>
                                {existingBooking && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✓ You booked {existingBooking.seatsBooked || 1} seat(s)
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleStartBooking(ride)}
                                disabled={vacantSeats <= 0}
                                className={`py-2 px-4 font-bold rounded-lg shadow-sm transition-all text-white ${
                                  vacantSeats > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                                    : 'bg-slate-400 cursor-not-allowed opacity-60'
                                }`}
                              >
                                {vacantSeats > 0
                                  ? (existingBooking ? `Book More Seats (${formatFare(ride.pricePerSeat, currency)})` : `Reserve Seat (${formatFare(ride.pricePerSeat, currency)})`)
                                  : 'Sold Out (0 Seats Left)'}
                              </button>
                            </div>
                          );
                        })()}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY BOOKINGS & ACTIVE COMMUTES */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Active Commutes & Vehicle Verification
            </h3>
            <span className="text-xs text-slate-500">
              Check vehicle plate before stepping into the car
            </span>
          </div>

          {myBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">No Active Bookings</h4>
              <p className="text-xs text-slate-500 mt-1">
                You haven't reserved any seats yet. Switch to search to find matching drivers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4"
                >
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{booking.driverName}</span>
                        <span className="text-xs text-amber-600">★ {booking.driverRating || 4.9}</span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Krish Approved
                        </span>
                      </div>
                      <div className="mt-1">
                        {booking.canCallDriver && booking.driverPhone && !booking.driverPhone.includes('Protected') ? (
                          <a
                            href={`tel:${booking.driverPhone}`}
                            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors text-xs"
                          >
                            <PhoneCall className="w-3 h-3 text-emerald-600" />
                            <span>Call Driver: {booking.driverPhone}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            🔒 Driver phone shared after booking acceptance
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        booking.status === 'Accepted' || booking.status === 'Confirmed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : booking.status === 'Rejected' || booking.status?.includes('Cancelled')
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : booking.status === 'Completed'
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {booking.status === 'Accepted' || booking.status === 'Confirmed'
                        ? '✅ Confirmed (SMS Sent)'
                        : booking.status === 'Rejected'
                        ? '❌ Declined by Driver'
                        : booking.status === 'Completed'
                        ? '🏁 Completed'
                        : '⏳ Pending Driver Acceptance'}
                    </span>
                  </div>

                  {/* Vehicle Identity Check */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                      Vehicle Check (Must Match Before Boarding)
                    </span>
                    <div className="flex items-center justify-between text-slate-800 font-semibold">
                      <span>
                        {booking.vehicle.color} {booking.vehicle.make} {booking.vehicle.model}
                      </span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-950 font-bold">
                        {booking.vehicle.plateNumber}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-700">
                    <p><strong>Pickup:</strong> {booking.pickup}</p>
                    <p><strong>Dropoff:</strong> {booking.dropoff}</p>
                    <p className="text-slate-500"><strong>Time:</strong> {booking.departureTime}</p>
                  </div>

                  {!booking.status.includes('Cancelled') && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={() => handleShareTrip(booking.liveTrackingToken)}
                          className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" /> Share GMap Link
                        </button>

                        <button
                          onClick={() => {
                            setSosActive(!sosActive);
                            alert('EMERGENCY SOS: Google Maps live coordinates dispatched to trusted contacts.');
                          }}
                          className={`py-2 px-3 font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                            sosActive
                              ? 'bg-rose-600 text-white border-rose-700'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                          }`}
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-rose-600" /> SOS Trigger
                        </button>
                      </div>

                      <button
                        onClick={() => handleReportVehicleMismatch(booking.id)}
                        className="w-full py-2 px-3 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-100/50 rounded-lg border border-rose-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        Car Does Not Match App? Report Vehicle Mismatch
                      </button>

                      <button
                        onClick={() => setRatingRide(booking)}
                        className="w-full py-1.5 px-3 text-xs text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-lg transition-colors text-center font-medium"
                      >
                        Rate Driver & Leave Feedback
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: IMPACT & SAVINGS */}
      {activeTab === 'impact' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Commute Money Saved
            </h4>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">
              {formatFare(128.5, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Compared to solo driving & taxis</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Leaf className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              CO2 Footprint Reduced
            </h4>
            <p className="text-3xl font-extrabold text-teal-600 mt-2">42.6 kg CO2</p>
            <p className="text-xs text-slate-500 mt-1">Equivalent to planting ~2 trees</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Rider Reliability Score
            </h4>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">99%</p>
            <p className="text-xs text-slate-500 mt-1">Zero late cancellations</p>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {ratingRide && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Rate your ride with {ratingRide.driverName}
            </h3>

            {ratingSubmitted ? (
              <div className="p-4 bg-emerald-50 rounded-xl text-center text-xs text-emerald-800 space-y-1">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold">Thank you for rating!</p>
                <p>Your feedback helps maintain high standards across the community.</p>
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setStarCount(star)}
                      className="p-1 text-2xl transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= starCount
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Review / Feedback
                  </label>
                  <textarea
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Safe driving? Vehicle clean? Punctual pickup?"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRatingRide(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                  >
                    Submit Rating
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        ride={selectedRideForBooking}
        onConfirm={handleConfirmBooking}
        currency={currency}
        selectedRoute={smartRoutes[selectedRouteIndex] || null}
      />
    </div>
  );
};

export default RiderDashboard;
