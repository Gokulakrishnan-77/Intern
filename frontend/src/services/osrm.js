/**
 * Free OSRM (Open Source Routing Machine) Service
 * Free public routing engine using OpenStreetMap road network.
 * Note: OSRM uses [longitude, latitude] coordinate pairs.
 */

export const getRouteDetails = async (startCoords, endCoords) => {
  // startCoords: { lat, lon }, endCoords: { lat, lon }
  try {
    const coordinatesString = `${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM route calculation failed');

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No driving route found between specified points');
    }

    const primaryRoute = data.routes[0];
    const distanceKm = Number((primaryRoute.distance / 1000).toFixed(1)); // Convert meters to km
    const durationMinutes = Math.round(primaryRoute.duration / 60); // Convert seconds to minutes

    // GeoJSON coordinates come in [lon, lat], Leaflet polyline requires [lat, lon]
    const routeCoordinates = primaryRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

    return {
      distanceKm,
      durationMinutes,
      routeCoordinates,
    };
  } catch (error) {
    console.error('OSRM Service error:', error);
    // Fallback: straight line Euclidean calculation if public demo is rate-limited
    const latDiff = endCoords.lat - startCoords.lat;
    const lonDiff = endCoords.lon - startCoords.lon;
    const approxKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111;
    return {
      distanceKm: Math.max(1, Number(approxKm.toFixed(1))),
      durationMinutes: Math.max(2, Math.round(approxKm * 2)),
      routeCoordinates: [
        [startCoords.lat, startCoords.lon],
        [endCoords.lat, endCoords.lon],
      ],
    };
  }
};

/**
 * Fair cost calculator formula:
 * (distance in km * average fuel cost per km + vehicle wear factor) / total sharing occupants
 */
export const calculateFairCost = (distanceKm, seatsAvailable = 3, fuelPricePerLiter = 1.4, mileageKmPerLiter = 14) => {
  if (!distanceKm || distanceKm <= 0) return 0;
  const litersUsed = distanceKm / mileageKmPerLiter;
  const fuelCost = litersUsed * fuelPricePerLiter;
  const wearAndTearFactor = distanceKm * 0.05; // 5 cents/km maintenance allocation
  const totalTripCost = fuelCost + wearAndTearFactor;

  // Split equally among driver + passengers
  const totalOccupants = Number(seatsAvailable) + 1;
  const perSeatCost = totalTripCost / totalOccupants;
  return Math.max(1, Number(perSeatCost.toFixed(2)));
};

/**
 * Environmental Impact Calculator:
 * Average car emits ~120g of CO2 per km. When commuters carpool, each extra passenger saves 1 vehicle trip.
 */
export const calculateCO2SavedKg = (distanceKm, passengerCount = 1) => {
  const co2PerKmKg = 0.12; // 120 grams = 0.12 kg
  return Number((distanceKm * co2PerKmKg * passengerCount).toFixed(2));
};
